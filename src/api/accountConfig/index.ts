import request from "@/utils/request";
import type { AccountConfig, ApiResponse } from "./types";

const SAVED_BASE = "/pyApi/accountConfig";

/** 获取所有保存的连接配置 */
export function getSavedConfigs(config: AccountConfig) {
  return request<ApiResponse<AccountConfig[]>>({
    url: SAVED_BASE + "/list",
    method: "get",
    params: config
  });
}

/** 新增保存的连接配置 */
export function addSavedConfig(config: AccountConfig) {
  return request<ApiResponse>({
    url: SAVED_BASE + "/add",
    method: "post",
    data: config
  });
}

/** 更新保存的连接配置 */
export function updateSavedConfig(index: number, config: AccountConfig) {
  return request<ApiResponse>({
    url: SAVED_BASE + "/update/" + index,
    method: "put",
    data: config
  });
}

/** 删除保存的连接配置 */
export function deleteSavedConfig(index: number) {
  return request<ApiResponse>({
    url: SAVED_BASE + "/delete" + index,
    method: "delete"
  });
}
