<script setup lang="ts">
import {
  ref,
  reactive,
  nextTick,
  onMounted,
  onUnmounted,
  computed,
  triggerRef,
} from "vue";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import {
  checkHealth,
  createThread,
  listThreads,
  getThread,
  deleteThread,
  updateThread,
  startTurn,
  interruptTurn,
  streamThreadEvents,
  getDeepSeekBaseUrl,
  setDeepSeekBaseUrl,
  getDeepSeekToken,
  setDeepSeekToken,
} from "@/api/ai-agent";
import type {
  ThreadRecord,
  ThreadDetail,
  TurnItemRecord,
  RuntimeEventRecord,
} from "@/api/ai-agent/types";

defineOptions({
  name: "AiAgent",
  inheritAttrs: false,
});

/* ======================== 状态 ======================== */
const loading = ref(false);
const sending = ref(false);
const threads = ref<ThreadRecord[]>([]);
const currentThread = ref<ThreadRecord | null>(null);
const currentThreadDetail = ref<ThreadDetail | null>(null);
const messages = ref<ChatMessage[]>([]);
const inputPrompt = ref("");
const sidebarCollapsed = ref(false);
const showSettings = ref(false);
const settingsForm = reactive({
  baseUrl: getDeepSeekBaseUrl(),
  token: getDeepSeekToken(),
});
const chatScrollbar = ref<any>(null);
const currentTurnId = ref<string>("");
const closeEventStream = ref<(() => void) | null>(null);
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);
const connectionStatus = ref<"connected" | "disconnected" | "connecting">(
  "disconnected"
);

/** 模型选择 */
const MODEL_STORAGE_KEY = "ai_agent_selected_model";
const DEFAULT_MODEL = "deepseek-v4-pro";
const MODEL_OPTIONS = [
  { label: "DeepSeek V4 Pro", value: "deepseek-v4-pro" },
  { label: "DeepSeek V4", value: "deepseek-v4" },
  { label: "DeepSeek V4 Flash", value: "deepseek-v4-flash" },
  { label: "DeepSeek V3", value: "deepseek-v3" },
  { label: "DeepSeek R1", value: "deepseek-r1" },
  { label: "DeepSeek R1 0528", value: "deepseek-r1-0528" },
];
const selectedModel = ref<string>(
  localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL
);

function onModelChange(model: string) {
  selectedModel.value = model;
  localStorage.setItem(MODEL_STORAGE_KEY, model);
}

/* ======================== 类型 ======================== */
interface ChatMessage {
  id: string;
  role: "user" | "agent" | "tool" | "system" | "error";
  content: string;
  reasoning?: string;
  toolName?: string;
  toolInput?: string;
  toolOutput?: string;
  status?: "loading" | "completed" | "failed";
  metadata?: Record<string, unknown>;
}

/* ======================== 初始化 ======================== */
onMounted(() => {
  loadThreads();
});

onUnmounted(() => {
  closeEventStream.value?.();
  stopPolling();
});

/* ======================== 会话管理 ======================== */
async function loadThreads() {
  loading.value = true;
  try {
    const data = await listThreads({ limit: 50, include_archived: false });
    threads.value = data;
  } catch (e: any) {
    ElMessage.error(e.message || "加载会话列表失败");
  } finally {
    loading.value = false;
  }
}

async function createNewThread() {
  try {
    const thread = await createThread({
      model: selectedModel.value,
      mode: "agent",
      auto_approve: false,
      allow_shell: true,
    });
    threads.value.unshift(thread);
    await switchThread(thread.id);
    ElMessage.success("新建会话成功");
  } catch (e: any) {
    ElMessage.error(e.message || "新建会话失败");
  }
}

async function switchThread(threadId: string) {
  if (currentThread.value?.id === threadId) return;
  closeEventStream.value?.();
  closeEventStream.value = null;
  stopPolling();
  sending.value = false;
  currentTurnId.value = "";

  try {
    const detail = await getThread(threadId);
    currentThreadDetail.value = detail;
    currentThread.value = detail.thread;
    messages.value = buildMessagesFromDetail(detail);
    await nextTick(() => scrollToBottom());

    // 连接 SSE 监听后续事件
    connectEventStream(threadId, detail.latest_seq);
  } catch (e: any) {
    ElMessage.error(e.message || "加载会话失败");
  }
}

