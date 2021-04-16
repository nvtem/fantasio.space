<template>
  <div class="app-root">
    <router-view></router-view>
    <div class="d-none">
<!--LiveInternet counter--><a href="https://www.liveinternet.ru/click"
target="_blank"><img id="licntF17D" width="88" height="31" style="border:0"
title="LiveInternet: показано число просмотров и посетителей за 24 часа"
src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBTAA7"
alt=""/></a><script type="application/javascript">(function(d,s){d.getElementById("licntF17D").src=
"https://counter.yadro.ru/hit?t52.6;r"+escape(d.referrer)+
((typeof(s)=="undefined")?"":";s"+s.width+"*"+s.height+"*"+
(s.colorDepth?s.colorDepth:s.pixelDepth))+";u"+escape(d.URL)+
";h"+escape(d.title.substring(0,150))+";"+Math.random()})
(document,screen)</script><!--/LiveInternet-->

    </div>
  </div>
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