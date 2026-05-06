<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <div class="search-container">
      <el-form
        ref="queryFormRef"
        :model="queryParams"
        :inline="true"
        @submit.prevent
        @keyup.enter="handleQuery"
        style="display: flex; flex-wrap: wrap; align-items: center"
      >
        <el-form-item label="服务器地址" prop="configId">
          <el-select
            v-model="queryParams.configId"
            placeholder="请选择 Nacos 服务器"
            clearable
            filterable
            style="width: 280px"
          >
            <el-option
              v-for="server in serverList"
              :key="server.id"
              :label="server.service_name || server.url"
              :value="server.id!"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="命名空间" prop="namespaceId">
          <el-select
            v-model="queryParams.namespaceId"
            placeholder="请选择命名空间"
            clearable
            filterable
            style="width: 200px"
          >
            <el-option
              v-for="ns in namespaceList"
              :key="ns.namespace"
              :label="ns.namespaceShowName || ns.namespace"
              :value="ns.namespace || ''"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="分组" prop="groupName">
          <el-input
            v-model="queryParams.groupName"
            placeholder="分组名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <i-ep-search />搜索
          </el-button>
          <el-button @click="resetQuery"> <i-ep-refresh />重置 </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 服务列表表格 -->
    <el-card shadow="never">
      <el-table
        ref="dataTableRef"
        v-loading="loading"
        :data="dataList"
        highlight-current-row
        border
      >
        <el-table-column
          label="服务名称"
          prop="name"
          width="250"
          show-overflow-tooltip
        />
        <el-table-column
          label="分组"
          prop="groupName"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column
          label="集群数"
          prop="clusterCount"
          width="80"
          align="center"
        />
        <el-table-column
          label="健康实例"
          prop="healthyInstanceCount"
          width="100"
          align="center"
        >
          <template #default="scope">
            <el-tag
              :type="scope.row.healthyInstanceCount > 0 ? 'success' : 'danger'"
            >
              {{ scope.row.healthyInstanceCount ?? 0 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="100" align="center">
          <template #default="scope">
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="openDetailDialog(scope.row)"
            >
              <i-ep-view />实例
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="queryParams.pageNo"
        v-model:limit="queryParams.pageSize"
        @pagination="handleQuery"
      />
    </el-card>

    <!-- 服务实例详情弹窗 -->
    <el-dialog
      v-model="detailDialog.visible"
      :title="detailDialog.title"
      width="1000px"
      @closed="closeDetailDialog"
    >
      <div class="instance-info">
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="服务名">
            {{ detailService.name }}
          </el-descriptions-item>
          <el-descriptions-item label="分组">
            {{ detailService.groupName }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <el-table
        v-loading="instanceLoading"
        :data="instanceList"
        border
        style="margin-top: 16px"
      >
        <el-table-column label="IP" prop="ip" width="150" />
        <el-table-column label="端口" prop="port" width="80" align="center" />
        <el-table-column label="权重" prop="weight" width="80" align="center" />
        <el-table-column label="健康状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.healthy ? 'success' : 'danger'">
              {{ scope.row.healthy ? "健康" : "异常" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.enabled ? 'success' : 'info'">
              {{ scope.row.enabled ? "已启用" : "已禁用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="临时实例" width="90" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.ephemeral ? 'warning' : ''" size="small">
              {{ scope.row.ephemeral ? "是" : "否" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="集群"
          prop="clusterName"
          width="120"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="scope">
            <el-button
              v-if="!scope.row.enabled"
              type="success"
              link
              size="small"
              :loading="scope.row.onlineLoading"
              @click="handleOnlineInstance(scope.row)"
            >
              <i-ep-top />上线
            </el-button>
            <el-button
              v-if="scope.row.enabled"
              type="danger"
              link
              size="small"
              :loading="scope.row.offlineLoading"
              @click="handleOfflineInstance(scope.row)"
            >
              <i-ep-bottom />下线
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDetailDialog">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  getServices,
  getServiceDetail,
  getNamespaces,
  onlineServiceInstance,
  offlineServiceInstance,
  getNacosServerList,
} from "@/api/nacos";
import {
  NacosServiceQuery,
  NacosService,
  NacosNamespace,
  AccountConfig,
} from "@/api/nacos/types";

defineOptions({
  name: "NacosServices",
  inheritAttrs: false,
});

const queryFormRef = ref(ElForm);
const loading = ref(false);
const instanceLoading = ref(false);
const total = ref(0);
const dataList = ref<NacosService[]>([]);
const namespaceList = ref<NacosNamespace[]>([]);
const serverList = ref<AccountConfig[]>([]);

const queryParams = reactive<NacosServiceQuery>({
  configId: undefined,
  pageNo: 1,
  pageSize: 10,
  namespaceId: "",
  groupName: "DEFAULT_GROUP",
});

const detailDialog = reactive<DialogOption>({
  visible: false,
  title: "服务实例列表",
});

const detailService = reactive<NacosService>({});
const instanceList = ref<any[]>([]);
const instanceData = ref<any>({});

/** 加载 Nacos 服务器列表 */
function loadServerList() {
  getNacosServerList().then(({ data }) => {
    if (data && Array.isArray(data)) {
      serverList.value = data;
      // 如果有服务器列表，默认选择第一个
      if (data.length > 0 && !queryParams.configId) {
        queryParams.configId = data[0].id;
      }
    }
  });
}

/** 加载命名空间列表 */
function loadNamespaces() {
  if (!queryParams.configId) return;
  getNamespaces({ configId: queryParams.configId }).then(({ data }) => {
    if (data && Array.isArray(data)) {
      namespaceList.value = data;
    }
  });
}

/** 查询服务列表 */
function handleQuery() {
  if (!queryParams.configId) {
    ElMessage.warning("请选择 Nacos 服务器");
    return;
  }
  loading.value = true;
  getServices(queryParams)
    .then(({ data }) => {
      if (data) {
        dataList.value = data.serviceList || [];
        total.value = data.count || 0;
      } else {
        dataList.value = [];
        total.value = 0;
      }
    })
    .catch(() => {
      dataList.value = [];
      total.value = 0;
    })
    .finally(() => {
      loading.value = false;
    });
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value?.resetFields();
  queryParams.pageNo = 1;
  queryParams.pageSize = 10;
  queryParams.namespaceId = "";
  queryParams.groupName = "DEFAULT_GROUP";
  // 重置后如果有服务器列表，选择第一个
  if (serverList.value.length > 0) {
    queryParams.configId = serverList.value[0].id;
  } else {
    queryParams.configId = undefined;
  }
  handleQuery();
}

/** 打开服务实例详情弹窗 */
function openDetailDialog(row: NacosService) {
  detailDialog.visible = true;
  detailDialog.title = `实例列表 - ${row.name}`;
  Object.assign(detailService, row);
  instanceLoading.value = true;

  getServiceDetail({
    configId: queryParams.configId,
    serviceName: row.name!,
    namespaceId: queryParams.namespaceId,
    groupName: row.groupName,
  })
    .then(({ data }) => {
      if (data) {
        instanceList.value = data.list || [];
        instanceData.value = data;
      } else {
        instanceList.value = [];
        instanceData.value = {};
      }
    })
    .catch(() => {
      instanceList.value = [];
      instanceData.value = {};
    })
    .finally(() => {
      instanceLoading.value = false;
    });
}

/** 关闭详情弹窗 */
function closeDetailDialog() {
  detailDialog.visible = false;
  instanceList.value = [];
  instanceData.value = {};
}

/** 上线服务实例 */
function handleOnlineInstance(row: any) {
  ElMessageBox.confirm(`确认上线实例 ${row.ip}:${row.port} 吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    row.onlineLoading = true;
    onlineServiceInstance({
      configId: queryParams.configId,
      serviceName: detailService.name!,
      ip: row.ip,
      port: row.port,
      namespaceId: queryParams.namespaceId,
      groupName: detailService.groupName,
    })
      .then(() => {
        ElMessage.success("上线成功");
        // 重新加载实例列表
        openDetailDialog(detailService);
      })
      .finally(() => {
        row.onlineLoading = false;
      });
  });
}

/** 下线服务实例 */
function handleOfflineInstance(row: any) {
  ElMessageBox.confirm(
    `确认下线实例 ${row.ip}:${row.port} 吗？下线后该实例将不再接收流量。`,
    "警告",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }
  ).then(() => {
    row.offlineLoading = true;
    offlineServiceInstance({
      configId: queryParams.configId,
      serviceName: detailService.name!,
      ip: row.ip,
      port: row.port,
      namespaceId: queryParams.namespaceId,
      groupName: detailService.groupName,
    })
      .then(() => {
        ElMessage.success("下线成功");
        // 重新加载实例列表
        openDetailDialog(detailService);
      })
      .finally(() => {
        row.offlineLoading = false;
      });
  });
}

// 服务器配置变更时重新加载命名空间
watch(
  () => queryParams.configId,
  (newVal) => {
    if (newVal) {
      loadNamespaces();
    } else {
      namespaceList.value = [];
    }
  }
);

onMounted(() => {
  loadServerList();
  loadNamespaces();
  handleQuery();
});
</script>

<style scoped>
.instance-info {
  margin-bottom: 8px;
}
</style>
