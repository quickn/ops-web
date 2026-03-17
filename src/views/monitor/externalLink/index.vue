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
        <el-form-item label="标题" prop="keywords">
          <el-input
            v-model="queryParams.title"
            placeholder="标题"
            @keyup.enter="handleQuery"
          />
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

        <el-form-item>
          <el-button
            v-hasPerm="['sys:dept:add']"
            type="success"
            @click="openDialog()"
          >
            <i-ep-plus />
            新增
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
        <el-table-column label="标题" prop="title" width="180" />
        <el-table-column label="地址" prop="url" width="180" />
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
              @click="openPage(scope.row.url)"
            >
              访问
            </el-button>

            <el-button
              v-hasPerm="['sys:dept:edit']"
              type="primary"
              link
              size="small"
              @click.stop="openDialog(scope.row)"
            >
              <i-ep-edit />
              编辑
            </el-button>

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

    <el-dialog
      v-model="dialogEdit.visible"
      :title="dialogEdit.title"
      width="900px"
      @closed="closeDialog"
    >
      <el-form
        ref="deptFormRef"
        :model="formData"
        :rules="rules"
        label-width="150px"
      >
        <el-form-item label="服务" prop="serviceId">
          <el-select
            v-model="formData.serviceId"
            filterable
            size="default"
            @change="handleServiceChange"
          >
            <el-option
              v-for="(item, index) in serviceInfoList"
              :value="item.id"
              :label="item.name"
              :key="index"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="formData.title" placeholder="标题" />
        </el-form-item>
        <el-form-item label="URL" prop="url">
          <el-input v-model="formData.url" placeholder="URL" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleSubmit"> 确 定</el-button>
          <el-button @click="closeDialog"> 取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
import { addData, deleteByIds, listPage } from "@/api/monitor/externalLink";
import { listAll } from "@/api/monitor/service";
import { ExternalLink } from "@/api/monitor/externalLink/types";
import { useRouter } from "vue-router";

const emit = defineEmits(["setData", "changePage"]);
const queryFormRef = ref(ElForm);
const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);
const queryParams = reactive<ExternalLink>({ pageSize: 10, pageNum: 1 });
const dataList = ref<ExternalLink[]>();
const serviceInfoList = ref<ExternalLink[]>();

const dialogEdit = reactive<DialogOption>({
  visible: false,
});

const deptFormRef = ref(ElForm);

const formData = reactive<ExternalLink>({
  serviceId: null,
  serviceName: null,
  title: null,
  url: null,
});

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

async function openDialog(data?: ExternalLink) {
  if (data) {
    dialogEdit.visible = true;
    dialogEdit.title = "编辑";
    Object.assign(formData, data);
  } else {
    if (formData) {
      dialogEdit.title = "新增";
      formData.serviceName = "";
      formData.serviceId = null;
      formData.id = null;
      formData.title = "";
      formData.url = "";
    }
    dialogEdit.visible = true;
  }
}

/** 关闭弹窗 */
function closeDialog() {
  dialogEdit.visible = false;
}

async function handleSubmit() {
  deptFormRef.value.validate((valid: any) => {
    if (valid) {
      addData(formData)
        .then(() => {
          ElMessage.success("新增成功");
          closeDialog();
          handleQuery();
        })
        .finally(() => (loading.value = false));
    }
  });
}

function handleServiceChange(val) {
  console.log(serviceInfoList);
  const selectedService = serviceInfoList.value.find((item) => item.id === val);
  if (selectedService) {
    formData.serviceName = selectedService.name;
  }
}

/** 重置查询 */
function resetQuery() {
  queryParams.serviceId = null;
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

const router = useRouter();

function openPage(url) {
  // 内部路由
  const route = router.resolve({
    path: "/monitor/externalLinkPage",
    query: { url: url },
  });
  window.open(route.href, "_blank");
  return false; // 阻止默认的路由跳转
}

onMounted(() => {
  handleQuery();
});
</script>
