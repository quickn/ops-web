<script setup lang="ts">
import { getSavedConfigs } from "@/api/accountConfig";
import type { AccountConfig } from "@/api/accountConfig/types";
import { listDatabases, listTables } from "@/api/mysql";
import type { TableInfo } from "@/api/mysql/types";
import { syncData, syncDataCompare } from "@/api/deploy/db";
import type { SyncDataDiffItem } from "@/api/deploy/db";

defineOptions({ name: "SyncData" });

const loading = ref(false);
const executing = ref(false);
const comparing = ref(false);
/** 是否正在恢复上次选择（恢复期间跳过 watch 的清空/级联逻辑） */
const restoring = ref(false);

/** 连接列表（源/目标共用） */
const connections = ref<AccountConfig[]>([]);

/** 源连接ID / 源数据库 */
const sourceConfigId = ref<number>();
const sourceDatabase = ref("");
/** 目标连接ID / 目标数据库 */
const targetConfigId = ref<number>();
const targetDatabase = ref("");

/** 源库列表 / 目标库列表 */
const sourceDatabases = ref<string[]>([]);
const targetDatabases = ref<string[]>([]);

/** 源库表列表 */
const sourceTables = ref<TableInfo[]>([]);
/** 已选中的表 */
const selectedTables = ref<string[]>([]);

/** 同步选项 */
const isInsert = ref(true);
const isUpdate = ref(false);
const isDelete = ref(false);

/** 同步结果日志 */
const logs = ref<string[]>([]);

/** 比对结果 */
const diffResults = ref<SyncDataDiffItem[]>([]);

/** 是否存在可同步的差异 */
const hasDiff = computed(() =>
  diffResults.value.some(
    (d) => !d.error && (d.insertCount || d.updateCount || d.deleteCount)
  )
);

/** 穿梭框数据 */
const tableTransferData = computed(() =>
  sourceTables.value.map((t) => ({
    key: t.name,
    label: t.comment ? `${t.name}（${t.comment}）` : t.name
  }))
);

/** 已选表统计信息 */
const selectedTableStats = computed(() =>
  sourceTables.value.filter((t) => selectedTables.value.includes(t.name))
);
const totalRows = computed(() =>
  selectedTableStats.value.reduce((sum, t) => sum + (t.rows || 0), 0)
);

/** ==================== 上次选择持久化 ==================== */

const STORAGE_KEY = "sync-data-last-selection";

/** 持久化的选择快照 */
interface LastSelection {
  sourceConfigId?: number;
  sourceDatabase?: string;
  targetConfigId?: number;
  targetDatabase?: string;
  tables?: string[];
  isInsert: boolean;
  isUpdate: boolean;
  isDelete: boolean;
}

/** 读取上次选择 */
function readLastSelection(): LastSelection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LastSelection) : null;
  } catch {
    return null;
  }
}

/** 当前选择快照（任一变化自动写入 localStorage） */
const selectionSnapshot = computed<LastSelection>(() => ({
  sourceConfigId: sourceConfigId.value,
  sourceDatabase: sourceDatabase.value,
  targetConfigId: targetConfigId.value,
  targetDatabase: targetDatabase.value,
  tables: selectedTables.value,
  isInsert: isInsert.value,
  isUpdate: isUpdate.value,
  isDelete: isDelete.value
}));

watch(
  selectionSnapshot,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
    } catch {
      /* 忽略存储异常（如隐私模式） */
    }
  },
  { deep: true }
);

/** ==================== 数据加载 ==================== */

/** 加载源/目标连接的数据库列表 */
async function loadDatabases(configId: number): Promise<string[]> {
  try {
    const res: any = await listDatabases(String(configId));
    return res.data || [];
  } catch {
    return [];
  }
}

/** 加载源库的表列表 */
async function loadTables(configId: number, database: string): Promise<TableInfo[]> {
  loading.value = true;
  try {
    const res: any = await listTables(String(configId), database);
    return res.data || [];
  } catch {
    return [];
  } finally {
    loading.value = false;
  }
}

