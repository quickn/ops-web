export interface SystemInfo {
  id: number;
  hostname: string;
  version: string;
  memPer: number;
  diskPer: number;
  cpuPer: number;
  serviceId: number;
  serviceName: string;
  state: string;
  updateTime: string;
}
