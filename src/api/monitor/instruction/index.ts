import request from "@/utils/request";
import { AxiosPromise } from "axios";
import {LogCmdForm, LogInfo} from "./types";

/**
 * 部门树形表格
 *
 * @param queryParams
 */
export function listData(
  queryParams?: LogInfo
): AxiosPromise<PageRecords<LogInfo[]>> {
  return request({
    url: "/cmdLog/page",
    method: "get",
    params: queryParams,
  });
}

export function dockerStats(
  queryParams?: LogInfo
): AxiosPromise<PageRecords<LogInfo[]>> {
  return request({
    url: "/dockerStats/page",
    method: "get",
    params: queryParams,
  });
}

export function fileLogList(
  queryParams?: LogCmdForm
): AxiosPromise<string> {
  return request({
    url: "/agent/getLogsByServiceId",
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
    url: "/monitor/logInfo/deleteById/" + id,
    method: "delete",
  });
}
