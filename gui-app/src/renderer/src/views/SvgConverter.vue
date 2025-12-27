<template>
  <div class="svg-converter">
    <div class="card">
      <h1>SVG to Scribit</h1>
      <p>Upload SVG files and send them directly to your Scribit device</p>

      <DeviceStatus />

      <div v-if="drawingState !== 'idle'" class="drawing-controls">
        <button class="btn btn-warning" @click="pauseDrawing" :disabled="pausedState === 'paused' || pausedState === 'pausing'">
          Pause
        </button>
        <button class="btn btn-primary" @click="resumeDrawing" :disabled="pausedState === 'running'">
          Resume
        </button>
        <button class="btn btn-danger" @click="stopDrawing" :disabled="drawingState === 'idle'">
          Stop
        </button>
      </div>

      <div class="file-selector">
        <button class="btn btn-primary" @click="selectFile">Select SVG File</button>
        <span v-if="selectedFile" class="file-name">{{ selectedFileName }}</span>
      </div>

      <div v-if="svgContent" class="svg-preview-section">
        <div class="conversion-options">
          <h3>Scribit Configuration</h3>

          <div class="diagram-container">
            <svg viewBox="0 0 800 600" class="scribit-diagram">
              <!-- Anchor distance line (drawn first, behind everything) -->
              <line x1="50" y1="100" x2="750" y2="100" stroke="#3498db" stroke-width="3" stroke-dasharray="10,10"/>

              <!-- String lines -->
              <line x1="50" y1="100" :x2="devicePosition.x" :y2="devicePosition.y" stroke="#2ecc71" stroke-width="4"/>
              <line x1="750" y1="100" :x2="devicePosition.x" :y2="devicePosition.y" stroke="#9b59b6" stroke-width="4"/>

              <!-- SVG Drawing Overlay (scaled to actual size) -->
              <g v-if="svgContent" opacity="0.6" :transform="`translate(${devicePosition.x}, ${devicePosition.y}) scale(${diagramScale})`">
                <foreignObject x="-400" y="-300" width="800" height="600">
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    class="svg-overlay"
                    v-html="svgContent"
                  ></div>
                </foreignObject>
              </g>

              <!-- Left anchor (X) -->
              <g transform="translate(50, 100)">
                <line x1="-10" y1="-10" x2="10" y2="10" stroke="#e74c3c" stroke-width="4" stroke-linecap="round"/>
                <line x1="-10" y1="10" x2="10" y2="-10" stroke="#e74c3c" stroke-width="4" stroke-linecap="round"/>
              </g>

              <!-- Right anchor (X) -->
              <g transform="translate(750, 100)">
                <line x1="-10" y1="-10" x2="10" y2="10" stroke="#e74c3c" stroke-width="4" stroke-linecap="round"/>
                <line x1="-10" y1="10" x2="10" y2="-10" stroke="#e74c3c" stroke-width="4" stroke-linecap="round"/>
              </g>

              <!-- Device at center (two concentric circles) -->
              <g :transform="`translate(${devicePosition.x}, ${devicePosition.y})`">
                <!-- Outer circle -->
                <circle cx="0" cy="0" r="16" fill="#34495e" stroke="#2c3e50" stroke-width="3"/>
                <!-- Inner circle -->
                <circle cx="0" cy="0" r="8" fill="#ecf0f1" stroke="#34495e" stroke-width="2"/>
              </g>

            </svg>

            <!-- Input overlays -->
            <div class="diagram-input" :class="{ invalid: !isConfigValid }" style="top: 80px; left: 50%; transform: translateX(-50%);">
              <label>Anchor Distance</label>
              <div class="input-row">
                <input type="number" v-model.number="options.anchorDistance" min="100" step="10" />
                <span>mm</span>
              </div>
            </div>

            <div class="diagram-input" :class="{ invalid: !isConfigValid }" :style="`top: ${leftStringInputPos.top}; left: ${leftStringInputPos.left}; transform: translate(-50%, -50%);`">
              <label>Left String</label>
              <div class="input-row">
                <input type="number" v-model.number="options.leftLength" min="100" step="10" />
                <span>mm</span>
              </div>
            </div>

            <div class="diagram-input" :class="{ invalid: !isConfigValid }" :style="`top: ${rightStringInputPos.top}; left: ${rightStringInputPos.left}; transform: translate(-50%, -50%);`">
              <label>Right String</label>
              <div class="input-row">
                <input type="number" v-model.number="options.rightLength" min="100" step="10" />
                <span>mm</span>
              </div>
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
        <button class="btn btn-success" @click="convertAndSend" :disabled="processing || drawingState !== 'idle'">
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
import { ref, computed, onMounted, watch } from 'vue'
import ProgressBar from '../components/ProgressBar.vue'
import DeviceStatus from '../components/DeviceStatus.vue'
import { getSvgOptions, setSvgOptions } from '../utils/appState'

