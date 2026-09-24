<script setup lang="ts">
import {
  alterTable,
  createTable,
  dropTable,
  getTableStructure,
  listDatabases,
  listTables,
  truncateTable,
} from "@/api/mysql";
import type {
  ColumnDef,
  ColumnInfo,
  TableInfo,
  TableStructure,
} from "@/api/mysql/types";
import { useRoute, useRouter } from "vue-router";

// ==================== 路由参数 ====================
const route = useRoute();
const router = useRouter();
const connectionId = (route.query.configId as string) || "";
const configName = (route.query.configName as string) || "";
const databases = ref<string[]>([]);
const currentDatabase = ref((route.query.database as string) || "");

// ==================== 状态 ====================
const loading = ref(false);
const tables = ref<TableInfo[]>([]);
const searchKeyword = ref("");

/** 根据搜索关键字过滤表 */
const filteredTables = computed(() => {
  if (!searchKeyword.value) return tables.value;
  const kw = searchKeyword.value.toLowerCase();
  return tables.value.filter((t) => t.name.toLowerCase().includes(kw));
});

// ---- 表结构查看 ----
const structureVisible = ref(false);
const structureLoading = ref(false);
const currentTable = ref("");
const tableStructure = ref<TableStructure | null>(null);

// ---- 创建表 ----
const createVisible = ref(false);
const createColumns = ref<ColumnDef[]>([
  {
    name: "id",
    type: "INT",
    length: 11,
    nullable: false,
    default: undefined,
    comment: "主键ID",
    auto_increment: true,
    primary_key: true,
  },
]);
const createForm = reactive({
  table_name: "",
  engine: "InnoDB",
  charset: "utf8mb4",
  comment: "",
});

// ---- 设计表（仿 Navicat） ----
const designVisible = ref(false);
const designTableName = ref("");
const designSaving = ref(false);
const designActiveTab = ref("columns");

/** 可用数据类型 */
const columnTypes = [
  "INT", "BIGINT", "TINYINT", "SMALLINT",
  "VARCHAR", "CHAR", "TEXT", "LONGTEXT",
  "DATE", "DATETIME", "TIMESTAMP",
  "DECIMAL", "FLOAT", "DOUBLE",
  "JSON",
];

/** 设计器字段行 */
interface DesignColumn {
  /** 列名（已有列不可改） */
  Field: string;
  type: string;
  length: number | undefined;
  nullable: boolean;
  comment: string;
  isPk: boolean;
  /** 是否新增列 */
  isNew: boolean;
  /** 标记删除（已有列删除时标记而非移除，便于 diff） */
  deleted: boolean;
  /** 原始字段（识别修改用） */
  orig: ColumnInfo | null;
}

/** 设计器索引行 */
interface DesignIndex {
  name: string;
  columns: string[];
  unique: boolean;
  isNew: boolean;
  /** 标记删除 */
  deleted: boolean;
}

const designColumns = ref<DesignColumn[]>([]);
const designIndexes = ref<DesignIndex[]>([]);
/** 选中的字段行（用于插入/删除） */
const selectedDesignColumn = ref<DesignColumn | null>(null);
const selectedDesignIndex = ref<DesignIndex | null>(null);

/** 设计表内表格自适应最大高度：
 *  视口高度 - 弹框上下留白(6vh) - 标题(54) - tabs 头(55) - 工具栏(40) - 表头(40) - 底部按钮(62) - 余量 */
const { height: winHeight } = useWindowSize();
const designTableMaxHeight = computed(() =>
  Math.max(winHeight.value - 0.06 * winHeight.value - 251, 240)
);

/** 解析 "varchar(255)" → { type, length } */
function parseColType(typeStr: string): { type: string; length?: number } {
  const m = /^(\w+)\((\d+)(?:,\d+)?\)/.exec(typeStr);
  if (m) return { type: m[1].toUpperCase(), length: Number(m[2]) };
  return { type: typeStr.toUpperCase(), length: undefined };
}

