<template>
  <div class="home">
    <h2>Welcome to Scribit Control</h2>
    <p>Upload firmware, send G-code, and convert SVG files to control your Scribit device.</p>

    <div class="features">
      <div class="feature-card">
        <h3>📦 Firmware Upload</h3>
        <p>Upload firmware to your Scribit device via OTA</p>
        <button disabled>Coming Soon</button>
      </div>

      <div class="feature-card">
        <h3>📝 G-code Sender</h3>
        <p>Send G-code commands to your Scribit device</p>
        <button disabled>Coming Soon</button>
      </div>

      <div class="feature-card">
        <h3>🎨 SVG Converter</h3>
        <p>Convert SVG files to G-code for drawing</p>
        <button disabled>Coming Soon</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Home view component
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}

p {
  font-size: 1.1rem;
  color: #666;
  margin-bottom: 2rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.feature-card p {
  font-size: 1rem;
  margin-bottom: 1.5rem;
}

.feature-card button {
  background: #3498db;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.feature-card button:hover:not(:disabled) {
  background: #2980b9;
}

.feature-card button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
