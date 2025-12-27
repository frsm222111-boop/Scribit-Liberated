<template>
  <div class="firmware-upload">
    <div class="card">
      <h1>Firmware Upload</h1>
      <p>Upload firmware to Scribit device via OTA</p>

      <div class="step" v-for="(step, idx) in steps" :key="idx" :class="{active: currentStep === idx}">
        <h3>Step {{ idx + 1 }}{{ idx === 3 && currentStep === 3 ? `.${currentSubstep + 1}` : '' }}: {{ idx === 3 && currentStep === 3 ? substeps[currentSubstep].title : step.title }}</h3>
        <p>{{ idx === 3 && currentStep === 3 ? substeps[currentSubstep].desc : step.desc }}</p>

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
        <div v-if="idx === 1 && currentStep === 1">
          <WifiPrompt @submit="sendWifi" />
          <button class="btn btn-secondary" @click="skipStep2" style="margin-top: 1rem;">Skip (Debug)</button>
          <div v-if="status" class="verification-status info" style="margin-top: 1rem;">{{ status }}</div>
        </div>

        <!-- Step 2: Verify MBC-WB network -->
        <div v-if="idx === 2 && currentStep === 2">
          <div class="verification-status" :class="networkStatus.type">
            {{ networkStatus.message }}
          </div>
          <button class="btn btn-primary" @click="nextStep" :disabled="!step2Verified">
            {{ step2Verified ? 'Continue' : 'Waiting for connection...' }}
          </button>
        </div>

        <!-- Step 3: Upload firmware with substeps -->
        <div v-if="idx === 3 && currentStep === 3">
          <!-- Substep 0: Upload ESP32 firmware -->
          <div v-if="currentSubstep === 0">
            <button v-if="!uploading" class="btn btn-success" @click="uploadESP32">Upload ESP32 Firmware</button>
            <div v-if="uploading">
              <ProgressBar :progress="progress" />
              <div v-if="status" class="verification-status info" style="margin-top: 1rem;">{{ status }}</div>
            </div>
          </div>

          <!-- Substep 1: Reconnect after ESP32 upload -->
          <div v-if="currentSubstep === 1">
            <div class="verification-status" :class="networkStatus.type">
              {{ networkStatus.message }}
            </div>
            <button class="btn btn-primary" @click="nextSubstep" :disabled="!reconnectVerified">
              {{ reconnectVerified ? 'Continue' : 'Waiting for reconnection...' }}
            </button>
          </div>

          <!-- Substep 2: Upload SAMD21 firmware -->
          <div v-if="currentSubstep === 2">
            <button v-if="!uploading" class="btn btn-success" @click="uploadSAMD21">Upload SAMD21 Firmware</button>
            <div v-if="uploading">
              <ProgressBar :progress="progress" />
              <div v-if="status" class="verification-status info" style="margin-top: 1rem;">{{ status }}</div>
            </div>
          </div>

          <!-- Substep 3: Reconnect after SAMD21 upload -->
          <div v-if="currentSubstep === 3">
            <div class="verification-status" :class="networkStatus.type">
              {{ networkStatus.message }}
            </div>
            <button class="btn btn-primary" @click="nextSubstep" :disabled="!reconnectVerified">
              {{ reconnectVerified ? 'Continue' : 'Waiting for reconnection...' }}
            </button>
          </div>

          <!-- Substep 4: Upload ESP32 partitions -->
          <div v-if="currentSubstep === 4">
            <button v-if="!uploading" class="btn btn-success" @click="uploadPartitions">Upload Partitions</button>
            <div v-if="uploading">
              <ProgressBar :progress="progress" />
              <div v-if="status" class="verification-status info" style="margin-top: 1rem;">{{ status }}</div>
            </div>
            <!-- Show status messages when not uploading -->
            <div v-if="!uploading && status" class="verification-status info" style="margin-top: 1rem;">{{ status }}</div>
          </div>
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
const currentSubstep = ref(0)
const uploading = ref(false)
const progress = ref(0)
const status = ref('')
const networkStatus = ref({ type: 'info', message: 'Checking network...' })
const step0Verified = ref(false)
const step2Verified = ref(false)
const reconnectVerified = ref(false)

let networkCheckInterval = null

const steps = [
  { title: 'Connect to ScribIt-XXXXXX', desc: 'Hold LED button 5+ sec, connect to ScribIt WiFi (password: ScribItAP314)' },
  { title: 'Send WiFi Credentials', desc: 'Enter your WiFi to trigger OTA mode' },
  { title: 'Connect to MBC-WB-XXXXXX', desc: 'Connect to MBC-WB network (IP: 192.168.240.1)' },
  { title: 'Upload Firmware', desc: 'Upload firmware files in sequence' }
]

