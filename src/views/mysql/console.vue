<script setup lang="ts">
import { executeSql, listConnections, listDatabases } from "@/api/mysql";
import type { ConnectionInfo } from "@/api/mysql/types";
import { useRoute, useRouter } from "vue-router";
import { ref } from "vue";

// ==================== 路由参数 ====================
const route = useRoute();
const router = useRouter();
const queryConnId = Number(route.query.configId as string) || "";
const queryDb = (route.query.database as string) || "";

// ==================== 状态 ====================
const executing = ref(false);

// 当前连接
const activeConnections = ref<ConnectionInfo[]>([]);
const currentConnId = ref(queryConnId);
const currentDatabase = ref(queryDb);
const databases = ref<string[]>([]);

// SQL 编辑区
const sqlInput = ref("");
const sqlHistory = ref<string[]>([]);
const historyIndex = ref(-1);

// 结果区
const resultType = ref<"query" | "execute" | "">("");
const resultColumns = ref<string[]>([]);
const resultRecords = ref<Record<string, any>[]>([]);
const resultMessage = ref("");
const resultAffectedRows = ref(0);
const resultRowCount = ref(0);

// 输出日志
const outputLogs = ref<
  { type: "info" | "error" | "sql" | "result"; text: string; time: string }[]
>([]);

// TAB 切换
const activeTab = ref("result");

// ==================== 方法 ====================

async function loadConnections() {
  try {
    const res: any = await listConnections();
    activeConnections.value = res.data || [];
    if (!currentConnId.value && activeConnections.value.length > 0) {
      currentConnId.value = activeConnections.value[0].id;
      await loadDatabases();
    }
  } catch {
    activeConnections.value = [];
  }
}

async function loadDatabases() {
  if (!currentConnId.value) return;
  try {
    const res: any = await listDatabases(currentConnId.value);
    databases.value = res.data || [];
    if (databases.value.length > 0) {
      currentDatabase.value = databases.value[0];
    }
  } catch {
    databases.value = [];
  }
}

function onConnChange() {
  currentDatabase.value = "";
  databases.value = [];
  loadDatabases();
  addLog("info", `已切换连接: ${currentConnId.value}`);
}

async function execute() {
  const sql = sqlInput.value.trim();
  if (!sql) {
    ElMessage.warning("请输入 SQL 语句");
    return;
  }
  if (!currentConnId.value) {
    ElMessage.warning("请先选择连接");
    return;
  }

  // 记录历史
  sqlHistory.value.unshift(sql);
  if (sqlHistory.value.length > 100) sqlHistory.value.pop();
  historyIndex.value = -1;

  addLog("sql", sql);
  executing.value = true;

  try {
    const res: any = await executeSql(
      currentConnId.value,
      currentDatabase.value || "",
      sql
    );
    const data = res.data;
    if (data.type === "query") {
      resultType.value = "query";
      resultColumns.value = data.columns || [];
      resultRecords.value = data.records || [];
      resultRowCount.value = data.row_count || 0;
      addLog("result", `查询成功，返回 ${data.row_count} 行`);
    } else {
      resultType.value = "execute";
      resultAffectedRows.value = data.affected_rows || 0;
      resultMessage.value = data.message || "";
      resultColumns.value = [];
      resultRecords.value = [];
      addLog("result", data.message || "执行成功");
    }
  } catch (e: any) {
    addLog("error", e?.message || "执行失败");
    resultType.value = "";
  } finally {
    executing.value = false;
  }
}

function clearSql() {
  sqlInput.value = "";
  resultType.value = "";
  resultColumns.value = [];
  resultRecords.value = [];
  resultMessage.value = "";
}

function clearLogs() {
  outputLogs.value = [];
}

function addLog(type: "info" | "error" | "sql" | "result", text: string) {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  outputLogs.value.push({ type, text, time });
}

// 键盘事件：Ctrl+Enter 执行
function onKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    execute();
  }
  // 上下箭头切换历史
  if (e.ctrlKey && e.key === "ArrowUp") {
    e.preventDefault();
    if (historyIndex.value < sqlHistory.value.length - 1) {
      historyIndex.value++;
      sqlInput.value = sqlHistory.value[historyIndex.value];
    }
  }
  if (e.ctrlKey && e.key === "ArrowDown") {
    e.preventDefault();
    if (historyIndex.value > 0) {
      historyIndex.value--;
      sqlInput.value = sqlHistory.value[historyIndex.value];
    } else if (historyIndex.value === 0) {
      historyIndex.value = -1;
      sqlInput.value = "";
    }
  }
}

function setDatabase(db: string) {
  currentDatabase.value = db;
  addLog("info", `已切换数据库: ${db}`);
}

function insertSql(template: string) {
  sqlInput.value = template;
}

function backToConnection() {
  router.push("/mysql/connection");
}

// ==================== 初始化 ====================
onMounted(() => {
  loadConnections();
  if (currentConnId.value) {
    loadDatabases();
  }
  addLog("info", "SQL 控制台就绪 — Ctrl+Enter 执行SQL | Ctrl+↑↓ 切换历史");
});
</script>

