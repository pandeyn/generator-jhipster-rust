#!/usr/bin/env node

const { basename, dirname, join } = require('path');

const { bin, version } = require('../package.json');

// Get package name to use as namespace.
// Allows blueprints to be aliased.
const packagePath = dirname(__dirname);
const packageFolderName = basename(packagePath);
const devBlueprintPath = join(packagePath, '.blueprint');
const blueprint = packageFolderName.startsWith('jhipster-') ? `generator-${packageFolderName}` : packageFolderName;

(async () => {
  const { runJHipster, done, logger } = await import('generator-jhipster/cli');
  const executableName = Object.keys(bin)[0];

  runJHipster({
    executableName,
    executableVersion: version,
    defaultCommand: 'app',
    devBlueprintPath,
    blueprints: {
      [blueprint]: version,
    },
    printLogo: () => {
      const red = '\x1b[31m';
      const reset = '\x1b[0m';
      console.log('');
      console.log(`        ${red}███████╗${reset} ██╗   ██╗ ████████╗ ███████╗   ██████╗ ████████╗ ████████╗ ███████╗`);
      console.log(`        ${red}██╔═══██╗${reset}██║   ██║ ╚══██╔══╝ ██╔═══██╗ ██╔════╝ ╚══██╔══╝ ██╔═════╝ ██╔═══██╗`);
      console.log(`        ${red}███████╔╝${reset}████████║    ██║    ███████╔╝ ╚█████╗     ██║    ██████╗   ███████╔╝`);
      console.log(`        ${red}██╔══██║${reset} ██╔═══██║    ██║    ██╔════╝   ╚═══██╗    ██║    ██╔═══╝   ██╔══██║`);
      console.log(`        ${red}██║  ╚██╗${reset}██║   ██║ ████████╗ ██║       ██████╔╝    ██║    ████████╗ ██║  ╚██╗`);
      console.log(`        ${red}╚═╝   ╚═╝${reset}╚═╝   ╚═╝ ╚═══════╝ ╚═╝       ╚═════╝     ╚═╝    ╚═══════╝ ╚═╝   ╚═╝`);
      console.log('                            https://www.jhipster.tech');
      console.log('');
    },
    printBlueprintLogo: () => {
      console.log('================== 🦀 Rust Backend 🦀 ==================');
      console.log('');

      // For `jhipster-rust app --help` (or `-h`), surface the blueprint-specific
      // flags up front. The default `app --help` renders ~50 inherited JHipster
      // core flags; the four that actually shape a Rust-blueprint scaffold get
      // drowned out, and `--db` does not enumerate its choices in the core
      // schema. Print the cheat sheet here so it sits between the Rust badge
      // and JHipster's full Options block.
      const args = process.argv.slice(2);
      if (args[0] === 'app' && (args.includes('--help') || args.includes('-h'))) {
        console.log('Rust Blueprint quick reference');
        console.log('');
        console.log('  --application-type <type>     monolith | gateway | microservice');
        console.log('  --db <db>                     sqlite | postgresql | mysql | mongodb  (interactive only)');
        console.log('  --auth <type>                 jwt | oauth2                            (interactive only)');
        console.log('  --service-discovery-type <t>  consul | no');
        console.log('  --base-name <name>            Application name');
        console.log('  --defaults                    Skip prompts; built-in defaults are sqlite + jwt');
        console.log('  --skip-install                Skip dependency installation');
        console.log('  --skip-jhipster-dependencies  Skip writing JHipster deps to package.json');
        console.log('');
        console.log('Note: --db and --auth are silently overridden by --defaults (the built-in');
        console.log('defaults sqlite + jwt always win). To pick a different DB or auth, omit');
        console.log('--defaults and answer the prompts interactively.');
        console.log('');
        console.log('Examples:');
        console.log('  jhipster-rust app');
        console.log('      Run interactive prompts (the only way to pick non-default DB / auth).');
        console.log('  jhipster-rust app --defaults');
        console.log('      Fully scripted scaffold using built-in defaults (sqlite + jwt).');
        console.log('  jhipster-rust app --base-name myapp --application-type microservice \\');
        console.log('                    --defaults --skip-install');
        console.log('      Scripted microservice scaffold with sqlite + jwt.');
        console.log('');
        console.log('All JHipster core options below also apply.');
        console.log('');
      }
    },
    lookups: [{ packagePaths: [packagePath] }],
    ...require('./cli-customizations.cjs'),
  }).catch(done);

  process.on('unhandledRejection', up => {
    logger.error('Unhandled promise rejection at:');
    logger.fatal(up);
  });
})();
