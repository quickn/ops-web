// api/mysql/index.ts
import request from "@/utils/request";
import { AxiosPromise } from "axios";
import type { AlterOperation, ApiResponse, ColumnDef, ConnectionConfig, ConnectionInfo, SqlResult, TableDataResult, TableInfo, TableStructure } from "./types";

const BASE = "/pyApi/mysql";

// ==================== 连接管理 ====================

/** 测试连接 */
export function testConnect(config: ConnectionConfig) {
  return request<ApiResponse<{ version_info: string }>>({
    url: `${BASE}/test-connect`,
    method: "post",
    data: config
  });
}

/** 建立连接 */
export function connect(config: ConnectionConfig) {
  return request<ApiResponse<{ configId: string }>>({
    url: `${BASE}/connect/${config.id}`,
    method: "get",
    data: config
  });
}

/** 断开连接 */
export function disconnect(configId: string) {
  return request<ApiResponse>({
    url: `${BASE}/disconnect/${configId}`,
    method: "get",
    data: { configId }
  });
}

/** 获取活跃连接列表 */
export function listConnections() {
  return request<AxiosPromise<ConnectionInfo[]>>({
    url: `${BASE}/connections`,
    method: "get"
  });
}

// ==================== 数据库管理 ====================

/** 获取数据库列表 */
export function listDatabases(configId: string) {
  return request<ApiResponse<string[]>>({
    url: `${BASE}/databases`,
    method: "get",
    params: { configId }
  });
}

/** 创建数据库 */
export function createDatabase(
  configId: string,
  db_name: string,
  charset = "utf8mb4",
  collation = "utf8mb4_unicode_ci"
) {
  return request<ApiResponse>({
    url: `${BASE}/databases`,
    method: "post",
    data: { configId, db_name, charset, collation }
  });
}

/** 删除数据库 */
export function dropDatabase(configId: string, db_name: string) {
  return request<ApiResponse>({
    url: `${BASE}/databases/${db_name}`,
    method: "delete",
    params: { configId }
  });
}

// ==================== 表管理 ====================

/** 获取表列表 */
export function listTables(configId: string, database: string) {
  return request<ApiResponse<TableInfo[]>>({
    url: `${BASE}/tables`,
    method: "get",
    params: { configId, database }
  });
}

/** 创建表 */
export function createTable(
  configId: string,
  database: string,
  table_name: string,
  columns: ColumnDef[],
  engine = "InnoDB",
  charset = "utf8mb4",
  comment = ""
) {
  return request<ApiResponse>({
    url: `${BASE}/tables`,
    method: "post",
    data: { configId, database, table_name, columns, engine, charset, comment }
  });
}

/** 删除表 */
export function dropTable(configId: string, database: string, table_name: string) {
  return request<ApiResponse>({
    url: `${BASE}/tables/${table_name}`,
    method: "delete",
    params: { configId, database }
  });
}

/** 获取表结构 */
export function getTableStructure(configId: string, database: string, table_name: string) {
  return request<ApiResponse<TableStructure>>({
    url: `${BASE}/tables/${table_name}/structure`,
    method: "get",
    params: { configId, database }
  });
}

/** 修改表结构 */
export function alterTable(
  configId: string,
  database: string,
  table_name: string,
  operations: AlterOperation[]
) {
  return request<ApiResponse>({
    url: `${BASE}/tables/${table_name}/alter`,
    method: "put",
    data: { configId, database, operations }
  });
}

/** 查询表数据 */
export function queryTableData(
  configId: string,
  database: string,
  table_name: string,
  page = 1,
  page_size = 20
) {
  return request<ApiResponse<TableDataResult>>({
    url: `${BASE}/tables/${table_name}/data`,
    method: "get",
    params: { configId, database, page, page_size }
  });
}

/** 清空表数据 */
export function truncateTable(configId: string, database: string, table_name: string) {
  return request<ApiResponse>({
    url: `${BASE}/tables/${table_name}/truncate`,
    method: "post",
    params: { configId, database }
  });
}

// ==================== SQL 执行 ====================

/** 执行 SQL */
export function executeSql(configId: string, database: string, sql: string) {
  return request<ApiResponse<SqlResult>>({
    url: `${BASE}/execute`,
    method: "post",
    data: { configId, database, sql }
  });
}
