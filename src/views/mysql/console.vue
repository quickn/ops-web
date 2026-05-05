<script setup lang="ts">
import {executeSql, listConnections, listDatabases} from "@/api/mysql";
import type {ConnectionInfo} from "@/api/mysql/types";
import {useRoute, useRouter} from "vue-router";
import {ref} from "vue";

// ==================== 路由参数 ====================
const route = useRoute();
const router = useRouter();
const queryConnId = (route.query.connection_id as string) || "";
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
const outputLogs = ref<{ type: "info" | "error" | "sql" | "result"; text: string; time: string }[]>([]);

// ==================== 方法 ====================

async function loadConnections() {
  try {
    const res: any = await listConnections();
    activeConnections.value = res.data || [];
    if (!currentConnId.value && activeConnections.value.length > 0) {
      currentConnId.value = activeConnections.value[0].connection_id;
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
    const res: any = await executeSql(currentConnId.value, currentDatabase.value || "", sql);
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
  const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  outputLogs.value.push({type, text, time});
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
      <el-button @click="backToConnection" text>
        返回
      </el-button>

      <el-select v-model="currentConnId" placeholder="选择连接" style="width: 200px; margin-left: 8px"
                 @change="onConnChange" size="small">
        <el-option v-for="c in activeConnections" :key="c.connection_id" :label="`${c.user}@${c.host}:${c.port}`"
                   :value="c.connection_id"/>
      </el-select>

      <span style="margin: 0 8px; color: #909399">|</span>

      <span style="font-size: 13px; color: #606266">数据库:</span>
      <el-select v-model="currentDatabase" placeholder="选择数据库" style="width: 160px; margin-left: 4px" clearable
                 size="small" @change="(v: string) => setDatabase(v)">
        <el-option v-for="db in databases" :key="db" :label="db" :value="db"/>
      </el-select>

      <el-button type="primary" @click="execute" :loading="executing" style="margin-left: 12px">
        <i-ep-video-play/>
        执行 (Ctrl+Enter)
      </el-button>
      <el-button @click="clearSql">
        <i-ep-delete/>
        清空
      </el-button>
    </div>

    <!-- 快捷模板 -->
    <div class="quick-templates">
      <el-tag v-for="tpl in ['SELECT * FROM ', 'SHOW TABLES', 'SHOW CREATE TABLE ', 'DESC ', 'SHOW INDEX FROM ']"
              :key="tpl" style="cursor: pointer; margin-right: 6px; margin-bottom: 4px" @click="insertSql(tpl)"
              size="small">
        {{ tpl }}
      </el-tag>
    </div>

    <el-row :gutter="12" style="height: calc(100vh - 240px); min-height: 400px">
      <!-- SQL 编辑区 -->
      <el-col :span="14" style="height: 100%">
        <el-card shadow="never" style="height: 100%; display: flex; flex-direction: column">
          <template #header>
            <span><i-ep-edit/> SQL 编辑器</span>
          </template>
          <div style="flex: 1; display: flex; flex-direction: column">
            <el-input
              v-model="sqlInput"
              type="textarea"
              :rows="10"
              placeholder="在此输入 SQL 语句...&#10;&#10;快捷键: Ctrl+Enter 执行 | Ctrl+↑↓ 历史记录"
              style="flex: 1"
              resize="none"
              class="sql-editor"
              @keydown="onKeydown"
            />
          </div>
        </el-card>
      </el-col>

      <!-- 结果区 -->
      <el-col :span="10" style="height: 100%">
        <el-card shadow="never" style="height: 100%; display: flex; flex-direction: column">
          <template #header>
            <span><i-ep-data-analysis/> 结果</span>
          </template>
          <div style="flex: 1; overflow: auto">
            <!-- 查询结果 -->
            <template v-if="resultType === 'query'">
              <div style="margin-bottom: 6px; font-size: 13px; color: #67c23a">
                返回 {{ resultRowCount }} 行
              </div>
              <el-table :data="resultRecords.slice(0, 200)" border size="small" max-height="350" stripe>
                <el-table-column
                  v-for="col in resultColumns"
                  :key="col"
                  :label="col"
                  :prop="col"
                  min-width="100"
                  show-overflow-tooltip
                >
                  <template #default="scope">
                    <span v-if="scope.row[col] === null" style="color: #ccc; font-style: italic">NULL</span>
                    <span v-else>{{ scope.row[col] }}</span>
                  </template>
                </el-table-column>
              </el-table>
              <div v-if="resultRecords.length > 200" style="margin-top: 6px; font-size: 12px; color: #e6a23c">
                仅显示前 200 条，共 {{ resultRowCount }} 条
              </div>
            </template>

            <!-- 执行结果 -->
            <template v-else-if="resultType === 'execute'">
              <el-result icon="success" title="执行成功" :sub-title="resultMessage"/>
              <div style="text-align: center; color: #909399; font-size: 14px">
                影响行数: {{ resultAffectedRows }}
              </div>
            </template>

            <el-empty v-else description="等待执行 SQL..."/>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 输出日志 -->
    <el-card shadow="never" style="margin-top: 12px">
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between">
          <span><i-ep-notebook/> 输出日志</span>
          <el-button size="small" text @click="clearLogs">清空日志</el-button>
        </div>
      </template>
      <div class="log-area" ref="logContainer">
        <div v-if="outputLogs.length === 0" style="color: #909399; font-size: 13px; padding: 8px 0">暂无日志</div>
        <div v-for="(log, idx) in outputLogs" :key="idx" class="log-line" :class="`log-${log.type}`">
          <span class="log-time">[{{ log.time }}]</span>
          <span class="log-text">{{ log.text }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 4px;
}

.quick-templates {
  margin-bottom: 8px;
}

.sql-editor :deep(textarea) {
  font-family: "Cascadia Code", "Fira Code", "Consolas", "Monaco", monospace !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
}

.log-area {
  max-height: 160px;
  overflow-y: auto;
  font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
  font-size: 13px;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 10px 12px;
}

.log-line {
  padding: 2px 0;
  line-height: 1.5;
}

.log-time {
  color: #888;
  margin-right: 8px;
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
