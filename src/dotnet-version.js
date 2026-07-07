import { readFileSync, writeFileSync } from 'fs'

const VERSION_REGEX = /<Version>([^<]*)<\/Version>/
const PREFIX_REGEX = /<VersionPrefix>([^<]*)<\/VersionPrefix>/
const SUFFIX_REGEX = /<VersionSuffix>([^<]*)<\/VersionSuffix>/

function getVersionInfo(manifestPath) {
  const content = readFileSync(manifestPath, 'utf8')

  const vMatch = content.match(VERSION_REGEX)
  if (vMatch && vMatch[1].trim()) {
    return { format: 'version', currentVersion: vMatch[1].trim(), content }
  }

  const vpMatch = content.match(PREFIX_REGEX)
  if (vpMatch && vpMatch[1].trim()) {
    const vsMatch = content.match(SUFFIX_REGEX)
    const prefix = vpMatch[1].trim()
    const suffix = vsMatch ? vsMatch[1].trim() : null
    const currentVersion = suffix ? `${prefix}-${suffix}` : prefix
    return { format: 'prefix-suffix', currentVersion, prefix, suffix, content }
  }

  return null
}

function getCurrentVersion(manifestPath) {
  const info = getVersionInfo(manifestPath)
  if (!info) throw new Error(`Version not found in ${manifestPath}`)
  return info.currentVersion
}

function updateVersion(manifestPath, newVersion) {
  const info = getVersionInfo(manifestPath)
  if (!info) throw new Error(`Cannot update version: version tags not found in ${manifestPath}`)

  let updated

  if (info.format === 'version') {
    updated = info.content.replace(VERSION_REGEX, `<Version>${newVersion}</Version>`)
  } else {
    const dashIdx = newVersion.indexOf('-')
    const newPrefix = dashIdx >= 0 ? newVersion.substring(0, dashIdx) : newVersion
    const newSuffix = dashIdx >= 0 ? newVersion.substring(dashIdx + 1) : null

    updated = info.content.replace(PREFIX_REGEX, `<VersionPrefix>${newPrefix}</VersionPrefix>`)

    if (newSuffix) {
      if (info.suffix !== null) {
        updated = updated.replace(SUFFIX_REGEX, `<VersionSuffix>${newSuffix}</VersionSuffix>`)
      } else {
        updated = updated.replace('</VersionPrefix>', `</VersionPrefix>\n    <VersionSuffix>${newSuffix}</VersionSuffix>`)
      }
    } else {
      updated = updated.replace(/\s*<VersionSuffix>[^<]*<\/VersionSuffix>/, '')
    }
  }

  writeFileSync(manifestPath, updated, 'utf8')
  return true
}

export default {
  getCurrentVersion,
  updateVersion
}
