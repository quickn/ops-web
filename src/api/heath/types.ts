/**
 * 登录用户信息
 */
export interface HeathMonitor extends PageQuery {
  id?: number | null;
  appName?: string;
  heathUrl?: string;
  serviceName?: string;
  sort?: number;
}
