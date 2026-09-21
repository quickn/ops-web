import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { ServiceInfo } from "./types";

/**
 * 获取服务下拉列表（当前登录用户所在部门关联的服务）
 */
export function listAll(): AxiosPromise<ServiceInfo[]> {
  return request({
    url: "/serviceInfo/listAll",
    method: "get"
  });
}


export function listPage(
  queryParams?: ServiceInfo
): AxiosPromise<PageRecords<ServiceInfo[]>> {
  return request({
    url: "/serviceInfo/listPage",
    method: "get",
    params: queryParams
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
    data: data
  });
}
