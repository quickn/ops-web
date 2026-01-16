// api/monitor/jar/types.ts
export interface JarPackage {
  id?: string;
  fileName: string;
  originalName: string;
  version: string;
  remark: string;
  jarPath: string;
  downloadUrl: string;
  dockerImageName: string;
  dockerContainerName: string;
  dockerComposeContent: string;
  dockerfileContent: string;
  agentIds: string;
  agentNames: string;
  targetContainerNames: string;
  status: number;
  createTime: string;
  updateTime: string;

  // 分页参数（查询时使用）
  pageNum?: number;
  pageSize?: number;
  total?: number;
}

// 分页结果类型
export interface JarPackagePageResult {
  total: number;
  records: JarPackage[];
  pageNum: number;
  pageSize: number;
  pages: number;
}

// 部署请求参数
export interface DeployRequest {
  agentIds: number[];
  containerNames: string[];
  containerConfigs?: Record<string, any>;
}

// Dockerfile请求参数
export interface DockerfileRequest {
  dockerfileContent: string;
}

// 部署目标类型
export interface DeployTarget {
  agentId: number | null;
  containerName: string;
  port?: string;
  config?: Record<string, any>;
}

// Agent信息类型
export interface AgentInfo {
  agentId: number;
  agentName: string;
  agentIp: string;
  agentPort: number;
  containers: DockerContainer[];
  hasContainers: boolean;
  containerCount: number;
}

// Docker容器类型
export interface DockerContainer {
  id?: number;
  names: string;
  image: string;
  status: string;
  hostname: string;
  createTime?: string;
  updateTime?: string;
}
