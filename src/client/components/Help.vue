<template lang="pug">
  b-modal(id="help" scrollable centered :visible="visible" :title="title"  ok-only ok-variant="success" @ok="markHelpAsRead" @close="markHelpAsRead" @hide="markHelpAsRead")
    ul
      li Kill enemy heroes, enemy creeps and neutral creeps
      li Upgrade your character and buy items
      li Destroy enemy towers
      li Destroy enemy throne and win the battle!
      li (Stay on place for 2 seconds for fast HP regeneration)

    hr

    p
      kbd Right click
      span &nbsp; Move or attack

      br

      kbd Shift
      span &nbsp;
      ="+"
      span &nbsp;
      kbd Right click
      span &nbsp; Move and attack

      br

      kbd 1
      span &nbsp;
      kbd 2
      span &nbsp;
      kbd 3
      span &nbsp;
      kbd 4
      span &nbsp; Use skills

      br

      kbd Z
      span &nbsp;
      kbd X
      span &nbsp;
      kbd C
      span &nbsp;
      kbd V
      span &nbsp; Use items (or click on them)

      br

      kbd W
      span &nbsp;
      kbd A
      span &nbsp;
      kbd S
      span &nbsp;
      kbd D
      span &nbsp; Move camera

      br

      kbd Scroll
      span &nbsp; Camera zoom

      br

      kbd Space
      span &nbsp; Focus on your hero

      br

      kbd Tab
      span &nbsp; Scoreboard

      br

      kbd Enter
      span &nbsp; Chat

      br

      kbd Shift + Enter
      span &nbsp; Team chat
</template>

<script>
  export default {
    props: ['visible', 'title', 'markHelpAsRead'],
  }
</script>

<style lang="stylus" scoped>
  kbd
    color: #000;
    background-color transparent
    border: 1px solid black;
    line-height: 2.5

  li
    line-height 1.5
</style>