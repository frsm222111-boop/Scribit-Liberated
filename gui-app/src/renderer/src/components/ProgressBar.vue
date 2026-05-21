<template>
  <div class="progress-bar">
    <div class="fill" :style="{width: progress + '%'}"></div>
    <div class="text">{{ Math.round(progress) }}%</div>
    <div v-if="message" class="msg">{{ message }}</div>
  </div>
</template>

<script setup>
defineProps({ progress: Number, message: String })
</script>

<style scoped>
.progress-bar { margin: 1rem 0; }
.fill { height: 30px; background: #3498db; transition: width 0.3s; }
.text, .msg { text-align: center; margin-top: 0.5rem; }
</style>
