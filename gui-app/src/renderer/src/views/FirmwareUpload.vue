<template>
  <div class="firmware-upload">
    <div class="card">
      <h1>Firmware Upload</h1>
      <p>Upload firmware to Scribit device via OTA</p>

      <div class="step" v-for="(step, idx) in steps" :key="idx" :class="{active: currentStep === idx}">
        <h3>Step {{ idx + 1}}: {{ step.title }}</h3>
        <p>{{ step.desc }}</p>
        
        <WifiPrompt v-if="idx === 1 && currentStep === 1" @submit="sendWifi" />
        <button v-else-if="idx < 3" class="btn btn-primary" @click="nextStep">Next</button>
        <button v-else class="btn btn-success" @click="upload" :disabled="uploading">Upload Firmware</button>

        <ProgressBar v-if="uploading && idx === 3" :progress="progress" :message="status" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ProgressBar from '../components/ProgressBar.vue'
import WifiPrompt from '../components/WifiPrompt.vue'

const currentStep = ref(0)
const uploading = ref(false)
const progress = ref(0)
const status = ref('')

const steps = [
  { title: 'Connect to ScribIt-XXXXXX', desc: 'Hold LED button 5+ sec, connect to ScribIt WiFi (password: ScribItAP314)' },
  { title: 'Send WiFi Credentials', desc: 'Enter your WiFi to trigger OTA mode' },
  { title: 'Connect to MBC-WB-XXXXXX', desc: 'Connect to MBC-WB network (IP: 192.168.240.1)' },
  { title: 'Upload Firmware', desc: 'Upload firmware files' }
]

function nextStep() {
  if (currentStep.value < 3) currentStep.value++
}

async function sendWifi(creds) {
  status.value = 'Sending WiFi credentials...'
  const result = await window.electronAPI.sendWifiCredentials(creds)
  if (result.success) {
    status.value = 'Success! Device entering OTA mode'
    setTimeout(() => { currentStep.value = 2; status.value = '' }, 2000)
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
    status.value = 'Upload complete!'
  } else {
    status.value = 'Error: ' + result.error
  }
  uploading.value = false
}
</script>

<style scoped>
.firmware-upload { max-width: 800px; margin: 0 auto; }
.step { opacity: 0.5; margin: 2rem 0; padding: 1.5rem; border-left: 4px solid #ddd; }
.step.active { opacity: 1; border-color: #3498db; }
.step h3 { margin-bottom: 0.5rem; }
.step p { color: #7f8c8d; margin-bottom: 1rem; }
</style>
