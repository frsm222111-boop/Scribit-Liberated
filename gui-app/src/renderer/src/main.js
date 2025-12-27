import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import { isSetupComplete } from './utils/appState'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/Home.vue'),
      meta: { requiresSetup: true }
    },
    {
      path: '/firmware',
      name: 'firmware',
      component: () => import('./views/FirmwareUpload.vue')
    },
    {
      path: '/gcode',
      name: 'gcode',
      component: () => import('./views/GcodeSender.vue'),
      meta: { requiresSetup: true }
    }
  ]
})

// Navigation guard: redirect to firmware if setup not complete
router.beforeEach((to, from, next) => {
  if (to.meta.requiresSetup && !isSetupComplete()) {
    next('/firmware')
  } else {
    next()
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
