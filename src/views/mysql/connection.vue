<template>
  <div class="navicat-container">
    <!-- ==================== 左侧面板：连接树 ==================== -->
    <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
      <div class="panel-header">
        <span><i-ep-connection/> 连接</span>
        <div class="panel-header-actions">
          <el-button size="small" text @click="showAddForm" title="新增连接">
            <i-ep-plus/>
          </el-button>
          <el-button size="small" text @click="refreshAll" title="刷新">
            <i-ep-refresh/>
          </el-button>
        </div>
      </div>

      <!-- 连接树 -->
      <div class="tree-wrapper" @contextmenu.prevent>
        <el-tree
          ref="treeRef"
          :data="treeData"
          :props="treeProps"
          node-key="id"
          :highlight-current="true"
          :expand-on-click-node="false"
          @node-click="onTreeNodeClick"
          @node-expand="onTreeNodeExpand"
          @node-contextmenu="onTreeContextMenu"
        >
          <template #default="{ node, data }">
            <div class="tree-node-content" @contextmenu.prevent="onTreeContextMenu($event, data, node)">
              <!-- 连接节点 -->
              <template v-if="data.nodeType === 'connection'">
                <i-ep-connection class="node-icon" :color="data.isActive ? '#67c23a' : '#409eff'"/>
                <span class="node-label" :class="{ 'active-conn': data.isActive }">
                  {{ data.label }}
                </span>
                <el-tag v-if="data.isActive" size="small" type="success" effect="plain" class="active-tag">
                  已连接
                </el-tag>
              </template>

              <!-- 数据库节点 -->
              <template v-else-if="data.nodeType === 'database'">
                <i-ep-folder/>
                <span class="node-label">{{ data.label }}</span>
              </template>

              <!-- 加载中 -->
              <template v-else-if="data.nodeType === 'loading'">
                <i-ep-loading/>
                <span class="node-label loading-text">加载中...</span>
              </template>
            </div>
          </template>
        </el-tree>
      </div>

      <!-- 右键菜单 -->
      <div
        v-show="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <template v-if="contextMenu.nodeType === 'connection'">
          <div
            v-if="!contextMenu.isActive"
            class="context-menu-item"
            @click="onContextMenuAction('connect')"
          >
            <i-ep-link/>
            连接
          </div>
          <div class="context-menu-item" @click="onContextMenuAction('open-database')">
            <i-ep-folder/>
            打开数据库
          </div>
          <div class="context-menu-item" @click="onContextMenuAction('console')">
            <!--            <i-ep-terminal/>-->
            控制台
          </div>
          <div class="context-menu-item" @click="onContextMenuAction('test')">
            <i-ep-connection/>
            测试连接
          </div>
          <div v-if="contextMenu.isActive" class="context-menu-item danger" @click="onContextMenuAction('disconnect')">
            <i-ep-switch-button/>
            断开连接
          </div>
          <div class="context-menu-divider"/>
          <div class="context-menu-item" @click="onContextMenuAction('edit')">
            <i-ep-edit/>
            编辑
          </div>
          <div class="context-menu-item danger" @click="onContextMenuAction('delete')">
            <i-ep-delete/>
            删除
          </div>
          <div class="context-menu-divider"/>
          <div class="context-menu-item" @click="onContextMenuAction('refresh-databases')">
            <i-ep-refresh/>
            刷新数据库列表
          </div>
        </template>

        <template v-else-if="contextMenu.nodeType === 'database'">
          <div class="context-menu-item" @click="onContextMenuAction('open-table')">
            <i-ep-grid/>
            打开表
          </div>
          <div class="context-menu-item" @click="onContextMenuAction('console-db')">
            <!--            <i-ep-terminal/>-->
            控制台
          </div>
          <div class="context-menu-divider"/>
          <div class="context-menu-item danger" @click="onContextMenuAction('drop-db')">
            <i-ep-delete/>
            删除数据库
          </div>
        </template>
      </div>
    </div>

    <!-- ==================== 分割线（可拖拽调整宽度） ==================== -->
    <div class="splitter" @mousedown="onSplitterMouseDown"/>

    <!-- ==================== 右侧面板：控制台 ==================== -->
    <div class="right-panel">
      <div class="panel-header">
        <!--        <span><i-ep-terminal/> 控制台</span>-->
      </div>

      <!-- 工具栏 -->
      <div class="console-toolbar">
        <el-select
          v-model="consoleConnId"
          placeholder="选择连接"
          size="small"
          style="width: 200px"
          @change="onConsoleConnChange"
        >
          <el-option
            v-for="c in activeConnections"
            :key="c.connection_id"
            :label="`${c.user}@${c.host}:${c.port}`"
            :value="c.connection_id"
          />
        </el-select>

        <span class="console-sep">|</span>

        <span class="console-label">数据库:</span>
        <el-select
          v-model="consoleDatabase"
          placeholder="选择数据库"
          size="small"
          style="width: 150px"
          clearable
          @change="(v: string) => addConsoleLog('info', `已切换数据库: ${v || '(未选择)'}`)"
        >
          <el-option v-for="db in consoleDatabases" :key="db" :label="db" :value="db"/>
        </el-select>

        <el-button type="primary" size="small" @click="executeSql" :loading="executing" style="margin-left: 8px">
          <i-ep-video-play/>
          执行
        </el-button>
        <el-button size="small" @click="clearConsole">
          <i-ep-delete/>
          清空
        </el-button>
      </div>

      <!-- 快捷模板 -->
      <div class="quick-templates">
        <el-tag
          v-for="tpl in ['SELECT * FROM ', 'SHOW TABLES', 'SHOW CREATE TABLE ', 'DESC ', 'SHOW INDEX FROM ']"
          :key="tpl"
          size="small"
          class="tpl-tag"
          @click="sqlInput = tpl"
        >
          {{ tpl }}
        </el-tag>
      </div>

      <!-- SQL 编辑区 -->
      <div class="console-editor">
        <el-input
          v-model="sqlInput"
          type="textarea"
          :rows="6"
          placeholder="在此输入 SQL...  Ctrl+Enter 执行"
          class="sql-textarea"
          resize="none"
          @keydown="onConsoleKeydown"
        />
      </div>

      <!-- 结果区 -->
      <div class="console-result">
        <div class="result-header">
          <span><i-ep-data-analysis/> 结果</span>
          <span v-if="resultType === 'query'" class="result-count">返回 {{ resultRowCount }} 行</span>
          <span v-else-if="resultType === 'execute'" class="result-count">影响 {{ resultAffectedRows }} 行</span>
        </div>
        <div class="result-body">
          <template v-if="resultType === 'query'">
            <el-table
              :data="resultRecords.slice(0, 200)"
              border
              size="small"
              max-height="200"
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
                  <span v-if="scope.row[col] === null" class="null-value">NULL</span>
                  <span v-else>{{ scope.row[col] }}</span>
                </template>
              </el-table-column>
            </el-table>
            <div v-if="resultRecords.length > 200" class="truncate-hint">
              仅显示前 200 条，共 {{ resultRowCount }} 条
            </div>
          </template>
          <template v-else-if="resultType === 'execute'">
            <el-result icon="success" title="执行成功" :sub-title="resultMessage"/>
          </template>
          <el-empty v-else description="等待执行 SQL..." :image-size="60"/>
        </div>
      </div>

      <!-- 输出日志 -->
      <div class="console-log">
        <div class="log-header">
          <span><i-ep-notebook/> 输出日志</span>
          <el-button size="small" text @click="consoleLogs = []">清空</el-button>
        </div>
        <div class="log-body" ref="logBodyRef">
          <div v-if="consoleLogs.length === 0" class="log-empty">暂无日志</div>
          <div
            v-for="(log, idx) in consoleLogs"
            :key="idx"
            class="log-line"
            :class="`log-${log.type}`"
          >
            <span class="log-time">[{{ log.time }}]</span>
            <span>{{ log.text }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 新增/编辑连接对话框 ==================== -->
    <el-dialog
      v-model="formVisible"
      :title="isEdit ? '编辑连接' : '新增连接'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="80px">
        <el-form-item label="主机" prop="host">
          <el-input v-model="formData.host" placeholder="127.0.0.1"/>
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number v-model="formData.port" :min="1" :max="65535" style="width: 100%"/>
        </el-form-item>
        <el-form-item label="用户名" prop="user">
          <el-input v-model="formData.user" placeholder="root"/>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="formData.password" type="password" show-password placeholder="输入密码"/>
        </el-form-item>
        <el-form-item label="字符集">
          <el-select v-model="formData.charset" style="width: 100%">
            <el-option label="utf8mb4" value="utf8mb4"/>
            <el-option label="utf8" value="utf8"/>
            <el-option label="gbk" value="gbk"/>
            <el-option label="latin1" value="latin1"/>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">

defineOptions({
  name: "MysqlConnection",
  inheritAttrs: false,
});

import {
  addSavedConfig,
  connect,
  deleteSavedConfig,
  disconnect,
  executeSql as apiExecuteSql,
  getSavedConfigs,
  listConnections,
  listDatabases,
  testConnect,
  updateSavedConfig,
} from "@/api/mysql";

import type {ConnectionConfig, ConnectionInfo} from "@/api/mysql/types";
import {useRouter} from "vue-router";

const router = useRouter();

// ==================== 类型定义 ====================

interface TreeNode {
  id: string;
  label: string;
  nodeType: "connection" | "database" | "loading";
  isActive?: boolean;
  connId?: string;
  configIndex?: number;
  config?: ConnectionConfig;
  dbName?: string;
  children?: TreeNode[];
}

// ==================== 左侧面板：连接树 ====================

const treeRef = ref();
const treeData = ref<TreeNode[]>([]);
const treeProps = {children: "children", label: "label"};

const savedConfigs = ref<ConnectionConfig[]>([]);
const activeConnections = ref<ConnectionInfo[]>([]);

// 面板宽度（可拖拽调整）
const leftPanelWidth = ref(280);
const MIN_PANEL_WIDTH = 220;
const MAX_PANEL_WIDTH = 500;

// 右键菜单
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  nodeType: "" as string,
  nodeId: "",
  configIndex: -1,
  isActive: false,
  connId: "",
  dbName: "",
  config: null as ConnectionConfig | null,
});

