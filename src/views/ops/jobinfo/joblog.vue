<template>
  <el-dialog
    v-model="visible"
    :title="`调度日志 - ${jobDesc}`"
    width="1100px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-table v-loading="loading" :data="logData" border max-height="500">
      <el-table-column label="任务ID" prop="jobId" width="80" align="center" />
      <el-table-column
        label="执行器地址"
        prop="executorAddress"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column label="调度时间" prop="triggerTime" width="170" />
      <el-table-column label="调度结果" width="100" align="center">
        <template #default="{ row }">
          <el-tag
            :type="row.triggerCode === 200 ? 'success' : 'danger'"
            size="small"
          >
            {{ row.triggerCode === 200 ? "成功" : "失败" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="调度备注"
        prop="triggerMsg"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" link @click="showDetail(row)">
            查看详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination
      v-if="total > 0"
      v-model:total="total"
      v-model:page="queryParams.pageNum"
      v-model:limit="queryParams.pageSize"
      @pagination="loadLogData"
    />

    <!-- 执行日志详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="执行日志详情"
      width="800px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="任务ID">{{
          detailData.jobId
        }}</el-descriptions-item>
        <el-descriptions-item label="执行器地址">{{
          detailData.executorAddress
        }}</el-descriptions-item>
        <el-descriptions-item label="调度时间">{{
          detailData.triggerTime
        }}</el-descriptions-item>
        <el-descriptions-item label="调度结果">
          <el-tag
            :type="detailData.triggerCode === 200 ? 'success' : 'danger'"
            size="small"
          >
            {{ detailData.triggerCode === 200 ? "成功" : "失败" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="调度备注" :span="2">{{
          detailData.triggerMsg || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="执行时间">{{
          detailData.handleTime || "-"
        }}</el-descriptions-item>
        <el-descriptions-item label="执行耗时"
          >{{
            detailData.handleDuration ? detailData.handleDuration + "ms" : "-"
          }}
        </el-descriptions-item>
        <el-descriptions-item label="执行结果" :span="2">
          <el-tag
            :type="detailData.handleCode === 200 ? 'success' : 'danger'"
            size="small"
          >
            {{ detailData.handleCode === 200 ? "成功" : "失败" }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="执行日志" :span="2">
          <pre class="log-content">{{ detailData.handleMsg || "无日志" }}</pre>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { getJobLogPage } from "@/api/ops/jobinfo";
import { JobLog } from "@/api/ops/jobinfo/types";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  jobId: { type: Number, required: true },
  jobGroup: { type: Number, required: true },
  jobDesc: { type: String, default: "" },
  configId: { type: Number, required: true },
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const loading = ref(false);
const total = ref(0);
const logData = ref<JobLog[]>([]);
const queryParams = reactive<JobLog>({
  pageSize: 10,
  pageNum: 1,
});

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<JobLog>({});

/** 加载调度日志 */
function loadLogData() {
  loading.value = true;
  getJobLogPage({
    ...queryParams,
    configId: props.configId,
    jobId: props.jobId,
    jobGroup: props.jobGroup,
  })
    .then(({ data }) => {
      logData.value = data.records || [];
      total.value = data.total || 0;
    })
    .catch(() => {
      ElMessage.error("加载调度日志失败");
    })
    .finally(() => {
      loading.value = false;
    });
}

/** 查看执行详情 */
function showDetail(row: JobLog) {
  detailData.value = row;
  detailVisible.value = true;
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      queryParams.pageNum = 1;
      loadLogData();
    }
  }
);
</script>

<style scoped>
.log-content {
  max-height: 300px;
  padding: 12px;
  margin: 0;
  overflow-y: auto;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  word-break: break-all;
  white-space: pre-wrap;
  background-color: #f5f7fa;
  border-radius: 4px;
}
</style>
