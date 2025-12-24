import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { ServiceInfo } from "./types";
import { SystemInfo } from "@/api/monitor/system/types";

export function listAll(): AxiosPromise<ServiceInfo[]> {
  return request({
    url: "/serviceInfo/listAll",
    method: "get",
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
    url: "/heath/save",
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
