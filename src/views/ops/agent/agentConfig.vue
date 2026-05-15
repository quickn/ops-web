<template>
  <div class="app-container">
    <div class="search-container">
      <el-form
        ref="queryFormRef"
        :model="queryParams"
        :inline="true"
        @keyup.enter="handleQuery"
      >
        <el-form-item prop="serviceId">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="选择服务"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="isNginx">
          <el-select
            v-model="queryParams.isNginx"
            placeholder="是否存在Nginx"
            clearable
            style="width: 150px"
          >
            <el-option label="是" :value="1" />
            <el-option label="否" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <i-ep-search />
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <i-ep-refresh />
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card shadow="never">
      <el-table
        ref="dataTableRef"
        v-loading="loading"
        :data="dataList"
        highlight-current-row
        border
      >
        <el-table-column label="ID" prop="id" width="90" />
        <el-table-column label="服务名" prop="serviceName" width="120" />
        <el-table-column label="主机名" prop="hostname" width="130" />
        <el-table-column label="是否存在Nginx" prop="isNginx" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.isNginx === 1" type="success">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Nginx路径" prop="nginxPath" width="150" />
        <el-table-column label="工作路径" prop="workPath" width="150" />
        <el-table-column label="日志路径" prop="logPath" width="150" />
        <el-table-column
          fixed="right"
          label="操作"
          width="320"
          style="padding: 0"
        >
          <template #default="scope">
            <el-button
              type="warning"
              link
              size="small"
              @click.stop="openWorkDirectory(scope.row)"
            >
              <i-ep-folder-opened />
              打开工作目录
            </el-button>
            <el-button
              type="success"
              link
              size="small"
              @click.stop="openNginxConfig(scope.row)"
            >
              <i-ep-setting />
              配置nginx文件
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="openDialog(scope.row)"
            >
              <i-ep-edit />
              编辑
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click.stop="handleDelete(scope.row.id)"
            >
              <i-ep-delete />
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="handleQuery"
      />
    </el-card>

    <!-- 代理服务配置弹窗组件 -->
    <ProxyConfigDialog ref="proxyConfigDialogRef" @success="handleQuery" />
  </div>
</template>

<script setup lang="ts">
import { listAgentConfigs, deleteAgentServerConfig } from "@/api/monitor/agent";
import { listAll } from "@/api/monitor/service";
import { ServiceInfo } from "@/api/monitor/service/types";
import { AgentConfig } from "@/api/monitor/agent/types";
import { useRouter } from "vue-router";
import ProxyConfigDialog from "./ProxyConfigDialog.vue";

defineOptions({
  name: "AgentConfig",
  inheritAttrs: false,
});

const router = useRouter();
const queryFormRef = ref(ElForm);

const loading = ref(false);
const total = ref(0);

const queryParams = reactive<
  AgentConfig & { pageNum?: number; pageSize?: number }
>({
  pageNum: 1,
  pageSize: 15,
  serviceId: undefined,
  isNginx: undefined,
});

const dataList = ref<AgentConfig[]>([]);
const serviceInfoList = ref<ServiceInfo[]>([]);

const proxyConfigDialogRef = ref<InstanceType<typeof ProxyConfigDialog>>();

/** 查询 */
function handleQuery() {
  loading.value = true;
  listAgentConfigs(queryParams)
    .then(({ data }) => {
      if (Array.isArray(data)) {
        dataList.value = data;
        total.value = data.length;
      } else if (data && (data as any).records) {
        dataList.value = (data as any).records;
        total.value = (data as any).total || 0;
      } else {
        dataList.value = [];
        total.value = 0;
      }
      loading.value = false;
    })
    .catch(() => {
      loading.value = false;
    });

  listAll().then(({ data }) => {
    serviceInfoList.value = data || [];
  });
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  handleQuery();
}

/** 删除配置 */
function handleDelete(id: number) {
  ElMessageBox.confirm("确定要删除该配置?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    deleteAgentServerConfig(id)
      .then(() => {
        ElMessage.success("删除成功");
        handleQuery();
      })
      .catch(() => {
        ElMessage.error("删除失败");
      })
      .finally(() => (loading.value = false));
  });
}

/** 打开工作目录 */
async function openWorkDirectory(row: AgentConfig) {
  if (!row.workPath) {
    ElMessage.warning("该服务未配置工作路径，请先在配置中设置 workPath");
    return;
  }

  router.push({
    path: "/ops/file",
    query: {
      agentId: row.id,
      filePath: row.workPath,
    },
  });
}

/** 配置nginx文件 */
function openNginxConfig(row: AgentConfig) {
  if (row.isNginx !== 1) {
    ElMessage.warning("该服务未配置Nginx，请先在配置中设置存在Nginx");
    return;
  }

  if (!row.nginxPath) {
    ElMessage.warning("该服务未配置Nginx路径，请先在配置中设置 nginxPath");
    return;
  }

  router.push({
    path: "/nginx/nginx",
    query: {
      agentId: row.id,
      nginxPath: row.nginxPath,
    },
  });
}

/** 打开弹窗 */
function openDialog(row?: AgentConfig) {
  if (row && row.id) {
    proxyConfigDialogRef.value?.open({
      id: row.id,
      serviceId: row.serviceId,
      serviceName: row.serviceName || "",
      hostname: row.hostname || "",
    });
  } else {
    proxyConfigDialogRef.value?.open({
      serviceId: undefined,
      serviceName: "",
      hostname: "",
    });
  }
}

onMounted(() => {
  handleQuery();
});
</script>
