import request from "@/utils/request";
import type { JarPackage, JarDeployRecord } from "./types";

// JAR包列表
export function listJarPackages(params: any) {
  return request({
    url: "/jar/list",
    method: "get",
    params,
  });
}

// 上传JAR包
export function uploadJar(data: FormData) {
  return request({
    url: "/jar/upload",
    method: "post",
    data,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

// 初构建
export function initialBuild(id: number) {
  return request({
    url: `/jar/build/${id}`,
    method: "post",
  });
}

// 重新构建
export function rebuildJar(id: number) {
  return request({
    url: `/jar/rebuild/${id}`,
    method: "post",
  });
}

// 删除JAR包
export function deleteJar(id: number) {
  return request({
    url: `/jar/${id}`,
    method: "delete",
  });
}

// 获取可用Agent
export function getAvailableAgents(serviceId: number) {
  return request({
    url: `/jar/available-agents/${serviceId}`,
    method: "get",
  });
}

// 获取部署记录
export function getDeployRecords(jarPackageId: number) {
  return request({
    url: `/jar/deploy-records/${jarPackageId}`,
    method: "get",
  });
}

// 获取部署状态
export function getDeployStatus(jarPackageId: number) {
  return request({
    url: `/jar/status/${jarPackageId}`,
    method: "get",
  });
}
