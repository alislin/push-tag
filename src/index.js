import path from 'path';
import { execSync } from 'child_process';
import { loadConfig } from './config.js';
import version from './version.js';
import git from './git.js';

class Vtag {
  constructor(cliOptions = {}) {
    this.cwd = process.cwd();
    this.packagePath = path.join(this.cwd, 'package.json');
    this.cliOptions = cliOptions;
    this.config = null;
    this.currentVersion = null;
    this.newVersion = null;
    this.tagName = null;
    this.originalBranch = null;
  }

  async run() {
    this.config = loadConfig(this.cwd, this.cliOptions);
    
    if (this.config.dryRun) {
      console.log('\x1b[33m🔍 DRY RUN MODE - No changes will be made\x1b[0m\n');
    }
    
    this.printConfig();
    
    this.originalBranch = git.getCurrentBranch();
    
    if (!git.isAllowedBranch(this.originalBranch, this.config.devBranch, this.config.mainBranch)) {
      console.log(`\x1b[31m当前分支 '${this.originalBranch}' 不合法，请在 '${this.config.devBranch}' 或 '${this.config.mainBranch}' 分支执行此命令\x1b[0m`);
      process.exit(1);
    }
    
    if (!git.isStatusClear()) {
      console.log(`\x1b[31m当前分支 '${this.originalBranch}' 有未提交的更改，请先提交或暂存后再执行\x1b[0m`);
      process.exit(1);
    }
    
    const versionInfo = version.resolveVersion(this.packagePath, this.config.version);
    this.currentVersion = versionInfo.currentVersion;
    this.newVersion = versionInfo.newVersion;
    this.tagName = `v${this.newVersion || this.currentVersion}`;
    
    console.log(`\x1b[36mCurrent version: ${this.currentVersion}\x1b[0m`);
    if (versionInfo.changed) {
      console.log(`\x1b[32mNew version: ${this.newVersion}\x1b[0m`);
    }
    if (this.config.pushTag) {
      console.log(`\x1b[36mTag: ${this.tagName}\x1b[0m`);
    }
    console.log('');
    
    if (this.config.pushTag && git.tagExists(this.tagName)) {
      console.log(`\x1b[31mTag '${this.tagName}' 已存在\x1b[0m`);
      process.exit(1);
    }
    
    if (this.config.dryRun) {
      this.printDryRunSteps(versionInfo.changed);
      return;
    }
    
    await this.execute(versionInfo.changed);
  }

  printConfig() {
    console.log('\x1b[1mConfiguration:\x1b[0m');
    console.log(`  Current branch: ${this.originalBranch || 'detecting...'}`);
    console.log(`  Dev branch: ${this.config.devBranch}`);
    console.log(`  Main branch: ${this.config.mainBranch}`);
    console.log(`  Push tag: ${this.config.pushTag}`);
    console.log(`  No push: ${this.config.noPush}`);
    if (this.config.preRelease?.length) {
      console.log(`  Pre-release: ${this.config.preRelease.join(', ')}`);
    }
    console.log('');
  }

