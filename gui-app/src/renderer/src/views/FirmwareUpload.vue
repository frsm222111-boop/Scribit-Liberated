<template>
  <div class="firmware-upload">
    <div class="card">
      <h1>Firmware Upload</h1>
      <p>Upload firmware to Scribit device via OTA</p>

      <div class="step" v-for="(step, idx) in steps" :key="idx" :class="{active: currentStep === idx}">
        <h3>Step {{ idx + 1}}: {{ step.title }}</h3>
        <p>{{ step.desc }}</p>

        <!-- Step 0: Verify ScribIt network -->
        <div v-if="idx === 0 && currentStep === 0">
          <div class="verification-status" :class="networkStatus.type">
            {{ networkStatus.message }}
          </div>
          <button class="btn btn-primary" @click="nextStep" :disabled="!step0Verified">
            {{ step0Verified ? 'Continue' : 'Waiting for connection...' }}
          </button>
        </div>

        <!-- Step 1: WiFi credentials -->
        <WifiPrompt v-if="idx === 1 && currentStep === 1" @submit="sendWifi" />
        <div v-if="idx === 1 && status" class="verification-status info">{{ status }}</div>

        <!-- Step 2: Verify MBC-WB network -->
        <div v-if="idx === 2 && currentStep === 2">
          <div class="verification-status" :class="networkStatus.type">
            {{ networkStatus.message }}
          </div>
          <button class="btn btn-primary" @click="nextStep" :disabled="!step2Verified">
            {{ step2Verified ? 'Continue' : 'Waiting for connection...' }}
          </button>
        </div>

        <!-- Step 3: Upload firmware -->
        <div v-if="idx === 3 && currentStep === 3">
          <button v-if="!uploading" class="btn btn-success" @click="upload">Upload Firmware</button>
          <ProgressBar v-if="uploading" :progress="progress" :message="status" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import ProgressBar from '../components/ProgressBar.vue'
import WifiPrompt from '../components/WifiPrompt.vue'
import { markSetupComplete, setDeviceId } from '../utils/appState'

const router = useRouter()
const currentStep = ref(0)
const uploading = ref(false)
const progress = ref(0)
const status = ref('')
const networkStatus = ref({ type: 'info', message: 'Checking network...' })
const step0Verified = ref(false)
const step2Verified = ref(false)

let networkCheckInterval = null

const steps = [
  { title: 'Connect to ScribIt-XXXXXX', desc: 'Hold LED button 5+ sec, connect to ScribIt WiFi (password: ScribItAP314)' },
  { title: 'Send WiFi Credentials', desc: 'Enter your WiFi to trigger OTA mode' },
  { title: 'Connect to MBC-WB-XXXXXX', desc: 'Connect to MBC-WB network (IP: 192.168.240.1)' },
  { title: 'Upload Firmware', desc: 'Upload firmware files' }
]

async function checkNetwork() {
  const result = await window.electronAPI.checkDeviceConnection()

  if (!result.success) {
    networkStatus.value = { type: 'error', message: 'Error checking connection' }
    return
  }

  // Step 0: Check for ScribIt network (device at 192.168.240.1:8888)
  if (currentStep.value === 0) {
    if (result.connected) {
      networkStatus.value = { type: 'success', message: '✓ Device reachable at http://192.168.240.1:8888/' }
      step0Verified.value = true
    } else {
      networkStatus.value = { type: 'warning', message: 'Cannot reach http://192.168.240.1:8888/ - Connect to ScribIt WiFi' }
      step0Verified.value = false
    }
  }

  // Step 2: Check for MBC-WB network (same endpoint)
  if (currentStep.value === 2) {
    if (result.connected) {
      networkStatus.value = { type: 'success', message: '✓ Device reachable at http://192.168.240.1:8888/' }
      step2Verified.value = true
    } else {
      networkStatus.value = { type: 'warning', message: 'Cannot reach http://192.168.240.1:8888/ - Connect to MBC-WB WiFi' }
      step2Verified.value = false
    }
  }
}

function startNetworkCheck() {
  checkNetwork()
  networkCheckInterval = setInterval(checkNetwork, 3000) // Check every 3 seconds
}

function stopNetworkCheck() {
  if (networkCheckInterval) {
    clearInterval(networkCheckInterval)
    networkCheckInterval = null
  }
}

watch(currentStep, (newStep) => {
  if (newStep === 0 || newStep === 2) {
    startNetworkCheck()
  } else {
    stopNetworkCheck()
  }
})

onMounted(() => {
  if (currentStep.value === 0) {
    startNetworkCheck()
  }
})

onUnmounted(() => {
  stopNetworkCheck()
})

function nextStep() {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

async function sendWifi(creds) {
  status.value = 'Sending WiFi credentials...'
  const result = await window.electronAPI.sendWifiCredentials(creds)

  if (result.success) {
    // Check for device ID in response: {"ID":"device_id"}
    if (result.data && result.data.ID) {
      setDeviceId(result.data.ID)
      status.value = `Success! Device ID: ${result.data.ID}. Please connect to MBC-WB network.`
    } else {
      status.value = 'Success! Device entering OTA mode. Please connect to MBC-WB network.'
    }

    setTimeout(() => {
      currentStep.value = 2
      status.value = ''
    }, 3000)
  } else {
    status.value = 'Error: ' + result.error
  }
}

async function upload() {
  uploading.value = true
  progress.value = 0
  status.value = 'Uploading firmware...'

  const result = await window.electronAPI.uploadFirmware({ espIp: '192.168.240.1' })

  if (result.success) {
    progress.value = 100
    status.value = 'Upload complete! Redirecting to home...'
    markSetupComplete()
    setTimeout(() => router.push('/'), 2000)
  } else {
    status.value = 'Error: ' + result.error
  }
  uploading.value = false
}
</script>

<style scoped>
.firmware-upload { max-width: 800px; margin: 0 auto; }
.step { opacity: 0.5; margin: 2rem 0; padding: 1.5rem; border-left: 4px solid #ddd; border-radius: 4px; }
.step.active { opacity: 1; border-color: #3498db; background: #f8f9fa; }
.step h3 { margin-bottom: 0.5rem; color: #2c3e50; }
.step p { color: #7f8c8d; margin-bottom: 1rem; }

.verification-status {
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-weight: 500;
}

.verification-status.info {
  background: #d1ecf1;
  color: #0c5460;
}

.verification-status.success {
  background: #d4edda;
  color: #155724;
}

.verification-status.warning {
  background: #fff3cd;
  color: #856404;
}

.verification-status.error {
  background: #f8d7da;
  color: #721c24;
}
</style>
