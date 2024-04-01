<script setup lang="ts">
import { listPage } from "@/api/monitor/service";

import { upgradeClientByServiceId } from "@/api/monitor/agent";

import { ServiceInfo } from "@/api/monitor/service/types";

const queryFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);

const queryParams = reactive<ServiceInfo>({ pageSize: 10, pageNum: 1 });

const dataList = ref<ServiceInfo[]>();

/** 查询 */
function handleQuery() {
  loading.value = true;
  listPage(queryParams).then(({ data }) => {
    dataList.value = data.records;
    total.value = data.total;
    loading.value = false;
  });
}
/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  handleQuery();
}

/** 行checkbox 选中事件 */
function handleSelectionChange(selection: any) {
  ids.value = selection.map((item: any) => item.id);
}

/** 删除角色 */
function upgradeClient(id) {
  ElMessageBox.confirm("确定要升级客户端?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    upgradeClientByServiceId(id)
      .then(() => {
        ElMessage.success("升级成功");
      })
      .finally(() => (loading.value = false));
  });
}

onMounted(() => {
  handleQuery();
});
</script>

<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item prop="keywords" label="" style="width: 150px">
          <el-input
            v-model="queryParams.name"
            placeholder="名称"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery"
            ><i-ep-search />搜索</el-button
          >
          <el-button @click="resetQuery"><i-ep-refresh />重置</el-button>
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
        @selection-change="handleSelectionChange"
      >
        <!--        <el-table-column type="selection" width="55" align="center" />-->
        <el-table-column label="服务名" prop="name" width="90" />
        <el-table-column label="排序" prop="sort" width="100" />
        <el-table-column
          fixed="right"
          label="操作"
          width="190"
          style="padding: 0"
        >
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              link
              @click="upgradeClient(scope.row.id)"
            >
              <i-ep-delete />升级客户端
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
  </div>
</template>
