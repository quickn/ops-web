/** MySQL 连接配置 */
export interface AccountConfig {
  id?: number;
  service_id?: number;
  service_name?: string;
  username?: string;
  password?: string;
  access_token?: string;
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
