<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import FileManagement from "@/views/ops/file/file.vue";
import { checkConfigApi, saveAndReloadConfigApi, stopNginx } from "@/api/nginx";

defineOptions({
  name: "NginxFileManagement",
  inheritAttrs: false,
});

const fileManagementRef = ref<InstanceType<typeof FileManagement>>();
const selectedAgentId = ref<number>();
const selectedFilePath = ref<string>("/usr/local/nginx");
const loading = ref(false);
const route = useRoute();

/** 验证配置 */
function checkConfig() {
  if (!fileManagementRef.value) return;

  loading.value = true;
  const fileContent = fileManagementRef.value.getCommanContent();

  if (!fileContent) {
    ElMessage.warning("配置内容为空");
    loading.value = false;
    return;
  }

  const queryParams = {
    ...fileManagementRef.value.queryParams,
    fileContent: fileContent,
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
  const fileContent = fileManagementRef.value.getCommanContent();

  if (!fileContent) {
    ElMessage.warning("配置内容为空");
    loading.value = false;
    return;
  }

  const queryParams = {
    ...fileManagementRef.value.queryParams,
    fileContent: fileContent,
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
  const agentId = route.query.agentId ? Number(route.query.agentId) : undefined;
  const filePath = route.query.filePath as string;
  if (agentId) {
    selectedAgentId.value = agentId;
  }
  if (filePath) {
    selectedFilePath.value = filePath;
  }
});
</script>

<template>
  <div class="app-container">
    <!-- 文件管理组件 -->
    <FileManagement
      v-if="selectedAgentId"
      ref="fileManagementRef"
      :agent-id="selectedAgentId"
      :file-path="selectedFilePath"
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
