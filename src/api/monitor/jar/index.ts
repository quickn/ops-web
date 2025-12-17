import request from "@/utils/request";

export function listJarPackages(params) {
  return request({
    url: "/jar/list",
    method: "get",
    params,
  });
}

export function uploadJar(data) {
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

export function deployJar(id, data) {
  return request({
    url: `/jar/deploy/${id}`,
    method: "post",
    data,
  });
}

export function rebuildJar(id) {
  return request({
    url: `/jar/redeploy/${id}`,
    method: "post",
  });
}

export function getDeployRecords(jarPackageId) {
  return request({
    url: `/jar/deploy-records/${jarPackageId}`,
    method: "get",
  });
}

export function getDeployStatus(jarPackageId) {
  return request({
    url: `/jar/status/${jarPackageId}`,
    method: "get",
  });
}

export function deleteJar(id) {
  return request({
    url: `/jar/${id}`,
    method: "delete",
  });
}
