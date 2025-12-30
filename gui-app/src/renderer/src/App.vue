<template>
  <div id="app">
    <nav v-if="!isWelcomeScreen" class="navbar">
      <div class="navbar-brand">
        <img :src="logo" alt="UnBrickIt" class="navbar-logo" />
        <span class="version-badge">v{{ guiVersion }}</span>
      </div>
      <div class="nav-links">
        <router-link to="/draw" :class="{ disabled: !tabsEnabled.draw }">Draw</router-link>
        <router-link to="/manual" :class="{ disabled: !tabsEnabled.manual }">Manual Control</router-link>
        <router-link to="/firmware">{{ firmwareTabTitle }}</router-link>
        <button class="settings-btn" @click="showSettings = true" title="Settings">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
          </svg>
        </button>
      </div>
    </nav>
    <main class="main-content" :class="{ 'no-nav': isWelcomeScreen }">
      <router-view />
    </main>
    <footer v-if="!isWelcomeScreen" class="app-footer">
      <div class="footer-content">
        <a href="#" @click.prevent="openDonationPage" class="donate-link">
          ☕ Support me on Ko-fi
        </a>
        <div class="connection-status">
          <!-- WiFi icon -->
          <svg v-if="connected" class="wifi-icon connected" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12,21 L15.6,16.2 C14.6,15.45 13.3,15 12,15 C10.7,15 9.4,15.45 8.4,16.2 L12,21 M12,3 C7.95,3 4.21,4.34 1.2,6.6 L3,9 C5.5,7.12 8.62,6 12,6 C15.38,6 18.5,7.12 21,9 L22.8,6.6 C19.79,4.34 16.05,3 12,3 M12,9 C9.3,9 6.81,9.89 4.8,11.4 L6.6,13.8 C8.1,12.67 9.97,12 12,12 C14.03,12 15.9,12.67 17.4,13.8 L19.2,11.4 C17.19,9.89 14.7,9 12,9 Z"/>
          </svg>
          <svg v-else class="wifi-icon disconnected" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12,21 L15.6,16.2 C14.6,15.45 13.3,15 12,15 C10.7,15 9.4,15.45 8.4,16.2 L12,21 M12,3 C7.95,3 4.21,4.34 1.2,6.6 L3,9 C5.5,7.12 8.62,6 12,6 C15.38,6 18.5,7.12 21,9 L22.8,6.6 C19.79,4.34 16.05,3 12,3 M12,9 C9.3,9 6.81,9.89 4.8,11.4 L6.6,13.8 C8.1,12.67 9.97,12 12,12 C14.03,12 15.9,12.67 17.4,13.8 L19.2,11.4 C17.19,9.89 14.7,9 12,9 Z"/>
            <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span class="device-id">{{ deviceId || 'No device' }}{{ firmwareVersion ? ` (v${firmwareVersion})` : '' }}</span>
          <span v-if="deviceState" class="status-badge" :class="deviceStateClass">
            {{ deviceState }}
          </span>
        </div>
      </div>
    </footer>

    <SettingsModal :isOpen="showSettings" @close="showSettings = false" @save="handleSettingsSave" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getDeviceId, setFirmwareVersion, getFirmwareVersion, getDeviceSettings } from './utils/appState'
import packageJson from '../../../package.json'
import logo from './assets/unbrickit_logo.svg'
import SettingsModal from './components/SettingsModal.vue'

const router = useRouter()
const route = useRoute()
const connected = ref(false)
const deviceId = ref(getDeviceId())
const firmwareVersion = ref(getFirmwareVersion())
const deviceState = ref(null)
const guiVersion = ref(packageJson.version)
const showSettings = ref(false)
let connectionPollInterval = null

// Check if we're on the welcome screen
const isWelcomeScreen = computed(() => route.path === '/welcome' || route.path === '/')

// Version comparison logic
const tabsEnabled = computed(() => {
  if (!firmwareVersion.value) {
    // No firmware version = not set up yet
    return { draw: false, manual: false }
  }

  const [major] = firmwareVersion.value.split('.').map(Number)
  if (major >= 1) {
    return { draw: true, manual: true }
  }

  return { draw: false, manual: false }
})

const firmwareTabTitle = computed(() => {
  if (!firmwareVersion.value) {
    return 'Firmware Upload'
  }

  if (compareVersions(guiVersion.value, firmwareVersion.value) > 0) {
    return 'Update Firmware'
  }

  return 'Firmware Upload'
})

