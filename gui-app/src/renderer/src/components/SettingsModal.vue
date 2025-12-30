<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Settings</h2>
        <button class="close-btn" @click="close">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Device IP Address</label>
          <input
            type="text"
            v-model="localSettings.ipAddress"
            placeholder="192.168.240.1"
          />
          <small>The IP address of your ScribIt device</small>
        </div>

        <div class="form-group">
          <label>OTA Port</label>
          <input
            type="number"
            v-model.number="localSettings.otaPort"
            placeholder="3232"
          />
          <small>Port for firmware updates</small>
        </div>

        <div class="form-group">
          <label>API Port</label>
          <input
            type="number"
            v-model.number="localSettings.apiPort"
            placeholder="8888"
          />
          <small>Port for device communication</small>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Cancel</button>
        <button class="btn btn-primary" @click="save">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { getDeviceSettings, setDeviceSettings } from '../utils/appState'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'save'])

const localSettings = ref({
  ipAddress: '192.168.240.1',
  otaPort: 3232,
  apiPort: 8888
})

// Load settings when modal opens
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    localSettings.value = { ...getDeviceSettings() }
  }
})

function close() {
  emit('close')
}

function save() {
  const plainSettings = { ...localSettings.value }
  setDeviceSettings(plainSettings)
  emit('save', plainSettings)
  close()
}
</script>

<style scoped>
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

.modal-card {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #7f8c8d;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #2c3e50;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: #3498db;
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #7f8c8d;
  font-size: 0.875rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
}
</style>
