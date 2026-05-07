/** MySQL 连接配置 */
export interface AccountConfig {
  id?: number;
  serviceId?: number;
  configName?: string;
  username?: string;
  password?: string;
  accessToken?: string;
  url?: string;
  port?: number;
  charset?: string;
  type?: string;
}

/** 统一响应 */
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  msg: string;
}