/** 打开设计表对话框 */
async function openDesigner(tableName: string) {
  designTableName.value = tableName;
  designActiveTab.value = "columns";
  designColumns.value = [];
  designIndexes.value = [];
  selectedDesignColumn.value = null;
  selectedDesignIndex.value = null;
  designVisible.value = true;
  structureLoading.value = true;
  try {
    const res: any = await getTableStructure(
      connectionId,
      currentDatabase.value,
      tableName
    );
    const structure: TableStructure = res.data;
    designColumns.value = (structure.columns || []).map((c) => {
      const parsed = parseColType(c.Type);
      return {
        Field: c.Field,
        type: parsed.type,
        length: parsed.length,
        nullable: c.Null === "YES",
        comment: c.Comment || "",
        isPk: c.Key === "PRI",
        isNew: false,
        deleted: false,
        orig: c,
      };
    });
    designIndexes.value = (structure.indexes || []).map((idx) => ({
      name: idx.name,
      columns: [...idx.columns],
      unique: idx.unique,
      isNew: false,
      deleted: false,
    }));
  } catch (e: any) {
    ElMessage.error(e?.message || "获取表结构失败");
    designVisible.value = false;
  } finally {
    structureLoading.value = false;
  }
}

/** 新建空字段行 */
function newDesignColumn(): DesignColumn {
  return {
    Field: "",
    type: "VARCHAR",
    length: 255,
    nullable: true,
    comment: "",
    isPk: false,
    isNew: true,
    deleted: false,
    orig: null,
  };
}

/** 添加字段（末尾追加） */
function addDesignColumn() {
  const row = newDesignColumn();
  designColumns.value.push(row);
  selectedDesignColumn.value = row;
}

/** 在选中行后插入字段 */
function insertDesignColumn() {
  const row = newDesignColumn();
  const idx = designColumns.value.indexOf(selectedDesignColumn.value!);
  if (idx >= 0) {
    designColumns.value.splice(idx + 1, 0, row);
  } else {
    designColumns.value.push(row);
  }
  selectedDesignColumn.value = row;
}

/** 删除选中字段（标记删除，新增行直接移除） */
function removeDesignColumn() {
  const row = selectedDesignColumn.value;
  if (!row) return;
  if (row.isNew) {
    designColumns.value.splice(designColumns.value.indexOf(row), 1);
  } else {
    if (row.isPk) {
      ElMessage.warning("主键列不允许在此删除");
      return;
    }
    row.deleted = true;
  }
  selectedDesignColumn.value = null;
}

/** 添加索引 */
function addDesignIndex() {
  const row: DesignIndex = {
    name: "",
    columns: [],
    unique: false,
    isNew: true,
    deleted: false,
  };
  designIndexes.value.push(row);
  selectedDesignIndex.value = row;
}

/** 删除选中索引（标记删除，新增行直接移除） */
function removeDesignIndex() {
  const row = selectedDesignIndex.value;
  if (!row) return;
  if (row.isNew) {
    designIndexes.value.splice(designIndexes.value.indexOf(row), 1);
  } else {
    row.deleted = true;
  }
  selectedDesignIndex.value = null;
}

/** 已有列是否有修改（用于字段名高亮） */
function isColumnChanged(col: DesignColumn): boolean {
  if (col.isNew || !col.orig) return false;
  const origParsed = parseColType(col.orig.Type);
  return (
    origParsed.type !== col.type ||
    origParsed.length !== col.length ||
    (col.orig.Null === "YES") !== col.nullable ||
    (col.orig.Comment || "") !== col.comment
  );
}

