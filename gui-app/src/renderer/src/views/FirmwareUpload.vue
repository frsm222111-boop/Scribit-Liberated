<template>
  <div class="firmware-upload">
    <div class="card">
      <h1>Firmware Upload</h1>
      <p>Upload firmware to Scribit device via OTA</p>

      <!-- Version status message -->
      <div v-if="versionStatus" class="version-status" :class="versionStatus.type">
        {{ versionStatus.message }}
      </div>

      <div class="step" v-for="(step, idx) in steps" :key="step.id" :class="{active: currentStep === idx}">
        <div class="step-header">
          <div class="step-content">
            <h3>Step {{ idx + 1 }}{{ step.id === 3 && currentStep === idx ? `.${currentSubstep + 1}` : '' }}: {{ step.id === 3 && currentStep === idx ? substeps[currentSubstep].title : step.title }}</h3>
            <p>{{ step.id === 3 && currentStep === idx ? substeps[currentSubstep].desc : step.desc }}</p>
          </div>
          <div v-if="step.id !== 3 && currentStep === idx" class="led-container">
            <!-- Arrow pointing down to left of LED (only for step 1) -->
            <svg v-if="step.id === 0" class="led-arrow" viewBox="0 0 40 60" width="40" height="60">
              <path d="M 20 10 L 20 40" stroke="#3498db" stroke-width="3" fill="none" />
              <path d="M 10 30 L 20 40 L 30 30" stroke="#3498db" stroke-width="3" fill="none" stroke-linejoin="round" />
            </svg>
            <LedIndicator :mode="getLedMode(step.id)" :label="getLedLabel(step.id)" />
          </div>
        </div>

        <!-- Step 0: Verify ScribIt network -->
        <div v-if="step.id === 0 && currentStep === idx">
          <div class="verification-status" :class="networkStatus.type">
            {{ networkStatus.message }}
          </div>
          <button class="btn btn-primary" @click="nextStep" :disabled="!step0Verified">
            {{ step0Verified ? 'Continue' : 'Waiting for connection...' }}
          </button>
          <button class="btn btn-secondary" @click="nextStep" style="margin-left: 1rem;">Skip</button>
        </div>

        <!-- Step 1: WiFi credentials -->
        <div v-if="step.id === 1 && currentStep === idx">
          <WifiPrompt @submit="sendWifi" />
          <button class="btn btn-secondary" @click="skipStep2" style="margin-top: 1rem;">Skip</button>
          <div v-if="status" class="verification-status info" style="margin-top: 1rem;">{{ status }}</div>
        </div>

        <!-- Step 2: Verify MBC-WB network -->
        <div v-if="step.id === 2 && currentStep === idx">
          <div class="verification-status" :class="networkStatus.type">
            {{ networkStatus.message }}
          </div>
          <button class="btn btn-primary" @click="nextStep" :disabled="!step2Verified">
            {{ step2Verified ? 'Continue' : 'Waiting for connection...' }}
          </button>
          <button class="btn btn-secondary" @click="nextStep" style="margin-left: 1rem;">Skip</button>
        </div>

        <!-- Step 3: Upload firmware with substeps -->
        <div v-if="step.id === 3 && currentStep === idx">
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
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import ProgressBar from '../components/ProgressBar.vue'
import WifiPrompt from '../components/WifiPrompt.vue'
import LedIndicator from '../components/LedIndicator.vue'
import { markSetupComplete, setDeviceId, getFirmwareVersion } from '../utils/appState'
import packageJson from '../../../../package.json'

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

