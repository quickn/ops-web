<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="服务">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="全部"
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
        <el-form-item>
          <el-button class="filter-item" type="primary" @click="handleQuery">
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
        @selection-change="handleSelectionChange"
        show-overflow-tooltip
      >
        <el-table-column label="服务器名称" prop="serviceName" width="180" />
        <el-table-column label="服务器地址" prop="hostname" width="180" />
        <el-table-column label="cpu使用率" prop="cpuPer" />
        <el-table-column label="内存使用率" prop="memPer" />
        <el-table-column label="磁盘总使用率" prop="diskPer" />
        <el-table-column label="cpu核数" prop="cpuCoreNum" />
        <el-table-column label="CPU型号信息" prop="cpuXh" />
        <el-table-column label="系统版本信息" prop="version" />
        <el-table-column label="系统版本详细信息" prop="versionDetail" />
        <el-table-column label="主机状态" prop="state">
          <template #default="{ row }">
            <el-tag :type="row.state == 1 ? 'success' : 'danger'"
              >{{ row.state == 1 ? "正常" : "下线" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" />
        <el-table-column label="创建时间" prop="createTime" width="180" />
        <el-table-column label="更新时间" prop="updateTime" width="180" />
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
  </div>
</template>
<script setup lang="ts">
import { deleteByIds, listPage } from "@/api/monitor/systemInformation";
import { listAll } from "@/api/monitor/service";
import { SystemInfo } from "@/api/monitor/systemInformation/types";
import { ServiceInfo } from "@/api/monitor/service/types";

const emit = defineEmits(["setData", "changePage"]);
const queryFormRef = ref(ElForm);
const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);
const queryParams = reactive<SystemInfo>({ pageSize: 10, pageNum: 1 });
const dataList = ref<SystemInfo[]>();
const serviceInfoList = ref<ServiceInfo[]>();

/** 查询 */
function handleQuery() {
  loading.value = true;
  listPage(queryParams).then(({ data }) => {
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
  queryParams.serviceId = "";
  queryParams.pageNum = 1;
  handleQuery();
}

/** 行checkbox 选中事件 */
function handleSelectionChange(selection: any) {
  ids.value = selection.map((item: any) => item.id);
}

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