// 表单
const formVisible = ref(false);
const isEdit = ref(false);
const editIndex = ref(-1);
const formRef = ref();
const formData = reactive<ConnectionConfig>({
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "",
  charset: "utf8mb4",
});

const rules = {
  host: [{required: true, message: "请输入主机地址", trigger: "blur"}],
  port: [{required: true, message: "请输入端口", trigger: "blur"}],
  user: [{required: true, message: "请输入用户名", trigger: "blur"}],
};

// ==================== 右侧面板：控制台 ====================

const executing = ref(false);
const consoleConnId = ref("");
const consoleDatabase = ref("");
const consoleDatabases = ref<string[]>([]);
const sqlInput = ref("");
const sqlHistory = ref<string[]>([]);
const historyIdx = ref(-1);

const resultType = ref<"query" | "execute" | "">("");
const resultColumns = ref<string[]>([]);
const resultRecords = ref<Record<string, any>[]>([]);
const resultMessage = ref("");
const resultAffectedRows = ref(0);
const resultRowCount = ref(0);

const consoleLogs = ref<{ type: "info" | "error" | "sql" | "result"; text: string; time: string }[]>([]);
const logBodyRef = ref();

// ==================== 初始化 ====================

onMounted(async () => {
  await Promise.all([loadSavedConfigs(), refreshActiveConnections()]);
  buildTreeData();
  addConsoleLog("info", "SQL 控制台就绪 — Ctrl+Enter 执行SQL | Ctrl+↑↓ 切换历史");
  // 点击页面任意位置关闭右键菜单
  document.addEventListener("click", closeContextMenu);
  // 监听窗口 resize
  window.addEventListener("resize", onWindowResize);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", closeContextMenu);
  window.removeEventListener("resize", onWindowResize);
});

