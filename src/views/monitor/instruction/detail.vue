<template>
  <div class="app-container">
    <div class="top-title">
      <div>详情</div>
      <div>
        <el-button type="primary" @click="goBack">返回</el-button>
      </div>
    </div>
    <el-card shadow="never">
      <el-form ref="deptFormRef" label-width="120px">
        <el-form-item label="IP:">
          <div>{{ props.info.agentIp }}</div>
        </el-form-item>
        <el-form-item label="指令:">
          <div>{{ props.info.command }}</div>
        </el-form-item>
        <el-form-item label="脚本:">
          <div>{{ props.info.script }}</div>
        </el-form-item>
        <el-form-item label="结果集:">
          <div>{{ props.info.result }}</div>
        </el-form-item>
        <el-form-item label="创建时间:">
          <div>{{ props.info.createTime }}</div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { LogInfo } from "@/api/monitor/log/types";
import { ServiceInfo } from "@/api/monitor/service/types";
import { listPage } from "@/api/monitor/agent";
import { listAll } from "@/api/monitor/service";
import { de, el } from "element-plus/es/locale";
import { ElLoading } from "element-plus";
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
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: bold;
}
</style>
