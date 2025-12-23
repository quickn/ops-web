// /monitor/file-sync/index.ts
import request from "@/utils/request";
import type { BuildSyncCommandRequest } from "./types";

// 获取跳板机列表
export function getJumpServers() {
  return request({
    url: "/file-sync/jump-servers",
    method: "get",
  });
}

// 获取所有服务器列表（用于选择目标服务器）
export function getAllServers(params?: any) {
  return request({
    url: "/file-sync/all-servers",
    method: "get",
    params,
  });
}

// 查看服务器目录文件列表
export function listFiles(agentId: number, path: string) {
  return request({
    url: "/file-sync/list-files",
    method: "get",
    params: {
      agentId,
      path,
    },
  });
}

// 上传文件到跳板机
export function uploadToJumpServer(data: FormData) {
  return request({
    url: "/file-sync/upload",
    method: "post",
    data,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

// 直接使用rsync命令同步
export function syncWithCommand(data: { agentId: number; command: string }) {
  return request({
    url: "/file-sync/sync-with-command",
    method: "post",
    data,
  });
}

// 构建同步命令
export function buildSyncCommand(data: BuildSyncCommandRequest) {
  return request({
    url: "/file-sync/build-sync-command",
    method: "post",
    data,
  });
}
