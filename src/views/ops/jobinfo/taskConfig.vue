<template>
  <el-dialog
    v-model="visible"
    title="任务参数配置"
    width="1200px"
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
        <el-col :span="5">
          <el-form-item label="任务名称">
            <span>{{ jobDesc }}</span>
          </el-form-item>
        </el-col>
        <el-col :span="19">
          <el-form-item label="任务ID">
            <span>{{ jobId }}</span>
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="isImageMode ? 6: 24" :class="{ 'left-col': isImageMode }">
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
            <el-form-item v-if="isDeployHandler" label="是否同步部署">
              <el-switch
                v-model="taskConfigForm.sync"
                :active-value="true"
                :inactive-value="false"
                active-text="同步部署"
                inactive-text="不同步"
              />
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
        <el-col v-if="isImageMode" :span="18" >
          <el-form-item label="选择镜像" class="image-form-item">
            <div v-if="imageNameList.length === 0" class="image-empty">
              暂无镜像
            </div>
            <el-row v-else :gutter="16" class="image-panel">
              <!-- 左列：未选中的镜像 -->
              <el-col :span="12">
                <div class="image-panel-header">
                  <span class="image-panel-title">未选中</span>
                  <el-checkbox
                    v-model="isAllSelected"
                    :indeterminate="isIndeterminate"
                    @change="handleSelectAll"
                  >
                    全选
                  </el-checkbox>
                </div>
                <el-checkbox-group
                  v-model="selectedImageNames"
                  class="image-group"
                >
                  <el-checkbox
                    v-for="name in unselectedImageList"
                    :key="name"
                    :label="name"
                    class="image-checkbox"
                    :title="name"
                  >
                    <span class="image-label">{{ name }}</span>
                  </el-checkbox>
                </el-checkbox-group>
              </el-col>
              <!-- 右列：已选中的镜像（可拖拽排序） -->
              <el-col :span="12">
                <div class="image-panel-title">已选中</div>
                <el-checkbox-group
                  ref="imageGroupRef"
                  v-model="selectedImageNames"
                  class="image-group"
                >
                  <el-checkbox
                    v-for="name in selectedImageList"
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
                <div v-if="selectedImageList.length === 0" class="image-empty">
                  请从左侧勾选镜像
                </div>
              </el-col>
            </el-row>
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
  sync: true,
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

/** 未选中的镜像列表 */
const unselectedImageList = computed(() =>
  imageNameList.value.filter((n) => !selectedImageNames.value.includes(n))
);

/** 已选中的镜像列表（按选中顺序） */
const selectedImageList = computed(() =>
  selectedImageNames.value.filter((n) => imageNameList.value.includes(n))
);

/** 是否全部选中 */
const isAllSelected = computed(
  () =>
    imageNameList.value.length > 0 &&
    selectedImageNames.value.length === imageNameList.value.length
);

/** 是否部分选中（用于全选复选框的 indeterminate 状态） */
const isIndeterminate = computed(
  () =>
    selectedImageNames.value.length > 0 &&
    selectedImageNames.value.length < imageNameList.value.length
);

/** 全选/取消全选 */
function handleSelectAll(val: boolean) {
  if (val) {
    // 全选：保留原有顺序，追加未选中的
    const selectedSet = new Set(selectedImageNames.value);
    selectedImageNames.value = [
      ...selectedImageNames.value,
      ...imageNameList.value.filter((n) => !selectedSet.has(n)),
    ];
  } else {
    // 取消全选
    selectedImageNames.value = [];
  }
}

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
    sync: true,
  });
  imageNameList.value = [];
  selectedImageNames.value = [];
}

/** 初始化拖拽排序 */
function initSortable() {
  destroySortable();
  const el = imageGroupRef.value?.$el as HTMLElement | undefined;
  if (!el || selectedImageList.value.length === 0) return;
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
      const list = selectedImageNames.value;
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

/** 加载镜像名称列表（可传入已有 script 用于回显勾选状态，keepSelected 表示保留已选中的镜像） */
function loadImageNameList(
  serviceId: number,
  script?: string,
  keepSelected = false
) {
  imageNameList.value = [];
  // 只有回显（传入 script）时才清空选中项，切换服务时保留
  if (!keepSelected) {
    selectedImageNames.value = [];
  }
  getListByServiceId(serviceId)
    .then(({ data }) => {
      imageNameList.value = data || [];
      // 回显已有勾选状态
      if (script) {
        parseSelectedImageNames(script);
      } else if (keepSelected) {
        // 切换服务时，过滤掉新列表中不存在的已选项
        selectedImageNames.value = selectedImageNames.value.filter((n) =>
          imageNameList.value.includes(n)
        );
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
    // 回显是否同步部署
    if (obj?.sync !== undefined && obj?.sync !== null) {
      taskConfigForm.sync = obj.sync;
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
      scriptObj.sync = taskConfigForm.sync;
    }
    script = JSON.stringify(scriptObj);
  }

  taskConfigSaving.value = true;
  saveTaskConfig({
    ...taskConfigForm,
    command: props.jobDesc,
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
    // 切换服务时保留已选中的镜像
    loadImageNameList(serviceId, undefined, true);
  } else {
    imageNameList.value = [];
    selectedImageNames.value = [];
  }
}

// 勾选集合发生变化（增/删项）时，重新初始化拖拽排序
watch(
  () => [...selectedImageNames.value].sort().join(","),
  (val, oldVal) => {
    if (val === oldVal) return;
    nextTick(initSortable);
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

.image-form-item :deep(.el-form-item__label) {
  float: none;
  display: block;
  width: auto;
  text-align: left;
  padding-bottom: 4px;
}

.image-form-item :deep(.el-form-item__content) {
  margin-left: 0 !important;
  width: 100%;
}

.image-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.image-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.image-group {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 4px;
  width: 200px;
  padding: 4px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  min-height: 60px;
}

.image-checkbox {
  margin-right: 0;
  width: 200px;
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
  width: calc(100% + 50px);
}

.image-empty {
  color: #909399;
  font-size: 13px;
}
</style>
