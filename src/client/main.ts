import Vue from 'vue'
import router from './router'
import store from './store'
import { BootstrapVue, BootstrapVueIcons } from "bootstrap-vue"
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import App from './App.vue'

Vue.config.productionTip = false
Vue.config.devtools = false

Vue.use(BootstrapVue)
Vue.use(BootstrapVueIcons)

const port = process.env.NODE_ENV === 'production' ? 443 : 1443
Vue.prototype.$APIEndpoint = `${location.protocol}//${location.hostname}:${port}`

new Vue({
  store,
  router,
  render: h => h(App)
}).$mount('#app')