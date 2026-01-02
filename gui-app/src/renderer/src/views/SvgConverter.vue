<template>
  <div class="svg-converter">
    <div class="card">
      <h1>Draw</h1>
      <p>Upload an SVG or use one of the provided samples to draw using your device</p>

      <div class="file-selector">
        <button class="btn btn-primary" @click="selectFile">Select SVG File</button>
        <span v-if="selectedFile" class="file-name">{{ selectedFileName }}</span>
      </div>

      <div v-if="samples.length > 0" class="samples-section">
        <h3>Or choose a sample:</h3>
        <div class="samples-grid">
          <div
            v-for="sample in samples"
            :key="sample.filename"
            class="sample-card"
            :class="{ active: selectedFile === sample.path }"
            @click="loadSample(sample)"
          >
            <div class="sample-name">{{ sample.name }}</div>
          </div>
        </div>
      </div>

      <div v-if="svgContent" class="svg-preview-section">
        <div class="conversion-options">
          <h3>Scribit Configuration</h3>
          <p>We need three measurements to configure the drawing properly. Measure these distances on your wall and enter them before you start drawing. Otherwise your drawing will look wonky.</p>
          <div class="diagram-container">
            <svg viewBox="0 0 800 600" class="scribit-diagram">
              <!-- Grid lines (100mm spacing) -->
              <g opacity="0.2">
                <template v-for="i in gridLinesVertical" :key="'v-' + i">
                  <line :x1="50 + i * gridSpacing" y1="100" :x2="50 + i * gridSpacing" y2="500" stroke="#95a5a6" stroke-width="1"/>
                </template>
                <template v-for="i in gridLinesHorizontal" :key="'h-' + i">
                  <line x1="50" :y1="100 + i * gridSpacing" x2="750" :y2="100 + i * gridSpacing" stroke="#95a5a6" stroke-width="1"/>
                </template>
              </g>

              <!-- Grid cell size caption (top right) -->
              <text x="750" y="85" font-size="11" fill="#7f8c8d" text-anchor="end" opacity="0.6">Grid: 100mm × 100mm</text>

              <!-- Anchor distance line (drawn first, behind everything) -->
              <line x1="50" y1="100" x2="750" y2="100" stroke="#3498db" stroke-width="3" stroke-dasharray="10,10"/>

              <!-- String lines -->
              <line x1="50" y1="100" :x2="devicePosition.x" :y2="devicePosition.y" stroke="#2ecc71" stroke-width="2" opacity="0.5"/>
              <line x1="750" y1="100" :x2="devicePosition.x" :y2="devicePosition.y" stroke="#9b59b6" stroke-width="2" opacity="0.5"/>

              <!-- SVG Drawing Overlay (scaled to actual size) -->
              <g v-if="svgContent" opacity="0.85" :transform="`translate(${devicePosition.x}, ${devicePosition.y}) scale(${diagramScale})`">
                <foreignObject x="-1000" y="-1000" width="2000" height="2000" overflow="visible">
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
              <g :transform="`translate(${devicePosition.x}, ${devicePosition.y})`" opacity="0.5">
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

      <div v-if="selectedFile" class="pre-send-checks">
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="dimensionsConfirmed" />
            I've confirmed that the dimensions above are correct
          </label>
        </div>
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="calibrationConfirmed" />
            I've confirmed that the pen holder is <a href="#" @click.prevent="showCalibrationDialog = true" class="calibration-link">calibrated</a>
          </label>
        </div>

        <div class="warning-box">
          <strong>⚠️ Important:</strong> The preview may not be 100% accurate. Monitor your robot while drawing to ensure it stays within bounds. If the robot goes out of bounds or behaves unexpectedly, <strong>unplug the device immediately</strong> to stop it.
        </div>
      </div>

      <div v-if="selectedFile" class="actions">
        <button class="btn btn-success" @click="convertAndSend" :disabled="processing || drawingState !== 'idle' || !dimensionsConfirmed || !calibrationConfirmed">
          {{ processing ? 'Processing...' : 'Send' }}
        </button>
        <div v-if="drawingState !== 'idle'" class="drawing-controls-group">
          <button class="btn btn-warning" @click="pauseDrawing" :disabled="pausedState === 'paused' || pausedState === 'pausing'">
            Pause
          </button>
          <button class="btn btn-primary" @click="resumeDrawing" :disabled="pausedState === 'running'">
            Resume
          </button>
        </div>
      </div>

      <div v-if="status" class="status-message" :class="statusType">
        {{ status }}
      </div>

      <ProgressBar v-if="processing" :progress="progress" />
    </div>

    <DonationDialog
      :isOpen="showDonationDialog"
      :showDontShowAgain="donationShowCount >= 2"
      @close="handleDonationClose"
    />

    <!-- Calibration Dialog -->
    <div v-if="showCalibrationDialog" class="modal-overlay" @click.self="showCalibrationDialog = false">
      <div class="calibration-modal">
        <div class="modal-header">
          <h2>Pen Holder Calibration</h2>
          <button class="close-btn" @click="showCalibrationDialog = false">&times;</button>
        </div>
        <div class="modal-body">
          <img :src="penDiagram" alt="Pen Calibration Diagram" class="calibration-diagram" />
          <p class="calibration-text">
            Run the calibration in <a href="#" @click.prevent="goToManualControl" class="calibration-link">Manual Control</a> to ensure your pen holder is in the correct position (Pen 1 in up position) before starting a drawing.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import ProgressBar from '../components/ProgressBar.vue'
