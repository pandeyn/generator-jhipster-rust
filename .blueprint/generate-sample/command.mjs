/**
 * Copyright 2013-2025 the original author or authors from the JHipster project.
 *
 * This file is part of the JHipster project, see https://www.jhipster.tech/
 * for more information.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Track 1-b.1 fix (2026-05-10): the previous line `import { GENERATOR_APP } from
// 'generator-jhipster/generators'` was incompatible with generator-jhipster 9.x.
// JHipster 9's package.json exports define `./generators/*` (with a required
// subpath) but NOT bare `./generators`, AND GENERATOR_APP is not a publicly
// exported constant — it lives only inside cli/program.js as `const = 'app'`.
// The canonical JHipster generate-sample command template at
// node_modules/generator-jhipster/dist/generators/generate-blueprint/templates/.blueprint/generate-sample/command.mjs.ejs
// uses the literal string 'app' in the `import:` array instead of importing the
// constant — mirrored here.
// Track 1-b.1 fix (2026-05-10): JHipster 9.0.0's `./testing` subpath no longer
// re-exports `getGithubSamplesGroup` / `getGithubSamplesGroups` — those moved to
// `./ci` (see node_modules/generator-jhipster/dist/lib/ci/index.js which
// `export * from "./github-group.js"`). The canonical template still says
// `from 'generator-jhipster/testing'` but that path is stale for the installed
// JHipster version.
import { getGithubSamplesGroup, getGithubSamplesGroups } from 'generator-jhipster/ci';

const DEFAULT_SAMPLES_GROUP = 'samples';

/**
 * @type {import('generator-jhipster').JHipsterCommandDefinition}
 */
const command = {
  arguments: {
    sampleName: {
      type: String,
    },
  },
  configs: {
    samplesFolder: {
      description: 'Path to the samples folder',
      cli: {
        type: String,
      },
      scope: 'generator',
    },
    samplesGroup: {
      description: 'Samples group to lookup',
      cli: {
        type: String,
      },
      prompt: gen => ({
        when: !gen.all && !gen.sampleName,
        type: 'select',
        message: 'which sample group do you want to lookup?',
        choices: async () => getGithubSamplesGroups(gen.templatePath(gen.samplesFolder ?? '')),
        default: DEFAULT_SAMPLES_GROUP,
      }),
      configure: gen => {
        gen.samplesGroup ??= DEFAULT_SAMPLES_GROUP;
      },
      scope: 'generator',
    },
    sampleName: {
      prompt: gen => ({
        when: !gen.all,
        type: 'select',
        message: 'which sample do you want to generate?',
        choices: async answers => {
          const samples = await getGithubSamplesGroup(gen.templatePath(), answers.samplesGroup ?? gen.samplesGroup);
          return Object.keys(samples.samples);
        },
      }),
      scope: 'generator',
    },
    all: {
      description: 'Generate every sample in a workspace',
      cli: {
        type: Boolean,
      },
      scope: 'generator',
    },
  },
  options: {},
  import: ['app'],
};

export default command;
