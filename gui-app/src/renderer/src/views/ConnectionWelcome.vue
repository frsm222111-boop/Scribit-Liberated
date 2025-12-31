<template>
  <div class="connection-welcome">
    <button class="settings-btn-floating" @click="showSettings = true" title="Settings">
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path fill="currentColor" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
      </svg>
    </button>

    <div class="welcome-card">
      <div class="welcome-icon">
        <svg viewBox="0 0 24 24" width="80" height="80">
          <path fill="currentColor" d="M12,21 L15.6,16.2 C14.6,15.45 13.3,15 12,15 C10.7,15 9.4,15.45 8.4,16.2 L12,21 M12,3 C7.95,3 4.21,4.34 1.2,6.6 L3,9 C5.5,7.12 8.62,6 12,6 C15.38,6 18.5,7.12 21,9 L22.8,6.6 C19.79,4.34 16.05,3 12,3 M12,9 C9.3,9 6.81,9.89 4.8,11.4 L6.6,13.8 C8.1,12.67 9.97,12 12,12 C14.03,12 15.9,12.67 17.4,13.8 L19.2,11.4 C17.19,9.89 14.7,9 12,9 Z"/>
        </svg>
      </div>

      <h1>Welcome to UnBrickIt</h1>

      <div class="connection-status" :class="connectionStatus.type">
        <div class="status-icon">
          <div v-if="checking" class="spinner"></div>
          <svg v-else-if="connectionStatus.type === 'error'" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
          </svg>
          <svg v-else-if="connectionStatus.type === 'success'" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
          </svg>
        </div>
        <p>{{ connectionStatus.message }}</p>
      </div>

      <div class="instructions">
        <h2>Getting Started</h2>
        <ol>
          <li>
            <strong>Power on your device</strong>
            <p>Make sure your ScribIt device is powered on</p>
          </li>
          <li>
            <strong>Connect to device WiFi</strong>
            <p>Look for a WiFi network named <code>ScribIt-XXXXXX</code> and connect to it</p>
            <p class="note">Password: <code>ScribItAP314</code> (if required)</p>
          </li>
          <li>
            <strong>Wait for connection</strong>
            <p>This app will automatically detect when you're connected</p>
          </li>
        </ol>
      </div>

      <div class="button-group">
        <button v-if="connectionStatus.type === 'success'" class="btn btn-primary" @click="handleContinue">
          Continue
        </button>
        <button class="btn btn-secondary" @click="handleSkip">
          Skip
        </button>
      </div>
    </div>

    <SettingsModal :isOpen="showSettings" @close="showSettings = false" @save="handleSettingsSave" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { setFirmwareVersion, getFirmwareVersion } from '../utils/appState'
import SettingsModal from '../components/SettingsModal.vue'

const router = useRouter()
const checking = ref(true)
const connectionStatus = ref({
  type: 'info',
  message: 'Checking for device connection...'
})
const showSettings = ref(false)

let checkInterval = null

async function checkConnection() {
  try {
    const result = await window.electronAPI.checkDeviceConnection()

    if (result.connected) {
      // Fetch firmware version
      const statusResult = await window.electronAPI.getDeviceStatus()

      if (statusResult.success && statusResult.data) {
        const firmwareVersion = statusResult.data.version

        if (firmwareVersion) {
          setFirmwareVersion(firmwareVersion)
        }

        connectionStatus.value = {
          type: 'success',
          message: `✓ Connected to device${firmwareVersion ? ` (v${firmwareVersion})` : ''}`
        }
        checking.value = false
      } else {
        connectionStatus.value = {
          type: 'success',
          message: '✓ Device reachable - Click Continue to proceed'
        }
        checking.value = false
      }
    } else {
      connectionStatus.value = {
        type: 'warning',
        message: 'Looking for ScribIt-XXXXXX network...'
      }
      checking.value = true
    }
  } catch (error) {
    connectionStatus.value = {
      type: 'error',
      message: 'Error checking connection. Please try again.'
    }
    checking.value = false
  }
}

function handleContinue() {
  const firmwareVersion = getFirmwareVersion()

  if (!firmwareVersion) {
    // No version info - go to firmware upload
    router.push('/firmware')
    return
  }

  const [major] = firmwareVersion.split('.').map(Number)

  if (major >= 1) {
    // Firmware >= 1.0 - go to draw tab
    router.push('/draw')
  } else {
    // Firmware < 1.0 - go to firmware upload
    router.push('/firmware')
  }
}

function handleSkip() {
  router.push('/firmware')
}

async function handleSettingsSave(settings) {
  // Sync settings to main process (convert to plain object for IPC)
  await window.electronAPI.setDeviceSettings({ ...settings })
}

onMounted(() => {
  checkConnection()
  checkInterval = setInterval(checkConnection, 3000)
})

onUnmounted(() => {
  if (checkInterval) {
    clearInterval(checkInterval)
  }
})
</script>

<style scoped>
.connection-welcome {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.welcome-card {
  background: white;
  border-radius: 12px;
  padding: 3rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.welcome-icon {
  color: #667eea;
  margin-bottom: 1.5rem;
}

.welcome-card h1 {
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 2rem;
}

.connection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  font-weight: 500;
}

.connection-status.info {
  background: #e3f2fd;
  color: #1976d2;
}

.connection-status.warning {
  background: #fff3e0;
  color: #f57c00;
}

.connection-status.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.connection-status.error {
  background: #ffebee;
  color: #c62828;
}

.status-icon {
  flex-shrink: 0;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.instructions {
  text-align: left;
  margin-bottom: 2rem;
}

.instructions h2 {
  font-size: 1.25rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.instructions ol {
  list-style: none;
  counter-reset: step;
  padding: 0;
}

.instructions li {
  counter-increment: step;
  margin-bottom: 1.5rem;
  position: relative;
  padding-left: 3rem;
}

.instructions li::before {
  content: counter(step);
  position: absolute;
  left: 0;
  top: 0;
  width: 2rem;
  height: 2rem;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
}

.instructions strong {
  display: block;
  color: #2c3e50;
  margin-bottom: 0.25rem;
  font-size: 1.05rem;
}

.instructions p {
  color: #546e7a;
  margin: 0.25rem 0;
  line-height: 1.5;
}

.instructions code {
  background: #f5f5f5;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-family: monospace;
  color: #667eea;
  font-size: 0.9em;
}

.instructions .note {
  font-size: 0.9rem;
  font-style: italic;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  width: 100%;
}

.btn {
  width: 100%;
  max-width: 300px;
}

.settings-btn-floating {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  background: white;
  border: none;
  color: #2c3e50;
  cursor: pointer;
  padding: 0.75rem;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  width: 3rem;
  height: 3rem;
}

.settings-btn-floating:hover {
  background: #f0f0f0;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}
</style>
