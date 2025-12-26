import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'

// Import views (will create these later)
// import FirmwareUpload from './views/FirmwareUpload.vue'
// import GcodeSender from './views/GcodeSender.vue'
// import SvgConverter from './views/SvgConverter.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/Home.vue')
    }
    // More routes will be added as we build features
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
