<template>
  <div class="app-container">
    <div class="search-container">
      <el-form
        ref="queryFormRef"
        :model="queryParams"
        :inline="true"
        @submit.prevent
        @keyup.enter="handleQuery"
        style="display: flex; flex-wrap: wrap; align-items: center"
      >
        <el-form-item prop="keywords">
          <el-input
            v-model="queryParams.name"
            placeholder="应用名称"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery"
            ><i-ep-search />搜索</el-button
          >
          <el-button @click="resetQuery"><i-ep-refresh />重置</el-button>
        </el-form-item>

        <el-form-item label="" style="margin-left: auto">
          <el-button
            type="success"
            @click="openDialog()"
          >
            <i-ep-plus />
            新增
          </el-button>
          <el-button
            type="success"
            @click="backupDialog()"
          >
            <i-ep-collection />
            备份
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
        <el-table-column
          label="应用名称"
          prop="name"
          width="150"
          align="center"
        />
        <el-table-column
          label="源目录"
          prop="sourceDir"
          width="150"
          align="center"
        />
        <el-table-column
          label="目标目录"
          prop="targetDir"
          width="150"
          align="center"
        />
        <el-table-column label="描述" prop="remark" align="center" />
        <el-table-column
          label="状态"
          prop="createTime"
          width="100"
          align="center"
        >
          <template #default="scope">
            <el-tag v-if="scope.row.status == 0" type="info">未部署</el-tag>
            <el-tag v-if="scope.row.status == 1" type="warning">部署中</el-tag>
            <el-tag v-if="scope.row.status == 2" type="success"
              >部署成功</el-tag
            >
            <el-tag v-if="scope.row.status == 3" type="danger">部署失败</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          prop="createTime"
          width="180"
          align="center"
        />
        <el-table-column fixed="right" label="操作" width="400" align="center">
          <template #default="scope">
            <el-button
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
              link
              size="small"
              @click.stop="showDockerfileDialog(scope.row, 1)"
            >
              <i-ep-edit />
              部署
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="setDockerfileDialog(scope.row)"
            >
              <i-ep-edit />
              配置文件
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="openDeployDialog(scope.row)"
            >
              <i-ep-edit />
              查看日志
            </el-button>
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
    <el-dialog
      v-model="backupEdit.visible"
      title="备份"
      width="500px"
      @closed="closeBackupDialog"
    >
      <el-form
        ref="deptFormRef"
        :model="formBackupData"
        :rules="backupRules"
        label-width="80px"
      >
        <el-form-item label="源目录" prop="sourceDir">
          <el-input
            v-model="formBackupData.sourceDir"
            placeholder="源目录"
            style="width: 300px"
          />
        </el-form-item>
        <el-form-item label="目标目录" prop="targetDir">
          <el-input
            v-model="formBackupData.targetDir"
            placeholder="目标目录"
            style="width: 300px"
          />
        </el-form-item>
        <el-form-item label="环境" prop="serviceId">
          <el-select
            v-model="formBackupData.serviceId"
            filterable
            size="default"
            style="width: 300px"
          >
            <el-option
              v-for="(item, index) in serviceInfoList"
              :value="item.id"
              :label="item.name"
              :key="index"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handlebackupSubmit(1)"
            >备份</el-button
          >
          <el-button type="primary" @click="handlebackupSubmit(2)"
            >恢复</el-button
          >
          <el-button @click="closeBackupDialog"> 取 消</el-button>
        </div>
      </template>
    </el-dialog>
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
        label-width="100px"
      >
        <el-form-item label="应用名称" prop="name">
          <el-input
            v-model="formData.name"
            :disabled="!addStatus"
            placeholder="接口名"
          />
        </el-form-item>
        <el-form-item label="源文件目录" prop="sourceDir">
          <el-input v-model="formData.sourceDir" placeholder="源文件目录" />
        </el-form-item>
        <el-form-item label="指向目录" prop="targetDir">
          <el-input v-model="formData.targetDir" placeholder="指向目录" />
        </el-form-item>
        <el-form-item label="应用类型" prop="type">
          <el-select v-model="formData.type" filterable size="default">
            <el-option :value="1" label="Java" />
            <el-option :value="2" label="docker" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="remark">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="4"
            placeholder="链接"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleSubmit"> 确 定</el-button>
          <el-button @click="closeDialog"> 取 消</el-button>
        </div>
      </template>
    </el-dialog>
    <el-dialog v-model="deployEdit.visible" title="日志" width="1400px">
      <el-table
        ref="dataTableRef"
        :data="deployArr"
        highlight-current-row
        border
        height="600px"
      >
        <!-- <el-table-column label="操作人" prop="hostname" align="center" /> -->
        <el-table-column
          label="时间"
          prop="deployTime"
          align="center"
          width="180"
        />
        <el-table-column
          label="Agent"
          prop="agentIp"
          align="center"
          width="120"
        />
        <el-table-column
          label="容器"
          prop="containerName"
          align="center"
          width="80"
        />
        <el-table-column label="状态" align="center" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.status == 2" type="success"
              >部署成功</el-tag
            >
            <el-tag v-if="scope.row.status == 0" type="info">待部署</el-tag>
            <el-tag v-if="scope.row.status == 1" type="warning">部署中</el-tag>
            <el-tag v-if="scope.row.status == 3" type="danger">部署失败</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="日志" prop="deployLog" align="center" />
      </el-table>
      <template #footer>
        <div class="dialog-footer" style="text-align: center">
          <el-button type="primary" @click="deployEdit.visible = false">
            确 定</el-button
          >
        </div>
      </template>
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
import {
  listData,
  deleteByIds,
  addData,
  putData,
  deployList,
  backup,
} from "@/api/monitor/project";
import { LogInfo } from "@/api/monitor/log/types";
import { ServiceInfo } from "@/api/monitor/service/types";
defineOptions({
  name: "ProjectPage",
  inheritAttrs: false,
});
import { listAll } from "@/api/monitor/agent";
const emit = defineEmits(["setData", "changePage"]);
const queryFormRef = ref(ElForm);
const loading = ref(false);
const addStatus = ref(true);
const ids = ref<number[]>([]);
const total = ref(0);
const deptFormRef = ref(ElForm);
const queryParams = reactive<LogInfo>({ pageSize: 10, pageNum: 1 });
const hostList = ref<ServiceInfo[]>([]);
const deployEdit = reactive<DialogOption>({
  visible: false,
});
const deployArr = ref<LogInfo[]>();
const dataList = ref<LogInfo[]>();
// Dockerfile相关
const dockerfileDialogVisible = ref(false);
const dockerfileLoading = ref(false);
const currentJarName = ref<string>();
const serviceInfoList = ref<ServiceInfo[]>();
const dialogEdit = reactive<DialogOption>({
  visible: false,
});
const backupEdit = reactive<DialogOption>({
  visible: false,
});
const formData = reactive<HeathMonitor>({
  name: undefined,
  type: undefined,
  remark: undefined,
  sourceDir: undefined,
  targetDir: undefined,
});
const formBackupData = reactive<HeathMonitor>({
  sourceDir: "/home/park/docker",
  targetDir: "/home/park/docker_bak",
  serviceId: undefined,
});
const rules = reactive({
  name: [{ required: true, message: "请输入应用名称", trigger: "blur" }],
  remark: [{ required: false, message: "请输入描述", trigger: "blur" }],
});
const backupRules = reactive({
  sourceDir: [{ required: true, message: "请输入源目录", trigger: "blur" }],
  targetDir: [{ required: false, message: "请输入目标目录", trigger: "blur" }],
  serviceId: [{ required: true, message: "请选择服务", trigger: "change" }],
});
/** 查询 */
function handleQuery() {
  loading.value = true;
  listData(queryParams).then(({ data }) => {
    dataList.value = data.records;
    total.value = data.total;
    loading.value = false;
  });
}
/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  queryParams.pageSize = 10;
  queryParams.name = "";
  handleQuery();
}
function fetchHostList() {
  // 假设有一个API可以获取主机列表
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
  });
}
/** 行checkbox 选中事件 */
function handleSelectionChange(selection: any) {
  ids.value = selection.map((item: any) => item.id);
}
async function openDialog(data?: HeathMonitor) {
  if (data) {
    addStatus.value = false;
    dialogEdit.visible = true;
    dialogEdit.title = "编辑";
    Object.assign(formData, data);
  } else {
    addStatus.value = true;
    dialogEdit.title = "新增";
    if (formData) {
      formData.name = undefined;
      formData.remark = undefined;
    }
    dialogEdit.visible = true;
  }
}

