import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import { isSetupComplete } from './utils/appState'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'draw',
      component: () => import('./views/SvgConverter.vue'),
      meta: { requiresSetup: true }
    },
    {
      path: '/manual',
      name: 'manual',
      component: () => import('./views/ManualControl.vue'),
      meta: { requiresSetup: true }
    },
    {
      path: '/firmware',
      name: 'firmware',
      component: () => import('./views/FirmwareUpload.vue')
    },
    {
      path: '/license',
      name: 'license',
      component: () => import('./views/License.vue')
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
