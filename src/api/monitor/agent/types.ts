/**
 * 监控终端
 */
export interface Agent extends PageQuery {
  id?: number | null | undefined;
  hostname?: string;
  serviceId?: number;
  serviceName?: string;
  isMonitor?: boolean;
  isMail?: boolean;
  isDocker?: boolean;
  clientVersion?: string;
  cpuWarnVal?: number;
  memWarnVal?: number;
  diskWarnVal?: number;
  cpuWarnValDocker?: number;
  netThresholdMbps?: number;
  ifStatThresholdMbps?: number;
  netConnThreshold?: number;
  updateTime?: string;
}


export interface AgentForm {
  id?: number | null | undefined;
  serviceId?: number;
  hostname?: string | null;
  isMonitor?: boolean;
  isMail?: boolean;
  isDocker?: boolean;
  isDockerStats?: boolean;
  cpuWarnVal?: number;
  memWarnVal?: number;
  diskWarnVal?: number;
  cpuWarnValDocker?: number;
  netThresholdMbps?: number;
  ifStatThresholdMbps?: number;
  netConnThreshold?: number;
}

/**
 * 代理服务配置
 */
export interface AgentConfig {
  id?: number;
  isNginx?: number;
  hostname?: string;
  nginxPath?: string;
  serviceId?: number;
  serviceName?: string;
  workPath?: string;
  logPath?: string;
}
