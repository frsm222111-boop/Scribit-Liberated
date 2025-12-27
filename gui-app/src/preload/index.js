const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Firmware upload
  uploadFirmware: (firmware) => ipcRenderer.invoke('upload-firmware', firmware),
  onFirmwareProgress: (callback) => {
    ipcRenderer.on('firmware-upload-progress', (event, progress) => callback(progress))
  },

  // G-code operations
  sendGcode: (gcode) => ipcRenderer.invoke('send-gcode', gcode),
  getDeviceStatus: () => ipcRenderer.invoke('get-device-status'),

  // SVG to G-code conversion
  convertSvg: (svgPath) => ipcRenderer.invoke('convert-svg', svgPath),
  onSvgProgress: (callback) => {
    ipcRenderer.on('svg-convert-progress', (event, progress) => callback(progress))
  },

  // File operations
  selectFile: (options) => ipcRenderer.invoke('select-file', options),

  // Network operations
  sendWifiCredentials: (credentials) => ipcRenderer.invoke('send-wifi-credentials', credentials),
  checkDeviceConnection: () => ipcRenderer.invoke('check-device-connection')
})