function onWindowResize() {
  // 防止面板超出窗口
  if (leftPanelWidth.value > window.innerWidth - 400) {
    leftPanelWidth.value = Math.max(MIN_PANEL_WIDTH, window.innerWidth - 400);
  }
}

async function loadSavedConfigs() {
  try {
    const res: any = await getSavedConfigs();
    savedConfigs.value = res.data || [];
  } catch {
    savedConfigs.value = [];
  }
}

async function refreshActiveConnections() {
  try {
    const res: any = await listConnections();
    activeConnections.value = res.data || [];
  } catch {
    activeConnections.value = [];
  }
}

/** 构建树数据 */
function buildTreeData() {
  const nodes: TreeNode[] = [];
  // 已保存的连接配置
  savedConfigs.value.forEach((cfg, idx) => {
    // 检查是否已有活跃连接匹配此配置
    const active = activeConnections.value.find(
      (a) => a.host === cfg.host && a.port === cfg.port && a.user === cfg.user
    );
    nodes.push({
      id: `saved_${idx}`,
      label: `${cfg.user}@${cfg.host}:${cfg.port}`,
      nodeType: "connection",
      isActive: !!active,
      connId: active?.connection_id || "",
      configIndex: idx,
      config: {...cfg},
      children: [],
    });
  });

  // 活跃但未保存的连接
  activeConnections.value.forEach((conn) => {
    const hasSaved = savedConfigs.value.some(
      (cfg) => cfg.host === conn.host && cfg.port === conn.port && cfg.user === conn.user
    );
    if (!hasSaved) {
      nodes.push({
        id: `active_${conn.connection_id}`,
        label: `${conn.user}@${conn.host}:${conn.port}`,
        nodeType: "connection",
        isActive: true,
        connId: conn.connection_id,
        configIndex: -1,
        children: [],
      });
    }
  });

  treeData.value = nodes;
}

