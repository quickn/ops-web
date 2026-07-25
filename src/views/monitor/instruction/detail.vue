<template>
  <div class="app-container">
    <div class="top-title">
      <div>详情</div>
      <div>
        <el-button type="primary" @click="goBack">返回</el-button>
      </div>
    </div>
    <pre class="result-output">{{ props.info.result }}</pre>
  </div>
</template>
<script setup lang="ts">
const props = defineProps({
  info: {
    type: Object,
    required: true,
  },
});
const emit = defineEmits(["setData", "changePage"]);
function goBack() {
  emit("changePage", "page");
}
onActivated(() => {

});
</script>
<style>
.top-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 18px;
  font-weight: bold;
}

.result-output {
  white-space: pre-wrap;
  word-break: break-all;
  padding: 12px;
  margin: 0;
  font-family: "Courier New", Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  max-height: 100%;
  overflow-y: auto;
}
</style>
