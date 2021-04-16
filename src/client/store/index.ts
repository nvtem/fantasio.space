import Vuex from 'vuex'
import Vue from 'vue'
import authModule from './auth'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    playerCrowns: []
  },
  mutations: {
    setPlayerCrowns(state, data) {
      state.playerCrowns = data
    }
  },
  modules: { 'auth': authModule }
})