<template lang="pug">
  .root
    ul.messages
      li.message(v-for="msg of battleMessages")
        img.crown(:src="crownImgSrcs[msg.killer.crown]")
        span.name(:class="[msg.killer.team]") {{ msg.killer.name }}
        =" killed "
        img.crown(:src="crownImgSrcs[msg.victim.crown]")
        span.name(:class="[msg.victim.team]") {{ msg.victim.name }}
</template>

<script lang="ts">
  import CrownImgSrcsMixin from './mixins/CrownImgSrcs.vue'
  import { Component, Mixins } from 'vue-property-decorator'

  interface PlayerInfo {
    team: string,
    name: string,
    crown: string
  }

  @Component
  export default class BattleMessages extends Mixins(CrownImgSrcsMixin) {
    private battleMessages: {
      killer: PlayerInfo,
      victim: PlayerInfo,
      assistant: PlayerInfo
    }[] = []

    created() {
      document.addEventListener('battle-message-received', (e: any) => {
        this.battleMessages.push(e.detail)

        if (this.battleMessages.length > 3)
          this.battleMessages.shift()
      })
    }
  }
</script>

<style scoped lang="stylus">
  ul
    margin-bottom 0
    list-style none
    padding-left 0

  .root
    pointer-events none
    position fixed
    top 45px
    left 5px
    color white
    font-size 14px
    font-weight bolder

    .messages
      .message
        margin-top 5px

      .crown
        margin-right 5px
        vertical-align middle
        margin-top -5px

      .name
        &.blue
          color #61a0ff
        &.red
          color #ff7c7c
</style>