<template>
  <div class="manual-control">
    <div class="card">
      <h1>Manual Control</h1>
      <p>Direct control of Scribit device positioning and pen selection</p>

      <DeviceStatus />

      <div class="control-sections">
        <!-- Movement Control -->
        <div class="control-section">
          <h2>Movement</h2>
          <p class="section-description">Move device in cardinal directions (G91 relative mode)</p>

          <div class="movement-controls">
            <div class="movement-input">
              <label>Distance (mm)</label>
              <input type="number" v-model.number="moveDistance" min="1" step="10" />
            </div>

            <div class="direction-pad">
              <div class="pad-row">
                <button class="btn btn-primary direction-btn" @click="moveUp" :disabled="!connected">
                  ↑ Up
                </button>
              </div>
              <div class="pad-row">
                <button class="btn btn-primary direction-btn" @click="moveLeft" :disabled="!connected">
                  ← Left
                </button>
                <button class="btn btn-primary direction-btn" @click="moveDown" :disabled="!connected">
                  ↓ Down
                </button>
                <button class="btn btn-primary direction-btn" @click="moveRight" :disabled="!connected">
                  → Right
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pen Control -->
        <div class="control-section">
          <h2>Pen Control</h2>
          <p class="section-description">Manage pen holder cylinder and pen selection</p>

          <div class="pen-controls">
            <div class="control-group">
              <h3>Initialize</h3>
              <button class="btn btn-warning" @click="homeCylinder" :disabled="!connected">
                Home Cylinder (G77)
              </button>
            </div>

            <div class="control-group">
              <h3>Pen Up/Down</h3>
              <div class="button-row">
                <button class="btn btn-success" @click="penUp" :disabled="!connected">
                  Pen Up
                </button>
                <button class="btn btn-danger" @click="penDown" :disabled="!connected">
                  Pen Down
                </button>
              </div>
            </div>

            <div class="control-group">
              <h3>Select Pen</h3>
              <div class="pen-buttons">
                <button
                  v-for="pen in pens"
                  :key="pen.number"
                  class="btn pen-btn"
                  :class="{ 'active': currentPen === pen.number }"
                  :style="{ borderColor: pen.color }"
                  @click="selectPen(pen.number)"
                  :disabled="!connected"
                >
                  <span class="pen-dot" :style="{ backgroundColor: pen.color }"></span>
                  Pen {{ pen.number }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="status" class="status-message" :class="statusType">
        {{ status }}
      </div>

      <div v-if="lastCommand" class="last-command">
        <strong>Last G-code:</strong> <code>{{ lastCommand }}</code>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import DeviceStatus from '../components/DeviceStatus.vue'

const connected = ref(false)
const moveDistance = ref(50)
const currentPen = ref(1)
const status = ref('')
const statusType = ref('info')
const lastCommand = ref('')

const pens = [
  { number: 1, color: '#000000', name: 'Black' },
  { number: 2, color: '#e74c3c', name: 'Red' },
  { number: 3, color: '#3498db', name: 'Blue' },
  { number: 4, color: '#27ae60', name: 'Green' }
]

let connectionPollInterval = null

async function checkConnection() {
  try {
    const result = await window.electronAPI.checkDeviceConnection()
    connected.value = result.connected
  } catch (error) {
    connected.value = false
  }
}

async function sendGcode(gcode) {
  try {
    lastCommand.value = gcode
    const result = await window.electronAPI.sendGcode(gcode)

    if (result.success) {
      status.value = 'Command sent successfully'
      statusType.value = 'success'
    } else {
      status.value = 'Failed to send command: ' + result.error
      statusType.value = 'error'
    }
  } catch (error) {
    status.value = 'Error: ' + error.message
    statusType.value = 'error'
  }
}

// Movement functions
async function moveUp() {
  // Up = both strings shorter (device moves up)
  const dist = moveDistance.value
  const gcode = `G91\nG1 X-${dist} Y${dist} F1000`
  await sendGcode(gcode)
}

async function moveDown() {
  // Down = both strings longer (device moves down)
  const dist = moveDistance.value
  const gcode = `G91\nG1 X${dist} Y-${dist} F1000`
  await sendGcode(gcode)
}

async function moveLeft() {
  // Left = left string longer, right shorter
  const dist = moveDistance.value
  const gcode = `G91\nG1 X${dist} Y${dist} F1000`
  await sendGcode(gcode)
}

async function moveRight() {
  // Right = left string shorter, right longer
  const dist = moveDistance.value
  const gcode = `G91\nG1 X-${dist} Y-${dist} F1000`
  await sendGcode(gcode)
}

// Pen control functions
async function homeCylinder() {
  const gcode = `M17\nG77\nG90\nG1 Z160\nG91\nG1 Z-70`
  await sendGcode(gcode)
  currentPen.value = 1
  status.value = 'Pen cylinder homed, Pen 1 ready'
  statusType.value = 'success'
}

async function penUp() {
  const gcode = `G91\nG1 Z30`
  await sendGcode(gcode)
}

async function penDown() {
  const gcode = `G91\nG1 Z-30`
  await sendGcode(gcode)
}

async function selectPen(penNumber) {
  if (penNumber === currentPen.value) return

  let gcode = 'G91\nG1 Z30\n' // Pen up first

  const diff = penNumber - currentPen.value

  if (diff === 3 || diff === -1) {
    // Pen 4 -> Pen 1 (special case: two 72° rotations)
    gcode += 'G1 Z72\nG1 Z72\nG1 Z60\nG1 Z-60'
  } else {
    // Normal rotation
    const steps = diff > 0 ? diff : diff + 4
    for (let i = 0; i < steps; i++) {
      gcode += 'G1 Z72\n'
    }
    gcode += 'G1 Z60\nG1 Z-60'
  }

  await sendGcode(gcode)
  currentPen.value = penNumber
  status.value = `Switched to Pen ${penNumber} (${pens[penNumber - 1].name})`
  statusType.value = 'success'
}

onMounted(() => {
  checkConnection()
  connectionPollInterval = setInterval(checkConnection, 3000)
})

onUnmounted(() => {
  if (connectionPollInterval) {
    clearInterval(connectionPollInterval)
  }
})
</script>

<style scoped>
.manual-control {
  max-width: 1000px;
  margin: 0 auto;
}

.control-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 2rem;
}

