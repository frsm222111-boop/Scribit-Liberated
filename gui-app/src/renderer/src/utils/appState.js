// Simple state management for app setup status
const STORAGE_KEY = 'scribit-app-state'

export function isSetupComplete() {
  const state = localStorage.getItem(STORAGE_KEY)
  return state ? JSON.parse(state).setupComplete : false
}

export function getDeviceId() {
  const state = localStorage.getItem(STORAGE_KEY)
  return state ? JSON.parse(state).deviceId : null
}

export function setDeviceId(deviceId) {
  const state = localStorage.getItem(STORAGE_KEY)
  const currentState = state ? JSON.parse(state) : {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...currentState,
    deviceId
  }))
}

export function markSetupComplete() {
  const state = localStorage.getItem(STORAGE_KEY)
  const currentState = state ? JSON.parse(state) : {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...currentState,
    setupComplete: true
  }))
}

export function resetSetup() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getFirmwareVersion() {
  const state = localStorage.getItem(STORAGE_KEY)
  return state ? JSON.parse(state).firmwareVersion : null
}

export function setFirmwareVersion(version) {
  const state = localStorage.getItem(STORAGE_KEY)
  const currentState = state ? JSON.parse(state) : {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...currentState,
    firmwareVersion: version
  }))
}

export function getSvgOptions() {
  const state = localStorage.getItem(STORAGE_KEY)
  if (state) {
    const parsed = JSON.parse(state)
    return parsed.svgOptions || null
  }
  return null
}

export function setSvgOptions(options) {
  const state = localStorage.getItem(STORAGE_KEY)
  const currentState = state ? JSON.parse(state) : {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...currentState,
    svgOptions: options
  }))
}
