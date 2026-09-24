<script setup lang="ts">
import {
  executeSql,
  getTableStructure,
  listDatabases,
  listTables,
  queryTableData,
} from "@/api/mysql";
import type {
  ColumnInfo,
  TableDataResult,
  TableInfo,
} from "@/api/mysql/types";
import { useRoute, useRouter } from "vue-router";

defineOptions({ name: "MysqlData" });

// ==================== 路由参数 ====================
const route = useRoute();
const router = useRouter();
const connectionId = (route.query.configId as string) || "";
const configName = (route.query.configName as string) || "";
const currentDatabase = ref((route.query.database as string) || "");
const currentTable = ref((route.query.table as string) || "");

// ==================== 状态 ====================
const dbLoading = ref(false);
const databases = ref<string[]>([]);
const tables = ref<TableInfo[]>([]);
const tableKeyword = ref("");
const loading = ref(false);
const result = ref<TableDataResult | null>(null);
const page = ref(1);
const pageSize = ref(20);

/** 根据关键字过滤表列表 */
const filteredTables = computed(() => {
  if (!tableKeyword.value) return tables.value;
  const kw = tableKeyword.value.toLowerCase();
  return tables.value.filter((t) => t.name.toLowerCase().includes(kw));
});

// ---- 数据筛选（仿 Navicat） ----
const filterVisible = ref(false);
const filterLogic = ref<"AND" | "OR">("AND");
/** 已应用的筛选条件数（用于按钮角标） */
const appliedFilterCount = ref(0);

interface FilterCondition {
  column: string;
  operator: string;
  value: string;
}

/** 运算符配置 */
const operators = [
  { value: "=", label: "等于", needValue: true },
  { value: "<>", label: "不等于", needValue: true },
  { value: ">", label: "大于", needValue: true },
  { value: ">=", label: "大于等于", needValue: true },
  { value: "<", label: "小于", needValue: true },
  { value: "<=", label: "小于等于", needValue: true },
  { value: "LIKE", label: "包含", needValue: true },
  { value: "NOT LIKE", label: "不包含", needValue: true },
  { value: "IN", label: "在列表中(逗号分隔)", needValue: true },
  { value: "IS NULL", label: "为空", needValue: false },
  { value: "IS NOT NULL", label: "不为空", needValue: false },
];

const conditions = ref<FilterCondition[]>([
  { column: "", operator: "=", value: "" },
]);

/** 筛选字段候选（来自已加载的列） */
const filterColumns = computed(() => result.value?.columns || []);

/** 当前运算符是否需要值 */
function needValue(op: string) {
  return operators.find((o) => o.value === op)?.needValue ?? true;
}

/** SQL 值转义 */
function escapeValue(v: string) {
  return v.replace(/'/g, "''");
}

/** 构造 WHERE 子句（不含 WHERE 关键字），无有效条件返回空串 */
function buildWhereClause(): string {
  const parts: string[] = [];
  for (const c of conditions.value) {
    if (!c.column) continue;
    const op = operators.find((o) => o.value === c.operator);
    if (!op) continue;
    const col = `\`${c.column.replace(/`/g, "")}\``;
    if (op.needValue) {
      if (c.value === "") continue;
      if (c.operator === "LIKE" || c.operator === "NOT LIKE") {
        parts.push(`${col} ${c.operator} '%${escapeValue(c.value)}%'`);
      } else if (c.operator === "IN") {
        const items = c.value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => `'${escapeValue(s)}'`);
        if (items.length === 0) continue;
        parts.push(`${col} IN (${items.join(", ")})`);
      } else {
        parts.push(`${col} ${c.operator} '${escapeValue(c.value)}'`);
      }
    } else {
      parts.push(`${col} ${c.operator}`);
    }
  }
  return parts.join(` ${filterLogic.value} `);
}

/** 添加筛选条件行 */
function addCondition() {
  conditions.value.push({ column: "", operator: "=", value: "" });
}

/** 删除筛选条件行 */
function removeCondition(index: number) {
  conditions.value.splice(index, 1);
}

