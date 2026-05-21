<template>
  <el-dialog v-model="visible" :title="title" fullscreen @closed="handleClosed">
    <div class="command-container">
      <div class="command-input-area">
        <el-input
          v-model="cmdText"
          placeholder="请输入命令，例如：ls -la"
          clearable
          @keyup.enter="handleExecute"
        >
          <template #append>
            <el-button
              type="primary"
              :loading="executing"
              @click="handleExecute"
            >
              <i-ep-caret-right />
              执行
            </el-button>
          </template>
        </el-input>
      </div>

      <div class="command-output-area">
        <div class="output-header">
          <span>执行结果</span>
          <el-button
            v-if="outputText"
            type="primary"
            link
            size="small"
            @click="handleCopy"
          >
            <i-ep-document-copy />
            复制
          </el-button>
        </div>
        <div class="output-content" v-loading="executing">
          <pre v-if="outputText" class="output-text">{{ outputText }}</pre>
          <div v-else class="output-empty">等待命令执行...</div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose"> 关 闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { sendCmd } from "@/api/monitor/agent";

defineOptions({
  name: "CommandDialog",
});

const visible = ref(false);
const title = ref("发送指令");
const executing = ref(false);
const cmdText = ref("");
const outputText = ref("");

let currentAgentId: number | null = null;
let currentHostname = "";

/**
 * 打开弹窗
 */
function open(agentData: { id: number; hostname: string }) {
  visible.value = true;
  currentAgentId = agentData.id;
  currentHostname = agentData.hostname || "";
  title.value = `发送指令 - ${currentHostname}`;
  cmdText.value = "";
  outputText.value = "";
}

/**
 * 执行命令
 */
function handleExecute() {
  if (!cmdText.value.trim()) {
    ElMessage.warning("请输入命令");
    return;
  }

  if (!currentAgentId) {
    ElMessage.warning("agentId 不存在");
    return;
  }

  executing.value = true;
  sendCmd(currentAgentId, cmdText.value.trim())
    .then(({ data }) => {
      outputText.value =
        typeof data === "string" ? data : JSON.stringify(data, null, 2);
    })
    .catch((error) => {
      outputText.value = `执行失败: ${error.message || error}`;
    })
    .finally(() => {
      executing.value = false;
    });
}

/**
 * 复制结果
 */
function handleCopy() {
  if (!outputText.value) return;
  navigator.clipboard
    .writeText(outputText.value)
    .then(() => {
      ElMessage.success("已复制到剪贴板");
    })
    .catch(() => {
      ElMessage.error("复制失败");
    });
}

/**
 * 关闭弹窗
 */
function handleClose() {
  visible.value = false;
}

/**
 * 弹窗关闭后回调
 */
function handleClosed() {
  cmdText.value = "";
  outputText.value = "";
  currentAgentId = null;
  currentHostname = "";
}

defineExpose({
  open,
});
</script>

<style scoped lang="scss">
.command-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.command-input-area {
  flex-shrink: 0;
  width: 100%;
}

.command-output-area {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;

  .output-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    color: #606266;
  }

  .output-content {
    flex: 1;
    padding: 12px;
    overflow-y: auto;
    background: #1e1e1e;
    border-radius: 4px;
  }

  .output-text {
    margin: 0;
    font-family: Consolas, "Courier New", monospace;
    font-size: 13px;
    line-height: 1.6;
    color: #d4d4d4;
    word-break: break-all;
    white-space: pre-wrap;
  }

  .output-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 14px;
    color: #909399;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
