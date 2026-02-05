<template>
  <div>
    <keep-alive>
      <component :is="tabs[currentTab]" :info="state.info" @setData="setDataInfo" @changePage="changePage"></component>
    </keep-alive>
  </div>
</template>
<script lang="ts" setup>
// 引入组件
const page = defineAsyncComponent(() => import('./page.vue'));
const detail = defineAsyncComponent(() => import('./detail.vue'));
const currentTab = ref('page')
const tabs = {
  page,
  detail
}

const state = reactive({
  info: {}
});

const setDataInfo = (info) => {
  state.info = info;
};

const changePage = (val: string) => {
  currentTab.value = val;
}

</script>
<style scoped></style>