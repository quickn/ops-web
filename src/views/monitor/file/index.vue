<template>
  <div class="app-container">
    <el-card shadow="never">
      <!-- 文件同步控制台 -->
      <div>
        <el-row :gutter="20" class="console-content">
          <!-- 左侧：跳板机配置 -->
          <el-col :span="12">
            <div class="console-card">
              <h4 class="card-title">
                <i-ep-monitor />
                跳板机配置
              </h4>

              <el-form :model="formData" label-width="100px" class="mt-4">
                <el-form-item label="选择跳板机">
                  <el-select
                    v-model="formData.agentId"
                    placeholder="请选择跳板机"
                    clearable
                    style="width: 100%"
                    @change="handleJumpServerChange"
                  >
                    <el-option
                      v-for="server in jumpServers"
                      :key="server.id"
                      :label="`${server.hostname} (${server.serviceName})`"
                      :value="server.id"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="浏览路径">
                  <el-input
                    v-model="formData.path"
                    placeholder="/home/park"
                    @change="handlePathChange"
                  >
                    <template #append>
                      <el-button @click="loadFileList">
                        <i-ep-search />
                      </el-button>
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item label="源文件路径">
                  <el-input
                    v-model="formData.sourcePath"
                    placeholder="/home/park/file"
                    @change="handleSourcePathChange"
                  />
                </el-form-item>

                <el-form-item label="目标路径">
                  <el-input
                    v-model="formData.targetPath"
                    placeholder="/home/park"
                  />
                </el-form-item>
              </el-form>

              <!-- 文件上传区域 -->
              <div class="upload-section mt-4">
                <h5 class="section-title">
                  <i-ep-upload />
                  文件上传
                </h5>
                <div class="upload-area">
                  <input
                    type="file"
                    @change="handleFileChange"
                    class="upload-input"
                  />
                  <el-button
                    type="primary"
                    :loading="uploadLoading"
                    @click="handleFileUpload"
                    class="upload-btn"
                  >
                    <i-ep-upload />
                    上传到跳板机
                  </el-button>
                </div>
              </div>

              <!-- 文件列表 -->
              <div class="file-section mt-4">
                <h5 class="section-title">
                  <i-ep-folder />
                  文件列表
                </h5>
                <el-table
                  v-loading="fileLoading"
                  :data="fileList"
                  height="300"
                  border
                  class="file-table"
                  @row-click="handleFileClick"
                >
                  <el-table-column prop="name" label="文件名" width="150" />
                  <el-table-column prop="type" label="类型" width="80">
                    <template #default="scope">
                      <el-tag
                        v-if="scope.row.type === 'directory'"
                        type="success"
                        size="small"
                      >
                        目录
                      </el-tag>
                      <el-tag v-else type="info" size="small">文件</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="size" label="大小" width="100" />
                  <el-table-column prop="modifyTime" label="修改时间" />
                </el-table>
              </div>
            </div>
          </el-col>

          <!-- 右侧：同步操作 -->
          <el-col :span="12">
            <div class="console-card">
              <h4 class="card-title">
                <i-ep-position />
                同步操作
              </h4>

              <!-- 目标服务器选择 -->
              <div class="target-section">
                <h5 class="section-title">
                  <i-ep-set-up />
                  目标服务器 (已选择 {{ selectedServers.length }} 台)
                </h5>
                <div class="target-info mb-2">
                  <el-button
                    v-if="dataList.length > 0"
                    type="primary"
                    size="small"
                    @click="selectAllServers"
                  >
                    全选
                  </el-button>
                  <el-button type="info" size="small" @click="clearSelection">
                    清空
                  </el-button>
                  <el-button
                    type="success"
                    size="small"
                    @click="buildSyncCommandFunc"
                    :disabled="
                      !formData.agentId ||
                      !formData.sourcePath ||
                      selectedServers.length === 0
                    "
                  >
                    构建同步命令
                  </el-button>
                  <el-button
                    type="warning"
                    size="small"
                    @click="executeSyncCommand"
                    :loading="syncLoading"
                    :disabled="!formData.agentId || !formData.command"
                  >
                    执行同步
                  </el-button>
                </div>
                <el-table
                  ref="targetTableRef"
                  :data="dataList"
                  height="150"
                  @selection-change="handleSelectionChange"
                  class="target-table"
                >
                  <el-table-column type="selection" width="55" />
                  <el-table-column label="主机名" prop="hostname" />
                  <el-table-column label="服务" prop="serviceName" />
                  <el-table-column label="状态" width="80">
                    <template #default="scope">
                      <el-tag
                        v-if="scope.row.isMonitor"
                        type="success"
                        size="small"
                      >
                        在线
                      </el-tag>
                      <el-tag v-else type="info" size="small">离线</el-tag>
                    </template>
                  </el-table-column>
                  <!-- 添加操作列 -->
                  <el-table-column label="操作" width="100" fixed="right">
                    <template #default="scope">
                      <el-button
                        type="primary"
                        size="small"
                        link
                        @click="viewServerFiles(scope.row)"
                      >
                        <i-ep-folder />
                        查看文件
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>

              <!-- 同步命令 -->
              <div class="command-section mt-4">
                <h5 class="section-title">
                  <i-ep-document />
                  同步命令
                </h5>
                <el-input
                  v-model="formData.command"
                  type="textarea"
                  :rows="6"
                  placeholder="将根据选中的目标服务器自动构建同步命令..."
                  class="command-input"
                />
                <div class="command-actions mt-2">
                  <el-button
                    type="primary"
                    @click="copyCommand"
                    size="small"
                    :disabled="!formData.command"
                  >
                    <i-ep-document-copy />
                    复制命令
                  </el-button>
                  <el-button
                    type="success"
                    @click="executeSyncCommand"
                    :loading="syncLoading"
                    size="small"
                    :disabled="!formData.agentId || !formData.command"
                  >
                    <i-ep-position />
                    执行同步
                  </el-button>
                  <el-button
                    type="warning"
                    @click="clearCommand"
                    size="small"
                    :disabled="!formData.command"
                  >
                    <i-ep-delete />
                    清空命令
                  </el-button>
                </div>
              </div>

              <!-- 同步结果 -->
              <div class="result-section mt-4">
                <h5 class="section-title">
                  <i-ep-chat-line-round />
                  同步结果
                </h5>
                <el-input
                  v-model="syncResult"
                  type="textarea"
                  :rows="4"
                  readonly
                  placeholder="同步结果将显示在这里..."
                  class="result-input"
                />
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { listAll } from "@/api/monitor/service";
import {
  getJumpServers,
  getAllServers,
  listFiles,
  uploadToJumpServer,
  syncWithCommand,
  buildSyncCommand,
} from "@/api/monitor/file-sync";
import type {
  AgentConfig,
  FileInfo,
  BuildSyncCommandRequest,
} from "@/api/monitor/file-sync/types";