/** 归档会话（该 API 不支持 DELETE，统一用归档实现） */
async function handleArchiveThread(threadId: string) {
  try {
    await ElMessageBox.confirm("确认归档该会话?", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    await deleteThread(threadId);
    // 从列表中移除已归档的会话（默认不显示归档会话）
    threads.value = threads.value.filter((t) => t.id !== threadId);
    if (currentThread.value?.id === threadId) {
      currentThread.value = null;
      currentThreadDetail.value = null;
      messages.value = [];
      closeEventStream.value?.();
      closeEventStream.value = null;
    }
    ElMessage.success("归档成功");
  } catch (e: any) {
    if (e !== "cancel") {
      ElMessage.error(e.message || "归档失败");
    }
  }
}

/* ======================== 消息构建 ======================== */
function buildMessagesFromDetail(detail: ThreadDetail): ChatMessage[] {
  const result: ChatMessage[] = [];
  // 按 turn 分组 items
  const itemsByTurn = new Map<string, TurnItemRecord[]>();
  for (const item of detail.items) {
    const arr = itemsByTurn.get(item.turn_id) || [];
    arr.push(item);
    itemsByTurn.set(item.turn_id, arr);
  }

  for (const turn of detail.turns) {
    const turnItems = itemsByTurn.get(turn.id) || [];
    turnItems.sort((a, b) => {
      const t1 = a.started_at || "";
      const t2 = b.started_at || "";
      return t1.localeCompare(t2);
    });

    for (const item of turnItems) {
      const msg = itemToChatMessage(item);
      if (msg) result.push(msg);
    }
  }
  return result;
}

function itemToChatMessage(item: TurnItemRecord): ChatMessage | null {
  switch (item.kind) {
    case "user_message":
      return {
        id: item.id,
        role: "user",
        content: item.detail || item.summary,
      };
    case "agent_message":
      return {
        id: item.id,
        role: "agent",
        content: item.detail || item.summary,
        status: item.status === "completed" ? "completed" : "loading",
      };
    case "agent_reasoning": {
      // reasoning 通常附加到前一个 agent 消息上
      const lastAgent = findLastAgentMessage();
      if (lastAgent) {
        lastAgent.reasoning =
          (lastAgent.reasoning || "") + (item.detail || item.summary);
        return null;
      }
      return {
        id: item.id,
        role: "agent",
        content: "",
        reasoning: item.detail || item.summary,
      };
    }
    case "tool_call":
    case "command_execution":
    case "file_change":
      return {
        id: item.id,
        role: "tool",
        content: item.summary,
        toolName: (item.metadata?.["tool_name"] as string) || item.kind,
        toolInput: item.detail,
        toolOutput: item.metadata?.["output"] as string,
        status:
          item.status === "completed"
            ? "completed"
            : item.status === "failed"
            ? "failed"
            : "loading",
      };
    case "error":
      return {
        id: item.id,
        role: "error",
        content: item.detail || item.summary,
      };
    case "status":
      return {
        id: item.id,
        role: "system",
        content: item.detail || item.summary,
      };
    default:
      return null;
  }
}

function findLastAgentMessage(): ChatMessage | undefined {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === "agent") return messages.value[i];
  }
  return undefined;
}

/* ======================== 轮询兜底 ======================== */
/** 轮询合并：将新获取的消息与已有消息智能合并，避免重复和闪烁 */
function reconcileMessages(newMsgs: ChatMessage[]) {
  for (const newMsg of newMsgs) {
    const existing = messages.value.find((m) => m.id === newMsg.id);
    if (!existing) {
      messages.value.push(newMsg);
    } else {
      // 仅在新内容更长或状态变更时更新
      if (
        newMsg.content &&
        newMsg.content.length > (existing.content || "").length
      ) {
        existing.content = newMsg.content;
      }
      if (
        newMsg.reasoning &&
        newMsg.reasoning.length > (existing.reasoning || "").length
      ) {
        existing.reasoning = newMsg.reasoning;
      }
      if (
        newMsg.toolOutput &&
        newMsg.toolOutput.length > (existing.toolOutput || "").length
      ) {
        existing.toolOutput = newMsg.toolOutput;
      }
      if (
        newMsg.status &&
        newMsg.status !== existing.status &&
        (newMsg.status === "completed" || newMsg.status === "failed")
      ) {
        existing.status = newMsg.status;
      }
    }
  }
  triggerRef(messages);
  scrollToBottom();
}

