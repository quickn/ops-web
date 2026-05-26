/**
 * API配置管理工具
 * 用于动态管理API请求地址，支持运行时修改
 */

const STORAGE_KEY_TARGET_URL = "api_target_url";
const STORAGE_KEY_TARGET_URL_PY = "api_target_url_py";

/** 获取主API地址（代理前缀或完整URL） */
export function getApiBaseUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEY_TARGET_URL);
  if (stored) {
    return getTargetUrl();
  }
  // 默认使用环境变量配置
  return import.meta.env.VITE_APP_BASE_API;
}

/** 获取Python API地址（代理前缀或完整URL） */
export function getApiBaseUrlPy(): string {
  const stored = localStorage.getItem(STORAGE_KEY_TARGET_URL_PY);
  if (stored) {
    return getTargetUrlPy();
  }
  // 默认使用环境变量配置
  return import.meta.env.VITE_APP_BASE_API_PY;
}

/** 获取后端目标地址（用于显示和配置参考） */
export function getTargetUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEY_TARGET_URL);
  if (stored) {
    return stored.replace(/\/$/, "");
  }
  return import.meta.env.VITE_APP_TARGET_URL;
}

/** 设置后端目标地址 */
export function setTargetUrl(url: string) {
  localStorage.setItem(STORAGE_KEY_TARGET_URL, url.replace(/\/$/, ""));
}

/** 获取Python后端目标地址 */
export function getTargetUrlPy(): string {
  const stored = localStorage.getItem(STORAGE_KEY_TARGET_URL_PY);
  if (stored) {
    return stored.replace(/\/$/, "");
  }
  return import.meta.env.VITE_APP_TARGET_URL_PY;
}

/** 设置Python后端目标地址 */
export function setTargetUrlPy(url: string) {
  localStorage.setItem(STORAGE_KEY_TARGET_URL_PY, url.replace(/\/$/, ""));
}

/** 获取完整的API配置信息 */
export function getApiConfig() {
  return {
    targetUrl: getTargetUrl(),
    targetUrlPy: getTargetUrlPy(),
    defaultTargetUrl: import.meta.env.VITE_APP_TARGET_URL,
    defaultTargetUrlPy: import.meta.env.VITE_APP_TARGET_URL_PY,
  };
}

/** 重置API配置为默认值 */
export function resetApiConfig() {
  localStorage.removeItem(STORAGE_KEY_TARGET_URL);
  localStorage.removeItem(STORAGE_KEY_TARGET_URL_PY);
}
