<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="donation-card">
      <div class="donation-icon">
        ☕
      </div>

      <h2>Enjoying UnBrickIt?</h2>

      <p class="donation-message">
        If you're finding this app useful, please consider supporting its development.
        Your donation helps keep the project alive and enables new features.
      </p>

      <div class="qr-section">
        <p class="qr-instruction">Scan with your phone to donate:</p>
        <canvas ref="qrCanvas" class="qr-code"></canvas>
        <p class="qr-url">ko-fi.com/robotkareem</p>
      </div>

      <div class="donation-actions">
        <button class="btn btn-secondary" @click="close">
          Close
        </button>
      </div>

      <div v-if="showDontShowAgain" class="dont-show-option">
        <label>
          <input type="checkbox" v-model="dontShowAgain" />
          Don't show this again
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  isOpen: Boolean,
  showDontShowAgain: Boolean
})

const emit = defineEmits(['close', 'donate'])

const dontShowAgain = ref(false)
const qrCanvas = ref(null)

// Generate QR code when dialog opens
watch(() => props.isOpen, async (newValue) => {
  if (newValue) {
    await nextTick()
    if (qrCanvas.value) {
      try {
        await QRCode.toCanvas(qrCanvas.value, 'https://ko-fi.com/robotkareem', {
          width: 200,
          margin: 2,
          color: {
            dark: '#2c3e50',
            light: '#ffffff'
          }
        })
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    }
  }
})

function close() {
  emit('close', dontShowAgain.value)
  dontShowAgain.value = false
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
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.donation-card {
  background: white;
  border-radius: 12px;
  padding: 2.5rem;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  text-align: center;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.donation-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.donation-card h2 {
  font-size: 1.75rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.donation-message {
  color: #546e7a;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.qr-instruction {
  color: #2c3e50;
  font-weight: 500;
  font-size: 1rem;
  margin: 0;
}

.qr-code {
  border: 4px solid white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.qr-url {
  color: #7f8c8d;
  font-size: 0.9rem;
  font-family: monospace;
  margin: 0;
}

.donation-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.dont-show-option {
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.dont-show-option label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #7f8c8d;
  font-size: 0.9rem;
  cursor: pointer;
}

.dont-show-option input[type="checkbox"] {
  cursor: pointer;
  width: 1.1rem;
  height: 1.1rem;
}
</style>
