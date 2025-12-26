// Simple state management for app setup status
const STORAGE_KEY = 'scribit-app-state'

export function isSetupComplete() {
  const state = localStorage.getItem(STORAGE_KEY)
  return state ? JSON.parse(state).setupComplete : false
}

export function markSetupComplete() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ setupComplete: true }))
}

export function resetSetup() {
  localStorage.removeItem(STORAGE_KEY)
}
