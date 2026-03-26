<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="服务">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="全部"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="服务器地址">
          <el-input
            v-model="queryParams.hostname"
            placeholder="服务器地址"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button class="filter-item" type="primary" @click="handleQuery">
            <i-ep-search />
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <i-ep-refresh />
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    <el-card shadow="never">
      <el-table
        ref="dataTableRef"
        v-loading="loading"
        :data="dataList"
        highlight-current-row
        border
        @selection-change="handleSelectionChange"
        show-overflow-tooltip
      >
        <el-table-column label="服务器地址" prop="hostname" width="180" />
        <el-table-column label="盘符类型" prop="fileSystem" />
        <el-table-column label="分区大小" prop="size" />
        <el-table-column label="已使用" prop="used" />
        <el-table-column label="可用" prop="avail" />
        <el-table-column label="已使用百分比" prop="usePer" />
        <el-table-column label="创建时间" prop="createTime" width="180" />
      </el-table>

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="handleQuery"
      />
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { dockerStats, deleteByIds } from "@/api/monitor/instruction";
import { listAll } from "@/api/monitor/service";
import { LogInfo } from "@/api/monitor/log/types";
import { listPage } from "@/api/monitor/diskManagement";
import { ServiceInfo } from "@/api/monitor/service/types";
const emit = defineEmits(["setData", "changePage"]);
const queryFormRef = ref(ElForm);
const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);
const queryParams = reactive<LogInfo>({ pageSize: 15, pageNum: 1 });
const dataList = ref<LogInfo[]>();
const serviceInfoList = ref<ServiceInfo[]>();
/** 查询 */
function handleQuery() {
  loading.value = true;
  listPage(queryParams).then(({ data }) => {
    dataList.value = data.records;
    total.value = data.total;
    loading.value = false;
  });
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
  });
}
/** 重置查询 */
function resetQuery() {
  queryParams.serviceId = "";
  queryParams.hostname = "";
  queryParams.pageNum = 1;
  handleQuery();
}

/** 行checkbox 选中事件 */
function handleSelectionChange(selection: any) {
  ids.value = selection.map((item: any) => item.id);
}
function handleEdit(row: LogInfo) {
  emit("setData", row);
  emit("changePage", "detail");
}
onMounted(() => {
  handleQuery();
});
</script>
