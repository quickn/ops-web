<script setup lang="ts">
import { syncDataMenu } from "@/api/deploy/db";

import { listAll } from "@/api/monitor/service";

import { ServiceInfo } from "@/api/monitor/service/types";

const queryFormRef = ref(ElForm);

const loading = ref(false);

const queryParams = reactive<ServiceInfo>({});

const serviceInfoList = ref<ServiceInfo[]>();

/** 查询 */
function handleQuery() {
  loading.value = true;
  syncDataMenu(queryParams).then(({ data }) => {
    let container = document.getElementById("sql_code");
    const formattedData = data.replace(/;/g, ";\n");
    container!.innerHTML = formattedData;
    loading.value = false;
  });
}

onMounted(() => {
  //默认选中第一个
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
    queryParams.env = serviceInfoList.value[0].label;
    if (queryParams.env != undefined) {
      handleSelectChange(queryParams.env);
    }
  });
});

function handleSelectChange(label: string) {
  queryParams.env = label;
}
</script>

<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="服务" prop="status">
          <el-select
            v-model="queryParams.env"
            clearable
            style="width: 100px"
            @change="handleSelectChange"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.label"
              :label="item.name"
              :value="item.label"
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
