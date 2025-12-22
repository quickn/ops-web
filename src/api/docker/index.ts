import request from "@/utils/request";
import { AxiosPromise } from "axios";
import {DockerContainer, DockerContainerInfo} from "./types";

/**
 * 部门树形表格
 *
 * @param queryParams
 */
export function listData(
  queryParams?: DockerContainer
): AxiosPromise<PageRecords<DockerContainer[]>> {
  return request({
    url: "/docker/container/list",
    method: "get",
    params: queryParams,
  });
}

/**
 * 获取部门详情
 *
 * @param id
 */
export function updateById(data?: DockerContainerInfo) {
  return request({
    url: "/docker/container/updateById",
    method: "post",
    data: data,
  });
}

/**
 * 重启服务
 *
 * @param ids
 */
export function restartDocker(id: number) {
  return request({
    url: "/docker/container/restart/" + id,
    method: "get",
  });
}

export function stopDocker(id: number) {
  return request({
    url: "/docker/container/stop/" + id,
    method: "get",
  });
}

export function getListByServiceId(serviceId: number): AxiosPromise<string[]> {
  return request({
    url: "/docker/container/getListByServiceId/" + serviceId,
    method: "get",
  });
}
