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
  return request<ApiResponse<{ connection_id: string }>>({
    url: `${BASE}/connect/${config.id}`,
    method: "get",
    data: config
  });
}

/** 断开连接 */
export function disconnect(connection_id: string) {
  return request<ApiResponse>({
    url: `${BASE}/disconnect/${connection_id}`,
    method: "get",
    data: { connection_id }
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
export function listDatabases(connection_id: string) {
  return request<ApiResponse<string[]>>({
    url: `${BASE}/databases`,
    method: "get",
    params: { connection_id }
  });
}

/** 创建数据库 */
export function createDatabase(
  connection_id: string,
  db_name: string,
  charset = "utf8mb4",
  collation = "utf8mb4_unicode_ci"
) {
  return request<ApiResponse>({
    url: `${BASE}/databases`,
    method: "post",
    data: { connection_id, db_name, charset, collation }
  });
}

/** 删除数据库 */
export function dropDatabase(connection_id: string, db_name: string) {
  return request<ApiResponse>({
    url: `${BASE}/databases/${db_name}`,
    method: "delete",
    params: { connection_id }
  });
}

// ==================== 表管理 ====================

/** 获取表列表 */
export function listTables(connection_id: string, database: string) {
  return request<ApiResponse<TableInfo[]>>({
    url: `${BASE}/tables`,
    method: "get",
    params: { connection_id, database }
  });
}

/** 创建表 */
export function createTable(
  connection_id: string,
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
    data: { connection_id, database, table_name, columns, engine, charset, comment }
  });
}

/** 删除表 */
export function dropTable(connection_id: string, database: string, table_name: string) {
  return request<ApiResponse>({
    url: `${BASE}/tables/${table_name}`,
    method: "delete",
    params: { connection_id, database }
  });
}

/** 获取表结构 */
export function getTableStructure(connection_id: string, database: string, table_name: string) {
  return request<ApiResponse<TableStructure>>({
    url: `${BASE}/tables/${table_name}/structure`,
    method: "get",
    params: { connection_id, database }
  });
}

/** 修改表结构 */
export function alterTable(
  connection_id: string,
  database: string,
  table_name: string,
  operations: AlterOperation[]
) {
  return request<ApiResponse>({
    url: `${BASE}/tables/${table_name}/alter`,
    method: "put",
    data: { connection_id, database, operations }
  });
}

/** 查询表数据 */
export function queryTableData(
  connection_id: string,
  database: string,
  table_name: string,
  page = 1,
  page_size = 20
) {
  return request<ApiResponse<TableDataResult>>({
    url: `${BASE}/tables/${table_name}/data`,
    method: "get",
    params: { connection_id, database, page, page_size }
  });
}

/** 清空表数据 */
export function truncateTable(connection_id: string, database: string, table_name: string) {
  return request<ApiResponse>({
    url: `${BASE}/tables/${table_name}/truncate`,
    method: "post",
    params: { connection_id, database }
  });
}

// ==================== SQL 执行 ====================

/** 执行 SQL */
export function executeSql(connection_id: string, database: string, sql: string) {
  return request<ApiResponse<SqlResult>>({
    url: `${BASE}/execute`,
    method: "post",
    data: { connection_id, database, sql }
  });
}
