<template lang="pug">
  .root
    b-modal(scrollable id="modal-battle-stats" ok-only ok-variant="success" static)
      template(#modal-title) Game over! {{ teamWinner | capitalize }} team won.

      b-table(:tbody-tr-class="rowClass" :fields="totalFields" :items="items.total" thead-class="d-none" :bordered="false" caption-top borderless class="table-sm")
        template(#cell(name)="data")
          img(:src="crownImgSrcs[data.item.crown]" class="crown")
          span.name(:class="{ blue: data.item.team === 'blue', red: data.item.team === 'red' }") {{ data.value }}
        template(#cell(points)="data")
          img(:src="diamondImgSrc" class="diamond")
          span {{ data.value }}

      b-table(
          v-for="(value, key) in fieldNames"

          :items="items[key]"
          :caption-html="`<h5>${value}</h5>`"
          :key="key"

          :tbody-tr-class="rowClass"
          :fields="generalFields"
          thead-class="d-none"
          :bordered="false"
          caption-top borderless
          class="table-sm"
        )
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

    private fieldNames = {
      killsAssistsDeaths: 'Kills',
      destroyedTowers: 'Destroyed towers',
      totalDamage: 'Total damage',
      buffs: 'Buffs'
    }

    private items = {}

    rowClass(item: any, type: string) {
      if (!item || type !== 'row')
        return

      if (item.name === this.myPlayer.name)
        return 'font-weight-bolder'
    }

    created() {
      document.addEventListener('received-battle-stats', (e: any) => {
        _.assign(this.items, e.detail.battleStats)
        this.$forceUpdate()
        this.teamWinner = e.detail.teamWinner
        this.$root.$emit('bv::show::modal', 'modal-battle-stats', '#btnShow')
        window.showPreroll()
      })
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