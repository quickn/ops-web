<script setup lang="ts">
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

import {
  addSavedConfig,
  deleteSavedConfig,
  getByType,
  updateSavedConfig,
} from "@/api/accountConfig";

import { listAll as listServices } from "@/api/monitor/service";

import type { AccountConfig } from "@/api/accountConfig/types";
import type { ServiceInfo } from "@/api/monitor/service/types";

defineOptions({
  name: "Terminal",
  inheritAttrs: false,
});

const serviceOptions = ref<ServiceInfo[]>([]);

const configFormRef = ref(ElForm);

const loading = ref(false);
const connecting = ref(false);
const collapseLeft = ref(false);

let selectedServiceId = ref<string | null>(null);

const dialog = reactive<DialogOption>({
  visible: false,
});

const configList = ref<AccountConfig[]>([]);
const activeConfig = ref<AccountConfig | null>(null);

const formData = reactive<AccountConfig>({
  type: "SSH",
  configName: "",
  url: "",
  port: 22,
  username: "",
  password: "",
});

const rules = reactive({
  configName: [
    { required: true, message: "配置名称不能为空", trigger: "blur" },
  ],
  url: [{ required: true, message: "主机地址不能为空", trigger: "blur" }],
  port: [{ required: true, message: "端口不能为空", trigger: "blur" }],
  username: [{ required: true, message: "用户名不能为空", trigger: "blur" }],
  password: [{ required: true, message: "密码不能为空", trigger: "blur" }],
});

/** xterm 实例 */
let term: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let socket: WebSocket | null = null;

const terminalRef = ref<HTMLDivElement>();

/** 初始化终端 */
function initTerminal() {
  if (!terminalRef.value || term) return;

  term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: "#1e1e1e",
      foreground: "#d4d4d4",
      cursor: "#ffffff",
      selectionBackground: "#264f78",
    },
    allowProposedApi: true,
  });

  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon());

  term.open(terminalRef.value);
  fitAddon.fit();

  // 监听终端输入发送到后端
  term.onData((data) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  });

  // 终端尺寸变化时通知后端
  term.onResize(({ cols, rows }) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      //socket.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  });

  window.addEventListener("resize", () => {
    fitAddon?.fit();
    sendResize();
  });
}

/** 通知后端终端尺寸 */
function sendResize() {
  if (term && socket && socket.readyState === WebSocket.OPEN) {
    // socket.send(
    //   JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows })
    // );
  }
}

/** 销毁终端 */
function disposeTerminal() {
  disconnect();
  if (term) {
    term.dispose();
    term = null;
    fitAddon = null;
  }
}

/** 建立 WebSocket 连接 */
function connect(config: AccountConfig) {
  if (!config.id) {
    ElMessage.warning("配置信息不完整");
    return;
  }

  // 先断开旧连接
  disconnect();

  if (!term) {
    initTerminal();
  } else {
    // 复用已有终端时重新适配尺寸
    nextTick(() => {
      fitAddon?.fit();
      term?.focus();
    });
  }

  connecting.value = true;
  activeConfig.value = config;

  // 构建 WebSocket URL
  // 开发环境直连 Python 后端，生产环境通过同域代理
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const isDev = import.meta.env.DEV;
  debugger;

  let wsBase: string;
  if (isDev) {
    // 开发环境：直接连接 Python 后端（Vite 代理对 WS 需要额外配置 ws:true）
    const pyTarget =
      import.meta.env.VITE_APP_TARGET_URL_PY || "http://localhost:18080";
    wsBase = pyTarget.replace(/^https?:/, wsProtocol).replace(/\/$/, "");
  } else {
    // 生产环境：通过 nginx 同域代理
    wsBase = `${wsProtocol}//${window.location.host}`;
  }

  const wsUrl = `${wsBase}/terminal/ws?configId=${encodeURIComponent(
    config.id
  )}`;
  socket = new WebSocket(wsUrl);
  socket.binaryType = "arraybuffer";

  socket.onopen = () => {
    connecting.value = false;
    if (term) {
      term.clear();
      // 延迟聚焦和适配尺寸，等待 DOM 完全更新
      nextTick(() => {
        fitAddon?.fit();
        term?.focus();
        // 通知后端终端尺寸
        sendResize();
      });
    }
    ElMessage.success("已连接到 " + config.configName);
  };

  socket.onmessage = (event) => {
    if (term) {
      if (typeof event.data === "string") {
        term.write(event.data);
      } else {
        // 二进制数据（ArrayBuffer）转为 Uint8Array 写入
        term.write(new Uint8Array(event.data));
      }
    }
  };

  socket.onerror = () => {
    connecting.value = false;
    ElMessage.error("连接失败");
  };

  socket.onclose = () => {
    connecting.value = false;
    if (term) {
      term.writeln("\r\n\x1b[33m会话已断开\x1b[0m");
    }
  };
}

