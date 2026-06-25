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

const configList = ref<AccountConfig[]>([]);
const activeConfig = ref<AccountConfig | null>(null);

/** 终端会话类型 */
interface TerminalSession {
  id: string;
  config: AccountConfig;
  term: Terminal | null;
  fitAddon: FitAddon | null;
  socket: WebSocket | null;
  zmManager: ReturnType<typeof createZmodemManager> | null;
  progress: {
    visible: boolean;
    fileName: string;
    percentage: number;
    receivedText: string;
    isUpload: boolean;
  };
  heartbeatTimer?: number; // 心跳定时器
  lastActivityTime?: number; // 最后活动时间
}

/** 所有终端会话 */
const sessions = ref<TerminalSession[]>([]);
/** 当前激活的会话 ID */
const activeSessionId = ref<string | null>(null);
/** 终端容器引用映射 */
const terminalRefs = new Map<string, HTMLDivElement>();

/** 获取当前会话 */
const currentSession = computed(() => {
  return sessions.value.find(s => s.id === activeSessionId.value) || null;
});

/** xterm 实例（兼容旧代码） */
const term = computed(() => currentSession.value?.term || null);
const fitAddon = computed(() => currentSession.value?.fitAddon || null);
const socket = computed(() => currentSession.value?.socket || null);
const zmManager = computed(() => currentSession.value?.zmManager || null);

/** ZMODEM 传输进度（兼容旧代码） */
const zmProgress = computed(() => {
  return currentSession.value?.progress || {
    visible: false,
    fileName: "",
    percentage: 0,
    receivedText: "",
    isUpload: false,
  };
});

const terminalRef = ref<HTMLDivElement>();

