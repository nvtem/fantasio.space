<template lang="pug">
  .root
    .open-window-button(@click="show = !show")
      span.text
        | Change
        br
        | team/hero
      span.icon
        b-icon-person-circle

    .window(v-if="show")
      .close-btn(@click="show = false") x

      h1.title-team Team

      input(type="radio" v-model="teamModel" value="blue" id="blue")
      label(for="blue" :class="{ picked: teamModel === 'blue' }") Blue

      input(type="radio" v-model="teamModel" value="red" id="red")
      label(for="red" :class="{ picked: teamModel === 'red' }") Red

      h1.title-class Class

      input(type="radio" v-model="gameClassModel" value="warrior" id="warrior")
      label(for="warrior" :class="{ picked: gameClassModel === 'warrior' }") Warrior

      input(type="radio" v-model="gameClassModel" value="assassin" id="assassin")
      label(for="assassin" :class="{ picked: gameClassModel === 'assassin' }") Assassin

      input(type="radio" v-model="gameClassModel" value="mage" id="mage")
      label(for="mage" :class="{ picked: gameClassModel === 'mage' }") Mage

      input(type="radio" v-model="gameClassModel" value="undead" id="undead")
      label(for="undead" :class="{ picked: gameClassModel === 'undead' }") Undead

      br
      br

      button(@click="() => { myPlayer.changeTeamAndClass(teamModel, gameClassModel); show = false }") Change

</template>

<script lang="ts">
  import { Vue, Component, Prop } from 'vue-property-decorator'
  import Player from "../Player"

  @Component
  export default class ChangeTeamAndClass extends Vue {
    @Prop() readonly myPlayer: Player

    private teamModel: string = 'blue'
    private gameClassModel: string = 'warrior'
    private show: boolean = false

    created() {
      setInterval(() => {
        if (!this.show) {
          this.teamModel = this.myPlayer.team
          this.gameClassModel = this.myPlayer.gameClass
        }
      }, 500)
    }
  }
</script>

<style scoped lang="stylus">
  .window
    background-color #000
    color white
    position fixed
    left 50%
    top calc(50% - 40px)
    transform translate(-50%, -50%)
    border-radius 5px
    padding 30px
    pointer-events all

    .close-btn
      position absolute
      top 0
      right 0
      color white
      padding 10px 15px
      font-size 24px
      cursor pointer

    .title-team
      padding-bottom 10px
      font-size 20px

    .title-class
      padding-bottom 10px
      padding-top 20px
      font-size 20px

    input
      display none

    label
      border 1px solid #ccc
      display inline-block
      color #aaa
      padding 15px 20px

    .picked
      background-color #222
      border-color white
      color white

    button
      background-color brown
      border 1px solid #ccc
      border-radius 5px
      color white
      padding 10px 20px
      margin-top 15px
      cursor pointer

  .root
    .open-window-button
      box-sizing content-box
      position fixed
      bottom 125px
      right 5px
      color white
      text-align center
      background: rgb(13,0,255);
      background: linear-gradient(90deg, rgba(13,0,255,1) 0%, rgba(255,0,0,1) 100%);
      border-radius 5px
      padding 10px
      border 1px solid #bbb
      cursor: pointer
      pointer-events all
      width 90px

      .text
        display inline

      .icon
        display none

      @media(max-width 1000px)
        width 20px
        bottom 225px

        .text
          display none

        .icon
          display inline

      &:hover
        background: rgb(255,0,0);
        background: linear-gradient(90deg, rgba(255,0,0,1) 0%, rgba(13,0,255,1) 100%);


      &:hover
        background-color #000
</style>