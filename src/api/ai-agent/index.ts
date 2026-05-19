/**
 * DeepSeek-TUI Runtime API 客户端
 * 对接 deepseek serve --http 提供的 HTTP/SSE API
 * @see {@link https://github.com/Hmbown/DeepSeek-TUI/blob/main/docs/RUNTIME_API.md}
 */
import type {
  ThreadRecord,
  ThreadDetail,
  CreateThreadRequest,
  UpdateThreadRequest,
  StartTurnRequest,
  StartTurnResponse,
  RuntimeEventRecord,
  HealthResponse,
  StreamTurnRequest,
} from "./types";

const STORAGE_KEY_BASE_URL = "deepseek_tui_base_url";
const STORAGE_KEY_TOKEN = "deepseek_tui_token";

/** 获取配置的 DeepSeek-TUI 服务地址 */
export function getDeepSeekBaseUrl(): string {
  return (
    localStorage.getItem(STORAGE_KEY_BASE_URL) || "http://localhost:7878"
  ).replace(/\/$/, "");
}

/** 设置 DeepSeek-TUI 服务地址 */
export function setDeepSeekBaseUrl(url: string) {
  localStorage.setItem(STORAGE_KEY_BASE_URL, url.replace(/\/$/, ""));
}

/** 获取运行时 Token */
export function getDeepSeekToken(): string {
  return localStorage.getItem(STORAGE_KEY_TOKEN) || "";
}

/** 设置运行时 Token */
export function setDeepSeekToken(token: string) {
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  const token = getDeepSeekToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function getUrl(path: string): string {
  return `${getDeepSeekBaseUrl()}${path}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`DeepSeek-TUI ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/** 健康检查 */
export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(getUrl("/health"));
  return handleResponse<HealthResponse>(res);
}

/** 创建会话 */
export async function createThread(
  data: CreateThreadRequest
): Promise<ThreadRecord> {
  const res = await fetch(getUrl("/v1/threads"), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<ThreadRecord>(res);
}

/** 列出会话 */
export async function listThreads(
  params?: {
    limit?: number;
    include_archived?: boolean;
    archived_only?: boolean;
  }
): Promise<ThreadRecord[]> {
  const search = new URLSearchParams();
  if (params?.limit !== undefined) search.set("limit", String(params.limit));
  if (params?.include_archived !== undefined)
    search.set("include_archived", String(params.include_archived));
  if (params?.archived_only !== undefined)
    search.set("archived_only", String(params.archived_only));
  const query = search.toString();
  const res = await fetch(getUrl(`/v1/threads${query ? "?" + query : ""}`), {
    headers: getHeaders(),
  });
  return handleResponse<ThreadRecord[]>(res);
}

/** 获取会话详情（含 turns、items、latest_seq） */
export async function getThread(id: string): Promise<ThreadDetail> {
  const res = await fetch(getUrl(`/v1/threads/${id}`), {
    headers: getHeaders(),
  });
  return handleResponse<ThreadDetail>(res);
}

/** 更新会话 */
export async function updateThread(
  id: string,
  data: UpdateThreadRequest
): Promise<ThreadRecord> {
  const res = await fetch(getUrl(`/v1/threads/${id}`), {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<ThreadRecord>(res);
}

/** 归档会话（通过 PATCH 设置 archived=true，该 API 不支持 DELETE） */
export async function deleteThread(id: string): Promise<ThreadRecord> {
  return updateThread(id, { archived: true });
}

/** 发送消息（启动一个 turn） */
export async function startTurn(
  threadId: string,
  data: StartTurnRequest
): Promise<StartTurnResponse> {
  const res = await fetch(getUrl(`/v1/threads/${threadId}/turns`), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<StartTurnResponse>(res);
}

/** 中断 turn */
export async function interruptTurn(
  threadId: string,
  turnId: string
): Promise<void> {
  const res = await fetch(
    getUrl(`/v1/threads/${threadId}/turns/${turnId}/interrupt`),
    {
      method: "POST",
      headers: getHeaders(),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`DeepSeek-TUI ${res.status}: ${text}`);
  }
}

/** 紧凑化会话 */
export async function compactThread(
  threadId: string,
  reason?: string
): Promise<void> {
  const res = await fetch(getUrl(`/v1/threads/${threadId}/compact`), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(reason ? { reason } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`DeepSeek-TUI ${res.status}: ${text}`);
  }
}

/** 兼容性流式接口（一次性返回完整响应） */
export async function streamTurn(
  data: StreamTurnRequest
): Promise<unknown> {
  const res = await fetch(getUrl("/v1/stream"), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse<unknown>(res);
}

export interface EventStreamOptions {
  /** 起始事件序列号（默认 0） */
  sinceSeq?: number;
  /** 收到事件回调 */
  onEvent: (event: RuntimeEventRecord) => void;
  /** 连接建立回调 */
  onOpen?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
  /** 连接关闭回调 */
  onClose?: () => void;
}

/**
 * 建立 SSE 事件流连接，实时监听指定 thread 的事件
 * @returns 关闭连接的函数
 */
export function streamThreadEvents(
  threadId: string,
  options: EventStreamOptions
): () => void {
  const { sinceSeq = 0, onEvent, onOpen, onError, onClose } = options;
  const token = getDeepSeekToken();
  let url = getUrl(
    `/v1/threads/${threadId}/events?since_seq=${sinceSeq}`
  );
  if (token) {
    url += `&token=${encodeURIComponent(token)}`;
  }

  const eventSource = new EventSource(url);

  /** 处理 SSE 消息的通用函数（兼容命名事件与无名事件） */
  function handleMessage(e: MessageEvent) {
    try {
      const event = JSON.parse(e.data) as RuntimeEventRecord;
      onEvent(event);
    } catch (err) {
      onError?.(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }

  eventSource.onopen = () => {
    onOpen?.();
  };

  // 无名事件（仅 data 字段，无 event 字段）
  eventSource.onmessage = handleMessage;

  // 命名事件（含 event 字段，如 event: item.delta），onmessage 不会触发，需单独监听
  const NAMED_EVENT_TYPES = [
    "turn.started",
    "turn.completed",
    "turn.interrupt_requested",
    "turn.aborted",
    "item.started",
    "item.delta",
    "item.completed",
    "item.failed",
    "error",
  ];
  for (const type of NAMED_EVENT_TYPES) {
    eventSource.addEventListener(type, handleMessage);
  }

  eventSource.onerror = () => {
    // EventSource 不会暴露具体错误信息，关闭时也触发 error
    if (eventSource.readyState === EventSource.CLOSED) {
      onClose?.();
    } else {
      onError?.(new Error("SSE connection error"));
    }
  };

  return () => {
    eventSource.close();
    onClose?.();
  };
}
