<template lang="pug">
  .d-inline-block.bg-white.p-4.rounded.root.w-100
    h5.text-center.mb-0 Top players
    .d-block.text-muted.text-center.mb-3 this month
    b-table(:fields="fields" :items="items" :small="true" :borderless="true" thead-class="d-none")
      template(#cell(place)="data") {{ data.index + 1 }}.
      template(#cell(name)="data")
        img(class="crown" :src="crownImgSrcs[data.item.crown]")
        | {{ data.value }}
      template(#cell(points)="data")
        img(class="diamond" :src="'/images/icons/diamond-big.png'")
        | {{ data.value.toLocaleString('en').replace(',', ' ') }}

    .text-center
      b-link.text-secondary(@click="itemCount = 30" v-if="itemCount <= 10") Show more
      b-link.text-secondary(@click="itemCount = 10" v-if="itemCount === 30") Show less
</template>

<script lang="ts">
  import axios from 'axios'
  import CrownImgSrcsMixin from '../components/mixins/CrownImgSrcs.vue'
  import { Component, Prop, Vue, Mixins } from 'vue-property-decorator'

  @Component({})
  export default class TopPlayers extends Mixins(CrownImgSrcsMixin) {
    declare $APIEndpoint: string

    private fields = [
      { key: 'place', tdClass: 'w-40px' },
      { key: 'name', tdClass: 'w-200px' },
      { key: 'points', tdClass: 'text-right' }
    ]
    private players: [] = []
    private itemCount = 10

    get items() {
      return this.players.slice(0, this.itemCount)
    }

    created() {
      axios.get(this.$APIEndpoint + '/player/getTopPlayers').then(r => {
        this.players = r.data.players

        this.$store.commit('setPlayerCrowns', this.players)
      })
    }
  }
</script>

<style scoped lang="stylus">
  .root
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);

  .crown
    margin-right 10px
    margin-bottom: 7px
    vertical-align middle

  .diamond
    margin-right 10px
    vertical-align middle !important
    margin-top -3px
</style>