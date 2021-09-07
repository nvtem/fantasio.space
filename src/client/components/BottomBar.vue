<template lang="pug">
  .root(v-if="Object.keys(myPlayer).length > 0" :style="style")
    .money
      img(:src="'/images/icons/money.png'")
      span {{ myPlayer.money }}

    .teleport(@click="myPlayer.teleport")
      img(src="/images/teleport.png")
      .cooldown(v-show="myPlayer.teleportCooldown > 0")
        div {{ Math.floor(myPlayer.teleportCooldown / 1000) }}
      .hint [B] Teleports hero to the base or tower

    .stats.wide
      .cell.mt-0.cell--level
        span Level {{ myPlayer.level }}
        span(v-if="myPlayer.needExpToNextLevel !== 9999") &nbsp;({{ myPlayer.exp }}/{{ myPlayer.needExpToNextLevel}})

      .cell
        img.icon.hp-icon(:src="'/images/icons/hp.png'")
        span {{ Math.floor(myPlayer.hp) }}/{{ myPlayer.characteristics.total.maxHP }} ({{ floor(myPlayer.characteristics.total.hpRegen) }}
        span.bonus-plus(v-if="hpRegenBonus > 0") &nbsp;+ {{ hpRegenBonus }}
        |)

      .cell
        img.icon.mana-icon(:src="'/images/icons/mana.png'")
        span {{ Math.floor(myPlayer.mana) }}/{{ myPlayer.characteristics.total.maxMana }} ({{ floor(myPlayer.characteristics.total.manaRegen) }}
        span.bonus-plus(v-if="manaRegenBonus > 0") &nbsp;+ {{ manaRegenBonus }}
        |)

    .stats
      .cell.mt-0
        img.damage(:src="'/images/icons/damage.png'")
        span {{ myPlayer.characteristics.basic.attackDamage }}
        span.bonus-plus(v-if="damageBonus > 0") &nbsp;+ {{ damageBonus }}
        span.bonus-minus(v-if="damageBonus < 0") &nbsp;- {{ abs(damageBonus) }}

      .cell
        img.defense(:src="'/images/icons/defense.png'")
        span {{ myPlayer.characteristics.basic.defense }}
        span.bonus-plus(v-if="defenseBonus > 0") &nbsp;+ {{ defenseBonus }}
        span.bonus-minus(v-if="defenseBonus < 0") &nbsp;- {{ abs(defenseBonus) }}

      .cell
        img.defense(:src="'/images/icons/movement-speed.png'")
        span {{ myPlayer.characteristics.basic.movementSpeed }}
        span.bonus-plus(v-if="movementSpeedBonus > 0") &nbsp;+ {{ movementSpeedBonus }}
        span.bonus-minus(v-if="movementSpeedBonus < 0") &nbsp;- {{ abs(movementSpeedBonus) }}

    .skills
      .increase-level-bar
        template(v-for="(skill, index) of myPlayer.skills")
          .increase-level(:style="{ visibility: myPlayer.my && showIncreaseSkillLevelButton(index) ? 'visible' : 'hidden' }" @click="increaseSkillLevel(index)") +
      template(v-for="(skill, index) of myPlayer.skills")
        .skill
          img(:src="'/images/skill-icons/' + skill.name + '.png'")
          .hint
            p.full-name {{ skill.fullName }}
            p.description {{ skill.description }}
            .stats(v-html="powerToString(skill.power, index)")
            .cooldown
              span Cooldown:&nbsp;
              span(v-html="getSkillParam(skill, index, 'cooldown')")
            .mana-cost
              span Mana cost:&nbsp;
              span(v-html="getSkillParam(skill, index, 'manaCost')")
          .key {{ index + 1 }}
          .cooldown(v-show="skill.currentCooldown > 0")
            div {{ Math.floor(skill.currentCooldown / 1000) }}

          .not-enough-mana(v-show="skill.manaCost[myPlayer.skillLevels[index] - 1] > myPlayer.mana")

          .current-level
            template(v-if="index <= 2")
              span(v-for="i in myPlayer.skillLevels[index]") &#9632;
              span(v-for="i in (3 - myPlayer.skillLevels[index])") &#9633;
            template(v-else)
              span(v-if="myPlayer.skillLevels[index] === 0") &#9633;
              span(v-else) &#9632;

    .effects
      img.effect(
        v-for="name of Object.keys(myPlayer.effects)"
        v-if="name !== 'double-damage'"
        :src="'/images/' + (['defense-potion', 'attack-damage-potion'].includes(name) ? 'item' : 'skill') + '-icons/' + name + '.png'"
        )

    .items
      .item(v-for="(item, index) of myPlayer.items" @click="e => { myPlayer.useItem(index) }" @contextmenu="e => { myPlayer.sellItem(index) }")
        img(:src="'/images/item-icons/' + item.name + '.png'")
        .key {{ ['Z', 'X', 'C', 'V'][index] }}
        .hint
          p.full-name {{ item.fullName }}
          p.description {{ item.description }}
          p.cost Cost: {{ item.cost }}

      .item(v-for="(item, index) of new Array(4 - myPlayer.items.length)")
