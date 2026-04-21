import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { AgentConfig, AgentConfigForm } from "./types";

export function listPage(
  queryParams?: AgentConfig
): AxiosPromise<PageRecords<AgentConfig[]>> {
  return request({
    url: "/agent/listPage",
    method: "get",
    params: queryParams
  });
}

export function listAll(): AxiosPromise<ServiceInfo[]> {
  return request({
    url: "/serviceInfo/listAll",
    method: "get",
  });
}
/**
 * 获取部门详情
 *
 * @param id
 */
export function addData(data?: AgentConfigForm) {
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
