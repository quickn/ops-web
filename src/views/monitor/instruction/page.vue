<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="环境Id">
          <el-select v-model="queryParams.serviceId" placeholder="请输入" clearable style="width: 160px">
            <el-option v-for="item in serviceInfoList" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务Id" style="width: 220px">
          <el-input v-model="queryParams.agentId" placeholder="请输入" clearable @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery"><i-ep-search />搜索</el-button>
          <el-button @click="resetQuery"><i-ep-refresh />重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card shadow="never">
      <el-table ref="dataTableRef" v-loading="loading" :data="dataList" highlight-current-row border
        @selection-change="handleSelectionChange" show-overflow-tooltip>
        <!--        <el-table-column type="selection" width="55" align="center" />-->
        <el-table-column label="服务名" prop="serviceName" width="180" />
        <el-table-column label="IP" prop="agentIp" width="180" />
        <el-table-column label="指令" prop="cmd" width="180" />
        <el-table-column label="结果集" prop="result" />
        <el-table-column label="创建时间" prop="createTime" width="180" />
        <el-table-column label="操作" fixed="right" width="120">
          <template #default="scope">
            <el-button type="text" @click="handleEdit(scope.row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination v-if="total > 0" v-model:total="total" v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize" @pagination="handleQuery" />
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { listData, deleteByIds } from "@/api/monitor/instruction";
import { listAll } from "@/api/monitor/service";
import { LogInfo } from "@/api/monitor/log/types";
import { ServiceInfo } from "@/api/monitor/service/types";
const emit = defineEmits(["setData", "changePage"]);
const queryFormRef = ref(ElForm);
const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);
const queryParams = reactive<LogInfo>({ pageSize: 10, pageNum: 1 });
const dataList = ref<LogInfo[]>();
const serviceInfoList = ref<ServiceInfo[]>();
/** 查询 */
function handleQuery() {
  loading.value = true;
  listData(queryParams).then(({ data }) => {
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
  queryFormRef.value.resetFields();
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
