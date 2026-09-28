/**
 * 接口健康监控
 */
export interface HeathMonitor {
  id?: number | null;
  /** 接口名称 */
  apiName?: string;
  /** 接口地址 */
  apiUrl?: string;
  /** 请求方式 get / post */
  requestMethod?: string;
  /** 内容类型 application/json、application/x-www-form-urlencoded 等 */
  contentType?: string;
  /** 参数（请求体） */
  param?: string;
  /** 是否开启监控 */
  isMonitor?: boolean;
  /** 超时预警时间（毫秒） */
  timeoutWarnTime?: number;
  /** 断言方式：status-响应码 / body-响应内容 / json-响应JSON字段 / none-不校验 */
  assertType?: string;
  /** 断言期望值：响应码（数字字符串）或包含的字符串或 JSON 表达式 */
  expectValue?: string;
  /** 接口返回结果 */
  body?: string;
  /** 健康状态（HTTP 状态码） */
  heathStatus?: number;
  /** 响应耗时（毫秒） */
  responseTime?: number;
  /** 分页参数 */
  pageNum?: number;
  pageSize?: number;
}