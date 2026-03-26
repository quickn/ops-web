import { AxiosPromise } from "axios";
import request from "@/utils/request";

export function compareTableStructure(
  queryParams?: string
): AxiosPromise<string> {
  return request({
    url: "/pyApi/db/compareTableStructure",
    method: "get",
    params: queryParams
  });
}



export function syncDataMenu(
  queryParams?: string
): AxiosPromise<string> {
  return request({
    url: "/pyApi/db/syncDataMenu",
    method: "get",
    params: queryParams
  });
}
