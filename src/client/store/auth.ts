import axios from "axios"

export default {
  namespaced: true,

  state() {
    return {
      name: '',
      points: 0
    }
  },

  mutations: {
    _vm: (() => {}) as any,

    loadUserInfo(state: any) {
      const { name, accessHash } = localStorage

      if (name && accessHash) {
        axios.post(`${this._vm.$APIEndpoint}/player/${name}/checkAccessHash`, {
          accessHash
        }).then(r => {
          if (r.data.success) {
            state.name = name

            axios.get(`${this._vm.$APIEndpoint}/player/${name}`).then(r2 => {
              state.points = r2.data.player.points
            })
          }
        })
      } else {
        state.name = ''
      }
    },

    setUserInfo(state: any, {name, accessHash}: { name: string, accessHash: string }) {
      state.name = name
      localStorage.name = name
      localStorage.accessHash = accessHash
    }
  },

  actions: {
    _vm: (() => {}) as any,

    login({ commit }: { commit: Function }, data: any) {
      return axios.post(this._vm.$APIEndpoint + '/player/login', {
        name: data.name,
        password: data.password
      }).then(r => {
        if (r.data.success) {
          commit('setUserInfo', {
            name: data.name,
            accessHash: r.data.accessHash
          })
          commit('loadUserInfo')
          return true
        } else {
          throw r.data.message
        }
      })
    },

    register({ commit }: { commit: Function }, data: any) {
      return axios.post(this._vm.$APIEndpoint + '/player/register', {
        name: data.name
      }).then(r => {
        if (r.data.success) {
          commit('setUserInfo', {
            name: data.name,
            accessHash: r.data.accessHash
          })
          commit('loadUserInfo')
          return true
        } else {
          throw r.data.message
        }
      })
    }
  }
}