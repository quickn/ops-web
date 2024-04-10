/**
 * 监控终端
 */
export interface AgentConfig extends PageQuery {
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
  updateTime?: string;
}


export interface AgentConfigForm {
  id?: number | null | undefined;
  hostname?: string | null;
  isMonitor?: boolean;
  isMail?: boolean;
  isDocker?: boolean;
  cpuWarnVal?: number;
  memWarnVal?: number;
  diskWarnVal?: number;
  cpuWarnValDocker?: number;
}
