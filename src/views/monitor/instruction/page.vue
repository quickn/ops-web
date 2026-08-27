<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item>
          <el-select
            v-model="queryParams.serviceId"
            placeholder="选择服务"
            clearable
            style="width: 160px"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="IP" style="width: 220px">
          <el-input
            v-model="queryParams.agentIP"
            placeholder="请输入"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="指令" style="width: 220px">
          <el-input
            v-model="queryParams.command"
            placeholder="请输入"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="创建时间" prop="createTime">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery"
          >
            <i-ep-search />
            搜索
          </el-button
          >
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
      >
        <!--        <el-table-column type="selection" width="55" align="center" />-->
        <el-table-column label="服务名" prop="serviceName" width="180" show-overflow-tooltip />
        <el-table-column label="IP" prop="agentIp" width="180" show-overflow-tooltip />
        <el-table-column label="指令" prop="command" width="180" show-overflow-tooltip />
        <el-table-column label="任务Id" prop="jobId" width="120" show-overflow-tooltip />
        <el-table-column label="脚本" prop="script" width="180" show-overflow-tooltip />
        <el-table-column label="结果集" prop="result" min-width="300">
          <template #default="scope">
            <el-popover
              placement="top"
              width="1000"
              trigger="hover"
              :content="scope.row.result"
            >
              <template #reference>
                <pre class="result-cell">{{ scope.row.result }}</pre>
              </template>
              <pre class="result-output">{{ scope.row.result }}</pre>
            </el-popover>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="180" />
        <el-table-column label="操作" fixed="right" width="120">
          <template #default="scope">
            <el-button type="text" @click="handleEdit(scope.row)"
            >查看详情
            </el-button
            >
          </template>
        </el-table-column>
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
import { listData } from "@/api/monitor/instruction";
import { listAll } from "@/api/monitor/service";
import { LogInfo } from "@/api/monitor/log/types";
import { ServiceInfo } from "@/api/monitor/service/types";

const emit = defineEmits(["setData", "changePage"]);
const queryFormRef = ref(ElForm);
const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);
const queryParams = reactive<LogInfo>({ pageSize: 15, pageNum: 1 });
const dataList = ref<LogInfo[]>();
const serviceInfoList = ref<ServiceInfo[]>();
const dateRange = ref<[string, string] | null>(null);

/** 查询 */
function handleQuery() {
  loading.value = true;
  // 添加日期范围参数
  const params = { ...queryParams };
  if (dateRange.value && dateRange.value.length === 2) {
    params.startTime = dateRange.value[0];
    params.endTime = dateRange.value[1];
  }
  listData(params).then(({ data }) => {
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
  dateRange.value = null;
  queryParams.pageNum = 1;
  handleQuery();
}

function handleEdit(row: LogInfo) {
  emit("setData", row);
  emit("changePage", "detail");
}

onMounted(() => {
  handleQuery();
});
</script>

<style scoped>
.result-cell {
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  font-family: "Courier New", Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  max-height: 20px;
  overflow: hidden;
}

.result-output {
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  font-family: "Courier New", Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  max-height: 600px;
  overflow-y: auto;
}

</style>
