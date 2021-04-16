<template lang="pug">
  .root
    b-modal(scrollable id="modal-battle-stats" ok-only ok-variant="success" static @ok="closed" @close="closed" @hide="closed")
      template(#modal-title) Game over! {{ teamWinner | capitalize }} team won.

      b-table(:tbody-tr-class="rowClass" :fields="totalFields" :items="total" thead-class="d-none" :bordered="false" caption-top borderless class="table-sm")
        template(#cell(name)="data")
          img(:src="crownImgSrcs[data.item.crown]" class="crown")
          span.name(:class="{ blue: data.item.team === 'blue', red: data.item.team === 'red' }") {{ data.value }}
        template(#cell(points)="data")
          img(:src="diamondImgSrc" class="diamond")
          span {{ data.value }}

      b-table(:tbody-tr-class="rowClass" :fields="generalFields" :items="killsAssistsDeaths"  thead-class="d-none" :bordered="false" caption-html="<h5>Kills</h5>" caption-top borderless class="table-sm")
        template(#cell(name)="data")
          img(:src="crownImgSrcs[data.item.crown]" class="crown")
          span.name(:class="{ blue: data.item.team === 'blue', red: data.item.team === 'red' }") {{ data.value }}

      b-table(:tbody-tr-class="rowClass" :fields="generalFields" :items="destroyedTowers"  thead-class="d-none" :bordered="false" caption-html="<h5>Destroyed towers</h5>" caption-top borderless class="table-sm")
        template(#cell(name)="data")
          img(:src="crownImgSrcs[data.item.crown]" class="crown")
          span.name(:class="{ blue: data.item.team === 'blue', red: data.item.team === 'red' }") {{ data.value }}

      b-table(:tbody-tr-class="rowClass" :fields="generalFields" :items="totalDamage"  thead-class="d-none" :bordered="false" caption-html="<h5>Total damage</h5>" caption-top borderless class="table-sm")
        template(#cell(name)="data")
          img(:src="crownImgSrcs[data.item.crown]" class="crown")
          span.name(:class="{ blue: data.item.team === 'blue', red: data.item.team === 'red' }") {{ data.value }}

      b-table(:tbody-tr-class="rowClass" :fields="generalFields" :items="buffs"  thead-class="d-none" :bordered="false" caption-html="<h5>Buffs</h5>" caption-top borderless class="table-sm")
        template(#cell(name)="data")
          img(:src="crownImgSrcs[data.item.crown]" class="crown")
          span.name(:class="{ blue: data.item.team === 'blue', red: data.item.team === 'red' }") {{ data.value }}

    #ad-preroll
</template>

<script lang="ts">
  import CrownImgSrcsMixin from './mixins/CrownImgSrcs.vue'
  import { Vue, Component, Prop, Mixins } from 'vue-property-decorator'
  import _ from 'lodash'
  import type Player from '../Player'

  declare const window: any

  @Component({
    filters: {
      capitalize: (str: string) => str[0].toUpperCase() + str.slice(1)
    }
  })
  export default class BattleStats extends Mixins(CrownImgSrcsMixin) {
    @Prop() readonly myPlayer: Player

    private teamWinner = ' '
    private diamondImgSrc = '/images/icons/diamond.png'

    private generalFields = [{key: 'name'}, {key: 'number', tdClass: 'w-100px text-right'}]

    private totalFields = [{key: 'name'}, {key: 'number', tdClass: 'w-100px text-right'}, {
      key: 'points',
      tdClass: 'w-100px text-right'
    }]

    private killsAssistsDeaths: [] = []
    private destroyedTowers: [] = []
    private totalDamage: [] = []
    private buffs: [] = []
    private total: [] = []
    private endBattle: boolean

    rowClass(item: any, type: string) {
      if (!item || type !== 'row')
        return

      if (item.name === this.myPlayer.name)
        return 'font-weight-bolder'
    }

    created() {
      document.addEventListener('received-battle-stats', (e: any) => {
        _.assign(this, e.detail.battleStats)
        this.endBattle = e.detail.endBattle
        this.$root.$emit('bv::show::modal', 'modal-battle-stats', '#btnShow')
        window.showPreroll()
      })
    }

    closed() {
      if (this.endBattle)
        location.href = '/'
    }
  }
</script>

<style lang="stylus" scoped>
  .diamond
    vertical-align middle
    margin-right 5px

  .crown
    vertical-align: middle;
    margin-bottom: 5px;
    margin-right: 5px;

  .name
    &.blue
      color #146aea
    &.red
      color #fd3b3b
</style>