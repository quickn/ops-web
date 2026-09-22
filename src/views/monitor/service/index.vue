<script setup lang="ts">
import { addData, deleteData, listPage } from "@/api/monitor/service";
import { ServiceInfo } from "@/api/monitor/service/types";

const queryFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);

const queryParams = reactive<ServiceInfo>({ pageSize: 15, pageNum: 1 });

const dataList = ref<ServiceInfo[]>();

const formRef = ref(ElForm);

const formData = reactive<ServiceInfo>({ id: null });

const dialogEdit = reactive<DialogOption>({
  visible: false,
});

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

/**
 * 打开弹窗
 *
 * @param parentId 父部门ID
 * @param deptId 部门ID
 */
async function openDialog(data?: ServiceInfo) {
  if (data) {
    dialogEdit.visible = true;
    dialogEdit.title = "编辑文档";
    Object.assign(formData, data);
  } else {
    if (formData) {
      formData.id = undefined;
      formData.name = undefined;
      formData.sort = undefined;
      formData.isMonitor = false;
      formData.workPath = undefined;
    }
    dialogEdit.visible = true;
  }
}

/** 重置表单  */
function resetForm() {
  formRef.value.resetFields();
  formRef.value.clearValidate();
  formData.id = null;
  formData.sort = 1;
  formData.workPath = undefined;
}

/** 关闭弹窗 */
function closeDialog() {
  dialogEdit.visible = false;
  resetForm();
}

/** 添加数据  */
async function handleSubmit() {
  formRef.value.validate((valid: any) => {
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

/** 删除数据 */
function handleDelete(id?: number) {
  const serviceIds = [id || ids.value].join(",");
  if (!serviceIds) {
    ElMessage.warning("请勾选删除项");
    return;
  }

  ElMessageBox.confirm("确认删除该服务?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(function () {
    deleteData(serviceIds).then(() => {
      ElMessage.success("删除成功");
      handleQuery();
    });
  });
}

onMounted(() => {
  handleQuery();
});
</script>

<template>
  <div class="app-container">
    <div class="search-container">
      <el-form
        ref="queryFormRef"
        :model="queryParams"
        :inline="true"
        style="display: flex; flex-wrap: wrap; align-items: center"
      >
        <el-form-item prop="keywords" label="" style="width: 150px">
          <el-input
            v-model="queryParams.name"
            placeholder="名称"
            clearable
            @keyup.enter="handleQuery"
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
          <el-button
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
      >
        <!--        <el-table-column type="selection" width="55" align="center" />-->
        <el-table-column label="ID" prop="id" width="90" />
        <el-table-column label="服务名" prop="name" width="120" />
        <el-table-column
          label="工作路径"
          prop="workPath"
          min-width="100"
          show-overflow-tooltip
        />
        <el-table-column label="是否监控" prop="isMonitor" width="100" />
        <el-table-column label="排序" prop="sort" width="100" />
        <el-table-column label="操作" fixed="right" align="left" width="200">
          <template #default="scope">
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
              v-hasPerm="['sys:dept:delete']"
              type="primary"
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

    <el-dialog
      v-model="dialogEdit.visible"
      :title="dialogEdit.title"
      width="900px"
      @closed="closeDialog"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="服务名" prop="name">
          <el-input v-model="formData.name" placeholder="服务名" />
        </el-form-item>

        <el-form-item label="工作路径" prop="workPath">
          <el-input v-model="formData.workPath" placeholder="请输入工作路径" />
        </el-form-item>

        <el-form-item label="是否开启监控" prop="isMonitor">
          <el-switch
            v-model="formData.isMonitor"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>

        <el-form-item label="排序" prop="name">
          <el-input v-model="formData.sort" placeholder="排序" />
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
