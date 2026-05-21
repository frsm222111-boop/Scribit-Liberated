const { execSync } = require('child_process')

exports.default = async function(context) {
  // Only sign on macOS
  if (process.platform !== 'darwin') {
    console.log('Skipping code signing (not on macOS)')
    return
  }

  const appPath = context.appOutDir + '/' + context.packager.appInfo.productFilename + '.app'

  console.log('Performing ad-hoc code signing...')
  console.log(`Signing: ${appPath}`)

  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' })
    console.log('✓ Successfully signed')
  } catch (error) {
    console.error('✗ Code signing failed:', error.message)
    throw error
  }
}