/** 应用筛选 */
function applyFilter() {
  queryData(1);
}

/** 清空筛选 */
function resetFilter() {
  conditions.value = [{ column: "", operator: "=", value: "" }];
  filterLogic.value = "AND";
  queryData(1);
}

// ---- 排序 ----
const sortField = ref("");
const sortOrder = ref<"" | "asc" | "desc">("");

/** 表头排序切换 */
function onSortChange({ prop, order }: { prop: string; order: string | null }) {
  if (!order) {
    sortField.value = "";
    sortOrder.value = "";
  } else {
    sortField.value = prop;
    sortOrder.value = order === "ascending" ? "asc" : "desc";
  }
  queryData(1);
}

// ---- 记录编辑 / 删除 ----
const tableColumns = ref<ColumnInfo[]>([]);
/** 多选选中的行 */
const selectedRows = ref<Record<string, any>[]>([]);
const batchDeleting = ref(false);
/** 主键列（无主键时为空，编辑/删除时用全列匹配） */
const pkColumns = computed(() =>
  tableColumns.value.filter((c) => c.Key === "PRI").map((c) => c.Field)
);
const editVisible = ref(false);
const editSaving = ref(false);
const editRow = ref<Record<string, any> | null>(null);
/** 编辑表单：每个字段 { value, isNull } */
const editForm = ref<Record<string, { value: string; isNull: boolean }>>({});

/** 加载当前表结构（获取主键） */
async function loadStructure() {
  tableColumns.value = [];
  if (!currentTable.value) return;
  try {
    const res: any = await getTableStructure(
      connectionId,
      currentDatabase.value,
      currentTable.value
    );
    tableColumns.value = res.data?.columns || [];
  } catch {
    // 结构加载失败不阻塞数据浏览，仅影响编辑/删除定位
  }
}

/** 构造定位某行的 WHERE 条件（优先主键，无主键用全列等值匹配） */
function buildRowWhere(row: Record<string, any>): string {
  const cols = pkColumns.value.length
    ? pkColumns.value
    : Object.keys(row);
  return cols
    .map((c) => {
      const v = row[c];
      const col = `\`${c.replace(/`/g, "")}\``;
      if (v === null || v === undefined) return `${col} IS NULL`;
      if (typeof v === "number") return `${col} = ${v}`;
      return `${col} = '${escapeValue(String(v))}'`;
    })
    .join(" AND ");
}

/** 打开编辑对话框 */
function openEdit(row: Record<string, any>) {
  editRow.value = row;
  const form: Record<string, { value: string; isNull: boolean }> = {};
  for (const col of Object.keys(row)) {
    form[col] = {
      value: row[col] === null || row[col] === undefined ? "" : String(row[col]),
      isNull: row[col] === null || row[col] === undefined,
    };
  }
  editForm.value = form;
  editVisible.value = true;
}

/** 保存修改 */
async function saveEdit() {
  if (!editRow.value) return;
  const where = buildRowWhere(editRow.value);
  if (!where) {
    ElMessage.warning("无法定位该行记录");
    return;
  }
  // 主键列不可修改；无主键时全部列都可改
  const setCols = pkColumns.value.length
    ? Object.keys(editForm.value).filter((c) => !pkColumns.value.includes(c))
    : Object.keys(editForm.value);
  if (setCols.length === 0) {
    ElMessage.warning("没有可修改的字段");
    return;
  }
  const sets = setCols.map((c) => {
    const col = `\`${c.replace(/`/g, "")}\``;
    const { value, isNull } = editForm.value[c];
    return isNull || value === "" ? `${col} = NULL` : `${col} = '${escapeValue(value)}'`;
  });
  editSaving.value = true;
  try {
    const tableName = `\`${currentTable.value.replace(/`/g, "")}\``;
    const res: any = await executeSql(
      connectionId,
      currentDatabase.value,
      `UPDATE ${tableName} SET ${sets.join(", ")} WHERE ${where}`
    );
    ElMessage.success(res.msg || "修改成功");
    editVisible.value = false;
    queryData(page.value);
  } catch (e: any) {
    ElMessage.error(e?.message || "修改失败");
  } finally {
    editSaving.value = false;
  }
}

