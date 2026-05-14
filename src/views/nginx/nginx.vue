<script setup lang="ts">
import { ref, computed } from "vue";
import FileManagement from "@/views/ops/file/file.vue";
import { checkConfigApi, saveAndReloadConfigApi, stopNginx } from "@/api/nginx";
import { listAgentConfigs } from "@/api/monitor/agent";
import { AgentConfig } from "@/api/monitor/agent/types";

defineOptions({
  name: "NginxFileManagement",
  inheritAttrs: false,
});

const fileManagementRef = ref<InstanceType<typeof FileManagement>>();
const agentList = ref<AgentConfig[]>([]);
const selectedAgentId = ref<number>();
const selectedNginxPath = ref<string>("/usr/local/nginx");
const loading = ref(false);

/** 加载Agent列表 */
function loadAgentList() {
  listAgentConfigs({ isNginx: 1 }).then(({ data }) => {
    if (data) {
      agentList.value = data || [];
      // 默认选择第一个agent
      if (agentList.value.length > 0) {
        handleAgentChange(agentList.value[0].id!);
      }
    }
  });
}

/** Agent切换处理 */
function handleAgentChange(agentId: number) {
  selectedAgentId.value = agentId;

  // 查找选中的agent
  const selectedAgent = agentList.value.find((agent) => agent.id === agentId);

  if (selectedAgent && selectedAgent.nginxPath) {
    // 如果agent有nginxPath配置，则使用该路径
    selectedNginxPath.value = selectedAgent.nginxPath;
  } else {
    // 否则使用默认路径
    selectedNginxPath.value = "/usr/local/nginx";
  }
}

/** 验证配置 */
function checkConfig() {
  if (!fileManagementRef.value) return;

  loading.value = true;
  const content = fileManagementRef.value.getCommanContent();

  if (!content) {
    ElMessage.warning("配置内容为空");
    loading.value = false;
    return;
  }

  const queryParams = {
    ...fileManagementRef.value.queryParams,
    conf: content,
  };

  checkConfigApi(queryParams)
    .then(() => {
      ElMessage.success("校验通过");
    })
    .finally(() => {
      loading.value = false;
    });
}

/** 保存并重新加载配置 */
function saveAndReloadConfig() {
  if (!fileManagementRef.value) return;

  loading.value = true;
  const content = fileManagementRef.value.getCommanContent();

  if (!content) {
    ElMessage.warning("配置内容为空");
    loading.value = false;
    return;
  }

  const queryParams = {
    ...fileManagementRef.value.queryParams,
    conf: content,
  };

  saveAndReloadConfigApi(queryParams)
    .then(() => {
      ElMessage.success("加载成功");
    })
    .finally(() => {
      loading.value = false;
    });
}

/** 停止Nginx */
function clickStopNginx() {
  if (!fileManagementRef.value) return;

  stopNginx(fileManagementRef.value.queryParams).then(() => {
    ElMessage.success("停止成功");
  });
}

onMounted(() => {
  loadAgentList();
});
</script>

<template>
  <div class="app-container">
    <!-- Agent选择器 -->
    <div class="mb-2" style="margin-bottom: 16px">
      <el-form :inline="true">
        <el-form-item label="Agent">
          <el-select
            v-model="selectedAgentId"
            placeholder="请选择Agent"
            clearable
            filterable
            style="width: 300px"
            @change="handleAgentChange"
          >
            <el-option
              v-for="agent in agentList"
              :key="agent.id"
              :label="`${agent.serviceName} - ${
                agent.hostname || `Agent-${agent.id}`
              }`"
              :value="agent.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <!-- 文件管理组件 -->
    <FileManagement
      v-if="selectedAgentId"
      ref="fileManagementRef"
      :agent-id="selectedAgentId"
      :file-path="selectedNginxPath"
      @check-config="checkConfig"
      @save-reload="saveAndReloadConfig"
      @stop-nginx="clickStopNginx"
    >
      <!-- 自定义对话框头部按钮 -->
      <template #dialog-header="{ getContent }">
        <div class="dialog-footer">
          <el-button type="primary" @click="checkConfig"> 检验配置</el-button>
          <el-button @click="saveAndReloadConfig">保存并热加载</el-button>
          <el-button @click="clickStopNginx"> 停止Nginx</el-button>
        </div>
      </template>
    </FileManagement>

    <el-empty v-else description="请先选择Agent" />
  </div>
</template>