const deviceStateClass = computed(() => {
  if (!deviceState.value) return ''
  const state = deviceState.value.toLowerCase()
  if (state === 'running' || state === 'drawing') return 'state-running'
  if (state === 'idle' || state === 'ready') return 'state-idle'
  if (state === 'error') return 'state-error'
  if (state === 'paused') return 'state-paused'
  return 'state-connected'
})

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0

    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }

  return 0
}

async function checkConnection() {
  try {
    const result = await window.electronAPI.checkDeviceConnection()
    connected.value = result.connected

    // If connected, fetch device ID, version, and state from status
    if (result.connected) {
      const statusResult = await window.electronAPI.getDeviceStatus()
      if (statusResult.success && statusResult.data) {
        if (statusResult.data.id) {
          deviceId.value = statusResult.data.id
        }
        if (statusResult.data.version) {
          firmwareVersion.value = statusResult.data.version
          setFirmwareVersion(statusResult.data.version)
        }
        if (statusResult.data.state) {
          deviceState.value = statusResult.data.state
        }
      }
    } else {
      // Not connected - clear firmware version and state
      firmwareVersion.value = null
      deviceState.value = null
      setFirmwareVersion(null)
    }
  } catch (error) {
    connected.value = false
    firmwareVersion.value = null
    deviceState.value = null
    setFirmwareVersion(null)
  }
}

function startConnectionPolling() {
  checkConnection()
  connectionPollInterval = setInterval(checkConnection, 3000)
}

function stopConnectionPolling() {
  if (connectionPollInterval) {
    clearInterval(connectionPollInterval)
    connectionPollInterval = null
  }
}

async function openDonationPage() {
  try {
    await window.electronAPI.openExternal('https://ko-fi.com/robotkareem')
  } catch (error) {
    console.error('Error opening link:', error)
  }
}

async function handleSettingsSave(settings) {
  // Sync settings to main process (convert to plain object for IPC)
  await window.electronAPI.setDeviceSettings({ ...settings })
}

onMounted(async () => {
  // Sync settings from localStorage to main process on startup
  const settings = getDeviceSettings()
  await window.electronAPI.setDeviceSettings(settings)

  startConnectionPolling()
})

onUnmounted(() => {
  stopConnectionPolling()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #e8e8e8;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: white;
  color: #2c3e50;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: relative;
  z-index: 10;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.navbar-logo {
  height: 2rem;
  width: auto;
}

.version-badge {
  background: #e8e8e8;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  color: #7f8c8d;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-links a {
  color: #2c3e50;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background 0.2s;
  font-weight: 500;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  background: #f0f0f0;
}

.nav-links a.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.settings-btn {
  background: none;
  border: none;
  color: #2c3e50;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-btn:hover {
  background: #f0f0f0;
}

.main-content {
  flex: 1;
  overflow: auto;
  padding: 2rem;
}

.main-content.no-nav {
  padding: 0;
  height: 100vh;
}

/* Reusable button styles */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #229954;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c0392b;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #7f8c8d;
}

.btn-warning {
  background: #f39c12;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d68910;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Card styles */
.card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* Form styles */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

/* Footer styles */
.app-footer {
  background: white;
  color: #2c3e50;
  padding: 0.75rem 2rem;
  box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
  position: relative;
  z-index: 10;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.donate-link {
  color: #f39c12;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s;
  font-weight: 500;
}

.donate-link:hover {
  background: #fff3e0;
  color: #e67e22;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #2c3e50;
}

.wifi-icon {
  display: block;
}

.wifi-icon.connected {
  color: #27ae60;
}

.wifi-icon.disconnected {
  color: #7f8c8d;
}

.device-id {
  font-family: monospace;
  font-size: 0.85rem;
  color: #546e7a;
}

.status-badge {
  padding: 0.3rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-badge.state-idle {
  background: #d4edda;
  color: #155724;
}

.status-badge.state-running {
  background: #d1ecf1;
  color: #0c5460;
}

.status-badge.state-error {
  background: #f8d7da;
  color: #721c24;
}

.status-badge.state-paused {
  background: #fff3cd;
  color: #856404;
}

.status-badge.state-connected {
  background: #d4edda;
  color: #155724;
}
</style>
