export interface LogInfo extends PageQuery {
  id?: number;
  hostname?: string;
  title?: string;
  infoContent?: string;
  serviceId?: number;
  serviceName?: string;
  state?: string;
  sendEmail?: number;
  createTime?: string;
  sort?: number;
}
export interface LogCmdForm {
  serviceId?: number | undefined;
  dockerName?: string;
  agentId?: number;
  fileName?: string;
  keyword?: string | undefined;
  keyword1?: string | undefined;
  createDate?: string;
  logLevel?: string;
  timeout?: number;
  cmd?: string;
  grepPara?: string;
}

export interface LogCluster {
  clusterId: number;
  template: string;
  count: number;
}

export interface LogAnalysisResult {
  totalLines: number;
  totalClusters: number;
  clusters: LogCluster[];
}

export interface LogAnalysisResponse {
  code: number;
  data: string | LogAnalysisResult;
  agentId: number;
  msgType: string;
}
