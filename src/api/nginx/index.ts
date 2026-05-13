import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { NginxFile } from "./types";
import { originServerList } from "@/api/monitor/agent";

/**
 * 部门树形表格
 *
 * @param queryParams
 */
export function listFiles(queryParams?: NginxFile): AxiosPromise<NginxFile[]> {
  return request({
    url: "/file-sync/list-files",
    method: "get",
    params: queryParams,
  });
}

/**
 * 获取agent列表
 */
export function getAgentList() {
  return originServerList({});
}


/**
 * 获取部门详情
 *
 * @param id
 */
export function addConfig(data?: NginxFile) {
  return request({
    url: "/nginx/addConfig",
    method: "post",
    data: data,
  });
}

/**
 *  修改部门
 *
 * @param id
 * @param data
 */
export function checkConfigApi(data?: NginxFile) {
  return request({
    url: "/nginx/check",
    method: "post",
    data: data,
  });
}

/**
 * 删除部门
 *
 * @param ids
 */
export function saveAndReloadConfigApi(data?: NginxFile) {
  return request({
    url: "/nginx/save",
    method: "put",
    data: data,
  });
}

/**
 * 删除部门
 *
 * @param ids
 */
export function deleteConfig(ids: number) {
  return request({
    url: "/nginx/delete/" + ids,
    method: "delete",
  });
}
