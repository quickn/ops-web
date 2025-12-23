// /api/monitor/file-sync/types.ts
export interface AgentConfig {
  id: number;
  hostname: string;
  serviceName: string;
  isJumpServer: boolean;
  isMonitor: boolean;
  updateTime: string;
  [key: string]: any;
}

export interface FileInfo {
  name: string;
  type: string;
  permissions: string;
  links: number;
  owner: string;
  group: string;
  size: string;
  modifyTime: string;
}

export interface FileSyncQueryParams {
  serviceId?: number;
  hostname?: string;
}

export interface SyncFormData {
  agentId?: number;
  path: string;
  sourcePath: string;
  targetPath: string;
  command: string;
}

export interface BuildSyncCommandRequest {
  targetServers: number[];
  sourcePath: string;
  targetPath?: string;
}
