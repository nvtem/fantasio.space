import VueRouter from 'vue-router'
import Vue from 'vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    component: () => import('../pages/LoginPage.vue')
  },
  {
    path: '/play/:roomId?',
    component: () => import('../pages/BattlePage.vue')
  }
]

const router = new VueRouter({
  mode: 'hash',
  routes
})

router.beforeEach((to, from, next) => {
  if (from.fullPath.startsWith('/play') && to.fullPath === '/')
    location.href = '/'
  else
    next()
})

export default router