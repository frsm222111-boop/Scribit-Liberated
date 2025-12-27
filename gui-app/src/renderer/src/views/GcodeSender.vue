<template>
  <div class="gcode-sender">
    <div class="card">
      <h1>Send G-code</h1>
      <p>Upload and execute G-code files on your Scribit device</p>

      <DeviceStatus style="margin-bottom: 2rem;" />

      <div class="file-selector">
        <button class="btn btn-primary" @click="selectFile">Select G-code File</button>
        <span v-if="selectedFile" class="file-name">{{ selectedFile }}</span>
      </div>

      <div v-if="gcodeContent" class="gcode-preview">
        <h3>File Preview</h3>
        <div class="preview-stats">
          <span>Lines: {{ gcodeLines }}</span>
          <span>Size: {{ fileSize }}</span>
        </div>
        <pre class="code-preview">{{ gcodePreview }}</pre>
      </div>

      <div v-if="selectedFile" class="actions">
        <button class="btn btn-success" @click="uploadGcode" :disabled="uploading">
          {{ uploading ? 'Uploading...' : 'Upload to Device' }}
        </button>
      </div>

      <div v-if="status" class="status-message" :class="statusType">
        {{ status }}
      </div>

      <ProgressBar v-if="uploading" :progress="progress" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ProgressBar from '../components/ProgressBar.vue'
import DeviceStatus from '../components/DeviceStatus.vue'

const selectedFile = ref('')
const gcodeContent = ref('')
const uploading = ref(false)
const progress = ref(0)
const status = ref('')
const statusType = ref('info')

const gcodeLines = computed(() => {
  if (!gcodeContent.value) return 0
  return gcodeContent.value.split('\n').length
})

const fileSize = computed(() => {
  if (!gcodeContent.value) return '0 B'
  const bytes = new Blob([gcodeContent.value]).size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

const gcodePreview = computed(() => {
  if (!gcodeContent.value) return ''
  const lines = gcodeContent.value.split('\n')
  if (lines.length <= 20) return gcodeContent.value
  return lines.slice(0, 20).join('\n') + '\n... (' + (lines.length - 20) + ' more lines)'
})

async function selectFile() {
  const result = await window.electronAPI.selectFile({
    filters: [
      { name: 'G-code Files', extensions: ['gcode', 'gc', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (!result.canceled) {
    selectedFile.value = result.filePath
    await loadFileContent(result.filePath)
  }
}

async function loadFileContent(filePath) {
  try {
    const result = await window.electronAPI.readFile(filePath)
    if (result.success) {
      gcodeContent.value = result.content
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

async function uploadGcode() {
  uploading.value = true
  progress.value = 0
  status.value = 'Uploading G-code to device...'
  statusType.value = 'info'

  try {
    // Simulate progress
    const progressInterval = setInterval(() => {
      if (progress.value < 90) {
        progress.value += 10
      }
    }, 200)

    const result = await window.electronAPI.sendGcode(gcodeContent.value)

    clearInterval(progressInterval)
    progress.value = 100

    if (result.success) {
      status.value = 'G-code uploaded successfully! Device is executing...'
      statusType.value = 'success'
    } else {
      status.value = 'Upload failed: ' + result.error
      statusType.value = 'error'
    }
  } catch (error) {
    status.value = 'Error: ' + error.message
    statusType.value = 'error'
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.gcode-sender {
  max-width: 900px;
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

.gcode-preview {
  margin: 2rem 0;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.gcode-preview h3 {
  margin-top: 0;
  color: #2c3e50;
}

.preview-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #7f8c8d;
}

.code-preview {
  background: #fff;
  padding: 1rem;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  line-height: 1.4;
  border: 1px solid #ddd;
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
