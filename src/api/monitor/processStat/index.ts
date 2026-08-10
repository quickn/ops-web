import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { ProcessStat } from "./types";

/**
 * 分页查询进程统计
 */
export function listPage(
  queryParams?: ProcessStat
): AxiosPromise<PageRecords<ProcessStat[]>> {
  return request({
    url: "/processStat/page",
    method: "get",
    params: queryParams,
  });
}

/**
 * 根据PID查询最近N条进程记录（用于图表）
 */
export function listByPid(
  pid: number,
  limit?: number,
  date?: string
): AxiosPromise<ProcessStat[]> {
  return request({
    url: "/processStat/listByPid",
    method: "get",
    params: { pid, limit: limit || 20, date },
  });
}
