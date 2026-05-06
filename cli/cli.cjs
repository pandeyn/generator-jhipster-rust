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
        console.log('  --db <db>                     sqlite | postgresql | mysql | mongodb');
        console.log('  --auth <type>                 jwt | oauth2 | session');
        console.log('  --service-discovery-type <t>  consul | eureka | no');
        console.log('  --base-name <name>            Application name');
        console.log('  --defaults                    Skip prompts, use built-in defaults');
        console.log('  --skip-install                Skip dependency installation');
        console.log('  --skip-jhipster-dependencies  Skip writing JHipster deps to package.json');
        console.log('');
        console.log('Examples:');
        console.log('  jhipster-rust app');
        console.log('      Run interactive prompts.');
        console.log('  jhipster-rust app --defaults');
        console.log('      Use the built-in defaults; no prompts.');
        console.log('  jhipster-rust app --base-name myapp --application-type microservice \\');
        console.log('                    --db sqlite --auth jwt --defaults --skip-install');
        console.log('      Fully scripted scaffold for a microservice.');
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
