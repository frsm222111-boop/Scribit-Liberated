<template>
  <div class="connection-welcome">
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

      <button v-if="connectionStatus.type === 'success'" class="btn btn-primary" @click="handleContinue">
        Continue
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { setFirmwareVersion, getFirmwareVersion } from '../utils/appState'

const router = useRouter()
const checking = ref(true)
const connectionStatus = ref({
  type: 'info',
  message: 'Checking for device connection...'
})

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

.btn {
  width: 100%;
  max-width: 300px;
}
</style>