const selectedFile = ref('')
const svgContent = ref('')
const processing = ref(false)
const progress = ref(0)
const status = ref('')
const statusType = ref('info')
const drawingState = ref('idle') // idle, drawing, paused
const pausedState = ref('running') // running, pausing, paused
let statusPollingInterval = null

// Load saved options or use defaults
const savedOptions = getSvgOptions()
const options = ref(savedOptions || {
  anchorDistance: 1000,
  leftLength: 800,
  rightLength: 800,
  scale: 1.0
})

// Save options to localStorage when they change
watch(options, (newOptions) => {
  setSvgOptions(newOptions)
}, { deep: true })

// Update status message when pausedState changes
watch(pausedState, (newState) => {
  if (drawingState.value === 'drawing') {
    if (newState === 'pausing') {
      status.value = 'Pausing drawing...'
      statusType.value = 'info'
    } else if (newState === 'paused') {
      status.value = 'Drawing paused'
      statusType.value = 'info'
    } else if (newState === 'running') {
      status.value = 'Drawing in progress...'
      statusType.value = 'success'
    }
  }
})

const selectedFileName = computed(() => {
  if (!selectedFile.value) return ''
  return selectedFile.value.split('/').pop()
})

const diagramScale = computed(() => {
  // Diagram anchor distance is 700 units (from x=50 to x=750)
  // Scale SVG to match actual anchor distance
  const baseScale = 700 / options.value.anchorDistance
  return baseScale * options.value.scale
})

// Check if configuration is valid
const isConfigValid = computed(() => {
  const scaleFactor = 700 / options.value.anchorDistance
  const r1 = options.value.leftLength * scaleFactor
  const r2 = options.value.rightLength * scaleFactor
  const d = 700 // Distance between anchors is always 700 units

  // Triangle inequality: sum of two sides must be greater than third side
  return r1 + r2 >= d && Math.abs(r1 - r2) <= d
})

// Calculate device position based on string lengths
const devicePosition = computed(() => {
  const x1 = 50  // Left anchor x
  const y1 = 100 // Left anchor y
  const x2 = 750 // Right anchor x
  const y2 = 100 // Right anchor y

  // Convert real-world lengths to diagram units
  const scaleFactor = 700 / options.value.anchorDistance
  const r1 = options.value.leftLength * scaleFactor  // Left string length
  const r2 = options.value.rightLength * scaleFactor // Right string length

  // Distance between anchors
  const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

  // Check if strings can reach (triangle inequality)
  if (!isConfigValid.value) {
    // Invalid configuration, return center position
    return { x: 400, y: 400 }
  }

  // Calculate intersection point (using circle intersection formula)
  const a = (r1 ** 2 - r2 ** 2 + d ** 2) / (2 * d)
  const h = Math.sqrt(r1 ** 2 - a ** 2)

  // Point on line between anchors
  const x3 = x1 + a * (x2 - x1) / d
  const y3 = y1 + a * (y2 - y1) / d

  // Device position (below the anchor line)
  // Perpendicular to (x2-x1, y2-y1) pointing downward
  const x = x3 - h * (y2 - y1) / d
  const y = y3 + h * (x2 - x1) / d

  return { x, y }
})

// Calculate input overlay positions (midpoint of each string)
const leftStringInputPos = computed(() => {
  const midX = (50 + devicePosition.value.x) / 2
  const midY = (100 + devicePosition.value.y) / 2
  return {
    left: `${(midX / 800) * 100}%`,
    top: `${(midY / 600) * 100}%`
  }
})