import DonationDialog from '../components/DonationDialog.vue'
import { getSvgOptions, setSvgOptions, getDonationDialogState, incrementDonationShowCount, setDonationDontShowAgain } from '../utils/appState'
import penDiagram from '../assets/pen_diagram.png'

const router = useRouter()

const selectedFile = ref('')
const svgContent = ref('')
const svgPhysicalWidth = ref(null) // Physical width in mm
const svgPhysicalHeight = ref(null) // Physical height in mm
const svgViewBoxWidth = ref(null) // ViewBox width in units
const svgViewBoxHeight = ref(null) // ViewBox height in units
const processing = ref(false)
const progress = ref(0)
const status = ref('')
const statusType = ref('info')
const drawingState = ref('idle') // idle, drawing, paused
const pausedState = ref('running') // running, pausing, paused
const samples = ref([])
let statusPollingInterval = null

// Donation dialog state
const showDonationDialog = ref(false)
const donationDialogState = getDonationDialogState()
const donationShowCount = ref(donationDialogState.showCount)
let donationTimeout = null

// Pre-send validation state
const dimensionsConfirmed = ref(false)
const calibrationConfirmed = ref(false)
const showCalibrationDialog = ref(false)

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
  // baseScale converts mm to diagram units
  const baseScale = 700 / options.value.anchorDistance

  // If we have physical dimensions and viewBox, scale based on actual physical size
  if (svgPhysicalWidth.value && svgViewBoxWidth.value) {
    // Calculate how many mm each viewBox unit represents
    const mmPerViewBoxUnit = svgPhysicalWidth.value / svgViewBoxWidth.value

    // Scale to convert viewBox units → mm → diagram units
    // Each viewBox unit = mmPerViewBoxUnit mm = (mmPerViewBoxUnit * baseScale) diagram units
    return baseScale * mmPerViewBoxUnit * options.value.scale
  }

  // Fallback to old behavior if no physical dimensions
  return baseScale * options.value.scale
})

const compensatedStrokeWidth = computed(() => {
  // Compensate for the ENTIRE diagram scale to keep stroke width at 2.5px visually
  const diagramScaleVal = diagramScale.value
  const strokeWidth = diagramScaleVal === 0 ? 2.5 : (2.5 / diagramScaleVal)
  return strokeWidth
})