/** 删除记录 */
function handleDeleteRow(row: Record<string, any>) {
  const where = buildRowWhere(row);
  if (!where) {
    ElMessage.warning("无法定位该行记录");
    return;
  }
  const pkDesc = pkColumns.value.length
    ? `主键 ${pkColumns.value.map((c) => `${c}=${row[c]}`).join(", ")}`
    : "该行";
  ElMessageBox.confirm(
    `确定要删除 ${currentTable.value} 中 ${pkDesc} 的记录吗？此操作不可恢复！`,
    "危险操作",
    { confirmButtonText: "确定删除", cancelButtonText: "取消", type: "error" }
  )
    .then(async () => {
      try {
        const tableName = `\`${currentTable.value.replace(/`/g, "")}\``;
        const res: any = await executeSql(
          connectionId,
          currentDatabase.value,
          `DELETE FROM ${tableName} WHERE ${where}`
        );
        ElMessage.success(res.msg || "删除成功");
        queryData(page.value);
      } catch (e: any) {
        ElMessage.error(e?.message || "删除失败");
      }
    })
    .catch(() => {});
}

/** 表格多选变化 */
function onSelectionChange(rows: Record<string, any>[]) {
  selectedRows.value = rows;
}

/** 批量删除选中记录 */
async function handleBatchDelete() {
  const rows = selectedRows.value;
  if (rows.length === 0) return;
  // 检查能否定位每一行
  const wheres = rows.map((r) => buildRowWhere(r));
  if (wheres.some((w) => !w)) {
    ElMessage.warning("存在无法定位的记录（缺少主键且含 NULL 值），请逐行删除");
    return;
  }
  ElMessageBox.confirm(
    `确定要删除选中的 ${rows.length} 条记录吗？此操作不可恢复！`,
    "危险操作",
    { confirmButtonText: "确定删除", cancelButtonText: "取消", type: "error" }
  )
    .then(async () => {
      batchDeleting.value = true;
      try {
        const tableName = `\`${currentTable.value.replace(/`/g, "")}\``;
        const res: any = await executeSql(
          connectionId,
          currentDatabase.value,
          `DELETE FROM ${tableName} WHERE ${wheres.join(" OR ")}`
        );
        ElMessage.success(res.msg || `已删除 ${rows.length} 条记录`);
        selectedRows.value = [];
        queryData(page.value);
      } catch (e: any) {
        ElMessage.error(e?.message || "批量删除失败");
      } finally {
        batchDeleting.value = false;
      }
    })
    .catch(() => {});
}

// ==================== 方法 ====================

/** 返回表列表页 */
function backToTable() {
  router.push({
    path: "/mysql/table",
    query: {
      configId: connectionId,
      configName: configName,
      database: currentDatabase.value,
    },
  });
}

