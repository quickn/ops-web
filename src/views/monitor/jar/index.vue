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
  Document,
  Edit,
  Plus,
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
  getDockerfile,
  updateDockerfile,
} from "@/api/monitor/jar";
import { JarPackage, DeployTarget } from "@/api/monitor/jar/types";

const queryFormRef = ref(ElForm);

const loading = ref(false);
const uploadLoading = ref(false);
const deployLoading = ref(false);
const redeployLoading = ref(false);
const dockerfileLoading = ref(false);
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

// Dockerfile相关
const dockerfileDialogVisible = ref(false);
const dockerfileContent = ref("");

// 部署相关
const deployDialogVisible = ref(false);
const redeployDialogVisible = ref(false);
const currentJarId = ref<number>();
const currentJarName = ref<string>();

// 部署目标
const deployTargets = ref<DeployTarget[]>([
  {
    agentId: null,
    containerName: "",
    port: "8080",
  },
]);

// 日志相关
const logsDialogVisible = ref(false);
const statusDialogVisible = ref(false);

const uploadForm = reactive({
  remark: "",
});

const redeployForm = reactive({
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

/** 显示Dockerfile对话框 */
function showDockerfileDialog(jar: JarPackage) {
  currentJarId.value = jar.id;
  currentJarName.value = jar.fileName;
  dockerfileContent.value = "";

  dockerfileLoading.value = true;
  getDockerfile(jar.id!)
    .then(({ data }) => {
      dockerfileContent.value = data || getDefaultDockerfile(jar);
      dockerfileDialogVisible.value = true;
    })
    .finally(() => {
      dockerfileLoading.value = false;
    });
}

/** 获取默认Dockerfile */
function getDefaultDockerfile(jar: JarPackage): string {
  return `FROM openjdk:8-jre-slim
MAINTAINER monitor@bszn.com

WORKDIR /app

# 复制JAR文件
COPY app.jar app.jar

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 暴露端口
EXPOSE 8080

# 启动命令
ENTRYPOINT ["java", "-jar", "app.jar"]`;
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

/** 显示首次部署对话框 */
function showDeployDialog(jar: JarPackage) {
  currentJarId.value = jar.id;
  currentJarName.value = jar.fileName;

  // 检查是否已设置Dockerfile
  if (!jar.dockerfileContent || !jar.dockerfileContent.trim()) {
    ElMessage.warning("请先设置Dockerfile");
    showDockerfileDialog(jar);
    return;
  }

  getAllAgents().then(({ data }) => {
    agentsList.value = data;
    // 重置部署目标
    deployTargets.value = [
      {
        agentId: null,
        containerName: "",
        port: "8080",
      },
    ];
    deployDialogVisible.value = true;
  });
}

/** 显示重新部署对话框 */
function showRedeployDialog(jar: JarPackage) {
  currentJarId.value = jar.id;
  currentJarName.value = jar.fileName;

  getAllAgents().then(({ data }) => {
    agentsList.value = data.map((agent: any) => ({
      ...agent,
      selected: false,
      selectedContainers: [] as string[],
    }));

    // 如果jar已有部署目标，可以默认选中
    if (jar.agentIds && jar.targetContainerNames) {
      const existingAgents = jar.agentIds.split(",").map((id) => parseInt(id));
      const existingContainers = jar.targetContainerNames.split(",");

      agentsList.value.forEach((agent) => {
        if (existingAgents.includes(agent.agentId)) {
          agent.selected = true;
          // 找到该agent对应的容器
          const agentContainers = existingContainers.filter(
            (_, index) => existingAgents[index] === agent.agentId
          );
          agent.selectedContainers = agentContainers;
        }
      });
    }

    redeployForm.agentIds = [];
    redeployForm.containerNames = [];
    redeployDialogVisible.value = true;
  });
}

/** 添加部署目标 */
function addDeployTarget() {
  deployTargets.value.push({
    agentId: null,
    containerName: "",
    port: "8080",
  });
}

/** 移除部署目标 */
function removeDeployTarget(index: number) {
  deployTargets.value.splice(index, 1);
}

/** 执行首次部署 */
function handleDeploy() {
  // 验证部署目标
  const agentIds: number[] = [];
  const containerNames: string[] = [];

  for (const target of deployTargets.value) {
    if (!target.agentId) {
      ElMessage.error(
        `第 ${deployTargets.value.indexOf(target) + 1} 行：请选择Agent`
      );
      return;
    }

    if (!target.containerName.trim()) {
      ElMessage.error(
        `第 ${deployTargets.value.indexOf(target) + 1} 行：请输入容器名称`
      );
      return;
    }

    // 检查容器名称是否重复
    if (containerNames.includes(target.containerName.trim())) {
      ElMessage.error(`容器名称重复：${target.containerName}`);
      return;
    }

    agentIds.push(target.agentId);
    containerNames.push(target.containerName.trim());
  }

  if (agentIds.length === 0) {
    ElMessage.error("请至少添加一个部署目标");
    return;
  }

  deployLoading.value = true;
  deployJar(currentJarId.value!, { agentIds, containerNames })
    .then(() => {
      ElMessage.success("开始部署");
      deployDialogVisible.value = false;
      handleQuery();
    })
    .catch((error) => {
      ElMessage.error("部署失败: " + error.response?.data?.msg);
    })
    .finally(() => {
      deployLoading.value = false;
    });
}

/** 执行重新部署 */
function handleRedeploy() {
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

  // 重新部署时可以重新选择目标，也可以使用原有目标
  redeployLoading.value = true;

  // 构建请求参数
  const requestData = agentIds.length > 0 ? { agentIds, containerNames } : null;

  rebuildJar(currentJarId.value!, requestData)
    .then(() => {
      ElMessage.success("开始重新部署");
      redeployDialogVisible.value = false;
      handleQuery();
    })
    .finally(() => {
      redeployLoading.value = false;
    });
}

/** 根据Agent选择自动生成容器名称 */
function generateContainerName(agentId: number, index: number) {
  const agent = agentsList.value?.find((a) => a.agentId === agentId);
  if (
    agent &&
    currentJarName.value &&
    !deployTargets.value[index].containerName
  ) {
    const baseName = currentJarName.value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-");
    const timestamp = new Date().getTime();
    deployTargets.value[
      index
    ].containerName = `${baseName}-${agent.agentName}-${timestamp}`;
  }
}

/** 快捷重新部署（使用原有目标） */
function redeploy(id: number) {
  ElMessageBox.confirm("确定要重新部署到原有容器吗？", "提示", {
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

/** 检查是否已设置Dockerfile */
function hasDockerfile(jar: JarPackage): boolean {
  return !!jar.dockerfileContent && jar.dockerfileContent.trim().length > 0;
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
      >
        <el-table-column label="文件名" prop="fileName" width="180" />
        <el-table-column label="版本号" prop="version" width="100">
          <template #default="scope">
            <el-tag type="info">{{ scope.row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" width="150" />
        <el-table-column label="Dockerfile" width="100" align="center">
          <template #default="scope">
            <el-tag v-if="hasDockerfile(scope.row)" type="success"
              >已设置</el-tag
            >
            <el-tag v-else type="warning">未设置</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="部署目标" width="220">
          <template #default="scope">
            <div v-if="scope.row.agentNames">
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
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
            <span v-else style="font-size: 12px; color: #999">未部署</span>
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
        <el-table-column fixed="right" label="操作" width="320" align="center">
          <template #default="scope">
            <el-button
              v-if="!hasDockerfile(scope.row)"
              type="warning"
              size="small"
              link
              @click="showDockerfileDialog(scope.row)"
            >
              <el-icon><Edit /></el-icon>设置Dockerfile
            </el-button>
            <el-button
              v-else-if="scope.row.status === 0"
              type="primary"
              size="small"
              link
              @click="showDeployDialog(scope.row)"
            >
              <el-icon><Setting /></el-icon>首次部署
            </el-button>
            <el-button
              v-if="scope.row.status === 2"
              type="warning"
              size="small"
              link
              @click="showRedeployDialog(scope.row)"
            >
              <el-icon><RefreshRight /></el-icon>重新部署
            </el-button>
            <el-button
              type="info"
              size="small"
              link
              @click="showDockerfileDialog(scope.row)"
            >
              <el-icon><Document /></el-icon>Dockerfile
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

    <!-- Dockerfile对话框 -->
    <el-dialog
      v-model="dockerfileDialogVisible"
      :title="`Dockerfile - ${currentJarName}`"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-loading="dockerfileLoading">
        <el-alert
          type="info"
          title="首次部署前需要先设置Dockerfile"
          description="重新部署时将只替换JAR包，不需要重新构建Docker镜像"
          show-icon
          style="margin-bottom: 15px"
        />

        <el-form>
          <el-form-item>
            <el-input
              v-model="dockerfileContent"
              type="textarea"
              :rows="20"
              placeholder="请输入Dockerfile内容"
              resize="none"
            />
          </el-form-item>
        </el-form>

        <div style=" margin-top: 10px;font-size: 12px; color: #666">
          提示：JAR文件将通过下载方式提供给Agent，路径为/app/app.jar
        </div>
      </div>

      <template #footer>
        <el-button @click="dockerfileDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleSaveDockerfile"
          :loading="dockerfileLoading"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 首次部署对话框 -->
    <el-dialog
      v-model="deployDialogVisible"
      :title="`首次部署 - ${currentJarName}`"
      width="800px"
    >
      <el-alert
        type="info"
        title="首次部署说明"
        :description="`将根据Dockerfile自动构建镜像并创建新容器`"
        show-icon
        style="margin-bottom: 20px"
      />

      <div style="margin-bottom: 15px">
        <el-button type="primary" @click="addDeployTarget" size="small">
          <el-icon><Plus /></el-icon>添加部署目标
        </el-button>
        <span style="margin-left: 10px; font-size: 12px; color: #666">
          可以选择多个Agent进行部署
        </span>
      </div>

      <el-table :data="deployTargets" border style="margin-bottom: 20px">
        <el-table-column label="序号" width="60" align="center">
          <template #default="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>

        <el-table-column label="Agent" min-width="200">
          <template #default="scope">
            <el-select
              v-model="scope.row.agentId"
              placeholder="选择Agent"
              style="width: 100%"
              @change="
                () => generateContainerName(scope.row.agentId, scope.$index)
              "
            >
              <el-option
                v-for="agent in agentsList"
                :key="agent.agentId"
                :label="`${agent.agentName} (${agent.agentIp}:${agent.agentPort})`"
                :value="agent.agentId"
              >
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                  "
                >
                  <span>{{ agent.agentName }}</span>
                  <span style=" font-size: 12px;color: #999">
                    {{ agent.agentIp }}:{{ agent.agentPort }}
                    <el-tag
                      v-if="!agent.hasContainers"
                      size="small"
                      type="warning"
                      >无容器</el-tag
                    >
                    <el-tag v-else size="small" type="success"
                      >{{ agent.containerCount }}个容器</el-tag
                    >
                  </span>
                </div>
              </el-option>
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="容器名称" min-width="200">
          <template #default="scope">
            <el-input
              v-model="scope.row.containerName"
              placeholder="输入容器名称"
              @blur="scope.row.containerName = scope.row.containerName.trim()"
            />
          </template>
        </el-table-column>

        <el-table-column label="端口" width="120">
          <template #default="scope">
            <el-input v-model="scope.row.port" placeholder="8080" />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" align="center">
          <template #default="scope">
            <el-button
              v-if="deployTargets.length > 1"
              type="danger"
              size="small"
              link
              @click="removeDeployTarget(scope.$index)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div
        style="
          padding: 15px;
          margin-bottom: 20px;
          background: #f5f7fa;
          border-radius: 4px;
        "
      >
        <h4 style="margin-top: 0; color: #409eff">部署说明：</h4>
        <ul style=" padding-left: 20px; margin: 0; font-size: 13px;color: #666">
          <li>系统将根据Dockerfile自动构建Docker镜像</li>
          <li>在每个选中的Agent上创建新的容器</li>
          <li>容器名称必须是唯一的</li>
          <li>默认使用Dockerfile中EXPOSE的端口，如果没有则使用8080</li>
          <li>可以同时部署到多个Agent</li>
        </ul>
      </div>

      <template #footer>
        <el-button @click="deployDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleDeploy"
          :loading="deployLoading"
          :disabled="deployTargets.length === 0"
        >
          开始部署
        </el-button>
      </template>
    </el-dialog>

    <!-- 重新部署对话框 -->
    <el-dialog
      v-model="redeployDialogVisible"
      :title="`重新部署 - ${currentJarName}`"
      width="700px"
    >
      <div
        v-if="!agentsList || agentsList.length === 0"
        style="padding: 40px 0; text-align: center"
      >
        <el-empty description="暂无可用Agent" />
      </div>

      <div v-else>
        <el-alert
          type="info"
          title="重新部署只替换JAR包"
          description="将替换所选容器中的/app/app.jar文件，然后重启容器"
          show-icon
          style="margin-bottom: 15px"
        />

        <div
          v-for="agent in agentsList"
          :key="agent.agentId"
          style="margin-bottom: 20px"
        >
          <el-checkbox
            v-model="agent.selected"
            @change="
              () => {
                if (!agent.selected) agent.selectedContainers = [];
              }
            "
          >
            <strong>{{ agent.agentName }}</strong>
            <span style="margin-left: 10px; font-size: 12px; color: #666">
              ({{ agent.agentIp }}:{{ agent.agentPort }})
            </span>
          </el-checkbox>

          <div
            v-if="agent.selected"
            style="margin-top: 10px; margin-left: 24px"
          >
            <div style="margin-bottom: 8px; font-size: 12px; color: #666">
              选择要更新的容器：
            </div>
            <el-checkbox-group v-model="agent.selectedContainers">
              <div
                v-for="container in agent.containers"
                :key="container.names"
                style="margin-bottom: 8px"
              >
                <el-checkbox :label="container.names">
                  {{ container.names }} ({{ container.image }})
                  <el-tag
                    size="mini"
                    :type="
                      container.status.includes('Up') ? 'success' : 'danger'
                    "
                  >
                    {{ container.status.includes("Up") ? "运行中" : "已停止" }}
                  </el-tag>
                </el-checkbox>
              </div>
            </el-checkbox-group>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="redeployDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleRedeploy"
          :loading="redeployLoading"
        >
          重新部署
        </el-button>
      </template>
    </el-dialog>

    <!-- 部署状态对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      :title="`部署状态 - ${currentJarName}`"
      width="800px"
    >
      <div v-if="deployStatus">
        <el-row :gutter="20" style="margin-bottom: 20px">
          <el-col :span="6">
            <div style="text-align: center">
              <div style="font-size: 24px; font-weight: bold; color: #409eff">
                {{ deployStatus.total || 0 }}
              </div>
              <div style=" font-size: 12px;color: #666">总部署数</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div style="text-align: center">
              <div style="font-size: 24px; font-weight: bold; color: #67c23a">
                {{ deployStatus.success || 0 }}
              </div>
              <div style=" font-size: 12px;color: #666">成功</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div style="text-align: center">
              <div style="font-size: 24px; font-weight: bold; color: #f56c6c">
                {{ deployStatus.failed || 0 }}
              </div>
              <div style=" font-size: 12px;color: #666">失败</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div style="text-align: center">
              <div style="font-size: 24px; font-weight: bold; color: #e6a23c">
                {{ deployStatus.deploying || 0 }}
              </div>
              <div style=" font-size: 12px;color: #666">部署中</div>
            </div>
          </el-col>
        </el-row>

        <el-table :data="deployStatus.deployRecords" border>
          <el-table-column label="Agent" width="150">
            <template #default="scope">
              {{ scope.row.agentName }}
            </template>
          </el-table-column>
          <el-table-column label="容器" width="150">
            <template #default="scope">
              {{ scope.row.containerName }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="部署时间" width="180">
            <template #default="scope">
              {{ scope.row.deployTime || scope.row.createTime }}
            </template>
          </el-table-column>
          <el-table-column label="日志">
            <template #default="scope">
              <div style="max-height: 60px; overflow-y: auto; font-size: 12px">
                {{ scope.row.deployLog }}
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 部署日志对话框 -->
    <el-dialog
      v-model="logsDialogVisible"
      :title="`部署日志 - ${currentJarName}`"
      width="900px"
    >
      <div v-if="deployRecords && deployRecords.length > 0">
        <el-table :data="deployRecords" border>
          <el-table-column label="时间" width="180">
            <template #default="scope">
              {{ scope.row.deployTime || scope.row.createTime }}
            </template>
          </el-table-column>
          <el-table-column label="Agent" width="150">
            <template #default="scope">
              {{ scope.row.agentName }}
            </template>
          </el-table-column>
          <el-table-column label="容器" width="150">
            <template #default="scope">
              {{ scope.row.containerName }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="日志">
            <template #default="scope">
              <pre
                style="
                  max-height: 200px;
                  margin: 0;
                  overflow-y: auto;
                  font-family: monospace;
                  font-size: 12px;
                "
                >{{ scope.row.deployLog }}
              </pre>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div v-else style=" padding: 40px 0;text-align: center">
        <el-empty description="暂无部署记录" />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.agent-info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.agent-name {
  font-weight: bold;
}

.agent-detail {
  font-size: 12px;
  color: #666;
}
</style>
