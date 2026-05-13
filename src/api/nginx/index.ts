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
    params: queryParams
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
    data: data
  });
}

/**
 * 测试配置
 *
 * @param data
 */

export function checkConfigApi(data?: NginxFile) {
  return request({
    url: "/nginx/test",
    method: "post",
    data: data
  });
}

/**
 * 重新加载配置
 *
 * @param data
 */

export function saveAndReloadConfigApi(data?: NginxFile) {
  return request({
    url: "/nginx/reload",
    method: "post",
    data: data
  });
}

/**
 * 停止Nginx
 *
 * @param data
 */

export function stopNginx(data?: NginxFile) {
  return request({
    url: "/nginx/stop",
    method: "post",
    data: data
  });
}

export function deleteConfig(ids: number) {
  return request({
    url: "/nginx/delete/" + ids,
    method: "delete"
  });
}
