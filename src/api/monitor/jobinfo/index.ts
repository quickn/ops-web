import request from "@/utils/request";
import {AxiosPromise} from "axios";
import {JobInfo, JobInfoGroup, JobLog} from "./types";

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
    url: `/pyApi/jobinfo/${id}`,
    method: "get",
  });
}

/**
 * 新增任务
 */
export function addJob(data: JobInfo) {
  return request({
    url: "/pyApi/jobinfo/jobinfoAdd",
    method: "post",
    data,
  });
}

/**
 * 更新任务
 */
export function updateJob(data: JobInfo) {
  return request({
    url: `/pyApi/jobinfo/jobinfoUpdate`,
    method: "post",
    data,
  });
}

/**
 * 删除任务
 */
export function deleteJob(id: number) {
  return request({
    url: `/pyApi/jobinfo/jobinfoRemove/${id}`,
    method: "get",
  });
}

/**
 * 启动任务
 */
export function startJob(id: number) {
  return request({
    url: `/pyApi/jobinfo/jobinfoStart/${id}`,
    method: "get",
  });
}

/**
 * 停止任务
 */
export function stopJob(id: number) {
  return request({
    url: `/pyApi/jobinfo/jobinfoStop/${id}`,
    method: "get",
  });
}

/**
 * 立即执行一次任务
 */
export function triggerJob(id: number, executorParam?: string) {
  return request({
    url: `/pyApi/jobinfo/trigger/${id}`,
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


/**
 * 分页查询调度日志
 */
export function getJobLogPage(
  queryParams?: JobLog
): AxiosPromise<PageRecords<JobLog[]>> {
  return request({
    url: "/pyApi/jobinfo/logPage",
    method: "get",
    params: queryParams,
  });
}

/**
 * 根据日志ID获取执行日志详情
 */
export function getJobLogDetail(id: number): AxiosPromise<JobLog> {
  return request({
    url: `/pyApi/jobinfo/logDetail/${id}`,
    method: "get",
  });
}