function backupDialog() {
  backupEdit.visible = true;
}

/** 关闭弹窗 */
function closeDialog() {
  dialogEdit.visible = false;
  resetForm();
}

function closeBackupDialog() {
  backupEdit.visible = false;
}
function resetForm() {
  deptFormRef.value.resetFields();
  deptFormRef.value.clearValidate();
  formData.name = "";
  formData.remark = "";
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
async function handleSubmit() {
  deptFormRef.value.validate((valid: any) => {
    if (valid) {
      if (addStatus.value) {
        addData(formData)
          .then(() => {
            ElMessage.success("新增成功");
            closeDialog();
            handleQuery();
          })
          .finally(() => (loading.value = false));
      } else {
        putData(formData)
          .then(() => {
            ElMessage.success("修改成功");
            closeDialog();
            handleQuery();
          })
          .finally(() => (loading.value = false));
      }
    }
  });
}
async function handlebackupSubmit(index) {
  backupEdit.visible = false;
  formBackupData.type = index;
  backup(formBackupData)
    .then(() => {
      ElMessage.success("备份成功");
      handleQuery();
    })
    .finally(() => (loading.value = false));
}
/** 保存Dockerfile */
function handleSaveDockerfile() {
  if (!dockerfileContent.value.trim()) {
    ElMessage.warning("Dockerfile内容不能为空");
    return;
  }

  dockerfileLoading.value = true;
  updateDockerfile(currentJarId.value!, dockerfileContent.value)
    .then(() => {
      ElMessage.success("Dockerfile保存成功");
      dockerfileDialogVisible.value = false;
      handleQuery();
    })
    .finally(() => {
      dockerfileLoading.value = false;
    });
}

/** 保存Docker Compose */
function handleSaveDockerCompose() {
  if (!dockerComposeContent.value.trim()) {
    ElMessage.warning("Docker Compose内容不能为空");
    return;
  }

  dockerComposeLoading.value = true;
  updateDockerCompose(currentJarId.value!, dockerComposeContent.value)
    .then(() => {
      ElMessage.success("Docker Compose保存成功");
      dockerComposeDialogVisible.value = false;
      handleQuery();
    })
    .finally(() => {
      dockerComposeLoading.value = false;
    });
}
function showDockerfileDialog(row, index) {
  // dockerfileContent.value = "";
  // dockerfileLoading.value = true;
  // if (row.dockerfileContent && row.dockerfileContent.trim()) {
  // 	dockerfileContent.value = row.dockerfileContent;
  // } else {
  // 	// 否则生成默认的Dockerfile，使用正确的JAR文件名
  // 	dockerfileContent.value = getDefaultDockerfile(row.dockerfileContent);
  // }
  // dockerfileDialogVisible.value = true;
  // dockerfileLoading.value = false;
  let _param = row;
  if (index) {
    _param.index = index;
  } else {
    _param.index = null;
  }
  emit("setData", _param);
  emit("changePage", "deploy");
}
function setDockerfileDialog(row) {
  let _param = row;
  emit("setData", _param);
  emit("changePage", "set");
}

function openDeployDialog(row) {
  deployList({ id: row.id }).then(({ data }) => {
    deployArr.value = data;
    deployEdit.visible = true;
  });
}

// 只在组件首次创建时加载数据，keep-alive 缓存后再次进入不会刷新
onMounted(() => {
  fetchHostList();
  handleQuery();
});
</script>