// Version comparison
const guiVersion = packageJson.version
const versionStatus = computed(() => {
  const firmwareVersion = getFirmwareVersion()

  if (!firmwareVersion) {
    return null // No version info yet
  }

  const comparison = compareVersions(guiVersion, firmwareVersion)

  if (comparison === 0) {
    return {
      type: 'success',
      message: `✓ You're up to date! (v${firmwareVersion})`
    }
  } else if (comparison > 0) {
    return {
      type: 'warning',
      message: `Update available: v${firmwareVersion} → v${guiVersion}`
    }
  } else {
    return {
      type: 'info',
      message: `Firmware: v${firmwareVersion} | GUI: v${guiVersion}`
    }
  }
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

// Filter steps based on firmware version
const steps = computed(() => {
  const firmwareVersion = getFirmwareVersion()

  if (!firmwareVersion) {
    // No version info - show all steps
    return [
      { id: 0, title: 'Connect to ScribIt-.....', desc: 'Hold left side of the LED 5+ sec, device reboots. \nWhen back online connect to ScribIt-.... WiFi (password: ScribItAP314 if needed)' },
      { id: 1, title: 'Send WiFi Credentials', desc: 'Enter your home WiFi credentials to trigger OTA mode' },
      { id: 2, title: 'Connect to MBC-WB-.....', desc: 'A new WiFi network named MBC-WB-..... should appear. Connect to it' },
      { id: 3, title: 'Upload Firmware', desc: 'Upload firmware files in sequence' }
    ]
  }

  const [major] = firmwareVersion.split('.').map(Number)

  if (major >= 1) {
    // Firmware >= 1.0 - only show connect and upload steps
    return [
      { id: 0, title: 'Connect to ScribIt-.....', desc: 'Connect to ScribIt-.... WiFi (password: ScribItAP314 if needed)' },
      { id: 3, title: 'Upload Firmware', desc: 'Upload firmware files in sequence' }
    ]
  }

  // Firmware < 1.0 - show all steps
  return [
    { id: 0, title: 'Connect to ScribIt-.....', desc: 'Hold left side of the LED 5+ sec, device reboots. \nWhen back online connect to ScribIt-.... WiFi (password: ScribItAP314 if needed)' },
    { id: 1, title: 'Send WiFi Credentials', desc: 'Enter your home WiFi credentials to trigger OTA mode' },
    { id: 2, title: 'Connect to MBC-WB-.....', desc: 'A new WiFi network named MBC-WB-..... should appear. Connect to it' },
    { id: 3, title: 'Upload Firmware', desc: 'Upload firmware files in sequence' }
  ]
})

const substeps = computed(() => {
  const firmwareVersion = getFirmwareVersion()

  if (!firmwareVersion) {
    // No version info - use MBC-WB flow
    return [
      { title: 'Upload ESP32 Firmware', desc: 'Upload main ESP32 firmware' },
      { title: 'Reconnect to MBC-WB', desc: 'Device will reboot. Reconnect to MBC-WB WiFi' },
      { title: 'Upload SAMD21 Firmware', desc: 'Upload companion chip firmware' },
      { title: 'Reconnect to MBC-WB', desc: 'Device will reboot. Reconnect to MBC-WB WiFi' },
      { title: 'Upload ESP32 Partitions', desc: 'Upload final partition data' }
    ]
  }

  const [major] = firmwareVersion.split('.').map(Number)

  if (major >= 1) {
    // Firmware >= 1.0 - stay on ScribIt network
    return [
      { title: 'Upload ESP32 Firmware', desc: 'Upload main ESP32 firmware' },
      { title: 'Reconnect to ScribIt', desc: 'Device will reboot. Reconnect to ScribIt-... WiFi' },
      { title: 'Upload SAMD21 Firmware', desc: 'Upload companion chip firmware' },
      { title: 'Reconnect to ScribIt', desc: 'Device will reboot. Reconnect to ScribIt-... WiFi' },
      { title: 'Upload ESP32 Partitions', desc: 'Upload final partition data' }
    ]
  }

  // Firmware < 1.0 - use MBC-WB flow
  return [
    { title: 'Upload ESP32 Firmware', desc: 'Upload main ESP32 firmware' },
    { title: 'Reconnect to MBC-WB', desc: 'Device will reboot. Reconnect to MBC-WB WiFi' },
    { title: 'Upload SAMD21 Firmware', desc: 'Upload companion chip firmware' },
    { title: 'Reconnect to MBC-WB', desc: 'Device will reboot. Reconnect to MBC-WB WiFi' },
    { title: 'Upload ESP32 Partitions', desc: 'Upload final partition data' }
  ]
})

async function checkNetwork() {
  const result = await window.electronAPI.checkDeviceConnection()

  if (!result.success) {
    networkStatus.value = { type: 'error', message: 'Error checking connection' }
    return
  }

  const currentStepData = steps.value[currentStep.value]
  if (!currentStepData) return

  // Step 0: Check for ScribIt network (device at 192.168.240.1:8888)
  if (currentStepData.id === 0) {
    if (result.connected) {
      networkStatus.value = { type: 'success', message: '✓ Device reachable at http://192.168.240.1:8888/' }
      step0Verified.value = true
    } else {
      networkStatus.value = { type: 'warning', message: 'Cannot reach http://192.168.240.1:8888/ - Connect to ScribIt WiFi' }
      step0Verified.value = false
    }
  }

  // Step 2: Check for MBC-WB network (same endpoint)
  if (currentStepData.id === 2) {
    if (result.connected) {
      networkStatus.value = { type: 'success', message: '✓ Device reachable at http://192.168.240.1:8888/' }
      step2Verified.value = true
    } else {
      networkStatus.value = { type: 'warning', message: 'Cannot reach http://192.168.240.1:8888/ - Connect to MBC-WB WiFi' }
      step2Verified.value = false
    }
  }

  // Step 3 substeps: Reconnect verification (substeps 1 and 3)
  if (currentStepData.id === 3 && (currentSubstep.value === 1 || currentSubstep.value === 3)) {
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

watch(currentStep, (newStepIndex) => {
  const stepData = steps.value[newStepIndex]
  if (stepData && (stepData.id === 0 || stepData.id === 2)) {
    startNetworkCheck()
  } else {
    stopNetworkCheck()
  }
})

watch(currentSubstep, (newSubstep) => {
  const stepData = steps.value[currentStep.value]
  if (stepData && stepData.id === 3 && (newSubstep === 1 || newSubstep === 3)) {
    reconnectVerified.value = false
    startNetworkCheck()
  } else if (stepData && stepData.id === 3) {
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
  if (currentStep.value < steps.value.length - 1) {
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
  // The web UI is now embedded directly in the ESP32 firmware (web_ui.h), so there
  // is no SPIFFS/partition image to upload. The previous code uploaded
  // ScribitESP.ino.partitions.bin with the SPIFFS flag (-s), which wrote the 3 KB
  // partition table into the SPIFFS partition, leaving it unmountable -> firmware
  // auto-formatted SPIFFS empty -> web UI read back as 0 bytes. This step now just
  // finalizes setup; no destructive upload is performed.
  uploading.value = true
  progress.value = 100
  status.value = 'Firmware uploaded! Web UI is built into the firmware. Redirecting to home...'
  markSetupComplete()
  setTimeout(() => router.push('/'), 2000)
  uploading.value = false
}

function getLedMode(stepIndex) {
  if (stepIndex === 0) {
    return 'dark-blue'
  } else if (stepIndex === 1) {
    return 'pulse-white'
  } else if (stepIndex === 2) {
    return 'flash-white'
  } else if (stepIndex === 3) {
    // Step 4 substeps progression
    if (currentSubstep.value === 0) {
      return 'flash-white'
    } else if (currentSubstep.value === 1) {
      return 'off'
    } else if (currentSubstep.value === 2 || currentSubstep.value === 3) {
      return 'dark-blue'
    } else if (currentSubstep.value === 4) {
      return 'solid-white'
    }
  }
  return 'off'
}

function getLedLabel(stepIndex) {
  if (stepIndex === 0) {
    return ''
  } else if (stepIndex === 1) {
    return 'Pulsing White'
  } else if (stepIndex === 2) {
    return 'Fast Flashing White'
  } else if (stepIndex === 3) {
    if (currentSubstep.value === 0) {
      return 'Fast Flashing White'
    } else if (currentSubstep.value === 1) {
      return 'Off'
    } else if (currentSubstep.value === 2 || currentSubstep.value === 3) {
      return 'Dark Blue'
    } else if (currentSubstep.value === 4) {
      return 'Solid White'
    }
  }
  return ''
}
</script>

<style scoped>
.firmware-upload { max-width: 800px; margin: 0 auto; }
.step { opacity: 0.5; margin: 2rem 0; padding: 1.5rem; border-left: 4px solid #ddd; border-radius: 4px; }
.step.active { opacity: 1; border-color: #3498db; background: #e8eaed; }

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  margin-bottom: 1rem;
}

.step-content {
  flex: 1;
}

.step h3 { margin-bottom: 0.5rem; color: #2c3e50; }
.step p { color: #7f8c8d; margin-bottom: 0; }

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

.led-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.led-arrow {
  flex-shrink: 0;
  transform: translateX(110%) translateY(-10px);
}

.version-status {
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
  font-weight: 600;
  text-align: center;
}

.version-status.success {
  background: #d4edda;
  color: #155724;
  border: 2px solid #28a745;
}

.version-status.warning {
  background: #fff3cd;
  color: #856404;
  border: 2px solid #ffc107;
}

.version-status.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 2px solid #17a2b8;
}
</style>
