<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import FileManagement from "@/views/ops/file/file.vue";
import { listAgentConfigs } from "@/api/monitor/agent";
import { AgentConfig } from "@/api/monitor/agent/types";

defineOptions({
  name: "OpsFileManagement",
  inheritAttrs: false,
});

const route = useRoute();
const fileManagementRef = ref<InstanceType<typeof FileManagement>>();
const agentList = ref<AgentConfig[]>([]);
const selectedAgentId = ref<number>();
const selectedFilePath = ref<string>("/usr/local/nginx");
const loading = ref(false);

/** 加载Agent列表 */
function loadAgentList() {
  listAgentConfigs().then(({ data }) => {
    if (data) {
      agentList.value = data || [];
    }
  });
}

/** Agent切换处理 */
function handleAgentChange(agentId: number) {
  selectedAgentId.value = agentId;

  // 查找选中的agent
  const selectedAgent = agentList.value.find((agent) => agent.id === agentId);

  if (selectedAgent && selectedAgent.workPath) {
    // 如果agent有workPath配置，则使用该路径
    selectedFilePath.value = selectedAgent.workPath;
  } else {
    // 否则使用默认路径
    selectedFilePath.value = "/usr/local/nginx";
  }
}

onMounted(() => {
  loadAgentList();

  // 从路由参数中获取 agentId 和 filePath
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
    />

    <el-empty v-else description="请先选择Agent" />
  </div>
</template>
