<template lang="pug">
  .bg-white.p-4.rounded.root
    template(v-if="nameFromStore")
      b-link.position-absolute.text-secondary.exit(@click="exit")
        b-icon-box-arrow-right

      .text-center.mt-2.account-info
        img.crown(:src="'/images/icons/crowns/' + crown + '.png'")
        span {{ nameFromStore }}
        b
          img.diamond.ml-5(:src="diamondImgSrc")
          span {{ points }}

        br
        .text-center
          button.myButton.w-200.mt-4(@click="play" ref="playBtn") Play

    template(v-else)
      b-form(@submit.prevent="register")
        b-form-input.border-secondary(v-model="name" required placeholder="Name" size="lg" autocomplete="off")
        .text-center
          button.myButton.mt-3.w-200(type="submit") Play
</template>

<script>
  import { mapState } from 'vuex'
  import {Client} from "colyseus.js";

  export default {
    name: 'LoginBox',
    components: {},
    props: [],


    computed: {
      ...mapState('auth', { nameFromStore: state => state.name, points: state => state.points }),
      ...mapState({ playerCrowns: state => state.playerCrowns }),

      crown() {
        const result = this.playerCrowns.find(item => item.name === this.nameFromStore)
        return result ? result.crown : 'none'
      }
    },

    data() {
      function getName() {
        if (localStorage.name) {
          if (localStorage.name === 'guest')
            return ''
          else
            return localStorage.name
        } else {
          return ''
        }
      }

      return {
        diamondImgSrc:'/images/icons/diamond-big.png',
        name: getName()
      }
    },

    created() {
      this.update()
    },

    methods: {
      update() {
        this.$store.commit('auth/loadUserInfo')

        setInterval(() => {
          if (!this.$route.fullPath.includes('/play')) {
            if (this.nameFromStore)
              this.$root.$emit('showRankedGameWidget')
            else
              this.$root.$emit('hideRankedGameWidget')
          }
        }, 500)

      },

      play() {
        this.$refs.playBtn.setAttribute('disabled', 'true')
        this.$refs.playBtn.style.color = '#ccc'
        this.$router.push('/play')
      },

      exit() {
        if (confirm('Exit?')) {
          this.name = ''
          this.accessHash = ''

          delete localStorage.name
          delete localStorage.accessHash

          this.update()
        }
      },

      register() {
        this.$store.dispatch('auth/register', {
          name: this.name
        })
          .catch(msg => {
            this.$bvToast.toast(msg, { autoHideDelay: 3000, title: 'Error', variant: 'danger', toaster: 'b-toaster-top-left' })
          })

      }
    }
  }
</script>

<style scoped lang="stylus">
  .root
    box-shadow 0 0 10px rgba(0, 0, 0, 0.5)

  .social-link
    &:hover img
      transform scale(1.05)

  .diamond
    margin-right 5px
    vertical-align middle

  .w-200
    width 150px

  .guest-mode-alert
    color #5a5a5a
    background-color #ececec
    border-color #f8f8f8

  .myButton {
    text-shadow: 0px 0px 3px rgba(0, 0, 0, 1)
    box-shadow:inset 0px 1px 3px 0px #caefab;
    background:linear-gradient(to bottom, #77d42a 5%, #337001 100%);
    background-color:#77d42a;
    border-radius:6px;
    border:1px solid #529943;
    display:inline-block;
    cursor:pointer;
    color:#ffffff;
    font-size:18px;
    padding:6px 24px;
    text-decoration:none;
    font-weight bolder
    font-family Verdana
  }
  .myButton:hover {
    background:linear-gradient(to bottom, #76ea41 5%, #3c7e03 100%);
    background-color:#337001;
  }
  .myButton:active {
    position:relative;
    top:1px;
  }

  .name
    border 1px solid #397d00

  .crown
    margin-right: 5px;
    margin-bottom: 5px;

  .exit
    right: 21px;
    top: 2px;

</style>