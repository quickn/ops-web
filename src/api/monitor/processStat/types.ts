/**
 * 进程统计
 */
export interface ProcessStat extends PageQuery {
  id?: number;
  /** 服务ID */
  serviceId?: number;
  /** 服务名称 */
  serviceName?: string;
  /** 进程编号 */
  pid?: number;
  /** 进程名 */
  processName?: string;
  /** 容器名称 */
  containerName?: string;
  /** 物理内存占用(KB) */
  rsz?: number;
  /** CPU占用百分比 */
  pcpu?: number;
  /** 用户 */
  user?: string;
  /** 主机IP */
  hostname?: string;
  /** 默认网卡发送流量(KB) */
  sentRate?: number;
  /** 默认网卡接收流量(KB) */
  recvRate?: number;
  /** 所有非lo网卡发送流量(KB) */
  totalSentRate?: number;
  /** 所有非lo网卡接收流量(KB) */
  totalRecvRate?: number;
  /** 查询日期(yyyy-MM-dd)，为空查询全部 */
  date?: string;
  /** 查询开始时间(HH:mm)，需配合 date 使用 */
  startTime?: string;
  /** 查询结束时间(HH:mm)，需配合 date 使用 */
  endTime?: string;
  /** 创建时间 */
  createTime?: string;
  /** 更新时间 */
  updateTime?: string;
}
