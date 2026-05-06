import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { ServiceInfo } from "./types";
import { SystemInfo } from "@/api/monitor/systemInformation/types";

export function listAll(): AxiosPromise<ServiceInfo[]> {
  return request({
    url: "/serviceInfo/listAll",
    method: "get",
  });
}

export function agentList(
  queryParams?: AgentConfig
): AxiosPromise<PageRecords<AgentConfig[]>> {
  return request({
    url: "/agent/list",
    method: "get",
    params: queryParams
  });
}

export function listPage(
  queryParams?: ServiceInfo
): AxiosPromise<PageRecords<ServiceInfo[]>> {
  return request({
    url: "/serviceInfo/listPage",
    method: "get",
    params: queryParams,
  });
}

/**
 * 获取部门详情
 *
 * @param id
 */
export function addData(data?: ServiceInfo) {
  return request({
    url: "/serviceInfo/save",
    method: "post",
    data: data,
  });
}

/**
 * 删除部门
 *
 * @param ids
 */
export function deleteData(ids: number) {
  return request({
    url: "/serviceInfo/delete/" + ids,
    method: "delete",
  });
}

export function upgradeClientByServiceId(id: number) {
  return request({
    url: "/serviceInfo/upgradeClientByServiceId/" + id,
    method: "get",
  });
}

// 日志列表
export function listFiles(agentId: number, path: string) {
  return request({
    url: "/fileLog/listFiles",
    method: "get",
    params: {
      agentId,
      path,
    },
  });
}

// 分析日志
export function analyzerLog(agentId: number, logFilePath: string) {
  return request({
    url: "/fileLog/analyzerLog",
    method: "get",
    params: {
      agentId,
      logFilePath,
    },
  });
}