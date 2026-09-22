import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { TaskAlert, TaskAlertQuery } from "./types";

const BASE = "/taskAlert";

/**
 * 任务告警列表（分页）
 */
export function listTaskAlertPage(
  queryParams?: TaskAlertQuery
): AxiosPromise<PageRecords<TaskAlert[]>> {
  return request({
    url: BASE + "/page",
    method: "get",
    params: queryParams
  });
}

/**
 * 获取任务告警详情
 */
export function getTaskAlertById(id: number): AxiosPromise<TaskAlert> {
  return request({
    url: BASE + "/" + id,
    method: "get"
  });
}

/**
 * 保存任务告警（新增/更新）
 */
export function saveTaskAlert(data: TaskAlert) {
  return request({
    url: BASE + "/save",
    method: "post",
    data
  });
}

/**
 * 删除任务告警
 */
export function deleteTaskAlert(id: number) {
  return request({
    url: BASE + "/delete/" + id,
    method: "delete"
  });
}

/**
 * 立即执行任务
 */
export function executeTaskAlert(id: number) {
  return request({
    url: BASE + "/execute/" + id,
    method: "post"
  });
}

/**
 * 手动触发任务告警扫描
 */
export function taskAlertCheck() {
  return request({
    url: BASE + "/taskAlertCheck",
    method: "get"
  });
}
