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
        <el-form-item label="选择Nacos服务器" prop="configId">
          <el-select
            v-model="queryParams.configId"
            placeholder="请选择 Nacos 服务器"
            clearable
            filterable
            style="width: 280px"
            @change="handleServerChange"
          >
            <el-option
              v-for="server in serverList"
              :key="server.id"
              :label="`${server.configName || ''} (${server.url || ''})`"
              :value="server.id!"
            />
          </el-select>
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
            <i-ep-search />
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <i-ep-refresh />
            重置
          </el-button>
        </el-form-item>
        <el-form-item style="margin-left: auto">
          <el-button type="success" @click="goAddConfig">
            <i-ep-plus />
            新增
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
          width="250"
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
        <el-table-column fixed="right" label="操作" width="150" align="center">
          <template #default="scope">
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="goEditConfig(scope.row)"
            >
              <i-ep-edit />
              编辑
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="handleDelete(scope.row)"
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
        v-model:page="queryParams.pageNo"
        v-model:limit="queryParams.pageSize"
        @pagination="handleQuery"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import {
  deleteConfigApi,
  getConfigs,
  getNacosServerList,
  getNamespaces,
} from "@/api/nacos";
import {
  NacosConfig,
  NacosConfigQuery,
  NacosNamespace,
} from "@/api/nacos/types";

import { AccountConfig } from "@/api/accountConfig/types";

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
const serverList = ref<AccountConfig[]>([]);

const queryParams = reactive<NacosConfigQuery>({
  configId: undefined,
  pageNo: 1,
  pageSize: 10,
  tenant: "",
  dataId: "",
  group: "",
});

/** 切换 Nacos 服务器 */
function handleServerChange() {
  if (queryParams.configId) {
    handleQuery();
  } else {
    dataList.value = [];
    total.value = 0;
  }
}

/** 跳转新增页面 */
function goAddConfig() {
  router.push({
    name: "NacosConfigEdit",
    query: {
      configId: queryParams.configId?.toString() || "",
      tenant: queryParams.tenant || "",
    },
  });
}

/** 跳转编辑页面 */
function goEditConfig(row: NacosConfig) {
  router.push({
    name: "NacosConfigEdit",
    query: {
      configId: queryParams.configId?.toString() || "",
      dataId: row.dataId,
      group: row.group,
      tenant: row.tenant || "",
      type: row.type || "yaml",
      content: row.content,
    },
  });
}

/** 加载 Nacos 服务器列表 */
async function loadServerList() {
  try {
    const { data } = await getNacosServerList();
    if (data && Array.isArray(data)) {
      serverList.value = data;
      // 如果有服务器列表，默认选择第一个
      if (data.length > 0 && !queryParams.configId) {
        queryParams.configId = data[0].id;
      }
    }
  } catch {
    // 加载服务器列表失败
  }
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

/** 查询配置列表 */
function handleQuery() {
  if (!queryParams.configId) {
    ElMessage.warning("请选择 Nacos 服务器");
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
  // 重置后如果有服务器列表，选择第一个
  if (serverList.value.length > 0) {
    queryParams.configId = serverList.value[0].id;
  } else {
    queryParams.configId = undefined;
  }
  handleQuery();
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
      configId: queryParams.configId,
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
  () => queryParams.configId,
  (newVal) => {
    if (newVal !== undefined && newVal !== null) {
      loadNamespaces();
    } else {
      namespaceList.value = [];
    }
  }
);

onMounted(async () => {
  await loadServerList();
  loadNamespaces();
  handleQuery();
});
</script>
