import { AxiosPromise } from "axios";
import request from "@/utils/request";

export function compareTableStructure(
  queryParams?: string
): AxiosPromise<string> {
  return request({
    url: "/pyApi/db/compareTableStructure",
    method: "get",
    params: queryParams
  });
}

/** 表结构同步 - 比对两个数据库的表结构差异 */
export function syncTableStructure(params: {
  sourceConfigId: number;
  sourceDatabase: string;
  targetConfigId: number;
  targetDatabase: string;
  isDrop?: boolean;
}): AxiosPromise<string> {
  return request({
    url: "/pyApi/db/syncTableStructure",
    method: "get",
    params
  });
}

export function syncDataMenu(
  queryParams?: string
): AxiosPromise<string> {
  return request({
    url: "/pyApi/db/syncDataMenu",
    method: "get",
    params: queryParams
  });
}

/** 数据同步 - 同步参数 */
export interface SyncDataParams {
  sourceConfigId: number;
  sourceDatabase: string;
  targetConfigId: number;
  targetDatabase: string;
  tables: string[];
  isInsert?: boolean;
  isUpdate?: boolean;
  isDelete?: boolean;
}

/** 数据同步 - 将源库选定表的数据同步到目标库 */
export function syncData(params: SyncDataParams): AxiosPromise<string[]> {
  return request({
    url: "/pyApi/db/syncData",
    method: "post",
    data: params
  });
}

/** 数据比对 - 单表差异统计 */
export interface SyncDataDiffItem {
  table: string;
  primaryKey: string;
  sourceRows: number;
  targetRows: number;
  insertCount: number;
  updateCount: number;
  deleteCount: number;
  error: string;
}

/** 数据比对 - 只分析差异，不执行变更 */
export function syncDataCompare(
  params: SyncDataParams
): AxiosPromise<SyncDataDiffItem[]> {
  return request({
    url: "/pyApi/db/syncDataCompare",
    method: "post",
    data: params
  });
}
