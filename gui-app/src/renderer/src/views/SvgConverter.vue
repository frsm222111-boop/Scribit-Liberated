<template>
  <div class="svg-converter">
    <div class="card">
      <h1>SVG to Scribit</h1>
      <p>Upload SVG files and send them directly to your Scribit device</p>

      <DeviceStatus style="margin-bottom: 2rem;" />

      <div class="file-selector">
        <button class="btn btn-primary" @click="selectFile">Select SVG File</button>
        <span v-if="selectedFile" class="file-name">{{ selectedFileName }}</span>
      </div>

      <div v-if="svgContent" class="svg-preview-section">
        <h3>SVG Preview</h3>
        <div class="svg-preview">
          <div v-html="svgContent" class="svg-container"></div>
        </div>

        <div class="conversion-options">
          <h3>Scribit Configuration</h3>

          <div class="diagram-container">
            <svg viewBox="0 0 400 300" class="scribit-diagram">
              <!-- Anchor distance line (drawn first, behind everything) -->
              <line x1="100" y1="50" x2="300" y2="50" stroke="#3498db" stroke-width="2" stroke-dasharray="5,5"/>

              <!-- String lines -->
              <line x1="100" y1="50" x2="200" y2="200" stroke="#2ecc71" stroke-width="3"/>
              <line x1="300" y1="50" x2="200" y2="200" stroke="#9b59b6" stroke-width="3"/>

              <!-- Left anchor (X) -->
              <g transform="translate(100, 50)">
                <line x1="-6" y1="-6" x2="6" y2="6" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>
                <line x1="-6" y1="6" x2="6" y2="-6" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>
              </g>

              <!-- Right anchor (X) -->
              <g transform="translate(300, 50)">
                <line x1="-6" y1="-6" x2="6" y2="6" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>
                <line x1="-6" y1="6" x2="6" y2="-6" stroke="#e74c3c" stroke-width="3" stroke-linecap="round"/>
              </g>

              <!-- Device at center (two concentric circles) -->
              <g transform="translate(200, 200)">
                <!-- Outer circle -->
                <circle cx="0" cy="0" r="12" fill="#34495e" stroke="#2c3e50" stroke-width="2"/>
                <!-- Inner circle -->
                <circle cx="0" cy="0" r="6" fill="#ecf0f1" stroke="#34495e" stroke-width="1"/>
              </g>

              <!-- Labels -->
              <text x="200" y="35" text-anchor="middle" fill="#7f8c8d" font-size="12">Anchor Distance</text>
              <text x="120" y="125" text-anchor="middle" fill="#7f8c8d" font-size="12" transform="rotate(-52 120 125)">Left String</text>
              <text x="280" y="125" text-anchor="middle" fill="#7f8c8d" font-size="12" transform="rotate(52 280 125)">Right String</text>
            </svg>

            <!-- Input overlays -->
            <div class="diagram-input" style="top: 60px; left: 50%; transform: translateX(-50%);">
              <input type="number" v-model.number="options.anchorDistance" min="100" step="10" />
              <span>mm</span>
            </div>

            <div class="diagram-input" style="top: 120px; left: 15%;">
              <input type="number" v-model.number="options.leftLength" min="100" step="10" />
              <span>mm</span>
            </div>

            <div class="diagram-input" style="top: 120px; right: 15%;">
              <input type="number" v-model.number="options.rightLength" min="100" step="10" />
              <span>mm</span>
            </div>
          </div>

          <div class="option-group" style="margin-top: 2rem;">
            <label>Scale</label>
            <input type="number" v-model.number="options.scale" min="0.1" max="10" step="0.1" />
            <small>Scale factor for the drawing</small>
          </div>
        </div>
      </div>

      <div v-if="selectedFile" class="actions">
        <button class="btn btn-success" @click="convertAndSend" :disabled="processing">
          {{ processing ? 'Processing...' : 'Convert & Send to Device' }}
        </button>
      </div>

      <div v-if="status" class="status-message" :class="statusType">
        {{ status }}
      </div>

      <ProgressBar v-if="processing" :progress="progress" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ProgressBar from '../components/ProgressBar.vue'
import DeviceStatus from '../components/DeviceStatus.vue'