/** 启动轮询兜底机制，确保消息实时展示 */
function startPolling() {
  stopPolling();
  pollTimer.value = setInterval(async () => {
    if (!currentThread.value || !sending.value) {
      stopPolling();
      return;
    }
    try {
      const detail = await getThread(currentThread.value.id);
      currentThreadDetail.value = detail;
      const newMsgs = buildMessagesFromDetail(detail);
      reconcileMessages(newMsgs);
      // 检查 turn 是否已完成
      const currentTurn = detail.turns.find(
        (t) => t.id === currentTurnId.value
      );
      if (
        currentTurn &&
        (currentTurn.status === "completed" ||
          currentTurn.status === "failed" ||
          currentTurn.status === "interrupted")
      ) {
        sending.value = false;
        currentTurnId.value = "";
        stopPolling();
      }
    } catch (e) {
      console.error("轮询获取消息失败:", e);
    }
  }, 2000);
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

/* ======================== SSE 事件流 ======================== */
function connectEventStream(threadId: string, sinceSeq: number) {
  connectionStatus.value = "connecting";
  closeEventStream.value = streamThreadEvents(threadId, {
    sinceSeq,
    onOpen: () => {
      connectionStatus.value = "connected";
    },
    onEvent: (event) => {
      handleRuntimeEvent(event);
    },
    onError: (err) => {
      connectionStatus.value = "disconnected";
      console.error("SSE error:", err);
    },
    onClose: () => {
      connectionStatus.value = "disconnected";
    },
  });
}

function handleRuntimeEvent(event: RuntimeEventRecord) {
  const payload = event.payload || {};
  const turnId = event.turn_id || "";

  switch (event.event) {
    case "turn.started": {
      currentTurnId.value = turnId;
      break;
    }
    case "item.started": {
      const item = payload["item"] as Record<string, unknown> | undefined;
      if (!item) break;
      const kind = item["kind"] as string;
      if (kind === "agent_message") {
        messages.value.push({
          id: (item["id"] as string) || event.item_id || `msg_${Date.now()}`,
          role: "agent",
          content: "",
          status: "loading",
        });
        scrollToBottom();
      } else if (kind === "agent_reasoning") {
        // reasoning 开始，暂不创建消息，等 delta 时处理
      } else if (
        kind === "tool_call" ||
        kind === "command_execution" ||
        kind === "file_change"
      ) {
        const tool = payload["tool"] as Record<string, unknown> | undefined;
        messages.value.push({
          id: (item["id"] as string) || event.item_id || `tool_${Date.now()}`,
          role: "tool",
          content: (item["summary"] as string) || "",
          toolName: (tool?.["name"] as string) || kind,
          toolInput: JSON.stringify(tool?.["input"] || item["detail"]),
          status: "loading",
        });
        scrollToBottom();
      }
      break;
    }
    case "item.delta": {
      const kind = payload["kind"] as string;
      const delta = (payload["delta"] as string) || "";
      if (kind === "agent_message") {
        const lastAgent = findLastAgentMessage();
        if (lastAgent && lastAgent.status === "loading") {
          lastAgent.content += delta;
          triggerRef(messages);
          scrollToBottom();
        }
      } else if (kind === "agent_reasoning") {
        const lastAgent = findLastAgentMessage();
        if (lastAgent) {
          lastAgent.reasoning = (lastAgent.reasoning || "") + delta;
          triggerRef(messages);
        }
      } else if (kind === "tool_call") {
        const lastTool = findLastToolMessage();
        if (lastTool && lastTool.status === "loading") {
          lastTool.toolOutput = (lastTool.toolOutput || "") + delta;
          triggerRef(messages);
          scrollToBottom();
        }
      }
      break;
    }
    case "item.completed":
    case "item.failed": {
      const item = payload["item"] as Record<string, unknown> | undefined;
      if (!item) break;
      const kind = item["kind"] as string;
      const itemId = (item["id"] as string) || event.item_id;
      if (kind === "agent_message") {
        const msg = messages.value.find((m) => m.id === itemId);
        if (msg) {
          msg.status = "completed";
          msg.content = (item["detail"] as string) || msg.content;
        }
      } else if (
        kind === "tool_call" ||
        kind === "command_execution" ||
        kind === "file_change"
      ) {
        const msg = messages.value.find((m) => m.id === itemId);
        if (msg) {
          msg.status =
            event.event === "item.completed" ? "completed" : "failed";
          msg.toolOutput = (item["detail"] as string) || msg.toolOutput;
        }
      }
      break;
    }
    case "turn.completed": {
      sending.value = false;
      currentTurnId.value = "";
      stopPolling();
      break;
    }
    case "turn.interrupt_requested":
    case "turn.aborted": {
      sending.value = false;
      currentTurnId.value = "";
      stopPolling();
      break;
    }
    case "error": {
      const message = (payload["message"] as string) || "未知错误";
      messages.value.push({
        id: `err_${Date.now()}`,
        role: "error",
        content: message,
      });
      sending.value = false;
      scrollToBottom();
      break;
    }
    default:
      break;
  }
}

function findLastToolMessage(): ChatMessage | undefined {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i].role === "tool") return messages.value[i];
  }
  return undefined;
}

