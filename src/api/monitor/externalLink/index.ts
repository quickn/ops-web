import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { ExternalLink } from "@/api/monitor/externalLink/types";


export function listPage(
  queryParams?: ExternalLink
): AxiosPromise<PageRecords<ExternalLink[]>> {
  return request({
    url: "/externalLink/page",
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
    url: "/systemInfo/deleteById/" + ids,
    method: "delete",
  });
}