.control-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.control-section h2 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.section-description {
  font-size: 0.85rem;
  color: #7f8c8d;
  margin-bottom: 1.5rem;
}

/* Movement Controls */
.movement-controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.movement-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.movement-input label {
  font-weight: 500;
  color: #2c3e50;
}

.movement-input input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  width: 150px;
}

.direction-pad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.pad-row {
  display: flex;
  gap: 0.5rem;
}

.direction-btn {
  width: 100px;
  padding: 1rem;
  font-weight: 600;
}

/* Pen Controls */
.pen-controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.control-group h3 {
  font-size: 1rem;
  color: #2c3e50;
  margin-bottom: 0.75rem;
}

.button-row {
  display: flex;
  gap: 0.5rem;
}

.button-row .btn {
  flex: 1;
}

.pen-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.pen-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  color: #2c3e50;
  border: 2px solid #ddd;
  padding: 0.75rem 1rem;
  transition: all 0.2s;
}

.pen-btn:hover:not(:disabled) {
  background: #f8f9fa;
  transform: translateY(-2px);
}

.pen-btn.active {
  border-width: 3px;
  font-weight: 600;
  background: #f8f9fa;
}

.pen-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.2);
}

/* Status and Last Command */
.status-message {
  margin: 1.5rem 0;
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

.last-command {
  background: #ecf0f1;
  padding: 1rem;
  border-radius: 4px;
  border-left: 4px solid #3498db;
  font-family: monospace;
  font-size: 0.9rem;
}

.last-command code {
  background: white;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  color: #e74c3c;
}

@media (max-width: 768px) {
  .control-sections {
    grid-template-columns: 1fr;
  }
}
</style>