async function refreshAll() {
  await Promise.all([loadSavedConfigs(), refreshActiveConnections()]);
  buildTreeData();
  ElMessage.success("已刷新");
}

// ==================== 右键菜单 ====================

function closeContextMenu() {
  contextMenu.visible = false;
}

function onTreeContextMenu(event: MouseEvent, data: TreeNode, _node: any) {
  // 阻止冒泡，防止 document click 立即关闭
  event.stopPropagation();

  // 调整菜单位置，防止溢出
  let x = event.clientX;
  let y = event.clientY;
  if (x + 180 > window.innerWidth) x = window.innerWidth - 190;
  if (y + 320 > window.innerHeight) y = window.innerHeight - 330;

  contextMenu.visible = true;
  contextMenu.x = x;
  contextMenu.y = y;
  contextMenu.nodeType = data.nodeType;
  contextMenu.nodeId = data.id;
  contextMenu.isActive = !!data.isActive;
  contextMenu.connId = data.connId || "";
  contextMenu.dbName = data.dbName || "";
  contextMenu.configIndex = data.configIndex ?? -1;
  contextMenu.config = data.config || null;
}

function onContextMenuAction(action: string) {
  closeContextMenu();
  const {nodeId, configIndex, config, connId, dbName} = contextMenu;
  switch (action) {
    case "connect":
      if (config) handleConnect(config);
      break;
    case "open-database":
      if (connId) enterDatabase(connId);
      else if (config) handleConnectAndGo(config);
      break;
    case "console":
      if (connId) {
        consoleConnId.value = connId;
        onConsoleConnChange();
      } else if (config) {
        // 直接去独立控制台页
        router.push({path: "/mysql/console"});
      }
      break;
    case "test":
      if (config) handleTest(config);
      break;
    case "disconnect":
      if (connId) handleDisconnect(connId);
      break;
    case "edit":
      if (configIndex >= 0) showEditForm(configIndex);
      break;
    case "delete":
      if (configIndex >= 0) deleteConfig(configIndex);
      break;
    case "refresh-databases":
      if (configIndex >= 0) refreshDatabases(`saved_${configIndex}`);
      else if (connId) refreshDatabases(nodeId);
      break;
    case "open-table":
      if (connId && dbName) {
        router.push({path: "/mysql/table", query: {connection_id: connId, database: dbName}});
      }
      break;
    case "console-db":
      if (connId && dbName) {
        consoleConnId.value = connId;
        consoleDatabase.value = dbName;
        onConsoleConnChange();
      }
      break;
    case "drop-db":
      if (connId && dbName) dropDatabase(connId, dbName);
      break;
  }
}

// ==================== 树节点交互 ====================

function onTreeNodeClick(data: TreeNode) {
  // 左键点击：如果是连接节点，选中它；如果是数据库节点，打开表
  if (data.nodeType === "connection") {
    // 选中连接后更新控制台连接选择
    if (data.isActive && data.connId) {
      consoleConnId.value = data.connId;
      onConsoleConnChange();
    }
  } else if (data.nodeType === "database") {
    if (data.connId && data.dbName) {
      router.push({
        path: "/mysql/table",
        query: {connection_id: data.connId, database: data.dbName},
      });
    }
  }
}