/** 生成唯一会话 ID */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** 初始化终端 */
function initTerminal(session: TerminalSession) {
  const container = terminalRefs.get(session.id);
  if (!container || session.term) return;

  const newTerm = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: "#000",
      foreground: "#d4d4d4",
      cursor: "#ffffff",
      selectionBackground: "#264f78",
    },
    allowProposedApi: true,
  });

  const newFitAddon = new FitAddon();
  newTerm.loadAddon(newFitAddon);
  newTerm.loadAddon(new WebLinksAddon());

  newTerm.open(container);
  newFitAddon.fit();

  session.term = newTerm;
  session.fitAddon = newFitAddon;

  // 监听终端输入发送到后端
  newTerm.onData((data) => {
    if (session.socket && session.socket.readyState === WebSocket.OPEN) {
      session.socket.send(data);
    }
  });

  // 终端尺寸变化时通知后端
  newTerm.onResize(({ cols, rows }) => {
    if (session.socket && session.socket.readyState === WebSocket.OPEN) {
      //session.socket.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  });

  window.addEventListener("resize", () => {
    newFitAddon.fit();
    sendResize(session);
  });
}

/** 通知后端终端尺寸 */
function sendResize(session: TerminalSession) {
  if (session.term && session.socket && session.socket.readyState === WebSocket.OPEN) {
    // session.socket.send(
    //   JSON.stringify({ type: "resize", cols: session.term.cols, rows: session.term.rows })
    // );
  }
}

/** 销毁单个会话 */
function disposeSession(session: TerminalSession) {
  disconnectSession(session);
  if (session.zmManager) {
    session.zmManager.destroy();
    session.zmManager = null;
  }
  if (session.term) {
    session.term.dispose();
    session.term = null;
    session.fitAddon = null;
  }
}

/** 建立 WebSocket 连接 */
function connect(config: AccountConfig) {
  if (!config.id) {
    ElMessage.warning("配置信息不完整");
    return;
  }

  // 创建新会话
  const sessionId = generateSessionId();
  const newSession: TerminalSession = {
    id: sessionId,
    config,
    term: null,
    fitAddon: null,
    socket: null,
    zmManager: null,
    progress: {
      visible: false,
      fileName: "",
      percentage: 0,
      receivedText: "",
      isUpload: false,
    },
  };

  sessions.value.push(newSession);
  activeSessionId.value = sessionId;

  // 等待 DOM 更新后初始化终端
  nextTick(() => {
    initTerminal(newSession);
    establishConnection(newSession);
  });
}

/** 建立连接的具体逻辑 */
function establishConnection(session: TerminalSession) {
  const config = session.config;

  if (!session.term) {
    initTerminal(session);
  } else {
    // 复用已有终端时重新适配尺寸
    nextTick(() => {
      session.fitAddon?.fit();
      session.term?.focus();
    });
  }

  connecting.value = true;
  activeConfig.value = config;

  // 构建 WebSocket URL
  const wsBase = getApiBaseUrlPy();
  const wsUrl = `${wsBase}/terminal/ws?configId=${encodeURIComponent(
    config.id
  )}`;
  
  session.socket = new WebSocket(wsUrl);
  session.socket.binaryType = "arraybuffer";

  // 创建 ZMODEM 管理器（用于 rz/sz 文件传输）
  if (session.zmManager) session.zmManager.destroy();
  session.zmManager = createZmodemManager({
    writeToTerminal: (data: Uint8Array) => session.term?.write(data),
    sendToSocket: (data: Uint8Array) => {
      if (session.socket && session.socket.readyState === WebSocket.OPEN) {
        session.socket.send(data);
      }
    },
    getBufferedAmount: () => {
      return session.socket?.bufferedAmount || 0;
    },
    onProgress: (
      pct: number,
      name: string,
      received: number,
      total: number,
      isUpload: boolean
    ) => {
      session.progress.visible = true;
      session.progress.fileName = name;
      session.progress.percentage = pct;
      session.progress.receivedText = `${formatBytes(received)} / ${formatBytes(total)}`;
      session.progress.isUpload = isUpload;
      if (pct >= 100) {
        setTimeout(() => (session.progress.visible = false), 2000);
      }
    },
    onTransferComplete: () => {
      ElMessage.success("ZMODEM 传输完成");
    },
  });

  session.socket.onopen = () => {
    connecting.value = false;
    if (session.term) {
      session.term.clear();
      // 延迟聚焦和适配尺寸，等待 DOM 完全更新
      nextTick(() => {
        session.fitAddon?.fit();
        session.term?.focus();
        // 通知后端终端尺寸
        sendResize(session);
      });
    }
    
    // 启动心跳保活机制
    startHeartbeat(session);
    
    ElMessage.success("已连接到 " + config.configName);
  };

  session.socket.onmessage = (event) => {
    // 更新最后活动时间
    session.lastActivityTime = Date.now();
    
    // 通过 ZModem 管理器处理入站数据
    // 管理器自动检测 ZMODEM 协议并分流：普通数据→终端，文件数据→下载/上传
    if (session.zmManager && event.data) {
      session.zmManager.processIncoming(event.data);
    }
  };

  session.socket.onerror = () => {
    connecting.value = false;
    stopHeartbeat(session);
    ElMessage.error("连接失败");
  };

  session.socket.onclose = () => {
    connecting.value = false;
    stopHeartbeat(session);
    if (session.term) {
      session.term.writeln("\r\n\x1b[33m会话已断开\x1b[0m");
    }
  };
}

/** 断开指定会话连接 */
function disconnectSession(session: TerminalSession) {
  stopHeartbeat(session);
  if (session.socket) {
    session.socket.close();
    session.socket = null;
  }
  if (session.zmManager) {
    session.zmManager.destroy();
    session.zmManager = null;
  }
  connecting.value = false;
  if (activeConfig.value?.id === session.config.id) {
    activeConfig.value = null;
  }
}

/** 关闭会话 */
function closeSession(sessionId: string) {
  const index = sessions.value.findIndex(s => s.id === sessionId);
  if (index === -1) return;

  const session = sessions.value[index];
  disposeSession(session);
  sessions.value.splice(index, 1);

  // 如果关闭的是当前会话，切换到其他会话
  if (activeSessionId.value === sessionId) {
    if (sessions.value.length > 0) {
      activeSessionId.value = sessions.value[Math.max(0, index - 1)].id;
    } else {
      activeSessionId.value = null;
      activeConfig.value = null;
    }
  }
}

/** 切换会话 */
function switchSession(sessionId: string) {
  activeSessionId.value = sessionId;
  nextTick(() => {
    const session = sessions.value.find(s => s.id === sessionId);
    if (session) {
      session.fitAddon?.fit();
      session.term?.focus();
    }
  });
}

/** 断开当前会话连接 */
function disconnect() {
  if (currentSession.value) {
    disconnectSession(currentSession.value);
  }
}

/** 取消当前 ZMODEM 上传 */
function cancelUpload() {
  if (currentSession.value && currentSession.value.zmManager) {
    currentSession.value.zmManager.cancelUpload();
    currentSession.value.progress.visible = false;
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

/** 启动心跳保活机制 */
function startHeartbeat(session: TerminalSession) {
  // 初始化最后活动时间
  session.lastActivityTime = Date.now();
  
  // 清除旧的心跳定时器（如果存在）
  if (session.heartbeatTimer) {
    clearInterval(session.heartbeatTimer);
  }
  
  // 每30秒发送一次心跳
  session.heartbeatTimer = window.setInterval(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - (session.lastActivityTime || 0);
    
    // 检查连接状态
    if (!session.socket || session.socket.readyState !== WebSocket.OPEN) {
      stopHeartbeat(session);
      return;
    }
    
    // 超过60秒无活动，发送空字符串维持连接
    if (timeSinceLastActivity >= 60000) {
      try {
        session.socket.send('');
        session.lastActivityTime = now;
      } catch (error) {
        console.warn('心跳发送失败:', error);
        stopHeartbeat(session);
      }
    }
  }, 30000);
}

/** 停止心跳保活机制 */
function stopHeartbeat(session: TerminalSession) {
  if (session.heartbeatTimer) {
    clearInterval(session.heartbeatTimer);
    session.heartbeatTimer = undefined;
  }
}

/** 组件挂载 */
onMounted(() => {
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
  // 销毁所有会话
  sessions.value.forEach(session => {
    stopHeartbeat(session);
    disposeSession(session);
  });
  sessions.value = [];
  window.removeEventListener("resize", () => {});
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
            :class="{ active: currentSession?.config.id === config.id }"
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
      <!-- 会话标签页 -->
      <div v-if="sessions.length > 0" class="session-tabs">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-tab"
          :class="{ active: activeSessionId === session.id }"
          @click="switchSession(session.id)"
        >
          <span class="tab-name">{{ session.config.configName }}</span>
          <span class="tab-close" @click.stop="closeSession(session.id)">
            <i-ep-close />
          </span>
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

      <!-- 所有终端容器 -->
      <div
        v-for="session in sessions"
        :key="session.id"
        v-show="activeSessionId === session.id"
        class="terminal-container"
        :ref="(el: any) => { if (el) terminalRefs.set(session.id, el as HTMLDivElement) }"
      />

      <!-- 未连接时的占位提示 -->
      <div v-if="sessions.length === 0" class="terminal-placeholder">
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

/* 会话标签页 */
.session-tabs {
  display: flex;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  overflow-x: auto;
  overflow-y: hidden;
}

.session-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  border-right: 1px solid var(--el-border-color-lighter);
  transition: background 0.15s;
  user-select: none;
  min-width: 120px;
  max-width: 200px;
}

.session-tab:hover {
  background: var(--el-fill-color-light);
}

.session-tab.active {
  background: var(--el-color-primary-light-9);
  border-bottom: 2px solid var(--el-color-primary);
}

.tab-name {
  flex: 1;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  opacity: 0.6;
  transition: all 0.15s;
}

.tab-close:hover {
  opacity: 1;
  background: var(--el-fill-color);
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
  background-color: #000;
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
