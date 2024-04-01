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
  keyword?: string | undefined;
  createDate?: string;
  logLevel?: string;
  timeout?: number;
  cmd?: string;
  grepPara?: string;
}
