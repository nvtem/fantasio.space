<template lang="pug">
  .root(v-if="show")
    div {{ message }}
</template>

<script lang="ts">
  import { Vue, Component, Prop } from 'vue-property-decorator'

  @Component
  export default class ServerMessage extends Vue {
    private message: string
    private show = false

    created() {
      document.addEventListener('server-message-received', (e: any) => {
        this.message = e.detail
        this.show = true
      })

      document.addEventListener('hide-server-message-command-received', (e: any) => {
        this.show = false
      })
    }
  }
</script>

<style scoped lang="stylus">
  .root
    position: fixed;
    top: 50%;
    left: 50%;
    font-size: 18px !important
    line-height 1.3
    color: #fff;
    transform: translate(-50%, -50%);
    background-color: rgba(0,0,0,0.8);
    padding: 15px 20px;
    border-radius: 5px;
</style>