const { spawn } = require('child_process')
const path = require('path')
const { app } = require('electron')

/**
 * Get path to bundled Python scripts
 */
function getScriptsPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'scripts')
  }
  return path.join(__dirname, '../../resources/scripts')
}

/**
 * Get bundled Python executable path
 * @returns {string} Path to Python executable
 */
function getPythonCommand() {
  const runtimePath = getPythonRuntimePath()
  const pythonExe = process.platform === 'win32' ? 'python.exe' : 'python'
  return path.join(runtimePath, 'bin', pythonExe)
}

/**
 * Get path to bundled Python runtime
 */
function getPythonRuntimePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'python', 'runtime')
  }
  return path.join(__dirname, '../../resources/python/runtime')
}

/**
 * Run SVG to G-code converter
 * @param {Object} options - Conversion options
 * @param {string} options.inputSvg - Path to input SVG file
 * @param {string} options.outputGcode - Path to output G-code file
 * @param {number} options.anchorDistance - Distance between anchors (mm)
 * @param {number} options.leftLength - Left string starting length (mm)
 * @param {number} options.rightLength - Right string starting length (mm)
 * @param {number} [options.scale] - Optional scale factor
 * @param {number} [options.offsetX] - Optional X offset (mm)
 * @param {number} [options.offsetY] - Optional Y offset (mm)
 * @param {boolean} [options.noOptimize] - Disable path optimization
 * @param {Function} onProgress - Progress callback (receives stdout/stderr)
 * @returns {Promise<{success: boolean, output: string, error?: string}>}
 */
async function convertSvgToGcode(options, onProgress) {
  return new Promise((resolve, reject) => {
    const scriptsPath = getScriptsPath()
    const scriptPath = path.join(scriptsPath, 'scribit_svg_to_gcode.py')
    const python = getPythonCommand()

    // Build command arguments
    const args = [
      scriptPath,
      options.inputSvg,
      '-a', options.anchorDistance.toString(),
      '-l', options.leftLength.toString(),
      '-r', options.rightLength.toString(),
      '-o', options.outputGcode
    ]

    if (options.scale) {
      args.push('-s', options.scale.toString())
    }
    if (options.offsetX !== undefined) {
      args.push('--offset-x', options.offsetX.toString())
    }
    if (options.offsetY !== undefined) {
      args.push('--offset-y', options.offsetY.toString())
    }
    if (options.noOptimize) {
      args.push('--no-optimize')
    }

    const process = spawn(python, args)
    let output = ''
    let errorOutput = ''

    process.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
      if (onProgress) {
        onProgress({ type: 'stdout', data: text })
      }
    })

    process.stderr.on('data', (data) => {
      const text = data.toString()
      errorOutput += text
      if (onProgress) {
        onProgress({ type: 'stderr', data: text })
      }
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output })
      } else {
        resolve({
          success: false,
          output,
          error: errorOutput || `Process exited with code ${code}`
        })
      }
    })

    process.on('error', (err) => {
      reject(new Error(`Failed to start Python: ${err.message}`))
    })
  })
}

module.exports = {
  convertSvgToGcode,
  getPythonCommand,
  getScriptsPath
}
