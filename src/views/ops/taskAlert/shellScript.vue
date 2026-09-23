<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑Shell脚本任务' : '新增Shell脚本任务'"
    width="1200px"
    top="0"
    class="shell-edit-dialog"
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

          <!-- 脚本内容 -->
          <el-tab-pane name="content">
            <template #label>
              <el-icon class="tab-icon">
                <Promotion />
              </el-icon>
              脚本内容
            </template>

            <ServiceSelect
              v-model="formData.serviceId"
              @change="handleServiceChange"
            />

            <el-form-item label="执行主机">
              <div v-if="agentLoading" v-loading="true" class="agent-loading" />
              <template v-else-if="agentList.length > 0">
                <div class="agent-list-header">
                  <el-checkbox
                    :model-value="isAllChecked"
                    :indeterminate="isIndeterminate"
                    @change="handleCheckAll"
                  >
                    全选
                  </el-checkbox>
                  <span class="agent-count">
                    {{ checkedAgentIds.length }}/{{ agentList.length }}
                  </span>
                </div>
                <el-checkbox-group v-model="checkedAgentIds" class="agent-group">
                  <el-checkbox
                    v-for="agent in agentList"
                    :key="agent.id"
                    :label="agent.id"
                    class="agent-checkbox"
                  >
                    <span class="agent-name" :title="agent.hostname">
                      {{ agent.hostname }}
                    </span>
                  </el-checkbox>
                </el-checkbox-group>
              </template>
              <div v-else class="agent-empty">
                {{ formData.serviceId ? "该服务下暂无主机" : "请先选择服务" }}
              </div>
            </el-form-item>

            <el-form-item label="脚本内容">
              <div class="editor-toolbar">
                <el-select
                  v-model="selectedCmdId"
                  placeholder="从指令库选择"
                  filterable
                  clearable
                  size="small"
                  style="width: 220px"
                  @change="handleCmdLibChange"
                >
                  <el-option
                    v-for="item in shellCmdList"
                    :key="item.id"
                    :label="item.cmdName"
                    :value="item.id"
                  />
                </el-select>
                <el-button
                  type="success"
                  size="small"
                  :loading="executing"
                  :disabled="checkedAgentIds.length === 0"
                  @click="handleExecute"
                >
                  <el-icon>
                    <CaretRight />
                  </el-icon>
                  立即执行
                </el-button>
                <span class="toolbar-tip">
                  立即执行不会保存任务，仅对勾选主机执行当前脚本
                </span>
              </div>
              <div ref="editorRef" class="code-editor" />
            </el-form-item>

            <!-- 执行结果 -->
            <el-form-item v-if="results.length > 0" label="执行结果">
              <div class="result-area">
                <div class="result-header">
                  执行结果（{{ successCount }}/{{ results.length }} 成功）
                </div>
                <div
                  v-for="r in results"
                  :key="r.agentId"
                  class="result-item"
                >
                  <div class="result-item-header">
                    <el-tag :type="statusTagType(r.status)" size="small">
                      {{ statusText(r.status) }}
                    </el-tag>
                    <span class="result-hostname">{{ r.hostname }}</span>
                    <el-button
                      v-if="r.output"
                      link
                      type="primary"
                      size="small"
                      @click="handleCopy(r.output)"
                    >
                      <el-icon>
                        <DocumentCopy />
                      </el-icon>
                      复制
                    </el-button>
                  </div>
                  <pre v-if="r.output" class="result-output">{{ r.output }}</pre>
                </div>
              </div>
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
  CaretRight,
  DocumentCopy,
  InfoFilled,
  Promotion,
} from "@element-plus/icons-vue";
import { basicSetup, EditorView } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import {
  getTaskAlertById,
  saveTaskAlert,
} from "@/api/ops/taskAlert";
import {
  ShellConfig,
  TaskAlert,
  TASK_TYPE_SHELL,
} from "@/api/ops/taskAlert/types";
import { originServerList, sendCmd } from "@/api/monitor/agent";
import { Agent } from "@/api/monitor/agent/types";
import { ServiceInfo } from "@/api/monitor/service/types";
import { listCmdLib } from "@/api/ops/cmdlib";
import { CmdLib } from "@/api/ops/cmdlib/types";
import ServiceSelect from "./serviceSelect.vue";
import CommonForm from "./commonForm.vue";

