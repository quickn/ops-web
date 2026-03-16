<script setup>
import { useRoute } from "vue-router";

const route = useRoute();
const url = ref("");

// 基础参数
onMounted(() => {
  url.value = route.query.url;
  //url.value = "https://www.deepseek.com/";
});
</script>

<template>
  <div class="iframe-wrap">
    <iframe :src="url" frameborder="0"></iframe>
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
