<script setup lang="ts">
import { nextTick } from "vue";
import hljs from "highlight.js";
import "highlight.js/styles/default.css";
import { syncTableStructure } from "@/api/deploy/db";
import { getSavedConfigs } from "@/api/accountConfig";
import { listDatabases, executeSql } from "@/api/mysql";
import type { AccountConfig } from "@/api/accountConfig/types";

const loading = ref(false);
const deploying = ref(false);
const sqlContent = ref("");

/** 源库连接列表 */
const sourceConnections = ref<AccountConfig[]>([]);
/** 目标库连接列表 */
const targetConnections = ref<AccountConfig[]>([]);

/** 源连接ID */
const sourceConfigId = ref<number>();
/** 源数据库 */
const sourceDatabase = ref("");
/** 目标连接ID */
const targetConfigId = ref<number>();
/** 目标数据库 */
const targetDatabase = ref("");

/** 源库列表 */
const sourceDatabases = ref<string[]>([]);
/** 目标库列表 */
const targetDatabases = ref<string[]>([]);

/** 加载 MySQL 连接配置 */
onMounted(async () => {
  try {
    const res: any = await getSavedConfigs({ type: "mysql" });
    const configs = res.data || [];
    sourceConnections.value = configs;
    targetConnections.value = configs;
  } catch {
    sourceConnections.value = [];
    targetConnections.value = [];
  }
});

/** 源连接变更 → 加载源数据库列表 */
watch(sourceConfigId, async (val) => {
  sourceDatabase.value = "";
  sourceDatabases.value = [];
  if (!val) return;
  try {
    const res: any = await listDatabases(String(val));
    sourceDatabases.value = res.data || [];
  } catch {
    sourceDatabases.value = [];
  }
});

/** 目标连接变更 → 加载目标数据库列表 */
watch(targetConfigId, async (val) => {
  targetDatabase.value = "";
  targetDatabases.value = [];
  if (!val) return;
  try {
    const res: any = await listDatabases(String(val));
    targetDatabases.value = res.data || [];
  } catch {
    targetDatabases.value = [];
  }
});

/** 源库变更时，目标库默认保持一致 */
watch(sourceDatabase, (val) => {
  if (val) {
    targetDatabase.value = val;
  }
});

/** 比对 */
async function handleCompare() {
  if (!sourceConfigId.value || !sourceDatabase.value) {
    ElMessage.warning("请选择源连接和源数据库");
    return;
  }
  if (!targetConfigId.value || !targetDatabase.value) {
    ElMessage.warning("请选择目标连接和目标数据库");
    return;
  }

  loading.value = true;
  sqlContent.value = "";

  try {
    const { data } = await syncTableStructure({
      sourceConfigId: sourceConfigId.value,
      sourceDatabase: sourceDatabase.value,
      targetConfigId: targetConfigId.value,
      targetDatabase: targetDatabase.value
    });

    const formattedData = String(data).replace(/;/g, ";\n");
    sqlContent.value = formattedData;

    // 等 Vue 渲染出 <code> 元素后再做高亮
    await nextTick();
    const container = document.getElementById("sql_code");
    if (container) {
      container.innerHTML = formattedData;
    }
    document.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightBlock(block as HTMLElement);
    });
  } finally {
    loading.value = false;
  }
}

/** 部署 */
async function handleDeploy() {
  if (!sqlContent.value) {
    ElMessage.warning("没有可执行的SQL，请先执行比对");
    return;
  }
  if (!targetConfigId.value || !targetDatabase.value) {
    ElMessage.warning("请选择目标连接和目标数据库");
    return;
  }

  try {
    await ElMessageBox.confirm(
      "确认在目标库执行以下SQL吗？此操作不可撤销！",
      "确认部署",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  } catch {
    return;
  }

  deploying.value = true;
  try {
    await executeSql(
      String(targetConfigId.value),
      targetDatabase.value,
      sqlContent.value
    );
    ElMessage.success("部署成功");
  } catch {
    ElMessage.error("部署失败，请检查日志");
  } finally {
    deploying.value = false;
  }
}

/** 复制SQL */
function handleCopy() {
  if (!sqlContent.value) {
    ElMessage.warning("没有可复制的SQL");
    return;
  }
  navigator.clipboard
    .writeText(sqlContent.value)
    .then(() => {
      ElMessage.success("已复制到剪贴板");
    })
    .catch(() => {
      ElMessage.error("复制失败");
    });
}

/** 重置所有选择 */
function handleReset() {
  sourceConfigId.value = undefined;
  sourceDatabase.value = "";
  targetConfigId.value = undefined;
  targetDatabase.value = "";
  sqlContent.value = "";
  sourceDatabases.value = [];
  targetDatabases.value = [];
}
</script>

<template>
  <div class="app-container">
    <div class="search-container">
      <el-form :inline="true" label-width="80px">
        <!-- 源库选择行 -->
        <el-form-item label="源连接">
          <el-select
            v-model="sourceConfigId"
            placeholder="请选择源MySQL连接"
            filterable
            style="width: 200px"
          >
            <el-option
              v-for="conn in sourceConnections"
              :key="conn.id"
              :label="`${conn.configName ?? ''} (${conn.url ?? ''}:${conn.port ?? ''})`"
              :value="conn.id!"
            />
          </el-select>
        </el-form-item>

        <!-- 目标库选择行 -->
        <el-form-item label="目标连接">
          <el-select
            v-model="targetConfigId"
            placeholder="请选择目标MySQL连接"
            filterable
            style="width: 200px"
          >
            <el-option
              v-for="conn in targetConnections"
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
            style="width: 200px"
          >
            <el-option
              v-for="db in sourceDatabases"
              :key="db"
              :label="db"
              :value="db"
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
            style="width: 200px"
          >
            <el-option
              v-for="db in targetDatabases"
              :key="db"
              :label="db"
              :value="db"
            />
          </el-select>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleCompare">
            <i-ep-search />
            比较
          </el-button>
          <el-button
            type="success"
            :loading="deploying"
            :disabled="!sqlContent"
            @click="handleDeploy"
          >
            <i-ep-upload />
            部署
          </el-button>
          <el-button :disabled="!sqlContent" @click="handleCopy">
            <i-ep-document-copy />
            复制
          </el-button>
          <el-button @click="handleReset">
            <i-ep-refresh />
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- SQL 结果展示区 -->
    <el-card shadow="never">
      <div v-loading="loading || deploying" id="log_div">
        <pre v-if="sqlContent"><code class="sql" id="sql_code" /></pre>
        <el-empty v-else description="请选择源库和目标库后点击「比较」按钮" />
      </div>
    </el-card>
  </div>
</template>
