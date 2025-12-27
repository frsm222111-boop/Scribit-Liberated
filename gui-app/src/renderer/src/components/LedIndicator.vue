<template>
  <div class="led-indicator">
    <svg viewBox="0 0 100 60" class="led-arch">
      <!-- Arch shape - like "(" rotated 90° clockwise (opening upward) -->
      <path
        d="M 15 45 Q 50 20, 85 45"
        :stroke="currentColor"
        :class="animationClass"
        stroke-width="8"
        stroke-linecap="round"
        fill="none"
      />
    </svg>
    <div class="led-label">{{ label }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['dark-blue', 'pulse-white', 'flash-white', 'off', 'solid-white'].includes(value)
  },
  label: {
    type: String,
    default: ''
  }
})

const currentColor = computed(() => {
  switch (props.mode) {
    case 'dark-blue':
      return '#1e3a8a'
    case 'pulse-white':
    case 'flash-white':
    case 'solid-white':
      return '#ffffff'
    case 'off':
      return '#1a1a1a'
    default:
      return '#666'
  }
})

const animationClass = computed(() => {
  switch (props.mode) {
    case 'pulse-white':
      return 'pulse'
    case 'flash-white':
      return 'flash'
    default:
      return ''
  }
})
</script>

<style scoped>
.led-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.led-arch {
  width: 80px;
  height: 48px;
  filter: drop-shadow(0 0 4px rgba(0,0,0,0.3));
}

.led-arch path {
  transition: stroke 0.3s ease;
}

.led-arch path.pulse {
  animation: pulse 2s ease-in-out infinite;
}

.led-arch path.flash {
  animation: flash 0.5s linear infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

@keyframes flash {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.led-label {
  font-size: 0.75rem;
  color: #7f8c8d;
  text-align: center;
  font-weight: 500;
}
</style>
