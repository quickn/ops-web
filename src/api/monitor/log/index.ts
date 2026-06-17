import request from "@/utils/request";
import { AxiosPromise } from "axios";
import {LogCmdForm, LogInfo} from "./types";
import { de } from "element-plus/es/locale";

/**
 * 部门树形表格
 *
 * @param queryParams
 */
export function listData(
  queryParams?: LogInfo
): AxiosPromise<PageRecords<LogInfo[]>> {
  return request({
    url: "/monitor/logInfo/listPage",
    method: "get",
    params: queryParams,
  });
}

export function fileLogList(
  queryParams?: LogCmdForm
): AxiosPromise<string> {
  return request({
    url: "/log/realTime",
    method: "get",
    params: queryParams,
  });
}

export function fileLogAnalysis(
  queryParams?: LogCmdForm
): AxiosPromise<string> {
  return request({
    url: "/log/analysis",
    method: "get",
    params: queryParams,
    timeout: 120000
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
