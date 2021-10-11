<template lang="pug">
  .app-root
    router-view
</template>

<style lang="stylus">
  body
    overflow-x hidden

  *
    outline none

  *:focus
    outline:none !important

  p
    margin-bottom 0

  .w-200px
    max-width 200px
    text-overflow ellipsis
    white-space nowrap
    overflow: hidden

  .w-100px
    width 100px

  .w-40px
    width 40px
</style>
