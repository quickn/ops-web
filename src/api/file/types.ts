/**
 * 文件API类型声明
 */
export interface FileInfo {
  fileName: string;
  filePath: string;
  url: string;
  agentId: number;
}


export interface FileInfoForm {
  fileName: string | undefined;
  filePath: string | undefined;
  agentId: number;
}
