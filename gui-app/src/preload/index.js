const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Firmware upload
  uploadFirmware: (firmware) => ipcRenderer.invoke('upload-firmware', firmware),
  uploadSingleFirmware: (options) => ipcRenderer.invoke('upload-single-firmware', options),
  onFirmwareProgress: (callback) => {
    ipcRenderer.on('firmware-upload-progress', (event, progress) => callback(progress))
  },

  // G-code operations
  sendGcode: (gcode) => ipcRenderer.invoke('send-gcode', gcode),
  getDeviceStatus: () => ipcRenderer.invoke('get-device-status'),

  // Drawing control
  pauseDrawing: () => ipcRenderer.invoke('pause-drawing'),
  resumeDrawing: () => ipcRenderer.invoke('resume-drawing'),

  // SVG to G-code conversion
  convertSvg: (svgPath) => ipcRenderer.invoke('convert-svg', svgPath),
  onSvgProgress: (callback) => {
    ipcRenderer.on('svg-convert-progress', (event, progress) => callback(progress))
  },

  // File operations
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  listSamples: () => ipcRenderer.invoke('list-samples'),

  // Network operations
  sendWifiCredentials: (credentials) => ipcRenderer.invoke('send-wifi-credentials', credentials),
  checkDeviceConnection: () => ipcRenderer.invoke('check-device-connection'),

  // Device settings
  getDeviceSettings: () => ipcRenderer.invoke('get-device-settings'),
  setDeviceSettings: (settings) => ipcRenderer.invoke('set-device-settings', settings),

  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
})
