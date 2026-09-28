<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑接口检测任务' : '新增接口检测任务'"
    width="1000px"
    top="0"
    class="api-check-dialog"
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

          <!-- 接口配置 -->
          <el-tab-pane name="content">
            <template #label>
              <el-icon class="tab-icon">
                <Promotion />
              </el-icon>
              接口配置
            </template>

            <ServiceSelect
              v-model="formData.serviceId"
              @change="handleServiceChange"
            />

            <el-form-item label="请求方法">
              <el-select v-model="apiConfig.method" style="width: 140px">
                <el-option label="GET" value="GET" />
                <el-option label="POST" value="POST" />
                <el-option label="PUT" value="PUT" />
                <el-option label="DELETE" value="DELETE" />
                <el-option label="HEAD" value="HEAD" />
                <el-option label="PATCH" value="PATCH" />
              </el-select>
            </el-form-item>

            <el-form-item label="检测地址">
              <el-input
                v-model="apiConfig.url"
                placeholder="请输入接口地址，例如：https://api.example.com/health"
                clearable
              />
            </el-form-item>

            <el-form-item label="Content-Type">
              <el-select
                v-model="apiConfig.contentType"
                placeholder="请选择或输入 Content-Type"
                filterable
                allow-create
                clearable
                default-first-option
                style="width: 100%"
              >
                <el-option
                  v-for="item in contentTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
              <div class="tip">
                选择后可继续在下方请求头中添加其它自定义字段
              </div>
            </el-form-item>

            <el-form-item label="其他请求头">
              <el-input
                v-model="apiConfig.headers"
                type="textarea"
                :rows="3"
                placeholder='请输入 JSON 格式（不含 Content-Type），例如：{"Authorization":"Bearer xxx"}'
              />
            </el-form-item>

            <el-form-item
              v-if="showBodyField"
              label="请求体 (Body)"
            >
              <el-input
                v-model="apiConfig.body"
                type="textarea"
                :rows="4"
                placeholder="请输入请求体 JSON 字符串"
              />
            </el-form-item>

            <el-form-item label="超时时间">
              <el-input-number
                v-model="apiConfig.timeout"
                :min="100"
                :max="60000"
                :step="500"
                style="width: 200px"
              />
              <span class="unit">毫秒</span>
            </el-form-item>

            <el-divider content-position="left">断言配置（检测成功的条件）</el-divider>

            <el-form-item label="断言方式">
              <el-radio-group v-model="apiConfig.assertType">
                <el-radio value="status">仅状态码</el-radio>
                <el-radio value="body">响应包含</el-radio>
                <el-radio value="json">JSON 字段</el-radio>
                <el-radio value="none">不校验</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="apiConfig.assertType === 'status'" label="期望状态码">
              <el-input-number
                v-model="expectStatus"
                :min="100"
                :max="599"
                :step="1"
                style="width: 200px"
                placeholder="如：200"
              />
              <div class="tip">HTTP 响应状态码，默认 200 表示成功</div>
            </el-form-item>

            <el-form-item
              v-if="apiConfig.assertType === 'body'"
              label="包含字符串"
            >
              <el-input
                v-model="apiConfig.expectValue"
                placeholder="响应内容中包含的关键字"
              />
              <div class="tip">响应内容为文本/HTML 时使用</div>
            </el-form-item>

            <el-form-item
              v-if="apiConfig.assertType === 'json'"
              label="JSON 字段断言"
            >
              <el-input
                v-model="apiConfig.expectValue"
                placeholder='格式：{"code":0} 或 $.code=0'
              />
              <div class="tip">
                支持 JSON 格式（对象需完全匹配）或表达式 $.字段=值
              </div>
            </el-form-item>

            <!-- 工具栏：立即检测 -->
            <el-form-item label=" ">
              <div class="toolbar">
                <el-button
                  type="success"
                  :loading="testing"
                  @click="handleTest"
                >
                  <el-icon>
                    <CaretRight />
                  </el-icon>
                  立即检测
                </el-button>
                <span class="toolbar-tip">
                  立即检测不会保存任务，仅校验当前接口配置是否可用
                </span>
              </div>
            </el-form-item>

            <!-- 检测结果 -->
            <el-form-item v-if="testResult.visible" label="检测结果">
              <div class="result-area">
                <div class="result-header">
                  <el-tag :type="testResult.success ? 'success' : 'danger'" size="small">
                    {{ testResult.success ? "成功" : "失败" }}
                  </el-tag>
                  <span class="result-status">
                    HTTP {{ testResult.status }} · 耗时 {{ testResult.cost }} ms
                  </span>
                </div>
                <div v-if="testResult.message" class="result-message">
                  {{ testResult.message }}
                </div>
                <pre v-if="testResult.body" class="result-output">{{ testResult.body }}</pre>
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
import { CaretRight, InfoFilled, Promotion } from "@element-plus/icons-vue";
import {
  getTaskAlertById,
  saveTaskAlert,
} from "@/api/ops/taskAlert";
import { testApi } from "@/api/heath";
import { HeathMonitor } from "@/api/heath/types";
import {
  ApiConfig,
  TaskAlert,
  TASK_TYPE_API,
} from "@/api/ops/taskAlert/types";
import { ServiceInfo } from "@/api/monitor/service/types";
import ServiceSelect from "./serviceSelect.vue";
import CommonForm from "./commonForm.vue";

