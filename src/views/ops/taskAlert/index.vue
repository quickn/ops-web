<template>
  <div class="app-container">
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

        <el-form-item prop="taskName" label="任务名称" style="width: 200px">
          <el-input
            v-model="queryParams.taskName"
            placeholder="任务名称"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item prop="taskType" label="任务类型" style="width: 180px">
          <dictionary
            v-model="queryParams.taskType"
            type-code="taskType"
            placeholder="全部类型"
          />
        </el-form-item>

        <el-form-item prop="status" label="状态" style="width: 140px">
          <el-select
            v-model="queryParams.status"
            placeholder="全部"
            clearable
          >
            <el-option label="启动" :value="1" />
            <el-option label="停止" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <el-icon>
              <Search />
            </el-icon>
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <el-icon>
              <Refresh />
            </el-icon>
            重置
          </el-button>
        </el-form-item>

        <el-form-item style="margin-left: auto">
          <el-button type="info" @click="handleTaskAlertCheck">
            <el-icon>
              <Bell />
            </el-icon>
            手动扫描
          </el-button>
          <el-button type="success" @click="openDialog()">
            <el-icon>
              <Plus />
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
        <el-table-column label="ID" prop="id" width="80" align="center" />
        <el-table-column
          label="任务名称"
          prop="taskName"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column label="服务" prop="serviceName" width="140" show-overflow-tooltip />
        <el-table-column label="任务类型" width="140" align="center">
          <template #default="scope">
            <el-tag size="small" type="info">{{ getTaskTypeText(scope.row.taskType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="cron 表达式" prop="cron" width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="80" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'">
              {{ scope.row.status === 1 ? "启动" : "停止" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="邮件告警" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.isEmail ? 'warning' : 'info'" size="small">
              {{ scope.row.isEmail ? "开启" : "关闭" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="失败阈值" prop="failThreshold" width="90" align="center" />
        <el-table-column label="备注" prop="remark" min-width="120" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createTime" width="170" align="center" />
        <el-table-column label="操作" fixed="right" align="center" width="280">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              link
              @click="openDialog(scope.row)"
            >
              <el-icon>
                <Edit />
              </el-icon>
              编辑
            </el-button>
            <el-button
              v-if="scope.row.status === 1"
              type="warning"
              size="small"
              link
              @click="handleToggleStatus(scope.row)"
            >
              <el-icon>
                <VideoPause />
              </el-icon>
              停止
            </el-button>
            <el-button
              v-else
              type="success"
              size="small"
              link
              @click="handleToggleStatus(scope.row)"
            >
              <el-icon>
                <VideoPlay />
              </el-icon>
              启动
            </el-button>
            <el-button
              type="success"
              size="small"
              link
              @click="handleExecute(scope.row)"
            >
              <el-icon>
                <CaretRight />
              </el-icon>
              执行
            </el-button>
            <el-button
              type="danger"
              size="small"
              link
              @click="handleDelete(scope.row.id)"
            >
              <el-icon>
                <Delete />
              </el-icon>
              删除
            </el-button>
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

    <el-dialog
      v-model="dialogEdit.visible"
      :title="dialogEdit.title"
      width="700px"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="closeDialog"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <!-- 任务公共参数 -->
        <ServiceSelect
          v-model="formData.serviceId"
          @change="handleServiceChange"
        />

        <CommonForm
          :form-data="formData"
          @task-type-change="handleTaskTypeChange"
        />

        <el-form-item label="任务参数" prop="taskParams">
          <el-input
            v-model="formData.taskParams"
            type="textarea"
            :rows="4"
            placeholder="请输入任务参数"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
            确 定
          </el-button>
          <el-button @click="closeDialog">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 定时部署编辑弹框 -->
    <DeployEdit
      v-model="deployDialogVisible"
      :edit-id="deployEditId"
      @success="handleDeploySuccess"
    />

    <!-- 预发布Jar同步编辑弹框 -->
    <SyncJarEdit
      v-model="syncJarDialogVisible"
      :edit-id="syncJarEditId"
      @success="handleDeploySuccess"
    />

    <!-- Shell脚本编辑弹框 -->
    <ShellScriptEdit
      v-model="shellDialogVisible"
      :edit-id="shellEditId"
      @success="handleDeploySuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { Bell, CaretRight, Delete, Edit, Plus, Refresh, Search, VideoPause, VideoPlay } from "@element-plus/icons-vue";
import { deleteTaskAlert, executeTaskAlert, listTaskAlertPage, saveTaskAlert, taskAlertCheck } from "@/api/ops/taskAlert";
import { TASK_TYPE_DEPLOY, TASK_TYPE_SHELL, TASK_TYPE_SYNC_JAR, TaskAlert, TaskAlertQuery } from "@/api/ops/taskAlert/types";
import { listAll } from "@/api/monitor/service";
import { ServiceInfo } from "@/api/monitor/service/types";
import { originServerList } from "@/api/monitor/agent";
import { Agent } from "@/api/monitor/agent/types";
import { getDictOptions } from "@/api/dict";
import DeployEdit from "./deployEdit.vue";
import SyncJarEdit from "./syncJarEdit.vue";
import ShellScriptEdit from "./shellScript.vue";
import ServiceSelect from "./serviceSelect.vue";
import CommonForm from "./commonForm.vue";

defineOptions({
  name: "TaskAlertIndex"
});

const queryFormRef = ref(ElForm);
const formRef = ref(ElForm);

const loading = ref(false);
const submitLoading = ref(false);
const total = ref(0);

const queryParams = reactive<TaskAlertQuery>({
  pageNum: 1,
  pageSize: 15,
  serviceId: undefined,
  taskName: "",
  taskType: "",
  isEnabled: undefined,
  status: undefined
});

const dataList = ref<TaskAlert[]>([]);
const serviceList = ref<ServiceInfo[]>([]);
const agentList = ref<Agent[]>([]);

const dialogEdit = reactive<DialogOption>({
  visible: false,
  title: ""
});

// 定时部署编辑弹框状态
const deployDialogVisible = ref(false);
const deployEditId = ref<number | undefined>(undefined);

// 预发布Jar同步编辑弹框状态
const syncJarDialogVisible = ref(false);
const syncJarEditId = ref<number | undefined>(undefined);

// Shell脚本编辑弹框状态
const shellDialogVisible = ref(false);
const shellEditId = ref<number | undefined>(undefined);

const formData = reactive<TaskAlert>({
  isEnabled: true,
  status: 1,
  isEmail: false,
  failThreshold: 1
} as TaskAlert);

const rules = reactive({
  taskName: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
  serviceId: [{ required: true, message: "请选择服务", trigger: "change" }],
  taskType: [{ required: true, message: "请选择任务类型", trigger: "change" }]
});

/** 任务类型字典选项 */
const taskTypeOptions = ref<OptionType[]>([]);

/** 加载任务类型字典 */
function loadTaskTypeDict() {
  getDictOptions("taskType").then(({ data }) => {
    taskTypeOptions.value = data || [];
  });
}

/** 查询 */
function handleQuery() {
  loading.value = true;
  listTaskAlertPage(queryParams)
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

/** 加载主机列表 */
function loadAgentList() {
  originServerList().then(({ data }) => {
    agentList.value = data.records || [];
  });
}

/** 打开弹窗 */
function openDialog(data?: TaskAlert) {
  // 定时部署类型改用部署编辑弹框
  if (data && data.taskType === TASK_TYPE_DEPLOY) {
    deployEditId.value = data.id;
    deployDialogVisible.value = true;
    return;
  }
  // 预发布Jar同步类型改用Jar同步编辑弹框
  if (data && data.taskType === TASK_TYPE_SYNC_JAR) {
    syncJarEditId.value = data.id;
    syncJarDialogVisible.value = true;
    return;
  }
  // Shell脚本类型改用Shell脚本编辑弹框
  if (data && data.taskType === TASK_TYPE_SHELL) {
    shellEditId.value = data.id;
    shellDialogVisible.value = true;
    return;
  }
  dialogEdit.title = data ? "编辑任务告警" : "新增任务告警";
  if (data) {
    Object.assign(formData, data);
  } else {
    resetForm();
  }
  dialogEdit.visible = true;
}

/** 服务切换：同步服务名称 */
function handleServiceChange(service?: ServiceInfo) {
  formData.serviceName = service?.name;
}

/** 任务类型切换：定时部署/预发布Jar同步/Shell脚本 切换为对应编辑弹框 */
function handleTaskTypeChange(type?: string | number) {
  const typeStr = String(type);
  if (
    typeStr !== TASK_TYPE_DEPLOY &&
    typeStr !== TASK_TYPE_SYNC_JAR &&
    typeStr !== TASK_TYPE_SHELL
  ) {
    return;
  }
  dialogEdit.visible = false;
  if (typeStr === TASK_TYPE_SHELL) {
    shellEditId.value = undefined;
    shellDialogVisible.value = true;
    return;
  }
  if (typeStr === TASK_TYPE_DEPLOY) {
    deployEditId.value = undefined;
    deployDialogVisible.value = true;
  } else {
    syncJarEditId.value = undefined;
    syncJarDialogVisible.value = true;
  }

}

/** 部署/Jar同步编辑弹框保存成功 */
function handleDeploySuccess() {
  handleQuery();
}

/** 重置表单 */
function resetForm() {
  Object.keys(formData).forEach((key) => {
    (formData as any)[key] = undefined;
  });
  formData.isEnabled = true;
  formData.status = 1;
  formData.isEmail = false;
  formData.failThreshold = 1;
}

/** 关闭弹窗 */
function closeDialog() {
  dialogEdit.visible = false;
  formRef.value?.resetFields();
  formRef.value?.clearValidate();
}

/** 提交 */
function handleSubmit() {
  formRef.value.validate((valid: boolean) => {
    if (!valid) {
      return;
    }
    submitLoading.value = true;
    saveTaskAlert(formData)
      .then(() => {
        ElMessage.success("保存成功");
        closeDialog();
        handleQuery();
      })
      .finally(() => (submitLoading.value = false));
  });
}

/** 启动/停止 */
function handleToggleStatus(row: TaskAlert) {
  const target = row.status === 1 ? 0 : 1;
  const action = target === 1 ? "启动" : "停止";
  ElMessageBox.confirm(`确认${action}任务【${row.taskName}】吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "info"
  }).then(() => {
    saveTaskAlert({ ...row, status: target }).then(() => {
      ElMessage.success(`${action}成功`);
      handleQuery();
    });
  });
}

/** 立即执行任务 */
function handleExecute(row: TaskAlert) {
  ElMessageBox.confirm(`确认立即执行任务【${row.taskName}】吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "info"
  }).then(() => {
    executeTaskAlert(row.id!).then(() => {
      ElMessage.success("执行成功");
    });
  });
}

/** 手动扫描 */
function handleTaskAlertCheck() {
  ElMessageBox.confirm("确认手动触发一次任务告警扫描吗？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "info"
  }).then(() => {
    taskAlertCheck().then(() => {
      ElMessage.success("扫描完成");
    });
  });
}

/** 删除 */
function handleDelete(id?: number) {
  if (!id) {
    ElMessage.warning("请选择要删除的项");
    return;
  }
  ElMessageBox.confirm("确定要删除该任务告警吗？", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(() => {
    deleteTaskAlert(id).then(() => {
      ElMessage.success("删除成功");
      handleQuery();
    });
  });
}

/** 获取任务类型文本 */
function getTaskTypeText(type?: string): string {
  const option = taskTypeOptions.value.find((item) => String(item.value) === String(type));
  return option?.label || type || "-";
}

onMounted(() => {
  loadServiceList();
  loadAgentList();
  loadTaskTypeDict();
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
