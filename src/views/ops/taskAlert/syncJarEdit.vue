<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑预发布Jar同步任务' : '新增预发布Jar同步任务'"
    width="1200px"
    top="0"
    class="sync-jar-dialog"
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
              @service-change="handleServiceChange"
            />
          </el-tab-pane>

          <!-- 同步内容 -->
          <el-tab-pane name="content">
            <template #label>
              <el-icon class="tab-icon">
                <Promotion />
              </el-icon>
              同步内容
            </template>

            <el-row :gutter="16">
              <el-col :span="5" class="left-col">
                <el-form-item label="源文件服务" prop="agentId">
                  <el-select
                    v-model="formData.agentId"
                    filterable
                    clearable
                    style="width: 100%"
                    placeholder="请选择源文件服务"
                  >
                    <el-option
                      v-for="item in sourceServiceList"
                      :key="item.id"
                      :label="item.label"
                      :value="item.id"
                    />
                  </el-select>
                  <div class="tip">Jar 包从该源服务器同步到目标服务的各项目</div>
                </el-form-item>

                <el-form-item label="间隔时间(秒)">
                  <el-input-number
                    v-model="syncJarConfig.interval"
                    :min="0"
                    :max="3600"
                    :step="10"
                    style="width: 100%"
                  />
                  <div class="tip">
                    多个项目同步时，每完成一个项目后的等待时间，0 表示不等待
                  </div>
                </el-form-item>
              </el-col>

              <el-col :span="19">
                <el-form-item label="选择项目" class="project-form-item">
                  <div v-if="projectOptions.length === 0" class="project-empty">
                    请先选择服务
                  </div>
                  <el-row v-else :gutter="16" class="project-panel">
                    <!-- 左列：未选中的项目 -->
                    <el-col :span="12">
                      <div class="project-panel-header">
                        <span class="project-panel-title">未选中</span>
                        <el-checkbox
                          v-model="isAllSelected"
                          :indeterminate="isIndeterminate"
                          @change="handleSelectAll"
                        >
                          全选
                        </el-checkbox>
                      </div>
                      <el-checkbox-group
                        v-model="selectedProjects"
                        class="project-group"
                      >
                        <el-checkbox
                          v-for="name in unselectedProjectList"
                          :key="name"
                          :label="name"
                          class="project-checkbox"
                          :title="name"
                        >
                          <span class="project-label">{{ name }}</span>
                        </el-checkbox>
                      </el-checkbox-group>
                    </el-col>
                    <!-- 右列：已选中的项目（可拖拽排序） -->
                    <el-col :span="12">
                      <div class="project-panel-title">已选中</div>
                      <el-checkbox-group
                        ref="projectGroupRef"
                        v-model="selectedProjects"
                        class="project-group"
                      >
                        <el-checkbox
                          v-for="name in selectedProjectList"
                          :key="name"
                          :label="name"
                          class="project-checkbox"
                          :title="name"
                        >
                          <span class="project-drag-handle">
                            <el-icon><Rank /></el-icon>
                          </span>
                          <span class="project-label">{{ name }}</span>
                        </el-checkbox>
                      </el-checkbox-group>
                      <div v-if="selectedProjectList.length === 0" class="project-empty">
                        请从左侧勾选项目
                      </div>
                    </el-col>
                  </el-row>
                </el-form-item>
              </el-col>
            </el-row>
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
import { InfoFilled, Promotion, Rank } from "@element-plus/icons-vue";
import {
  getTaskAlertById,
  saveTaskAlert,
} from "@/api/ops/taskAlert";
import {
  SyncJarConfig,
  TaskAlert,
  TASK_TYPE_SYNC_JAR,
} from "@/api/ops/taskAlert/types";
import { getListByServiceId } from "@/api/docker";
import { originServerList } from "@/api/monitor/agent";
import Sortable from "sortablejs";
import type { SortableEvent } from "sortablejs";
import CommonForm from "./commonForm.vue";

