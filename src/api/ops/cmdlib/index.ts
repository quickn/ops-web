import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { CmdLib, CmdLibQuery } from "./types";

/** 查询全部指令列表 */
export function listCmdLib(): AxiosPromise<CmdLib[]> {
  return request({
    url: "/cmdLib/list",
    method: "get",
  });
}

/** 分页查询指令 */
export function pageCmdLib(
  query: CmdLibQuery
): AxiosPromise<PageRecords<CmdLib[]>> {
  return request({
    url: "/cmdLib/page",
    method: "get",
    params: query,
  });
}

/** 查询指令详情 */
export function getCmdLibDetail(id: number): AxiosPromise<CmdLib> {
  return request({
    url: `/cmdLib/detail/${id}`,
    method: "get",
  });
}

/** 新增指令 */
export function addCmdLib(data: CmdLib) {
  return request({
    url: "/cmdLib/save",
    method: "post",
    data,
  });
}

/** 修改指令 */
export function updateCmdLib(data: CmdLib) {
  return request({
    url: "/cmdLib/update",
    method: "put",
    data,
  });
}

/** 删除指令 */
export function deleteCmdLib(id: number) {
  return request({
    url: `/cmdLib/delete/${id}`,
    method: "delete",
  });
}

/** 批量删除指令 */
export function batchDeleteCmdLib(ids: number[]) {
  return request({
    url: "/cmdLib/batchDelete",
    method: "delete",
    data: ids,
  });
}
