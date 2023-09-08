import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { NginxFile } from "./types";

/**
 * 部门树形表格
 *
 * @param queryParams
 */
export function listFiles(queryParams?: NginxFile): AxiosPromise<NginxFile[]> {
  return request({
    url: "/config/nginx/listFiles",
    method: "get",
    params: queryParams,
  });
}

/**
 * 部门下拉列表
 */
export function getConfig(queryParams?: NginxFile): AxiosPromise<[]> {
  return request({
    url: "/config/nginx/getConfig",
    method: "get",
    params: queryParams,
  });
}

/**
 * 获取部门详情
 *
 * @param id
 */
export function addConfig(data?: NginxFile) {
  return request({
    url: "/config/nginx/addConfig",
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
    url: "/config/nginx/check",
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
    url: "/config/nginx/save",
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
    url: "/config/nginx/delete/" + ids,
    method: "delete",
  });
}
