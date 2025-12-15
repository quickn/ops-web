// JAR包实体
export interface JarPackage {
  id?: number;
  fileName: string;
  originalName: string;
  version: string;
  remark: string;
  jarPath: string;
  agentIds: string;
  agentNames: string;
  targetContainerNames: string;
  targetContainerImages: string;
  status: number; // 0-未部署 1-部署中 2-成功 3-失败
  serviceId: number;
  serviceName: string;
  createTime: string;
  updateTime: string;
  pageSize?: number;
  pageNum?: number;
}

// 部署记录实体
export interface JarDeployRecord {
  id: number;
  jarPackageId: number;
  agentId: number;
  containerName: string;
  status: number; // 0-待部署 1-部署中 2-成功 3-失败
  deployTime: string;
  deployLog: string;
  createTime: string;
}
