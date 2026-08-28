<template>
  <div class="app-container">
    <div class="top-title">
      <div>详情</div>
      <div>
        <el-button type="primary" @click="goBack">返回</el-button>
      </div>
    </div>
    <el-card shadow="never">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="服务名">{{
          info.serviceName || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="IP">{{
          info.agentIp || info.agentIP || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="指令">{{
          info.command || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="任务ID">{{
          info.jobId ?? "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="脚本" :span="2">{{
          info.script || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="是否成功">
          <el-tag
            :type="isSuccess(info.isSuccess) ? 'success' : 'danger'"
            size="small"
          >
            {{ isSuccess(info.isSuccess) ? "成功" : "失败" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{
          info.createTime || "-"
        }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
    <el-card shadow="never" class="result-card">
      <template #header>结果集</template>
      <pre class="result-output">{{ info.result || "无结果" }}</pre>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import type { LogInfo } from "@/api/monitor/log/types";

const props = defineProps<{
  info: LogInfo;
}>();

const emit = defineEmits(["setData", "changePage"]);

const info = computed(() => props.info || {});

/** 判断是否成功（兼容布尔值、字符串、数字） */
function isSuccess(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function goBack() {
  emit("changePage", "page");
}
</script>
<style scoped>
.app-container {
  padding: 20px;
}

.top-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: bold;
}

.result-card {
  margin-top: 16px;
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
  max-height: 500px;
  overflow-y: auto;
}
</style>
