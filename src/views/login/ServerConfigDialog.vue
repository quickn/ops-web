<template>
  <el-dialog
    v-model="visible"
    title="后端服务地址配置"
    width="580px"
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      label-width="140px"
      label-position="right"
    >
      <el-form-item
        label="Java 后端地址"
        prop="targetUrl"
        :rules="[
          { required: true, message: '请输入 Java 后端地址', trigger: 'blur' },
        ]"
      >
        <el-input
          v-model="formData.targetUrl"
          placeholder="例如: http://localhost:8989"
          clearable
        />
        <div class="hint-text">默认值: {{ apiConfig.defaultTargetUrl }}</div>
      </el-form-item>

      <el-form-item
        label="Python 后端地址"
        prop="targetUrlPy"
        :rules="[
          {
            required: true,
            message: '请输入 Python 后端地址',
            trigger: 'blur',
          },
        ]"
      >
        <el-input
          v-model="formData.targetUrlPy"
          placeholder="例如: http://localhost:18080"
          clearable
        />
        <div class="hint-text">默认值: {{ apiConfig.defaultTargetUrlPy }}</div>
      </el-form-item>
    </el-form>

    <div class="config-info">
      <el-alert type="info" :closable="false" show-icon>
        <template #title> 当前生效地址 </template>
        <div class="current-urls">
          <div>
            Java:
            <el-tag type="success" size="small">{{
              currentUrls.targetUrl
            }}</el-tag>
          </div>
          <div>
            Python:
            <el-tag type="success" size="small">{{
              currentUrls.targetUrlPy
            }}</el-tag>
          </div>
        </div>
      </el-alert>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="warning" @click="handleReset">
          <i-ep-refresh />
          重置为默认
        </el-button>
        <div class="flex gap-2">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" @click="handleSave">
            <i-ep-check />
            确定
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import {
  getApiConfig,
  resetApiConfig,
  setTargetUrl,
  setTargetUrlPy,
} from "@/utils/api-config";

defineOptions({
  name: "ServerConfigDialog",
});

interface ApiUrls {
  targetUrl: string;
  targetUrlPy: string;
}

const visible = ref(false);
const formRef = ref(ElForm);

const apiConfig = reactive({
  targetUrl: "",
  targetUrlPy: "",
  defaultTargetUrl: "",
  defaultTargetUrlPy: "",
});

const formData = reactive({
  targetUrl: "",
  targetUrlPy: "",
});

const currentUrls = reactive<ApiUrls>({
  targetUrl: "",
  targetUrlPy: "",
});

/** 初始化配置数据 */
function initConfig() {
  const config = getApiConfig();
  apiConfig.targetUrl = config.targetUrl;
  apiConfig.targetUrlPy = config.targetUrlPy;
  apiConfig.defaultTargetUrl = config.defaultTargetUrl;
  apiConfig.defaultTargetUrlPy = config.defaultTargetUrlPy;
  formData.targetUrl = config.targetUrl;
  formData.targetUrlPy = config.targetUrlPy;
  currentUrls.targetUrl = config.targetUrl;
  currentUrls.targetUrlPy = config.targetUrlPy;
}

/** 打开弹窗 */
function open() {
  initConfig();
  visible.value = true;
}

/** 保存 */
function handleSave() {
  formRef.value?.validate((valid: boolean) => {
    if (valid) {
      setTargetUrl(formData.targetUrl);
      setTargetUrlPy(formData.targetUrlPy);
      currentUrls.targetUrl = formData.targetUrl;
      currentUrls.targetUrlPy = formData.targetUrlPy;
      apiConfig.targetUrl = formData.targetUrl;
      apiConfig.targetUrlPy = formData.targetUrlPy;
      ElMessage.success("后端服务地址配置保存成功，页面刷新后生效");
      handleClose();
    }
  });
}

/** 重置 */
function handleReset() {
  ElMessageBox.confirm("确认重置为默认配置？", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    resetApiConfig();
    initConfig();
    ElMessage.success("已重置为默认配置");
  });
}

/** 关闭 */
function handleClose() {
  visible.value = false;
}

function handleClosed() {
  formRef.value?.resetFields();
}

defineExpose({ open });
</script>

<style scoped lang="scss">
.hint-text {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.config-info {
  margin-top: 16px;

  .current-urls {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 4px;
    font-size: 13px;
    color: #606266;
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