defineOptions({
  name: "TaskAlertShellScript",
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

/** 单台主机执行结果 */
interface ExecResult {
  agentId: number;
  hostname: string;
  status: "pending" | "running" | "success" | "fail";
  output: string;
}

const formRef = ref(ElForm);
const pageLoading = ref(false);
const submitLoading = ref(false);
const isEdit = ref(false);
/** 当前激活的标签页：base-基本信息 content-脚本内容 */
const activeTab = ref("base");

const agentList = ref<Agent[]>([]);
const agentLoading = ref(false);
const checkedAgentIds = ref<number[]>([]);

const editorRef = ref<HTMLDivElement>();
let editor: EditorView | null = null;
const scriptContent = ref("");

/** 指令库快捷选择 */
const selectedCmdId = ref<number>();
const shellCmdList = ref<CmdLib[]>([]);

const executing = ref(false);
const results = ref<ExecResult[]>([]);

const formData = reactive<TaskAlert>({
  taskType: TASK_TYPE_SHELL,
  isEnabled: true,
  status: 1,
  failThreshold: 1,
} as TaskAlert);

const rules = reactive({
  taskName: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
  serviceId: [{ required: true, message: "请选择服务", trigger: "change" }],
  cron: [{ required: true, message: "请输入cron表达式", trigger: "blur" }],
});

/** 是否全部勾选 */
const isAllChecked = computed(
  () =>
    agentList.value.length > 0 &&
    checkedAgentIds.value.length === agentList.value.length
);

/** 是否部分勾选 */
const isIndeterminate = computed(
  () =>
    checkedAgentIds.value.length > 0 &&
    checkedAgentIds.value.length < agentList.value.length
);

/** 成功数量 */
const successCount = computed(
  () => results.value.filter((r) => r.status === "success").length
);

/** 重置表单 */
function resetForm() {
  Object.keys(formData).forEach((key) => {
    (formData as any)[key] = undefined;
  });
  formData.taskType = TASK_TYPE_SHELL;
  formData.isEnabled = true;
  formData.status = 1;
  formData.failThreshold = 1;
  agentList.value = [];
  checkedAgentIds.value = [];
  scriptContent.value = "";
  results.value = [];
  selectedCmdId.value = undefined;
  isEdit.value = false;
  activeTab.value = "base";
}

/** 加载服务下的主机列表（taskParams 用于编辑回显勾选与脚本） */
function loadAgents(serviceId?: number, taskParams?: string, agentId?: number) {
  agentList.value = [];
  checkedAgentIds.value = [];
  if (!serviceId) {
    return;
  }
  agentLoading.value = true;
  originServerList({ serviceId, pageNum: 1, pageSize: 15000 } as any)
    .then(({ data }) => {
      const list = Array.isArray(data) ? data : data?.records || [];
      agentList.value = list;
      if (taskParams !== undefined || agentId) {
        parseShellConfig(taskParams, agentId);
      }
    })
    .finally(() => {
      agentLoading.value = false;
    });
}

/** 选择服务变化：同步服务名称并加载主机列表 */
function handleServiceChange(service?: ServiceInfo) {
  formData.serviceName = service?.name;
  loadAgents(service?.id);
}

/** 全选/取消全选 */
function handleCheckAll(val: boolean) {
  checkedAgentIds.value = val ? agentList.value.map((a) => a.id!) : [];
}

/** 加载指令库中的 shell 指令 */
function loadCmdLib() {
  listCmdLib().then(({ data }) => {
    shellCmdList.value = (data || []).filter((item) => item.type === "shell");
  });
}

/** 从指令库选择脚本填充编辑器 */
function handleCmdLibChange(val?: number) {
  if (!val) {
    return;
  }
  const item = shellCmdList.value.find((c) => c.id === val);
  if (item?.cmd) {
    setEditorContent(item.cmd);
  }
}

/** 从 taskParams 解析脚本配置（兼容旧格式：纯文本脚本 + 单主机） */
function parseShellConfig(taskParams?: string, agentId?: number) {
  checkedAgentIds.value = [];
  scriptContent.value = "";
  if (!taskParams) {
    if (agentId) {
      checkedAgentIds.value = [agentId];
    }
    return;
  }
  const trimmed = taskParams.trim();
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed);
      scriptContent.value = obj?.script || "";
      checkedAgentIds.value = Array.isArray(obj?.agentIds) ? obj.agentIds : [];
      return;
    } catch {
      // 解析失败按纯文本脚本处理
    }
  }
  // 兼容旧格式：taskParams 为纯脚本文本，主机取关联主机
  scriptContent.value = taskParams;
  if (agentId) {
    checkedAgentIds.value = [agentId];
  }
}

/** 初始化脚本编辑器（shell 语法高亮） */
function initEditor() {
  if (!editorRef.value || editor) {
    return;
  }
  editor = new EditorView({
    doc: scriptContent.value,
    extensions: [
      basicSetup,
      StreamLanguage.define(shell),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          scriptContent.value = update.state.doc.toString();
        }
      }),
    ],
    parent: editorRef.value,
  });
}

/** 设置编辑器内容 */
function setEditorContent(text: string) {
  if (!editor) {
    scriptContent.value = text;
    return;
  }
  if (editor.state.doc.toString() === text) {
    return;
  }
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: text },
  });
}

/** 销毁编辑器 */
function destroyEditor() {
  if (editor) {
    editor.destroy();
    editor = null;
  }
}

