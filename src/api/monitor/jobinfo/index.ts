import request from "@/utils/request";
import {AxiosPromise} from "axios";
import {JobInfo, JobInfoGroup} from "./types";

/**
 * 分页查询任务列表
 */
export function listJobPage(
  queryParams?: JobInfo
): AxiosPromise<PageRecords<JobInfo[]>> {
  return request({
    url: "/pyApi/jobinfo/page",
    method: "get",
    params: queryParams,
  });
}

export function jobGroupPageList(): AxiosPromise<JobInfoGroup[]> {
  return request({
    url: "/pyApi/jobinfo/jobGroupPageList",
    method: "get",
  });
}

/**
 * 根据ID获取任务详情
 */
export function getJobById(id: number): AxiosPromise<JobInfo> {
  return request({
    url: `/jobinfo/${id}`,
    method: "get",
  });
}

/**
 * 新增任务
 */
export function addJob(data: JobInfo) {
  return request({
    url: "/pyApi/jobinfo",
    method: "post",
    data,
  });
}

/**
 * 更新任务
 */
export function updateJob(data: JobInfo) {
  return request({
    url: `/jobinfo/${data.id}`,
    method: "put",
    data,
  });
}

/**
 * 删除任务
 */
export function deleteJob(id: number) {
  return request({
    url: `/jobinfo/${id}`,
    method: "delete",
  });
}

/**
 * 启动任务
 */
export function startJob(id: number) {
  return request({
    url: `/jobinfo/start/${id}`,
    method: "get",
  });
}

/**
 * 停止任务
 */
export function stopJob(id: number) {
  return request({
    url: `/jobinfo/stop/${id}`,
    method: "get",
  });
}

/**
 * 立即执行一次任务
 */
export function triggerJob(id: number, executorParam?: string) {
  return request({
    url: `/jobinfo/trigger/${id}`,
    method: "post",
    data: {executorParam},
  });
}

/**
 * 获取下次执行时间
 */
export function getNextTriggerTime(scheduleConf: string) {
  return request({
    url: "/pyApi/jobinfo/nextTriggerTime",
    method: "get",
    params: {scheduleConf},
  });
}