/* ======================== 发送消息 ======================== */
async function sendMessage() {
  const prompt = inputPrompt.value.trim();
  if (!prompt) return;
  if (!currentThread.value) {
    ElMessage.warning("请先新建或选择一个会话");
    return;
  }
  if (sending.value) {
    ElMessage.warning("请等待当前回复完成");
    return;
  }

  sending.value = true;
  inputPrompt.value = "";

  // 先显示用户消息
  messages.value.push({
    id: `user_${Date.now()}`,
    role: "user",
    content: prompt,
  });
  scrollToBottom();

  try {
    const res = await startTurn(currentThread.value.id, {
      prompt,
      model: selectedModel.value,
      auto_approve: currentThread.value.auto_approve,
      allow_shell: currentThread.value.allow_shell,
      trust_mode: currentThread.value.trust_mode,
    });
    currentTurnId.value = res.turn.id;
    currentThread.value = res.thread;
    // 启动轮询兜底，确保消息实时展示
    startPolling();
  } catch (e: any) {
    ElMessage.error(e.message || "发送失败");
    sending.value = false;
  }
}

function handleEnter(e: KeyboardEvent) {
  if (e.shiftKey) return;
  e.preventDefault();
  sendMessage();
}

async function handleInterrupt() {
  if (!currentThread.value || !currentTurnId.value) return;
  try {
    await interruptTurn(currentThread.value.id, currentTurnId.value);
    sending.value = false;
    currentTurnId.value = "";
    ElMessage.success("已中断");
  } catch (e: any) {
    ElMessage.error(e.message || "中断失败");
  }
}

/* ======================== 渲染 ======================== */
function renderMarkdown(text: string): string {
  if (!text) return "";
  // 简易 markdown 渲染：代码块、行内代码、粗体、斜体、链接
  let html = escapeHtml(text);

  // 代码块 ```lang\ncode\n```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const highlighted = lang
      ? hljs.highlight(code.trim(), { language: lang }).value
      : hljs.highlightAuto(code.trim()).value;
    return `<pre class="hljs"><code class="language-${lang}">${highlighted}</code></pre>`;
  });

  // 行内代码 `code`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // 粗体 **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // 斜体 *text*
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // 链接 [text](url)
  html = html.replace(
    /\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // 换行
  html = html.replace(/\n/g, "<br>");

  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ======================== UI 辅助 ======================== */
function scrollToBottom() {
  nextTick(() => {
    const wrap = chatScrollbar.value?.$el?.querySelector(".el-scrollbar__wrap");
    if (wrap) {
      wrap.scrollTop = wrap.scrollHeight;
    }
  });
}

function saveSettings() {
  setDeepSeekBaseUrl(settingsForm.baseUrl);
  setDeepSeekToken(settingsForm.token);
  showSettings.value = false;
  ElMessage.success("配置已保存");
  loadThreads();
}

async function testConnection() {
  try {
    const health = await checkHealth();
    ElMessage.success(`连接成功: ${health.service}`);
  } catch (e: any) {
    ElMessage.error(e.message || "连接失败");
  }
}

const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case "connected":
      return "已连接";
    case "connecting":
      return "连接中";
    default:
      return "未连接";
  }
});

