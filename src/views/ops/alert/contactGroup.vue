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
        <el-form-item prop="groupName" label="组名称" style="width: 200px">
          <el-input
            v-model="queryParams.groupName"
            placeholder="联系人组名称"
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
        <el-table-column label="组名称" prop="groupName" min-width="160" show-overflow-tooltip />
        <el-table-column label="联系人" min-width="280">
          <template #default="scope">
            <template v-for="name in getContactNames(scope.row.contactIds)" :key="name">
              <el-tag size="small" style="margin: 2px">{{ name }}</el-tag>
            </template>
            <span v-if="!getContactNames(scope.row.contactIds).length" class="text-gray-400">未配置</span>
          </template>
        </el-table-column>
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
      width="560px"
      destroy-on-close
      :close-on-click-modal="false"
      @closed="closeDialog"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="90px">
        <el-form-item label="组名称" prop="groupName">
          <el-input v-model="formData.groupName" placeholder="请输入联系人组名称" />
        </el-form-item>
        <el-form-item label="联系人" prop="contactIds">
          <el-select
            v-model="selectedContactIds"
            multiple
            filterable
            placeholder="请选择联系人"
            style="width: 100%"
            @change="handleContactChange"
          >
            <el-option
              v-for="item in contactList"
              :key="item.id"
              :label="item.contactName + (item.phone ? ' (' + item.phone + ')' : '')"
              :value="item.id!"
            />
          </el-select>
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
import {
  listAlertContactGroupPage,
  saveAlertContactGroup,
  deleteAlertContactGroup,
  listAllAlertContact
} from "@/api/ops/alert";
import { AlertContactGroup, AlertContactGroupQuery, AlertContact } from "@/api/ops/alert/types";

defineOptions({ name: "AlertContactGroupIndex" });

const queryFormRef = ref(ElForm);
const formRef = ref(ElForm);

const loading = ref(false);
const submitLoading = ref(false);
const total = ref(0);

const queryParams = reactive<AlertContactGroupQuery>({
  pageNum: 1,
  pageSize: 15,
  groupName: ""
});

const dataList = ref<AlertContactGroup[]>([]);
const contactList = ref<AlertContact[]>([]);
const selectedContactIds = ref<number[]>([]);

const dialogEdit = reactive<DialogOption>({ visible: false, title: "" });

const formData = reactive<AlertContactGroup>({} as AlertContactGroup);

const rules = reactive({
  groupName: [{ required: true, message: "请输入组名称", trigger: "blur" }]
});

/** 根据联系人ID列表获取姓名列表 */
function getContactNames(contactIds?: string): string[] {
  if (!contactIds) return [];
  const ids = contactIds.split(",").map(Number);
  return ids
    .map((id) => {
      const c = contactList.value.find((item) => item.id === id);
      return c?.contactName || "";
    })
    .filter(Boolean);
}

/** 联系人多选变更 */
function handleContactChange(val: number[]) {
  formData.contactIds = val.join(",");
}

function handleQuery() {
  loading.value = true;
  listAlertContactGroupPage(queryParams)
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

function loadContactList() {
  listAllAlertContact().then(({ data }) => {
    contactList.value = data || [];
  });
}

function openDialog(data?: AlertContactGroup) {
  dialogEdit.title = data ? "编辑联系人组" : "新增联系人组";
  if (data) {
    Object.assign(formData, data);
    selectedContactIds.value = data.contactIds
      ? data.contactIds.split(",").map(Number)
      : [];
  } else {
    resetForm();
  }
  dialogEdit.visible = true;
}

function resetForm() {
  Object.keys(formData).forEach((key) => {
    (formData as any)[key] = undefined;
  });
  selectedContactIds.value = [];
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
    saveAlertContactGroup(formData)
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
  ElMessageBox.confirm("确定要删除该联系人组吗？", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(() => {
    deleteAlertContactGroup(id).then(() => {
      ElMessage.success("删除成功");
      handleQuery();
    });
  });
}

onMounted(() => {
  loadContactList();
  handleQuery();
});
</script>

<style scoped>
.app-container { padding: 20px; }
.search-container { margin-bottom: 20px; }
</style>