/** 初始化：加载连接列表并恢复上次选择 */
onMounted(async () => {
  try {
    const res: any = await getSavedConfigs({ type: "mysql" });
    connections.value = res.data || [];
  } catch {
    connections.value = [];
  }

  const saved = readLastSelection();
  if (!saved) return;

  restoring.value = true;
  try {
    // 同步选项
    isInsert.value = saved.isInsert ?? true;
    isUpdate.value = saved.isUpdate ?? false;
    isDelete.value = saved.isDelete ?? false;

    // 恢复源连接 → 源库 → 表（逐级校验存在性）
    if (
      saved.sourceConfigId &&
      connections.value.some((c) => c.id === saved.sourceConfigId)
    ) {
      sourceConfigId.value = saved.sourceConfigId;
      sourceDatabases.value = await loadDatabases(saved.sourceConfigId);
      if (
        saved.sourceDatabase &&
        sourceDatabases.value.includes(saved.sourceDatabase)
      ) {
        sourceDatabase.value = saved.sourceDatabase;
        sourceTables.value = await loadTables(
          saved.sourceConfigId,
          saved.sourceDatabase
        );
        // 只恢复仍然存在的表
        if (saved.tables?.length) {
          selectedTables.value = saved.tables.filter((t) =>
            sourceTables.value.some((st) => st.name === t)
          );
        }
      }
    }

    // 恢复目标连接 → 目标库
    if (
      saved.targetConfigId &&
      connections.value.some((c) => c.id === saved.targetConfigId)
    ) {
      targetConfigId.value = saved.targetConfigId;
      targetDatabases.value = await loadDatabases(saved.targetConfigId);
      if (saved.targetDatabase) {
        // 目标库支持手动输入，即使不在列表中也直接恢复
        targetDatabase.value = saved.targetDatabase;
      }
    }
  } finally {
    restoring.value = false;
  }
});

/** 源连接变更 → 加载源数据库列表 */
watch(sourceConfigId, async (val) => {
  if (restoring.value) return;
  sourceDatabase.value = "";
  sourceDatabases.value = [];
  sourceTables.value = [];
  selectedTables.value = [];
  if (!val) return;
  sourceDatabases.value = await loadDatabases(val);
});

/** 目标连接变更 → 加载目标数据库列表 */
watch(targetConfigId, async (val) => {
  if (restoring.value) return;
  targetDatabase.value = "";
  targetDatabases.value = [];
  if (!val) return;
  targetDatabases.value = await loadDatabases(val);
});

/** 源库变更 → 加载表列表，目标库默认同名 */
watch(sourceDatabase, async (val) => {
  if (restoring.value) return;
  sourceTables.value = [];
  selectedTables.value = [];
  if (val) {
    targetDatabase.value = val;
  }
  if (!val || !sourceConfigId.value) return;
  sourceTables.value = await loadTables(sourceConfigId.value, val);
});

/** 公共校验，返回是否通过 */
function validateSelection(): boolean {
  if (!sourceConfigId.value || !sourceDatabase.value) {
    ElMessage.warning("请选择源连接和源数据库");
    return false;
  }
  if (!targetConfigId.value || !targetDatabase.value) {
    ElMessage.warning("请选择目标连接和目标数据库");
    return false;
  }
  if (!selectedTables.value.length) {
    ElMessage.warning("请选择要同步的表");
    return false;
  }
  return true;
}

/** 组装同步参数 */
function buildParams() {
  return {
    sourceConfigId: sourceConfigId.value!,
    sourceDatabase: sourceDatabase.value,
    targetConfigId: targetConfigId.value!,
    targetDatabase: targetDatabase.value,
    tables: selectedTables.value,
    isInsert: isInsert.value,
    isUpdate: isUpdate.value,
    isDelete: isDelete.value
  };
}

/** 比对差异（只分析，不执行） */
async function handleCompare() {
  if (!validateSelection()) return;

  comparing.value = true;
  diffResults.value = [];
  try {
    const { data } = await syncDataCompare(buildParams());
    diffResults.value = (data as SyncDataDiffItem[]) || [];
    if (hasDiff.value) {
      ElMessage.success("比对完成，存在差异");
    } else {
      ElMessage.success("比对完成，数据一致");
    }
  } catch (e: any) {
    ElMessage.error(`比对失败: ${e?.msg || e?.message || "未知错误"}`);
  } finally {
    comparing.value = false;
  }
}

