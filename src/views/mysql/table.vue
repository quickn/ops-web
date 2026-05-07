<script setup lang="ts">
import {
  alterTable,
  createTable,
  dropTable,
  getTableStructure,
  listDatabases,
  listTables,
  queryTableData,
  truncateTable,
} from "@/api/mysql";
import type {
  ColumnDef,
  ColumnInfo,
  TableDataResult,
  TableInfo,
  TableStructure,
} from "@/api/mysql/types";
import { useRoute, useRouter } from "vue-router";

// ==================== 路由参数 ====================
const route = useRoute();
const router = useRouter();
const connectionId = (route.query.connection_id as string) || "";
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

// ---- 修改表（添加/删除列） ----
const alterVisible = ref(false);
const alterTableName = ref("");
const alterAction = ref<"add_column" | "drop_column" | "modify_column">(
  "add_column"
);
const alterColumn = reactive<ColumnDef>({
  name: "",
  type: "VARCHAR",
  length: 255,
  nullable: true,
  default: undefined,
  comment: "",
  auto_increment: false,
  primary_key: false,
});
const alterDropColumnName = ref("");

// ---- 数据浏览 ----
const dataVisible = ref(false);
const dataLoading = ref(false);
const dataTableName = ref("");
const dataResult = ref<TableDataResult | null>(null);
const dataPage = ref(1);
const dataPageSize = ref(20);

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

// ---- 修改表 ----
function showAlterAddColumn(tableName: string) {
  alterTableName.value = tableName;
  alterAction.value = "add_column";
  Object.assign(alterColumn, {
    name: "",
    type: "VARCHAR",
    length: 255,
    nullable: true,
    comment: "",
    auto_increment: false,
    primary_key: false,
  });
  alterDropColumnName.value = "";
  alterVisible.value = true;
}

function showAlterDropColumn(tableName: string) {
  alterTableName.value = tableName;
  alterAction.value = "drop_column";
  alterDropColumnName.value = "";
  alterVisible.value = true;
}

async function handleAlterTable() {
  let operations: any[] = [];
  if (alterAction.value === "add_column") {
    if (!alterColumn.name) {
      ElMessage.warning("请输入列名");
      return;
    }
    operations = [{ action: "add_column", column: { ...alterColumn } }];
  } else if (alterAction.value === "drop_column") {
    if (!alterDropColumnName.value) {
      ElMessage.warning("请输入要删除的列名");
      return;
    }
    // 二次确认
    try {
      await ElMessageBox.confirm(
        `确定要删除表 "${alterTableName.value}" 中的列 "${alterDropColumnName.value}" 吗？此操作不可恢复！`,
        "危险操作",
        {
          confirmButtonText: "确定删除",
          cancelButtonText: "取消",
          type: "error",
        }
      );
    } catch {
      return;
    }
    operations = [
      { action: "drop_column", column_name: alterDropColumnName.value },
    ];
  } else if (alterAction.value === "modify_column") {
    if (!alterColumn.name) {
      ElMessage.warning("请输入列名");
      return;
    }
    operations = [{ action: "modify_column", column: { ...alterColumn } }];
  }

  try {
    const res: any = await alterTable(
      connectionId,
      currentDatabase.value,
      alterTableName.value,
      operations
    );
    ElMessage.success(res.msg);
    alterVisible.value = false;
    await fetchTables();
  } catch (e: any) {
    ElMessage.error(e?.message || "修改失败");
  }
}