/** 加载数据库列表 */
async function loadDatabases() {
  try {
    const res: any = await listDatabases(connectionId);
    databases.value = res.data || [];
    if (!currentDatabase.value && databases.value.length > 0) {
      currentDatabase.value = databases.value[0];
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取数据库列表失败");
  }
}

/** 加载表列表 */
async function loadTables() {
  dbLoading.value = true;
  try {
    const res: any = await listTables(connectionId, currentDatabase.value);
    tables.value = res.data || [];
  } catch (e: any) {
    ElMessage.error(e?.message || "获取表列表失败");
  } finally {
    dbLoading.value = false;
  }
}

/** 切换数据库 */
async function onDatabaseChange() {
  page.value = 1;
  result.value = null;
  await loadTables();
  // 若当前表不在新库中，默认选中第一张表
  const exists = tables.value.some((t) => t.name === currentTable.value);
  if (!exists && tables.value.length > 0) {
    currentTable.value = tables.value[0].name;
  } else if (!exists) {
    currentTable.value = "";
    return;
  }
  queryData(1);
}

/** 点击表项查询数据 */
async function selectTable(tableName: string) {
  if (tableName === currentTable.value) return;
  currentTable.value = tableName;
  // 换表后字段变化，清空筛选与排序
  conditions.value = [{ column: "", operator: "=", value: "" }];
  filterVisible.value = false;
  sortField.value = "";
  sortOrder.value = "";
  // 先加载结构（确定主键），再查数据，避免同一 MySQL 连接并发请求
  await loadStructure();
  queryData(1);
}

/** 查询表数据 */
async function queryData(p = page.value) {
  if (!currentTable.value) return;
  page.value = p;
  loading.value = true;
  selectedRows.value = [];
  const where = buildWhereClause();
  const orderBy =
    sortField.value && sortOrder.value
      ? ` ORDER BY \`${sortField.value.replace(/`/g, "")}\` ${sortOrder.value}`
      : "";
  try {
    if (where || orderBy) {
      // 有筛选或排序：通过 SQL 查询
      const tableName = `\`${currentTable.value.replace(/`/g, "")}\``;
      // 先查总数
      const countRes: any = await executeSql(
        connectionId,
        currentDatabase.value,
        `SELECT COUNT(*) AS __total FROM ${tableName}${where ? ` WHERE ${where}` : ""}`
      );
      const total = Number(countRes.data?.records?.[0]?.__total ?? 0);
      // 再查当前页数据
      const offset = (page.value - 1) * pageSize.value;
      const dataRes: any = await executeSql(
        connectionId,
        currentDatabase.value,
        `SELECT * FROM ${tableName}${where ? ` WHERE ${where}` : ""}${orderBy} LIMIT ${pageSize.value} OFFSET ${offset}`
      );
      result.value = {
        records: dataRes.data?.records || [],
        columns: dataRes.data?.columns || [],
        total,
        page: page.value,
        page_size: pageSize.value,
      };
    } else {
      // 无筛选和排序：走分页接口
      const res: any = await queryTableData(
        connectionId,
        currentDatabase.value,
        currentTable.value,
        page.value,
        pageSize.value
      );
      result.value = res.data;
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "查询失败");
  } finally {
    // 记录已生效的条件数（用于按钮角标）
    appliedFilterCount.value = where
      ? where.split(` ${filterLogic.value} `).length
      : 0;
    loading.value = false;
  }
}

// ==================== 初始化 ====================
onMounted(async () => {
  if (!connectionId) {
    ElMessage.warning("缺少连接信息");
    router.push("/mysql/connection");
    return;
  }
  await loadDatabases();
  await loadTables();
  // URL 未指定表时，默认查询第一张表
  if (!currentTable.value && tables.value.length > 0) {
    currentTable.value = tables.value[0].name;
  }
  if (currentTable.value) {
    // 先加载结构（确定主键），再查数据，避免同一 MySQL 连接并发请求
    await loadStructure();
    queryData(1);
  }
});
</script>

