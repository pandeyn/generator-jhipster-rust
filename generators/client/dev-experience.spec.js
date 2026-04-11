/**
 * Regression coverage for the client-side dev experience fixes landed during
 * the 2026-04-10/2026-04-11 session. Each `it(...)` here corresponds to a real
 * issue that surfaced when running `npm start` / `docker build` against a
 * generated sample project:
 *
 *  - Root `package.json` had no `start`/`build`/`test`/`lint` scripts even
 *    though our blueprint puts the client in a `client/` workspace subfolder.
 *    Users got `npm error Missing script: "start"` when running `npm start`
 *    from the project root and had to `cd client && npm start` instead.
 *
 *  - Vite-based Angular dev server (`ng serve`) does NOT honor `angular.json`
 *    `assets` glob entries that source files from `node_modules/`, so
 *    `swagger-ui-bundle.js`, `swagger-ui-standalone-preset.js`, `swagger-ui.css`
 *    and `axios.min.js` 404'd in dev mode and the iframe at /admin/docs was
 *    blank. We work around this with a postinstall/prestart helper that copies
 *    the runtime files into `client/src/swagger-ui/` where the dev server
 *    treats them as plain static assets.
 *
 *  - The Dockerfile copies `client/package.json` first (for layer caching),
 *    then runs `npm install`, then copies the rest of `client/`. The
 *    postinstall hook references `scripts/copy-swagger-ui-assets.cjs` which
 *    didn't exist in the container at install time, aborting the build with
 *    `Cannot find module '/app/client/scripts/copy-swagger-ui-assets.cjs'`.
 *    Fix: copy `client/scripts` into the build context BEFORE `npm install`.
 *
 *  - The React workspace had `overrides.react-redux-loading-bar.{react, react-dom}`
 *    set to `"$react"` / `"$react-dom"`. Those self-references only resolve
 *    when the same `package.json` declares `react`/`react-dom` as dependencies,
 *    but in our workspace layout React lives in `client/package.json`, not
 *    the workspace root. Fix: rewrite the root overrides with the actual
 *    version strings read from the client workspace.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

// Use the JHipster app entrypoint so the Dockerfile (written by rust-server),
// the root `package.json` workspace scripts (written by our client generator),
// AND the swagger-ui helpers all land in the test result. Invoking
// `jhipster:client` alone skips the rust-server Dockerfile and the rust-server
// generator alone never composes our `jhipster-rust:client` POST_WRITING tasks.
const SUB_GENERATOR_NAMESPACE = 'jhipster:app';

const readDest = file => result.fs.read(`${result.cwd}/${file}`, { defaults: '' });
const readJson = file => {
  const content = readDest(file);
  return content ? JSON.parse(content) : {};
};

describe('client dev-experience regression coverage', () => {
  describe('Angular monolith', () => {
    beforeAll(async () => {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'testApp',
          applicationType: 'monolith',
          authenticationType: 'jwt',
          clientFramework: 'angular',
          backendType: 'Rust',
          // Skip diesel-only details — this test focuses on the client side.
          skipServer: false,
          databaseType: 'sql',
          devDatabaseType: 'sqlite',
          prodDatabaseType: 'postgresql',
        })
        .withOptions({
          ignoreNeedlesError: true,
          blueprint: ['rust'],
          skipInstall: true,
        })
        .withJHipsterGenerators()
        .withConfiguredBlueprint();
    });

    it('writes the swagger-ui dev-asset helper script', () => {
      // Regression: the helper file is what makes the postinstall hook work.
      // It must exist in source so that `npm install` (and `docker build`'s
      // npm-install layer) can run it without exploding.
      const helper = readDest('client/scripts/copy-swagger-ui-assets.cjs');
      expect(helper).toContain('swagger-ui-dist');
      expect(helper).toContain('axios');
      // It must use require.resolve(<pkg>/package.json) to side-step the
      // `exports` field that blocks ./dist/ subpath resolves on modern axios.
      expect(helper).toContain("require.resolve(pkgName + '/package.json')");
    });

    it('client/package.json has prestart and postinstall pointing to the helper', () => {
      const pkg = readJson('client/package.json');
      expect(pkg.scripts.prestart).toContain('node scripts/copy-swagger-ui-assets.cjs');
      expect(pkg.scripts.postinstall).toContain('node scripts/copy-swagger-ui-assets.cjs');
    });

    it('writes a .gitignore inside client/src/swagger-ui/ for the auto-copied files', () => {
      const gi = readDest('client/src/swagger-ui/.gitignore');
      expect(gi).toContain('swagger-ui-bundle.js');
      expect(gi).toContain('swagger-ui-standalone-preset.js');
      expect(gi).toContain('swagger-ui.css');
      expect(gi).toContain('axios.min.js');
    });

    it('root package.json forwards start/build/test/lint to the client workspace', () => {
      // Regression: users got `npm error Missing script: "start"` from the
      // project root because base JHipster only emits these scripts when the
      // client lives at the root. Our blueprint moves the client into a
      // `client/` workspace, so we have to forward the scripts ourselves.
      const root = readJson('package.json');
      expect(root.scripts.start).toBe('npm run -w client/ start');
      expect(root.scripts.build).toBe('npm run -w client/ build');
      expect(root.scripts.test).toBe('npm run -w client/ test');
      expect(root.scripts.lint).toBe('npm run -w client/ lint');
    });

    it('Dockerfile copies client/scripts BEFORE running npm install', () => {
      // Regression: docker build aborted with `Cannot find module
      // '/app/client/scripts/copy-swagger-ui-assets.cjs'` because the
      // Dockerfile copied only client/package.json then ran npm install,
      // which fired the postinstall hook before the helper file was in
      // the build context.
      const dockerfile = readDest('Dockerfile');
      const copyScriptsIdx = dockerfile.indexOf('COPY client/scripts');
      const npmInstallIdx = dockerfile.indexOf('RUN npm install');
      expect(copyScriptsIdx).toBeGreaterThan(-1);
      expect(npmInstallIdx).toBeGreaterThan(-1);
      expect(copyScriptsIdx).toBeLessThan(npmInstallIdx);
    });
  });

  describe('React monolith', () => {
    beforeAll(async () => {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'testApp',
          applicationType: 'monolith',
          authenticationType: 'jwt',
          clientFramework: 'react',
          backendType: 'Rust',
          skipServer: false,
          databaseType: 'sql',
          devDatabaseType: 'sqlite',
          prodDatabaseType: 'postgresql',
        })
        .withOptions({
          ignoreNeedlesError: true,
          blueprint: ['rust'],
          skipInstall: true,
        })
        .withJHipsterGenerators()
        .withConfiguredBlueprint();
    });

    it('rewrites the workspace-root overrides for react-redux-loading-bar with the version from client/package.json', () => {
      // Regression: root package.json had:
      //   "overrides": { "react-redux-loading-bar": { "react": "$react", "react-dom": "$react-dom" } }
      // The `$react` self-reference only resolves to a real version when the
      // SAME package.json lists `react` as a dependency. In our workspace
      // layout the root has no react dep, so `npm install` printed a long wall
      // of `ERESOLVE overriding peer dependency` warnings about every
      // package that pulled in react. Fix: rewrite root overrides with the
      // version strings read from client/package.json.
      //
      // (JHipster's test helper uses placeholder version strings like
      //  "REACT_VERSION", so we assert against the value in client/package.json
      //  rather than a hardcoded semver pattern.)
      const root = readJson('package.json');
      const client = readJson('client/package.json');
      const override = root.overrides?.['react-redux-loading-bar'];
      expect(override).toBeDefined();
      // Must NOT still be the broken `$react` self-reference.
      expect(override.react).not.toBe('$react');
      expect(override['react-dom']).not.toBe('$react-dom');
      // Must equal whatever client/package.json declares as its react version.
      expect(override.react).toBe(client.dependencies.react);
      expect(override['react-dom']).toBe(client.dependencies['react-dom']);
    });

    it('does NOT write the swagger-ui dev-asset helper for non-Angular clients', () => {
      // The Vite asset bug only affects the Angular dev server, so React/Vue
      // shouldn't get the helper script (and the Dockerfile shouldn't try to
      // COPY it). The fixSwaggerUiDevAssets task is gated on clientFrameworkAngular.
      expect(readDest('client/scripts/copy-swagger-ui-assets.cjs')).toBe('');
      const pkg = readJson('client/package.json');
      expect(pkg.scripts?.prestart || '').not.toContain('copy-swagger-ui-assets');
      expect(pkg.scripts?.postinstall || '').not.toContain('copy-swagger-ui-assets');
    });

    it('Dockerfile does NOT copy client/scripts for non-Angular clients', () => {
      // The conditional `<%_ if (clientFrameworkAngular) { _%> COPY client/scripts ./scripts <%_ } _%>`
      // in the Dockerfile template must skip the COPY for React/Vue projects,
      // otherwise `docker build` fails because the directory doesn't exist.
      const dockerfile = readDest('Dockerfile');
      expect(dockerfile).not.toContain('COPY client/scripts');
    });
  });
});