// Update stroke widths in SVG preview when scale changes
watch([svgContent, compensatedStrokeWidth], async () => {
  await nextTick()
  const overlayElements = document.querySelectorAll('.svg-overlay path, .svg-overlay line, .svg-overlay polyline, .svg-overlay polygon, .svg-overlay circle, .svg-overlay ellipse, .svg-overlay rect')
  const strokeWidth = compensatedStrokeWidth.value
  overlayElements.forEach(el => {
    el.style.strokeWidth = strokeWidth
  })
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

// Grid lines for measurement reference (100mm spacing)
const gridSpacing = computed(() => {
  // Diagram is 700 units wide (x=50 to x=750) representing anchor distance
  // Calculate units per 100mm
  return (700 / options.value.anchorDistance) * 100
})

const gridLinesVertical = computed(() => {
  // How many 100mm segments fit in the anchor distance
  const count = Math.floor(options.value.anchorDistance / 100)
  return Array.from({ length: count }, (_, i) => i + 1)
})

const gridLinesHorizontal = computed(() => {
  // Show grid lines down to 400 diagram units (~400mm at similar scale)
  const maxY = 400
  const count = Math.floor(maxY / gridSpacing.value)
  return Array.from({ length: count }, (_, i) => i + 1)
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
      // Parse physical dimensions from original SVG (before stripping units)
      const unitToMm = { mm: 1, cm: 10, in: 25.4, pt: 0.3528, px: 0.2646 }

      const widthMatch = result.content.match(/width="([\d.]+)(mm|cm|in|pt|px)?"/)
      if (widthMatch) {
        const value = parseFloat(widthMatch[1])
        const unit = widthMatch[2] || 'px'  // Default to px if no unit (matches Python)
        svgPhysicalWidth.value = value * (unitToMm[unit] || 1)
      } else {
        svgPhysicalWidth.value = null
      }

      const heightMatch = result.content.match(/height="([\d.]+)(mm|cm|in|pt|px)?"/)
      if (heightMatch) {
        const value = parseFloat(heightMatch[1])
        const unit = heightMatch[2] || 'px'  // Default to px if no unit (matches Python)
        svgPhysicalHeight.value = value * (unitToMm[unit] || 1)
      } else {
        svgPhysicalHeight.value = null
      }

      // Parse viewBox to understand coordinate system
      const viewBoxMatch = result.content.match(/viewBox="[\d.\s]+ [\d.\s]+ ([\d.]+) ([\d.]+)"/)
      if (viewBoxMatch) {
        svgViewBoxWidth.value = parseFloat(viewBoxMatch[1])
        svgViewBoxHeight.value = parseFloat(viewBoxMatch[2])
      } else {
        svgViewBoxWidth.value = null
        svgViewBoxHeight.value = null
      }

      // Strip units (mm, cm, in, pt, px) from width/height for preview display
      // This prevents SVGs with physical units from appearing incorrectly sized in browser
      // The actual conversion still uses the original file with units
      let content = result.content
      content = content.replace(/width="([\d.]+)(mm|cm|in|pt|px)?"/g, 'width="$1"')
      content = content.replace(/height="([\d.]+)(mm|cm|in|pt|px)?"/g, 'height="$1"')
      svgContent.value = content
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

async function loadSamples() {
  try {
    const result = await window.electronAPI.listSamples()
    if (result.success) {
      samples.value = result.samples
    }
  } catch (error) {
    console.error('Error loading samples:', error)
  }
}

async function loadSample(sample) {
  selectedFile.value = sample.path
  await loadSvgContent(sample.path)
}

onMounted(() => {
  loadSamples()
})

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

      // Schedule donation dialog to appear after 10 seconds
      scheduleDonationDialog()
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

function scheduleDonationDialog() {
  // Check if user has opted out
  const dialogState = getDonationDialogState()
  if (dialogState.dontShowAgain) {
    return
  }

  // Clear any existing timeout
  if (donationTimeout) {
    clearTimeout(donationTimeout)
  }

  // Show dialog after 5 seconds
  donationTimeout = setTimeout(() => {
    showDonationDialog.value = true
    incrementDonationShowCount()
    donationShowCount.value = getDonationDialogState().showCount
  }, 5000)
}

function handleDonationClose(dontShowAgain) {
  showDonationDialog.value = false
  if (dontShowAgain) {
    setDonationDontShowAgain()
  }
}

function goToManualControl() {
  showCalibrationDialog.value = false
  router.push('/manual')
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

.samples-section {
  margin: 2rem 0;
}

.samples-section h3 {
  font-size: 1rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.samples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.sample-card {
  background: white;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.sample-card:hover {
  border-color: #3498db;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.sample-card.active {
  border-color: #3498db;
  background: #e3f2fd;
  font-weight: 600;
}

.sample-name {
  color: #2c3e50;
  font-size: 0.9rem;
  word-break: break-word;
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

.svg-overlay svg {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
}

/* Override all stroke widths in preview for uniform thickness */
/* Note: stroke widths are now set via JavaScript watcher for proper reactivity */
.svg-overlay path,
.svg-overlay line,
.svg-overlay polyline,
.svg-overlay polygon,
.svg-overlay circle,
.svg-overlay ellipse,
.svg-overlay rect {
  /* Stroke width set dynamically via JS */
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
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
  margin: 2rem 0;
}

.actions .drawing-controls-group {
  display: flex;
  gap: 1rem;
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

.pre-send-checks {
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.checkbox-group {
  margin: 0.75rem 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #2c3e50;
  font-size: 0.95rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.warning-box {
  margin-top: 1rem;
  padding: 0.875rem 1rem;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
  color: #856404;
  font-size: 0.9rem;
  line-height: 1.5;
}

.warning-box strong {
  color: #664d03;
}

.calibration-link {
  color: #3498db;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.2s;
}

.calibration-link:hover {
  color: #2980b9;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.calibration-modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #ddd;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #7f8c8d;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f0f0f0;
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.calibration-diagram {
  width: 100%;
  max-width: 300px;
  height: auto;
  border-radius: 8px;
}

.calibration-text {
  color: #546e7a;
  line-height: 1.6;
  text-align: center;
  margin: 0;
}
</style>
