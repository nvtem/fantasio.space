<script lang="ts">
  import { Vue, Component, Prop, Mixins } from 'vue-property-decorator'

  @Component
  export default class CrownImgSrcsMixin extends Vue {
    private crownImgSrcs = {
      draconic: '/images/icons/crowns/draconic.png',
      amethyst: '/images/icons/crowns/amethyst.png',
      diamond: '/images/icons/crowns/diamond.png',
      gold: '/images/icons/crowns/gold.png',
      silver: '/images/icons/crowns/silver.png',
      bronze: '/images/icons/crowns/bronze.png'
    }
  }
</script>