async function onTreeNodeExpand(data: TreeNode, node: any) {
  // 展开节点时加载数据库列表
  if (data.nodeType === "connection" && data.isActive && data.connId) {
    await loadDatabasesForNode(data.connId, node);
  }
}

async function loadDatabasesForNode(connId: string, node: any) {
  // 如果已经有子节点且不是 loading，跳过
  const currentChildren = node.data.children;
  if (currentChildren && currentChildren.length > 0 && currentChildren[0]?.nodeType !== "loading") {
    return;
  }

  // 显示 loading
  node.data.children = [{id: `${connId}_loading`, label: "加载中...", nodeType: "loading"}];
  treeData.value = [...treeData.value];

  try {
    const res: any = await listDatabases(connId);
    if (res.code === 0) {
      const dbs: string[] = res.data || [];
      node.data.children = dbs.map((db) => ({
        id: `${connId}_db_${db}`,
        label: db,
        nodeType: "database" as const,
        connId,
        dbName: db,
      }));
    } else {
      node.data.children = [];
    }
  } catch {
    node.data.children = [];
  }
  treeData.value = [...treeData.value];
}

async function refreshDatabases(nodeKey: string) {
  const node = treeRef.value?.getNode(nodeKey);
  if (!node) return;
  if (node.data.nodeType === "connection" && node.data.isActive && node.data.connId) {
    node.data.children = [];
    await loadDatabasesForNode(node.data.connId, node);
    ElMessage.success("已刷新数据库列表");
  }
}

// ==================== 面板拖拽 ====================

function onSplitterMouseDown(e: MouseEvent) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = leftPanelWidth.value;

  function onMouseMove(moveEvent: MouseEvent) {
    const delta = moveEvent.clientX - startX;
    const newWidth = startWidth + delta;
    leftPanelWidth.value = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, newWidth));
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

// ==================== 连接管理 ====================

function showAddForm() {
  isEdit.value = false;
  editIndex.value = -1;
  formData.host = "127.0.0.1";
  formData.port = 3306;
  formData.user = "root";
  formData.password = "";
  formData.charset = "utf8mb4";
  formVisible.value = true;
}

function showEditForm(index: number) {
  isEdit.value = true;
  editIndex.value = index;
  const cfg = savedConfigs.value[index];
  Object.assign(formData, cfg);
  formVisible.value = true;
}

async function saveConfig() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  try {
    debugger
    if (isEdit.value) {
      await updateSavedConfig(editIndex.value, {...formData});
    } else {
      await addSavedConfig({...formData});
    }
    await loadSavedConfigs();
    buildTreeData();
    formVisible.value = false;
    ElMessage.success("配置已保存");
  } catch (e: any) {
    ElMessage.error(e?.message || "保存失败");
  }
}

async function deleteConfig(index: number) {
  try {
    await ElMessageBox.confirm("确定删除该连接配置？", "提示", {type: "warning"});
    await deleteSavedConfig(index);
    await loadSavedConfigs();
    buildTreeData();
    ElMessage.success("已删除");
  } catch {
    // 取消
  }
}

// ==================== 连接操作 ====================

const testing = ref(false);
const connecting = ref(false);

async function handleTest(config: ConnectionConfig) {
  testing.value = true;
  try {
    const res: any = await testConnect(config);
    if (res.code === 0) {
      ElMessage.success(res.msg || res.data?.version_info);
    } else {
      ElMessage.error(res.msg);
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "测试连接失败");
  } finally {
    testing.value = false;
  }
}

async function handleConnect(config: ConnectionConfig) {
  connecting.value = true;
  try {
    const res: any = await connect(config);
    if (res.code === 0) {
      ElMessage.success("连接成功");
      await refreshActiveConnections();
      buildTreeData();
      // 自动选中新连接
      consoleConnId.value = res.data.connection_id;
      await onConsoleConnChange();
    } else {
      ElMessage.error(res.msg);
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "连接失败");
  } finally {
    connecting.value = false;
  }
}

