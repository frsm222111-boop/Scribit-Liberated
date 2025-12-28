<template>
  <div id="app">
    <nav class="navbar">
      <h1>UnBrickIt</h1>
      <div class="nav-links">
        <router-link to="/">Draw</router-link>
        <router-link to="/manual">Manual Control</router-link>
        <router-link to="/firmware">Firmware Upload</router-link>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
    <footer class="app-footer">
      <div class="footer-content">
        <a href="https://www.buymeacoffee.com/unbrickit" target="_blank" class="donate-link">
          ☕ Buy Me a Coffee
        </a>
        <div class="connection-status">
          <!-- WiFi icon -->
          <svg v-if="connected" class="wifi-icon connected" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12,21 L15.6,16.2 C14.6,15.45 13.3,15 12,15 C10.7,15 9.4,15.45 8.4,16.2 L12,21 M12,3 C7.95,3 4.21,4.34 1.2,6.6 L3,9 C5.5,7.12 8.62,6 12,6 C15.38,6 18.5,7.12 21,9 L22.8,6.6 C19.79,4.34 16.05,3 12,3 M12,9 C9.3,9 6.81,9.89 4.8,11.4 L6.6,13.8 C8.1,12.67 9.97,12 12,12 C14.03,12 15.9,12.67 17.4,13.8 L19.2,11.4 C17.19,9.89 14.7,9 12,9 Z"/>
          </svg>
          <svg v-else class="wifi-icon disconnected" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12,21 L15.6,16.2 C14.6,15.45 13.3,15 12,15 C10.7,15 9.4,15.45 8.4,16.2 L12,21 M12,3 C7.95,3 4.21,4.34 1.2,6.6 L3,9 C5.5,7.12 8.62,6 12,6 C15.38,6 18.5,7.12 21,9 L22.8,6.6 C19.79,4.34 16.05,3 12,3 M12,9 C9.3,9 6.81,9.89 4.8,11.4 L6.6,13.8 C8.1,12.67 9.97,12 12,12 C14.03,12 15.9,12.67 17.4,13.8 L19.2,11.4 C17.19,9.89 14.7,9 12,9 Z"/>
            <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span class="device-id">{{ deviceId || 'No device' }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getDeviceId } from './utils/appState'

const connected = ref(false)
const deviceId = ref(getDeviceId())
let connectionPollInterval = null

async function checkConnection() {
  try {
    const result = await window.electronAPI.checkDeviceConnection()
    connected.value = result.connected

    // If connected, fetch device ID from status
    if (result.connected) {
      const statusResult = await window.electronAPI.getDeviceStatus()
      if (statusResult.success && statusResult.data && statusResult.data.id) {
        deviceId.value = statusResult.data.id
      }
    }
  } catch (error) {
    connected.value = false
  }
}

function startConnectionPolling() {
  checkConnection()
  connectionPollInterval = setInterval(checkConnection, 3000)
}

function stopConnectionPolling() {
  if (connectionPollInterval) {
    clearInterval(connectionPollInterval)
    connectionPollInterval = null
  }
}

onMounted(() => {
  startConnectionPolling()
})

onUnmounted(() => {
  stopConnectionPolling()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #f5f5f5;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.navbar h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-links a {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  background: rgba(255,255,255,0.1);
}

.main-content {
  flex: 1;
  overflow: auto;
  padding: 2rem;
}

/* Reusable button styles */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #229954;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c0392b;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #7f8c8d;
}

.btn-warning {
  background: #f39c12;
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: #d68910;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Card styles */
.card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* Form styles */
.form-group {
  margin-bottom: 1.5rem;
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

/* Footer styles */
.app-footer {
  background: #2c3e50;
  color: white;
  padding: 0.75rem 2rem;
  box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.donate-link {
  color: #f39c12;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s;
  font-weight: 500;
}

.donate-link:hover {
  background: rgba(243, 156, 18, 0.1);
  color: #f1c40f;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.wifi-icon {
  display: block;
}

.wifi-icon.connected {
  color: #27ae60;
}

.wifi-icon.disconnected {
  color: #7f8c8d;
}

.device-id {
  font-family: monospace;
  font-size: 0.85rem;
  color: #ecf0f1;
}
</style>
