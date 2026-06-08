import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';

// Track 1-b.1 fix (2026-05-10): moved from 'generator-jhipster/testing' to
// 'generator-jhipster/ci' — same reason as command.mjs (see note there).
// Order matters: eslint-plugin-import-x/order rule sorts alphabetically, so
// `/ci` comes before `/generators/base`.
import { getGithubSamplesGroup } from 'generator-jhipster/ci';
import BaseGenerator from 'generator-jhipster/generators/base';

export default class extends BaseGenerator {
  /** @type {string | undefined} */
  samplesFolder;
  /** @type {string} */
  samplesGroup;
  /** @type {string} */
  sampleName;
  /** @type {boolean} */
  all;
  /** @type {string} */
  sampleType;
  /** @type {string} */
  sampleFile;
  /** @type {any} */
  generatorOptions;

  constructor(args, opts, features) {
    super(args, opts, { ...features, queueCommandTasks: true, jhipsterBootstrap: false });
  }

  get [BaseGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async copySample() {
        const { samplesFolder, samplesGroup, all, sampleName } = this;
        const samplesPath = samplesFolder ? join(samplesFolder, samplesGroup) : samplesGroup;
        if (all) {
          this.copyTemplate(`${samplesPath}/*.jdl`, '');
          this.sampleType = 'jdl';
        } else if (extname(sampleName) === '.jdl') {
          this.copyTemplate(join(samplesPath, sampleName), sampleName, { noGlob: true });
          this.sampleType = 'jdl';
        } else {
          const { samples } = await getGithubSamplesGroup(this.templatePath(), samplesPath);
          const {
            'sample-type': sampleType,
            'sample-file': sampleFile = sampleName,
            'sample-folder': sampleFolder = samplesPath,
            generatorOptions,
          } = samples[sampleName];

          this.generatorOptions = generatorOptions;
          this.sampleType = sampleType;

          if (sampleType === 'jdl') {
            const jdlFile = `${sampleFile}.jdl`;
            this.copyTemplate(join(sampleFolder, jdlFile), jdlFile, { noGlob: true });
          } else if (sampleType === 'yo-rc') {
            // Phase 3a fix (2026-06-07): mem-fs-editor's copyTemplate('**', ...)
            // misfires here because its glob path runs multimatch against every
            // path in the in-memory store; an absolute destination-side store
            // entry like `<cwd>/package.json` matches `**` and gets resolved as
            // a non-existent source ("Trying to copy from a source that does
            // not exist"). Enumerating files on disk and copying each by name
            // with no globOptions takes the preferFiles fast path, which never
            // runs the multimatch step. Limits sample contents to .yo-rc.json
            // and .jhipster/*.json — the only structure yo-rc samples need.
            const fromDir = this.templatePath(sampleFolder, sampleFile);
            this.copyTemplate(join(fromDir, '.yo-rc.json'), '.yo-rc.json', { noGlob: true });
            const entityDir = join(fromDir, '.jhipster');
            const entityEntries = await readdir(entityDir).catch(() => []);
            for (const entry of entityEntries) {
              this.copyTemplate(join(entityDir, entry), join('.jhipster', entry), { noGlob: true });
            }
          }
        }
      },
    });
  }

  get [BaseGenerator.END]() {
    return this.asEndTaskGroup({
      async generateYoRcSample() {
        if (this.sampleType !== 'yo-rc') return;

        const generatorOptions = this.getDefaultComposeOptions();
        await this.composeWithJHipster('app', { generatorOptions });
      },
      async generateJdlSample() {
        if (this.sampleType !== 'jdl') return;

        const generatorOptions = this.getDefaultComposeOptions();
        const folderContent = await readdir(this.destinationPath());
        const jdlFiles = folderContent.filter(file => file.endsWith('.jdl'));

        await this.composeWithJHipster('jdl', {
          generatorArgs: jdlFiles,
          generatorOptions: {
            ...generatorOptions,
            ...(this.all ? { workspaces: true, monorepository: true } : { skipInstall: true }),
          },
        });
      },
      async jhipsterInfo() {
        await this.composeWithJHipster('info');
      },
    });
  }

  getDefaultComposeOptions() {
    const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));
    const projectVersion = `${packageJson.version}-git`;
    return {
      skipJhipsterDependencies: true,
      projectVersion,
      ...this.generatorOptions,
    };
  }
}
