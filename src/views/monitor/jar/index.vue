<script setup lang="ts">
import {
  listJarPackages,
  uploadJar,
  initialBuild,
  rebuildJar,
  deleteJar,
  getDeployRecords,
  getDeployStatus,
  getAvailableAgents,
} from "@/api/monitor/jar";
import { listAll } from "@/api//monitor/service";
import { JarPackage } from "@/api/monitor/jar/types";
import { ServiceInfo } from "@/api/monitor/service/types";
import type { UploadProps, UploadUserFile } from "element-plus";

// 引入图标
import {
  Search,
  Refresh,
  Upload,
  Document,
  Monitor,
  Box,
  View,
  Notebook,
  Delete,
  UploadFilled,
  SuccessFilled,
  CircleCloseFilled,
  RefreshRight,
} from "@element-plus/icons-vue";

const queryFormRef = ref(ElForm);
const uploadFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);

const queryParams = reactive<JarPackage>({
  pageSize: 10,
  pageNum: 1,
  serviceId: undefined,
  fileName: "",
  status: undefined,
});

const dataList = ref<JarPackage[]>();
const serviceInfoList = ref<ServiceInfo[]>();
const availableAgents = ref<any[]>([]);
const deployRecords = ref<any[]>([]);
const deployStatus = ref<any>(null);

// 上传相关
const uploadDialogVisible = ref(false);
const uploadLoading = ref(false);
const selectedFile = ref<UploadUserFile>();
const currentJarId = ref<number>();

// 部署状态弹窗
const statusDialogVisible = ref(false);
const logsDialogVisible = ref(false);

const uploadForm = reactive({
  remark: "",
  serviceId: undefined as number | undefined,
  agentIds: [] as number[],
  containerNames: [] as string[],
});

// 上传文件处理
const handleFileChange: UploadProps["onChange"] = (uploadFile) => {
  selectedFile.value = uploadFile;
};

const beforeUpload: UploadProps["beforeUpload"] = (rawFile) => {
  if (!rawFile.name.endsWith(".jar")) {
    ElMessage.error("只能上传JAR文件");
    return false;
  }
  if (rawFile.size > 1024 * 1024 * 1024) {
    // 1GB
    ElMessage.error("文件大小不能超过1GB");
    return false;
  }
  return true;
};

