<template>
  <div class="app-container">
    <!-- 搜索区 -->
    <div class="search-container">
      <el-form
        ref="queryFormRef"
        :model="queryParams"
        :inline="true"
        style="display: flex; flex-wrap: wrap; align-items: center"
      >
        <el-form-item prop="serviceId" label="服务" style="width: 200px">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="全部服务"
            clearable
            filterable
          >
            <el-option
              v-for="item in serviceList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="alertChannel" label="通道" style="width: 150px">
          <el-select
            v-model="queryParams.alertChannel"
            placeholder="全部"
            clearable
          >
            <el-option
              v-for="item in ALERT_CHANNEL_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="sendStatus" label="发送状态" style="width: 150px">
          <el-select
            v-model="queryParams.sendStatus"
            placeholder="全部"
            clearable
          >
            <el-option label="成功" :value="0" />
            <el-option label="失败" :value="1" />
          </el-select>
        </el-form-item>

        <el-form-item prop="isSilenced" label="是否静默" style="width: 150px">
          <el-select
            v-model="queryParams.isSilenced"
            placeholder="全部"
            clearable
          >
            <el-option label="否" :value="0" />
            <el-option label="是" :value="1" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格区 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="dataList" border highlight-current-row>
        <el-table-column label="ID" prop="id" width="70" align="center" />
        <el-table-column label="规则名称" prop="ruleName" min-width="140" show-overflow-tooltip />
        <el-table-column label="预警通道" prop="alertChannel" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.alertChannel === 'SMS' ? 'warning' : ''" size="small">
              {{ scope.row.alertChannel === "SMS" ? "短信" : "邮件" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预警级别" width="80" align="center">
          <template #default="scope">
            <el-tag :type="getLevelTagType(scope.row.alertLevel)" size="small">
              {{ getLevelLabel(scope.row.alertLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预警内容" prop="alertContent" min-width="200" show-overflow-tooltip />
        <el-table-column label="接收人" prop="recipient" width="180" show-overflow-tooltip />
        <el-table-column label="发送状态" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.sendStatus === 0 ? 'success' : 'danger'" size="small">
              {{ scope.row.sendStatus === 0 ? "成功" : "失败" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="是否静默" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.isSilenced === 1 ? 'info' : 'success'" size="small">
              {{ scope.row.isSilenced === 1 ? "已静默" : "正常" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发次数" prop="triggerCount" width="90" align="center" />
        <el-table-column label="失败原因" prop="failReason" width="160" show-overflow-tooltip />
        <el-table-column label="创建人" prop="createByName" width="100" align="center" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createTime" width="170" align="center" />
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
import { Refresh, Search } from "@element-plus/icons-vue";
import { listAlertRecordPage } from "@/api/ops/alert";
import {
  ALERT_CHANNEL_OPTIONS,
  ALERT_LEVEL_OPTIONS,
  AlertRecord,
  AlertRecordQuery
} from "@/api/ops/alert/types";
import { listAll } from "@/api/monitor/service";
import { ServiceInfo } from "@/api/monitor/service/types";

defineOptions({ name: "AlertRecordIndex" });

const queryFormRef = ref(ElForm);

const loading = ref(false);
const total = ref(0);

const serviceList = ref<ServiceInfo[]>([]);

const queryParams = reactive<AlertRecordQuery>({
  pageNum: 1,
  pageSize: 15,
  serviceId: undefined,
  alertChannel: undefined,
  sendStatus: undefined,
  isSilenced: undefined
});

const dataList = ref<AlertRecord[]>([]);

/** 获取预警级别标签 */
function getLevelLabel(level?: number): string {
  const opt = ALERT_LEVEL_OPTIONS.find((o) => o.value === level);
  return opt?.label || "-";
}

/** 获取预警级别 tag 类型 */
function getLevelTagType(level?: number): string {
  switch (level) {
    case 1: return "info";
    case 2: return "warning";
    case 3: return "danger";
    default: return "info";
  }
}

/** 查询 */
function handleQuery() {
  loading.value = true;
  listAlertRecordPage(queryParams)
    .then(({ data }) => {
      dataList.value = data.records;
      total.value = data.total;
    })
    .finally(() => (loading.value = false));
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  handleQuery();
}

/** 加载服务列表 */
function loadServiceList() {
  listAll().then(({ data }) => {
    serviceList.value = data || [];
  });
}

onMounted(() => {
  loadServiceList();
  handleQuery();
});
</script>

<style scoped>
.app-container {
  padding: 20px;
}
.search-container {
  margin-bottom: 20px;
}
</style>
