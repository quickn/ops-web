<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑定时部署任务' : '新增定时部署任务'"
    width="1100px"
    top="0"
    class="deploy-edit-dialog"
    destroy-on-close
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <div v-loading="pageLoading">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="110px"
      >
        <el-tabs v-model="activeTab">
          <!-- 任务公共参数 -->
          <el-tab-pane name="base">
            <template #label>
              <el-icon class="tab-icon">
                <InfoFilled />
              </el-icon>
              基本信息
            </template>

            <CommonForm
              :form-data="formData"
              :show-task-type="false"
            />
          </el-tab-pane>

          <!-- 部署内容 -->
          <el-tab-pane name="content">
            <template #label>
              <el-icon class="tab-icon">
                <Promotion />
              </el-icon>
              部署内容
            </template>

            <ServiceSelect
              v-model="formData.serviceId"
              @change="handleServiceChange"
            />

            <el-form-item label="选择项目" prop="projectNames">
              <div class="project-select">
                <el-transfer
                  v-model="selectedProjects"
                  :data="projectOptions"
                  :titles="['可选项目', '已选项目']"
                  filterable
                  filter-placeholder="搜索项目"
                />
              </div>
            </el-form-item>

            <el-form-item label="部署方式" prop="deployType">
              <el-radio-group v-model="deployConfig.deployType">
                <el-radio :value="1">重新构建</el-radio>
                <el-radio :value="2">直接替换Jar包</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="同步部署" prop="sync">
              <el-switch
                v-model="deployConfig.sync"
                :active-value="true"
                :inactive-value="false"
                active-text="同步部署"
                inactive-text="不同步"
              />
              <div class="tip">多台服务器部署时，会等待一台服务器部署成功后再执行另一台</div>
            </el-form-item>

            <el-form-item label="时间间隔" prop="interval">
              <el-input-number
                v-model="deployConfig.interval"
                :min="0"
                :max="3600"
                :step="10"
                style="width: 200px"
              />
              <span class="interval-unit">秒</span>
              <div class="tip">多台服务器部署时，等待一台服务部署完成的时间，0 表示不等待</div>
            </el-form-item>
          </el-tab-pane>
        </el-tabs>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取 消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确 定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  InfoFilled,
  Promotion,
} from "@element-plus/icons-vue";
import {
  getTaskAlertById,
  saveTaskAlert,
} from "@/api/ops/taskAlert";
import { DeployConfig, TaskAlert, TASK_TYPE_DEPLOY } from "@/api/ops/taskAlert/types";
import { getListByServiceId } from "@/api/docker";
import { ServiceInfo } from "@/api/monitor/service/types";
import ServiceSelect from "./serviceSelect.vue";
import CommonForm from "./commonForm.vue";

defineOptions({
  name: "TaskAlertDeployEdit",
});

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 编辑时的任务ID，为 undefined 表示新增 */
  editId: { type: Number, default: undefined },
  /** 编辑时的行数据 */
  editData: { type: Object as () => TaskAlert | null, default: null },
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "success"): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const formRef = ref(ElForm);
const pageLoading = ref(false);
const submitLoading = ref(false);
const isEdit = ref(false);
/** 当前激活的标签页：base-基本信息 content-部署内容 */
const activeTab = ref("base");

const projectOptions = ref<{ key: string; label: string }[]>([]);
const selectedProjects = ref<string[]>([]);

const formData = reactive<TaskAlert>({
  taskType: TASK_TYPE_DEPLOY,
  isEnabled: true,
  status: 1,
  isEmail: false,
  failThreshold: 1,
} as TaskAlert);

/** 部署配置（提交时序列化到 taskParams） */
const deployConfig = reactive<DeployConfig>({
  deployType: 2,
  sync: true,
  interval: 0,
  projectNames: "",
});

const rules = reactive({
  taskName: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
  serviceId: [{ required: true, message: "请选择服务", trigger: "change" }],
  cron: [{ required: true, message: "请输入cron表达式", trigger: "blur" }],
});

/** 重置表单 */
function resetForm() {
  Object.keys(formData).forEach((key) => {
    (formData as any)[key] = undefined;
  });
  formData.taskType = TASK_TYPE_DEPLOY;
  formData.isEnabled = true;
  formData.status = 1;
  formData.isEmail = false;
  formData.failThreshold = 1;
  deployConfig.deployType = 2;
  deployConfig.sync = true;
  deployConfig.interval = 0;
  deployConfig.projectNames = "";
  selectedProjects.value = [];
  isEdit.value = false;
  activeTab.value = "base";
}

