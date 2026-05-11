import { readFileSync, writeFileSync, existsSync, appendFileSync, readFileSync as fsReadFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const DEFAULT_CONFIG = {
  devBranch: null,
  mainBranch: null,
  pushTag: false,
  noPush: false,
  preRelease: []
};

function detectDevBranch() {
  const candidates = ['dev', 'develop', 'development'];
  for (const branch of candidates) {
    try {
      execSync(`git rev-parse --verify ${branch}`, { stdio: 'pipe' });
      return branch;
    } catch {
      continue;
    }
  }
  return 'dev';
}

function detectMainBranch() {
  const candidates = ['main', 'master'];
  for (const branch of candidates) {
    try {
      execSync(`git rev-parse --verify ${branch}`, { stdio: 'pipe' });
      return branch;
    } catch {
      continue;
    }
  }
  return 'main';
}

function loadRcFile(cwd) {
  const rcPath = path.join(cwd, '.vttagrc.json');
  if (existsSync(rcPath)) {
    try {
      const content = readFileSync(rcPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
  return {};
}

function loadPackageConfig(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const content = readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(content);
      return pkg.vtag || {};
    } catch {
      return {};
    }
  }
  return {};
}

export function loadConfig(cwd = process.cwd(), cliOptions = {}) {
  const rcConfig = loadRcFile(cwd);
  const pkgConfig = loadPackageConfig(cwd);
  
  const merged = {
    ...DEFAULT_CONFIG,
    ...pkgConfig,
    ...rcConfig,
    ...cliOptions
  };
  
  if (!merged.devBranch) {
    merged.devBranch = detectDevBranch();
  }
  if (!merged.mainBranch) {
    merged.mainBranch = detectMainBranch();
  }
  
  return merged;
}

export function initConfig(cwd = process.cwd(), fileType = 'rc') {
  if (fileType === 'rc') {
    initRcConfig(cwd);
  } else if (fileType === 'package') {
    initPackageConfig(cwd);
  } else {
    throw new Error(`Invalid file type: ${fileType}. Use "rc" or "package".`);
  }
}

function initRcConfig(cwd) {
  const rcPath = path.join(cwd, '.vttagrc.json');
  
  if (existsSync(rcPath)) {
    console.log(`\x1b[33m.vttagrc.json already exists\x1b[0m`);
    return;
  }
  
  const config = {
    devBranch: null,
    mainBranch: null,
    pushTag: false,
    noPush: false,
    preRelease: []
  };
  
  writeFileSync(rcPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`\x1b[32m✓ Created .vttagrc.json\x1b[0m`);
  
  addToGitignore(cwd, '.vttagrc.json');
}

function initPackageConfig(cwd) {
  const pkgPath = path.join(cwd, 'package.json');
  
  if (!existsSync(pkgPath)) {
    throw new Error('package.json not found');
  }
  
  const content = readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(content);
  
  if (pkg.vtag) {
    console.log(`\x1b[33mvtag config already exists in package.json\x1b[0m`);
    return;
  }
  
  pkg.vtag = {
    devBranch: null,
    mainBranch: null,
    pushTag: false,
    noPush: false,
    preRelease: []
  };
  
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`\x1b[32m✓ Added vtag config to package.json\x1b[0m`);
}

function addToGitignore(cwd, entry) {
  const gitignorePath = path.join(cwd, '.gitignore');
  
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, entry + '\n', 'utf8');
    console.log(`\x1b[32m✓ Created .gitignore with ${entry}\x1b[0m`);
    return;
  }
  
  const content = fsReadFileSync(gitignorePath, 'utf8');
  const lines = content.split('\n');
  
  if (lines.some(line => line.trim() === entry)) {
    return;
  }
  
  const newContent = content.endsWith('\n') ? content + entry + '\n' : content + '\n' + entry + '\n';
  writeFileSync(gitignorePath, newContent, 'utf8');
  console.log(`\x1b[32m✓ Added ${entry} to .gitignore\x1b[0m`);
}

export default { loadConfig, initConfig };