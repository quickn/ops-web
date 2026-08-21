<script setup lang="ts">
import { listData, updateById, restartDocker, stopDocker, deleteById } from "@/api/docker";

import { listAll } from "@/api/monitor/service";

import { DockerContainer, DockerContainerInfo } from "@/api/docker/types";
import { ServiceInfo } from "@/api/monitor/service/types";

const queryFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);

const dataList = ref<DockerContainer[]>();
const serviceInfoList = ref<ServiceInfo[]>();

const queryParams = reactive<DockerContainer>({ pageSize: 15, pageNum: 1 });
const formData = reactive<DockerContainerInfo>({ sort: 1 });

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

function updateDocker(data: DockerContainer) {
  formData.id = data.id;
  formData.isMonitor = !data.isMonitor;
  updateById(formData)
    .then(() => {
      ElMessage.success("修改成功");
      resetQuery();
    })
    .finally(() => (loading.value = false));
}

/** 删除角色 */
function restart(id) {
  ElMessageBox.confirm("确定要重启docker服务?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    restartDocker(id)
      .then(() => {
        ElMessage.success("重启指令已执行");
        handleQuery();
      })
      .finally(() => (loading.value = false));
  });
}

function stop(id) {
  ElMessageBox.confirm("确定要关闭docker服务?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    stopDocker(id)
      .then(() => {
        ElMessage.success("关闭指令已执行");
        handleQuery();
      })
      .finally(() => (loading.value = false));
  });
}

/** 删除容器 */
function deleteContainer(id: number) {
  ElMessageBox.confirm("确定要删除该容器?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    deleteById(id)
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
        <el-form-item prop="status">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="选择服务"
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
            v-model="queryParams.names"
            placeholder="容器名称"
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
        <el-table-column label="容器名称" prop="names" width="200" />
        <el-table-column label="IP" prop="hostname" width="130" />
        <el-table-column label="状态" prop="status" width="150" />
        <el-table-column label="是否开启监控" align="center" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.isMonitor === true" type="success"
              >已开启</el-tag
            >
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="updateTime" width="160" />
        <el-table-column
          fixed="right"
          label="操作"
          width="500"
          style="padding: 0"
        >
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              link
              @click="restart(scope.row.id)"
            >
              <i-ep-position />重启服务
            </el-button>
            <el-button
              type="primary"
              size="small"
              link
              @click="stop(scope.row.id)"
            >
              <i-ep-position />关闭服务
            </el-button>
            <el-button
              type="primary"
              size="small"
              link
              @click="updateDocker(scope.row)"
            >
              <el-tag v-if="scope.row.isMonitor === true" type="info"
                >关闭监听</el-tag
              >
              <el-tag v-else type="success">开启监听</el-tag>
            </el-button>
            <el-button
              type="danger"
              size="small"
              link
              @click="deleteContainer(scope.row.id)"
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