defineOptions({
  name: "TaskAlertApiCheck",
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
/** 当前激活的标签页：base-基本信息 content-接口配置 */
const activeTab = ref("base");

const formData = reactive<TaskAlert>({
  taskType: TASK_TYPE_API,
  isEnabled: true,
  status: 1,
  failThreshold: 1,
} as TaskAlert);

/** 接口检测配置（提交时序列化到 taskParams） */
const apiConfig = reactive<ApiConfig>({
  method: "GET",
  url: "",
  contentType: "application/json",
  headers: "",
  body: "",
  timeout: 5000,
  assertType: "status",
  expectValue: "",
});

/** 常用 Content-Type 选项（allow-create 允许自定义输入） */
const contentTypeOptions = [
  { label: "application/json", value: "application/json" },
  { label: "application/json;charset=UTF-8", value: "application/json;charset=UTF-8" },
  { label: "application/x-www-form-urlencoded", value: "application/x-www-form-urlencoded" },
  { label: "application/x-www-form-urlencoded;charset=UTF-8", value: "application/x-www-form-urlencoded;charset=UTF-8" },
  { label: "multipart/form-data", value: "multipart/form-data" },
  { label: "text/plain", value: "text/plain" },
  { label: "text/plain;charset=UTF-8", value: "text/plain;charset=UTF-8" },
  { label: "text/html", value: "text/html" },
  { label: "text/html;charset=UTF-8", value: "text/html;charset=UTF-8" },
  { label: "text/xml", value: "text/xml" },
  { label: "application/xml", value: "application/xml" },
  { label: "application/octet-stream", value: "application/octet-stream" },
];

/** 期望状态码（独立绑定，输入框使用 number） */
const expectStatus = ref<number>(200);

const rules = reactive({
  taskName: [{ required: true, message: "请输入任务名称", trigger: "blur" }],
  serviceId: [{ required: true, message: "请选择服务", trigger: "change" }],
  cron: [{ required: true, message: "请输入cron表达式", trigger: "blur" }],
});

/** 是否展示请求体输入框（GET / HEAD 不展示） */
const showBodyField = computed(() => {
  const m = (apiConfig.method || "GET").toUpperCase();
  return m !== "GET" && m !== "HEAD";
});

const testing = ref(false);
const testResult = reactive({
  visible: false,
  success: false,
  status: 0,
  cost: 0,
  message: "",
  body: "",
});

/** 重置表单 */
function resetForm() {
  Object.keys(formData).forEach((key) => {
    (formData as any)[key] = undefined;
  });
  formData.taskType = TASK_TYPE_API;
  formData.isEnabled = true;
  formData.status = 1;
  formData.failThreshold = 1;
  apiConfig.method = "GET";
  apiConfig.url = "";
  apiConfig.contentType = "application/json";
  apiConfig.headers = "";
  apiConfig.body = "";
  apiConfig.timeout = 5000;
  apiConfig.assertType = "status";
  apiConfig.expectValue = "";
  expectStatus.value = 200;
  testResult.visible = false;
  testResult.success = false;
  testResult.status = 0;
  testResult.cost = 0;
  testResult.message = "";
  testResult.body = "";
  isEdit.value = false;
  activeTab.value = "base";
}

/** 立即检测（不保存任务，仅测试当前配置，对接后端接口健康监控 testApi） */
async function handleTest() {
  if (!apiConfig.url) {
    ElMessage.warning("请输入检测地址");
    activeTab.value = "content";
    return;
  }
  if (!/^https?:\/\//i.test(apiConfig.url)) {
    ElMessage.warning("检测地址必须以 http:// 或 https:// 开头");
    activeTab.value = "content";
    return;
  }
  const method = (apiConfig.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "POST") {
    ElMessage.warning("接口健康监控仅支持 GET / POST 请求方式");
    activeTab.value = "content";
    return;
  }
  testing.value = true;
  testResult.visible = false;
  // 超时时间单位：毫秒（与后端 timeoutWarnTime 字段保持一致）
  const timeoutMs = Math.max(100, Number(apiConfig.timeout) || 5000);
  try {
    // 构造后端 ApiHeathMonitor 实体
    const payload: HeathMonitor = {
      apiName: formData.taskName || apiConfig.url,
      apiUrl: apiConfig.url,
      requestMethod: method,
      contentType: apiConfig.contentType || "",
      param: method === "POST" ? apiConfig.body || "" : "",
      isMonitor: false,
      timeoutWarnTime: timeoutMs,
      assertType: apiConfig.assertType || "none",
      // 状态码断言时，将期望值写入 expectValue 字段统一存储
      expectValue:
        apiConfig.assertType === "status"
          ? String(expectStatus.value)
          : apiConfig.expectValue || "",
    };
    const { data } = await testApi(payload);
    // 后端默认 status=500 表示异常
    const status = data?.heathStatus ?? 0;
    const costMs = data?.responseTime ?? 0;
    const bodyText = data?.body || "";
    // 后端已根据断言判断是否成功：heathStatus === 200 即视为通过
    const ok = status === 200;
    testResult.visible = true;
    testResult.success = ok;
    testResult.status = status;
    testResult.cost = costMs;
    // 后端已根据断言判断结果，前端直接展示状态码
    testResult.message = ok ? "检测通过" : `检测失败（HTTP ${status}）`;
    testResult.body = bodyText.length > 2000 ? bodyText.substring(0, 2000) + "..." : bodyText;
  } catch (e: any) {
    testResult.visible = true;
    testResult.success = false;
    testResult.status = 0;
    testResult.cost = 0;
    testResult.message = `检测失败：${e?.message || e}`;
    testResult.body = "";
  } finally {
    testing.value = false;
  }
}

/** 从 taskParams 解析接口配置 */
function parseApiConfig(taskParams?: string) {
  if (!taskParams) return;
  try {
    const obj = JSON.parse(taskParams);
    if (obj.method) apiConfig.method = obj.method;
    if (obj.url !== undefined) apiConfig.url = obj.url;
    if (obj.contentType !== undefined && obj.contentType !== null) {
      apiConfig.contentType = obj.contentType;
    } else {
      // 兼容旧格式：从 headers 中提取 Content-Type
      try {
        const headersObj = obj.headers ? JSON.parse(obj.headers) : {};
        if (headersObj?.["Content-Type"]) {
          apiConfig.contentType = headersObj["Content-Type"];
          // 从自定义 headers 中移除 Content-Type，避免重复
          delete headersObj["Content-Type"];
          obj.headers = JSON.stringify(headersObj);
        }
      } catch {
        /* 解析失败忽略 */
      }
    }
    if (obj.headers !== undefined) apiConfig.headers = obj.headers;
    if (obj.body !== undefined) apiConfig.body = obj.body;
    if (obj.timeout !== undefined && obj.timeout !== null) {
      apiConfig.timeout = obj.timeout;
    }
    if (obj.assertType !== undefined && obj.assertType !== null) {
      apiConfig.assertType = obj.assertType;
    }
    if (obj.expectValue !== undefined) {
      apiConfig.expectValue = obj.expectValue;
    }
    // 兼容旧格式：期望状态码与 expectValue 合并存储
    if (apiConfig.assertType === "status" && apiConfig.expectValue) {
      const num = Number(apiConfig.expectValue);
      if (!Number.isNaN(num)) {
        expectStatus.value = num;
      }
    }
  } catch {
    /* 解析失败忽略 */
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
        parseApiConfig(data.taskParams);
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

/** 选择服务变化：同步服务名称 */
function handleServiceChange(service?: ServiceInfo) {
  formData.serviceName = service?.name;
}

/** 提交表单 */
function handleSubmit() {
  formRef.value.validate(
    (valid: boolean, invalidFields?: Record<string, any>) => {
      if (!valid) {
        const baseFields = ["taskName", "serviceId", "cron", "taskType"];
        const errorFields = Object.keys(invalidFields || {});
        activeTab.value = errorFields.some((f) => baseFields.includes(f))
          ? "base"
          : "content";
        ElMessage.warning("请检查表单必填项");
        return;
      }
      // 接口配置校验（apiConfig 字段不在 formData 中，需手动校验）
      if (!apiConfig.url || !apiConfig.url.trim()) {
        activeTab.value = "content";
        ElMessage.warning("请输入检测地址");
        return;
      }
      if (!/^https?:\/\//i.test(apiConfig.url.trim())) {
        activeTab.value = "content";
        ElMessage.warning("检测地址必须以 http:// 或 https:// 开头");
        return;
      }
      submitLoading.value = true;

      // 序列化接口配置到 taskParams
      const taskParamsConfig: ApiConfig = {
        method: apiConfig.method,
        url: apiConfig.url,
        contentType: apiConfig.contentType || "",
        headers: apiConfig.headers || "",
        body: apiConfig.body || "",
        timeout: apiConfig.timeout,
        assertType: apiConfig.assertType,
        // 状态码断言时，将期望值写入 expectValue 字段统一存储
        expectValue:
          apiConfig.assertType === "status"
            ? String(expectStatus.value)
            : apiConfig.expectValue || "",
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
    }
  );
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
      parseApiConfig(props.editData.taskParams);
    }
  }
);
</script>

<style scoped>
.api-check-dialog {
  height: 100vh;
  margin: 0;
}

.api-check-dialog :deep(.el-dialog__body) {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.tab-icon {
  margin-right: 4px;
  vertical-align: -2px;
}

.unit {
  margin-left: 8px;
  color: #909399;
}

.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.toolbar-tip {
  font-size: 12px;
  color: #909399;
}

.tip {
  width: 100%;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.result-area {
  width: 100%;
}

.result-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.result-status {
  font-size: 13px;
  color: #606266;
}

.result-message {
  padding: 6px 10px;
  margin-bottom: 8px;
  font-size: 13px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.result-output {
  max-height: 240px;
  margin: 0;
  padding: 8px 12px;
  overflow-y: auto;
  font-family: Consolas, "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #d4d4d4;
  word-break: break-all;
  white-space: pre-wrap;
  background: #1e1e1e;
  border-radius: 4px;
}
</style>