<script setup lang="ts">
import { listData, deleteByIds } from "@/api/monitor/log";

import { listAll } from "@/api/monitor/service";

import { LogInfo } from "@/api/monitor/log/types";
import { ServiceInfo } from "@/api/monitor/service/types";

const queryFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);

const queryParams = reactive<LogInfo>({ pageSize: 10, pageNum: 1 });

const dataList = ref<LogInfo[]>();

const serviceInfoList = ref<ServiceInfo[]>();

const formData = reactive<LogInfo>({
  sort: 1,
});

/** 查询 */
function handleQuery() {
  loading.value = true;
  listData(queryParams).then(({ data }) => {
    dataList.value = data.records;
    total.value = data.total;
    loading.value = false;
  });
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
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
function deleteById(id) {
  ElMessageBox.confirm("确定要删除服务?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    deleteByIds(id)
      .then(() => {
        ElMessage.success("删除成功");
        handleQuery();
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
        <el-form-item label="服务" prop="status">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="全部"
            clearable
            style="width: 100px"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="keywords" label="" style="width: 150px">
          <el-input
            v-model="queryParams.title"
            placeholder="标题"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item prop="keywords" label="" style="width: 150px">
          <el-input
            v-model="queryParams.hostname"
            placeholder="IP"
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
        <el-table-column label="服务名" prop="serviceName" width="90" />
        <el-table-column label="IP" prop="hostname" width="150" />
        <el-table-column label="标题" prop="title" width="140" />
        <el-table-column label="内容" prop="infoContent" width="300" />
        <el-table-column label="是否发送邮件" align="center" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.state === 1" type="success">已发送</el-tag>
            <el-tag v-else type="info">未发送</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="createTime" width="160" />
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
              @click="deleteById(scope.row.id)"
            >
              <i-ep-delete />删除
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