const connectionStatusType = computed(() => {
  switch (connectionStatus.value) {
    case "connected":
      return "success";
    case "connecting":
      return "warning";
    default:
      return "info";
  }
});
</script>

<template>
  <div class="ai-agent-container">
    <!-- 左侧边栏 -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <el-button type="primary" size="small" @click="createNewThread">
          <el-icon><i-ep-plus /></el-icon>
          <span v-show="!sidebarCollapsed">新建会话</span>
        </el-button>
        <el-button
          text
          size="small"
          @click="sidebarCollapsed = !sidebarCollapsed"
        >
          <el-icon>
            <i-ep-fold v-if="!sidebarCollapsed" />
            <i-ep-expand v-else />
          </el-icon>
        </el-button>
      </div>

      <el-scrollbar class="thread-list">
        <div
          v-for="thread in threads"
          :key="thread.id"
          class="thread-item"
          :class="{ active: currentThread?.id === thread.id }"
          @click="switchThread(thread.id)"
        >
          <el-icon class="thread-icon"><i-ep-chat-dot-square /></el-icon>
          <div v-show="!sidebarCollapsed" class="thread-info">
            <div class="thread-title">
              {{ thread.title || "未命名会话" }}
            </div>
            <div class="thread-meta">
              <span>{{ thread.mode }}</span>
              <span>{{ thread.model }}</span>
            </div>
          </div>
          <el-dropdown
            v-show="!sidebarCollapsed"
            trigger="click"
            @command="(cmd: string) => {
              if (cmd === 'archive') handleArchiveThread(thread.id);
            }"
            @click.stop
          >
            <el-icon class="thread-more"><i-ep-more /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="archive">
                  <el-icon><i-ep-folder /></el-icon> 归档
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-scrollbar>

      <div class="sidebar-footer">
        <el-tag
          :type="connectionStatusType"
          size="small"
          class="connection-tag"
        >
          {{ connectionStatusText }}
        </el-tag>
        <el-button text size="small" @click="showSettings = true">
          <el-icon><i-ep-setting /></el-icon>
          <span v-show="!sidebarCollapsed">设置</span>
        </el-button>
      </div>
    </div>

    <!-- 右侧聊天区 -->
    <div class="chat-area">
      <div class="chat-header">
        <div class="chat-title">
          <el-icon><i-ep-cpu /></el-icon>
          <span>
            {{ currentThread?.title || "AI Agent" }}
          </span>
          <el-tag v-if="currentThread" size="small" type="info">
            {{ currentThread.mode }}
          </el-tag>
        </div>
        <div class="chat-controls">
          <el-select
            v-model="selectedModel"
            size="small"
            class="model-selector"
            placeholder="选择模型"
            @change="onModelChange"
          >
            <el-option
              v-for="m in MODEL_OPTIONS"
              :key="m.value"
              :label="m.label"
              :value="m.value"
            />
          </el-select>
          <div v-if="sending && currentTurnId">
            <el-button type="danger" size="small" @click="handleInterrupt">
              <el-icon><i-ep-video-pause /></el-icon> 中断
            </el-button>
          </div>
        </div>
      </div>

      <el-scrollbar ref="chatScrollbar" class="message-list">
        <div v-if="messages.length === 0" class="empty-state">
          <el-icon class="empty-icon"><i-ep-chat-line-round /></el-icon>
          <p>开始与 DeepSeek AI Agent 对话</p>
          <p class="empty-tip">
            支持文件操作、Shell 执行、Git 管理、网页搜索等工具
          </p>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-row"
          :class="msg.role"
        >
          <!-- 用户消息 -->
          <template v-if="msg.role === 'user'">
            <div class="message-content user-bubble">
              <div class="message-text" v-html="renderMarkdown(msg.content)" />
            </div>
          </template>

          <!-- AI 消息 -->
          <template v-if="msg.role === 'agent'">
            <div class="message-avatar">
              <el-icon><i-ep-cpu /></el-icon>
            </div>
            <div class="message-content agent-bubble">
              <!-- 思考过程 -->
              <div v-if="msg.reasoning" class="reasoning-block">
                <el-collapse>
                  <el-collapse-item title="思考过程">
                    <div
                      class="reasoning-text"
                      v-html="renderMarkdown(msg.reasoning)"
                    />
                  </el-collapse-item>
                </el-collapse>
              </div>
              <!-- 正文 -->
              <div class="message-text" v-html="renderMarkdown(msg.content)" />
              <div v-if="msg.status === 'loading'" class="typing-indicator">
                <span class="dot" /><span class="dot" /><span class="dot" />
              </div>
            </div>
          </template>

          <!-- 工具调用 -->
          <template v-if="msg.role === 'tool'">
            <div class="message-avatar">
              <el-icon><i-ep-tools /></el-icon>
            </div>
            <div class="message-content tool-bubble">
              <el-card shadow="never" size="small" class="tool-card">
                <template #header>
                  <div class="tool-header">
                    <el-icon><i-ep-tools /></el-icon>
                    <span>{{ msg.toolName || "工具调用" }}</span>
                    <el-tag
                      :type="
                        msg.status === 'completed'
                          ? 'success'
                          : msg.status === 'failed'
                          ? 'danger'
                          : 'warning'
                      "
                      size="small"
                    >
                      {{
                        msg.status === "completed"
                          ? "完成"
                          : msg.status === "failed"
                          ? "失败"
                          : "执行中"
                      }}
                    </el-tag>
                  </div>
                </template>
                <div v-if="msg.toolInput" class="tool-section">
                  <div class="tool-label">输入</div>
                  <pre class="tool-code">{{ msg.toolInput }}</pre>
                </div>
                <div v-if="msg.toolOutput" class="tool-section">
                  <div class="tool-label">输出</div>
                  <pre class="tool-code">{{ msg.toolOutput }}</pre>
                </div>
              </el-card>
            </div>
          </template>

          <!-- 系统/错误消息 -->
          <template v-if="msg.role === 'system' || msg.role === 'error'">
            <div class="message-content system-bubble">
              <el-alert
                :title="msg.content"
                :type="msg.role === 'error' ? 'error' : 'info'"
                :closable="false"
                show-icon
                center
              />
            </div>
          </template>
        </div>
      </el-scrollbar>

      <div class="input-area">
        <el-input
          v-model="inputPrompt"
          type="textarea"
          :rows="2"
          resize="none"
          placeholder="输入消息，按 Enter 发送，Shift+Enter 换行..."
          :disabled="sending"
          @keydown.enter.prevent="handleEnter"
        />
        <div class="input-actions">
          <el-button
            type="primary"
            :loading="sending"
            :disabled="!inputPrompt.trim()"
            @click="sendMessage"
          >
            <el-icon><i-ep-promotion /></el-icon>
            发送
          </el-button>
        </div>
      </div>
    </div>

    <!-- 设置对话框 -->
    <el-dialog v-model="showSettings" title="DeepSeek-TUI 配置" width="500px">
      <el-form :model="settingsForm" label-width="120px">
        <el-form-item label="服务地址">
          <el-input
            v-model="settingsForm.baseUrl"
            placeholder="http://localhost:7878"
          />
        </el-form-item>
        <el-form-item label="运行时 Token">
          <el-input
            v-model="settingsForm.token"
            placeholder="可选，用于认证"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="testConnection">
            测试连接
          </el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSettings = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.ai-agent-container {
  display: flex;
  height: calc(100vh - 84px); // 减去顶部导航和标签栏高度
  background: #f5f7fa;
}

