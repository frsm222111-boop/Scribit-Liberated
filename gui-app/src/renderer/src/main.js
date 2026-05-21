import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/welcome'
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('./views/ConnectionWelcome.vue')
    },
    {
      path: '/draw',
      name: 'draw',
      component: () => import('./views/SvgConverter.vue')
    },
    {
      path: '/manual',
      name: 'manual',
      component: () => import('./views/ManualControl.vue')
    },
    {
      path: '/firmware',
      name: 'firmware',
      component: () => import('./views/FirmwareUpload.vue')
    },
    {
      path: '/support',
      name: 'support',
      component: () => import('./views/Support.vue')
    }
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
