import axios, { AxiosPromise } from "axios";

const requestPy = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API_PY,
  timeout: 50000,
  headers: { "Content-Type": "application/json;charset=utf-8" },
});

export function compareTableStructure(
  queryParams?: string
): AxiosPromise<string> {
  return requestPy({
    url: "/db/compareTableStructure",
    method: "get",
    params: queryParams
  });
}
