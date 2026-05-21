<template>
  <div class="wifi-prompt card">
    <h3>WiFi Credentials</h3>
    <div class="form-group">
      <label>SSID</label>
      <input v-model="ssid" @keyup.enter="submit" />
    </div>
    <div class="form-group">
      <label>Password</label>
      <input v-model="password" type="password" @keyup.enter="submit" />
    </div>
    <button class="btn btn-primary" @click="submit" :disabled="!ssid || !password">Send</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const emit = defineEmits(['submit'])
const ssid = ref('')
const password = ref('')
function submit() {
  if (ssid.value && password.value) {
    emit('submit', { ssid: ssid.value, password: password.value })
  }
}
</script>