const queryFormRef = ref();
const targetTableRef = ref(); // 添加表格引用
const loading = ref(false);
const fileLoading = ref(false);
const syncLoading = ref(false);
const uploadLoading = ref(false);

const queryParams = reactive({
  serviceId: undefined as number | undefined,
  hostname: "",
});

const dataList = ref<AgentConfig[]>([]);
const serviceInfoList = ref<any[]>([]);
const jumpServers = ref<AgentConfig[]>([]);
const fileList = ref<FileInfo[]>([]);
const selectedServers = ref<number[]>([]);
const syncResult = ref<string>("");

const formData = reactive({
  agentId: undefined as number | undefined,
  path: "/home/park",
  sourcePath: "",
  targetPath: "/home/park",
  command: "",
});

const uploadFile = ref<File>();

/** 查询所有服务器 */
function handleQuery() {
  loading.value = true;

  // 获取所有服务器列表（目标服务器）
  getAllServers(queryParams)
    .then(({ data }) => {
      dataList.value = data;
    })
    .finally(() => {
      loading.value = false;
    });

  // 获取服务列表
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
  });

  // 获取跳板机列表
  getJumpServers().then(({ data }) => {
    jumpServers.value = data;
  });
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  handleQuery();
}

/** 行选择事件 */
function handleSelectionChange(selection: AgentConfig[]) {
  selectedServers.value = selection.map((item) => item.id);
}

