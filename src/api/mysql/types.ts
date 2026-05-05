// api/mysql/types.ts

/** 连接配置 */
export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  charset?: string;
}

/** 活跃连接信息 */
export interface ConnectionInfo {
  connection_id: string;
  host: string;
  port: number;
  user: string;
}

/** 表信息 */
export interface TableInfo {
  name: string;
  engine: string;
  rows: number;
  data_length: string;
  index_length: string;
  create_time: string;
  comment: string;
}

/** 列信息 */
export interface ColumnInfo {
  Field: string;
  Type: string;
  Collation: string | null;
  Null: string;
  Key: string;
  Default: string | null;
  Extra: string;
  Privileges: string;
  Comment: string;
}

/** 索引信息 */
export interface IndexInfo {
  name: string;
  unique: boolean;
  columns: string[];
  type: string;
}

/** 表结构 */
export interface TableStructure {
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  create_sql: string;
}

/** 表数据查询结果 */
export interface TableDataResult {
  records: Record<string, any>[];
  total: number;
  page: number;
  page_size: number;
  columns: string[];
}

/** 列定义（用于创建表） */
export interface ColumnDef {
  name: string;
  type: string;
  length?: number;
  nullable: boolean;
  default?: any;
  comment: string;
  auto_increment: boolean;
  primary_key: boolean;
}

/** 表修改操作 */
export interface AlterOperation {
  action: "add_column" | "drop_column" | "modify_column" | "rename_table" | "add_index" | "drop_index";
  column?: ColumnDef;
  column_name?: string;
  new_name?: string;
  index_name?: string;
  columns?: string[];
  unique?: boolean;
}

/** SQL 执行结果 */
export interface SqlResult {
  type: "query" | "execute";
  columns?: string[];
  records?: Record<string, any>[];
  row_count?: number;
  affected_rows?: number;
  message?: string;
}

/** 统一响应 */
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  msg: string;
}
