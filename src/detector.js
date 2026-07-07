import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import path from 'path'

const DOTNET_VERSION_REGEX = /<Version>([^<]*)<\/Version>/
const DOTNET_PREFIX_REGEX = /<VersionPrefix>([^<]*)<\/VersionPrefix>/
const DOTNET_SUFFIX_REGEX = /<VersionSuffix>([^<]*)<\/VersionSuffix>/
const ASSEMBLY_NAME_REGEX = /<AssemblyName>([^<]*)<\/AssemblyName>/

function readDotnetVersion(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8')

    const vMatch = content.match(DOTNET_VERSION_REGEX)
    if (vMatch && vMatch[1].trim()) return vMatch[1].trim()

    const vpMatch = content.match(DOTNET_PREFIX_REGEX)
    if (vpMatch && vpMatch[1].trim()) {
      const vsMatch = content.match(DOTNET_SUFFIX_REGEX)
      const prefix = vpMatch[1].trim()
      const suffix = vsMatch ? vsMatch[1].trim() : null
      return suffix ? `${prefix}-${suffix}` : prefix
    }

    return null
  } catch {
    return null
  }
}

function hasDotnetVersion(filePath) {
  return readDotnetVersion(filePath) !== null
}

function readAssemblyName(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8')
    const match = content.match(ASSEMBLY_NAME_REGEX)
    return match ? match[1].trim() : null
  } catch {
    return null
  }
}

function makeProject(name, type, version, manifestPath, versionFile, versionSource) {
  return { name, type, version, manifestPath, versionFile, versionSource }
}

export function detectProjects(cwd) {
  const projects = []

  const pkgPath = path.join(cwd, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
      projects.push(makeProject(
        pkg.name || path.basename(cwd),
        'npm',
        pkg.version || null,
        'package.json',
        'package.json',
        'self'
      ))
    } catch {}
  }

  const dirBuildPropsPath = path.join(cwd, 'Directory.Build.props')
  const dirBuildPropsVersion = existsSync(dirBuildPropsPath) ? readDotnetVersion(dirBuildPropsPath) : null
  if (dirBuildPropsVersion) {
    projects.push(makeProject(
      'Directory.Build.props',
      'dotnet',
      dirBuildPropsVersion,
      'Directory.Build.props',
      'Directory.Build.props',
      'self'
    ))
  }

  let entries
  try {
    entries = readdirSync(cwd)
  } catch {
    return projects
  }

  const csprojFiles = entries.filter(f => f.endsWith('.csproj'))
  for (const file of csprojFiles) {
    const filePath = path.join(cwd, file)
    if (!statSync(filePath).isFile()) continue

    const hasOwnVersion = hasDotnetVersion(filePath)
    const assemblyName = readAssemblyName(filePath)
    const name = assemblyName || path.basename(file, '.csproj')

    if (hasOwnVersion) {
      const version = readDotnetVersion(filePath)
      projects.push(makeProject(name, 'dotnet', version, file, file, 'self'))
    } else if (dirBuildPropsVersion) {
      projects.push(makeProject(name, 'dotnet', dirBuildPropsVersion, file, 'Directory.Build.props', 'Directory.Build.props'))
    } else {
      projects.push(makeProject(name, 'dotnet', null, file, file, 'none'))
    }
  }

  return projects
}

export function selectConfiguredProject(projects, config) {
  if (config.manifestPath) {
    const configured = projects.find(
      p => p.manifestPath === config.manifestPath || path.basename(p.manifestPath) === config.manifestPath
    )
    if (configured) return configured
  }

  if (config.projectType) {
    const typeMatch = projects.filter(p => p.type === config.projectType)
    if (typeMatch.length === 1) return typeMatch[0]
  }

  return null
}

export function findDirBuildProps(projects) {
  return projects.find(p => p.manifestPath === 'Directory.Build.props') || null
}
