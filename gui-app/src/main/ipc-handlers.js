const { ipcMain, dialog, shell } = require('electron')
const { uploadAllFirmware } = require('./espota-runner')
const { convertSvgToGcode } = require('./python-runner')
const axios = require('axios')

/**
 * Register all IPC handlers
 */
function registerIpcHandlers() {
  // Check if device is reachable at 192.168.240.1:8888
  // Any HTTP response (including 404) means we're connected
  ipcMain.handle('check-device-connection', async () => {
    try {
      await axios.get('http://192.168.240.1:8888/', {
        timeout: 2000,
        validateStatus: () => true // Accept any HTTP status code
      })
      return { success: true, connected: true }
    } catch (error) {
      // Network error (timeout, connection refused, etc.)
      return { success: true, connected: false }
    }
  })
  // Firmware upload handler (all files)
  ipcMain.handle('upload-firmware', async (event, options) => {
    console.log('IPC: upload-firmware called with options:', options)
    try {
      const result = await uploadAllFirmware(
        {
          espIp: options.espIp || '192.168.240.1',
          hostIp: options.hostIp,
          password: options.password
        },
        (progress) => {
          // Send progress updates to renderer
          console.log('Progress:', progress)
          event.sender.send('firmware-upload-progress', progress)
        }
      )
      console.log('Upload completed:', result)
      return result
    } catch (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Single firmware file upload handler
  ipcMain.handle('upload-single-firmware', async (event, options) => {
    console.log('IPC: upload-single-firmware called with options:', options)
    const { uploadFirmware } = require('./espota-runner')
    try {
      const result = await uploadFirmware(
        {
          espIp: options.espIp || '192.168.240.1',
          firmwareFile: options.firmwareFile,
          espPort: 3232,
          companion: options.companion || false,
          spiffs: options.spiffs || false,
          hostIp: options.hostIp,
          password: options.password
        },
        (progress) => {
          console.log('Progress:', progress)
          event.sender.send('firmware-upload-progress', progress)
        }
      )
      console.log('Upload completed:', result)
      return result
    } catch (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Send WiFi credentials to trigger OTA mode
  ipcMain.handle('send-wifi-credentials', async (event, credentials) => {
    try {
      const response = await axios.post('http://192.168.240.1:8888', {
        ssid: credentials.ssid,
        password: credentials.password
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Get device status
  ipcMain.handle('get-device-status', async () => {
    try {
      const response = await axios.get('http://192.168.240.1:8888/status', {
        timeout: 5000
      })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Send G-code to device
  ipcMain.handle('send-gcode', async (event, gcode) => {
    try {
      const response = await axios.post('http://192.168.240.1:8888/upload', gcode, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 30000
      })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Pause drawing
  ipcMain.handle('pause-drawing', async () => {
    try {
      const response = await axios.post('http://192.168.240.1:8888/pause', {}, {
        timeout: 5000
      })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Resume drawing
  ipcMain.handle('resume-drawing', async () => {
    try {
      const response = await axios.post('http://192.168.240.1:8888/resume', {}, {
        timeout: 5000
      })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  })

  // Stop drawing
  ipcMain.handle('stop-drawing', async () => {
    try {
      const response = await axios.post('http://192.168.240.1:8888/stop', {}, {
        timeout: 5000
      })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  })

  // SVG to G-code conversion
  ipcMain.handle('convert-svg', async (event, options) => {
    const os = require('os')
    const path = require('path')
    const fs = require('fs').promises

    try {
      // Generate output path in temp directory
      const tempDir = os.tmpdir()
      const timestamp = Date.now()
      const outputPath = path.join(tempDir, `scribit_${timestamp}.gcode`)

      const result = await convertSvgToGcode(
        {
          ...options,
          outputGcode: outputPath
        },
        (progress) => {
          event.sender.send('svg-convert-progress', progress)
        }
      )

      if (result.success) {
        // Verify file was created
        try {
          await fs.access(outputPath)
          return { ...result, outputPath }
        } catch {
          return {
            success: false,
            error: 'G-code file was not created'
          }
        }
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  })

  // File picker
  ipcMain.handle('select-file', async (event, options) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: options.filters || []
    })

    if (result.canceled) {
      return { canceled: true }
    }

    return {
      canceled: false,
      filePath: result.filePaths[0]
    }
  })

  // Read file
  ipcMain.handle('read-file', async (event, filePath) => {
    const fs = require('fs').promises
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return { success: true, content }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  })

  // List sample SVG files
  ipcMain.handle('list-samples', async () => {
    const fs = require('fs').promises
    const path = require('path')
    const { app } = require('electron')
    try {
      // Use app.getAppPath() to get the correct base path
      // In dev: points to project root, in production: points to app.asar
      const appPath = app.getAppPath()
      const samplesDir = path.join(appPath, 'samples')

      console.log('Looking for samples in:', samplesDir)

      const files = await fs.readdir(samplesDir)
      const svgFiles = files.filter(file => file.toLowerCase().endsWith('.svg'))

      console.log('Found SVG files:', svgFiles)

      const samples = svgFiles.map(file => ({
        name: file.replace('.svg', ''),
        filename: file,
        path: path.join(samplesDir, file)
      }))

      return { success: true, samples }
    } catch (error) {
      console.error('Error listing samples:', error)
      return {
        success: true,
        samples: [] // Empty array if samples folder doesn't exist or has no files
      }
    }
  })

  // Open external URL
  ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url)
    return { success: true }
  })
}

module.exports = { registerIpcHandlers }
