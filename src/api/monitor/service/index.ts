import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { ServiceInfo } from "./types";

export function listAll(): AxiosPromise<ServiceInfo[]> {
  return request({
    url: "/serviceInfo/listAll",
    method: "get",
  });
}

/**
 * 获取部门详情
 *
 * @param id
 */
export function addData(data?: ServiceInfo) {
  return request({
    url: "/heath/save",
    method: "post",
    data: data,
  });
}

/**
 * 删除部门
 *
 * @param ids
 */
export function deleteData(ids: number) {
  return request({
    url: "/heath/delete/" + ids,
    method: "delete",
  });
}
