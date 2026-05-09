import { execSync } from 'child_process';

function exec(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result?.toString().trim();
  } catch (error) {
    if (options.ignoreError) {
      return null;
    }
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function checkGitStatus() {
  const status = exec('git status --porcelain', { silent: true });
  if (status) {
    throw new Error('Working directory has uncommitted changes. Please commit or stash them first.');
  }
}

function tagExists(tagName) {
  const result = exec(`git tag -l ${tagName}`, { silent: true, ignoreError: true });
  return result === tagName;
}

function getCurrentBranch() {
  return exec('git rev-parse --abbrev-ref HEAD', { silent: true });
}

function checkout(branch) {
  exec(`git checkout ${branch}`);
}

function pull(branch) {
  exec(`git pull origin ${branch}`);
}

function merge(branch) {
  exec(`git merge ${branch}`);
}

function push(branch) {
  exec(`git push origin ${branch}`);
}

function createTag(tagName, message) {
  exec(`git tag -a ${tagName} -m "${message}"`);
}

function pushTag(tagName) {
  exec(`git push origin ${tagName}`);
}

function commitAll(message) {
  exec('git add -A');
  exec(`git commit -m "${message}"`);
}

function addFile(file) {
  exec(`git add ${file}`);
}

function commit(message) {
  exec(`git commit -m "${message}"`);
}

export default {
  checkGitStatus,
  tagExists,
  getCurrentBranch,
  checkout,
  pull,
  merge,
  push,
  createTag,
  pushTag,
  commitAll,
  addFile,
  commit
};