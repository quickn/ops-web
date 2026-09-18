import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { ServiceInfo } from "./types";

export function listPage(
  queryParams?: ServiceInfo
): AxiosPromise<PageRecords<ServiceInfo[]>> {
  return request({
    url: "/monitor/systemInfo/diskPage",
    method: "get",
    params: queryParams
  });
}
