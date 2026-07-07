import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import semver from 'semver';
import dotnet from './dotnet-version.js';

function getNpmVersion(packagePath) {
  try {
    const content = readFileSync(packagePath, 'utf8');
    const pkg = JSON.parse(content);
    return pkg.version;
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error.message}`);
  }
}

function updateNpmVersion(packagePath, newVersion) {
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

function getCurrentVersion(manifestPath, projectType) {
  if (projectType === 'dotnet') {
    return dotnet.getCurrentVersion(manifestPath);
  }
  return getNpmVersion(manifestPath);
}

function updateManifestVersion(manifestPath, newVersion, projectType) {
  if (projectType === 'dotnet') {
    return dotnet.updateVersion(manifestPath, newVersion);
  }
  return updateNpmVersion(manifestPath, newVersion);
}

function resolveVersion(manifestPath, versionInput, projectType) {
  const currentVersion = getCurrentVersion(manifestPath, projectType);
  
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
  updateManifestVersion,
  resolveVersion
};