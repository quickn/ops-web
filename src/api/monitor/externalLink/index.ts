import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { ExternalLink } from "@/api/monitor/externalLink/types";


export function listPage(
  queryParams?: ExternalLink
): AxiosPromise<PageRecords<ExternalLink[]>> {
  return request({
    url: "/externalLink/page",
    method: "get",
    params: queryParams
  });
}

export function deleteByIds(ids: number) {
  return request({
    url: "/externalLink/delete/" + ids,
    method: "delete"
  });
}

export function addData(data?: ExternalLink) {
  return request({
    url: "/externalLink/save",
    method: "post",
    data: data
  });
}
