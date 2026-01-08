// api/monitor/jar/index.ts
import request from "@/utils/request";
import { DeployRequest } from "@/api/monitor/jar/types";

export function listJarPackages(params: any) {
  return request({
    url: "/jar/page",
    method: "get",
    params,
  });
}

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

export function getDockerfile(id: string) {
  return request({
    url: `/jar/${id}/dockerfile`,
    method: "get",
  });
}

export function updateDockerfile(id: string, dockerfileContent: string) {
  return request({
    url: `/jar/${id}/dockerfile`,
    method: "put",
    data: { dockerfileContent },
  });
}

export function getDockerCompose(id: string) {
  return request({
    url: `/jar/${id}/dockerCompose`,
    method: "get",
  });
}

export function updateDockerCompose(id: string, dockerComposeContent: string) {
  return request({
    url: `/jar/${id}/dockerCompose`,
    method: "put",
    data: { dockerComposeContent },
  });
}

export function getAllAgents() {
  return request({
    url: "/jar/agents",
    method: "get",
  });
}

export function deployJar(id: string, data: DeployRequest) {
  return request({
    url: `/jar/deploy/${id}`,
    method: "post",
    data,
  });
}

export function redeployJar(id: string, data?: DeployRequest) {
  return request({
    url: `/jar/redeploy/${id}`,
    method: "post",
    data,
  });
}

// 新增：重新构建容器接口
export function rebuildContainer(id: string, data?: DeployRequest) {
  return request({
    url: `/jar/rebuild/${id}`,
    method: "post",
    data,
  });
}

// 新增：获取所有版本接口
export function getAllVersions(fileName: string) {
  return request({
    url: `/jar/versions?fileName=${fileName}`,
    method: "get",
  });
}

export function getDeployRecords(jarPackageId: string) {
  return request({
    url: `/jar/deploy-records/${jarPackageId}`,
    method: "get",
  });
}

export function getDeployStatus(jarPackageId: string) {
  return request({
    url: `/jar/status/${jarPackageId}`,
    method: "get",
  });
}

export function deleteJar(id: string) {
  return request({
    url: `/jar/${id}`,
    method: "delete",
  });
}

export function replaceJarFile(id: string, data: FormData) {
  return request({
    url: `/jar/${id}/replace`,
    method: "post",
    data,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}
