export interface LogInfo extends PageQuery {
  id?: number;
  hostname?: string;
  title?: string;
  infoContent?: string;
  serviceId?: number;
  serviceName?: string;
  /** Agent IP */
  agentIp?: string;
  agentIP?: string;
  /** 指令 */
  command?: string;
  /** 脚本 */
  script?: string;
  /** 任务ID */
  jobId?: number | string;
  /** 结果集 */
  result?: string;
  /** 备注 */
  remark?: string;
  /** 是否成功 */
  isSuccess?: boolean | string | number;
  state?: string;
  sendEmail?: number;
  createTime?: string;
  startTime?: string;
  endTime?: string;
  sort?: number;
  sortField?: string;
  sortOrder?: string;
  /** 是否同步部署 */
  sync?: boolean;
}
export interface LogCmdForm {
  serviceId?: number | undefined;
  dockerName?: string;
  agentId?: number;
  fileName?: string;
  keyword?: string | undefined;
  keyword1?: string | undefined;
  startTime?: string | undefined;
  endTime?: string | undefined;
  startHourMinute?: string | undefined;
  endHourMinute?: string | undefined;
  createDate?: string;
  logLevel?: string;
  timeout?: number;
  cmd?: string;
  grepPara?: string;
  action?: string;
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
