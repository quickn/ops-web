<template>
  <el-dialog
    v-model="visible"
    :title="title"
    width="700px"
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="120px">
      <el-form-item label="服务名" prop="serviceName">
        <el-input
          v-model="formData.serviceName"
          placeholder="服务名"
          disabled
        />
      </el-form-item>
      <el-form-item label="hostname" prop="hostname">
        <el-input v-model="formData.hostname" placeholder="hostname" disabled />
      </el-form-item>
      <el-form-item label="是否存在Nginx" prop="isNginx">
        <el-radio-group v-model="formData.isNginx">
          <el-radio :label="1">是</el-radio>
          <el-radio :label="0">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="Nginx路径" v-if="formData.isNginx === 1">
        <el-input v-model="formData.nginxPath" placeholder="/usr/local/nginx" />
      </el-form-item>
      <el-form-item label="工作路径" prop="workPath">
        <el-input v-model="formData.workPath" placeholder="/opt/app" />
      </el-form-item>
      <el-form-item label="日志路径" prop="logPath">
        <el-input v-model="formData.logPath" placeholder="/var/log/app" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" @click="handleSave"> 确 定</el-button>
        <el-button @click="handleClose"> 取 消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import {
  getAgentServerConfigForm,
  saveAgentServerConfig,
  updateAgentServerConfig,
} from "@/api/monitor/agent";
import { AgentConfig } from "@/api/monitor/agent/types";

defineOptions({
  name: "ProxyConfigDialog",
});

// ElForm 已通过 unplugin-auto-import 全局注入，无需手动 import
const formRef = ref(ElForm);

const visible = ref(false);
const title = ref("配置代理服务");
const loading = ref(false);

const formData = reactive<AgentConfig>({
  id: undefined,
  isNginx: 0,
  nginxPath: "",
  serviceId: undefined,
  serviceName: "",
  workPath: "",
  logPath: "",
  hostname: "",
});

const rules = reactive({
  workPath: [{ required: true, message: "工作路径不能为空", trigger: "blur" }],
});

/**
 * 打开弹窗
 * @param agentData agent数据
 */
async function open(agentData: {
  id?: number;
  serviceId?: number;
  serviceName?: string;
  hostname?: string;
}) {
  visible.value = true;
  title.value = "配置代理服务";

  // 初始化表单数据
  formData.id = agentData.id || undefined;
  formData.serviceId = agentData.serviceId;
  formData.serviceName = agentData.serviceName || "";
  formData.hostname = agentData.hostname || "";
  formData.isNginx = 0;
  formData.nginxPath = "";
  formData.workPath = "";
  formData.logPath = "";

  // 尝试查询是否已有配置
  if (agentData.id) {
    try {
      const { data: config } = await getAgentServerConfigForm(agentData.id);
      if (config) {
        formData.id = config.id;
        formData.isNginx = config.isNginx || 0;
        formData.nginxPath = config.nginxPath || "";
        formData.serviceId = config.serviceId;
        formData.serviceName = config.serviceName || "";
        formData.workPath = config.workPath || "";
        formData.logPath = config.logPath || "";
        title.value = "编辑代理服务配置";
      }
    } catch (error) {
      console.error("查询代理配置失败:", error);
    }
  }
}

/**
 * 关闭弹窗
 */
function handleClose() {
  visible.value = false;
}

/**
 * 弹窗关闭后回调
 */
function handleClosed() {
  formRef.value?.resetFields();
  formRef.value?.clearValidate();
}

/**
 * 保存配置
 */
function handleSave() {
  formRef.value?.validate((valid: boolean) => {
    if (valid) {
      if (!formData.serviceName) {
        ElMessage.warning("请填写服务名");
        return;
      }

      loading.value = true;
      const savePromise = formData.id
        ? updateAgentServerConfig(formData)
        : saveAgentServerConfig(formData);

      savePromise
        .then(() => {
          ElMessage.success(formData.id ? "更新成功" : "新增成功");
          visible.value = false;
          emit("success");
        })
        .catch(() => {
          ElMessage.error(formData.id ? "更新失败" : "新增失败");
        })
        .finally(() => {
          loading.value = false;
        });
    }
  });
}

const emit = defineEmits<{
  success: [];
}>();

defineExpose({
  open,
});
</script>
