// JAR包实体
export interface JarPackage {
  id?: number;
  fileName: string;
  originalName: string;
  version: string;
  remark: string;
  jarPath: string;
  dockerImageName: string;
  dockerContainerName: string;
  dockerfilePath: string;
  agentIds: string;
  agentNames: string;
  targetContainerNames: string;
  status: number; // 0-未构建 1-构建中 2-构建失败 3-构建成功 4-部署中 5-部署成功 6-部署失败
  createTime: string;
  updateTime: string;

  // 分页参数
  pageNum?: number;
  pageSize?: number;
  total?: number;

  // 扩展字段
  fileSize?: number;
  mainClass?: string;
  dockerfileContent?: string;
  lastDeployTime?: string;
}