<template>
  <div class="app-container data-page">
    <el-container class="data-container">
      <!-- ============ 左侧：库表选择侧边栏 ============ -->
      <el-aside width="260px" class="table-aside" v-loading="dbLoading">
        <!-- 连接名标题 -->
        <div class="aside-conn-title">
          <el-icon><Connection /></el-icon>
          <span class="aside-conn-name">{{ configName || connectionId }}</span>
        </div>
        <div class="aside-header">
          <el-select
            v-model="currentDatabase"
            @change="onDatabaseChange"
            placeholder="选择数据库"
            filterable
            size="default"
          >
            <el-option v-for="db in databases" :key="db" :label="db" :value="db" />
          </el-select>
        </div>
        <div class="aside-search">
          <el-input
            v-model="tableKeyword"
            placeholder="搜索表名"
            clearable
            size="small"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <el-scrollbar class="aside-list">
          <div
            v-for="t in filteredTables"
            :key="t.name"
            class="table-item"
            :class="{ active: t.name === currentTable }"
            :title="t.comment || t.name"
            @click="selectTable(t.name)"
          >
            <el-icon class="table-item-icon"><Grid /></el-icon>
            <span class="table-item-name">{{ t.name }}</span>
          </div>
          <el-empty
            v-if="filteredTables.length === 0"
            :image-size="60"
            description="暂无表"
          />
        </el-scrollbar>
      </el-aside>

      <!-- ============ 右侧：数据网格 ============ -->
      <el-main class="data-main">
        <!-- 工具栏 -->
        <div class="toolbar">
          <div class="toolbar-left">
            <span class="table-title">
              <el-icon style="color: #409eff"><Grid /></el-icon>
              {{ currentDatabase }}.
              <span class="table-title-name">{{ currentTable || "未选择表" }}</span>
              <el-tag
                v-if="result"
                size="small"
                type="info"
                effect="plain"
                style="margin-left: 8px"
              >
                {{ result.total }} 条
              </el-tag>
            </span>
          </div>
          <div class="toolbar-right">
            <!-- 批量删除 -->
            <el-button
              size="small"
              type="danger"
              plain
              :disabled="selectedRows.length === 0 || batchDeleting"
              @click="handleBatchDelete"
            >
              <el-icon><Delete /></el-icon>
              批量删除{{ selectedRows.length ? `(${selectedRows.length})` : "" }}
            </el-button>
            <!-- 筛选按钮 -->
            <el-badge
              :value="appliedFilterCount"
              :hidden="!appliedFilterCount"
              type="warning"
            >
              <el-button
                size="small"
                :type="filterVisible ? 'primary' : 'default'"
                :disabled="!currentTable"
                @click="filterVisible = !filterVisible"
              >
                <el-icon><Filter /></el-icon>
                筛选
              </el-button>
            </el-badge>
          </div>
        </div>

        <!-- 筛选面板（仿 Navicat） -->
        <div v-show="filterVisible" class="filter-panel">
          <div class="filter-panel-header">
            <el-radio-group v-model="filterLogic" size="small">
              <el-radio-button value="AND">全部满足 (AND)</el-radio-button>
              <el-radio-button value="OR">任一满足 (OR)</el-radio-button>
            </el-radio-group>
            <el-button size="small" text type="primary" @click="addCondition">
              <el-icon><Plus /></el-icon>
              添加条件
            </el-button>
          </div>
          <div class="filter-conditions">
            <div
              v-for="(cond, index) in conditions"
              :key="index"
              class="filter-row"
            >
              <el-select
                v-model="cond.column"
                placeholder="字段"
                filterable
                size="small"
                class="filter-col-select"
              >
                <el-option
                  v-for="col in filterColumns"
                  :key="col"
                  :label="col"
                  :value="col"
                />
              </el-select>
              <el-select
                v-model="cond.operator"
                size="small"
                class="filter-op-select"
              >
                <el-option
                  v-for="op in operators"
                  :key="op.value"
                  :label="op.label"
                  :value="op.value"
                />
              </el-select>
              <el-input
                v-if="needValue(cond.operator)"
                v-model="cond.value"
                placeholder="值"
                size="small"
                class="filter-value-input"
                @keyup.enter="applyFilter"
              />
              <el-button
                size="small"
                text
                type="danger"
                :disabled="conditions.length <= 1"
                @click="removeCondition(index)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          <div class="filter-panel-footer">
            <el-button size="small" @click="resetFilter"> 清空 </el-button>
            <el-button size="small" type="primary" @click="applyFilter">
              应用筛选
            </el-button>
          </div>
        </div>

        <!-- 数据表格 -->
        <el-card shadow="never" class="data-card">
          <div v-loading="loading" class="data-grid-wrapper">
            <template v-if="result">
              <el-table
                :data="result.records"
                border
                size="small"
                height="100%"
                stripe
                @sort-change="onSortChange"
                @selection-change="onSelectionChange"
              >
                <el-table-column
                  type="selection"
                  width="45"
                  align="center"
                  fixed
                />
                <el-table-column label="操作" width="110" align="center" fixed="right">
                  <template #default="scope">
                    <el-button
                      type="primary"
                      link
                      size="small"
                      @click="openEdit(scope.row)"
                    >
                      修改
                    </el-button>
                    <el-button
                      type="danger"
                      link
                      size="small"
                      @click="handleDeleteRow(scope.row)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
                <el-table-column
                  v-for="col in result.columns"
                  :key="col"
                  :label="col"
                  :prop="col"
                  min-width="120"
                  sortable="custom"
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
            </template>
            <el-empty
              v-else-if="!loading"
              :description="currentTable ? '无数据' : '请在左侧选择要查询的表'"
            />
          </div>
        </el-card>

        <!-- ============ 编辑记录对话框 ============ -->
        <el-dialog
          v-model="editVisible"
          :title="`修改记录 - ${currentTable}`"
          width="600px"
          top="5vh"
          :close-on-click-modal="false"
        >
          <el-form label-width="140px" v-loading="editSaving">
            <el-form-item
              v-for="(field, col) in editForm"
              :key="col"
              :label="col"
            >
              <div class="edit-field">
                <el-input
                  v-model="field.value"
                  :disabled="field.isNull"
                  placeholder="请输入值"
                />
                <el-checkbox
                  v-model="field.isNull"
                  :disabled="pkColumns.includes(String(col))"
                >
                  NULL
                </el-checkbox>
              </div>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="editVisible = false">取消</el-button>
            <el-button type="primary" :loading="editSaving" @click="saveEdit">
              保存
            </el-button>
          </template>
        </el-dialog>

        <!-- 底部操作栏：刷新 + 分页 -->
        <div class="pagination-bar">
          <el-button
            type="primary"
            size="small"
            :disabled="!currentTable || loading"
            @click="queryData(page)"
          >
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-pagination
            v-if="result"
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="result.total"
            :page-sizes="[10, 20, 50, 100]"
            background
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="(p: number) => queryData(p)"
            @size-change="(s: number) => { pageSize = s; queryData(1); }"
          />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<style scoped>
