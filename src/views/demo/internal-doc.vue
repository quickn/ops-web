<script setup lang="ts"></script>
<template>
  <div class="iframe-wrap">
    <iframe
      src="http://192.168.10.11:8848/nacos/#/configurationManagement?dataId=&group=&appName=&namespace=&pageSize=&pageNo="
      frameborder="0"
    ></iframe>
  </div>
</template>
<style lang="scss" scoped>
.iframe-wrap {
  position: absolute;
  inset: 0;
  width: 100%;

  iframe {
    width: 100%;
    height: 100%;
  }
}
</style>
