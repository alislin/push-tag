import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { loadConfig, saveConfig, initConfig } from '../src/config.js'

let tmpDir

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'vtag-test-'))
})

after(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('loadConfig', () => {
  test('returns defaults when no config files', () => {
    const config = loadConfig(tmpDir, {})
    assert.strictEqual(config.pushTag, false)
    assert.strictEqual(config.noPush, false)
    assert.strictEqual(config.preRelease.length, 0)
    assert.strictEqual(config.skipPre, false)
    assert.strictEqual(config.projectType, null)
    assert.strictEqual(config.manifestPath, null)
  })

  test('merges CLI options on top of defaults', () => {
    const config = loadConfig(tmpDir, { pushTag: true, version: 'patch' })
    assert.strictEqual(config.pushTag, true)
    assert.strictEqual(config.version, 'patch')
  })

  test('reads .vttagrc.json', () => {
    writeFileSync(join(tmpDir, '.vttagrc.json'), JSON.stringify({
      devBranch: 'develop',
      pushTag: true,
      projectType: 'dotnet',
      manifestPath: 'MyApp.csproj'
    }), 'utf8')
    const config = loadConfig(tmpDir, {})
    assert.strictEqual(config.devBranch, 'develop')
    assert.strictEqual(config.pushTag, true)
    assert.strictEqual(config.projectType, 'dotnet')
    assert.strictEqual(config.manifestPath, 'MyApp.csproj')
  })

  test('CLI options override rc file', () => {
    const config = loadConfig(tmpDir, { pushTag: false })
    assert.strictEqual(config.pushTag, false)
  })
})

describe('saveConfig', () => {
  test('creates .vttagrc.json with given updates', () => {
    saveConfig(tmpDir, { projectType: 'dotnet', manifestPath: 'MyApp.csproj' })
    const rcPath = join(tmpDir, '.vttagrc.json')
    assert.ok(existsSync(rcPath))
    const content = JSON.parse(readFileSync(rcPath, 'utf8'))
    assert.strictEqual(content.projectType, 'dotnet')
    assert.strictEqual(content.manifestPath, 'MyApp.csproj')
  })

  test('merges with existing .vttagrc.json', () => {
    saveConfig(tmpDir, { pushTag: true })
    const content = JSON.parse(readFileSync(join(tmpDir, '.vttagrc.json'), 'utf8'))
    assert.strictEqual(content.projectType, 'dotnet')
    assert.strictEqual(content.pushTag, true)
  })

  test('updates existing values', () => {
    saveConfig(tmpDir, { manifestPath: 'Other.csproj' })
    const content = JSON.parse(readFileSync(join(tmpDir, '.vttagrc.json'), 'utf8'))
    assert.strictEqual(content.manifestPath, 'Other.csproj')
  })
})

describe('initConfig', () => {
  test('init creates .vttagrc.json', () => {
    const initDir = mkdtempSync(join(tmpdir(), 'vtag-init-'))
    initConfig(initDir, 'rc')
    const rcPath = join(initDir, '.vttagrc.json')
    assert.ok(existsSync(rcPath))
    const content = JSON.parse(readFileSync(rcPath, 'utf8'))
    assert.strictEqual(content.projectType, null)
    assert.strictEqual(content.manifestPath, null)
    rmSync(initDir, { recursive: true, force: true })
  })
})