/** 查询JAR包列表 */
function handleQuery() {
  loading.value = true;
  listJarPackages(queryParams).then(({ data }) => {
    dataList.value = data.records;
    total.value = data.total;
    loading.value = false;
  });

  // 获取服务列表
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

/** 服务选择变化时获取可用Agent */
function handleServiceChange(serviceId: number) {
  if (serviceId) {
    getAvailableAgents(serviceId).then(({ data }) => {
      availableAgents.value = data.map((agent: any) => ({
        ...agent,
        selected: false,
        selectedContainers: [] as string[],
      }));
    });
  } else {
    availableAgents.value = [];
  }
}

/** 显示上传对话框 */
function showUploadDialog() {
  uploadDialogVisible.value = true;
  uploadForm.remark = "";
  uploadForm.serviceId = undefined;
  uploadForm.agentIds = [];
  uploadForm.containerNames = [];
  availableAgents.value = [];
  selectedFile.value = undefined;
}

/** 处理Agent选择 */
function handleAgentSelection(agent: any) {
  if (!agent.selected) {
    agent.selectedContainers = [];
  }
}

/** 上传JAR包 */
function handleUpload() {
  if (!selectedFile.value) {
    ElMessage.warning("请选择JAR文件");
    return;
  }

  uploadFormRef.value.validate((valid: boolean) => {
    if (!valid) return;

    // 收集选择的Agent和容器
    const agentIds: number[] = [];
    const containerNames: string[] = [];

    availableAgents.value.forEach((agent) => {
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

    uploadLoading.value = true;
    const formData = new FormData();
    formData.append("file", selectedFile.value!.raw!);
    formData.append("remark", uploadForm.remark);
    formData.append("serviceId", String(uploadForm.serviceId));
    formData.append("agentIds", agentIds.join(","));
    formData.append("containerNames", containerNames.join(","));

    uploadJar(formData)
      .then(() => {
        ElMessage.success("上传成功");
        uploadDialogVisible.value = false;
        handleQuery();
      })
      .finally(() => {
        uploadLoading.value = false;
      });
  });
}

/** 初构建 */
function handleInitialBuild(id: number) {
  ElMessageBox.confirm("确认进行初构建部署？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    initialBuild(id)
      .then(() => {
        ElMessage.success("开始部署");
        // 开始轮询状态
        setTimeout(() => checkDeployStatus(id), 2000);
      })
      .finally(() => {
        loading.value = false;
      });
  });
}

/** 重新构建 */
function handleRebuild(id: number) {
  ElMessageBox.confirm("确认重新构建部署？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    rebuildJar(id)
      .then(() => {
        ElMessage.success("开始重新部署");
        // 开始轮询状态
        setTimeout(() => checkDeployStatus(id), 2000);
      })
      .finally(() => {
        loading.value = false;
      });
  });
}

/** 检查部署状态 */
function checkDeployStatus(id: number) {
  getDeployStatus(id).then(({ data }) => {
    // 更新列表中的状态
    const jar = dataList.value?.find((j) => j.id === id);
    if (jar) {
      jar.status = data.status;

      // 如果还在部署中，继续轮询
      if (jar.status === 1) {
        setTimeout(() => checkDeployStatus(id), 3000);
      }
    }
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

/** 查看部署日志 */
function viewDeployLogs(id: number) {
  currentJarId.value = id;
  getDeployRecords(id).then(({ data }) => {
    deployRecords.value = data;
    logsDialogVisible.value = true;
  });
}

/** 删除JAR包 */
function handleDelete(id: number) {
  ElMessageBox.confirm("确认删除该JAR包？", "警告", {
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
      .finally(() => {
        loading.value = false;
      });
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
        <el-form-item label="服务" prop="serviceId">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="全部"
            clearable
            style="width: 120px"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.id"
              :label="item.serviceName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

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
            <el-option label="已部署" :value="2" />
            <el-option label="部署失败" :value="3" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <el-icon>
              <Search />
            </el-icon>
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <el-icon>
              <Refresh />
            </el-icon>
            重置
          </el-button>
        </el-form-item>

        <el-form-item style="margin-left: 20px">
          <el-button type="success" @click="showUploadDialog">
            <el-icon>
              <Upload />
            </el-icon>
            上传JAR
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
        @selection-change="
          (selection) => (ids = selection.map((item) => item.id))
        "
      >
        <!-- <el-table-column type="selection" width="55" align="center" /> -->
        <el-table-column label="文件名" prop="fileName" width="150" />
        <el-table-column label="版本号" prop="version" width="100">
          <template #default="scope">
            <el-tag type="info">{{ scope.row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" width="150" />
        <el-table-column label="服务" prop="serviceName" width="120" />
        <el-table-column label="部署目标" width="200">
          <template #default="scope">
            <div v-if="scope.row.agentNames">
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                <el-icon>
                  <Monitor />
                </el-icon>
                {{ scope.row.agentNames.split(",")[0] }}
                <span v-if="scope.row.agentNames.split(',').length > 1">
                  等{{ scope.row.agentNames.split(",").length }}个
                </span>
              </div>
              <div style="font-size: 12px; color: #999">
                <el-icon>
                  <Box />
                </el-icon>
                {{ scope.row.targetContainerNames.split(",")[0] }}
                <span
                  v-if="scope.row.targetContainerNames.split(',').length > 1"
                >
                  等{{ scope.row.targetContainerNames.split(",").length }}个
                </span>
              </div>
            </div>
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
              @click="handleInitialBuild(scope.row.id)"
            >
              <el-icon />
              初构建
            </el-button>
            <el-button
              v-if="scope.row.status === 2"
              type="warning"
              size="small"
              link
              @click="handleRebuild(scope.row.id)"
            >
              <el-icon>
                <RefreshRight />
              </el-icon>
              重新构建
            </el-button>
            <el-button
              v-if="scope.row.status !== 0"
              type="success"
              size="small"
              link
              @click="viewDeployStatus(scope.row.id)"
            >
              <el-icon>
                <View />
              </el-icon>
              状态
            </el-button>
            <el-button
              type="info"
              size="small"
              link
              @click="viewDeployLogs(scope.row.id)"
            >
              <el-icon>
                <Notebook />
              </el-icon>
              日志
            </el-button>
            <el-button
              type="danger"
              size="small"
              link
              @click="handleDelete(scope.row.id)"
            >
              <el-icon>
                <Delete />
              </el-icon>
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

    <!-- 上传JAR包对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传JAR包"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="uploadFormRef"
        :model="uploadForm"
        label-width="100px"
        :rules="{
          serviceId: [
            { required: true, message: '请选择服务', trigger: 'change' },
          ],
        }"
      >
        <el-form-item label="文件">
          <el-upload
            class="upload-demo"
            drag
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleFileChange"
            :before-upload="beforeUpload"
            accept=".jar"
          >
            <el-icon class="el-icon--upload">
              <UploadFilled />
            </el-icon>
            <div class="el-upload__text">
              将JAR文件拖到此处，或<em>点击选择</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持上传JAR格式文件，单个文件不超过1GB
              </div>
            </template>
          </el-upload>
          <div v-if="selectedFile" style="margin-top: 10px">
            <el-tag type="success">
              <el-icon>
                <Document />
              </el-icon>
              {{ selectedFile.name }}
            </el-tag>
          </div>
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="uploadForm.remark"
            placeholder="请输入备注信息"
            type="textarea"
            :rows="2"
          />
        </el-form-item>

        <el-form-item label="服务" prop="serviceId" required>
          <el-select
            v-model="uploadForm.serviceId"
            placeholder="请选择服务"
            style="width: 100%"
            @change="handleServiceChange"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.id"
              :label="item.serviceName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="部署目标" required>
          <div
            v-if="!uploadForm.serviceId"
            style="font-size: 12px; color: #999"
          >
            请先选择服务
          </div>
          <div
            v-else-if="availableAgents.length === 0"
            style="font-size: 12px; color: #999"
          >
            该服务暂无可用Agent
          </div>
          <div v-else class="agent-selection">
            <div
              v-for="agent in availableAgents"
              :key="agent.agentId"
              class="agent-item"
            >
              <el-checkbox
                v-model="agent.selected"
                :label="agent.agentName"
                @change="() => handleAgentSelection(agent)"
              >
                <div style="display: flex; gap: 8px; align-items: center">
                  <el-icon>
                    <Monitor />
                  </el-icon>
                  <strong>{{ agent.agentName }}</strong>
                  <span style="font-size: 12px; color: #999"
                    >({{ agent.ip }})</span
                  >
                </div>
              </el-checkbox>

              <div v-if="agent.selected" class="container-selection">
                <div
                  style="margin: 8px 0 4px 24px; font-size: 12px; color: #666"
                >
                  选择容器：
                </div>
                <el-checkbox-group v-model="agent.selectedContainers">
                  <div
                    v-for="container in agent.containers"
                    :key="container.names"
                    class="container-item"
                  >
                    <el-checkbox :label="container.names">
                      <div style="margin-left: 8px">
                        <div
                          style="display: flex; gap: 6px; align-items: center"
                        >
                          <el-icon>
                            <Box />
                          </el-icon>
                          <span>{{ container.names }}</span>
                        </div>
                        <div
                          style="margin-top: 2px; font-size: 12px; color: #999"
                        >
                          {{ container.image }}
                        </div>
                      </div>
                    </el-checkbox>
                  </div>
                </el-checkbox-group>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-form-item
          v-if="
            availableAgents.some(
              (a) => a.selected && a.selectedContainers.length > 0
            )
          "
        >
          <div style="font-size: 12px; color: #666">
            已选择
            {{
              availableAgents.reduce(
                (sum, a) => sum + a.selectedContainers.length,
                0
              )
            }}
            个部署目标
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            @click="handleUpload"
            :loading="uploadLoading"
            :disabled="!selectedFile"
          >
            上传
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 部署状态对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      :title="`部署状态 - ${
        dataList?.find((j) => j.id === currentJarId)?.fileName
      }`"
      width="800px"
    >
      <div v-if="deployStatus">
        <el-row :gutter="20" style="margin-bottom: 20px">
          <el-col :span="6">
            <el-statistic title="总目标" :value="deployStatus.total || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="成功" :value="deployStatus.success || 0">
              <template #prefix>
                <el-icon style="color: #67c23a">
                  <SuccessFilled />
                </el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="失败" :value="deployStatus.failed || 0">
              <template #prefix>
                <el-icon style="color: #f56c6c">
                  <CircleCloseFilled />
                </el-icon>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-progress
              type="dashboard"
              :percentage="deployStatus.progress || 0"
              :color="deployStatus.progress === 100 ? '#67c23a' : '#409eff'"
            />
          </el-col>
        </el-row>

        <el-table :data="deployStatus.deployRecords" size="small">
          <el-table-column prop="agentId" label="Agent ID" width="100" />
          <el-table-column prop="containerName" label="容器" width="150" />
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag
                :type="
                  row.status === 2
                    ? 'success'
                    : row.status === 3
                    ? 'danger'
                    : 'warning'
                "
                size="small"
              >
                {{
                  row.status === 2
                    ? "成功"
                    : row.status === 3
                    ? "失败"
                    : "部署中"
                }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="deployTime" label="时间" width="140" />
          <el-table-column prop="deployLog" label="日志">
            <template #default="{ row }">
              <div style="max-width: 300px; font-size: 12px; color: #666">
                {{
                  row.deployLog
                    ? row.deployLog.substring(0, 100) +
                      (row.deployLog.length > 100 ? "..." : "")
                    : "无"
                }}
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 部署日志对话框 -->
    <el-dialog
      v-model="logsDialogVisible"
      :title="`部署日志 - ${
        dataList?.find((j) => j.id === currentJarId)?.fileName
      }`"
      width="900px"
    >
      <div v-if="deployRecords.length > 0">
        <el-collapse>
          <el-collapse-item
            v-for="record in deployRecords"
            :key="record.id"
            :title="`${record.containerName} (Agent: ${record.agentId})`"
          >
            <div style="padding: 10px; background: #f5f5f5; border-radius: 4px">
              <div
                style="
                  display: flex;
                  gap: 10px;
                  align-items: center;
                  margin-bottom: 10px;
                "
              >
                <el-tag
                  :type="
                    record.status === 2
                      ? 'success'
                      : record.status === 3
                      ? 'danger'
                      : 'warning'
                  "
                  size="small"
                >
                  {{
                    record.status === 2
                      ? "成功"
                      : record.status === 3
                      ? "失败"
                      : "部署中"
                  }}
                </el-tag>
                <span style="font-size: 12px; color: #999">
                  {{ record.deployTime }}
                </span>
              </div>
              <pre
                style="
                  margin: 0;
                  font-family: monospace;
                  font-size: 12px;
                  word-wrap: break-word;
                  white-space: pre-wrap;
                "
                >{{ record.deployLog || "暂无日志" }}
              </pre>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
      <div v-else style="padding: 40px 0; text-align: center">
        <el-empty description="暂无部署日志" />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.search-container {
  margin-bottom: 16px;
}

.agent-selection {
  max-height: 300px;
  padding: 10px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.agent-item {
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.agent-item:last-child {
  border-bottom: none;
}

.container-selection {
  margin-top: 8px;
  margin-left: 24px;
}

.container-item {
  padding: 4px 0;
  margin: 4px 0;
}

.upload-demo {
  width: 100%;
}

:deep(.el-upload-dragger) {
  width: 100%;
}
</style>
