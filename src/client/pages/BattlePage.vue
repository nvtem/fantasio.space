<template lang="pug">
  .battle-root
    .game

    div
      .loading(v-show="showLoading") Loading
      Help(:visible="showHelpWindow" :title="helpWindowTitle" :markHelpAsRead="markHelpAsRead")

      template(v-if="showUI")
        BottomBar(:myPlayer="myPlayer")
        Shop(:myPlayer="{ my: myPlayer.my, items: myPlayer.items, buyItem: myPlayer.buyItem, canBuyItems: myPlayer.canBuyItems }")
        ChangeTeamAndClass(:myPlayer="{ gameClass: myPlayer.gameClass, team: myPlayer.team, changeTeamAndClass: myPlayer.changeTeamAndClass }")
        ScoreBoard(:myPlayer="{ name: myPlayer.name }" :players="players")
        Chat(:myPlayer="{ sendMessage: myPlayer.sendMessage }" :chatMessages="chatMessages")
        ServerMessage
        BattleStats(:myPlayer="{ name: myPlayer.name }")
        BattleMessages

        .top-bar(v-if="myPlayer.stats")
          .team-kills
            span.blue(:class="{ underlined: myPlayer.team === 'blue'}") {{ teamKills.blue }}
            span.vs vs
            span.red(:class="{ underlined: myPlayer.team === 'red'}") {{ teamKills.red }}

          .my-player-kda
            img(src="/images/icons/kills.png")
            span {{ myPlayer.stats.kills }} / {{ myPlayer.stats.deaths }} / {{ myPlayer.stats.assists }}

        .help-btn(@click="showHelpWindow = true")
          span.icon
            b-icon-question-circle
          span.text Help
        .fullscreen-btn(@click="toggleFullscreen")
          span.icon
            b-icon-arrows-fullscreen
          span.text Fullscreen
        .exit-btn(@click="exitBattle")
          span.icon
            b-icon-box-arrow-right
          span.text Exit

        div(id="techStats" v-if="showTechStats") ?

        a.discord-link(href="https://discord.gg/2byDHHSBjS" target="_blank")
          img(src="/images/discord.png")

</template>

<script lang="ts">
  import { Component, Prop, Vue } from 'vue-property-decorator'
  import BottomBar from '../components/BottomBar.vue'
  import Shop from '../components/Shop.vue'
  import ChangeTeamAndClass from '../components/ChangeTeamAndClass.vue'
  import ScoreBoard from "../components/ScoreBoard.vue"
  import Chat from "../components/Chat.vue"
  import ServerMessage from "../components/ServerMessage.vue"
  import BattleStats from "../components/BattleStats.vue"
  import BattleMessages from "../components/BattleMessages.vue"
  import createPhaserGame from '../createPhaserGame'
  import Phaser from 'phaser'
  import Player from "../Player"
  import { ChatMessages } from "../../types"
  import Help from '../components/Help.vue'
  import BattleScene from "../BattleScene"

  declare const window: any

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  Component.registerHooks([
    'beforeRouteLeave',
  ])

  @Component({
    components: { BottomBar, Shop, ChangeTeamAndClass: ChangeTeamAndClass, ScoreBoard, Chat, ServerMessage, BattleStats, BattleMessages, Help }
  })
  export default class BattlePage extends Vue {
    @Prop() readonly getMyPlayer: Function
    @Prop() readonly getChatMessages: Function
    @Prop() readonly getPlayers: Function
    @Prop() readonly getTeamKills: Function

    private myPlayer: Player = {} as Player
    private chatMessages: ChatMessages
    private players: {
      [key: string]: Player
    }
    private teamKills = {
      blue: 0,
      red: 0
    }

    private phaserGame: Phaser.Game
    private showUI = false
    private showLoading = true
    private showTechStats = !!window.options.showTechStats
    private showHelpWindow = false
    private helpWindowTitle = ''

    created() {
      document.addEventListener('hide-loading-and-show-ui', () => {
        document.body.style.background = '#222'
        this.showLoading = false
        this.showUI = true

        if (localStorage.helpWasRead) {
          this.helpWindowTitle = 'Help'
        } else {
          this.helpWindowTitle = 'Welcome to your first battle!'
          this.showHelpWindow = true
        }
      })
    }

    markHelpAsRead() {
      localStorage.helpWasRead = true
      this.showHelpWindow = false
    }

    async mounted() {
      this.phaserGame = await createPhaserGame()

      while (true) {
        await sleep(100)
        if (this.phaserGame.scene.scenes[0])
          break
      }

      const { getMyPlayerForUI, getChatMessagesForUI, getPlayersForUI, getTeamKillsForUI } = this.phaserGame.scene.scenes[0]

      setInterval(() => {
        const canBuyItems = this.myPlayer.canBuyItems

        this.myPlayer = getMyPlayerForUI()
        this.chatMessages = getChatMessagesForUI()
        this.players = getPlayersForUI()
        this.teamKills = getTeamKillsForUI()

        if (!this.myPlayer.canBuyItems && canBuyItems) {
          this.$emit('hide-shop')
        }
      }, 100)
    }

    fullscreenIsOn() {
      return window.innerHeight === screen.height
    }

    toggleFullscreen() {
      if (this.fullscreenIsOn())
        document.exitFullscreen()
      else
        document.body.requestFullscreen()
    }

    exitBattle() {
      document.querySelector('canvas').remove()
      this.showUI = false
      this.showLoading = true
      location.href = '/'
    }
  }
</script>

<style lang="stylus" scoped>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu+Mono&display=swap')


  *
    box-sizing content-box
    line-height 1

  p
    margin-bottom 0

  //#fantasio-space_160x600
  //  width 170px
  //  display flex
  //  align-items center
  //  justify-content center


  .w-100px
    width 100px

  .game
    width 100%
    height 100vh

  .battle-root
    user-select none
    font-family: 'Ubuntu Mono', monospace
    font-size 14px
    display flex

    .discord-link
      position fixed
      bottom 185px
      right 42px

      @media(max-width 1000px)
        bottom 285px
        right 9px

      &:hover
        -webkit-filter: brightness(80%);

    .fullscreen-btn, .exit-btn, .help-btn
      position fixed
      right 5px
      color white
      text-align center
      background-color #222
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

        .text
          display none

        .icon
          display inline


      &:hover
        background-color #111


    .help-btn
      bottom 85px

      @media(max-width 1000px)
        bottom 185px

    .fullscreen-btn
      bottom 45px

      @media(max-width 1000px)
        bottom 145px

    .exit-btn
      bottom 5px
      @media(max-width 1000px)
        bottom 105px

    #techStats
      position fixed
      left 10px
      top 10px
      color white

    .loading
      background: rgba(0,0,0,0.8);
      padding: 30px;
      border-radius: 5px;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 30px;
      color: #fff;

    .top-bar
      position fixed
      left 0
      padding 10px 15px 10px 15px
      background-color rgba(0, 0, 0, 0.7)
      border-radius 0 0 5px 0
      display flex
      align-items center

      .team-kills
        font-size 24px
        border-radius 5px
        display inline-block

        .blue
          color #61a0ff
          margin-right 10px

        .vs
          font-size 14px
          color gray

        .red
          margin-left 10px
          color #ff7c7c

        .underlined
          text-decoration underline

      .my-player-kda
        margin-left 30px
        display inline-block
        color white
        font-size 16px

        img
          margin-right 10px

        span
          margin-right 10px
</style>