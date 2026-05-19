/**
 * DeepSeek-TUI Runtime API 类型定义
 * @see {@link https://github.com/Hmbown/DeepSeek-TUI/blob/main/docs/RUNTIME_API.md}
 */

export interface ThreadRecord {
  schema_version: number;
  id: string;
  created_at: string;
  updated_at: string;
  model: string;
  workspace: string;
  mode: string;
  allow_shell: boolean;
  trust_mode: boolean;
  auto_approve: boolean;
  latest_turn_id?: string;
  latest_response_bookmark?: string;
  archived: boolean;
  system_prompt?: string;
  task_id?: string;
  title?: string;
  coherence_state?: CoherenceState;
}

export interface CoherenceState {
  [key: string]: unknown;
}

export type RuntimeTurnStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "interrupted"
  | "canceled";

export interface TurnRecord {
  schema_version: number;
  id: string;
  thread_id: string;
  status: RuntimeTurnStatus;
  input_summary: string;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  duration_ms?: number;
  usage?: Usage;
  error?: string;
  item_ids: string[];
  steer_count: number;
}

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cached_tokens?: number;
  reasoning_tokens?: number;
  cost_usd?: number;
}

export type TurnItemKind =
  | "user_message"
  | "agent_message"
  | "agent_reasoning"
  | "tool_call"
  | "file_change"
  | "command_execution"
  | "context_compaction"
  | "status"
  | "error";

export type TurnItemLifecycleStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed"
  | "interrupted"
  | "canceled";

export interface TurnItemRecord {
  schema_version: number;
  id: string;
  turn_id: string;
  kind: TurnItemKind;
  status: TurnItemLifecycleStatus;
  summary: string;
  detail?: string;
  metadata?: Record<string, unknown>;
  artifact_refs?: string[];
  started_at?: string;
  ended_at?: string;
}

export interface RuntimeEventRecord {
  schema_version: number;
  seq: number;
  timestamp: string;
  thread_id: string;
  turn_id?: string;
  item_id?: string;
  event: string;
  payload: Record<string, unknown>;
}

export interface ThreadDetail {
  thread: ThreadRecord;
  turns: TurnRecord[];
  items: TurnItemRecord[];
  latest_seq: number;
}

export interface CreateThreadRequest {
  model?: string;
  workspace?: string;
  mode?: string;
  allow_shell?: boolean;
  trust_mode?: boolean;
  auto_approve?: boolean;
  archived?: boolean;
  system_prompt?: string;
  task_id?: string;
}

export interface UpdateThreadRequest {
  archived?: boolean;
  allow_shell?: boolean;
  trust_mode?: boolean;
  auto_approve?: boolean;
  model?: string;
  mode?: string;
  title?: string;
  system_prompt?: string;
}

export interface StartTurnRequest {
  prompt: string;
  input_summary?: string;
  model?: string;
  mode?: string;
  allow_shell?: boolean;
  trust_mode?: boolean;
  auto_approve?: boolean;
}

export interface StartTurnResponse {
  thread: ThreadRecord;
  turn: TurnRecord;
}

export interface StreamTurnRequest {
  prompt: string;
  model?: string;
  mode?: string;
  workspace?: string;
  allow_shell?: boolean;
  trust_mode?: boolean;
  auto_approve?: boolean;
}

export interface HealthResponse {
  status: string;
  service: string;
  mode: string;
}
