import { test, describe, before, after } from 'node:test'
import assert from 'node:assert'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import dotnet from '../src/dotnet-version.js'

let tmpDir

before(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'vtag-test-'))
})

after(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

function writeCsproj(name, content) {
  const p = join(tmpDir, name)
  writeFileSync(p, content, 'utf8')
  return p
}

function readCsproj(p) {
  return readFileSync(p, 'utf8')
}

describe('getCurrentVersion', () => {
  test('reads <Version> tag', () => {
    const p = writeCsproj('v1.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <Version>1.2.3</Version>
  </PropertyGroup>
</Project>`)
    assert.strictEqual(dotnet.getCurrentVersion(p), '1.2.3')
  })

  test('reads <VersionPrefix> without <VersionSuffix>', () => {
    const p = writeCsproj('v2.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <VersionPrefix>3.0.0</VersionPrefix>
  </PropertyGroup>
</Project>`)
    assert.strictEqual(dotnet.getCurrentVersion(p), '3.0.0')
  })

  test('reads <VersionPrefix> with <VersionSuffix>', () => {
    const p = writeCsproj('v3.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <VersionPrefix>3.0.0</VersionPrefix>
    <VersionSuffix>rc.1</VersionSuffix>
  </PropertyGroup>
</Project>`)
    assert.strictEqual(dotnet.getCurrentVersion(p), '3.0.0-rc.1')
  })

  test('throws when no version tags exist', () => {
    const p = writeCsproj('v4.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
</Project>`)
    assert.throws(() => dotnet.getCurrentVersion(p), { message: /Version not found/ })
  })

  test('throws when file does not exist', () => {
    assert.throws(() => dotnet.getCurrentVersion(join(tmpDir, 'nonexist.csproj')), { code: 'ENOENT' })
  })

  test('strips whitespace from version', () => {
    const p = writeCsproj('v5.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <Version>  2.0.0  </Version>
  </PropertyGroup>
</Project>`)
    assert.strictEqual(dotnet.getCurrentVersion(p), '2.0.0')
  })

  test('<Version> takes priority over <VersionPrefix>', () => {
    const p = writeCsproj('v6.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <Version>4.0.0</Version>
    <VersionPrefix>5.0.0</VersionPrefix>
  </PropertyGroup>
</Project>`)
    assert.strictEqual(dotnet.getCurrentVersion(p), '4.0.0')
  })
})

describe('updateVersion', () => {
  test('updates <Version> tag', () => {
    const p = writeCsproj('update1.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <Version>1.0.0</Version>
  </PropertyGroup>
</Project>`)
    dotnet.updateVersion(p, '2.0.0')
    const content = readCsproj(p)
    assert.match(content, /<Version>2\.0\.0<\/Version>/)
    assert.strictEqual(dotnet.getCurrentVersion(p), '2.0.0')
  })

  test('updates <VersionPrefix> and removes <VersionSuffix>', () => {
    const p = writeCsproj('update2.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <VersionPrefix>1.0.0</VersionPrefix>
    <VersionSuffix>beta.1</VersionSuffix>
  </PropertyGroup>
</Project>`)
    dotnet.updateVersion(p, '2.0.0')
    assert.strictEqual(dotnet.getCurrentVersion(p), '2.0.0')
    const content = readCsproj(p)
    assert.match(content, /<VersionPrefix>2\.0\.0<\/VersionPrefix>/)
    assert.doesNotMatch(content, /<VersionSuffix>/)
  })

  test('adds <VersionSuffix> to existing <VersionPrefix>', () => {
    const p = writeCsproj('update3.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <VersionPrefix>1.0.0</VersionPrefix>
  </PropertyGroup>
</Project>`)
    dotnet.updateVersion(p, '1.0.0-beta.1')
    assert.strictEqual(dotnet.getCurrentVersion(p), '1.0.0-beta.1')
    const content = readCsproj(p)
    assert.match(content, /<VersionSuffix>beta\.1<\/VersionSuffix>/)
  })

  test('updates existing <VersionSuffix>', () => {
    const p = writeCsproj('update4.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <VersionPrefix>1.0.0</VersionPrefix>
    <VersionSuffix>beta.1</VersionSuffix>
  </PropertyGroup>
</Project>`)
    dotnet.updateVersion(p, '1.0.0-rc.2')
    assert.strictEqual(dotnet.getCurrentVersion(p), '1.0.0-rc.2')
    const content = readCsproj(p)
    assert.match(content, /<VersionSuffix>rc\.2<\/VersionSuffix>/)
  })

  test('throws when no version tags exist', () => {
    const p = writeCsproj('update5.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
</Project>`)
    assert.throws(() => dotnet.updateVersion(p, '1.0.0'), { message: /version tags not found/ })
  })
})
