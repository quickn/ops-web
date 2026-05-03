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
        style="display: flex; align-items: center; flex-wrap: wrap"
      >
        <el-form-item label="服务器地址" prop="server_addr">
          <el-input
            v-model="queryParams.server_addr"
            placeholder="Nacos 服务地址"
            clearable
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item label="Data ID" prop="dataId">
          <el-input
            v-model="queryParams.dataId"
            placeholder="配置ID，支持模糊搜索"
            clearable
            style="width: 220px"
          />
        </el-form-item>
        <el-form-item label="Group" prop="group">
          <el-input
            v-model="queryParams.group"
            placeholder="配置分组"
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
        <el-form-item style="margin-left: auto">
          <el-button type="success" @click="goAddConfig">
            <i-ep-plus />新增
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table
        ref="dataTableRef"
        v-loading="loading"
        :data="dataList"
        highlight-current-row
        border
      >
        <el-table-column
          label="Data ID"
          prop="dataId"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column
          label="Group"
          prop="group"
          width="180"
          show-overflow-tooltip
        />
        <el-table-column label="命名空间" prop="tenant" width="120">
          <template #default="scope">
            <el-tag v-if="!scope.row.tenant" type="info">public</el-tag>
            <span v-else>{{ scope.row.tenant }}</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" prop="type" width="100" />
        <el-table-column
          label="MD5"
          prop="md5"
          width="200"
          show-overflow-tooltip
        />
        <el-table-column label="应用" prop="appName" width="120" />
        <el-table-column fixed="right" label="操作" width="200" align="center">
          <template #default="scope">
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="openDetailDialog(scope.row)"
            >
              <i-ep-view />查看
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="goEditConfig(scope.row)"
            >
              <i-ep-edit />编辑
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="handleDelete(scope.row)"
            >
              <i-ep-delete />删除
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

    <!-- 配置详情弹窗（只读查看） -->
    <el-dialog
      v-model="detailDialog.visible"
      :title="detailDialog.title"
      width="900px"
      @closed="closeDetailDialog"
    >
      <div class="config-detail-info">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="Data ID">
            {{ detailConfig.dataId }}
          </el-descriptions-item>
          <el-descriptions-item label="Group">
            {{ detailConfig.group }}
          </el-descriptions-item>
          <el-descriptions-item label="命名空间">
            <el-tag v-if="!detailConfig.tenant" type="info">public</el-tag>
            <span v-else>{{ detailConfig.tenant }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ detailConfig.type }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <div class="config-content-area">
        <el-input
          v-model="detailContent"
          type="textarea"
          :autosize="{ minRows: 6, maxRows: 30 }"
          readonly
          style="font-family: monospace"
        />
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDetailDialog">关 闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import {
  getConfigs,
  getConfigDetail,
  getNamespaces,
  deleteConfigApi,
} from "@/api/nacos";
import {
  NacosConfigQuery,
  NacosConfig,
  NacosNamespace,
} from "@/api/nacos/types";

defineOptions({
  name: "NacosConfigs",
  inheritAttrs: false,
});

const router = useRouter();
const queryFormRef = ref(ElForm);
const loading = ref(false);
const total = ref(0);
const dataList = ref<NacosConfig[]>([]);
const namespaceList = ref<NacosNamespace[]>([]);

const queryParams = reactive<NacosConfigQuery>({
  server_addr: "https://cms.xgzyzc.com",
  pageNo: 1,
  pageSize: 10,
  tenant: "",
  dataId: "",
  group: "",
});

// 详情弹窗
const detailDialog = reactive<DialogOption>({
  visible: false,
  title: "配置详情",
});
const detailConfig = reactive<NacosConfig>({});
const detailContent = ref("");

/** 跳转新增页面 */
function goAddConfig() {
  router.push({
    name: "NacosConfigEdit",
    query: {
      server_addr: queryParams.server_addr,
      tenant: queryParams.tenant || "",
    },
  });
}

/** 跳转编辑页面 */
function goEditConfig(row: NacosConfig) {
  router.push({
    name: "NacosConfigEdit",
    query: {
      server_addr: queryParams.server_addr,
      dataId: row.dataId,
      group: row.group,
      tenant: row.tenant || "",
      type: row.type || "yaml",
      content: row.content,
    },
  });
}

/** 加载命名空间列表 */
function loadNamespaces() {
  if (!queryParams.server_addr) return;
  getNamespaces({ server_addr: queryParams.server_addr }).then(({ data }) => {
    if (data && Array.isArray(data)) {
      namespaceList.value = data;
    }
  });
}

/** 查询配置列表 */
function handleQuery() {
  if (!queryParams.server_addr) {
    ElMessage.warning("请输入 Nacos 服务器地址");
    return;
  }
  loading.value = true;
  getConfigs(queryParams)
    .then(({ data }) => {
      if (data) {
        dataList.value = data.pageItems || [];
        total.value = data.totalCount || 0;
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
  queryParams.tenant = "";
  queryParams.dataId = "";
  queryParams.group = "";
  handleQuery();
}

/** 打开配置详情弹窗（只读查看） */
function openDetailDialog(row: NacosConfig) {
  detailDialog.visible = true;
  detailDialog.title = `配置详情 - ${row.dataId}`;
  Object.assign(detailConfig, row);
  detailContent.value = "";

  getConfigDetail({
    server_addr: queryParams.server_addr,
    dataId: row.dataId!,
    group: row.group,
    tenant: row.tenant,
  }).then(({ data }) => {
    detailContent.value = data || "";
  });
}

function closeDetailDialog() {
  detailDialog.visible = false;
  detailContent.value = "";
}

/** 删除配置 */
function handleDelete(row: NacosConfig) {
  ElMessageBox.confirm(
    `确认删除配置 "${row.dataId}" 吗？此操作不可恢复。`,
    "警告",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    }
  ).then(() => {
    loading.value = true;
    deleteConfigApi({
      server_addr: queryParams.server_addr,
      dataId: row.dataId!,
      group: row.group,
      tenant: row.tenant,
    })
      .then(() => {
        ElMessage.success("删除成功");
        handleQuery();
      })
      .finally(() => {
        loading.value = false;
      });
  });
}

watch(
  () => queryParams.server_addr,
  (newVal) => {
    if (newVal) {
      loadNamespaces();
    }
  }
);

onMounted(() => {
  loadNamespaces();
  handleQuery();
});
</script>

<style scoped>
.config-detail-info {
  margin-bottom: 8px;
}
.config-content-area {
  margin-top: 16px;
}
</style>