/** 保存设计（diff 生成 ALTER 操作批量执行） */
async function saveDesign() {
  const operations: any[] = [];

  // 1. 删除列（被标记删除的已有列）
  for (const col of designColumns.value.filter((c) => c.deleted && c.orig)) {
    operations.push({ action: "drop_column", column_name: col.orig!.Field });
  }

  // 2. 新增列
  for (const col of designColumns.value.filter((c) => c.isNew && !c.deleted)) {
    if (!col.Field) {
      ElMessage.warning("新增列的列名不能为空");
      return;
    }
    operations.push({
      action: "add_column",
      column: {
        name: col.Field,
        type: col.type,
        length: col.length,
        nullable: col.nullable,
        comment: col.comment,
        primary_key: col.isPk,
      },
    });
  }

  // 3. 修改列（类型/长度/非空/注释 与原结构对比）
  for (const col of designColumns.value) {
    if (col.isNew || col.deleted || !col.orig) continue;
    const orig = col.orig;
    const origParsed = parseColType(orig.Type);
    const changed =
      origParsed.type !== col.type ||
      origParsed.length !== col.length ||
      (orig.Null === "YES") !== col.nullable ||
      (orig.Comment || "") !== col.comment;
    if (changed) {
      operations.push({
        action: "modify_column",
        column: {
          name: col.Field,
          type: col.type,
          length: col.length,
          nullable: col.nullable,
          comment: col.comment,
        },
      });
    }
  }

  // 4. 删除索引（被标记删除的已有索引）
  for (const idx of designIndexes.value.filter((i) => i.deleted && !i.isNew)) {
    operations.push({ action: "drop_index", index_name: idx.name });
  }

  // 5. 新增索引
  for (const idx of designIndexes.value.filter((i) => i.isNew && !i.deleted)) {
    if (!idx.name || idx.columns.length === 0) {
      ElMessage.warning("索引需要名称且至少选择一个字段");
      return;
    }
    operations.push({
      action: "add_index",
      index_name: idx.name,
      columns: idx.columns,
      unique: idx.unique,
    });
  }

  if (operations.length === 0) {
    ElMessage.info("没有变更");
    designVisible.value = false;
    return;
  }

  designSaving.value = true;
  try {
    const res: any = await alterTable(
      connectionId,
      currentDatabase.value,
      designTableName.value,
      operations
    );
    ElMessage.success(res.msg || "表结构修改成功");
    designVisible.value = false;
    await fetchTables();
  } catch (e: any) {
    ElMessage.error(e?.message || "修改失败");
  } finally {
    designSaving.value = false;
  }
}

// ==================== 方法 ====================

async function fetchTables() {
  if (!connectionId || !currentDatabase.value) {
    ElMessage.warning("缺少连接信息");
    router.push("/mysql/connection");
    return;
  }
  loading.value = true;
  try {
    const res: any = await listTables(connectionId, currentDatabase.value);
    tables.value = res.data || [];
  } catch (e: any) {
    ElMessage.error(e?.message || "获取表列表失败");
  } finally {
    loading.value = false;
  }
}

// ---- 查看结构 ----
async function viewStructure(tableName: string) {
  currentTable.value = tableName;
  structureVisible.value = true;
  structureLoading.value = true;
  tableStructure.value = null;
  try {
    const res: any = await getTableStructure(
      connectionId,
      currentDatabase.value,
      tableName
    );
    tableStructure.value = res.data;
  } catch (e: any) {
    ElMessage.error(e?.message || "获取表结构失败");
  } finally {
    structureLoading.value = false;
  }
}

// ---- 创建表 ----
function showCreateTable() {
  createForm.table_name = "";
  createForm.engine = "InnoDB";
  createForm.charset = "utf8mb4";
  createForm.comment = "";
  createColumns.value = [
    {
      name: "id",
      type: "INT",
      length: 11,
      nullable: false,
      default: undefined,
      comment: "主键ID",
      auto_increment: true,
      primary_key: true,
    },
  ];
  createVisible.value = true;
}

function addColumn() {
  createColumns.value.push({
    name: "",
    type: "VARCHAR",
    length: 255,
    nullable: true,
    comment: "",
    auto_increment: false,
    primary_key: false,
  });
}

function removeColumn(index: number) {
  if (createColumns.value.length <= 1) {
    ElMessage.warning("至少保留一列");
    return;
  }
  createColumns.value.splice(index, 1);
}

async function handleCreateTable() {
  if (!createForm.table_name) {
    ElMessage.warning("请输入表名");
    return;
  }
  // 验证列名
  for (const col of createColumns.value) {
    if (!col.name) {
      ElMessage.warning("请填写所有列名");
      return;
    }
  }
  try {
    const res: any = await createTable(
      connectionId,
      currentDatabase.value,
      createForm.table_name,
      createColumns.value,
      createForm.engine,
      createForm.charset,
      createForm.comment
    );
    ElMessage.success(res.msg);
    createVisible.value = false;
    await fetchTables();
  } catch (e: any) {
    ElMessage.error(e?.message || "创建失败");
  }
}