/** 全选服务器 */
function selectAllServers() {
  selectedServers.value = dataList.value.map((server) => server.id);

  // 更新表格选择状态
  if (targetTableRef.value) {
    targetTableRef.value.clearSelection(); // 先清空
    nextTick(() => {
      dataList.value.forEach((row) => {
        targetTableRef.value?.toggleRowSelection(row, true);
      });
    });
  }

  ElMessage.success(`已选择全部 ${selectedServers.value.length} 台服务器`);
}

/** 清空选择 */
function clearSelection() {
  selectedServers.value = [];

  // 清空表格选择状态
  if (targetTableRef.value) {
    targetTableRef.value.clearSelection();
  }

  ElMessage.info("已清空选择");
}

/** 清空命令 */
function clearCommand() {
  formData.command = "";
  ElMessage.info("已清空命令");
}

/** 选择跳板机 */
function handleJumpServerChange() {
  if (formData.agentId) {
    loadFileList();
  }
}

/** 加载文件列表 */
function loadFileList() {
  if (!formData.agentId) {
    ElMessage.warning("请先选择跳板机");
    return;
  }

  fileLoading.value = true;
  listFiles(formData.agentId, formData.path)
    .then(({ data }) => {
      fileList.value = data;
    })
    .finally(() => {
      fileLoading.value = false;
    });
}

/** 路径变化 */
function handlePathChange() {
  if (formData.agentId) {
    loadFileList();
  }
}

/** 源文件路径变化 */
function handleSourcePathChange() {
  if (formData.sourcePath && selectedServers.value.length > 0) {
    // 可选：自动构建命令
    // buildSyncCommandFunc();
  }
}

/** 构建同步命令 */
async function buildSyncCommandFunc() {
  if (!formData.agentId) {
    ElMessage.warning("请先选择跳板机");
    return;
  }

  if (selectedServers.value.length === 0) {
    ElMessage.warning("请选择至少一个目标服务器");
    return;
  }

  if (!formData.sourcePath) {
    ElMessage.warning("请输入源文件路径");
    return;
  }

  try {
    const requestData: BuildSyncCommandRequest = {
      targetServers: selectedServers.value,
      sourcePath: formData.sourcePath,
      targetPath: formData.targetPath,
    };

    const { data } = await buildSyncCommand(requestData);

    formData.command = data;
    ElMessage.success("同步命令构建成功");
  } catch (error: any) {
    ElMessage.error("构建命令失败: " + (error.message || error));
  }
}

/** 执行同步命令 */
async function executeSyncCommand() {
  if (!formData.agentId) {
    ElMessage.warning("请先选择跳板机");
    return;
  }

  if (!formData.command) {
    ElMessage.warning("请先构建同步命令");
    return;
  }

  syncLoading.value = true;

  try {
    const { data } = await syncWithCommand({
      agentId: formData.agentId,
      command: formData.command,
    });

    syncResult.value = data;
    ElMessage.success("同步命令执行成功");
  } catch (error: any) {
    ElMessage.error("同步命令执行失败: " + (error.message || error));
  } finally {
    syncLoading.value = false;
  }
}

/** 文件上传 */
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    uploadFile.value = input.files[0];
  }
}

