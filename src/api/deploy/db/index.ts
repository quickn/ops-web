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

/** 表结构同步 - 比对两个数据库的表结构差异 */
export function syncTableStructure(params: {
  sourceConfigId: number;
  sourceDatabase: string;
  targetConfigId: number;
  targetDatabase: string;
}): AxiosPromise<string> {
  return request({
    url: "/pyApi/db/syncTableStructure",
    method: "get",
    params
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
