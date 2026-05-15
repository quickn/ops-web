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