/** 断开连接 */
function disconnect() {
  if (socket) {
    socket.close();
    socket = null;
  }
  connecting.value = false;
  activeConfig.value = null;
}

/** 查询 SSH 配置列表 */
function handleQuery() {
  loading.value = true;
  getByType("SSH")
    .then(({ data }) => {
      let configs = data || [];
      // 按服务筛选
      if (selectedServiceId.value) {
        configs = configs.filter(
          (c: AccountConfig) => c.serviceId === selectedServiceId.value
        );
      }
      configList.value = configs;
      loading.value = false;
    })
    .catch(() => {
      loading.value = false;
    });
}

/** 打开弹窗 */
function openDialog(configId?: number) {
  dialog.visible = true;
  if (configId) {
    dialog.title = "编辑配置";
    const cfg = configList.value.find((c) => c.id === configId);
    if (cfg) {
      Object.assign(formData, cfg);
    }
  } else {
    dialog.title = "新增配置";
    resetForm();
  }
}

/** 表单提交 */
function handleSubmit() {
  configFormRef.value.validate((valid: boolean) => {
    if (valid) {
      const configId = formData.id;
      loading.value = true;
      const payload = { ...formData, type: "SSH" };
      if (configId) {
        updateSavedConfig(payload)
          .then(() => {
            ElMessage.success("修改成功");
            closeDialog();
            handleQuery();
          })
          .finally(() => (loading.value = false));
      } else {
        addSavedConfig(payload)
          .then(() => {
            ElMessage.success("新增成功");
            closeDialog();
            handleQuery();
          })
          .finally(() => (loading.value = false));
      }
    }
  });
}

/** 删除配置 */
function handleDelete(configId: number) {
  ElMessageBox.confirm("确认删除该配置?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      await deleteSavedConfig(configId);
      ElMessage.success("删除成功");
      // 如果删除的是当前连接的配置，断开连接
      if (activeConfig.value?.id === configId) {
        disconnect();
      }
      handleQuery();
    } catch {
      ElMessage.error("删除失败");
    }
  });
}

/** 关闭弹窗 */
function closeDialog() {
  dialog.visible = false;
}

/** 重置表单 */
function resetForm() {
  configFormRef.value?.resetFields();
  formData.id = undefined;
  formData.configName = "";
  formData.url = "";
  formData.port = 22;
  formData.username = "";
  formData.password = "";
}

/** 点击配置卡片连接 */
function handleConnect(config: AccountConfig) {
  connect(config);
}

/** 组件挂载 */
onMounted(() => {
  initTerminal();
  loadServiceOptions();
  handleQuery();
});

/** 加载服务下拉选项 */
async function loadServiceOptions() {
  try {
    const res: any = await listServices();
    serviceOptions.value = res.data || [];
  } catch {
    serviceOptions.value = [];
  }
}

/** 组件卸载 */
onUnmounted(() => {
  disposeTerminal();
  window.removeEventListener("resize", () => fitAddon?.fit());
});
</script>

