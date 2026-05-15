import request from "@/utils/request";
import { NginxFile } from "./types";


/**
 * 测试配置
 *
 * @param data
 */

export function checkConfigApi(data?: NginxFile) {
  return request({
    url: "/nginx/test",
    method: "post",
    data: data
  });
}

/**
 * 重新加载配置
 *
 * @param data
 */

export function saveAndReloadConfigApi(data?: NginxFile) {
  return request({
    url: "/nginx/reload",
    method: "post",
    data: data
  });
}

/**
 * 停止Nginx
 *
 * @param data
 */

export function stopNginx(data?: NginxFile) {
  return request({
    url: "/nginx/stop",
    method: "post",
    data: data
  });
}
