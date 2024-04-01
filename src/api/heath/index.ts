import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { HeathMonitor } from "./types";

/**
 * 部门树形表格
 *
 * @param queryParams
 */
export function listData(
  queryParams?: HeathMonitor
): AxiosPromise<PageRecords<HeathMonitor[]>> {
  return request({
    url: "/heath/listHeaths",
    method: "get",
    params: queryParams,
  });
}

/**
 * 获取部门详情
 *
 * @param id
 */
export function addData(data?: HeathMonitor) {
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
export function deleteData(ids: number|undefined) {
  return request({
    url: "/heath/delete/" + ids,
    method: "delete",
  });
}
