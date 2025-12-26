import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.js'),
          'ipc-handlers': resolve(__dirname, 'src/main/ipc-handlers.js'),
          'python-runner': resolve(__dirname, 'src/main/python-runner.js'),
          'espota-runner': resolve(__dirname, 'src/main/espota-runner.js')
        },
        external: ['electron', 'axios']
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.js')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    plugins: [vue()]
  }
})
