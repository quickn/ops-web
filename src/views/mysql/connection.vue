<template>
  <div class="navicat-container">
    <!-- ==================== 左侧面板：连接树 ==================== -->
    <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
      <div class="panel-header">
        <span><i-ep-connection /> 连接</span>
        <div class="panel-header-actions">
          <el-button size="small" text @click="showAddForm" title="新增连接">
            <i-ep-plus />
          </el-button>
          <el-button size="small" text @click="refreshAll" title="刷新">
            <i-ep-refresh />
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
            <div
              class="tree-node-content"
              @contextmenu.prevent="onTreeContextMenu($event, data, node)"
              @dblclick.stop="onTreeNodeDblClick($event, data)"
            >
              <!-- 连接节点 -->
              <template v-if="data.nodeType === 'connection'">
                <i-ep-connection
                  class="node-icon"
                  :color="data.isActive ? '#67c23a' : '#409eff'"
                />
                <span
                  class="node-label"
                  :class="{ 'active-conn': data.isActive }"
                >
                  {{ data.label }}
                </span>
                <el-tag
                  v-if="data.isActive"
                  size="small"
                  type="success"
                  effect="plain"
                  class="active-tag"
                >
                  已连接
                </el-tag>
              </template>

              <!-- 数据库节点 -->
              <template v-else-if="data.nodeType === 'database'">
                <i-ep-folder />
                <span class="node-label">{{ data.label }}</span>
              </template>

              <!-- 加载中 -->
              <template v-else-if="data.nodeType === 'loading'">
                <i-ep-loading />
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
            <i-ep-link />
            连接
          </div>
          <div
            class="context-menu-item"
            @click="onContextMenuAction('open-database')"
          >
            <i-ep-folder />
            打开数据库
          </div>
          <div
            class="context-menu-item"
            @click="onContextMenuAction('console')"
          >
            <!--            <i-ep-terminal/>-->
            控制台
          </div>
          <div class="context-menu-item" @click="onContextMenuAction('test')">
            <i-ep-connection />
            测试连接
          </div>
          <div
            v-if="contextMenu.isActive"
            class="context-menu-item danger"
            @click="onContextMenuAction('disconnect')"
          >
            <i-ep-switch-button />
            断开连接
          </div>
          <div class="context-menu-divider"></div>
          <div class="context-menu-item" @click="onContextMenuAction('edit')">
            <i-ep-edit />
            编辑
          </div>
          <div
            class="context-menu-item danger"
            @click="onContextMenuAction('delete')"
          >
            <i-ep-delete />
            删除
          </div>
          <div class="context-menu-divider"></div>
          <div
            class="context-menu-item"
            @click="onContextMenuAction('refresh-databases')"
          >
            <i-ep-refresh />
            刷新数据库列表
          </div>
        </template>

        <template v-else-if="contextMenu.nodeType === 'database'">
          <div
            class="context-menu-item"
            @click="onContextMenuAction('open-table')"
          >
            <i-ep-grid />
            打开表
          </div>
          <div
            class="context-menu-item"
            @click="onContextMenuAction('console-db')"
          >
            <!--            <i-ep-terminal/>-->
            控制台
          </div>
          <div class="context-menu-divider"></div>
          <div
            class="context-menu-item danger"
            @click="onContextMenuAction('drop-db')"
          >
            <i-ep-delete />
            删除数据库
          </div>
        </template>
      </div>
    </div>

    <!-- ==================== 新增/编辑连接对话框 ==================== -->
    <el-dialog
      v-model="formVisible"
      :title="isEdit ? '编辑连接' : '新增连接'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="配置名称">
          <el-input
            v-model="formData.configName"
            placeholder="例如：生产数据库"
          />
        </el-form-item>
        <el-form-item label="主机" prop="host">
          <el-input v-model="formData.url" placeholder="127.0.0.1" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number
            v-model="formData.port"
            :min="1"
            :max="65535"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="用户名" prop="user">
          <el-input v-model="formData.username" placeholder="root" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            show-password
            placeholder="输入密码"
          />
        </el-form-item>
        <el-form-item label="字符集">
          <el-select v-model="formData.charset" style="width: 100%">
            <el-option label="utf8mb4" value="utf8mb4" />
            <el-option label="utf8" value="utf8" />
            <el-option label="gbk" value="gbk" />
            <el-option label="latin1" value="latin1" />
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
  connect,
  disconnect,
  listConnections,
  listDatabases,
  testConnect,
} from "@/api/mysql";

import {
  addSavedConfig,
  deleteSavedConfig,
  getSavedConfigs,
  updateSavedConfig,
} from "@/api/accountConfig";

import type { AccountConfig } from "@/api/accountConfig/types";

import type { ConnectionConfig, ConnectionInfo } from "@/api/mysql/types";
import { useRouter } from "vue-router";

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
const treeProps = { children: "children", label: "label" };

const savedConfigs = ref<AccountConfig[]>([]);
const activeConnections = ref<ConnectionInfo[]>([]);