const substeps = [
  { title: 'Upload ESP32 Firmware', desc: 'Upload main ESP32 firmware' },
  { title: 'Reconnect to MBC-WB', desc: 'Device will reboot. Reconnect to MBC-WB WiFi' },
  { title: 'Upload SAMD21 Firmware', desc: 'Upload companion chip firmware' },
  { title: 'Reconnect to MBC-WB', desc: 'Device will reboot. Reconnect to MBC-WB WiFi' },
  { title: 'Upload ESP32 Partitions', desc: 'Upload final partition data' }
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

  // Step 3 substeps: Reconnect verification (substeps 1 and 3)
  if (currentStep.value === 3 && (currentSubstep.value === 1 || currentSubstep.value === 3)) {
    if (result.connected) {
      networkStatus.value = { type: 'success', message: '✓ Device reconnected at http://192.168.240.1:8888/' }
      reconnectVerified.value = true
    } else {
      networkStatus.value = { type: 'warning', message: 'Waiting for device reboot... Reconnect to MBC-WB WiFi' }
      reconnectVerified.value = false
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

watch(currentSubstep, (newSubstep) => {
  if (currentStep.value === 3 && (newSubstep === 1 || newSubstep === 3)) {
    reconnectVerified.value = false
    startNetworkCheck()
  } else if (currentStep.value === 3) {
    stopNetworkCheck()
  }
})

onMounted(() => {
  if (currentStep.value === 0) {
    startNetworkCheck()
  }

  // Listen for firmware upload progress
  window.electronAPI.onFirmwareProgress((progressData) => {
    console.log('Firmware progress:', progressData)
    if (progressData.type === 'info') {
      status.value = progressData.data
    } else if (progressData.type === 'stdout' || progressData.type === 'stderr') {
      status.value += progressData.data
    }
  })
})

onUnmounted(() => {
  stopNetworkCheck()
})

function nextStep() {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

function nextSubstep() {
  if (currentSubstep.value < 4) {
    currentSubstep.value++
  }
}

function skipStep2() {
  status.value = 'Skipped WiFi credentials (debug mode)'
  setTimeout(() => {
    currentStep.value = 2
    status.value = ''
  }, 1000)
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

async function uploadESP32() {
  uploading.value = true
  progress.value = 0
  status.value = ''

  console.log('Starting ESP32 firmware upload')
  const result = await window.electronAPI.uploadSingleFirmware({
    espIp: '192.168.240.1',
    firmwareFile: 'ScribitESP.ino.bin'
  })
  console.log('Upload result:', result)

  if (result.success) {
    progress.value = 100
    status.value = 'ESP32 firmware uploaded! Device will reboot.'
    setTimeout(() => {
      currentSubstep.value = 1
      status.value = ''
    }, 2000)
  } else {
    console.error('Upload failed:', result.error)
    status.value = 'Error: ' + result.error
  }
  uploading.value = false
}

async function uploadSAMD21() {
  uploading.value = true
  progress.value = 0
  status.value = ''

  console.log('Starting SAMD21 firmware upload')
  const result = await window.electronAPI.uploadSingleFirmware({
    espIp: '192.168.240.1',
    firmwareFile: 'MK4duo.ino.bin',
    companion: true
  })
  console.log('Upload result:', result)

  if (result.success) {
    progress.value = 100
    status.value = 'SAMD21 firmware uploaded! Device will reboot.'
    setTimeout(() => {
      currentSubstep.value = 3
      status.value = ''
    }, 2000)
  } else {
    console.error('Upload failed:', result.error)
    status.value = 'Error: ' + result.error
  }
  uploading.value = false
}

async function uploadPartitions() {
  uploading.value = true
  progress.value = 0
  status.value = ''

  console.log('Starting partitions upload')
  const result = await window.electronAPI.uploadSingleFirmware({
    espIp: '192.168.240.1',
    firmwareFile: 'ScribitESP.ino.partitions.bin',
    spiffs: true
  })
  console.log('Upload result:', result)

  if (result.success) {
    progress.value = 100
    status.value = 'All firmware uploaded! Redirecting to home...'
    markSetupComplete()
    setTimeout(() => router.push('/'), 2000)
  } else {
    console.error('Upload failed:', result.error)
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
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
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
