import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { SystemInfo } from "@/api/monitor/systemInformation/types";


export function listPage(
  queryParams?: SystemInfo
): AxiosPromise<PageRecords<SystemInfo[]>> {
  return request({
    url: "/monitor/systemInfo/listPage",
    method: "get",
    params: queryParams,
  });
}

/**
 * 删除部门
 *
 * @param ids
 */
export function deleteByIds(ids: number) {
  return request({
    url: "/monitor/systemInfo/deleteById/" + ids,
    method: "delete",
  });
}
