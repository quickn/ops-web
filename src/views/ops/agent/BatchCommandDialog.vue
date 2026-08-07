<template>
  <el-dialog
    v-model="visible"
    title="批量命令下发"
    fullscreen
    @closed="handleClosed"
  >
    <div class="batch-command-container">
      <!-- 已选Agent列表 -->
      <div class="selected-agents-area">
        <div class="section-header">
          <span>已选 Agent（共 {{ agents.length }} 台）</span>
          <el-button type="primary" link size="small" @click="toggleExpand">
            <i-ep-arrow-down v-if="!allExpanded" />
            <i-ep-arrow-up v-else />
            {{ allExpanded ? "收起列表" : "展开列表" }}
          </el-button>
        </div>
        <el-collapse-transition>
          <div v-show="allExpanded" class="agent-tags">
            <el-tag
              v-for="agent in agents"
              :key="agent.id"
              size="small"
              class="agent-tag"
            >
              {{ agent.hostname || `Agent-${agent.id}` }}
            </el-tag>
          </div>
        </el-collapse-transition>
      </div>

      <!-- 命令输入区 -->
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
              批量执行
            </el-button>
          </template>
        </el-input>
      </div>

      <!-- 执行结果区 -->
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
import { batchHandleAgent } from "@/api/monitor/agent";

defineOptions({
  name: "BatchCommandDialog",
});

const visible = ref(false);
const executing = ref(false);
const cmdText = ref("");
const outputText = ref("");
const allExpanded = ref(false);

interface SelectedAgent {
  id: number;
  hostname: string;
}

const agents = ref<SelectedAgent[]>([]);

/**
 * 打开弹窗
 */
function open(agentList: SelectedAgent[]) {
  visible.value = true;
  agents.value = agentList;
  cmdText.value = "";
  outputText.value = "";
  allExpanded.value = agentList.length <= 10;
}

/**
 * 切换展开/收起
 */
function toggleExpand() {
  allExpanded.value = !allExpanded.value;
}

/**
 * 执行批量命令
 */
function handleExecute() {
  if (!cmdText.value.trim()) {
    ElMessage.warning("请输入命令");
    return;
  }

  if (agents.value.length === 0) {
    ElMessage.warning("没有选中的Agent");
    return;
  }

  const ids = agents.value.map((a) => a.id);

  executing.value = true;
  outputText.value = `>>> 开始批量执行命令: ${cmdText.value.trim()}\n>>> 目标Agent数量: ${
    ids.length
  }\n\n`;

  batchHandleAgent(ids, cmdText.value.trim())
    .then(({ data }) => {
      if (typeof data === "string") {
        outputText.value += data;
      } else if (Array.isArray(data)) {
        data.forEach((item: any, index: number) => {
          const agent = agents.value[index];
          const label = agent
            ? `[${agent.hostname || `Agent-${agent.id}`}]`
            : `[Agent ${index + 1}]`;
          outputText.value += `\n${"=".repeat(50)}\n${label}\n${"=".repeat(
            50
          )}\n`;
          outputText.value +=
            typeof item === "string" ? item : JSON.stringify(item.data, null, 2);
        });
      } else {
        outputText.value += JSON.stringify(data.data, null, 2);
      }
      outputText.value += `\n\n>>> 批量命令执行完成`;
    })
    .catch((error) => {
      outputText.value += `\n>>> 执行失败: ${error.message || error}`;
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
  agents.value = [];
  allExpanded.value = false;
}

defineExpose({
  open,
});
</script>

<style scoped lang="scss">
.batch-command-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.selected-agents-area {
  flex-shrink: 0;

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }

  .agent-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-height: 120px;
    padding: 8px 0;
    overflow-y: auto;
  }

  .agent-tag {
    margin: 0;
  }
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
