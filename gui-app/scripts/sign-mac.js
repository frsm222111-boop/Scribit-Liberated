const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const appPath = path.join(__dirname, '../dist/mac/UnBrickIt.app')

if (process.platform !== 'darwin') {
  console.log('Skipping code signing (not on macOS)')
  process.exit(0)
}

if (!fs.existsSync(appPath)) {
  console.log('App not found at:', appPath)
  process.exit(1)
}

console.log('Performing ad-hoc code signing...')
try {
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
  console.log('✓ Successfully signed:', appPath)
} catch (error) {
  console.error('✗ Code signing failed:', error.message)
  process.exit(1)
}
