export interface LogInfo {
  id: number;
  hostname: string;
  title: string;
  infoContent: string;
  serviceId: number;
  serviceName: string;
  state: string;
  sendEmail: number;
  createTime: string;
}
export interface LogCmdForm {
  serviceId: number;
  dockerName: string;
  keyword: string;
  createDate: string;
  logLevel: string;
  timeout: number;
  cmd: string;
  grepPara: string;
}
