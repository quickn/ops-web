<template>
  <el-dialog
    v-model="visible"
    title="任务参数配置"
    width="1000px"
    top="0"
    class="task-config-dialog"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form
      ref="taskConfigFormRef"
      :model="taskConfigForm"
      label-width="100px"
      v-loading="taskConfigLoading"
    >
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="任务名称">
            <span>{{ jobDesc }}</span>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="任务ID">
            <span>{{ jobId }}</span>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="isImageMode ? 8 : 24">
          <el-form-item label="选择服务">
            <el-select
              v-model="taskConfigForm.serviceId"
              placeholder="请选择服务"
              clearable
              style="width: 100%"
              @change="handleServiceChange"
            >
              <el-option
                v-for="item in serviceInfoList"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <template v-if="isImageMode">
            <el-form-item v-if="isDeployHandler" label="部署方式">
              <el-select
                v-model="taskConfigForm.deployType"
                style="width: 100%"
              >
                <el-option label="重新构建" :value="1" />
                <el-option label="直接替换源文件" :value="2" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="isSyncJarHandler" label="源文件服务">
              <el-select
                v-model="taskConfigForm.agentId"
                filterable
                clearable
                style="width: 100%"
                placeholder="请选择源文件服务"
              >
                <el-option
                  v-for="(item, index) in sourceServiceList"
                  :key="index"
                  :label="item.label"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item v-else label="代理ID">
              <el-input
                v-model="taskConfigForm.agentId"
                :min="0"
                style="width: 100%"
                placeholder="代理ID"
              />
            </el-form-item>
            <el-form-item label="超时时间(秒)">
              <el-input-number
                v-model="taskConfigForm.timeout"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="间隔时间(秒)">
              <el-input-number
                v-model="taskConfigForm.interval"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </template>
        </el-col>
        <el-col v-if="isImageMode" :span="16">
          <el-form-item label="选择镜像" class="image-form-item">
            <div v-if="imageNameList.length === 0" class="image-empty">
              暂无镜像
            </div>
            <el-checkbox-group
              v-else
              ref="imageGroupRef"
              v-model="selectedImageNames"
              class="image-group"
            >
              <el-checkbox
                v-for="name in imageNameList"
                :key="name"
                :label="name"
                class="image-checkbox"
                :title="name"
              >
                <span class="image-drag-handle">
                  <el-icon><Rank /></el-icon>
                </span>
                <span class="image-label">{{ name }}</span>
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item v-if="!isImageMode" label="类型">
        <el-select v-model="taskConfigForm.type" style="width: 100%">
          <el-option label="cmd" value="cmd" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="!isImageMode" label="指令名称" prop="command">
        <el-input v-model="taskConfigForm.command" placeholder="请输入指令" clearable />
      </el-form-item>
      <el-form-item v-if="!isImageMode" label="脚本" prop="script">
        <el-input
          v-model="taskConfigForm.script"
          type="textarea"
          :rows="6"
          placeholder="请输入脚本"
        />
      </el-form-item>
      <el-form-item v-if="!isImageMode" label="代理ID">
        <el-input
          v-model="taskConfigForm.agentId"
          :min="0"
          style="width: 100%"
          placeholder="请输入代理ID"
        />
      </el-form-item>
      <el-form-item v-if="!isImageMode" label="超时时间(秒)">
        <el-input-number v-model="taskConfigForm.timeout" :min="0" style="width: 100%" />
      </el-form-item>
      <el-form-item v-if="!isImageMode" label="间隔时间(秒)">
        <el-input-number v-model="taskConfigForm.interval" :min="0" style="width: 100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="taskConfigSaving" @click="handleTaskConfigSave">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Rank } from "@element-plus/icons-vue";
import { getTaskConfig, saveTaskConfig } from "@/api/ops/jobinfo";
import { JobConfig } from "@/api/ops/jobinfo/types";
import { listAll } from "@/api/monitor/service";
import { ServiceInfo } from "@/api/monitor/service/types";
import { getListByServiceId } from "@/api/docker";
import { originServerList } from "@/api/monitor/agent";
import { default as Sortable, SortableEvent } from "sortablejs";

defineOptions({
  name: "JobInfoTaskConfig",
  inheritAttrs: false,
});

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  jobId: { type: Number, default: 0 },
  jobDesc: { type: String, default: "" },
  executorHandler: { type: String, default: "" },
});

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "success"): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const taskConfigFormRef = ref(ElForm);
const taskConfigLoading = ref(false);
const taskConfigSaving = ref(false);
const serviceInfoList = ref<ServiceInfo[]>([]);
const imageNameList = ref<string[]>([]);
const selectedImageNames = ref<string[]>([]);
const sourceServiceList = ref<any[]>([]);
const imageGroupRef = ref<any>();
let sortableInstance: Sortable | null = null;

const taskConfigForm = reactive<JobConfig>({
  serviceId: undefined,
  command: "",
  script: "",
  type: "cmd",
  timeout: 10,
  interval: 0,
  agentId: undefined,
  deployType: 2,
});

/** 是否为镜像勾选模式（运行模式为 syncJarJobHandler / deployJobHandler） */
const isImageMode = computed(
  () =>
    props.executorHandler === "syncJarJobHandler" ||
    props.executorHandler === "deployJobHandler"
);

/** 是否为部署模式（运行模式为 deployJobHandler） */
const isDeployHandler = computed(
  () => props.executorHandler === "deployJobHandler"
);

/** 是否为同步Jar模式（运行模式为 syncJarJobHandler） */
const isSyncJarHandler = computed(
  () => props.executorHandler === "syncJarJobHandler"
);

