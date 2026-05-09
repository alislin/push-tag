#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import Vtag from '../src/index.js';

program
  .name('vtag')
  .description('CLI tool for automatic version bumping, git tag creation and npm publishing')
  .version('1.0.0')
  .argument('[version]', 'version bump type (patch/minor/major) or specific version number')
  .option('-p, --patch', 'bump patch version')
  .option('-m, --minor', 'bump minor version')
  .option('-M, --major', 'bump major version')
  .option('-t, --push-tag', 'push tag to remote (default: false)')
  .option('-P, --no-publish', 'skip npm publish')
  .option('-d, --dry-run', 'preview without executing')
  .option('--dev-branch <name>', 'development branch name')
  .option('--main-branch <name>', 'main/production branch name')
  .action(async (version, options) => {
    let bumpType = null;
    
    if (options.patch) bumpType = 'patch';
    else if (options.minor) bumpType = 'minor';
    else if (options.major) bumpType = 'major';
    else if (version) {
      if (['patch', 'minor', 'major'].includes(version)) {
        bumpType = version;
      }
    }
    
    const config = {
      version: bumpType || version || null,
      pushTag: options.pushTag || false,
      publish: !options.noPublish,
      dryRun: options.dryRun || false,
      devBranch: options.devBranch,
      mainBranch: options.mainBranch
    };
    
    try {
      const vtag = new Vtag(config);
      await vtag.run();
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();