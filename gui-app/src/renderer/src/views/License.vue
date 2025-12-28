<template>
  <div class="license-view">
    <div class="card">
      <h1>License</h1>

      <div v-if="!hasLicense">
        <p class="device-id">Your Device ID: <strong>{{ deviceId || 'Loading...' }}</strong></p>

        <!-- Purchase button opens Gumroad with device ID pre-filled -->
        <button @click="purchaseLicense" class="btn btn-primary" :disabled="!deviceId">
          Purchase License ($49)
        </button>

        <p class="separator">- OR -</p>

        <p>Already purchased? Enter your license key:</p>
        <textarea
          v-model="licenseKey"
          placeholder="Paste your license key here"
          rows="4"
          class="license-input"
        />
        <button @click="activateLicense" class="btn btn-secondary">
          Activate License
        </button>

        <div v-if="error" class="error-message">{{ error }}</div>
      </div>

      <div v-else>
        <p class="success-message">✓ License active for device {{ deviceId }}</p>
        <button @click="clearLicense" class="btn btn-secondary">Clear License</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const deviceId = ref('')
const licenseKey = ref('')
const hasLicense = ref(false)
const error = ref('')

onMounted(async () => {
  // Fetch device ID from firmware
  const statusResult = await window.electronAPI.getDeviceStatus()
  if (statusResult.success && statusResult.data?.id) {
    deviceId.value = statusResult.data.id
  }

  // Check for existing license
  const licenseResult = await window.electronAPI.getLicenseKey()
  if (licenseResult.success && licenseResult.key) {
    hasLicense.value = true
  }
})

function purchaseLicense() {
  // Open Gumroad with device ID pre-filled
  // TODO: Replace with your actual Gumroad product URL
  const gumroadUrl = `https://yourproduct.gumroad.com/l/scribit-license?wanted[device_id]=${encodeURIComponent(deviceId.value)}`
  window.electronAPI.openExternal(gumroadUrl)
}

async function activateLicense() {
  error.value = ''

  if (!licenseKey.value.trim()) {
    error.value = 'Please enter a license key'
    return
  }

  // Save license
  await window.electronAPI.saveLicenseKey(licenseKey.value.trim())

  // Test by making a request to device
  const testResult = await window.electronAPI.getDeviceStatus()

  if (testResult.success) {
    hasLicense.value = true
    error.value = ''
  } else if (testResult.needsLicense) {
    error.value = 'Invalid license key for this device'
    await window.electronAPI.clearLicenseKey()
  } else {
    // If device not connected, assume license is OK for now
    hasLicense.value = true
    error.value = ''
  }
}

async function clearLicense() {
  await window.electronAPI.clearLicenseKey()
  hasLicense.value = false
  licenseKey.value = ''
}
</script>

<style scoped>
.license-view {
  max-width: 600px;
  margin: 2rem auto;
}

.device-id {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  text-align: center;
}

.separator {
  text-align: center;
  color: #999;
  margin: 1.5rem 0;
  font-weight: 500;
}

.license-input {
  width: 100%;
  padding: 0.75rem;
  margin: 1rem 0;
  font-family: monospace;
  font-size: 0.9rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

.error-message {
  color: #e74c3c;
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fef5f5;
  border-radius: 4px;
  border-left: 4px solid #e74c3c;
}

.success-message {
  color: #27ae60;
  padding: 1rem;
  background: #f0f9f4;
  border-radius: 4px;
  border-left: 4px solid #27ae60;
  margin-bottom: 1rem;
}

.btn {
  width: 100%;
  margin: 0.5rem 0;
}
</style>
