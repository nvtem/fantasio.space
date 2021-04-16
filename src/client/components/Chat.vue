<template lang="pug">
  .root(:style="{ opacity: show ? '1' : '0' }" ref="root")
    ul.messages
      li.message(v-for="msg of chatMessages.messages")
        img.crown(:src="crownImgSrcs[msg.crown]" v-if="msg.crown && msg.crown !== 'none'")
        span.author(v-show="msg.team !== 'system'" :class="msg.team") {{ msg.author }}:
        span.text(:class="{ muted: msg.team === 'system', 'from-ally': msg.forTeam }") {{ msg.text }}
    div
      .for-team(v-if="forTeam") team
      input.my-message(type="text" v-model="myMsg" ref="myMsgInput")
</template>

<script lang="ts">
  import { ChatMessages } from "../../types";
  import CrownImgSrcsMixin from './mixins/CrownImgSrcs.vue'
  import { Component, Prop, Mixins } from 'vue-property-decorator'
  import Player from "../Player"

  declare const window: any

  @Component
  export default class Chat extends Mixins(CrownImgSrcsMixin) {
    @Prop() chatMessages: ChatMessages
    @Prop() myPlayer: Player

    private inputFocused = false
    private myMsg = ''
    private show = false
    private highlightedAt = Date.now()
    private forTeam = false

    mounted() {
      document.addEventListener('keypress', e => {
        e.stopPropagation()

        switch (e.code) {
          case 'Enter':

            // если в поле
            if (this.inputFocused) {
              // попытаться отправить
              if (this.myMsg) {
                this.myPlayer.sendMessage(this.myMsg, this.forTeam)
              }

              this.myMsg = ''
              ;(<any>this.$refs.myMsgInput).blur()
              this.forTeam = false

              window.chatIsActive = this.inputFocused = false

            } else {
              // открыть поле для ввода сообщения
              ;(<any>this.$refs.myMsgInput).focus()
              window.chatIsActive = this.inputFocused = true
              this.highlight()
              this.forTeam = e.shiftKey
            }
            break
          case 'KeyC':
            //
            break
        }
      })

      setInterval(() => {
        this.$forceUpdate()

        const now = Date.now()
        this.show = (now - this.chatMessages.updatedAt < 5000) || (now - this.highlightedAt < 5000 || this.inputFocused)

        ;(<any> this.$refs.root).scrollTop = (<any>this.$refs.root).scrollHeight
      }, 100)

      ;(<any>this.$refs.myMsgInput).addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault()
      })
    }

    highlight() {
      this.highlightedAt = Date.now()
      this.show = true
    }
  }
</script>

<style scoped lang="stylus">
  .root
    transition opacity 0.3s
    pointer-events none
    bottom 100px
    width 300px
    height 150px
    position fixed
    color white
    padding 7px 10px
    border-radius 5px
    display flex
    flex-direction column
    justify-content end
    overflow hidden
    background-color rgba(0, 0, 0, 0.7)
    left 30px

    @media(max-width 1300px)
      background-color transparent
      left: calc(50% - 400px);
      transform: translateX(50%);
      text-shadow: 0px 0px 3px rgba(0, 0, 0, 1)

    .messages
      margin-top auto
      margin-bottom 5px
      list-style none
      padding-left 5px


    .message
      margin-top 5px
      word-break break-all
      line-height 1.3

      .crown
        vertical-align middle
        margin-right 5px
        margin-bottom 2px

      .author
        margin-right: 5px

        &.blue
          color #61a0ff
        &.red
          color #ff7c7c
    .text
      &.muted
        color #888
        @media(max-width 1300px)
          color #ccc
      &.highlighted
        color #ff0cdd
      &.from-ally
        color greenyellow


    .my-message
      margin-top 5px


    input
      margin-top 10px
      color white
      outline none
      background none
      border none
      cursor default
      display inline-block
      width 250px

    .for-team
      border 1px solid greenyellow
      border-radius 3px
      color greenyellow
      padding 3px 6px
      display inline-block
      margin-right 5px
</style>