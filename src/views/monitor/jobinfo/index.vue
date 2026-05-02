<template>
  <div class="app-container">
    <div class="search-container">
      <el-form
        ref="queryFormRef"
        :model="queryParams"
        :inline="true"
        style="display: flex; align-items: center; flex-wrap: wrap"
      >
        <el-form-item prop="jobGroup" style="width: 130px">
          <el-select
            v-model="queryParams.jobGroup"
            placeholder="选择任务分组"
            clearable
          >
            <el-option
              v-for="item in jobGroupList"
              :key="item.id"
              :label="item.title"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="serviceId" style="width: 120px">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="选择服务"
            clearable
          >
            <el-option
              v-for="item in serviceList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="jobDesc" label="" style="width: 150px">
          <el-input
            v-model="queryParams.jobDesc"
            placeholder="任务名称"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item prop="executorHandler" label="" style="width: 150px">
          <el-input
            v-model="queryParams.executorHandler"
            placeholder="执行器Handler"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="状态" prop="status" style="width: 120px">
          <el-select
            v-model="queryParams.triggerStatus"
            placeholder="全部"
            clearable
          >
            <el-option label="运行中" :value="1"/>
            <el-option label="已停止" :value="0"/>
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <el-icon>
              <Search/>
            </el-icon>
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <el-icon>
              <Refresh/>
            </el-icon>
            重置
          </el-button>
        </el-form-item>

        <el-form-item style="margin-left: auto">
          <el-button type="success" @click="handleAdd">
            <el-icon>
              <Plus/>
            </el-icon>
            新增
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
        <el-table-column label="任务ID" prop="id" width="80" align="center"/>
        <el-table-column label="任务描述" prop="jobDesc" width="180" show-overflow-tooltip/>
        <el-table-column label="所属服务" prop="serviceName" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.serviceName" type="info">
              {{ scope.row.serviceName }}
            </el-tag>
            <span v-else style="color: #999">未关联</span>
          </template>
        </el-table-column>
        <el-table-column label="负责人" prop="author" width="100" align="center"/>
        <el-table-column label="调度类型" width="150" align="center">
          <template #default="scope">
            <el-tag
              :type="scope.row.scheduleType === 'NONE' ? 'info' : 'success'"
              size="small"
            >
              {{ getScheduleTypeText(scope.row.scheduleType) }}:{{ scope.row.scheduleConf }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="运行模式" width="200" align="center">
          <template #default="scope">
            <el-tag size="small" type="info">{{
                getGlueTypeText(scope.row.glueType)
              }}:{{ scope.row.executorHandler }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.triggerStatus === 1 ? 'success' : 'danger'">
              {{ scope.row.triggerStatus === 1 ? '运行中' : '已停止' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="320" align="center">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              link
              @click="handleEdit(scope.row)"
            >
              <el-icon>
                <Edit/>
              </el-icon>
              编辑
            </el-button>
            <el-button
              type="info"
              size="small"
              link
              @click="handleQueryLog(scope.row)"
            >
              <el-icon>
                <Document/>
              </el-icon>
              查看日志
            </el-button>
            <el-dropdown @command="(cmd: string) => handleCommand(cmd, scope.row)">
              <el-button type="primary" size="small" link>
                更多
                <el-icon>
                  <ArrowDown/>
                </el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="trigger">
                    <el-icon>
                      <CaretRight/>
                    </el-icon>
                    执行一次
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="scope.row.triggerStatus === 0"
                    command="start"
                  >
                    <el-icon>
                      <VideoPlay/>
                    </el-icon>
                    启动
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="scope.row.triggerStatus === 1"
                    command="stop"
                  >
                    <el-icon>
                      <VideoPause/>
                    </el-icon>
                    停止
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <el-icon>
                      <Delete/>
                    </el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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

    <!-- 编辑/新增对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="950px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <JobInfoEdit
        :edit-data="currentEditRow"
        :is-dialog="true"
        @success="onEditSuccess"
        @cancel="onEditCancel"
      />
    </el-dialog>

    <!-- 调度日志弹窗 -->
    <JobLog
      v-model="logVisible"
      :job-id="currentLogJobId"
      :job-group="currentLogJobGroup"
      :job-desc="currentLogJobDesc"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowDown,
  CaretRight,
  Delete,
  Document,
  Edit,
  Plus,
  Refresh,
  Search,
  VideoPause,
  VideoPlay,
} from "@element-plus/icons-vue";
import {deleteJob, jobGroupPageList, listJobPage, startJob, stopJob, triggerJob,} from "@/api/monitor/jobinfo";
import {JobInfo, JobInfoGroup} from "@/api/monitor/jobinfo/types";
import {listAll} from "@/api/monitor/service";
import {ServiceInfo} from "@/api/monitor/service/types";
import {useRouter} from "vue-router";
import JobInfoEdit from "./edit.vue";
import JobLog from "./joblog.vue";

defineOptions({
  name: "JobInfoIndex",
  inheritAttrs: false,
});

const router = useRouter();
const queryFormRef = ref(ElForm);
const loading = ref(false);
const total = ref(0);

// 对话框状态
const dialogVisible = ref(false);
const dialogTitle = ref("");
const currentEditRow = ref<JobInfo | null>(null);

// 调度日志状态
const logVisible = ref(false);
const currentLogJobId = ref(0);
const currentLogJobGroup = ref(0);
const currentLogJobDesc = ref("");

const queryParams = reactive({
  pageSize: 15,
  pageNum: 1,
  jobGroup: undefined as number | undefined,
  jobDesc: "",
  executorHandler: "",
  serviceId: undefined as number | undefined,
  triggerStatus: undefined as number | undefined,
});

const dataList = ref<JobInfo[]>([]);
const serviceList = ref<ServiceInfo[]>([]);
const jobGroupList = ref<JobInfoGroup[]>([]);

/** 查询 */
function handleQuery() {
  loading.value = true;
  listJobPage(queryParams).then(({data}) => {
    dataList.value = data.records;
    total.value = data.total;
    loading.value = false;
  });
}

/** 获取服务列表 */
function loadServiceList() {
  listAll().then(({data}) => {
    serviceList.value = data;
  });
}

/** 获取任务分组列表 */
function loadJobGroupList() {
  jobGroupPageList().then(({data}) => {
    jobGroupList.value = data;
    if (jobGroupList.value.length > 0) {
      queryParams.jobGroup = jobGroupList.value[0].id;
    }
  });
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  queryParams.jobGroup = undefined;
  queryParams.jobDesc = "";
  queryParams.executorHandler = "";
  queryParams.serviceId = undefined;
  queryParams.triggerStatus = undefined;
  handleQuery();
}

/** 打开编辑对话框 */
function openDialog(title: string, row?: JobInfo) {
  dialogTitle.value = title;
  currentEditRow.value = row || null;
  dialogVisible.value = true;
}

/** 新增任务 */
function handleAdd() {
  openDialog("新增任务", queryParams);
}

/** 编辑任务 */
function handleEdit(row: JobInfo) {
  openDialog("编辑任务", row);
}

/** 对话框操作成功 */
function onEditSuccess() {
  dialogVisible.value = false;
  handleQuery();
}

/** 对话框取消 */
function onEditCancel() {
  dialogVisible.value = false;
}

/** 操作命令分发 */
function handleCommand(command: string, row: JobInfo) {
  switch (command) {
    case "trigger":
      handleTrigger(row);
      break;
    case "start":
      handleStart(row);
      break;
    case "stop":
      handleStop(row);
      break;
    case "delete":
      handleDelete(row.id!);
      break;
    case "responsible":
      handleResponsible(row);
      break;
  }
}

/** 查看日志（调度日志） */
function handleQueryLog(row: JobInfo) {
  currentLogJobId.value = row.id!;
  currentLogJobGroup.value = row.jobGroup;
  currentLogJobDesc.value = row.jobDesc || "";
  logVisible.value = true;
}

function handleStart(row: JobInfo) {
  ElMessageBox.confirm(`确认启动任务【${row.jobDesc}】吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "info",
  }).then(() => {
    startJob(row.id!).then(() => {
      ElMessage.success("启动成功");
      handleQuery();
    });
  });
}

/** 停止任务 */
function handleStop(row: JobInfo) {
  ElMessageBox.confirm(`确认停止任务【${row.jobDesc}】吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    stopJob(row.id!).then(() => {
      ElMessage.success("停止成功");
      handleQuery();
    });
  });
}

/** 立即执行一次 */
function handleTrigger(row: JobInfo) {
  ElMessageBox.confirm(`确认立即执行一次任务【${row.jobDesc}】吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "info",
  }).then(() => {
    triggerJob(row.id!).then(() => {
      ElMessage.success("执行成功");
      handleQuery();
    });
  });
}

/** 删除任务 */
function handleDelete(id: number) {
  ElMessageBox.confirm("确定要删除该任务吗？", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    deleteJob(id)
      .then(() => {
        ElMessage.success("删除成功");
        handleQuery();
      })
      .finally(() => (loading.value = false));
  });
}

/** 获取调度类型文本 */
function getScheduleTypeText(type?: string): string {
  const map: Record<string, string> = {
    NONE: "无调度",
    CRON: "Cron",
    FIX_RATE: "固定间隔",
  };
  return map[type || ""] || type || "-";
}

/** 获取运行模式文本 */
function getGlueTypeText(type?: string): string {
  const map: Record<string, string> = {
    BEAN: "BEAN",
    GLUE_SHELL: "Shell",
    GLUE_PYTHON: "Python",
    GLUE_POWERSHELL: "PowerShell",
  };
  return map[type || ""] || type || "-";
}

onMounted(() => {
  loadServiceList();
  loadJobGroupList();
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
