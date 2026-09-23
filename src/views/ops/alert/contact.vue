<template>
  <div class="app-container">
    <!-- 搜索区 -->
    <div class="search-container">
      <el-form
        ref="queryFormRef"
        :model="queryParams"
        :inline="true"
        style="display: flex; flex-wrap: wrap; align-items: center"
      >
        <el-form-item prop="contactName" label="姓名" style="width: 180px">
          <el-input
            v-model="queryParams.contactName"
            placeholder="联系人姓名"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item prop="phone" label="手机号" style="width: 180px">
          <el-input
            v-model="queryParams.phone"
            placeholder="手机号"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>

        <el-form-item style="margin-left: auto">
          <el-button type="success" @click="openDialog()">
            <el-icon><Plus /></el-icon>
            新增
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格区 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="dataList" border highlight-current-row>
        <el-table-column label="ID" prop="id" width="70" align="center" />
        <el-table-column label="姓名" prop="contactName" min-width="120" show-overflow-tooltip />
        <el-table-column label="邮箱" prop="email" min-width="200" show-overflow-tooltip />
        <el-table-column label="手机号" prop="phone" width="140" show-overflow-tooltip />
        <el-table-column label="备注" prop="remark" min-width="150" show-overflow-tooltip />
        <el-table-column label="创建人" prop="createByName" width="100" align="center" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createTime" width="170" align="center" />
        <el-table-column label="操作" fixed="right" align="center" width="150">
          <template #default="scope">
            <el-button type="primary" size="small" link @click="openDialog(scope.row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" size="small" link @click="handleDelete(scope.row.id)">
              <el-icon><Delete /></el-icon>
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogEdit.visible"
      :title="dialogEdit.title"
      width="520px"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="closeDialog"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="80px">
        <el-form-item label="姓名" prop="contactName">
          <el-input v-model="formData.contactName" placeholder="请输入联系人姓名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱地址" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确 定</el-button>
          <el-button @click="closeDialog">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Delete, Edit, Plus, Refresh, Search } from "@element-plus/icons-vue";
import { listAlertContactPage, saveAlertContact, deleteAlertContact } from "@/api/ops/alert";
import { AlertContact, AlertContactQuery } from "@/api/ops/alert/types";

defineOptions({ name: "AlertContactIndex" });

const queryFormRef = ref(ElForm);
const formRef = ref(ElForm);

const loading = ref(false);
const submitLoading = ref(false);
const total = ref(0);

const queryParams = reactive<AlertContactQuery>({
  pageNum: 1,
  pageSize: 15,
  contactName: "",
  phone: ""
});

const dataList = ref<AlertContact[]>([]);

const dialogEdit = reactive<DialogOption>({ visible: false, title: "" });

const formData = reactive<AlertContact>({} as AlertContact);

const rules = reactive({
  contactName: [{ required: true, message: "请输入联系人姓名", trigger: "blur" }]
});

function handleQuery() {
  loading.value = true;
  listAlertContactPage(queryParams)
    .then(({ data }) => {
      dataList.value = data.records;
      total.value = data.total;
    })
    .finally(() => (loading.value = false));
}

function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  handleQuery();
}

function openDialog(data?: AlertContact) {
  dialogEdit.title = data ? "编辑联系人" : "新增联系人";
  if (data) {
    Object.assign(formData, data);
  } else {
    resetForm();
  }
  dialogEdit.visible = true;
}

function resetForm() {
  Object.keys(formData).forEach((key) => {
    (formData as any)[key] = undefined;
  });
}

function closeDialog() {
  dialogEdit.visible = false;
  formRef.value?.resetFields();
  formRef.value?.clearValidate();
}

function handleSubmit() {
  formRef.value.validate((valid: boolean) => {
    if (!valid) return;
    submitLoading.value = true;
    saveAlertContact(formData)
      .then(() => {
        ElMessage.success("保存成功");
        closeDialog();
        handleQuery();
      })
      .finally(() => (submitLoading.value = false));
  });
}

function handleDelete(id?: number) {
  if (!id) return;
  ElMessageBox.confirm("确定要删除该联系人吗？", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(() => {
    deleteAlertContact(id).then(() => {
      ElMessage.success("删除成功");
      handleQuery();
    });
  });
}

onMounted(() => {
  handleQuery();
});
</script>

<style scoped>
.app-container { padding: 20px; }
.search-container { margin-bottom: 20px; }
</style>
