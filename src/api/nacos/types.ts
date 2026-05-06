/**
 * Nacos 服务器连接参数
 */
export interface NacosServerParams {
  configId?: number;
  username?: string;
  password?: string;
}

/**
 * Nacos 配置项
 */
export interface NacosConfig {
  id?: string;
  dataId?: string;
  group?: string;
  tenant?: string;
  content?: string;
}

/**
 * Nacos 服务项
 */
export interface NacosService {
  name?: string;
  groupName?: string;
  namespaceId?: string;
  ip?: string;
  port?: number;
  clusterCount?: number;
  healthyInstanceCount?: number;
  triggerFlag?: boolean;
}

/**
 * Nacos 命名空间
 */
export interface NacosNamespace {
  namespace?: string;
  namespaceShowName?: string;
  quota?: number;
  configCount?: number;
  type?: number;
}

/**
 * Nacos 配置查询参数
 */
export interface NacosConfigQuery extends NacosServerParams {
  pageNo?: number;
  pageSize?: number;
  tenant?: string;
  dataId?: string;
  group?: string;
}

/**
 * Nacos 服务查询参数
 */
export interface NacosServiceQuery extends NacosServerParams {
  pageNo?: number;
  pageSize?: number;
  namespaceId?: string;
  groupName?: string;
}

/**
 * Nacos 配置详情查询参数
 */
export interface NacosConfigDetailQuery extends NacosServerParams {
  dataId: string;
  group?: string;
  tenant?: string;
}

/**
 * Nacos 服务实例查询参数
 */
export interface NacosServiceDetailQuery extends NacosServerParams {
  serviceName: string;
  namespaceId?: string;
  groupName?: string;
}

/**
 * Nacos 配置发布参数（新增/编辑）
 */
export interface NacosConfigPublish extends NacosServerParams {
  dataId: string;
  group?: string;
  tenant?: string;
  content: string;
  type?: string;
}

/**
 * Nacos 服务实例操作参数（上线/下线）
 */
export interface NacosServiceInstanceAction extends NacosServerParams {
  serviceName: string;
  ip: string;
  port: number;
  namespaceId?: string;
  groupName?: string;
}

/**
 * Account Config 服务器配置
 */
export interface AccountConfig {
  id?: number;
  service_id?: number;
  service_name?: string;
  username?: string;
  password?: string;
  access_token?: string;
  url?: string;
  port?: number;
  type?: string;
}