// ---- 浏览数据 ----
async function viewData(tableName: string, page = 1) {
  dataTableName.value = tableName;
  dataVisible.value = true;
  dataLoading.value = true;
  dataPage.value = page;
  try {
    const res: any = await queryTableData(
      connectionId,
      currentDatabase.value,
      tableName,
      page,
      dataPageSize.value
    );
    dataResult.value = res.data;
  } catch (e: any) {
    ElMessage.error(e?.message || "查询失败");
  } finally {
    dataLoading.value = false;
  }
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
    query: { connection_id: connectionId, database: currentDatabase.value },
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
  dataPage.value = 1;
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
            <span style="font-weight: 500">{{ scope.row.name }}</span>
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
            <el-button
              type="success"
              size="small"
              @click="viewData(scope.row.name, 1)"
            >
              <el-icon>
                <DataAnalysis />
              </el-icon>
              数据
            </el-button>
            <el-button size="small" @click="showAlterAddColumn(scope.row.name)">
              <el-icon>
                <Plus />
              </el-icon>
              加列
            </el-button>
            <el-button
              size="small"
              @click="showAlterDropColumn(scope.row.name)"
            >
              <el-icon>
                <Minus />
              </el-icon>
              删列
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

    <!-- ============ 修改表对话框 ============ -->
    <el-dialog
      v-model="alterVisible"
      :title="`修改表 - ${alterTableName}`"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-radio-group v-model="alterAction" style="margin-bottom: 16px">
        <el-radio-button value="add_column">添加列</el-radio-button>
        <el-radio-button value="drop_column">删除列</el-radio-button>
        <el-radio-button value="modify_column">修改列</el-radio-button>
      </el-radio-group>

      <template v-if="alterAction === 'drop_column'">
        <el-form label-width="100px">
          <el-form-item label="要删除的列名">
            <el-input v-model="alterDropColumnName" placeholder="输入列名" />
          </el-form-item>
        </el-form>
      </template>
      <template v-else>
        <el-form label-width="80px">
          <el-form-item label="列名" required>
            <el-input v-model="alterColumn.name" placeholder="列名" />
          </el-form-item>
          <el-form-item label="类型">
            <el-select v-model="alterColumn.type" style="width: 160px">
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
          </el-form-item>
          <el-form-item label="长度">
            <el-input-number
              v-model="alterColumn.length"
              :min="0"
              controls-position="right"
            />
          </el-form-item>
          <el-form-item label="允许空">
            <el-switch v-model="alterColumn.nullable" />
          </el-form-item>
          <el-form-item label="注释">
            <el-input v-model="alterColumn.comment" placeholder="列注释" />
          </el-form-item>
        </el-form>
      </template>

      <template #footer>
        <el-button @click="alterVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAlterTable">确定修改</el-button>
      </template>
    </el-dialog>

    <!-- ============ 数据浏览对话框 ============ -->
    <el-dialog
      v-model="dataVisible"
      :title="`数据浏览 - ${dataTableName}`"
      width="95%"
      top="3vh"
      :close-on-click-modal="false"
    >
      <div v-loading="dataLoading">
        <template v-if="dataResult">
          <div style="margin-bottom: 8px; font-size: 13px; color: #909399">
            共 {{ dataResult.total }} 条记录，第 {{ dataResult.page }}/{{
              Math.ceil(dataResult.total / dataResult.page_size) || 1
            }}
            页
          </div>
          <div class="table-data-wrapper">
            <el-table
              :data="dataResult.records"
              border
              size="small"
              max-height="450"
              stripe
            >
              <el-table-column
                v-for="col in dataResult.columns"
                :key="col"
                :label="col"
                :prop="col"
                min-width="120"
                show-overflow-tooltip
              >
                <template #default="scope">
                  <span
                    v-if="scope.row[col] === null"
                    style="font-style: italic; color: #ccc"
                    >NULL</span
                  >
                  <span v-else>{{ scope.row[col] }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div style="margin-top: 12px; text-align: center">
            <el-pagination
              v-model:current-page="dataPage"
              v-model:page-size="dataPageSize"
              :total="dataResult.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              small
              @current-change="(p: number) => viewData(dataTableName, p)"
              @size-change="(s: number) => { dataPageSize = s; viewData(dataTableName, 1) }"
            />
          </div>
        </template>
        <el-empty v-else description="无数据" />
      </div>
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

.table-data-wrapper {
  overflow-x: auto;
}
</style>
