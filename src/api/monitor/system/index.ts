import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { SystemInfo } from "./types";

/**
 * 部门树形表格
 *
 * @param queryParams
 */
export function listData(
  queryParams?: SystemInfo
): AxiosPromise<PageRecords<SystemInfo[]>> {
  return request({
    url: "/monitor/systemInfo/listPage",
    method: "get",
    params: queryParams,
  });
}

/**
 * 获取部门详情
 *
 * @param id
 */
export function deleteByIds(id?: string) {
  return request({
    url: "/monitor/systemInfo/deleteById/" + id,
    method: "delete",
  });
}
