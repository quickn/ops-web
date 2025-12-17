<script setup lang="ts">
// 引入图标组件
import {
  Search,
  Refresh,
  Upload,
  Monitor,
  Box,
  Setting,
  RefreshRight,
  View,
  Notebook,
  Delete,
} from "@element-plus/icons-vue";

import {
  listJarPackages,
  uploadJar,
  getAllAgents,
  deployJar,
  rebuildJar,
  getDeployRecords,
  getDeployStatus,
  deleteJar,
} from "@/api/monitor/jar";
import { JarPackage } from "@/api/monitor/jar/types";

const queryFormRef = ref(ElForm);

const loading = ref(false);
const uploadLoading = ref(false);
const deployLoading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageSize: 10,
  pageNum: 1,
  fileName: "",
  status: undefined as number | undefined,
});

const dataList = ref<JarPackage[]>();
const agentsList = ref<any[]>();
const deployRecords = ref<any[]>();
const deployStatus = ref<any>();

// 上传相关
const uploadDialogVisible = ref(false);
const selectedFile = ref<File>();

// 部署相关
const deployDialogVisible = ref(false);
const currentJarId = ref<number>();
const currentJarName = ref<string>();

// 日志相关
const logsDialogVisible = ref(false);
const statusDialogVisible = ref(false);

const uploadForm = reactive({
  remark: "",
});

const deployForm = reactive({
  agentIds: [] as number[],
  containerNames: [] as string[],
});

/** 查询 */
function handleQuery() {
  loading.value = true;
  listJarPackages(queryParams).then(({ data }) => {
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

/** 显示上传对话框 */
function showUploadDialog() {
  uploadDialogVisible.value = true;
  selectedFile.value = undefined;
  uploadForm.remark = "";
}

/** 文件选择处理 */
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    selectedFile.value = input.files[0];
  }
}

/** 上传JAR包 */
function handleUpload() {
  if (!selectedFile.value) {
    ElMessage.warning("请选择JAR文件");
    return;
  }

  uploadLoading.value = true;
  const formData = new FormData();
  formData.append("file", selectedFile.value);
  formData.append("remark", uploadForm.remark);

  uploadJar(formData)
    .then(() => {
      ElMessage.success("上传成功");
      uploadDialogVisible.value = false;
      handleQuery();
    })
    .finally(() => {
      uploadLoading.value = false;
    });
}

/** 显示部署对话框 */
function showDeployDialog(jar: JarPackage) {
  currentJarId.value = jar.id;
  currentJarName.value = jar.fileName;

  getAllAgents().then(({ data }) => {
    agentsList.value = data.map((agent: any) => ({
      ...agent,
      selected: false,
      selectedContainers: [] as string[],
    }));
    deployForm.agentIds = [];
    deployForm.containerNames = [];
    deployDialogVisible.value = true;
  });
}

/** 处理Agent选择 */
function handleAgentSelection(agent: any) {
  if (!agent.selected) {
    agent.selectedContainers = [];
  }
}

/** 执行部署 */
function handleDeploy() {
  // 收集选择的Agent和容器
  const agentIds: number[] = [];
  const containerNames: string[] = [];

  agentsList.value?.forEach((agent) => {
    if (agent.selected && agent.selectedContainers.length > 0) {
      agent.selectedContainers.forEach((container: string) => {
        agentIds.push(agent.agentId);
        containerNames.push(container);
      });
    }
  });

  if (agentIds.length === 0) {
    ElMessage.error("请选择至少一个部署目标");
    return;
  }

  deployLoading.value = true;
  deployJar(currentJarId.value!, { agentIds, containerNames })
    .then(() => {
      ElMessage.success("开始部署");
      deployDialogVisible.value = false;
      handleQuery();
    })
    .finally(() => {
      deployLoading.value = false;
    });
}

/** 重新部署 */
function redeploy(id: number) {
  ElMessageBox.confirm("确定要重新部署?", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    rebuildJar(id)
      .then(() => {
        ElMessage.success("重新部署指令已执行");
        handleQuery();
      })
      .finally(() => (loading.value = false));
  });
}

/** 查看部署日志 */
function viewDeployLogs(id: number) {
  currentJarId.value = id;
  getDeployRecords(id).then(({ data }) => {
    deployRecords.value = data;
    logsDialogVisible.value = true;
  });
}

/** 查看部署状态 */
function viewDeployStatus(id: number) {
  currentJarId.value = id;
  getDeployStatus(id).then(({ data }) => {
    deployStatus.value = data;
    statusDialogVisible.value = true;
  });
}

/** 删除JAR包 */
function deleteJarPackage(id: number) {
  ElMessageBox.confirm("确定要删除该JAR包?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    deleteJar(id)
      .then(() => {
        ElMessage.success("删除成功");
        handleQuery();
      })
      .finally(() => (loading.value = false));
  });
}

/** 获取状态文本 */
function getStatusText(status: number): string {
  const map: { [key: number]: string } = {
    0: "未部署",
    1: "部署中",
    2: "部署成功",
    3: "部署失败",
  };
  return map[status] || "未知";
}

/** 获取状态类型 */
function getStatusType(status: number): string {
  const map: { [key: number]: string } = {
    0: "info",
    1: "warning",
    2: "success",
    3: "danger",
  };
  return map[status] || "info";
}

