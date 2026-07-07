import readline from 'readline'

function sourceLabel(source) {
  if (source === 'self') return 'self'
  if (source === 'Directory.Build.props') return 'Directory.Build.props'
  return '-'
}

function displayProjectTable(projects, selectedIndex, newVersions) {
  const nameWidth = Math.max(12, ...projects.map(p => p.name.length))
  const sourceWidth = Math.max(6, ...projects.map(p => sourceLabel(p.versionSource).length))

  console.log('\nDetected projects:')
  console.log(`  ${'#'.padEnd(4)} ${'Project'.padEnd(nameWidth)} Type     Version      New          ${'Source'.padEnd(sourceWidth)} Selected`)

  const sepLen = 60 + nameWidth + sourceWidth
  console.log(' ' + '─'.repeat(sepLen))

  projects.forEach((p, i) => {
    const marker = i === selectedIndex ? '✓' : ''
    const newVer = newVersions && newVersions[i] != null ? newVersions[i] : ''
    const src = sourceLabel(p.versionSource)
    console.log(
      `  ${String(i + 1).padEnd(3)} ${p.name.padEnd(nameWidth)} ${p.type.padEnd(8)} ${(p.version || '-').padEnd(11)} ${String(newVer).padEnd(11)} ${src.padEnd(sourceWidth)} ${marker}`
    )
  })

  console.log('')
}

function selectProject(projects) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const ask = () => {
      rl.question(`Select project [1-${projects.length}]: `, (answer) => {
        const trimmed = answer.trim()
        if (!trimmed) {
          rl.close()
          resolve(-1)
          return
        }
        const index = parseInt(trimmed, 10) - 1
        if (isNaN(index) || index < 0 || index >= projects.length) {
          console.log('\x1b[31mInvalid selection, please try again\x1b[0m')
          ask()
          return
        }
        rl.close()
        resolve(index)
      })
    }

    ask()
  })
}

export { displayProjectTable, selectProject }