/** 处理文件上传 */
async function handleFileUpload() {
  if (!formData.agentId) {
    ElMessage.warning("请先选择跳板机");
    return;
  }

  if (!uploadFile.value) {
    ElMessage.warning("请选择要上传的文件");
    return;
  }

  uploadLoading.value = true;

  try {
    const formDataObj = new FormData();
    formDataObj.append("file", uploadFile.value);
    formDataObj.append("agentId", formData.agentId.toString());
    formDataObj.append("destPath", formData.path);

    await uploadToJumpServer(formDataObj);

    ElMessage.success("文件上传成功");
    loadFileList();
  } catch (error: any) {
    ElMessage.error("文件上传失败: " + (error.message || error));
  } finally {
    uploadLoading.value = false;
  }
}

/** 复制命令 */
function copyCommand() {
  if (!formData.command) {
    ElMessage.warning("没有命令可复制");
    return;
  }

  navigator.clipboard
    .writeText(formData.command)
    .then(() => {
      ElMessage.success("命令已复制到剪贴板");
    })
    .catch(() => {
      ElMessage.error("复制失败");
    });
}

/** 设为跳板机 */
function selectAsJumpServer(server: AgentConfig) {
  formData.agentId = server.id;
  ElMessage.success(`已选择 ${server.hostname} 为跳板机`);
  loadFileList();
}

/** 添加到选择列表 */
function addToSelection(server: AgentConfig) {
  if (!selectedServers.value.includes(server.id)) {
    selectedServers.value.push(server.id);

    // 更新表格选择状态
    if (targetTableRef.value) {
      const row = dataList.value.find((item) => item.id === server.id);
      if (row) {
        targetTableRef.value.toggleRowSelection(row, true);
      }
    }

    ElMessage.success(`已将 ${server.hostname} 添加到同步列表`);
  } else {
    ElMessage.info(`${server.hostname} 已在同步列表中`);
  }
}

/** 查看服务器文件 */
function viewServerFiles(server: AgentConfig) {
  if (server.isJumpServer) {
    formData.agentId = server.id;
    loadFileList();
  } else {
    // 对于非跳板机，可以查看文件但无法上传
    const originalJumpServer = formData.agentId;
    formData.agentId = server.id;
    loadFileList();
    // 恢复原来的跳板机
    setTimeout(() => {
      formData.agentId = originalJumpServer;
    }, 100);
  }
}

/** 点击文件行 */
function handleFileClick(row: FileInfo) {
  if (row.type === "directory") {
    // 如果是目录，进入该目录
    if (formData.path.endsWith("/")) {
      formData.path = formData.path + row.name;
    } else {
      formData.path = formData.path + "/" + row.name;
    }
    loadFileList();
  } else {
    // 如果是文件，填充到源文件路径
    if (formData.path.endsWith("/")) {
      formData.sourcePath = formData.path + row.name;
    } else {
      formData.sourcePath = formData.path + "/" + row.name;
    }
    ElMessage.success(`已选择文件: ${row.name}`);
  }
}

onMounted(() => {
  handleQuery();
});
</script>

<style scoped>
/* 样式保持不变 */
.app-container {
  padding: 20px;
}

.search-container {
  margin-bottom: 20px;
}

.sync-console {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
}

.console-title {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.console-content {
  margin-top: 10px;
}

.console-card {
  height: 100%;
  padding: 20px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
}

.card-title {
  padding-bottom: 10px;
  margin: 0;
  font-size: 16px;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}

.card-title i {
  margin-right: 8px;
}

.section-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.section-title i {
  margin-right: 6px;
}

.mt-4 {
  margin-top: 20px;
}

.mt-2 {
  margin-top: 10px;
}

.mb-2 {
  margin-bottom: 10px;
}

.upload-section,
.file-section,
.target-section,
.command-section,
.quick-section,
.result-section {
  margin-top: 20px;
}

.upload-area {
  display: flex;
  gap: 10px;
  align-items: center;
}

.upload-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.upload-btn {
  white-space: nowrap;
}

.file-table,
.target-table {
  width: 100%;
}

.command-input,
.result-input {
  width: 100%;
}

.command-actions {
  display: flex;
  gap: 10px;
}

.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.target-info {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>