/** 执行同步（公共） */
async function doSync() {
  executing.value = true;
  logs.value = [];
  try {
    const { data } = await syncData(buildParams());
    logs.value = (data as string[]) || [];
    ElMessage.success("同步完成");
    // 同步后清除比对结果，避免与实际状态不一致
    diffResults.value = [];
  } catch (e: any) {
    logs.value = [`同步失败: ${e?.msg || e?.message || "未知错误"}`];
  } finally {
    executing.value = false;
  }
}

/** 比对后执行同步（基于已展示的差异结果） */
async function handleApplySync() {
  if (!validateSelection() || !hasDiff.value) return;
  const diffSummary = diffResults.value
    .filter((d) => !d.error && (d.insertCount || d.updateCount || d.deleteCount))
    .map(
      (d) =>
        `${d.table}: 插入${d.insertCount}/更新${d.updateCount}/删除${d.deleteCount}`
    )
    .join("；");

  try {
    await ElMessageBox.confirm(
      `将按以下差异执行同步：${diffSummary}。此操作不可撤销，是否继续？`,
      "确认执行同步",
      {
        confirmButtonText: "开始同步",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  } catch {
    return;
  }
  await doSync();
}

/** 直接同步（跳过比对，先确认后执行） */
async function handleDirectSync() {
  if (!validateSelection()) return;

  try {
    await ElMessageBox.confirm(
      `将把 ${selectedTables.value.length} 张表（共 ${totalRows.value} 行）的数据直接同步到目标库（不经过比对预览），此操作不可撤销，是否继续？`,
      "确认直接同步",
      {
        confirmButtonText: "开始同步",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  } catch {
    return;
  }
  await doSync();
}

/** 重置 */
function handleReset() {
  sourceConfigId.value = undefined;
  sourceDatabase.value = "";
  targetConfigId.value = undefined;
  targetDatabase.value = "";
  sourceDatabases.value = [];
  targetDatabases.value = [];
  sourceTables.value = [];
  selectedTables.value = [];
  logs.value = [];
  diffResults.value = [];
  isInsert.value = true;
  isUpdate.value = false;
  isDelete.value = false;
}

/** 日志条目的类型标签 */
function logTag(line: string): { text: string; type: "success" | "danger" | "info" } {
  if (line.startsWith("[成功]")) return { text: "成功", type: "success" };
  if (line.startsWith("[失败]")) return { text: "失败", type: "danger" };
  if (line.startsWith("[跳过]")) return { text: "跳过", type: "info" };
  return { text: "信息", type: "info" };
}
</script>

<template>
  <div class="app-container">
    <!-- 连接与库选择 -->
    <div class="search-container">
      <el-form :inline="true" label-width="80px">
        <el-form-item label="源连接">
          <el-select
            v-model="sourceConfigId"
            placeholder="请选择源MySQL连接"
            filterable
            style="width: 300px"
          >
            <el-option
              v-for="conn in connections"
              :key="conn.id"
              :label="`${conn.configName ?? ''} (${conn.url ?? ''}:${conn.port ?? ''})`"
              :value="conn.id!"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="源数据库">
          <el-select
            v-model="sourceDatabase"
            placeholder="请先选择连接"
            filterable
            :disabled="!sourceConfigId"
            style="width: 220px"
          >
            <el-option
              v-for="db in sourceDatabases"
              :key="db"
              :label="db"
              :value="db"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="目标连接" label-width="100px">
          <el-select
            v-model="targetConfigId"
            placeholder="请选择目标MySQL连接"
            filterable
            style="width: 300px"
          >
            <el-option
              v-for="conn in connections"
              :key="conn.id"
              :label="`${conn.configName ?? ''} (${conn.url ?? ''}:${conn.port ?? ''})`"
              :value="conn.id!"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="目标数据库" label-width="100px">
          <el-select
            v-model="targetDatabase"
            placeholder="默认与源库一致"
            filterable
            allow-create
            :disabled="!targetConfigId"
            style="width: 220px"
          >
            <el-option
              v-for="db in targetDatabases"
              :key="db"
              :label="db"
              :value="db"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表选择与同步选项 -->
    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="flex items-center justify-between">
          <span>选择要同步的表</span>
          <span v-if="selectedTables.length" class="text-14px text-gray-400">
            已选 {{ selectedTables.length }} 张表，共 {{ totalRows }} 行
          </span>
        </div>
      </template>

      <el-transfer
        v-model="selectedTables"
        v-loading="loading"
        :data="tableTransferData"
        :titles="['可选表', '已选表']"
        :button-texts="['加入', '移除']"
        filterable
        filter-placeholder="输入表名过滤"
        style="--el-transfer-panel-width: 320px"
      />

      <el-divider />

      <el-form :inline="true">
        <el-form-item label="同步选项">
          <el-checkbox v-model="isInsert">插入新增数据</el-checkbox>
          <el-checkbox v-model="isUpdate">更新差异数据</el-checkbox>
          <el-checkbox v-model="isDelete">删除目标多余数据</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button
            :loading="comparing"
            :disabled="!selectedTables.length || executing"
            @click="handleCompare"
          >
            <i-ep-search />
            比对同步
          </el-button>
          <el-button
            type="primary"
            :loading="executing"
            :disabled="!selectedTables.length || comparing"
            @click="handleDirectSync"
          >
            <i-ep-upload />
            直接同步
          </el-button>
          <el-button @click="handleReset">
            <i-ep-refresh />
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 比对结果 -->
    <el-card v-if="diffResults.length" shadow="never" class="mb-4">
      <template #header>
        <div class="flex items-center justify-between">
          <span>比对结果</span>
          <el-button
            type="success"
            size="small"
            :loading="executing"
            :disabled="!hasDiff"
            @click="handleApplySync"
          >
            <i-ep-upload />
            按差异执行同步
          </el-button>
        </div>
      </template>

      <el-table :data="diffResults" border size="small">
        <el-table-column prop="table" label="表名" min-width="160" />
        <el-table-column prop="primaryKey" label="主键" width="120" />
        <el-table-column label="新增" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.error" type="danger" size="small">-</el-tag>
            <span v-else-if="row.insertCount" class="font-bold text-green-600">
              +{{ row.insertCount }}
            </span>
            <span v-else class="text-gray-400">0</span>
          </template>
        </el-table-column>
        <el-table-column label="更新" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.error" type="danger" size="small">-</el-tag>
            <span v-else-if="row.updateCount" class="font-bold text-blue-600">
              ~{{ row.updateCount }}
            </span>
            <span v-else class="text-gray-400">0</span>
          </template>
        </el-table-column>
        <el-table-column label="删除" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.error" type="danger" size="small">-</el-tag>
            <span v-else-if="row.deleteCount" class="font-bold text-red-600">
              -{{ row.deleteCount }}
            </span>
            <span v-else class="text-gray-400">0</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.error" type="danger" size="small">失败</el-tag>
            <el-tag v-else-if="row.insertCount || row.updateCount || row.deleteCount" type="warning" size="small">
              有差异
            </el-tag>
            <el-tag v-else type="success" size="small">一致</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="error" label="错误信息" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.error" class="text-red-500">{{ row.error }}</span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 同步结果 -->
    <el-card shadow="never">
      <template #header>同步日志</template>
      <div v-loading="executing">
        <template v-if="logs.length">
          <div
            v-for="(line, index) in logs"
            :key="index"
            class="flex items-start gap-2 py-1"
          >
            <el-tag :type="logTag(line).type" size="small" class="mt-0.5">
              {{ logTag(line).text }}
            </el-tag>
            <span class="text-14px leading-6">{{ line }}</span>
          </div>
        </template>
        <el-empty
          v-else
          description="请选择源库和目标库，勾选要同步的表后点击「开始同步」"
        />
      </div>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
:deep(.el-transfer-panel__body) {
  height: 320px;
}

:deep(.el-transfer-panel__list) {
  height: 100%;
}
</style>