  printDryRunSteps(versionChanged) {
    console.log('\x1b[1mDry run - steps that would be executed:\x1b[0m');
    const steps = this.getExecutionSteps(versionChanged);
    steps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`);
    });
  }

  runPreReleaseCommands(location) {
    if (this.config.skipPre || !this.config.preRelease?.length) {
      return;
    }
    
    console.log(`\x1b[1m[${location}] Running pre-release commands...\x1b[0m`);
    
    for (const cmd of this.config.preRelease) {
      console.log(`\x1b[36m> ${cmd}\x1b[0m`);
      try {
        execSync(cmd, { stdio: 'inherit', cwd: this.cwd });
        console.log('\x1b[32m✓ Passed\x1b[0m\n');
      } catch (error) {
        console.log(`\x1b[31m✗ Failed: ${cmd}\x1b[0m`);
        throw new Error(`Pre-release command failed: ${cmd}`);
      }
    }
  }

  getExecutionSteps(versionChanged) {
    const steps = [];
    const { devBranch, mainBranch, pushTag, noPush, preRelease, skipPre } = this.config;
    const fromDev = this.originalBranch === devBranch;
    const hasPreRelease = preRelease?.length && !skipPre;
    
    if (versionChanged) {
      steps.push(`Update package.json version to ${this.newVersion}`);
      steps.push(`Commit version bump`);
    }
    
    if (fromDev && !noPush) {
      if (hasPreRelease) {
        preRelease.forEach(cmd => steps.push(`[dev] Run: ${cmd}`));
      }
      steps.push(`Push ${devBranch} to remote`);
    }
    
    steps.push(`Checkout ${mainBranch} branch`);
    steps.push(`Pull latest from ${mainBranch}`);
    
    if (fromDev) {
      steps.push(`Merge ${devBranch} into ${mainBranch}`);
    }
    
    if (hasPreRelease) {
      preRelease.forEach(cmd => steps.push(`[main] Run: ${cmd}`));
    }
    
    if (!noPush) {
      steps.push(`Push ${mainBranch} to remote`);
    }
    
    if (pushTag) {
      steps.push(`Create tag ${this.tagName}`);
      if (!noPush) {
        steps.push(`Push tag ${this.tagName} to remote`);
      }
    }
    
    if (fromDev) {
      steps.push(`Checkout ${devBranch} branch`);
    }
    
    return steps;
  }

  async execute(versionChanged) {
    const { devBranch, mainBranch, pushTag, noPush } = this.config;
    const fromDev = this.originalBranch === devBranch;
    
    try {
      if (versionChanged) {
        console.log(`\x1b[36mUpdating version to ${this.newVersion}...\x1b[0m`);
        version.updatePackageVersion(this.packagePath, this.newVersion);
        
        console.log('\x1b[36mCommitting version bump...\x1b[0m');
        git.addFile('package.json');
        git.commit(`chore: bump version to ${this.newVersion}`);
      }
      
      if (fromDev && !noPush) {
        this.runPreReleaseCommands('dev');
        console.log(`\x1b[36mPushing ${devBranch} to remote...\x1b[0m`);
        git.push(devBranch);
      }
      
      console.log(`\x1b[36mChecking out ${mainBranch}...\x1b[0m`);
      git.checkout(mainBranch);
      
      console.log(`\x1b[36mPulling latest from ${mainBranch}...\x1b[0m`);
      git.pull(mainBranch);
      
      if (fromDev) {
        console.log(`\x1b[36mMerging ${devBranch} into ${mainBranch}...\x1b[0m`);
        git.merge(devBranch);
      }
      
      this.runPreReleaseCommands('main');
      
      if (!noPush) {
        console.log(`\x1b[36mPushing ${mainBranch} to remote...\x1b[0m`);
        git.push(mainBranch);
      }
      
      if (pushTag) {
        console.log(`\x1b[36mCreating tag ${this.tagName}...\x1b[0m`);
        git.createTag(this.tagName, `Version ${this.newVersion || this.currentVersion}`);
        
        if (!noPush) {
          console.log(`\x1b[36mPushing tag ${this.tagName} to remote...\x1b[0m`);
          git.pushTag(this.tagName);
        }
      }
      
      if (fromDev) {
        console.log(`\x1b[36mChecking out ${devBranch}...\x1b[0m`);
        git.checkout(devBranch);
      }
      
      console.log(`\x1b[32m\x1b[1m\n✓ Completed successfully!\x1b[0m`);
      
      if (pushTag && noPush) {
        console.log(`\x1b[33m\nNote: Tag ${this.tagName} was created locally but not pushed.\x1b[0m`);
        console.log(`\x1b[33mRun 'git push origin ${this.tagName}' to push it manually.\x1b[0m`);
      }
      
    } catch (error) {
      console.log(`\x1b[31m\n✗ Error: ${error.message}\x1b[0m`);
      console.log(`\x1b[33mReturning to ${this.originalBranch}...\x1b[0m`);
      git.checkout(this.originalBranch);
      throw error;
    }
  }
}

export default Vtag;