<template>
  <div class="app-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <el-button @click="backToConnection" text> 返回</el-button>

      <el-select
        v-model="currentConnId"
        placeholder="选择连接"
        style="width: 200px; margin-left: 8px"
        @change="onConnChange"
        size="small"
      >
        <el-option
          v-for="c in activeConnections"
          :key="c.id"
          :label="`${c.configName || ''} ${c.url || ''}`.trim() || c.id"
          :value="c.id"
        />
      </el-select>

      <span style="margin: 0 8px; color: #909399">|</span>

      <span style="font-size: 13px; color: #606266">数据库:</span>
      <el-select
        v-model="currentDatabase"
        placeholder="选择数据库"
        style="width: 160px; margin-left: 4px"
        clearable
        size="small"
        @change="(v: string) => setDatabase(v)"
      >
        <el-option v-for="db in databases" :key="db" :label="db" :value="db" />
      </el-select>

      <el-button
        type="primary"
        @click="execute"
        :loading="executing"
        style="margin-left: 12px"
      >
        <i-ep-video-play />
        执行 (Ctrl+Enter)
      </el-button>
      <el-button @click="clearSql">
        <i-ep-delete />
        清空
      </el-button>
    </div>

    <!-- 快捷模板 -->
    <div class="quick-templates">
      <el-tag
        v-for="tpl in [
          'SELECT * FROM ',
          'SHOW TABLES',
          'SHOW CREATE TABLE ',
          'DESC ',
          'SHOW INDEX FROM ',
        ]"
        :key="tpl"
        style="margin-right: 6px; margin-bottom: 4px; cursor: pointer"
        @click="insertSql(tpl)"
        size="small"
      >
        {{ tpl }}
      </el-tag>
    </div>

    <div class="console-body">
      <!-- SQL 编辑区 -->
      <el-card shadow="never" class="editor-card">
        <template #header>
          <span><i-ep-edit /> SQL 编辑器</span>
        </template>
        <el-input
          v-model="sqlInput"
          type="textarea"
          :rows="9"
          :placeholder="`在此输入 SQL 语句...\n\n快捷键: Ctrl+Enter 执行 | Ctrl+↑↓ 历史记录`"
          resize="none"
          class="sql-editor"
          @keydown="onKeydown"
        />
      </el-card>

      <!-- TAB 切换栏 -->
      <el-tabs v-model="activeTab" class="page-tabs">
        <el-tab-pane label="结果" name="result" />
        <el-tab-pane label="输出日志" name="log" />
      </el-tabs>

      <!-- 内容区 -->
      <div class="result-section">
        <!-- 结果内容 -->
        <div v-if="activeTab === 'result'" class="tab-pane-content">
          <template v-if="resultType === 'query'">
            <div style="margin-bottom: 6px; font-size: 13px; color: #67c23a">
              返回 {{ resultRowCount }} 行
            </div>
            <el-table
              :data="resultRecords.slice(0, 200)"
              border
              size="small"
              stripe
            >
              <el-table-column
                v-for="col in resultColumns"
                :key="col"
                :label="col"
                :prop="col"
                min-width="100"
                show-overflow-tooltip
              >
                <template #default="scope">
                  <span
                    v-if="scope.row[col] === null"
                    style="font-style: italic; color: #ccc"
                    >NULL</span
                  >
                  <span v-else>{{ scope.row[col] }}</span>
                </template>
              </el-table-column>
            </el-table>
            <div
              v-if="resultRecords.length > 200"
              style="margin-top: 6px; font-size: 12px; color: #e6a23c"
            >
              仅显示前 200 条，共 {{ resultRowCount }} 条
            </div>
          </template>
          <template v-else-if="resultType === 'execute'">
            <el-result
              icon="success"
              title="执行成功"
              :sub-title="resultMessage"
            />
            <div style="font-size: 14px; color: #909399; text-align: center">
              影响行数: {{ resultAffectedRows }}
            </div>
          </template>
          <el-empty v-else description="等待执行 SQL..." />
        </div>

        <!-- 输出日志内容 -->
        <div v-else-if="activeTab === 'log'" class="tab-pane-content">
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: flex-end;
              margin-bottom: 8px;
            "
          >
            <el-button size="small" text @click="clearLogs">清空日志</el-button>
          </div>
          <div class="log-area">
            <div
              v-if="outputLogs.length === 0"
              style="padding: 8px 0; font-size: 13px; color: #909399"
            >
              暂无日志
            </div>
            <div
              v-for="(log, idx) in outputLogs"
              :key="idx"
              class="log-line"
              :class="`log-${log.type}`"
            >
              <span class="log-time">[{{ log.time }}]</span>
              <span class="log-text">{{ log.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-bottom: 8px;
}

.quick-templates {
  margin-bottom: 8px;
}

.page-tabs {
  margin-bottom: 8px;
}

.page-tabs :deep(.el-tabs__header) {
  padding: 0 4px;
  margin-bottom: 0;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-light);
  border-bottom: none;
  border-radius: var(--el-border-radius-base) var(--el-border-radius-base) 0 0;
}

.page-tabs :deep(.el-tabs__content) {
  display: none;
}

.console-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: calc(100vh - 180px);
  min-height: 400px;
}

.editor-card {
  flex-shrink: 0;
}

.result-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--el-border-radius-base);
}

.tab-pane-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 12px;
  overflow: auto;
}

.sql-editor :deep(textarea) {
  font-family: "Cascadia Code", "Fira Code", Consolas, Monaco, monospace !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
}

.log-area {
  height: 100%;
  padding: 10px 12px;
  overflow-y: auto;
  font-family: "Cascadia Code", "Fira Code", Consolas, monospace;
  font-size: 13px;
  background: #1e1e1e;
  border-radius: 4px;
}

.log-line {
  padding: 2px 0;
  line-height: 1.5;
}

.log-time {
  margin-right: 8px;
  color: #888;
}

.log-info .log-text {
  color: #4fc3f7;
}

.log-error .log-text {
  color: #ef5350;
}

.log-sql .log-text {
  color: #a5d6a7;
}

.log-result .log-text {
  color: #fff176;
}
</style>
