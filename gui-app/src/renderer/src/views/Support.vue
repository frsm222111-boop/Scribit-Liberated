<template>
  <div class="support-page">
    <div class="card support-card">
      <div class="donation-icon">
        ☕
      </div>

      <h1>Support Development</h1>

      <p class="donation-message">
        If you're finding this app useful, please consider supporting its development.
        Your donation helps keep the project alive and enables new features.
      </p>

      <div class="qr-section">
        <p class="qr-instruction">Scan with your phone to donate:</p>
        <canvas ref="qrCanvas" class="qr-code"></canvas>
        <p class="qr-url">ko-fi.com/robotkareem</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'

const qrCanvas = ref(null)

onMounted(async () => {
  if (qrCanvas.value) {
    try {
      await QRCode.toCanvas(qrCanvas.value, 'https://ko-fi.com/robotkareem', {
        width: 250,
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
})
</script>

<style scoped>
.support-page {
  max-width: 600px;
  margin: 0 auto;
}

.support-card {
  text-align: center;
  padding: 3rem 2rem;
}

.donation-icon {
  font-size: 5rem;
  margin-bottom: 1.5rem;
}

.support-card h1 {
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.donation-message {
  color: #546e7a;
  line-height: 1.6;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 12px;
}

.qr-instruction {
  color: #2c3e50;
  font-weight: 600;
  font-size: 1.1rem;
  margin: 0;
}

.qr-code {
  border: 6px solid white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.qr-url {
  color: #7f8c8d;
  font-size: 1rem;
  font-family: monospace;
  margin: 0;
  font-weight: 500;
}
</style>
