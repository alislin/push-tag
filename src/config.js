import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const DEFAULT_CONFIG = {
  devBranch: null,
  mainBranch: null,
  pushTag: false,
  publish: true
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

export default { loadConfig };