import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { ServiceInfo } from "./types";

export function listAll(): AxiosPromise<ServiceInfo[]> {
  return request({
    url: "/serviceInfo/listByUserId",
    method: "get"
  });
}

export function listByUserId(): AxiosPromise<ServiceInfo[]> {
  return request({
    url: "/serviceInfo/listAll",
    method: "get"
  });
}

export function listPage(
  queryParams?: ServiceInfo
): AxiosPromise<PageRecords<ServiceInfo[]>> {
  return request({
    url: "/serviceInfo/listPage",
    method: "get",
    params: queryParams
  });
}

/**
 * 获取部门详情
 *
 * @param id
 */
export function addData(data?: ServiceInfo) {
  return request({
    url: "/serviceInfo/save",
    method: "post",
    data: data
  });
}

/**
 * 获取指定用户已分配的服务列表
 *
 * @param userId 目标用户ID
 */
export function listUserServices(userId: number): AxiosPromise<ServiceInfo[]> {
  return request({
    url: "/serviceInfo/listUserServices/" + userId,
    method: "get"
  });
}

/**
 * 给用户分配服务（只能分配当前登录用户名下的服务）
 *
 * @param data userId: 目标用户ID, serviceIds: 勾选的服务ID集合
 */
export function assignUserServices(data: {
  userId: number;
  serviceIds: number[];
}) {
  return request({
    url: "/serviceInfo/assignServices",
    method: "post",
    data: data
  });
}
