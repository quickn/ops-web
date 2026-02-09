import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { EmailConfig } from "./types";

/**
 * 部门树形表格
 *
 * @param queryParams
 */
export function getLastData(): AxiosPromise<EmailConfig> {
  return request({
    url: "/monitor/mailConfig/getLastData",
    method: "get",
  });
}

/**
 * 获取部门详情
 *
 * @param id
 */
export function addData(data?: EmailConfig) {
  return request({
    url: "/monitor/mailConfig/save",
    method: "post",
    data: data,
  });
}

export function testSend(data?: EmailConfig) {
  return request({
    url: "/monitor/mailConfig/test",
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
    url: "/monitor/mailConfig/delete/" + ids,
    method: "delete",
  });
}
