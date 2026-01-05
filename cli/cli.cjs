#!/usr/bin/env node

const { dirname, basename, join } = require('path');
const { version, bin } = require('../package.json');

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
    },
    lookups: [{ packagePaths: [packagePath] }],
    ...require('./cli-customizations.cjs'),
  }).catch(done);

  process.on('unhandledRejection', up => {
    logger.error('Unhandled promise rejection at:');
    logger.fatal(up);
  });
})();