// ---- 删除表 ----
async function handleDropTable(tableName: string) {
  ElMessageBox.confirm(
    `确定要删除表 "${tableName}" 吗？此操作不可恢复！`,
    "危险操作",
    {
      confirmButtonText: "确定删除",
      cancelButtonText: "取消",
      type: "error",
    }
  )
    .then(async () => {
      try {
        const res: any = await dropTable(
          connectionId,
          currentDatabase.value,
          tableName
        );
        ElMessage.success(res.msg);
        await fetchTables();
      } catch (e: any) {
        ElMessage.error(e?.message || "删除失败");
      }
    })
    .catch(() => {});
}

// ---- 打开数据查询页面 ----
function openDataPage(tableName: string) {
  router.push({
    path: "/mysql/data",
    query: {
      configId: connectionId,
      configName: configName,
      database: currentDatabase.value,
      table: tableName,
    },
  });
}

// ---- 清空表 ----
async function handleTruncate(tableName: string) {
  ElMessageBox.confirm(
    `确定要清空表 "${tableName}" 的所有数据吗？此操作不可恢复！`,
    "危险操作",
    {
      confirmButtonText: "确定清空",
      cancelButtonText: "取消",
      type: "error",
    }
  )
    .then(async () => {
      try {
        const res: any = await truncateTable(
          connectionId,
          currentDatabase.value,
          tableName
        );
        ElMessage.success(res.msg);
      } catch (e: any) {
        ElMessage.error(e?.message || "清空失败");
      }
    })
    .catch(() => {});
}

// ---- 导航 ----
function enterConsole() {
  router.push({
    path: "/mysql/console",
    query: { configId: connectionId, database: currentDatabase.value },
  });
}

