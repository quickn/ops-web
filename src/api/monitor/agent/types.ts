/**
 * 监控终端
 */
export interface AgentConfig extends PageQuery {
  id?: number | null;
  hostname?: string;
  serviceName?: string;
  isMonitor: boolean;
  isMail: boolean;
  isDocker: boolean;
  clientVersion?: string;
  cpuWarnVal: number;
  memWarnVal: number;
  diskWarnVal: number;
  updateTime?: string;
}


export interface AgentConfigForm {
  id?: number | null;
  isMonitor: boolean;
  isMail: boolean;
  isDocker: boolean;
  cpuWarnVal: number;
  memWarnVal: number;
  diskWarnVal: number;
}