onMounted(() => {
  handleQuery();
});
</script>

<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item prop="fileName" label="" style="width: 150px">
          <el-input
            v-model="queryParams.fileName"
            placeholder="文件名"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="状态" prop="status" style="width: 120px">
          <el-select v-model="queryParams.status" placeholder="全部" clearable>
            <el-option label="未部署" :value="0" />
            <el-option label="部署中" :value="1" />
            <el-option label="部署成功" :value="2" />
            <el-option label="部署失败" :value="3" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <el-icon><Search /></el-icon>搜索
          </el-button>
          <el-button @click="resetQuery">
            <el-icon><Refresh /></el-icon>重置
          </el-button>
        </el-form-item>

        <el-form-item style="margin-left: 20px">
          <el-button type="success" @click="showUploadDialog">
            <el-icon><Upload /></el-icon>上传JAR
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
        <el-table-column label="文件名" prop="fileName" width="180" />
        <el-table-column label="版本号" prop="version" width="100">
          <template #default="scope">
            <el-tag type="info">{{ scope.row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" width="150" />
        <el-table-column label="部署目标" width="220">
          <template #default="scope">
            <div v-if="scope.row.agentNames">
              <div style=" margin-bottom: 4px;font-size: 12px; color: #666">
                <el-icon><Monitor /></el-icon>
                {{ scope.row.agentNames.split(",")[0] }}
                <span v-if="scope.row.agentNames.split(',').length > 1">
                  等{{ scope.row.agentNames.split(",").length }}个
                </span>
              </div>
              <div style="font-size: 12px; color: #999">
                <el-icon><Box /></el-icon>
                {{ scope.row.targetContainerNames.split(",")[0] }}
                <span
                  v-if="scope.row.targetContainerNames.split(',').length > 1"
                >
                  等{{ scope.row.targetContainerNames.split(",").length }}个
                </span>
              </div>
            </div>
            <span v-else style=" font-size: 12px;color: #999">未部署</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" prop="createTime" width="160" />
        <el-table-column fixed="right" label="操作" width="250" align="center">
          <template #default="scope">
            <el-button
              v-if="scope.row.status === 0"
              type="primary"
              size="small"
              link
              @click="showDeployDialog(scope.row)"
            >
              <el-icon><Setting /></el-icon>部署
            </el-button>
            <el-button
              v-if="scope.row.status === 2"
              type="warning"
              size="small"
              link
              @click="redeploy(scope.row.id)"
            >
              <el-icon><RefreshRight /></el-icon>重新部署
            </el-button>
            <el-button
              v-if="scope.row.status !== 0"
              type="success"
              size="small"
              link
              @click="viewDeployStatus(scope.row.id)"
            >
              <el-icon><View /></el-icon>状态
            </el-button>
            <el-button
              type="info"
              size="small"
              link
              @click="viewDeployLogs(scope.row.id)"
            >
              <el-icon><Notebook /></el-icon>日志
            </el-button>
            <el-button
              type="danger"
              size="small"
              link
              @click="deleteJarPackage(scope.row.id)"
            >
              <el-icon><Delete /></el-icon>删除
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

    <!-- 上传对话框 -->
    <el-dialog v-model="uploadDialogVisible" title="上传JAR包" width="500px">
      <el-form :model="uploadForm" label-width="80px">
        <el-form-item label="文件" required>
          <input type="file" @change="handleFileChange" accept=".jar" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="uploadForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleUpload"
          :loading="uploadLoading"
        >
          上传
        </el-button>
      </template>
    </el-dialog>

    <!-- 部署对话框 -->
    <el-dialog
      v-model="deployDialogVisible"
      :title="`部署 - ${currentJarName}`"
      width="700px"
    >
      <div
        v-if="!agentsList || agentsList.length === 0"
        style=" padding: 40px 0;text-align: center"
      >
        <el-empty description="暂无可用Agent" />
      </div>

      <div v-else>
        <div
          v-for="agent in agentsList"
          :key="agent.agentId"
          style="margin-bottom: 20px"
        >
          <el-checkbox
            v-model="agent.selected"
            @change="() => handleAgentSelection(agent)"
          >
            <strong>{{ agent.agentName }}</strong>
          </el-checkbox>

          <div
            v-if="agent.selected"
            style=" margin-top: 10px;margin-left: 24px"
          >
            <div style="margin-bottom: 8px; font-size: 12px; color: #666">
              选择容器：
            </div>
            <el-checkbox-group v-model="agent.selectedContainers">
              <div
                v-for="container in agent.containers"
                :key="container.names"
                style="margin-bottom: 8px"
              >
                <el-checkbox :label="container.names">
                  {{ container.names }} ({{ container.image }})
                </el-checkbox>
              </div>
            </el-checkbox-group>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="deployDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleDeploy"
          :loading="deployLoading"
        >
          开始部署
        </el-button>
      </template>
    </el-dialog>

    <!-- 部署状态对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      :title="`部署状态 - ${currentJarName}`"
      width="800px"
    >
      <!-- 状态显示内容 -->
    </el-dialog>

    <!-- 部署日志对话框 -->
    <el-dialog
      v-model="logsDialogVisible"
      :title="`部署日志 - ${currentJarName}`"
      width="900px"
    >
      <!-- 日志显示内容 -->
    </el-dialog>
  </div>
</template>