/** 立即执行：对勾选主机依次执行当前脚本（不保存任务） */
async function handleExecute() {
  if (!scriptContent.value.trim()) {
    ElMessage.warning("请输入脚本内容");
    return;
  }
  if (checkedAgentIds.value.length === 0) {
    ElMessage.warning("请勾选至少一台执行主机");
    return;
  }
  executing.value = true;
  const script = scriptContent.value.trim();
  results.value = agentList.value
    .filter((a) => checkedAgentIds.value.includes(a.id!))
    .map((a) => ({
      agentId: a.id!,
      hostname: a.hostname || `agent-${a.id}`,
      status: "pending" as const,
      output: "",
    }));

  for (const r of results.value) {
    r.status = "running";
    try {
      const { data } = await sendCmd(r.agentId, script, 10);
      r.output =
        typeof data === "string"
          ? data
          : JSON.stringify((data as any)?.data ?? data, null, 2);
      r.status = "success";
    } catch (e: any) {
      r.output = `执行失败: ${e?.message || e}`;
      r.status = "fail";
    }
  }
  executing.value = false;
  const failCount = results.value.filter((r) => r.status === "fail").length;
  if (failCount > 0) {
    ElMessage.warning(`执行完成，${failCount} 台主机执行失败`);
  } else {
    ElMessage.success("全部执行成功");
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
        loadAgents(data.serviceId, data.taskParams, data.agentId);
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
  formRef.value.validate(
    (valid: boolean, invalidFields?: Record<string, any>) => {
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
      if (checkedAgentIds.value.length === 0) {
        activeTab.value = "content";
        ElMessage.warning("请勾选至少一台执行主机");
        return;
      }
      if (!scriptContent.value.trim()) {
        activeTab.value = "content";
        ElMessage.warning("请输入脚本内容");
        return;
      }
      submitLoading.value = true;

      // 将脚本配置序列化为 taskParams（关联主机取第一台，兼容旧逻辑）
      const shellConfig: ShellConfig = {
        agentIds: checkedAgentIds.value,
        script: scriptContent.value,
      };
      const payload: TaskAlert = {
        ...formData,
        agentId: checkedAgentIds.value[0],
        taskParams: JSON.stringify(shellConfig),
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
    }
  );
}

/** 状态标签类型 */
function statusTagType(status: ExecResult["status"]) {
  const map = {
    pending: "info",
    running: "warning",
    success: "success",
    fail: "danger",
  } as const;
  return map[status];
}

/** 状态文本 */
function statusText(status: ExecResult["status"]) {
  const map = {
    pending: "等待",
    running: "执行中",
    success: "成功",
    fail: "失败",
  } as const;
  return map[status];
}

/** 复制结果 */
function handleCopy(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      ElMessage.success("已复制到剪贴板");
    })
    .catch(() => {
      ElMessage.error("复制失败");
    });
}

/** 弹窗关闭后重置 */
function handleClosed() {
  resetForm();
  destroyEditor();
}

// 切换到脚本内容标签页时初始化编辑器并重新测量
watch(activeTab, (val) => {
  if (val === "content") {
    nextTick(() => {
      initEditor();
      editor?.requestMeasure();
    });
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
      loadAgents(
        props.editData.serviceId,
        props.editData.taskParams,
        props.editData.agentId
      );
    }
  }
);

onMounted(() => {
  loadCmdLib();
});

onUnmounted(() => {
  destroyEditor();
});
</script>

<style scoped>
.shell-edit-dialog {
  height: 100vh;
  margin: 0;
}

.shell-edit-dialog :deep(.el-dialog__body) {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.tab-icon {
  margin-right: 4px;
  vertical-align: -2px;
}

.agent-loading {
  width: 100%;
  height: 80px;
}

.agent-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 6px;
  padding: 4px 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.agent-count {
  font-size: 12px;
  color: #909399;
}

.agent-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px 12px;
  width: 100%;
  max-height: 150px;
  padding: 4px 8px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.agent-checkbox {
  width: 100%;
  height: auto;
  margin-right: 0;
}

.agent-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-empty {
  width: 100%;
  padding: 12px 0;
  font-size: 13px;
  color: #909399;
  text-align: center;
}

.editor-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  margin-bottom: 8px;
}

.toolbar-tip {
  font-size: 12px;
  color: #909399;
}

.code-editor {
  width: 100%;
  height: calc(100vh - 580px);
  min-height: 240px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.code-editor :deep(.cm-editor) {
  height: 100%;
}

.code-editor :deep(.cm-scroller) {
  font-family: Consolas, "Courier New", monospace;
}

.result-area {
  width: 100%;
}

.result-header {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.result-item {
  margin-bottom: 8px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.result-item-header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 4px 10px;
  background-color: #f5f7fa;
  border-radius: 4px 4px 0 0;
}

.result-hostname {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.result-output {
  max-height: 200px;
  margin: 0;
  padding: 8px 12px;
  overflow-y: auto;
  font-family: Consolas, "Courier New", monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  word-break: break-all;
  white-space: pre-wrap;
  background: #1e1e1e;
  border-radius: 0 0 4px 4px;
}
</style>
