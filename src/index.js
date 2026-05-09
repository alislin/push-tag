import chalk from 'chalk';
import path from 'path';
import { readFileSync } from 'fs';
import { loadConfig } from './config.js';
import version from './version.js';
import git from './git.js';
import npm from './npm.js';

class Vtag {
  constructor(cliOptions = {}) {
    this.cwd = process.cwd();
    this.packagePath = path.join(this.cwd, 'package.json');
    this.cliOptions = cliOptions;
    this.config = null;
    this.currentVersion = null;
    this.newVersion = null;
    this.tagName = null;
  }

  async run() {
    this.config = loadConfig(this.cwd, this.cliOptions);
    
    if (this.config.dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
    }
    
    this.printConfig();
    
    this.currentVersion = version.getCurrentVersion(this.packagePath);
    console.log(chalk.blue(`Current version: ${this.currentVersion}`));
    
    this.newVersion = version.resolveVersion(this.packagePath, this.config.version);
    this.tagName = `v${this.newVersion}`;
    
    if (this.newVersion === this.currentVersion && this.config.version) {
      console.log(chalk.yellow('No version change requested.'));
    } else if (this.newVersion !== this.currentVersion) {
      console.log(chalk.green(`New version: ${this.newVersion}`));
    }
    console.log(`Tag: ${this.tagName}\n`);
    
    this.validateGitState();
    
    if (git.tagExists(this.tagName)) {
      console.log(chalk.red(`Tag ${this.tagName} already exists. Aborting.`));
      process.exit(1);
    }
    
    if (this.config.dryRun) {
      this.printDryRunSteps();
      return;
    }
    
    await this.executeRelease();
  }

  printConfig() {
    console.log(chalk.bold('\nConfiguration:'));
    console.log(`  Dev branch: ${this.config.devBranch}`);
    console.log(`  Main branch: ${this.config.mainBranch}`);
    console.log(`  Push tag: ${this.config.pushTag}`);
    console.log(`  NPM publish: ${this.config.publish}`);
    console.log('');
  }

  validateGitState() {
    console.log(chalk.blue('Checking git status...'));
    git.checkGitStatus();
    console.log(chalk.green('✓ Working directory is clean\n'));
  }

  printDryRunSteps() {
    console.log(chalk.bold('\nDry run - steps that would be executed:'));
    const steps = this.getExecutionSteps();
    steps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`);
    });
  }

  getExecutionSteps() {
    const steps = [];
    const { devBranch, mainBranch, pushTag, publish } = this.config;
    
    if (this.newVersion !== this.currentVersion) {
      steps.push(`Update package.json version to ${this.newVersion}`);
      steps.push(`Commit version bump`);
    }
    
    steps.push(`Checkout ${mainBranch} branch`);
    steps.push(`Pull latest from ${mainBranch}`);
    steps.push(`Merge ${devBranch} into ${mainBranch}`);
    steps.push(`Push ${mainBranch} to remote`);
    steps.push(`Create tag ${this.tagName}`);
    
    if (pushTag) {
      steps.push(`Push tag ${this.tagName} to remote`);
    }
    
    if (publish) {
      steps.push(`Publish to npm`);
    }
    
    steps.push(`Checkout ${devBranch} branch`);
    
    return steps;
  }

  async executeRelease() {
    const { devBranch, mainBranch, pushTag, publish } = this.config;
    const originalBranch = git.getCurrentBranch();
    
    try {
      if (this.newVersion !== this.currentVersion) {
        console.log(chalk.blue(`Updating version to ${this.newVersion}...`));
        version.updatePackageVersion(this.packagePath, this.newVersion);
        
        console.log(chalk.blue('Committing version bump...'));
        git.addFile('package.json');
        git.commit(`chore: bump version to ${this.newVersion}`);
      }
      
      console.log(chalk.blue(`Checking out ${mainBranch}...`));
      git.checkout(mainBranch);
      
      console.log(chalk.blue(`Pulling latest from ${mainBranch}...`));
      git.pull(mainBranch);
      
      console.log(chalk.blue(`Merging ${devBranch} into ${mainBranch}...`));
      git.merge(devBranch);
      
      console.log(chalk.blue(`Pushing ${mainBranch} to remote...`));
      git.push(mainBranch);
      
      console.log(chalk.blue(`Creating tag ${this.tagName}...`));
      git.createTag(this.tagName, `Version ${this.newVersion}`);
      
      if (pushTag) {
        console.log(chalk.blue(`Pushing tag ${this.tagName} to remote...`));
        git.pushTag(this.tagName);
      }
      
      if (publish) {
        console.log(chalk.blue('Publishing to npm...'));
        npm.publish();
      }
      
      console.log(chalk.blue(`Checking out ${devBranch}...`));
      git.checkout(devBranch);
      
      console.log(chalk.green.bold(`\n✓ Release ${this.tagName} completed successfully!`));
      
      if (!pushTag) {
        console.log(chalk.yellow(`\nNote: Tag ${this.tagName} was created locally but not pushed.`));
        console.log(chalk.yellow(`Run 'git push origin ${this.tagName}' to push it manually.`));
      }
      
    } catch (error) {
      console.log(chalk.red(`\n✗ Error during release: ${error.message}`));
      console.log(chalk.yellow(`Returning to ${originalBranch}...`));
      git.checkout(originalBranch);
      throw error;
    }
  }
}

export default Vtag;