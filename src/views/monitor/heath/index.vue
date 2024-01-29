<script setup lang="ts">
import { addData, deleteData, listData } from "@/api/heath";

import { HeathMonitor } from "@/api/heath/types";

defineOptions({
  name: "HeathMonitor",
  inheritAttrs: false,
});

const queryFormRef = ref(ElForm);
const deptFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);

const dialogEdit = reactive<DialogOption>({
  visible: false,
});

const queryParams = reactive<HeathMonitor>({ id: null });
const deptList = ref<HeathMonitor[]>();

const formData = reactive<HeathMonitor>({ id: null });

/** 查询 */
function handleQuery() {
  loading.value = true;
  listData(queryParams).then(({ data }) => {
    deptList.value = data.records;
    loading.value = false;
  });
}

/** 删除部门 */
function handleDelete(deptId?: number) {
  ElMessageBox.confirm(`确认删除已选中的数据项?`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    deleteData(deptId).then(() => {
      ElMessage.success("删除成功");
      resetQuery();
    });
  });
}

/**重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  handleQuery();
}

/** 行复选框选中记录选中ID集合 */
function handleSelectionChange(selection: any) {
  ids.value = selection.map((item: any) => item.id);
}

/** 添加数据  */
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

/**
 * 打开弹窗
 *
 * @param parentId 父部门ID
 * @param deptId 部门ID
 */
async function openDialog(data?: HeathMonitor) {
  if (data) {
    dialogEdit.visible = true;
    dialogEdit.title = "编辑文档";
    Object.assign(formData, data);
  } else {
    if (formData) {
      formData.id = undefined;
      formData.appName = undefined;
      formData.heathUrl = undefined;
    }
    dialogEdit.visible = true;
  }
}

/** 关闭弹窗 */
function closeDialog() {
  dialogEdit.visible = false;
  resetForm();
}

/** 重置表单  */
function resetForm() {
  deptFormRef.value.resetFields();
  deptFormRef.value.clearValidate();
  formData.id = undefined;
  formData.sort = 1;
}

const rules = reactive({
  appName: [{ required: true, message: "接口名", trigger: "blur" }],
  heathUrl: [{ required: true, message: "链接", trigger: "blur" }],
});

onMounted(() => {
  handleQuery();
});
</script>
<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="接口名" prop="keywords">
          <el-input
            v-model="queryParams.appName"
            placeholder="接口名"
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
      </el-form>
    </div>

    <el-card>
      <template #header>
        <el-button
          v-hasPerm="['sys:dept:add']"
          type="success"
          @click="openDialog()"
        >
          <i-ep-plus />
          新增
        </el-button>
        <el-button
          v-hasPerm="['sys:dept:delete']"
          type="danger"
          :disabled="ids.length === 0"
          @click="handleDelete()"
        >
          <i-ep-delete />
          删除
        </el-button>
      </template>

      <el-table
        v-loading="loading"
        :data="deptList"
        row-key="id"
        default-expand-all
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="appName" label="接口名" min-width="300" />
        <el-table-column prop="heathUrl" label="链接地址" width="300" />
        <el-table-column prop="serviceName" label="服务名" width="300" />
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
        label-width="80px"
      >
        <el-form-item label="接口名" prop="name">
          <el-input v-model="formData.appName" placeholder="接口名" />
        </el-form-item>

        <el-form-item label="链接" prop="name">
          <el-input v-model="formData.heathUrl" placeholder="链接" />
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
