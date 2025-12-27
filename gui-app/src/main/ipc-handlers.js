const { ipcMain, dialog } = require('electron')
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
  // Firmware upload handler
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

  // SVG to G-code conversion
  ipcMain.handle('convert-svg', async (event, options) => {
    try {
      const result = await convertSvgToGcode(
        options,
        (progress) => {
          event.sender.send('svg-convert-progress', progress)
        }
      )
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
}

module.exports = { registerIpcHandlers }
