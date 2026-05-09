import { execSync } from 'child_process';

function publish(options = {}) {
  const args = [];
  
  if (options.tag) {
    args.push('--tag', options.tag);
  }
  
  if (options.access) {
    args.push('--access', options.access);
  }
  
  if (options.dryRun) {
    args.push('--dry-run');
  }
  
  const command = `npm publish ${args.join(' ')}`.trim();
  
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    throw new Error(`npm publish failed: ${error.message}`);
  }
}

function isNpmLoggedIn() {
  try {
    execSync('npm whoami', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getRegistry() {
  try {
    const result = execSync('npm config get registry', { encoding: 'utf8' });
    return result.trim();
  } catch {
    return 'https://registry.npmjs.org/';
  }
}

export default {
  publish,
  isNpmLoggedIn,
  getRegistry
};