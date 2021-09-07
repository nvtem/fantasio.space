<template lang="pug">
  div.shop
    div.open-shop-btn(v-show="myPlayer.canBuyItems && myPlayer.my" @click="show = !show")
      img(:src="'/images/icons/shop.png'")

    div.window(v-show="show && myPlayer.canBuyItems")
      h1 Shop
      div.items
        template(v-for="(item, index) of Object.values(items)")
          div.item
            img(:src="'/images/item-icons/' + item.name + '.png'" @click="buyItem(item.name)")
            div.hint
              p.full-name {{ item.fullName }}
              p.description {{ item.description }}
              p.cost Cost: {{ item.cost }}
          br(v-if="(index + 1) % 6 === 0")

      p.sell-items-hint Sell your items by clicking right mouse
        br
        | button on them in your inventory

</template>

<script lang="ts">
  import { Vue, Component, Prop } from 'vue-property-decorator'
  import items from '../../data/items.json'
  import type { Item } from '../../types'
  import Player from "../Player";

  @Component
  export default class Shop extends Vue {
    @Prop() readonly myPlayer: Player

    private show: boolean = false
    private items: { [key: string]: Item } = items

    created() {
      this.$parent.$on('hide-shop', () => { this.show = false })
    }

    buyItem(name: string) {
      this.myPlayer.buyItem(name)
    }
  }
</script>

<style scoped lang="stylus">
  *
    box-sizing content-box

  .open-shop-btn
    position fixed
    left 50%
    transform translateX(-50%)
    bottom 110px

  .window
    position fixed
    bottom 200px
    left 50%
    transform translateX(-50%)

    @media(max-height 500px)
      bottom 170px

    background-color rgba(0,0,0,0.9)
    color white

    border-radius 5px
    padding 20px

    .sell-items-hint
      margin-top 20px
      font-size 12px
      line-height 1.2

    h1
      text-align center
      font-size 18px
      padding-bottom 3px

    .items
      .item
        position relative
        display inline-block
        background-color rgba(120, 120, 0, 0.7)
        border 1px solid #555
        width 40px
        height 40px
        margin-right 5px
        margin-bottom 5px
        cursor pointer

        &:hover
          border-color white

        .full-name
          color #ffa0a0
          padding-bottom 10px

        .description
          padding-bottom 10px

        .cost
          color #7599ff

        &:hover .hint
          display inline-block

        &:hover .hint:hover
          display none

  .hint
    z-index 100
    display none
    width 200px
    position: absolute;
    top: 43px;
    transform: translateX(-41px);
    background-color: black;
    border: 1px solid #555;
    padding: 15px;

    .description
      line-height 1.3

</style>