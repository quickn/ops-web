/**
 * 监控服务
 */
export interface ServiceInfo extends PageQuery {
  id?: number;
  name?: string;
  isMonitor: false,
  sort?: number;
  workPath?: string;
  sortField?: string;
  sortOrder?: string;
}