// 面板宽度（可拖拽调整）
const leftPanelWidth = ref(280);
const MIN_PANEL_WIDTH = 220;

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
const formData = reactive<AccountConfig>({
  type: "mysql",
  configName: "",
  url: "127.0.0.1",
  port: 3306,
  username: "root",
  password: "",
  charset: "utf8mb4",
});

const rules = {
  url: [{ required: true, message: "请输入主机地址", trigger: "blur" }],
  port: [{ required: true, message: "请输入端口", trigger: "blur" }],
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
};

// ==================== 右侧面板：控制台 ====================

const consoleConnId = ref("");
const consoleDatabase = ref("");
const consoleDatabases = ref<string[]>([]);

const consoleLogs = ref<
  { type: "info" | "error" | "sql" | "result"; text: string; time: string }[]
>([]);
const logBodyRef = ref();

// ==================== 初始化 ====================

onMounted(async () => {
  await Promise.all([loadSavedConfigs(), refreshActiveConnections()]);
  buildTreeData();
  addConsoleLog(
    "info",
    "SQL 控制台就绪 — Ctrl+Enter 执行SQL | Ctrl+↑↓ 切换历史"
  );
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
    const res: any = await getSavedConfigs({ type: "mysql" });
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
      (a) =>
        a.url === cfg.url && a.port === cfg.port && a.username === cfg.username
    );
    nodes.push({
      id: `saved_${idx}`,
      label: `${cfg.configName}`,
      nodeType: "connection",
      isActive: !!active,
      connId: active?.id || "",
      configIndex: idx,
      config: { ...cfg },
      children: [],
    });
  });

  // 活跃但未保存的连接
  activeConnections.value.forEach((conn) => {
    const hasSaved = savedConfigs.value.some(
      (cfg) =>
        cfg.url === conn.url &&
        cfg.port === conn.port &&
        cfg.username === conn.username
    );
    if (!hasSaved) {
      nodes.push({
        id: `active_${conn.id}`,
        label: `${conn.username}@${conn.url}:${conn.port}`,
        nodeType: "connection",
        isActive: true,
        connId: conn.id,
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
  void _node;
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
  const { nodeId, configIndex, config, dbName } = contextMenu;
  const configId = config?.id;
  switch (action) {
    case "connect":
      if (config) handleConnect(config);
      break;
    case "open-database":
      if (configId) enterDatabase(configId);
      else if (config) handleConnectAndGo(config);
      break;
    case "console":
      if (configId) {
        consoleConnId.value = configId;
        onConsoleConnChange();
      } else if (config) {
        // 直接去独立控制台页
        router.push({ path: "/mysql/console" });
      }
      break;
    case "test":
      if (config) handleTest(config);
      break;
    case "disconnect":
      if (configId) handleDisconnect(configId);
      break;
    case "edit":
      if (configIndex >= 0) showEditForm(configIndex);
      break;
    case "delete":
      if (configIndex >= 0) deleteConfig(configId);
      break;
    case "refresh-databases":
      if (configIndex >= 0) refreshDatabases(`saved_${configIndex}`);
      else if (configId) refreshDatabases(nodeId);
      break;
    case "open-table":
      open_table(configId, dbName);
      break;
    case "console-db":
      if (configId && dbName) {
        consoleConnId.value = configId;
        consoleDatabase.value = dbName;
        onConsoleConnChange();
      }
      break;
    case "drop-db":
      if (configId && dbName) dropDatabase(configId, dbName);
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
      //onConsoleConnChange();
      open_table(data.connId, data.dbName);
    }
  } else if (data.nodeType === "database") {
    open_table(data.connId, data.dbName);
  }
}

/** 双击树节点 */
function onTreeNodeDblClick(_event: MouseEvent, data: TreeNode) {
  const connId = data.config?.id;
  if (data.nodeType === "connection") {
    if (data.isActive && connId) {
      // 已连接，直接跳转 table 页
      open_table(connId, "");
    } else if (data.config) {
      // 未连接，先连接再跳转
      handleConnectAndGoToTable(data.config);
    }
  } else if (data.nodeType === "database") {
    open_table(connId, data.dbName);
  }
}

function open_table(connId, dbName) {
  if (dbName === undefined) {
    dbName = "";
  }
  const conn = activeConnections.value.find((c) => c.id === connId);
  if (conn === undefined) {
    return;
  }
  router.push({
    path: "/mysql/table",
    query: {
      connection_id: connId,
      database: dbName,
      configName: conn?.configName || "",
    },
  });
}

/** 连接并跳转到 table 页 */
async function handleConnectAndGoToTable(config: ConnectionConfig) {
  connecting.value = true;
  try {
    await connect(config);
    ElMessage.success("连接成功");
    await refreshActiveConnections();
    buildTreeData();
    open_table(config.id, "");
  } catch (e: any) {
    ElMessage.error(e?.message || "连接失败");
  } finally {
    connecting.value = false;
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
  if (
    currentChildren &&
    currentChildren.length > 0 &&
    currentChildren[0]?.nodeType !== "loading"
  ) {
    return;
  }

  // 显示 loading
  node.data.children = [
    { id: `${connId}_loading`, label: "加载中...", nodeType: "loading" },
  ];
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
  if (
    node.data.nodeType === "connection" &&
    node.data.isActive &&
    node.data.connId
  ) {
    node.data.children = [];
    await loadDatabasesForNode(node.data.connId, node);
    ElMessage.success("已刷新数据库列表");
  }
}

// ==================== 连接管理 ====================

function showAddForm() {
  isEdit.value = false;
  editIndex.value = -1;
  formData.configName = "";
  formData.url = "127.0.0.1";
  formData.port = 3306;
  formData.username = "root";
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
    if (isEdit.value) {
      await updateSavedConfig({ ...formData });
    } else {
      await addSavedConfig({ ...formData });
    }
    await loadSavedConfigs();
    buildTreeData();
    formVisible.value = false;
    ElMessage.success("配置已保存");
  } catch (e: any) {
    ElMessage.error(e?.message || "保存失败");
  }
}

async function deleteConfig(configId: number) {
  try {
    await ElMessageBox.confirm("确定删除该连接配置？", "提示", {
      type: "warning",
    });
    await deleteSavedConfig(configId);
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
    ElMessage.success("连接成功");
    await refreshActiveConnections();
    buildTreeData();
    // 自动选中新连接
    consoleConnId.value = res.data.connection_id;
    await onConsoleConnChange();
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
    ElMessage.success("连接成功");
    await refreshActiveConnections();
    buildTreeData();
    router.push({
      path: "/mysql/database",
      query: { connection_id: res.data.connection_id },
    });
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
  const conn = activeConnections.value.find((c) => c.id === connId);
  router.push({
    path: "/mysql/database",
    query: {
      connection_id: connId,
      service_name: conn?.configName || "",
    },
  });
}

async function dropDatabase(connId: string, dbName: string) {
  try {
    await ElMessageBox.confirm(
      `确定要删除数据库 "${dbName}" 吗？`,
      "危险操作",
      {
        type: "error",
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
      }
    );
    const { dropDatabase: apiDropDatabase } = await import("@/api/mysql");
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
      (a) =>
        a.url === cfg.url && a.port === cfg.port && a.username === cfg.username
    );
    if (active?.id === connId) {
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

function addConsoleLog(
  type: "info" | "error" | "sql" | "result",
  text: string
) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  consoleLogs.value.push({ type, text, time });
  // 自动滚动到底部
  nextTick(() => {
    if (logBodyRef.value) {
      logBodyRef.value.scrollTop = logBodyRef.value.scrollHeight;
    }
  });
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
  flex-shrink: 0;
  overflow: hidden;
  background: #fff;
  border-right: 1px solid #ebeef5;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.panel-header-actions {
  display: flex;
  gap: 2px;
}

.tree-wrapper {
  flex: 1;
  padding: 4px 0;
  overflow: auto;
}

/* ==================== 树节点 ==================== */
.tree-node-content {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 2px 0;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-icon {
  flex-shrink: 0;
  font-size: 16px;
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
  font-weight: 500;
  color: #67c23a;
}

.active-tag {
  flex-shrink: 0;
  margin-left: auto;
}

.loading-text {
  font-style: italic;
  color: #909399;
}

/* ==================== 右键菜单 ==================== */
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 170px;
  padding: 4px 0;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 12%);
}

.context-menu-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 7px 16px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: background 0.15s;
}

.context-menu-item:hover {
  color: #409eff;
  background: #ecf5ff;
}

.context-menu-item.danger:hover {
  color: #f56c6c;
  background: #fef0f0;
}

.context-menu-divider {
  height: 1px;
  margin: 4px 0;
  background: #ebeef5;
}

/* ==================== 分割线 ==================== */
.splitter {
  position: relative;
  flex-shrink: 0;
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s;
}

.splitter:hover {
  background: #409eff;
}

/* ==================== 右侧面板 ==================== */
.right-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 400px;
  overflow: hidden;
  background: #fff;
}

.console-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.console-sep {
  margin: 0 2px;
  color: #dcdfe6;
}

.console-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.quick-templates {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 12px;
}

.tpl-tag {
  cursor: pointer;
}

.console-editor {
  padding: 0 12px;
}

.sql-textarea :deep(textarea) {
  font-family: "Cascadia Code", "Fira Code", Consolas, Monaco, monospace !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
}

.console-result {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 120px;
  padding: 0 12px;
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
  font-weight: 400;
  color: #67c23a;
}

.result-body {
  flex: 1;
  overflow: auto;
}

.null-value {
  font-style: italic;
  color: #ccc;
}

.truncate-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #e6a23c;
}

.console-log {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 150px;
  border-top: 1px solid #ebeef5;
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
  padding: 8px 12px;
  overflow-y: auto;
  font-family: "Cascadia Code", "Fira Code", Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  background: #1e1e1e;
}

.log-empty {
  color: #888;
}

.log-line {
  padding: 1px 0;
}

.log-time {
  margin-right: 8px;
  color: #888;
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