<template>
  <div class="terminal-page">
    <!-- 左侧配置面板 -->
    <div class="left-panel" :class="{ collapsed: collapseLeft }">
      <div class="panel-header">
        <span v-show="!collapseLeft" class="panel-title">SSH 连接配置</span>
        <el-button
          :icon="collapseLeft ? 'i-ep-d-arrow-right' : 'i-ep-d-arrow-left'"
          text
          size="small"
          @click="collapseLeft = !collapseLeft"
        />
      </div>

      <template v-if="!collapseLeft">
        <div class="panel-toolbar">
          <el-select
            v-model="selectedServiceId"
            placeholder="选择服务"
            clearable
            filterable
            size="small"
            class="service-select"
            @change="handleQuery"
          >
            <el-option
              v-for="item in serviceOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
          <el-button type="primary" size="small" @click="openDialog(undefined)">
            <i-ep-plus />
            新增
          </el-button>
          <el-button size="small" @click="handleQuery">
            <i-ep-refresh />
          </el-button>
        </div>

        <div class="config-list" v-loading="loading">
          <div
            v-for="config in configList"
            :key="config.id"
            class="config-item"
            :class="{ active: activeConfig?.id === config.id }"
            @click="handleConnect(config)"
          >
            <div class="config-info">
              <div class="config-name">{{ config.configName }}</div>
              <div class="config-addr">
                {{ config.username }}@{{ config.url }}:{{ config.port }}
              </div>
            </div>
            <div class="config-actions">
              <el-button text size="small" @click.stop="openDialog(config.id)">
                <i-ep-edit />
              </el-button>
              <el-button
                text
                size="small"
                @click.stop="handleDelete(config.id!)"
              >
                <i-ep-delete />
              </el-button>
            </div>
          </div>

          <el-empty
            v-if="!loading && configList.length === 0"
            description="暂无 SSH 配置，请先新增"
            :image-size="80"
          />
        </div>
      </template>
    </div>

    <!-- 右侧终端区域 -->
    <div class="right-panel">
      <div class="terminal-toolbar">
        <div class="connection-info">
          <template v-if="activeConfig">
            <el-tag type="success" size="small">
              {{ activeConfig.configName }}
            </el-tag>
            <span class="addr-text">
              {{ activeConfig.username }}@{{ activeConfig.url }}:{{
                activeConfig.port
              }}
            </span>
          </template>
          <span v-else class="no-connection">未连接</span>
        </div>
        <div class="terminal-actions">
          <el-button
            v-if="activeConfig"
            type="danger"
            size="small"
            :loading="connecting"
            @click="disconnect"
          >
            断开
          </el-button>
          <el-button
            v-if="activeConfig"
            size="small"
            @click="connect(activeConfig)"
            :loading="connecting"
          >
            重连
          </el-button>
          <el-tooltip content="清屏" placement="bottom">
            <el-button text size="small" @click="term?.clear()">
              <i-ep-delete />
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <div class="terminal-container" ref="terminalRef" />

      <!-- 未连接时的占位提示 -->
      <div v-if="!activeConfig && !connecting" class="terminal-placeholder">
        <div class="placeholder-content">
          <i-ep-monitor style="font-size: 48px; color: #909399" />
          <p>请在左侧选择一个 SSH 配置来建立连接</p>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      width="520px"
      @closed="closeDialog"
    >
      <el-form
        ref="configFormRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="配置名称" prop="configName">
          <el-input
            v-model="formData.configName"
            placeholder="例如：生产服务器"
          />
        </el-form-item>
        <el-form-item label="主机地址" prop="url">
          <el-input v-model="formData.url" placeholder="192.168.1.100" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number
            v-model="formData.port"
            :min="1"
            :max="65535"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
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
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" @click="handleSubmit">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.terminal-page {
  display: flex;
  height: calc(100vh - 120px);
  overflow: hidden;
}

/* 左侧面板 */
.left-panel {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 280px;
  min-width: 48px;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  transition: width 0.2s ease;
}

.left-panel.collapsed {
  width: 48px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.panel-toolbar {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.service-select {
  flex: 1;
  min-width: 0;
}

.config-list {
  flex: 1;
  padding: 4px;
  overflow-y: auto;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin-bottom: 2px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.config-item:hover {
  background: var(--el-fill-color-light);
}

.config-item.active {
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-5);
}

.config-info {
  flex: 1;
  min-width: 0;
}

.config-name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-addr {
  margin-top: 2px;
  overflow: hidden;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-actions {
  display: flex;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.config-item:hover .config-actions {
  opacity: 1;
}

.config-item.active .config-actions {
  opacity: 1;
}

/* 右侧终端 */
.right-panel {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.terminal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  padding: 8px 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
}

.connection-info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.addr-text {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.no-connection {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.terminal-actions {
  display: flex;
  gap: 4px;
}

.terminal-container {
  flex: 1;
  padding: 4px 8px;
  overflow: hidden;
}

.terminal-placeholder {
  position: absolute;
  inset: 40px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.placeholder-content {
  color: var(--el-text-color-placeholder);
  text-align: center;
}

.placeholder-content p {
  margin-top: 12px;
  font-size: 14px;
}
</style>
