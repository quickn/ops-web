import request from "@/utils/request";
import { AxiosPromise } from "axios";
import {
  NacosConfigQuery,
  NacosConfigDetailQuery,
  NacosServiceQuery,
  NacosServiceDetailQuery,
  NacosServerParams,
  NacosConfigPublish,
  NacosServiceInstanceAction,
} from "./types";

/**
 * 获取配置列表
 * GET /pyApi/nacos/configs
 */
export function getConfigs(
  queryParams?: NacosConfigQuery
): AxiosPromise<any> {
  return request({
    url: "/pyApi/nacos/configs",
    method: "get",
    params: queryParams,
  });
}

/**
 * 获取配置详情（配置内容）
 * GET /pyApi/nacos/configs/detail
 */
export function getConfigDetail(
  queryParams?: NacosConfigDetailQuery
): AxiosPromise<any> {
  return request({
    url: "/pyApi/nacos/configs/detail",
    method: "get",
    params: queryParams,
  });
}

/**
 * 获取服务列表
 * GET /pyApi/nacos/services
 */
export function getServices(
  queryParams?: NacosServiceQuery
): AxiosPromise<any> {
  return request({
    url: "/pyApi/nacos/services",
    method: "get",
    params: queryParams,
  });
}

/**
 * 获取服务实例列表（服务详情）
 * GET /pyApi/nacos/services/detail
 */
export function getServiceDetail(
  queryParams?: NacosServiceDetailQuery
): AxiosPromise<any> {
  return request({
    url: "/pyApi/nacos/services/detail",
    method: "get",
    params: queryParams,
  });
}

/**
 * 获取命名空间列表
 * GET /pyApi/nacos/namespaces
 */
export function getNamespaces(
  queryParams?: NacosServerParams
): AxiosPromise<any> {
  return request({
    url: "/pyApi/nacos/namespaces",
    method: "get",
    params: queryParams,
  });
}

/**
 * 发布配置（新增或编辑）
 * POST /pyApi/nacos/publishConfig
 */
export function publishConfig(data: NacosConfigPublish): AxiosPromise<any> {
  return request({
    url: "/pyApi/nacos/publishConfig",
    method: "post",
    data: data,
  });
}

/**
 * 删除配置
 * DELETE /pyApi/nacos/deleteConfigs
 */
export function deleteConfigApi(
  queryParams: NacosConfigDetailQuery
): AxiosPromise<any> {
  return request({
    url: "/pyApi/nacos/deleteConfigs",
    method: "delete",
    params: queryParams,
  });
}

/**
 * 上线服务实例
 * PUT /pyApi/nacos/services/online
 */
export function onlineServiceInstance(
  data: NacosServiceInstanceAction
): AxiosPromise<any> {
  return request({
    url: "/pyApi/nacos/services/online",
    method: "put",
    data: data,
  });
}

/**
 * 下线服务实例
 * PUT /pyApi/nacos/services/offline
 */
export function offlineServiceInstance(
  data: NacosServiceInstanceAction
): AxiosPromise<any> {
  return request({
    url: "/pyApi/nacos/services/offline",
    method: "put",
    data: data,
  });
}

/**
 * 获取 Nacos 服务器配置列表
 * GET /pyApi/accountConfig/list?type=nacos
 */
export function getNacosServerList(): AxiosPromise<any> {
  return request({
    url: "/pyApi/accountConfig/list",
    method: "get",
    params: { type: "nacos" },
  });
}
