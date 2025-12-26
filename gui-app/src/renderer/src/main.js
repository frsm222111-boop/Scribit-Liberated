import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/Home.vue')
    },
    {
      path: '/firmware',
      name: 'firmware',
      component: () => import('./views/FirmwareUpload.vue')
    }
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
