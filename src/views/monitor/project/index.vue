<template>
  <div>
    <keep-alive>
      <component :is="tabs[currentTab]" :info="state.info" @setData="setDataInfo" @changePage="changePage"></component>
    </keep-alive>
  </div>
</template>
<script lang="ts" setup>

defineOptions({
  name: "ProjectIndex",
  inheritAttrs: false,
});


// 引入组件
const page = defineAsyncComponent(() => import('./page.vue'));
const deploy = defineAsyncComponent(() => import('./deploy.vue'));
const set = defineAsyncComponent(() => import('./set.vue'));
const currentTab = ref('page')
const tabs = {
  page,
  deploy,
  set
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