/** 加载数据库列表 */
async function loadDatabases() {
  try {
    const res: any = await listDatabases(connectionId);
    databases.value = res.data || [];
    // 如果 URL 未传 database 参数，默认选中第一个库
    if (!currentDatabase.value && databases.value.length > 0) {
      currentDatabase.value = databases.value[0];
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取数据库列表失败");
  }
}

/** 切换数据库 */
function onDatabaseChange() {
  fetchTables();
}

function getKeyIcon(col: ColumnInfo): string {
  if (col.Key === "PRI") return "🔑";
  if (col.Key === "MUL") return "🔗";
  if (col.Key === "UNI") return "🔒";
  return "";
}

// ==================== 初始化 ====================
onMounted(async () => {
  await loadDatabases();
  fetchTables();
});
</script>

<template>
  <div class="app-container">
    <div class="search-container" style="padding-bottom: 15px">
      <el-tag
        v-if="configName"
        type="success"
        effect="dark"
        style="margin-right: 12px"
      >
        {{ configName }}
      </el-tag>
      <el-select
        v-model="currentDatabase"
        @change="onDatabaseChange"
        style="width: 220px; margin-right: 12px; margin-left: 12px"
        placeholder="选择数据库"
        filterable
      >
        <el-option v-for="db in databases" :key="db" :label="db" :value="db" />
      </el-select>
      <el-button type="primary" @click="showCreateTable">
        <i-ep-plus />
        新建表
      </el-button>
      <el-button type="info" @click="enterConsole"> 命令行 </el-button>
      <el-button @click="fetchTables">
        <i-ep-refresh />
        刷新
      </el-button>
      <el-input
        v-model="searchKeyword"
        placeholder="搜索表名"
        clearable
        style="width: 200px; margin-left: 12px"
        size="default"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 表列表 -->
    <el-card shadow="never" v-loading="loading">
      <el-empty
        v-if="!loading && tables.length === 0"
        description="该数据库下暂无表"
      />
      <el-table v-else :data="filteredTables" border highlight-current-row>
        <el-table-column label="#" width="50" align="center">
          <template #default="scope">{{ scope.$index + 1 }}</template>
        </el-table-column>
        <el-table-column label="表名" prop="name" min-width="180">
          <template #default="scope">
            <el-icon style="margin-right: 6px; color: #409eff">
              <Grid />
            </el-icon>
            <el-link
              type="primary"
              :underline="false"
              style="font-weight: 500"
              @click="openDataPage(scope.row.name)"
            >
              {{ scope.row.name }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="引擎" prop="engine" width="100" />
        <el-table-column label="行数" prop="rows" width="100" align="right" />
        <el-table-column label="数据大小" prop="data_length" width="110" />
        <el-table-column label="创建时间" prop="create_time" width="170" />
        <el-table-column
          label="注释"
          prop="comment"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="500" fixed="right" align="center">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click="viewStructure(scope.row.name)"
            >
              <el-icon>
                <View />
              </el-icon>
              结构
            </el-button>
            <el-button size="small" @click="openDesigner(scope.row.name)">
              <el-icon>
                <EditPen />
              </el-icon>
              设计表
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click="handleTruncate(scope.row.name)"
            >
              <el-icon>
                <DeleteFilled />
              </el-icon>
              清空
            </el-button>
            <!--            <el-button
              type="danger"
              size="small"
              @click="handleDropTable(scope.row.name)"
            >
              <el-icon>
                <Delete />
              </el-icon>
              删除
            </el-button>-->
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ============ 表结构对话框 ============ -->
    <el-dialog
      v-model="structureVisible"
      :title="`表结构 - ${currentTable}`"
      width="900px"
      top="5vh"
    >
      <div v-loading="structureLoading">
        <template v-if="tableStructure">
          <!-- 列信息 -->
          <h4 style="margin-top: 0">列信息</h4>
          <el-table :data="tableStructure.columns" border size="small">
            <el-table-column label="键" width="40" align="center">
              <template #default="scope">{{ getKeyIcon(scope.row) }}</template>
            </el-table-column>
            <el-table-column label="列名" prop="Field" width="140" />
            <el-table-column label="类型" prop="Type" width="130" />
            <el-table-column
              label="允许空"
              prop="Null"
              width="70"
              align="center"
            />
            <el-table-column label="默认值" prop="Default" width="100">
              <template #default="scope">
                <span
                  v-if="
                    scope.row.Default === null ||
                    scope.row.Default === undefined
                  "
                  style="color: #999"
                  >NULL</span
                >
                <span v-else>{{ scope.row.Default }}</span>
              </template>
            </el-table-column>
            <el-table-column label="额外" prop="Extra" width="100" />
            <el-table-column
              label="注释"
              prop="Comment"
              min-width="120"
              show-overflow-tooltip
            />
          </el-table>

          <!-- 索引 -->
          <h4 v-if="tableStructure.indexes && tableStructure.indexes.length">
            索引信息
          </h4>
          <el-table
            v-if="tableStructure.indexes && tableStructure.indexes.length"
            :data="tableStructure.indexes"
            border
            size="small"
            style="margin-top: 8px"
          >
            <el-table-column label="索引名" prop="name" width="180" />
            <el-table-column label="唯一" width="60" align="center">
              <template #default="scope">
                <el-tag
                  :type="scope.row.unique ? 'danger' : 'info'"
                  size="small"
                  >{{ scope.row.unique ? "是" : "否" }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="列" width="200">
              <template #default="scope">{{
                scope.row.columns.join(", ")
              }}</template>
            </el-table-column>
            <el-table-column label="类型" prop="type" width="100" />
          </el-table>

          <!-- 建表语句 -->
          <h4>建表语句</h4>
          <pre class="sql-preview">{{ tableStructure.create_sql }}</pre>
        </template>
        <el-empty v-else-if="!structureLoading" description="无数据" />
      </div>
    </el-dialog>

    <!-- ============ 创建表对话框 ============ -->
    <el-dialog
      v-model="createVisible"
      title="新建表"
      width="750px"
      top="5vh"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="表名" required>
              <el-input
                v-model="createForm.table_name"
                placeholder="例如: users"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="引擎">
              <el-select v-model="createForm.engine">
                <el-option label="InnoDB" value="InnoDB" />
                <el-option label="MyISAM" value="MyISAM" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="字符集">
              <el-select v-model="createForm.charset">
                <el-option label="utf8mb4" value="utf8mb4" />
                <el-option label="utf8" value="utf8" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="注释">
          <el-input v-model="createForm.comment" placeholder="表注释（可选）" />
        </el-form-item>
      </el-form>

      <div
        style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        "
      >
        <strong>列定义</strong>
        <el-button type="primary" size="small" @click="addColumn">
          <el-icon>
            <Plus />
          </el-icon>
          添加列
        </el-button>
      </div>

      <el-table :data="createColumns" border size="small">
        <el-table-column label="列名" width="130">
          <template #default="scope">
            <el-input
              v-model="scope.row.name"
              placeholder="列名"
              size="small"
            />
          </template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="scope">
            <el-select v-model="scope.row.type" size="small">
              <el-option
                v-for="t in [
                  'INT',
                  'BIGINT',
                  'VARCHAR',
                  'TEXT',
                  'DATE',
                  'DATETIME',
                  'DECIMAL',
                  'FLOAT',
                  'TINYINT',
                ]"
                :key="t"
                :label="t"
                :value="t"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="长度" width="80">
          <template #default="scope">
            <el-input-number
              v-model="scope.row.length"
              :min="0"
              size="small"
              controls-position="right"
            />
          </template>
        </el-table-column>
        <el-table-column label="非空" width="60" align="center">
          <template #default="scope">
            <el-checkbox
              v-model="scope.row.nullable"
              :true-label="false"
              :false-label="true"
            />
          </template>
        </el-table-column>
        <el-table-column label="自增" width="60" align="center">
          <template #default="scope">
            <el-checkbox v-model="scope.row.auto_increment" />
          </template>
        </el-table-column>
        <el-table-column label="主键" width="60" align="center">
          <template #default="scope">
            <el-checkbox v-model="scope.row.primary_key" />
          </template>
        </el-table-column>
        <el-table-column label="注释" min-width="120">
          <template #default="scope">
            <el-input
              v-model="scope.row.comment"
              placeholder="列注释"
              size="small"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="60" align="center">
          <template #default="scope">
            <el-button
              type="danger"
              size="small"
              @click="removeColumn(scope.$index)"
              :icon="Delete"
              circle
            />
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateTable">创建表</el-button>
      </template>
    </el-dialog>

    <!-- ============ 设计表对话框（仿 Navicat） ============ -->
    <el-dialog
      v-model="designVisible"
      :title="`设计表 - ${designTableName}`"
      width="900px"
      class="design-dialog"
      top="3vh"
      :close-on-click-modal="false"
    >
      <div v-loading="structureLoading">
        <el-tabs v-model="designActiveTab">
          <!-- ======== 字段 ======== -->
          <el-tab-pane label="字段" name="columns">
            <div class="design-toolbar">
              <el-button size="small" type="primary" plain @click="addDesignColumn">
                <el-icon><Plus /></el-icon>
                添加字段
              </el-button>
              <el-button
                size="small"
                plain
                :disabled="!selectedDesignColumn"
                @click="insertDesignColumn"
              >
                <el-icon><ArrowRight /></el-icon>
                插入字段
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                :disabled="!selectedDesignColumn"
                @click="removeDesignColumn"
              >
                <el-icon><Minus /></el-icon>
                删除字段
              </el-button>
            </div>
            <el-table
              :data="designColumns.filter((c) => !c.deleted)"
              border
              size="small"
              :max-height="designTableMaxHeight"
              highlight-current-row
              @current-change="
                (row: any) => (selectedDesignColumn = row)
              "
            >
              <el-table-column label="键" width="40" align="center">
                <template #default="scope">
                  <span v-if="scope.row.isPk" title="主键">🔑</span>
                </template>
              </el-table-column>
              <el-table-column label="字段名" width="150">
                <template #default="scope">
                  <span
                    v-if="!scope.row.isNew"
                    :class="{ 'col-changed': isColumnChanged(scope.row) }"
                  >
                    {{ scope.row.Field }}
                  </span>
                  <el-input v-else v-model="scope.row.Field" size="small" placeholder="字段名" />
                </template>
              </el-table-column>
              <el-table-column label="类型" width="130">
                <template #default="scope">
                  <el-select
                    v-model="scope.row.type"
                    size="small"
                    filterable
                    allow-create
                  >
                    <el-option
                      v-for="t in columnTypes"
                      :key="t"
                      :label="t"
                      :value="t"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="长度" width="90">
                <template #default="scope">
                  <el-input-number
                    v-model="scope.row.length"
                    :min="0"
                    size="small"
                    controls-position="right"
                    style="width: 80px"
                  />
                </template>
              </el-table-column>
              <el-table-column label="非空" width="55" align="center">
                <template #default="scope">
                  <el-checkbox
                    :model-value="!scope.row.nullable"
                    @update:model-value="
                      (v: any) => (scope.row.nullable = !v)
                    "
                  />
                </template>
              </el-table-column>
              <el-table-column label="主键" width="55" align="center">
                <template #default="scope">
                  <el-checkbox
                    v-model="scope.row.isPk"
                    :disabled="!scope.row.isNew"
                  />
                </template>
              </el-table-column>
              <el-table-column label="注释" min-width="150">
                <template #default="scope">
                  <el-input v-model="scope.row.comment" size="small" placeholder="注释" />
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- ======== 索引 ======== -->
          <el-tab-pane label="索引" name="indexes">
            <div class="design-toolbar">
              <el-button size="small" type="primary" plain @click="addDesignIndex">
                <el-icon><Plus /></el-icon>
                添加索引
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                :disabled="!selectedDesignIndex"
                @click="removeDesignIndex"
              >
                <el-icon><Minus /></el-icon>
                删除索引
              </el-button>
            </div>
            <el-table
              :data="designIndexes.filter((i) => !i.deleted)"
              border
              size="small"
              :max-height="designTableMaxHeight"
              highlight-current-row
              @current-change="
                (row: any) => (selectedDesignIndex = row)
              "
            >
              <el-table-column label="索引名" width="160">
                <template #default="scope">
                  <el-input
                    v-if="scope.row.isNew"
                    v-model="scope.row.name"
                    size="small"
                    placeholder="索引名"
                  />
                  <span v-else>{{ scope.row.name }}</span>
                </template>
              </el-table-column>
              <el-table-column label="字段" min-width="200">
                <template #default="scope">
                  <el-select
                    v-if="scope.row.isNew"
                    v-model="scope.row.columns"
                    size="small"
                    multiple
                    placeholder="选择字段"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="c in designColumns.filter((c) => !c.deleted)"
                      :key="c.Field"
                      :label="c.Field"
                      :value="c.Field"
                    />
                  </el-select>
                  <span v-else>{{ scope.row.columns.join(", ") }}</span>
                </template>
              </el-table-column>
              <el-table-column label="唯一" width="70" align="center">
                <template #default="scope">
                  <el-checkbox v-model="scope.row.unique" :disabled="!scope.row.isNew" />
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>

      <template #footer>
        <el-button @click="designVisible = false">取消</el-button>
        <el-button type="primary" :loading="designSaving" @click="saveDesign">
          保存
        </el-button>
      </template>
    </el-dialog>

  </div>
</template>

<style scoped>
.connection-bar {
  display: flex;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 12px;
}

.sql-preview {
  max-height: 300px;
  padding: 12px 16px;
  overflow: auto auto;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
  background: #f5f7fa;
  border-radius: 4px;
}

/* ---------- 设计表 ---------- */
.design-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.col-changed {
  font-weight: 600;
  color: #409eff;
}
</style>

<style lang="scss">
/* 设计表弹框：高度随视口自适应（dialog 挂在 body 下，scoped 无法选中） */
.design-dialog {
  max-height: calc(100vh - 6vh);

  .el-dialog__body {
    max-height: calc(100vh - 6vh - 116px);
    overflow-y: auto;
  }
}
</style>