.data-page {
  height: calc(100vh - 104px);
  padding: 12px !important;
}

.data-container {
  height: 100%;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
}

/* ---------- 左侧侧边栏 ---------- */
.table-aside {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-right: 1px solid #e4e7ed;
  background: #fafbfc;
}

.aside-conn-title {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 2px 10px;
  font-size: 13px;
  font-weight: 600;
  color: #67c23a;
}

.aside-conn-title .el-icon {
  flex-shrink: 0;
}

.aside-conn-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.aside-header {
  margin-bottom: 8px;
}

.aside-header :deep(.el-select) {
  width: 100%;
}

.aside-search {
  margin-bottom: 8px;
}

.aside-list {
  flex: 1;
}

.table-item {
  display: flex;
  align-items: center;
  padding: 7px 10px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.table-item:hover {
  background: #ecf5ff;
}

.table-item.active {
  font-weight: 600;
  color: #409eff;
  background: #ecf5ff;
}

.table-item-icon {
  flex-shrink: 0;
  margin-right: 6px;
}

.table-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 右侧主区域 ---------- */
.data-main {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.table-title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.table-title-name {
  color: #409eff;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

/* ---------- 筛选面板 ---------- */
.filter-panel {
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fafbfc;
}

.filter-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.filter-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-col-select {
  width: 180px;
}

.filter-op-select {
  width: 160px;
}

.filter-value-input {
  flex: 1;
}

.filter-panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.data-card {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.data-card :deep(.el-card__body) {
  height: 100%;
  padding: 0;
}

.data-grid-wrapper {
  position: relative;
  height: 100%;
}

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
}

/* ---------- 编辑记录 ---------- */
.edit-field {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
}

.edit-field .el-input {
  flex: 1;
}

.edit-field .el-checkbox {
  flex-shrink: 0;
}
</style>

<style lang="scss">
/* 根据布局 chrome 精确撑满可视高度（scoped 无法匹配祖先类，需全局样式）
   navbar(50) + tagsView(34) + app-container 上下 padding(20) */
.main-container.hasTagsView .data-page {
  height: calc(100vh - 104px);
}

/* 关闭 tagsView 时：navbar(50) + app-container 上下 padding(20) */
.main-container:not(.hasTagsView) .data-page {
  height: calc(100vh - 70px);
}
</style>
