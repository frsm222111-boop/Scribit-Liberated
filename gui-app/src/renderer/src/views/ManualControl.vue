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
                Calibrate pen holder
              </button>
              <p class="helper-text">This should bring your device to Pen 1 in up position. This is where you want to be before you start drawing</p>
            </div>

            <div class="control-group">
              <h3>Turn Cylinder</h3>
                              <p>Use these controls to rotate the pen holder cylinder to select different pens. The arrows on the side rotate the pen holder cylinder clockwise and counter clockwise.</p>
              <div class="turn-control">
                <div class="turn-input-row">
                  <button class="btn btn-secondary arc-btn" @click="turnCounterClockwise" :disabled="!connected" title="Counter-clockwise">
                    ↺
                  </button>
                  <div class="input-with-unit">
                    <input type="number" v-model.number="turnDegrees" min="1" step="1" />
                    <span class="unit">degrees</span>
                  </div>
                  <button class="btn btn-secondary arc-btn" @click="turnClockwise" :disabled="!connected" title="Clockwise">
                    ↻
                  </button>
                </div>
              </div>
              <div class="cylinder-instructions">
                <p>Clockwise motion will engage lowering mechanism at certain points, so always go counter-clockwise unless you want to lower the pen</p>
                <p><strong>Key degrees:</strong></p>
                <ul>
                  <li><code>72°</code> degrees between pens</li>
                  <li><code>30°</code> clockwise - Pen down</li>
                  <li><code>30°</code> counter-clockwise - Pen up</li>
                </ul>
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
const turnDegrees = ref(72)
const status = ref('')
const statusType = ref('info')
const lastCommand = ref('')

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
  // Left = left string shorter, right longer
  const dist = moveDistance.value
  const gcode = `G91\nG1 X-${dist} Y-${dist} F1000`
  await sendGcode(gcode)
}

async function moveRight() {
  // Right = left string longer, right shorter
  const dist = moveDistance.value
  const gcode = `G91\nG1 X${dist} Y${dist} F1000`
  await sendGcode(gcode)
}

// Pen control functions
async function homeCylinder() {
  const gcode = `M17\nG77\nG90\nG1 Z160\nG91\nG1 Z-70`
  await sendGcode(gcode)
  status.value = 'Pen cylinder calibrated, Pen 1 ready in up position'
  statusType.value = 'success'
}

async function turnClockwise() {
  const degrees = turnDegrees.value
  const gcode = `G91\nG1 Z-${degrees}`
  await sendGcode(gcode)
  status.value = `Cylinder turned ${degrees}° clockwise`
  statusType.value = 'success'
}

async function turnCounterClockwise() {
  const degrees = turnDegrees.value
  const gcode = `G91\nG1 Z${degrees}`
  await sendGcode(gcode)
  status.value = `Cylinder turned ${degrees}° counter-clockwise`
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

.helper-text {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #7f8c8d;
  line-height: 1.4;
  font-style: italic;
}

.turn-control {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.turn-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.input-with-unit {
  flex: 1;
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  overflow: hidden;
}

.input-with-unit input {
  flex: 1;
  padding: 0.75rem;
  border: none;
  font-size: 1rem;
  text-align: center;
  min-width: 0;
}

.input-with-unit input:focus {
  outline: none;
}

.input-with-unit .unit {
  padding: 0.75rem;
  padding-left: 0;
  color: #7f8c8d;
  font-size: 0.9rem;
  white-space: nowrap;
  user-select: none;
}

.input-with-unit:focus-within {
  border-color: #3498db;
}

.arc-btn {
  width: 50px;
  height: 50px;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 2.5rem;
  font-weight: bold;
  transform: rotate(180deg);
}

.cylinder-instructions {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  border-left: 3px solid #3498db;
}

.cylinder-instructions p {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #2c3e50;
}

.cylinder-instructions ul {
  margin: 0;
  padding-left: 1.5rem;
  list-style: none;
}

.cylinder-instructions li {
  font-size: 0.85rem;
  color: #546e7a;
  margin: 0.25rem 0;
  line-height: 1.4;
}

.cylinder-instructions code {
  background: #ecf0f1;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-family: monospace;
  color: #e74c3c;
  font-size: 0.9em;
  font-weight: 600;
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
