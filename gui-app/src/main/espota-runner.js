const { spawn } = require('child_process')
const path = require('path')
const { app } = require('electron')

/**
 * Get path to bundled Python scripts
 */
function getPythonPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'python')
  }
  return path.join(__dirname, '../../resources/python')
}

/**
 * Get path to bundled firmware files
 */
function getFirmwarePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'firmware')
  }
  return path.join(__dirname, '../../resources/firmware')
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
 * Upload firmware via OTA (espota.py)
 * @param {Object} options - Upload options
 * @param {string} options.espIp - ESP32 IP address (usually 192.168.240.1)
 * @param {string} options.firmwareFile - Firmware file name (e.g., 'ScribitESP.ino.bin')
 * @param {string} [options.hostIp='0.0.0.0'] - Host IP address
 * @param {number} [options.espPort=3232] - ESP32 OTA port
 * @param {number} [options.hostPort] - Host port (random if not specified)
 * @param {string} [options.password=''] - OTA password
 * @param {boolean} [options.companion=false] - Use -c flag for companion chip (SAMD21)
 * @param {boolean} [options.spiffs=false] - Use -s flag for SPIFFS/partitions
 * @param {Function} onProgress - Progress callback (receives stdout/stderr)
 * @returns {Promise<{success: boolean, output: string, error?: string}>}
 */
async function uploadFirmware(options, onProgress) {
  return new Promise((resolve, reject) => {
    const pythonPath = getPythonPath()
    const firmwarePath = getFirmwarePath()
    const espotaPath = path.join(pythonPath, 'espota.py')
    const firmwareFilePath = path.join(firmwarePath, options.firmwareFile)
    const python = getPythonCommand()

    console.log('Python path:', pythonPath)
    console.log('Firmware path:', firmwarePath)
    console.log('Espota script:', espotaPath)
    console.log('Firmware file:', firmwareFilePath)

    // Build command arguments
    const args = [
      espotaPath,
      '-i', options.espIp,
      '-p', (options.espPort || 3232).toString(),
      '-f', firmwareFilePath
    ]

    if (options.hostIp) {
      args.push('-I', options.hostIp)
    }
    if (options.hostPort) {
      args.push('-P', options.hostPort.toString())
    }
    if (options.password) {
      args.push('-a', options.password)
    }
    if (options.companion) {
      args.push('-c')
    }
    if (options.spiffs) {
      args.push('-s')
    }

    console.log('Executing:', python, args.join(' '))
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
      console.log('Process exited with code:', code)
      console.log('Output:', output)
      console.log('Error output:', errorOutput)
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
      console.error('Failed to start process:', err)
      reject(new Error(`Failed to start Python: ${err.message}`))
    })
  })
}

/**
 * Upload all firmware files (ESP32, partitions, SAMD21)
 * Based on FIRMWARE.md instructions
 * @param {Object} options - Upload options
 * @param {string} options.espIp - ESP32 IP address (usually 192.168.240.1 when in MBC-WB mode)
 * @param {string} [options.hostIp='0.0.0.0'] - Host IP address
 * @param {string} [options.password=''] - OTA password
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, results: Array, error?: string}>}
 */
async function uploadAllFirmware(options, onProgress) {
  const results = []

  // 1. Upload ESP32 firmware (no special flags)
  if (onProgress) {
    onProgress({ type: 'info', data: '1/3 Uploading ESP32 firmware...\n' })
  }

  const esp32Result = await uploadFirmware({
    espIp: options.espIp,
    firmwareFile: 'ScribitESP.ino.bin',
    espPort: 3232,
    hostIp: options.hostIp,
    password: options.password
  }, onProgress)
  results.push({ file: 'ScribitESP.ino.bin', ...esp32Result })

  if (!esp32Result.success) {
    return {
      success: false,
      results,
      error: 'ESP32 firmware upload failed'
    }
  }

  // 2. Upload SAMD21 firmware (companion chip, use -c flag)
  if (onProgress) {
    onProgress({ type: 'info', data: '2/3 Uploading SAMD21 firmware (companion chip)...\n' })
  }

  const samdResult = await uploadFirmware({
    espIp: options.espIp,
    firmwareFile: 'MK4duo.ino.bin',
    espPort: 3232,
    companion: true,  // -c flag
    hostIp: options.hostIp,
    password: options.password
  }, onProgress)
  results.push({ file: 'MK4duo.ino.bin', ...samdResult })

  if (!samdResult.success) {
    return {
      success: false,
      results,
      error: 'SAMD21 firmware upload failed'
    }
  }

  // 3. Upload ESP32 partitions (SPIFFS, use -s flag)
  if (onProgress) {
    onProgress({ type: 'info', data: '3/3 Uploading ESP32 partitions...\n' })
  }

  const partitionsResult = await uploadFirmware({
    espIp: options.espIp,
    firmwareFile: 'ScribitESP.ino.partitions.bin',
    espPort: 3232,
    spiffs: true,  // -s flag
    hostIp: options.hostIp,
    password: options.password
  }, onProgress)
  results.push({ file: 'ScribitESP.ino.partitions.bin', ...partitionsResult })

  if (!partitionsResult.success) {
    return {
      success: false,
      results,
      error: 'ESP32 partitions upload failed'
    }
  }

  return {
    success: true,
    results
  }
}

module.exports = {
  uploadFirmware,
  uploadAllFirmware,
  getPythonCommand,
  getPythonPath,
  getFirmwarePath
}
