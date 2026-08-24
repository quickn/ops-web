<script setup lang="ts">
import { syncDataMenu } from "@/api/deploy/db";

import { getSavedConfigs } from "@/api/accountConfig";

import type { AccountConfig } from "@/api/accountConfig/types";

const queryFormRef = ref(ElForm);

const loading = ref(false);

const queryParams = reactive<{ configId?: number }>({});

const targetConnections = ref<AccountConfig[]>();

/** 查询 */
function handleQuery() {
  loading.value = true;
  syncDataMenu(queryParams as any).then(({ data }) => {
    debugger
    let container = document.getElementById("sql_code");
    const formattedData = data.replace(/;/g, ";\n");
    container!.innerHTML = formattedData;
    loading.value = false;
  });
}

onMounted(() => {
  //默认选中第一个
  getSavedConfigs({ type: "mysql" }).then(({ data }) => {
    targetConnections.value = data;
    queryParams.configId = targetConnections.value[0].id;
    if (queryParams.configId != undefined) {
      handleSelectChange(queryParams.configId);
    }
  });
});

function handleSelectChange(configId: number) {
  queryParams.configId = configId;
}
</script>

<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="服务" prop="status">
          <el-select
            v-model="queryParams.configId"
            clearable
            style="width: 160px"
            @change="handleSelectChange"
          >
            <el-option
              v-for="item in targetConnections"
              :key="item.id"
              :label="item.configName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <i-ep-search />
            同步菜单
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    <el-card shadow="never">
      <div v-loading="loading" id="log_div">
        <pre>
        <code class="sql" id="sql_code">
        </code>
        </pre>
      </div>
    </el-card>
  </div>
</template>
