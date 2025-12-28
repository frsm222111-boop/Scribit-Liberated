<template>
  <div class="home">
    <div class="card welcome-card">
      <h1>Welcome to UnBrickIt</h1>
      <p class="subtitle">Manage your UnBrickIt device firmware and operations</p>

      <div v-if="!setupComplete" class="setup-required">
        <h3>⚠️ Initial Setup Required</h3>
        <p>Please complete firmware upload first to unlock all features</p>
        <router-link to="/firmware" class="btn btn-primary">Go to Firmware Upload</router-link>
      </div>

      <div class="features">
        <div class="feature-card">
          <h2>Firmware Upload</h2>
          <p>Update your UnBrickIt device firmware over WiFi</p>
          <router-link to="/firmware" class="btn btn-primary">Go to Firmware Upload</router-link>
        </div>

        <div class="feature-card" :class="{ disabled: !setupComplete }">
          <h2>SVG Sender</h2>
          <p>Upload SVG files and send them directly to your UnBrickIt device</p>
          <router-link v-if="setupComplete" to="/svg" class="btn btn-primary">Open SVG Sender</router-link>
          <button v-else class="btn btn-primary" disabled>Complete Setup First</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { isSetupComplete } from '../utils/appState'

const setupComplete = ref(false)

onMounted(() => {
  setupComplete.value = isSetupComplete()
})
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-card {
  text-align: center;
}

.welcome-card h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.25rem;
  color: #7f8c8d;
  margin-bottom: 3rem;
}

.setup-required {
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.setup-required h3 {
  color: #856404;
  margin-bottom: 1rem;
}

.setup-required p {
  color: #856404;
  margin-bottom: 1.5rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.feature-card {
  padding: 2rem;
  border: 1px solid #ecf0f1;
  border-radius: 8px;
  background: #f8f9fa;
  transition: all 0.3s;
}

.feature-card:not(.disabled):hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.feature-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.feature-card h2 {
  font-size: 1.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.feature-card p {
  color: #7f8c8d;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.feature-card .btn {
  width: 100%;
}
</style>
