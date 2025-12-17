import request from "@/utils/request";

export function listJarPackages(params: any) {
  return request({
    url: "/jar/list",
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

export function getAllAgents() {
  return request({
    url: "/jar/agents",
    method: "get",
  });
}

export function deployJar(id: number, data: any) {
  return request({
    url: `/jar/deploy/${id}`,
    method: "post",
    data,
  });
}

export function rebuildJar(id: number) {
  return request({
    url: `/jar/redeploy/${id}`,
    method: "post",
  });
}

export function getDeployRecords(jarPackageId: number) {
  return request({
    url: `/jar/deploy-records/${jarPackageId}`,
    method: "get",
  });
}

export function getDeployStatus(jarPackageId: number) {
  return request({
    url: `/jar/status/${jarPackageId}`,
    method: "get",
  });
}

export function deleteJar(id: number) {
  return request({
    url: `/jar/${id}`,
    method: "delete",
  });
}
