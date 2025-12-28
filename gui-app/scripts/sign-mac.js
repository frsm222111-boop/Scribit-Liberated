const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

if (process.platform !== 'darwin') {
  console.log('Skipping code signing (not on macOS)')
  process.exit(0)
}

const distDir = path.join(__dirname, '../dist')

// Find all .app bundles (mac-arm64, mac-x64, or mac for universal)
const possiblePaths = [
  path.join(distDir, 'mac-arm64/UnBrickIt.app'),
  path.join(distDir, 'mac-x64/UnBrickIt.app'),
  path.join(distDir, 'mac/UnBrickIt.app')
]

const appPaths = possiblePaths.filter(p => fs.existsSync(p))

if (appPaths.length === 0) {
  console.log('No .app bundles found in dist/')
  process.exit(1)
}

console.log('Performing ad-hoc code signing...')
let failed = false

for (const appPath of appPaths) {
  try {
    console.log(`Signing: ${path.basename(path.dirname(appPath))}`)
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
    console.log('✓ Successfully signed:', appPath)
  } catch (error) {
    console.error('✗ Code signing failed:', appPath, error.message)
    failed = true
  }
}

if (failed) {
  process.exit(1)
}
