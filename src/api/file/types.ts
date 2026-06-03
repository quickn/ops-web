/**
 * 文件API类型声明
 */
export interface FileInfo {
  fileName: string;
  filePath: string;
  url: string;
  agentId: number;
}

export interface FileListInfo {
  name: string;
  type: string;
  permissions: string;
  links: number;
  owner: string;
  group: string;
  size: string;
  modifyTime: string;
}


export interface FileInfoForm {
  fileName: string | undefined;
  filePath: string | undefined;
  fileContent: string | undefined;
  agentId: number;
  showHide?: boolean;
  onlyShowFile?: boolean;
  onlyShowDic?: boolean;
}

/**
 * 文件同步参数（通过跳板机同步文件）
 */
export interface SyncFileParam {
  /** 源服务器 agent ID */
  sourceAgentId?: number;
  /** 跳板机 agent ID */
  jumpAgentId?: number;
  /** 跳板机服务 ID */
  jumpServiceId?: number;
  /** 源文件完整路径 */
  sourcePath?: string;
  /** 目标文件完整路径 */
  targetPath?: string;
  /** 同步类型：1=从源服务器 rsync 到跳板机并分发 */
  syncType?: number;
}
