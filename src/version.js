import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import semver from 'semver';

function getCurrentVersion(packagePath) {
  try {
    const content = readFileSync(packagePath, 'utf8');
    const pkg = JSON.parse(content);
    return pkg.version;
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error.message}`);
  }
}

function bumpVersion(currentVersion, bumpType) {
  if (!semver.valid(currentVersion)) {
    throw new Error(`Invalid version: ${currentVersion}`);
  }
  
  if (['patch', 'minor', 'major'].includes(bumpType)) {
    return semver.inc(currentVersion, bumpType);
  }
  
  if (semver.valid(bumpType)) {
    return semver.clean(bumpType);
  }
  
  throw new Error(`Invalid version bump type: ${bumpType}`);
}

function updatePackageVersion(packagePath, newVersion) {
  try {
    const content = readFileSync(packagePath, 'utf8');
    const pkg = JSON.parse(content);
    pkg.version = newVersion;
    writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    return true;
  } catch (error) {
    throw new Error(`Failed to update package.json: ${error.message}`);
  }
}

function resolveVersion(packagePath, versionInput) {
  const currentVersion = getCurrentVersion(packagePath);
  
  if (!versionInput) {
    return { currentVersion, newVersion: null, changed: false };
  }
  
  if (['patch', 'minor', 'major'].includes(versionInput)) {
    const newVersion = bumpVersion(currentVersion, versionInput);
    return { currentVersion, newVersion, changed: newVersion !== currentVersion };
  }
  
  if (semver.valid(versionInput)) {
    const newVersion = semver.clean(versionInput);
    return { currentVersion, newVersion, changed: newVersion !== currentVersion };
  }
  
  throw new Error(`Invalid version input: ${versionInput}`);
}

export default {
  getCurrentVersion,
  bumpVersion,
  updatePackageVersion,
  resolveVersion
};