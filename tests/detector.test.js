import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { detectProjects, selectConfiguredProject, findDirBuildProps } from '../src/detector.js'

let tmpDir

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'vtag-test-'))
})

after(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('detectProjects — npm', () => {
  test('detects package.json', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'myapp', version: '1.0.0' }), 'utf8')
    const projects = detectProjects(tmpDir)
    const npm = projects.find(p => p.type === 'npm')
    assert.ok(npm)
    assert.strictEqual(npm.name, 'myapp')
    assert.strictEqual(npm.version, '1.0.0')
    assert.strictEqual(npm.manifestPath, 'package.json')
    assert.strictEqual(npm.versionFile, 'package.json')
    assert.strictEqual(npm.versionSource, 'self')
  })

  test('returns empty array when no projects', () => {
    const empty = mkdtempSync(join(tmpdir(), 'empty-'))
    const projects = detectProjects(empty)
    assert.strictEqual(projects.length, 0)
    rmSync(empty, { recursive: true, force: true })
  })
})

describe('detectProjects — dotnet with Directory.Build.props', () => {
  before(() => {
    writeFileSync(join(tmpDir, 'Directory.Build.props'), `<Project>
  <PropertyGroup>
    <Version>1.0.0</Version>
  </PropertyGroup>
</Project>`, 'utf8')
  })

  test('Directory.Build.props is listed with self source', () => {
    const projects = detectProjects(tmpDir)
    const props = projects.find(p => p.manifestPath === 'Directory.Build.props')
    assert.ok(props)
    assert.strictEqual(props.version, '1.0.0')
    assert.strictEqual(props.versionSource, 'self')
    assert.strictEqual(props.versionFile, 'Directory.Build.props')
  })

  test('.csproj without own version inherits from Directory.Build.props', () => {
    writeFileSync(join(tmpDir, 'MyApp.csproj'), `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <AssemblyName>MyApp</AssemblyName>
  </PropertyGroup>
</Project>`, 'utf8')
    const projects = detectProjects(tmpDir)
    const app = projects.find(p => p.name === 'MyApp')
    assert.ok(app)
    assert.strictEqual(app.version, '1.0.0')
    assert.strictEqual(app.versionSource, 'Directory.Build.props')
    assert.strictEqual(app.versionFile, 'Directory.Build.props')
  })

  test('.csproj with own version uses self source', () => {
    writeFileSync(join(tmpDir, 'MyLib.csproj'), `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <AssemblyName>MyLib</AssemblyName>
    <Version>2.0.0</Version>
  </PropertyGroup>
</Project>`, 'utf8')
    const projects = detectProjects(tmpDir)
    const lib = projects.find(p => p.name === 'MyLib')
    assert.ok(lib)
    assert.strictEqual(lib.version, '2.0.0')
    assert.strictEqual(lib.versionSource, 'self')
    assert.strictEqual(lib.versionFile, 'MyLib.csproj')
  })
})

describe('detectProjects — dotnet without Directory.Build.props', () => {
  let noPropsDir

  before(() => {
    noPropsDir = join(tmpDir, 'no-props')
    mkdirSync(noPropsDir, { recursive: true })
    writeFileSync(join(noPropsDir, 'MyApp.csproj'), `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <AssemblyName>MyApp</AssemblyName>
    <Version>1.0.0</Version>
  </PropertyGroup>
</Project>`, 'utf8')
    writeFileSync(join(noPropsDir, 'NoVer.csproj'), `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <AssemblyName>NoVer</AssemblyName>
  </PropertyGroup>
</Project>`, 'utf8')
  })

  test('csproj with version uses self source', () => {
    const projects = detectProjects(noPropsDir)
    const app = projects.find(p => p.name === 'MyApp')
    assert.ok(app)
    assert.strictEqual(app.versionSource, 'self')
    assert.strictEqual(app.versionFile, 'MyApp.csproj')
  })

  test('csproj without version and without props has version null', () => {
    const projects = detectProjects(noPropsDir)
    const nover = projects.find(p => p.name === 'NoVer')
    assert.ok(nover)
    assert.strictEqual(nover.version, null)
    assert.strictEqual(nover.versionSource, 'none')
  })
})

describe('selectConfiguredProject', () => {
  const projects = [
    { name: 'App1', type: 'dotnet', manifestPath: 'App1.csproj', versionFile: 'App1.csproj', versionSource: 'self' },
    { name: 'App2', type: 'dotnet', manifestPath: 'App2.csproj', versionFile: 'Directory.Build.props', versionSource: 'Directory.Build.props' }
  ]

  test('matches by manifestPath', () => {
    const result = selectConfiguredProject(projects, { manifestPath: 'App1.csproj' })
    assert.ok(result)
    assert.strictEqual(result.name, 'App1')
  })

  test('returns null when no match', () => {
    const result = selectConfiguredProject(projects, { manifestPath: 'nonexist.csproj' })
    assert.strictEqual(result, null)
  })

  test('returns null when no config', () => {
    const result = selectConfiguredProject(projects, {})
    assert.strictEqual(result, null)
  })

  test('matches single project by projectType', () => {
    const single = [
      { name: 'Only', type: 'dotnet', manifestPath: 'Only.csproj', versionFile: 'Only.csproj', versionSource: 'self' }
    ]
    const result = selectConfiguredProject(single, { projectType: 'dotnet' })
    assert.ok(result)
    assert.strictEqual(result.name, 'Only')
  })
})

describe('findDirBuildProps', () => {
  test('finds Directory.Build.props project', () => {
    const projects = [
      { name: 'App', manifestPath: 'App.csproj' },
      { name: 'Directory.Build.props', manifestPath: 'Directory.Build.props' }
    ]
    const result = findDirBuildProps(projects)
    assert.ok(result)
    assert.strictEqual(result.name, 'Directory.Build.props')
  })

  test('returns null when not found', () => {
    const projects = [
      { name: 'App', manifestPath: 'App.csproj' }
    ]
    assert.strictEqual(findDirBuildProps(projects), null)
  })
})
