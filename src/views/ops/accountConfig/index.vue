<script setup lang="ts">
import {
  addSavedConfig,
  deleteSavedConfig,
  getSavedConfigs,
  updateSavedConfig,
} from "@/api/accountConfig";

import { listAll as listServices } from "@/api/monitor/service";

import type { AccountConfig } from "@/api/accountConfig/types";
import type { ServiceInfo } from "@/api/monitor/service/types";

defineOptions({
  name: "AccountConfig",
  inheritAttrs: false,
});

const queryFormRef = ref(ElForm);
const configFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);
const dialog = reactive<DialogOption>({
  visible: false,
});

const queryParams = reactive<AccountConfig>({
  type: "",
  serviceId: undefined,
});

const configList = ref<AccountConfig[]>([]);

const serviceOptions = ref<ServiceInfo[]>([]);

const formData = reactive<AccountConfig>({
  type: "mysql",
  configName: "",
  url: "",
  port: 3306,
  username: "",
  password: "",
  accessToken: "",
  charset: "utf8mb4",
  serviceId: undefined,
});

const rules = reactive({
  type: [{ required: true, message: "请选择类型", trigger: "change" }],
  configName: [
    { required: true, message: "配置名称不能为空", trigger: "blur" },
  ],
  url: [{ required: true, message: "主机地址不能为空", trigger: "blur" }],
  port: [{ required: true, message: "端口不能为空", trigger: "blur" }],
  username: [{ required: true, message: "用户名不能为空", trigger: "blur" }],
});

/** 查询 */
function handleQuery() {
  loading.value = true;
  getSavedConfigs(queryParams)
    .then(({ data }) => {
      configList.value = data || [];
      loading.value = false;
    })
    .catch(() => {
      loading.value = false;
    });
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  handleQuery();
}

/** 行复选框选中记录选中ID集合 */
function handleSelectionChange(selection: any) {
  ids.value = selection.map((item: any) => item.id);
}

/** 打开弹窗 */
function openDialog(configId?: number) {
  dialog.visible = true;
  if (configId) {
    dialog.title = "编辑配置";
    const cfg = configList.value.find((c) => c.id === configId);
    if (cfg) {
      Object.assign(formData, cfg);
    }
  } else {
    dialog.title = "新增配置";
    resetForm();
  }
}

/** 表单提交 */
function handleSubmit() {
  configFormRef.value.validate((valid: any) => {
    if (valid) {
      const configId = formData.id;
      loading.value = true;
      if (configId) {
        updateSavedConfig({ ...formData })
          .then(() => {
            ElMessage.success("修改成功");
            closeDialog();
            handleQuery();
          })
          .finally(() => (loading.value = false));
      } else {
        addSavedConfig({ ...formData })
          .then(() => {
            ElMessage.success("新增成功");
            closeDialog();
            handleQuery();
          })
          .finally(() => (loading.value = false));
      }
    }
  });
}

/** 删除配置 */
function handleDelete(configId?: number) {
  const configIds = configId ? [configId] : ids.value;

  if (!configIds || configIds.length === 0) {
    ElMessage.warning("请勾选删除项");
    return;
  }

  // 逐个删除
  ElMessageBox.confirm("确认删除已选中的数据项?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(async () => {
    try {
      for (const id of configIds) {
        await deleteSavedConfig(id);
      }
      ElMessage.success("删除成功");
      handleQuery();
    } catch {
      ElMessage.error("删除失败");
    }
  });
}

/** 关闭弹窗 */
function closeDialog() {
  dialog.visible = false;
}

/** 重置表单 */
function resetForm() {
  configFormRef.value?.resetFields();
  configFormRef.value?.clearValidate();

  formData.id = undefined;
  formData.type = "mysql";
  formData.configName = "";
  formData.url = "";
  formData.port = 3306;
  formData.username = "";
  formData.password = "";
  formData.accessToken = "";
  formData.charset = "utf8mb4";
  formData.serviceId = undefined;
}

/** 测试连接 */
function handleTest(config: AccountConfig) {
  ElMessage.info("测试连接功能需接入对应的连接测试接口");
}

onMounted(async () => {
  await loadServiceOptions();
  handleQuery();
});

/** 加载服务下拉选项 */
async function loadServiceOptions() {
  try {
    const res: any = await listServices();
    serviceOptions.value = res.data || [];
  } catch {
    serviceOptions.value = [];
  }
}
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
        <el-form-item label="服务" prop="serviceId">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="请选择服务"
            clearable
            filterable
          >
            <el-option
              v-for="item in serviceOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type" style="width: 200px">
          <el-select
            v-model="queryParams.type"
            placeholder="请选择类型"
            clearable
          >
            <el-option value="mysql" label="MySQL" />
            <el-option value="nacos" label="Nacos" />
            <el-option value="xxlJob" label="XXLJob" />
            <el-option value="redis" label="Redis" />
            <el-option value="SSH" label="SSH" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置名称" prop="configName">
          <el-input
            v-model="queryParams.configName"
            placeholder="配置名称"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="主机地址" prop="url">
          <el-input
            v-model="queryParams.url"
            placeholder="主机地址"
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
        <el-form-item style="margin-left: auto">
          <el-button type="success" @click="openDialog(undefined)">
            <i-ep-plus />
            新增
          </el-button>
          <el-button
            type="danger"
            :disabled="ids.length === 0"
            @click="handleDelete()"
          >
            <i-ep-delete />
            删除
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card>
      <el-table
        v-loading="loading"
        :data="configList"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="scope">
            <el-tag>{{ scope.row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="configName" label="配置名称" min-width="150" />
        <el-table-column prop="url" label="主机地址" min-width="150" />
        <el-table-column prop="port" label="端口" width="80" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="charset" label="字符集" width="100" />

        <el-table-column label="操作" fixed="right" align="left" width="200">
          <template #default="scope">
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="openDialog(scope.row.id)"
            >
              <i-ep-edit />
              编辑
            </el-button>
            <el-button
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
      v-model="dialog.visible"
      :title="dialog.title"
      width="600px"
      @closed="closeDialog"
    >
      <el-form
        ref="configFormRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="服务" prop="serviceId">
          <el-select
            v-model="formData.serviceId"
            placeholder="请选择服务"
            clearable
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="item in serviceOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="formData.type" style="width: 100%">
            <el-option value="mysql" label="MySQL" />
            <el-option value="nacos" label="Nacos" />
            <el-option value="xxlJob" label="XXLJob" />
            <el-option value="redis" label="Redis" />
            <el-option value="ssh" label="SSH" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置名称" prop="configName">
          <el-input
            v-model="formData.configName"
            placeholder="例如：生产环境"
          />
        </el-form-item>
        <el-form-item label="主机地址" prop="url">
          <el-input v-model="formData.url" placeholder="127.0.0.1" />
        </el-form-item>
        <el-form-item label="端口" prop="port">
          <el-input-number
            v-model="formData.port"
            :min="1"
            :max="65535"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" placeholder="root" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            show-password
            placeholder="输入密码"
          />
        </el-form-item>
        <el-form-item label="AccessToken">
          <el-input
            v-model="formData.accessToken"
            placeholder="访问令牌（选填）"
          />
        </el-form-item>
        <el-form-item label="字符集">
          <el-select v-model="formData.charset" style="width: 100%">
            <el-option label="utf8mb4" value="utf8mb4" />
            <el-option label="utf8" value="utf8" />
            <el-option label="gbk" value="gbk" />
            <el-option label="latin1" value="latin1" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDialog">取消</el-button>
          <el-button @click="handleTest(formData)">测试连接</el-button>
          <el-button type="primary" @click="handleSubmit">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