</template>

<script lang="ts">
  import { Component, Prop, Vue } from 'vue-property-decorator'
  import _ from 'lodash'
  import Player from "../Player"

  @Component
  export default class BottomBar extends Vue {
    @Prop() readonly myPlayer: Player

    private abs = Math.abs
    private floor = Math.floor

    get style() {
      if (this.myPlayer.my)
        return { backgroundColor: 'rgba(0, 0, 0, 0.9)' }
      else
        return { backgroundColor: 'rgba(30, 30, 30, 0.9)' }
    }

    get hpRegenBonus() {
      return this.getBonus('hpRegen')
    }

    get manaRegenBonus() {
      return this.getBonus('manaRegen')
    }

    get damageBonus() {
      return this.getBonus('attackDamage')
    }

    get defenseBonus() {
      return this.getBonus('defense')
    }

    get movementSpeedBonus() {
      return this.getBonus('movementSpeed')
    }

    getBonus(char: string) {
      return this.myPlayer.characteristics.itemBonuses[char] + this.myPlayer.characteristics.buffBonuses[char]
    }

    formatPropValue(prop: string, value: number) {
      switch (prop) {
        case 'attackCooldown':
          return `${value / 1000}`

        case 'time':
          return `${value / 1000}`

        case 'damage':
        case 'radius':
        case 'distance':
          return `${value}`

        case 'defense':
        case 'attackDamage':
        case 'hpRegen':
        case 'manaRegen':
        case 'movementSpeed':
          return `+${value}`
        default:
          return 'XXX'
      }
    }

    powerToString(power: any, skillIndex: number) {
      const capitalize = (str: string) => str[0].toUpperCase() + str.slice(1)
      const kebabToNormal = (s: string) => capitalize(_.startCase(s).toLowerCase())

      let result = ''

      if (power.length === 3)
        for (const prop in power[0]) {
          result += `${kebabToNormal(prop)}: `

          for (const i of [0, 1, 2]) {
            let s = `${this.formatPropValue(prop, power[i][prop])}`
            if (this.myPlayer.skillLevels[skillIndex] === i + 1)
              s = `<u>${s}</u>`

            result += s

            if (i <= 1)
              result += '/'
          }

          result += '<br>'
        }
      else
        for (const prop in power[0])
          result += `${kebabToNormal(prop)}: ${this.formatPropValue(prop, power[0][prop])}<br>`

      return result
    }

    getSkillParam(skill: any, skillIndex: number, param: 'cooldown' | 'manaCost') {
      return skill[param].map((c: any, index: number) => {
        if (param === 'cooldown')
          c = c / 1000

        if (index + 1 === this.myPlayer.skillLevels[skillIndex])
          c = `<u>${c}</u>`

        return c
      }).join('/')
    }

    increaseSkillLevel(index: number) {
      this.myPlayer.increaseSkillLevel(index)
    }

    showIncreaseSkillLevelButton(skillIndex: number) {
      return (this.myPlayer.freeSkillPoints && skillIndex <= 2 && this.myPlayer.skillLevels[skillIndex] <= 2)
             ||
             (this.myPlayer.level >= 6 && this.myPlayer.freeSkillPoints && skillIndex === 3 && this.myPlayer.skillLevels[skillIndex] === 0)
    }
  }
