import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import version from '../src/version.js'

let tmpDir

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'vtag-test-'))
})

after(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('bumpVersion', () => {
  test('bumps patch', () => {
    assert.strictEqual(version.bumpVersion('1.0.0', 'patch'), '1.0.1')
  })

  test('bumps minor', () => {
    assert.strictEqual(version.bumpVersion('1.0.0', 'minor'), '1.1.0')
  })

  test('bumps major', () => {
    assert.strictEqual(version.bumpVersion('1.0.0', 'major'), '2.0.0')
  })

  test('accepts explicit version', () => {
    assert.strictEqual(version.bumpVersion('1.0.0', '2.3.4'), '2.3.4')
  })

  test('accepts explicit version with prerelease', () => {
    assert.strictEqual(version.bumpVersion('1.0.0', '2.0.0-beta.1'), '2.0.0-beta.1')
  })

  test('throws on invalid current version', () => {
    assert.throws(() => version.bumpVersion('abc', 'patch'), { message: /Invalid version/ })
  })

  test('throws on invalid bump type', () => {
    assert.throws(() => version.bumpVersion('1.0.0', 'foo'), { message: /Invalid version bump type/ })
  })
})

describe('resolveVersion for npm', () => {
  let pkgPath

  before(() => {
    pkgPath = join(tmpDir, 'package.json')
    writeFileSync(pkgPath, JSON.stringify({ name: 'test', version: '1.0.0' }), 'utf8')
  })

  test('returns current version when no input', () => {
    const result = version.resolveVersion(pkgPath, null, 'npm')
    assert.strictEqual(result.currentVersion, '1.0.0')
    assert.strictEqual(result.newVersion, null)
    assert.strictEqual(result.changed, false)
  })

  test('returns new version with patch bump', () => {
    const result = version.resolveVersion(pkgPath, 'patch', 'npm')
    assert.strictEqual(result.currentVersion, '1.0.0')
    assert.strictEqual(result.newVersion, '1.0.1')
    assert.strictEqual(result.changed, true)
  })

  test('returns new version with minor bump', () => {
    const result = version.resolveVersion(pkgPath, 'minor', 'npm')
    assert.strictEqual(result.newVersion, '1.1.0')
    assert.strictEqual(result.changed, true)
  })

  test('returns new version with explicit version', () => {
    const result = version.resolveVersion(pkgPath, '2.0.0', 'npm')
    assert.strictEqual(result.newVersion, '2.0.0')
    assert.strictEqual(result.changed, true)
  })
})

describe('resolveVersion for dotnet', () => {
  let csprojPath

  before(() => {
    csprojPath = join(tmpDir, 'Test.csproj')
    writeFileSync(csprojPath, `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <Version>3.0.0</Version>
  </PropertyGroup>
</Project>`, 'utf8')
  })

  test('returns current version when no input', () => {
    const result = version.resolveVersion(csprojPath, null, 'dotnet')
    assert.strictEqual(result.currentVersion, '3.0.0')
    assert.strictEqual(result.changed, false)
  })

  test('bumps patch for dotnet', () => {
    const result = version.resolveVersion(csprojPath, 'patch', 'dotnet')
    assert.strictEqual(result.currentVersion, '3.0.0')
    assert.strictEqual(result.newVersion, '3.0.1')
    assert.strictEqual(result.changed, true)
  })
})

describe('getCurrentVersion dispatch', () => {
  test('getCurrentVersion throws for npm with missing file', () => {
    assert.throws(
      () => version.getCurrentVersion('/nonexist/package.json', 'npm'),
      { message: /Failed to read package.json/ }
    )
  })

  test('getCurrentVersion throws for dotnet with missing file', () => {
    assert.throws(
      () => version.getCurrentVersion('/nonexist/proj.csproj', 'dotnet'),
      { code: 'ENOENT' }
    )
  })
})
