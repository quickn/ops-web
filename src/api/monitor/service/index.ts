import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { ServiceInfo } from "./types";

/**
 * 获取服务下拉列表（当前登录用户所在部门关联的服务）
 */
export function listAll(): AxiosPromise<ServiceInfo[]> {
  return request({
    url: "/serviceInfo/listByDeptId",
    method: "get"
  });
}

/**
 * 获取当前登录用户名下的服务列表（用于服务分配池）
 */
export function listOwnedServices(): AxiosPromise<ServiceInfo[]> {
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
 * 获取指定部门已分配的服务列表
 *
 * @param deptId 目标部门ID
 */
export function listDeptServices(deptId: number): AxiosPromise<ServiceInfo[]> {
  return request({
    url: "/serviceInfo/listDeptServices/" + deptId,
    method: "get"
  });
}

/**
 * 给部门分配服务（只能分配当前登录用户名下的服务）
 *
 * @param data deptId: 目标部门ID, serviceIds: 勾选的服务ID集合
 */
export function assignDeptServices(data: {
  deptId: number;
  serviceIds: number[];
}) {
  return request({
    url: "/serviceInfo/assignServices",
    method: "post",
    data: data
  });
}
