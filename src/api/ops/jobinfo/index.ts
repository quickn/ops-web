import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { JobConfig, JobInfo, JobInfoGroup, JobLog } from "./types";


/**
 * 分页查询任务列表
 */
export function listJobPage(
  queryParams?: JobInfo
): AxiosPromise<PageRecords<JobInfo[]>> {
  return request({
    url: "/pyApi/jobinfo/page",
    method: "get",
    params: queryParams
  });
}

export function jobGroupPageList(configId: number): AxiosPromise<JobInfoGroup[]> {
  return request({
    url: "/pyApi/jobinfo/jobGroupPageList",
    method: "get",
    params: { configId: configId }
  });
}

/**
 * 根据ID获取任务详情
 */
export function getJobById(configId: number, id: number): AxiosPromise<JobInfo> {
  return request({
    url: `/pyApi/jobinfo/${id}`,
    method: "get",
    params: { configId: configId }
  });
}

/**
 * 新增任务
 */
export function addJob(data: JobInfo) {
  return request({
    url: "/pyApi/jobinfo/jobinfoAdd",
    method: "post",
    data
  });
}

/**
 * 更新任务
 */
export function updateJob(data: JobInfo) {
  return request({
    url: `/pyApi/jobinfo/jobinfoUpdate`,
    method: "post",
    data
  });
}

/**
 * 删除任务
 */
export function deleteJob(configId: number, id: number) {
  deleteTaskConfig(id);
  return request({
    url: `/pyApi/jobinfo/jobinfoRemove/${id}`,
    method: "get",
    params: { configId: configId }
  });
}

/**
 * 启动任务
 */
export function startJob(configId: number, id: number) {
  return request({
    url: `/pyApi/jobinfo/jobinfoStart/${id}`,
    method: "get",
    params: { configId: configId }
  });
}

/**
 * 停止任务
 */
export function stopJob(configId: number, id: number) {
  return request({
    url: `/pyApi/jobinfo/jobinfoStop/${id}`,
    method: "get",
    params: { configId: configId }
  });
}

/**
 * 立即执行一次任务
 */
export function triggerJob(configId: number, id: number, executorParam?: string) {
  return request({
    url: `/pyApi/jobinfo/trigger/${id}`,
    method: "post",
    params: { configId: configId },
    data: { executorParam }
  });
}

/**
 * 获取下次执行时间
 */
export function getNextTriggerTime(scheduleConf: string) {
  return request({
    url: "/pyApi/jobinfo/nextTriggerTime",
    method: "get",
    params: { scheduleConf }
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
    params: queryParams
  });
}

/** 获取任务配置 */
export function getTaskConfig(jobId: number): AxiosPromise<JobConfig> {
  return request({
    url: `/jobConfig/get/${jobId}`,
    method: "get"
  });
}

/** 保存任务配置 */
export function saveTaskConfig(data: JobConfig) {
  return request({
    url: "/jobConfig/save",
    method: "post",
    data
  });
}

/** 删除任务配置 */
export function deleteTaskConfig(jobId: number) {
  return request({
    url: `/jobConfig/delete/${jobId}`,
    method: "delete"
  });
}

/**
 * 根据日志ID获取执行日志详情
 */
export function getJobLogDetail(configId: number, id: number): AxiosPromise<JobLog> {
  return request({
    url: `/pyApi/jobinfo/logDetail/${id}`,
    method: "get",
    params: { configId: configId }
  });
}