/* 左侧边栏 */
.sidebar {
  display: flex;
  flex-direction: column;
  width: 260px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  transition: width 0.3s;

  &.collapsed {
    width: 60px;

    .sidebar-header,
    .sidebar-footer {
      justify-content: center;
      padding: 8px 4px;
    }
  }
}

.sidebar-header {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.thread-list {
  flex: 1;
  padding: 8px;
}

.thread-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 10px 8px;
  margin-bottom: 4px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: #f2f6fc;
  }

  &.active {
    color: #409eff;
    background: #ecf5ff;
  }
}

.thread-icon {
  flex-shrink: 0;
  margin-right: 8px;
  font-size: 18px;
}

.thread-info {
  flex: 1;
  min-width: 0;
}

.thread-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thread-meta {
  display: flex;
  gap: 6px;
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}

.thread-more {
  padding: 4px;
  font-size: 16px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s;

  .thread-item:hover & {
    opacity: 1;
  }
}

.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-top: 1px solid #e4e7ed;
}

.connection-tag {
  font-size: 12px;
}

/* 右侧聊天区 */
.chat-area {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.chat-title {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

.chat-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.model-selector {
  width: 180px;
}

.message-list {
  flex: 1;
  padding: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;

  .empty-icon {
    margin-bottom: 16px;
    font-size: 64px;
    color: #c0c4cc;
  }

  p {
    margin: 4px 0;
    font-size: 16px;
  }

  .empty-tip {
    font-size: 13px;
    color: #c0c4cc;
  }
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;

  &.user {
    justify-content: flex-end;
  }

  &.agent,
  &.tool {
    justify-content: flex-start;
  }

  &.system,
  &.error {
    justify-content: center;
  }
}

.message-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 18px;
  color: #409eff;
  background: #ecf5ff;
  border-radius: 50%;
}

.message-content {
  max-width: 80%;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  border-radius: 12px;

  :deep(pre) {
    padding: 12px;
    margin: 8px 0;
    overflow-x: auto;
    background: #1e1e1e;
    border-radius: 6px;

    code {
      font-family: "Fira Code", Consolas, monospace;
      font-size: 13px;
      line-height: 1.5;
    }
  }

  :deep(code) {
    padding: 2px 6px;
    font-family: "Fira Code", Consolas, monospace;
    font-size: 13px;
    background: #f4f4f5;
    border-radius: 4px;
  }

  :deep(a) {
    color: #409eff;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.user-bubble {
  color: #fff;
  background: #409eff;
  border-bottom-right-radius: 4px;

  :deep(code) {
    color: #fff;
    background: rgb(255 255 255 / 20%);
  }

  :deep(pre) {
    background: #1a1a2e;
  }
}

.agent-bubble {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-bottom-left-radius: 4px;
}

.tool-bubble {
  max-width: 90%;
  padding: 0;
  background: transparent;
  border: none;
}

.system-bubble {
  max-width: 90%;
  padding: 0;
  background: transparent;
  border: none;
}

.reasoning-block {
  margin-bottom: 10px;

  :deep(.el-collapse) {
    border: none;
  }

  :deep(.el-collapse-item__header) {
    height: 36px;
    padding: 0 12px;
    font-size: 13px;
    color: #909399;
    background: #f5f7fa;
    border: none;
    border-radius: 6px;
  }

  :deep(.el-collapse-item__wrap) {
    background: transparent;
    border: none;
  }

  :deep(.el-collapse-item__content) {
    padding: 8px 12px;
    font-size: 13px;
    color: #606266;
    background: #f5f7fa;
    border-radius: 0 0 6px 6px;
  }
}

.typing-indicator {
  display: flex;
  gap: 4px;
  margin-top: 8px;

  .dot {
    width: 6px;
    height: 6px;
    background: #c0c4cc;
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out both;

    &:nth-child(1) {
      animation-delay: -0.32s;
    }

    &:nth-child(2) {
      animation-delay: -0.16s;
    }
  }
}

@keyframes typing {
  0%,
  80%,
  100% {
    opacity: 0.4;
    transform: scale(0.6);
  }

  40% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 工具卡片 */
.tool-card {
  width: 100%;

  :deep(.el-card__header) {
    padding: 10px 16px;
  }

  :deep(.el-card__body) {
    padding: 12px 16px;
  }
}

.tool-header {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
}

.tool-section {
  margin-top: 10px;
}

.tool-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: #909399;
}

.tool-code {
  max-height: 300px;
  padding: 10px;
  overflow-y: auto;
  font-family: "Fira Code", Consolas, monospace;
  font-size: 12px;
  word-break: break-word;
  white-space: pre-wrap;
  background: #f5f7fa;
  border-radius: 6px;
}

/* 输入区 */
.input-area {
  padding: 12px 20px 20px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
}

.input-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
