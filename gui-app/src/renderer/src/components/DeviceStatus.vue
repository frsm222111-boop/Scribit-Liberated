<template>
  <div class="device-status">
    <div class="status-header">
      <h3>Device Status</h3>
      <span class="status-indicator" :class="statusClass">
        {{ connectionStatus }}
      </span>
    </div>

    <div v-if="!connected" class="status-message warning">
      <p>Device not connected. Make sure you're connected to MBC-WB WiFi network.</p>
    </div>

    <div v-if="connected && deviceData" class="status-grid">
      <div class="status-item">
        <label>State</label>
        <span class="value">{{ deviceData.state || 'Unknown' }}</span>
      </div>

      <div class="status-item" v-if="deviceData.progress !== undefined">
        <label>Progress</label>
        <span class="value">{{ deviceData.progress }}%</span>
      </div>

      <div class="status-item" v-if="deviceData.position">
        <label>Position</label>
        <span class="value">X: {{ deviceData.position.x }}, Y: {{ deviceData.position.y }}</span>
      </div>

      <div class="status-item" v-if="deviceData.temperature">
        <label>Temperature</label>
        <span class="value">{{ deviceData.temperature }}°C</span>
      </div>
    </div>

    <div v-if="error" class="status-message error">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const connected = ref(false)
const deviceData = ref(null)
const error = ref('')
let pollInterval = null

const connectionStatus = computed(() => {
  if (!connected.value) return 'Disconnected'
  if (deviceData.value?.state) return deviceData.value.state
  return 'Connected'
})

const statusClass = computed(() => {
  if (!connected.value) return 'disconnected'
  if (deviceData.value?.state === 'running') return 'running'
  if (deviceData.value?.state === 'error') return 'error'
  return 'connected'
})

async function fetchStatus() {
  try {
    const result = await window.electronAPI.getDeviceStatus()

    if (result.success) {
      connected.value = true
      deviceData.value = result.data
      error.value = ''
    } else {
      connected.value = false
      error.value = ''
    }
  } catch (err) {
    connected.value = false
    error.value = 'Failed to fetch status'
  }
}

function startPolling() {
  fetchStatus()
  pollInterval = setInterval(fetchStatus, 3000) // Poll every 3 seconds
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.device-status {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #ddd;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.status-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.status-indicator {
  padding: 0.4rem 0.8rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-indicator.connected {
  background: #d4edda;
  color: #155724;
}

.status-indicator.running {
  background: #d1ecf1;
  color: #0c5460;
}

.status-indicator.disconnected {
  background: #f8d7da;
  color: #721c24;
}

.status-indicator.error {
  background: #f8d7da;
  color: #721c24;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.status-item label {
  font-size: 0.85rem;
  color: #7f8c8d;
  font-weight: 500;
}

.status-item .value {
  font-size: 1rem;
  color: #2c3e50;
  font-family: monospace;
}

.status-message {
  padding: 0.8rem;
  border-radius: 4px;
  margin-top: 1rem;
}

.status-message.warning {
  background: #fff3cd;
  color: #856404;
}

.status-message.error {
  background: #f8d7da;
  color: #721c24;
}
</style>
