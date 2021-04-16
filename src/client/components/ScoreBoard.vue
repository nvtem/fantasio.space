<template lang="pug">
  .root(v-if="show")

    table.team(v-for="team of ['blue', 'red']")
      tr
        th.name(:class="team" colspan="4") {{ team | capitalize }}
      tr
        td.space(colspan="4")
      tr.player(:class="{ my: player.name === myPlayer.name }" v-for="player of Object.values(players).filter(p => p.team === team).sort((p1, p2) => p2.stats.kills - p1.stats.kills)")
        td
          img.crown(:src="crownImgSrcs[player.crown]")
          span {{ player.name}}
        td.kda {{ player.stats.kills }} / {{ player.stats.deaths }} / {{ player.stats.assists }}


</template>

<script lang="ts">
  import { Vue, Component, Prop, Mixins } from 'vue-property-decorator'
  import CrownImgSrcsMixin from './mixins/CrownImgSrcs.vue'
  import Player from "../Player";

  @Component({
    filters: {
      capitalize(str: string) {
        return str[0].toUpperCase() + str.slice(1)
      },

      max18chars(str: string) {
        if (str.length > 18)
          return str.substr(0, 12) + '…'
        else
          return str
      }
    }
  })
  export default class ScoreBoard extends Mixins(CrownImgSrcsMixin) {
    @Prop() readonly myPlayer: Player
    @Prop() readonly players: Player[]

    private show = false

    created() {
      document.addEventListener('keydown', e => {
        if (e.code === 'Tab') {
          e.preventDefault()
          this.show = true
        }
      })

      document.addEventListener('keyup', e => {
        if (e.code === 'Tab') {
          e.preventDefault()
          this.show = false
        }
      })

    }
  }
</script>

<style scoped lang="stylus">
  .root
    position: fixed;
    top 50%
    left 50%
    /*font-size: 18px !important*/
    /*line-height 1.3*/
    color: #fff;
    transform: translate(-50%, -50%);
    background-color: rgba(0,0,0,0.8);
    padding: 15px 20px;
    border-radius: 5px;
    white-space nowrap

    .crown
      margin-right 5px
      margin-bottom 2px
      vertical-align middle

    .team
      display inline-block
      vertical-align top

      .space
        height 5px

      &:last-child
        margin-left 30px

      .name
        text-align center
        padding-bottom 10px
        min-width: 300px
        border-bottom 1px solid #333

      & .blue
        color #61a0ff

      & .red
        color #ff7c7c

      tr.player

        &.my
          background-color rgba(30, 30, 30, 0.9)

        td
          padding 5px 10px

        .kda
          text-align right
</style>