</script>

<style lang="stylus" scoped>
  .root
    box-sizing content-box
    z-index 100
    color white
    position fixed
    bottom 5px
    display flex
    height 50px
    left 50%
    transform translateX(-50%)
    border-radius 5px
    padding 10px 15px 10px 15px

  img
    vertical-align baseline

  div
    box-sizing content-box

  .stats
    min-width 100px

    .cell
      margin-top 4px

      .bonus-plus
        color #38ff00
      .bonus-minus
        color #ff2f2f

    .cell--money
      font-size: 16px;
      margin-top: 5px;
      color: gold;

    .cell--level
      color chartreuse

    .level
      color gold

    &.wide
      min-width 180px

    img
      vertical-align middle
      margin-right 6px

  .money
    width 60px
    img
      margin-right 6px
      margin-bottom -3px

  .skills
    display flex
    margin-right 20px

    .increase-level-bar
      position fixed
      top -22px
      width: 400px;
      .increase-level
        margin-right 5px
        width: 40px;
        height: 25px;
        background-color: #111;
        border: 1px solid #888;
        color: #eee;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;

        &:hover
          background-color #222

    .skill
      background-color rgba(0, 0, 0, 0.8)
      border 1px solid #555
      width 40px
      height 40px
      margin-right 5px
      position relative
      cursor pointer

      &:hover
        border-color white

      .current-level
        font-size: 14px;
        color: #ccc;

        span
          margin-right 2px

      .not-enough-mana
        background-color rgba(0, 0, 255, 0.4)
        position absolute
        top 0
        left 0
        width 40px
        height 40px
        display flex
        align-items center
        justify-items center

      & > .cooldown
        background-color rgba(0, 0, 0, 0.7)
        color white
        position absolute
        top 0
        left 0
        width 40px
        height 40px
        display flex
        align-items center
        justify-items center

        div
          width 48px
          text-align center
          color #ccc

      &:hover .hint
        display inline-block

      &:hover .hint:hover
        display none

  .items
    display flex

    .item
      border 1px solid #555
      width 40px
      height 40px
      margin-right 5px
      position: relative
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
    display none
    position absolute
    bottom 45px
    width 300px
    transform translateX(-80px)
    background-color rgba(0, 0, 0, 0.8)
    border 1px solid #555
    padding 15px

    .level
      margin-top 20px

      .stats
        padding-top: 7px
        padding-bottom: 7px

    .full-name
      color #ffa0a0
      padding-bottom 10px
      font-size 18px

    .description
      padding-bottom 10px

    .mana-cost
      color #7599ff

    .cooldown
      color #ffa667
      margin-top 12px

  .show-extra-params
    .icon
      position absolute
      top 30px

    .window
      display none
      position absolute
      bottom 62px
      transform translateX(-86px)
      background-color rgba(0, 0, 0, 0.8)
      border 1px solid #555
      padding 10px 15px
    &:hover .window
      display block
    div
      padding 2px 0

  .key
    position absolute
    bottom 0
    left 0
    background-color black
    color white
    padding 2px
    font-size 10px

  .effects
    position: absolute;
    bottom: 70px;
    left: 70px;
    transform: scale(0.8);

    .effect
      border-radius 50%
      margin-right 7px


  .money
    bottom: 78px;
    color: #ffd700;
    position: fixed;
    left: calc(50% - 135px);
    border-radius: 5px;
    font-weight: bolder;
    font-size: 16px;

  .teleport
    position fixed
    bottom 74px
    left calc(50% + 280px)
    cursor pointer
    border 1px solid transparent
    border-radius 50%


    &:hover
      border-color white

    img
      border-radius 50%
      width 35px
      height 35px

    .cooldown
      border-radius 50%
      background-color rgba(0, 0, 0, 0.7)
      color white
      position absolute
      top 0
      left 0
      width 35px
      height 35px
      display flex
      align-items center
      justify-items center

      div
        width 35px
        text-align center

    .hint
      width 200px
      transform translateX(-200px)

    &:hover .hint
      display inline-block

    &:hover .hint:hover
      display none
</style>