import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { Agent, AgentForm, AgentConfig } from "./types";

export function listPage(
  queryParams?: Agent
): AxiosPromise<PageRecords<Agent[]>> {
  return request({
    url: "/agent/listPage",
    method: "get",
    params: queryParams
  });
}

export function originServerList(
  queryParams?: Agent
): AxiosPromise<PageRecords<Agent[]>> {
  return request({
    url: "/agent/list",
    method: "get",
    params: queryParams
  });
}

export function listAll(): AxiosPromise<ServiceInfo[]> {
  return request({
    url: "/serviceInfo/listAll",
    method: "get"
  });
}

/**
 * 获取部门详情
 *
 * @param id
 */
export function addData(data?: AgentForm) {
  return request({
    url: "/agent/save",
    method: "post",
    data: data
  });
}

/**
 * 删除部门
 *
 * @param ids
 */
export function deleteByIds(ids: number) {
  deleteAgentServerConfig(ids);
  return request({
    url: "/agent/delete/" + ids,
    method: "delete"
  });
}

export function upgradeClientByServiceId(id: number) {
  return request({
    url: "/agent/upgradeClientByServiceId/" + id,
    method: "get"
  });
}

export function handleAgent(id: number, cmd: string) {
  return request({
    url: "/agent/handleAgent/" + id,
    method: "get",
    params: { "cmd": cmd }
  });
}

export function batchHandleAgent(ids: number[], cmd: string) {
  return request({
    url: "/agent/batchHandleAgent",
    method: "post",
    data: { ids, cmd }
  });
}

/**
 * 获取代理服务配置列表
 */
export function listAgentConfigs(
  queryParams?: AgentConfig
): AxiosPromise<AgentConfig[]> {
  return request({
    url: "/agent-config",
    method: "get",
    params: queryParams
  });
}

/**
 * 获取代理服务配置表单数据
 */
export function getAgentServerConfigForm(
  id: number
): AxiosPromise<AgentConfig> {
  return request({
    url: `/agent-config/${id}/form`,
    method: "get"
  });
}

/**
 * 新增代理服务配置
 */
export function saveAgentServerConfig(data: AgentConfig) {
  return request({
    url: "/agent-config",
    method: "post",
    data: data
  });
}

/**
 * 删除代理服务配置
 */
export function deleteAgentServerConfig(ids: number) {
  return request({
    url: `/agent-config/${ids}`,
    method: "delete"
  });
}
