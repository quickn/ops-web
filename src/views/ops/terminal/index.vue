<script setup lang="ts">
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";

import { useRouter } from "vue-router";

import { getByType } from "@/api/accountConfig";

import { listAll as listServices } from "@/api/monitor/service";

import type { AccountConfig } from "@/api/accountConfig/types";
import type { ServiceInfo } from "@/api/monitor/service/types";

import { getApiBaseUrlPy } from "@/utils/api-config";

// @ts-ignore - zmodem.js is CJS module
import Zmodem from "zmodem.js";
import { createZmodemManager } from "./zmodem-manager";

defineOptions({
  name: "Terminal",
  inheritAttrs: false,
});

const router = useRouter();

const serviceOptions = ref<ServiceInfo[]>([]);

const loading = ref(false);
const connecting = ref(false);
const collapseLeft = ref(false);

let selectedServiceId = ref<number | null>(null);

const dialog = reactive<DialogOption>({
  visible: false,
});

const configList = ref<AccountConfig[]>([]);
const activeConfig = ref<AccountConfig | null>(null);

/** xterm 实例 */
let term: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let socket: WebSocket | null = null;
let zmManager: ReturnType<typeof createZmodemManager> | null = null;

/** ZMODEM 传输进度 */
const zmProgress = reactive({
  visible: false,
  fileName: "",
  percentage: 0,
  receivedText: "",
  isUpload: false, // 是否为上传（rz），用于显示取消按钮
});

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
  if (zmManager) {
    zmManager.destroy();
    zmManager = null;
  }
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

  let wsBase = getApiBaseUrlPy();

  const wsUrl = `${wsBase}/terminal/ws?configId=${encodeURIComponent(
    config.id
  )}`;
  socket = new WebSocket(wsUrl);
  socket.binaryType = "arraybuffer";

  // 创建 ZMODEM 管理器（用于 rz/sz 文件传输）
  if (zmManager) zmManager.destroy();
  zmManager = createZmodemManager({
    writeToTerminal: (data: Uint8Array) => term?.write(data),
    sendToSocket: (data: Uint8Array) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(data);
      }
    },
    onProgress: (
      pct: number,
      name: string,
      received: number,
      total: number,
      isUpload: boolean
    ) => {
      zmProgress.visible = true;
      zmProgress.fileName = name;
      zmProgress.percentage = pct;
      zmProgress.receivedText = `${formatBytes(received)} / ${formatBytes(
        total
      )}`;
      zmProgress.isUpload = isUpload;
      if (pct >= 100) {
        setTimeout(() => (zmProgress.visible = false), 2000);
      }
    },
    onTransferComplete: () => {
      ElMessage.success("ZMODEM 传输完成");
    },
  });

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
    // 通过 ZModem 管理器处理入站数据
    // 管理器自动检测 ZMODEM 协议并分流：普通数据→终端，文件数据→下载/上传
    if (zmManager && event.data) {
      zmManager.processIncoming(event.data);
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
  if (zmManager) {
    zmManager.destroy();
    zmManager = null;
  }
  connecting.value = false;
  activeConfig.value = null;
}

/** 取消当前 ZMODEM 上传 */
function cancelUpload() {
  if (zmManager) {
    zmManager.cancelUpload();
    zmProgress.visible = false;
  }
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

/** 点击配置卡片连接 */
function handleConnect(config: AccountConfig) {
  connect(config);
}

/** 跳转到账号配置管理页面 */
function handleGoAccountConfig() {
  const allRoutes = router.getRoutes();
  const targetRoute = allRoutes.find((r) =>
    r.path.toLowerCase().includes("accountconfig")
  );
  if (targetRoute) {
    router.push(targetRoute.path);
  } else {
    router.push("/ops/accountConfig");
  }
}

/** 格式化字节数 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + " " + units[i];
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
          <el-button type="primary" size="small" @click="handleGoAccountConfig">
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

      <!-- ZMODEM 传输进度条 -->
      <div v-if="zmProgress.visible" class="zm-progress-bar">
        <div class="zm-progress-info">
          <span class="zm-progress-name">{{ zmProgress.fileName }}</span>
          <span class="zm-progress-right">
            <span class="zm-progress-text">{{ zmProgress.percentage }}%</span>
            <el-button
              v-if="zmProgress.isUpload"
              type="danger"
              size="small"
              text
              @click="cancelUpload"
              title="取消上传"
            >
              取消
            </el-button>
          </span>
        </div>
        <el-progress
          :percentage="zmProgress.percentage"
          :stroke-width="8"
          :show-text="false"
          color="#67c23a"
        />
        <div class="zm-progress-detail">{{ zmProgress.receivedText }}</div>
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
  </div>
</template>

<style scoped>
.terminal-page {
  display: flex;
  height: calc(100vh);
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

/* ZMODEM 进度条 */
.zm-progress-bar {
  padding: 8px 16px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  .zm-progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .zm-progress-name {
    overflow: hidden;
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .zm-progress-right {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 8px;
    margin-left: 12px;

    .zm-progress-text {
      font-size: 12px;
      font-weight: 600;
      color: #67c23a;
    }
  }

  .zm-progress-detail {
    margin-top: 2px;
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }
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