const rightStringInputPos = computed(() => {
  const midX = (750 + devicePosition.value.x) / 2
  const midY = (100 + devicePosition.value.y) / 2
  return {
    left: `${(midX / 800) * 100}%`,
    top: `${(midY / 600) * 100}%`
  }
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

async function pollDeviceStatus() {
  try {
    const result = await window.electronAPI.getDeviceStatus()
    if (result.success && result.data) {
      const deviceState = result.data.state
      const devicePaused = result.data.paused || 'running'

      pausedState.value = devicePaused

      // If device is not printing, drawing is done
      if (deviceState !== 'PRINTING') {
        drawingState.value = 'idle'
        pausedState.value = 'running'
        stopPolling()
        status.value = 'Drawing completed'
        statusType.value = 'success'
      }
    }
  } catch (error) {
    console.error('Error polling device status:', error)
  }
}

function startPolling() {
  if (statusPollingInterval) {
    clearInterval(statusPollingInterval)
  }
  statusPollingInterval = setInterval(pollDeviceStatus, 2000) // Poll every 2 seconds
  pollDeviceStatus() // Immediate first poll
}

function stopPolling() {
  if (statusPollingInterval) {
    clearInterval(statusPollingInterval)
    statusPollingInterval = null
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
      drawingState.value = 'drawing'
      pausedState.value = 'running'
      startPolling()
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

async function pauseDrawing() {
  try {
    pausedState.value = 'pausing' // Optimistic update, watcher will update status
    const result = await window.electronAPI.pauseDrawing()
    if (!result.success) {
      status.value = 'Failed to pause: ' + result.error
      statusType.value = 'error'
      pausedState.value = 'running' // Revert on error
    }
    // Polling will update pausedState to 'paused'
  } catch (error) {
    status.value = 'Error pausing: ' + error.message
    statusType.value = 'error'
    pausedState.value = 'running' // Revert on error
  }
}

async function resumeDrawing() {
  try {
    pausedState.value = 'running' // Optimistic update, watcher will update status
    const result = await window.electronAPI.resumeDrawing()
    if (!result.success) {
      status.value = 'Failed to resume: ' + result.error
      statusType.value = 'error'
      pausedState.value = 'paused' // Revert on error
    }
    // Polling will confirm state
  } catch (error) {
    status.value = 'Error resuming: ' + error.message
    statusType.value = 'error'
    pausedState.value = 'paused' // Revert on error
  }
}

async function stopDrawing() {
  try {
    const result = await window.electronAPI.stopDrawing()
    if (result.success) {
      drawingState.value = 'idle'
      pausedState.value = 'running'
      stopPolling()
      status.value = 'Drawing stopped'
      statusType.value = 'info'
    } else {
      status.value = 'Failed to stop: ' + result.error
      statusType.value = 'error'
    }
  } catch (error) {
    status.value = 'Error stopping: ' + error.message
    statusType.value = 'error'
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
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem 0;
}

.scribit-diagram {
  width: 100%;
  height: auto;
  display: block;
}

.svg-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
}

.diagram-input {
  position: absolute;
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.15rem;
  background: rgba(255, 255, 255, 0.92);
  padding: 0.2rem 0.3rem;
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.25);
  border: 1px solid #3498db;
  font-size: 0.65rem;
}

.diagram-input.invalid {
  border-color: #e74c3c;
  background: rgba(255, 235, 235, 0.92);
}

.diagram-input.invalid label {
  color: #c0392b;
}

.diagram-input.invalid input {
  border-color: #e74c3c;
  color: #c0392b;
}

.diagram-input label {
  font-size: 0.6rem;
  color: #2c3e50;
  font-weight: 700;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  margin-bottom: 0.1rem;
  text-align: center;
}

.diagram-input .input-row {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.diagram-input input {
  width: 48px;
  padding: 0.15rem 0.2rem;
  border: 1px solid #ddd;
  border-radius: 2px;
  font-size: 0.75rem;
  text-align: center;
  font-weight: 600;
  box-sizing: border-box;
}

/* Remove number input spinners */
.diagram-input input::-webkit-outer-spin-button,
.diagram-input input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.diagram-input input[type=number] {
  -moz-appearance: textfield;
}

.diagram-input span {
  font-size: 0.6rem;
  color: #7f8c8d;
  font-weight: 600;
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

.drawing-controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 1.5rem 0 2rem 0;
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
