import request from "@/utils/request";
import { AxiosPromise } from "axios";
import { FileInfo, FileInfoForm } from "./types";

/**
 * 上传文件
 *
 * @param file
 */
export function uploadFileApi(file: File): AxiosPromise<FileInfo> {
  const formData = new FormData();
  formData.append("file", file);
  return request({
    url: "/api/v1/files",
    method: "post",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
}


export function getByPathApi(queryParams?: FileInfoForm): AxiosPromise<[]> {
  return request({
    url: "/fileCmd/getFileByPath",
    method: "get",
    params: queryParams
  });
}


/**
 * 创建文件
 *
 * @param id
 */
export function createFileApi(data?: FileInfoForm) {
  return request({
    url: "/fileCmd/createFile",
    method: "post",
    params: data
  });
}


export function deleteFileApi(data?: FileInfoForm) {
  return request({
    url: "/fileCmd/deleteFile",
    method: "delete",
    params: data
  });
}