defineOptions({
  name: "TaskAlertSyncJarEdit",
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
/** 当前激活的标签页：base-基本信息 content-同步内容 */
const activeTab = ref("base");

const projectOptions = ref<string[]>([]);
const selectedProjects = ref<string[]>([]);
const sourceServiceList = ref<any[]>([]);
const projectGroupRef = ref<any>();
let sortableInstance: Sortable | null = null;

const formData = reactive<TaskAlert>({
  taskType: TASK_TYPE_SYNC_JAR,
  isEnabled: true,
  status: 1,
  isEmail: false,
  failThreshold: 1,
} as TaskAlert);

/** 同步配置（提交时序列化到 script） */
const syncJarConfig = reactive<SyncJarConfig>({
  projectNames: "",
  interval: 0,
});

const rules = reactive({
  taskName: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
  serviceId: [{ required: true, message: "请选择服务", trigger: "change" }],
  cron: [{ required: true, message: "请输入cron表达式", trigger: "blur" }],
  agentId: [{ required: true, message: "请选择源文件服务", trigger: "change" }],
});

/** 未选中的项目列表 */
const unselectedProjectList = computed(() =>
  projectOptions.value.filter((n) => !selectedProjects.value.includes(n))
);

/** 已选中的项目列表（按选中顺序） */
const selectedProjectList = computed(() =>
  selectedProjects.value.filter((n) => projectOptions.value.includes(n))
);

/** 是否全部选中 */
const isAllSelected = computed(
  () =>
    projectOptions.value.length > 0 &&
    selectedProjects.value.length === projectOptions.value.length
);

/** 是否部分选中（用于全选复选框的 indeterminate 状态） */
const isIndeterminate = computed(
  () =>
    selectedProjects.value.length > 0 &&
    selectedProjects.value.length < projectOptions.value.length
);

/** 全选/取消全选 */
function handleSelectAll(val: boolean) {
  if (val) {
    // 全选：保留原有顺序，追加未选中的
    const selectedSet = new Set(selectedProjects.value);
    selectedProjects.value = [
      ...selectedProjects.value,
      ...projectOptions.value.filter((n) => !selectedSet.has(n)),
    ];
  } else {
    selectedProjects.value = [];
  }
}

/** 重置表单 */
function resetForm() {
  Object.keys(formData).forEach((key) => {
    (formData as any)[key] = undefined;
  });
  formData.taskType = TASK_TYPE_SYNC_JAR;
  formData.isEnabled = true;
  formData.status = 1;
  formData.isEmail = false;
  formData.failThreshold = 1;
  syncJarConfig.projectNames = "";
  syncJarConfig.interval = 0;
  projectOptions.value = [];
  selectedProjects.value = [];
  isEdit.value = false;
  activeTab.value = "base";
}

/** 初始化拖拽排序 */
function initSortable() {
  destroySortable();
  const el = projectGroupRef.value?.$el as HTMLElement | undefined;
  if (!el || selectedProjectList.value.length === 0) return;
  sortableInstance = Sortable.create(el, {
    animation: 150,
    handle: ".project-drag-handle",
    onEnd(event: SortableEvent) {
      const { oldIndex, newIndex } = event;
      if (
        oldIndex === undefined ||
        newIndex === undefined ||
        oldIndex === newIndex
      ) {
        return;
      }
      const list = selectedProjects.value;
      const moved = list.splice(oldIndex, 1)[0];
      list.splice(newIndex, 0, moved);
    },
  });
}

/** 销毁拖拽实例 */
function destroySortable() {
  if (sortableInstance) {
    sortableInstance.destroy();
    sortableInstance = null;
  }
}

/** 加载源文件服务列表 */
function loadSourceServiceList() {
  originServerList({
    pageNum: 1,
    pageSize: 15000,
    isOriginServer: true,
  } as any)
    .then(({ data }) => {
      const list = Array.isArray(data) ? data : (data?.records || []);
      sourceServiceList.value = list.map((item: any) => ({
        ...item,
        label: `${item.hostname} (${item.serviceName})`,
      }));
    })
    .catch(() => {
      ElMessage.error("获取源文件服务失败");
    });
}

/** 加载项目列表（可传入已有 script 用于回显勾选状态，keepSelected 表示保留已选中的项目） */
function loadProjects(serviceId: number, script?: string, keepSelected = false) {
  projectOptions.value = [];
  // 只有回显（传入 script）时才清空选中项，切换服务时保留
  if (!keepSelected) {
    selectedProjects.value = [];
  }
  getListByServiceId(serviceId)
    .then(({ data }) => {
      projectOptions.value = data || [];
      // 回显已有勾选状态
      if (script) {
        parseSyncJarConfig(script);
      } else if (keepSelected) {
        // 切换服务时，过滤掉新列表中不存在的已选项
        selectedProjects.value = selectedProjects.value.filter((n) =>
          projectOptions.value.includes(n)
        );
      }
      nextTick(initSortable);
    })
    .catch(() => {
      ElMessage.error("获取项目列表失败");
    });
}

/** 从 script 中解析同步配置（已选项目、间隔时间） */
function parseSyncJarConfig(script?: string) {
  if (!script) {
    selectedProjects.value = [];
    return;
  }
  try {
    const obj = JSON.parse(script);
    const names = obj?.projectNames as string;
    selectedProjects.value = names
      ? names
          .split(",")
          .map((n: string) => n.trim())
          .filter((n: string) => n !== "")
      : [];
    if (obj?.interval !== undefined && obj?.interval !== null) {
      syncJarConfig.interval = obj.interval;
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
        if (data.serviceId) {
          loadProjects(data.serviceId, data.script);
        }
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
      ElMessage.warning("请选择至少一个同步项目");
      return;
    }
    submitLoading.value = true;

    // 将同步配置序列化为 script
    const scriptConfig: SyncJarConfig = {
      projectNames: selectedProjects.value.join(","),
      interval: syncJarConfig.interval,
    };

    const payload: TaskAlert = {
      ...formData,
      script: JSON.stringify(scriptConfig),
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

/** 选择服务变化（切换服务时保留已选中的项目） */
function handleServiceChange(serviceId?: number) {
  if (serviceId) {
    loadProjects(serviceId, undefined, true);
  } else {
    projectOptions.value = [];
    selectedProjects.value = [];
  }
}

/** 弹窗关闭后重置 */
function handleClosed() {
  resetForm();
  destroySortable();
}

// 勾选集合发生变化（增/删项）时，重新初始化拖拽排序
watch(
  () => [...selectedProjects.value].sort().join(","),
  (val, oldVal) => {
    if (val === oldVal) return;
    nextTick(initSortable);
  }
);

// 切换到同步内容标签页时，确保拖拽排序在可见 DOM 上生效
watch(activeTab, (val) => {
  if (val === "content") {
    nextTick(initSortable);
  }
});

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
      if (props.editData.serviceId) {
        loadProjects(props.editData.serviceId, props.editData.script);
      }
    }
  }
);

onUnmounted(() => {
  destroySortable();
});

onMounted(() => {
  loadSourceServiceList();
});
</script>

<style scoped>
.sync-jar-dialog {
  height: 100vh;
  margin: 0;
}

.sync-jar-dialog :deep(.el-dialog__body) {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.tab-icon {
  margin-right: 4px;
  vertical-align: -2px;
}

.left-col :deep(.el-form-item__label) {
  float: none;
  display: block;
  width: auto;
  text-align: left;
  padding-bottom: 4px;
}

.left-col :deep(.el-form-item__content) {
  margin-left: 0 !important;
  width: 100%;
}

.project-form-item :deep(.el-form-item__label) {
  float: none;
  display: block;
  width: auto;
  text-align: left;
  padding-bottom: 4px;
}

.project-form-item :deep(.el-form-item__content) {
  margin-left: 0 !important;
  width: 100%;
}

.project-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.project-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.project-group {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 4px;
  width: 100%;
  padding: 4px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  min-height: 60px;
  max-height: calc(100vh - 400px);
  overflow-y: auto;
}

.project-checkbox {
  margin-right: 0;
  width: 100%;
}

.project-checkbox :deep(.el-checkbox__label) {
  display: flex;
  align-items: center;
  overflow: hidden;
}

.project-drag-handle {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
  cursor: grab;
  color: #909399;
}

.project-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-empty {
  color: #909399;
  font-size: 13px;
}

.tip {
  width: 100%;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
