<template lang="pug">
  .root
    h1.title.title.text-center.text-white.mt-4 Fantasio Space
    p.description.text-center.text-white.pb-4 Browser Multiplayer Online Battle Arena
    #fantasio-space_728x90.mb-4.flex-center
      script(type='application/javascript').
        aiptag.cmd.display.push(function() { aipDisplayTag.display('fantasio-space_728x90'); });
    .central-box
      b-row.mb-4
        b-col(sm='6')
          div
            LoginBox
            .d-block.text-center.mt-3
              a.social-link(href='https://discord.gg/2byDHHSBjS' target='_blank')
                img(:src="'/images/discord-big.png'")
              a.social-link.ml-3(href='https://github.com/nvtem/fantasio.space' target='_blank')
                img(:src="'/images/github.png'")
        b-col(sm='6')
          TopPlayers
</template>

<script lang="ts">
  import LoginBox from '../components/LoginBox.vue'
  import TopPlayers from '../components/TopPlayers.vue'
  import { Vue, Component } from 'vue-property-decorator'

  Component.registerHooks([
    'beforeRouteLeave',
  ])

  @Component({
    components: { LoginBox, TopPlayers }
  })
  export default class LoginPage extends Vue {
    private isProd = process.env.NODE_ENV === 'production'

    created() {
      document.body.style.background = 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(../images/login-bg.jpg)'
      document.body.style.backgroundSize = 'cover'
      document.body.style.backgroundAttachment = 'fixed'
    }
  }
</script>

<style scoped lang="stylus">
  /*.root*/
  /*  display flex*/
  /*  justify-content center*/

  @import url('https://fonts.googleapis.com/css2?family=Kalam&display=swap')

  .title
    font-family Kalam
    font-size 90px

  .social-link
    &:hover
      -webkit-filter brightness(90%)

  .title {
    letter-spacing: -4px;
    text-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  }

  .description
    margin-top -20px
    font-size 18px

  .central-box
    margin 0 auto
    max-width 800px

  .flex-center
    display flex
    align-items center
    justify-content center

  .iogames-link
    color white
    text-decoration underline

    &:hover
      text-decoration none
</style>