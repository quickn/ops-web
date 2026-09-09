<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
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

/** 同步类型（3 = 仅从跳板机内网同步） */
const syncType = ref<number>();

/** 当前选中 agent 的 serviceId */
const currentServiceId = computed(() => {
  return agentList.value.find((a) => a.id === selectedAgentId.value)?.serviceId;
});

/** 当前选中 agent 的 serviceName */
const currentServiceName = computed(() => {
  return agentList.value.find((a) => a.id === selectedAgentId.value)
    ?.serviceName;
});

/** 当前选中 agent 的 hostname */
const currentHostname = computed(() => {
  return agentList.value.find((a) => a.id === selectedAgentId.value)?.hostname;
});

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

  // 从路由参数中获取 agentId、filePath 和 syncType
  const agentId = route.query.agentId ? Number(route.query.agentId) : undefined;
  const filePath = route.query.filePath as string;
  const syncTypeParam = route.query.syncType;

  if (agentId) {
    selectedAgentId.value = agentId;
  }

  if (filePath) {
    selectedFilePath.value = filePath;
  }

  if (syncTypeParam !== undefined && syncTypeParam !== null) {
    syncType.value = Number(syncTypeParam);
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
      :service-id="currentServiceId"
      :service-name="currentServiceName"
      :hostname="currentHostname"
      :sync-type="syncType"
    />

    <el-empty v-else description="请先选择Agent" />
  </div>
</template>