/** 重置表单为默认值 */
function resetForm() {
  Object.assign(taskConfigForm, {
    serviceId: undefined,
    command: "",
    script: "",
    type: "cmd",
    timeout: 10,
    interval: 0,
    agentId: undefined,
    deployType: 2,
  });
  imageNameList.value = [];
  selectedImageNames.value = [];
}

/** 将选中的镜像置顶（保持各自相对顺序） */
function applySelectedFirst() {
  const selectedSet = new Set(selectedImageNames.value);
  const selected = imageNameList.value.filter((n) => selectedSet.has(n));
  const unselected = imageNameList.value.filter((n) => !selectedSet.has(n));
  imageNameList.value = [...selected, ...unselected];
  // 同步已选顺序，保证最终 projectNames 顺序与置顶后一致
  selectedImageNames.value = selected;
}

/** 初始化拖拽排序 */
function initSortable() {
  destroySortable();
  const el = imageGroupRef.value?.$el as HTMLElement | undefined;
  if (!el || imageNameList.value.length === 0) return;
  sortableInstance = Sortable.create(el, {
    animation: 150,
    handle: ".image-drag-handle",
    onEnd(event: SortableEvent) {
      const { oldIndex, newIndex } = event;
      if (
        oldIndex === undefined ||
        newIndex === undefined ||
        oldIndex === newIndex
      ) {
        return;
      }
      const moved = imageNameList.value.splice(oldIndex, 1)[0];
      imageNameList.value.splice(newIndex, 0, moved);
      applySelectedFirst();
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

/** 加载镜像名称列表（可传入已有 script 用于回显勾选状态） */
function loadImageNameList(serviceId: number, script?: string) {
  imageNameList.value = [];
  selectedImageNames.value = [];
  getListByServiceId(serviceId)
    .then(({ data }) => {
      imageNameList.value = data || [];
      // 回显已有勾选状态
      if (script) {
        parseSelectedImageNames(script);
        applySelectedFirst();
      }
      nextTick(initSortable);
    })
    .catch(() => {
      ElMessage.error("获取镜像名称失败");
    });
}

/** 从 script 中解析已选镜像名称及部署方式 */
function parseSelectedImageNames(script?: string) {
  if (!script) {
    selectedImageNames.value = [];
    return;
  }
  try {
    const obj = JSON.parse(script);
    const names = obj?.projectNames as string;
    selectedImageNames.value = names
      ? names.split(",").filter((n: string) => n.trim() !== "")
      : [];
    // 回显部署方式
    if (obj?.deployType !== undefined && obj?.deployType !== null) {
      taskConfigForm.deployType = obj.deployType;
    }
  } catch {
    selectedImageNames.value = [];
  }
}

/** 加载任务参数配置 */
function loadTaskConfig() {
  if (!props.jobId) return;
  taskConfigLoading.value = true;
  getTaskConfig(props.jobId)
    .then(({ data }) => {
      if (data) {
        Object.assign(taskConfigForm, data);
        if (isImageMode.value && data.serviceId) {
          loadImageNameList(data.serviceId, data.script);
        }
      }
    })
    .catch(() => {
      // 无配置时使用默认值
    })
    .finally(() => {
      taskConfigLoading.value = false;
    });
}

/** 保存任务参数配置 */
function handleTaskConfigSave() {
  // 镜像模式下，将选中的镜像名称回写为 script
  let script = taskConfigForm.script;
  if (isImageMode.value) {
    const scriptObj: Record<string, any> = {
      projectNames: selectedImageNames.value.join(","),
    };
    if (isDeployHandler.value) {
      scriptObj.deployType = taskConfigForm.deployType;
    }
    script = JSON.stringify(scriptObj);
  }

  taskConfigSaving.value = true;
  saveTaskConfig({
    ...taskConfigForm,
    script,
    id: props.jobId,
  })
    .then(() => {
      ElMessage.success("配置保存成功");
      visible.value = false;
      emit("success");
    })
    .finally(() => {
      taskConfigSaving.value = false;
    });
}

/** 选择服务变化（镜像模式下加载镜像名称列表） */
function handleServiceChange(serviceId?: number) {
  if (!isImageMode.value) return;
  if (serviceId) {
    loadImageNameList(serviceId);
  } else {
    imageNameList.value = [];
    selectedImageNames.value = [];
  }
}

// 勾选集合发生变化（增/删项）时，将选中的镜像置顶
watch(
  () => [...selectedImageNames.value].sort().join(","),
  (val, oldVal) => {
    if (val === oldVal) return;
    applySelectedFirst();
  }
);

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      resetForm();
      loadTaskConfig();
      if (isSyncJarHandler.value) {
        loadSourceServiceList();
      }
    } else {
      destroySortable();
    }
  }
);

onUnmounted(() => {
  destroySortable();
});

onMounted(() => {
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
  });
  if (isSyncJarHandler.value) {
    loadSourceServiceList();
  }
});
</script>

<style scoped>
.task-config-dialog {
  height: 100vh;
  margin: 0;
}

.task-config-dialog :deep(.el-dialog__header) {
  padding-bottom: 0;
}

.task-config-dialog :deep(.el-dialog__body) {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.image-group {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 4px;
  width: 100%;
  max-height: calc(100vh - 180px);
  overflow-y: auto;
  padding: 4px;
}

.image-checkbox {
  margin-right: 0;
  width: 100%;
}

.image-checkbox :deep(.el-checkbox__label) {
  display: flex;
  align-items: center;
  overflow: hidden;
}

.image-drag-handle {
  display: inline-flex;
  align-items: center;
  margin-right: 4px;
  cursor: grab;
  color: #909399;
}

.image-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-empty {
  color: #909399;
  font-size: 13px;
}
</style>