async function handleConnectAndGo(config: ConnectionConfig) {
  connecting.value = true;
  try {
    const res: any = await connect(config);
    if (res.code === 0) {
      ElMessage.success("连接成功");
      await refreshActiveConnections();
      buildTreeData();
      router.push({
        path: "/mysql/database",
        query: {connection_id: res.data.connection_id},
      });
    } else {
      ElMessage.error(res.msg);
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "连接失败");
  } finally {
    connecting.value = false;
  }
}

async function handleDisconnect(connId: string) {
  try {
    await disconnect(connId);
    if (consoleConnId.value === connId) {
      consoleConnId.value = "";
      consoleDatabase.value = "";
      consoleDatabases.value = [];
    }
    ElMessage.success("已断开连接");
    await refreshActiveConnections();
    buildTreeData();
  } catch (e: any) {
    ElMessage.error(e?.message || "断开失败");
  }
}

function enterDatabase(connId: string) {
  router.push({
    path: "/mysql/database",
    query: {connection_id: connId},
  });
}

async function dropDatabase(connId: string, dbName: string) {
  try {
    await ElMessageBox.confirm(`确定要删除数据库 "${dbName}" 吗？`, "危险操作", {
      type: "error",
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
    });
    const {dropDatabase: apiDropDatabase} = await import("@/api/mysql");
    const res: any = await apiDropDatabase(connId, dbName);
    if (res.code === 0) {
      ElMessage.success(res.msg || "删除成功");
      // 刷新对应树节点
      refreshDatabases(`active_${connId}`);
      refreshDatabasesByConnId(connId);
    } else {
      ElMessage.error(res.msg);
    }
  } catch {
    // 取消
  }
}

function refreshDatabasesByConnId(connId: string) {
  // 找到所有匹配已保存连接的节点
  savedConfigs.value.forEach((cfg, idx) => {
    const active = activeConnections.value.find(
      (a) => a.host === cfg.host && a.port === cfg.port && a.user === cfg.user
    );
    if (active?.connection_id === connId) {
      refreshDatabases(`saved_${idx}`);
    }
  });
}

// ==================== 控制台 ====================

async function onConsoleConnChange() {
  consoleDatabase.value = "";
  consoleDatabases.value = [];
  if (!consoleConnId.value) return;

  try {
    const res: any = await listDatabases(consoleConnId.value);
    if (res.code === 0) {
      consoleDatabases.value = res.data || [];
    }
    addConsoleLog("info", `已切换连接: ${consoleConnId.value}`);
  } catch {
    consoleDatabases.value = [];
  }
}

async function executeSql() {
  const sql = sqlInput.value.trim();
  if (!sql) {
    ElMessage.warning("请输入 SQL 语句");
    return;
  }
  if (!consoleConnId.value) {
    ElMessage.warning("请先选择连接");
    return;
  }

  // 记录历史
  sqlHistory.value.unshift(sql);
  if (sqlHistory.value.length > 100) sqlHistory.value.pop();
  historyIdx.value = -1;

  addConsoleLog("sql", sql);
  executing.value = true;

  try {
    const res: any = await apiExecuteSql(
      consoleConnId.value,
      consoleDatabase.value || "",
      sql
    );
    if (res.code === 0) {
      const data = res.data;
      if (data.type === "query") {
        resultType.value = "query";
        resultColumns.value = data.columns || [];
        resultRecords.value = data.records || [];
        resultRowCount.value = data.row_count || 0;
        addConsoleLog("result", `查询成功，返回 ${data.row_count} 行`);
      } else {
        resultType.value = "execute";
        resultAffectedRows.value = data.affected_rows || 0;
        resultMessage.value = data.message || "";
        resultColumns.value = [];
        resultRecords.value = [];
        addConsoleLog("result", data.message || "执行成功");
      }
    } else {
      addConsoleLog("error", res.msg);
      resultType.value = "";
    }
  } catch (e: any) {
    addConsoleLog("error", e?.message || "执行失败");
    resultType.value = "";
  } finally {
    executing.value = false;
  }
}

function clearConsole() {
  sqlInput.value = "";
  resultType.value = "";
  resultColumns.value = [];
  resultRecords.value = [];
  resultMessage.value = "";
}

