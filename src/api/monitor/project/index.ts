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
    url: "/project/page",
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
    url: "/project/" + id,
    method: "delete",
  });
}

export function addData(data?: ServiceInfo) {
  return request({
    url: "/project",
    method: "post",
    data: data,
  });
}


export function putData(data?: ServiceInfo) {
  return request({
    url: "/project/" + data?.id,
    method: "put",
    data: data,
  });
}

export function syncData(data?: ServiceInfo) {
  return request({
    url: "/project/sync/" + data?.projectId,
    method: "post",
    data: data,
  });
}

export function jarData(data?: ServiceInfo) {
  return request({
    url: "/jar/page",
    method: "get",
    data: data,
  });
}

export function agentList(id: number) {
  return request({
    url: "/agent/list",
    method: "get",
  });
}

export function deploy(data) {
  return request({
    url: "/project/deploy/" + data.id,
    method: "post",
    data: data
  });
}