const selectedFile = ref('')
const svgContent = ref('')
const processing = ref(false)
const progress = ref(0)
const status = ref('')
const statusType = ref('info')

const options = ref({
  anchorDistance: 1000,
  leftLength: 800,
  rightLength: 800,
  scale: 1.0
})

const selectedFileName = computed(() => {
  if (!selectedFile.value) return ''
  return selectedFile.value.split('/').pop()
})

async function selectFile() {
  const result = await window.electronAPI.selectFile({
    filters: [
      { name: 'SVG Files', extensions: ['svg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (!result.canceled) {
    selectedFile.value = result.filePath
    await loadSvgContent(result.filePath)
  }
}

async function loadSvgContent(filePath) {
  try {
    const result = await window.electronAPI.readFile(filePath)
    if (result.success) {
      svgContent.value = result.content
      status.value = ''
    } else {
      status.value = 'Error reading file: ' + result.error
      statusType.value = 'error'
    }
  } catch (error) {
    status.value = 'Error reading file: ' + error.message
    statusType.value = 'error'
  }
}

async function convertAndSend() {
  processing.value = true
  progress.value = 0
  status.value = 'Converting SVG to G-code...'
  statusType.value = 'info'

  try {
    // Step 1: Convert SVG to G-code
    progress.value = 20
    const convertResult = await window.electronAPI.convertSvg({
      inputSvg: selectedFile.value,
      anchorDistance: options.value.anchorDistance,
      leftLength: options.value.leftLength,
      rightLength: options.value.rightLength,
      scale: options.value.scale
    })

    if (!convertResult.success) {
      status.value = 'Conversion failed: ' + convertResult.error
      statusType.value = 'error'
      processing.value = false
      return
    }

    // Step 2: Read generated G-code
    progress.value = 50
    status.value = 'Reading generated G-code...'

    const gcodeResult = await window.electronAPI.readFile(convertResult.outputPath)
    if (!gcodeResult.success) {
      status.value = 'Error reading G-code: ' + gcodeResult.error
      statusType.value = 'error'
      processing.value = false
      return
    }

    // Step 3: Send G-code to device
    progress.value = 70
    status.value = 'Sending to device...'

    const sendResult = await window.electronAPI.sendGcode(gcodeResult.content)

    progress.value = 100

    if (sendResult.success) {
      status.value = 'Successfully sent to device! Drawing in progress...'
      statusType.value = 'success'
    } else {
      status.value = 'Failed to send to device: ' + sendResult.error
      statusType.value = 'error'
    }
  } catch (error) {
    status.value = 'Error: ' + error.message
    statusType.value = 'error'
  } finally {
    processing.value = false
  }
}
</script>

<style scoped>
.svg-converter {
  max-width: 1000px;
  margin: 0 auto;
}

.file-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0;
}

.file-name {
  color: #2c3e50;
  font-family: monospace;
  word-break: break-all;
}

.svg-preview-section {
  margin: 2rem 0;
}

.svg-preview-section h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.svg-preview {
  background: #f8f9fa;
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid #ddd;
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.svg-container {
  max-width: 100%;
  max-height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.svg-container :deep(svg) {
  max-width: 100%;
  max-height: 400px;
  height: auto;
}

.conversion-options {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.conversion-options h3 {
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.diagram-container {
  position: relative;
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.scribit-diagram {
  width: 100%;
  height: auto;
  display: block;
}

.diagram-input {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border: 2px solid #3498db;
}

.diagram-input input {
  width: 80px;
  padding: 0.3rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: center;
}

.diagram-input span {
  font-size: 0.85rem;
  color: #7f8c8d;
  font-weight: 500;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-group label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9rem;
}

.option-group input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.option-group small {
  color: #7f8c8d;
  font-size: 0.85rem;
}

.actions {
  margin: 2rem 0;
}

.status-message {
  margin: 1rem 0;
  padding: 1rem;
  border-radius: 4px;
  font-weight: 500;
}

.status-message.info {
  background: #d1ecf1;
  color: #0c5460;
}

.status-message.success {
  background: #d4edda;
  color: #155724;
}

.status-message.error {
  background: #f8d7da;
  color: #721c24;
}
</style>
