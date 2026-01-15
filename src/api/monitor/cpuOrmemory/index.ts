import request from "@/utils/request";
import { AxiosPromise } from "axios";
import {AgentConfig, AgentConfigForm} from "./types";

export function cpuList(data?: DeployRequest) {
  return request({
    url: `/chart/cpu`,
    method: "post",
    data,
  });
}

export function memList(data?: DeployRequest) {
  return request({
    url: `/chart/mem`,
    method: "post",
    data,
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
    data: data,
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
    method: "delete",
  });
}

export function upgradeClientByServiceId(id: number) {
  return request({
    url: "/agent/upgradeClientByServiceId/" + id,
    method: "get",
  });
}