function addConsoleLog(type: "info" | "error" | "sql" | "result", text: string) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  consoleLogs.value.push({type, text, time});
  // 自动滚动到底部
  nextTick(() => {
    if (logBodyRef.value) {
      logBodyRef.value.scrollTop = logBodyRef.value.scrollHeight;
    }
  });
}

function onConsoleKeydown(e: KeyboardEvent) {
  // Ctrl+Enter 执行
  if (e.ctrlKey && e.key === "Enter") {
    e.preventDefault();
    executeSql();
  }
  // Ctrl+↑↓ 切换历史
  if (e.ctrlKey && e.key === "ArrowUp") {
    e.preventDefault();
    if (historyIdx.value < sqlHistory.value.length - 1) {
      historyIdx.value++;
      sqlInput.value = sqlHistory.value[historyIdx.value];
    }
  }
  if (e.ctrlKey && e.key === "ArrowDown") {
    e.preventDefault();
    if (historyIdx.value > 0) {
      historyIdx.value--;
      sqlInput.value = sqlHistory.value[historyIdx.value];
    } else if (historyIdx.value === 0) {
      historyIdx.value = -1;
      sqlInput.value = "";
    }
  }
}
</script>

<style scoped>
/* ==================== 整体布局 ==================== */
.navicat-container {
  display: flex;
  height: calc(100vh - 100px);
  min-height: 500px;
  overflow: hidden;
  background: #f5f7fa;
}

/* ==================== 左侧面板 ==================== */
.left-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #ebeef5;
  flex-shrink: 0;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
}

.panel-header-actions {
  display: flex;
  gap: 2px;
}

.tree-wrapper {
  flex: 1;
  overflow: auto;
  padding: 4px 0;
}

/* ==================== 树节点 ==================== */
.tree-node-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-conn {
  color: #67c23a;
  font-weight: 500;
}

.active-tag {
  flex-shrink: 0;
  margin-left: auto;
}

.loading-text {
  color: #909399;
  font-style: italic;
}

/* ==================== 右键菜单 ==================== */
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 170px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: background 0.15s;
}

.context-menu-item:hover {
  background: #ecf5ff;
  color: #409eff;
}

.context-menu-item.danger:hover {
  background: #fef0f0;
  color: #f56c6c;
}

.context-menu-divider {
  height: 1px;
  background: #ebeef5;
  margin: 4px 0;
}

/* ==================== 分割线 ==================== */
.splitter {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  flex-shrink: 0;
  transition: background 0.2s;
  position: relative;
}

.splitter:hover {
  background: #409eff;
}

/* ==================== 右侧面板 ==================== */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
  min-width: 400px;
}

.console-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 6px;
  border-bottom: 1px solid #ebeef5;
  flex-wrap: wrap;
  background: #fafafa;
}

.console-sep {
  color: #dcdfe6;
  margin: 0 2px;
}

.console-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.quick-templates {
  padding: 6px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tpl-tag {
  cursor: pointer;
}

.console-editor {
  padding: 0 12px;
}

.sql-textarea :deep(textarea) {
  font-family: "Cascadia Code", "Fira Code", "Consolas", "Monaco", monospace !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
}

.console-result {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 12px;
  min-height: 120px;
  overflow: hidden;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.result-count {
  font-size: 12px;
  color: #67c23a;
  font-weight: 400;
}

.result-body {
  flex: 1;
  overflow: auto;
}

.null-value {
  color: #ccc;
  font-style: italic;
}

.truncate-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #e6a23c;
}

.console-log {
  border-top: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  height: 150px;
  flex-shrink: 0;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.log-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
  font-size: 12px;
  background: #1e1e1e;
  line-height: 1.6;
}

.log-empty {
  color: #888;
}

.log-line {
  padding: 1px 0;
}

.log-time {
  color: #888;
  margin-right: 8px;
}

.log-info {
  color: #4fc3f7;
}

.log-error {
  color: #ef5350;
}

.log-sql {
  color: #a5d6a7;
}

.log-result {
  color: #fff176;
}

/* ==================== 全局 tree 样式覆盖 ==================== */
:deep(.el-tree) {
  background: transparent;
}

:deep(.el-tree-node__content) {
  height: 30px;
  padding-right: 8px;
}

:deep(.el-tree-node__content:hover) {
  background: #f0f5ff;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: #ecf5ff;
}
</style>
