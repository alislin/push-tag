#!/usr/bin/env node
import { program } from 'commander';
import Vtag from '../src/index.js';
import { initConfig } from '../src/config.js';

function collect(value, previous) {
  return previous.concat([value]);
}

program
  .name('vtag')
  .description('CLI tool for automatic version bumping, git branch merge and tag creation')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize configuration file')
  .option('-f, --file <type>', 'config file type: "rc" for .vttagrc.json, "package" for package.json', 'rc')
  .action(async (options) => {
    try {
      initConfig(process.cwd(), options.file);
    } catch (error) {
      console.error(`\x1b[31mError: ${error.message}\x1b[0m`);
      process.exit(1);
    }
  });

program
  .argument('[version]', 'version bump type (patch/minor/major) or specific version number')
  .option('-p, --patch', 'bump patch version')
  .option('-m, --minor', 'bump minor version')
  .option('-M, --major', 'bump major version')
  .option('-t, --push-tag', 'create and push tag to remote')
  .option('-n, --no-push', 'disable push (branches and tags)')
  .option('-d, --dry-run', 'preview without executing')
  .option('--dev-branch <name>', 'development branch name')
  .option('--main-branch <name>', 'main/production branch name')
  .option('--skip-pre', 'skip pre-release commands')
  .option('--pre <command>', 'override pre-release commands (can be used multiple times)', collect, [])
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
      noPush: options.noPush || false,
      dryRun: options.dryRun || false,
      devBranch: options.devBranch,
      mainBranch: options.mainBranch,
      skipPre: options.skipPre || false
    };
    
    if (options.pre.length > 0) {
      config.preRelease = options.pre;
    }
    
    try {
      const vtag = new Vtag(config);
      await vtag.run();
    } catch (error) {
      console.error(`\x1b[31mError: ${error.message}\x1b[0m`);
      process.exit(1);
    }
  });

program.parse();