/** 加载项目（镜像）列表 */
function loadProjects(serviceId?: number) {
  projectOptions.value = [];
  selectedProjects.value = [];
  if (!serviceId) {
    return;
  }
  getListByServiceId(serviceId).then(({ data }) => {
    const names = data || [];
    projectOptions.value = names.map((name) => ({ key: name, label: name }));
  });
}

/** 选择服务变化：同步服务名称并加载项目列表 */
function handleServiceChange(service?: ServiceInfo) {
  formData.serviceName = service?.name;
  loadProjects(service?.id);
}

/** 从 taskParams 解析部署配置 */
function parseDeployConfig(taskParams?: string) {
  selectedProjects.value = [];
  if (!taskParams) {
    return;
  }
  try {
    const obj = JSON.parse(taskParams);
    if (obj.projectNames) {
      selectedProjects.value = obj.projectNames
        .split(",")
        .map((n: string) => n.trim())
        .filter((n: string) => n !== "");
    }
    if (obj.deployType !== undefined && obj.deployType !== null) {
      deployConfig.deployType = obj.deployType;
    }
    if (obj.sync !== undefined && obj.sync !== null) {
      deployConfig.sync = obj.sync;
    }
    if (obj.interval !== undefined && obj.interval !== null) {
      deployConfig.interval = obj.interval;
    }
  } catch {
    selectedProjects.value = [];
  }
}

/** 加载编辑数据 */
function loadDetail(id: number) {
  pageLoading.value = true;
  getTaskAlertById(id)
    .then(({ data }) => {
      if (data) {
        Object.assign(formData, data);
        isEdit.value = true;
        loadProjects(data.serviceId);
        parseDeployConfig(data.taskParams);
      } else {
        ElMessage.warning("未找到该任务");
      }
    })
    .catch(() => {
      ElMessage.error("加载任务详情失败");
      visible.value = false;
    })
    .finally(() => {
      pageLoading.value = false;
    });
}

/** 提交表单 */
function handleSubmit() {
  formRef.value.validate((valid: boolean, invalidFields?: Record<string, any>) => {
    if (!valid) {
      // 切换到第一个出错字段所在的标签页
      const baseFields = ["taskName", "serviceId", "cron", "taskType"];
      const errorFields = Object.keys(invalidFields || {});
      activeTab.value = errorFields.some((f) => baseFields.includes(f))
        ? "base"
        : "content";
      ElMessage.warning("请检查表单必填项");
      return;
    }
    if (selectedProjects.value.length === 0) {
      activeTab.value = "content";
      ElMessage.warning("请选择至少一个部署项目");
      return;
    }
    submitLoading.value = true;

    // 将部署配置序列化为 taskParams
    const taskParamsConfig: DeployConfig = {
      projectNames: selectedProjects.value.join(","),
      deployType: deployConfig.deployType,
      sync: deployConfig.sync,
      interval: deployConfig.interval,
    };

    const payload: TaskAlert = {
      ...formData,
      taskParams: JSON.stringify(taskParamsConfig),
    };

    saveTaskAlert(payload)
      .then(() => {
        ElMessage.success(isEdit.value ? "更新成功" : "新增成功");
        visible.value = false;
        emit("success");
      })
      .finally(() => {
        submitLoading.value = false;
      });
  });
}

/** 弹窗关闭后重置 */
function handleClosed() {
  resetForm();
}

// 弹窗打开时初始化数据
watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      return;
    }
    resetForm();
    if (props.editId) {
      loadDetail(props.editId);
    } else if (props.editData) {
      Object.assign(formData, props.editData);
      isEdit.value = true;
      loadProjects(props.editData.serviceId);
      parseDeployConfig(props.editData.taskParams);
    }
  }
);
</script>

<style scoped>
.deploy-edit-dialog {
  height: 100vh;
  margin: 0;
}

.deploy-edit-dialog :deep(.el-dialog__body) {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.tab-icon {
  margin-right: 4px;
  vertical-align: -2px;
}

.project-select {
  width: 100%;
}

.project-select :deep(.el-transfer) {
  --el-transfer-panel-width: 300px;
  --el-transfer-panel-body-height: calc(100vh - 500px);
}

.interval-unit {
  margin-left: 8px;
  color: #909399;
}

.tip {
  width: 100%;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
