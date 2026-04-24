<template>
  <div class="app-container">
    <el-card shadow="never">
      <!-- 文件同步控制台 -->
      <div>
        <el-row :gutter="20" class="console-content">
          <!-- 左侧：跳板机配置 -->
          <el-col :span="24">
            <div class="console-card">
              <el-form :model="formData" label-width="100px" class="mt-4">
                <el-form-item label="选择服务">
                  <el-select
                    v-model="formData.serverId"
                    placeholder="请选择"
                    clearable
                    style="width: 100%"
                    @change="handleServerChange"
                  >
                    <el-option
                      v-for="server in serviceInfoList"
                      :key="server.id"
                      :label="server.name"
                      :value="server.id"
                    />
                  </el-select>
                </el-form-item>
                <el-form-item label="选择代理">
                  <el-select
                    v-model="formData.agentId"
                    placeholder="请选择"
                    clearable
                    style="width: 100%"
                    @change="handleAgentChange"
                  >
                    <el-option
                      v-for="server in agentDataList"
                      :key="server.id"
                      :label="server.serviceName"
                      :value="server.id"
                    />
                  </el-select>
                </el-form-item>
              </el-form>
              <!-- 文件列表 -->
              <div class="file-section mt-4">
                <h5 class="section-title">
                  <i-ep-folder />
                  文件列表
                </h5>

                <!-- 面包屑导航 -->
                <div class="breadcrumb-nav">
                  <el-button
                    v-if="breadcrumbList.length > 0"
                    type="text"
                    size="small"
                    @click="goBack"
                  >
                    <i-ep-arrow-left /> 返回上级
                  </el-button>
                  <div class="breadcrumb-path">
                    <span
                      class="breadcrumb-item"
                      :class="{ active: breadcrumbList.length === 0 }"
                      @click="goToRoot"
                    >
                      <i-ep-house /> 根目录
                    </span>
                    <span
                      v-for="(item, index) in breadcrumbList"
                      :key="index"
                      class="breadcrumb-item"
                      :class="{ active: index === breadcrumbList.length - 1 }"
                      @click="goToPath(index)"
                    >
                      <i-ep-arrow-right /> {{ item }}
                    </span>
                  </div>
                </div>

                <!-- 文件夹列表 -->
                <div v-loading="fileLoading" class="folder-list">
                  <div v-if="fileList.length === 0" class="empty-folder">
                    <i-ep-folder-opened class="empty-icon" />
                    <span>空文件夹</span>
                  </div>
                  <div
                    v-for="file in fileList"
                    :key="file.name"
                    class="folder-item"
                    :class="{ 'is-directory': file.type === 'directory' }"
                    @click="handleFileClick(file)"
                  >
                    <div class="folder-icon">
                      <i-ep-folder
                        v-if="file.type === 'directory'"
                        class="icon-directory"
                      />
                      <i-ep-document v-else class="icon-file" />
                    </div>
                    <div class="folder-info">
                      <div class="folder-name" :title="file.name">
                        {{ file.name }}
                      </div>
                      <div class="folder-path" :title="getFullPath(file)">
                        {{ getFullPath(file) }}
                      </div>
                    </div>
                    <div class="folder-actions">
                      <el-button
                        v-if="file.type === 'file'"
                        type="primary"
                        size="small"
                        link
                        @click.stop="handleAnalyzeLog(file)"
                      >
                        <i-ep-data-analysis /> 分析日志
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 日志分析弹窗 -->
    <el-dialog
      v-model="logDialogVisible"
      title="日志分析结果"
      width="70%"
      :close-on-click-modal="false"
      custom-class="log-dialog"
    >
      <div v-if="logLoading" class="log-loading">
        <el-skeleton :rows="10" animated />
      </div>
      <div v-else class="log-content">
        <div class="log-header">
          <div class="log-info">
            <span class="log-label">分析文件：</span>
            <span class="log-value">{{ currentLogFile?.name }}</span>
          </div>
          <div class="log-info">
            <span class="log-label">文件路径：</span>
            <span class="log-value path">{{
              analysisBasePath + "/" + getFullPath(currentLogFile!)
            }}</span>
          </div>
        </div>
        <div class="log-body">
          <div v-if="isValidLogResult" class="log-table-wrapper">
            <el-table
              :data="logResultArray"
              stripe
              border
              size="small"
              style="width: 100%"
            >
              <el-table-column
                prop="template"
                label="日志模板"
                min-width="200"
                show-overflow-tooltip
              />
              <el-table-column
                prop="count"
                label="数量"
                width="80"
                align="center"
              />
              <el-table-column
                prop="percentage"
                label="占比"
                width="80"
                align="center"
              />
              <el-table-column prop="first_seen" label="首次出现" width="160" />
              <el-table-column prop="last_seen" label="最后出现" width="160" />
              <el-table-column
                prop="parameter_count"
                label="参数数"
                width="80"
                align="center"
              />
              <el-table-column
                prop="unique_parameter_sets"
                label="唯一参数集"
                width="100"
                align="center"
              />
              <el-table-column
                label="示例"
                min-width="200"
                show-overflow-tooltip
              >
                <template #default="{ row }">
                  {{ row.examples ? row.examples.join(", ") : "" }}
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else-if="logResult && !isValidLogResult" class="log-error">
            <i-ep-warning-filled class="error-icon" />
            <span>分析异常：数据结构不符合预期</span>
          </div>
          <div v-else class="log-empty">
            <i-ep-info-filled class="info-icon" />
            <span>暂无分析结果</span>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="logDialogVisible = false">关 闭</el-button>
          <el-button
            type="primary"
            :loading="logLoading"
            @click="refreshLogResult"
            ><i-ep-refresh /> 重新分析</el-button
          >
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  listAll,
  agentList,
  listFiles,
  analyzerLog,
} from "@/api/monitor/service";
import type {
  AgentConfig,
  FileInfo,
  BuildSyncCommandRequest,
} from "@/api/monitor/file-sync/types";
import { f } from "vue-router/dist/router-CWoNjPRp.mjs";

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
const agentDataList = ref<AgentConfig[]>([]);
const serviceInfoList = ref<any[]>([]);
const jumpServers = ref<AgentConfig[]>([]);
const fileList = ref<FileInfo[]>([]);
const selectedServers = ref<number[]>([]);
const syncResult = ref<string>("");

const formData = reactive({
  agentId: undefined as number | undefined,
  serverId: undefined as number | undefined,
  workPath: "",
  sourcePath: "",
});

// 分析日志路径（基于固定的 workPath 拼接）
const analysisBasePath = ref("");

const uploadFile = ref<File>();

// ========== 面包屑导航相关 ==========
const breadcrumbList = ref<string[]>([]);

/** 获取完整路径 */
function getFullPath(file: FileInfo): string {
  if (!file) return "";
  const basePath = breadcrumbList.value.join("/");
  if (basePath) {
    return `${basePath}/${file.name}`;
  }
  return file.name;
}

/** 返回上级目录 */
function goBack() {
  if (breadcrumbList.value.length > 0) {
    breadcrumbList.value.pop();
    // 重新计算路径：固定基础路径 + 面包屑路径
    const breadcrumbPath = breadcrumbList.value.join("/");
    formData.workPath =
      analysisBasePath.value + (breadcrumbPath ? "/" + breadcrumbPath : "");
    loadFileList();
  }
}

/** 返回根目录 */
function goToRoot() {
  breadcrumbList.value = [];
  formData.workPath = analysisBasePath.value;
  loadFileList();
}

/** 跳转到指定路径层级 */
function goToPath(index: number) {
  breadcrumbList.value = breadcrumbList.value.slice(0, index + 1);
  const breadcrumbPath = breadcrumbList.value.join("/");
  formData.workPath =
    analysisBasePath.value + (breadcrumbPath ? "/" + breadcrumbPath : "");
  loadFileList();
}

// ========== 日志分析相关 ==========
const logDialogVisible = ref(false);
const logLoading = ref(false);
const logResult = ref<any>(null);
const currentLogFile = ref<FileInfo | null>(null);

// 计算属性：验证日志结果是否为有效的数组格式
const isValidLogResult = computed(() => {
  if (!logResult.value || logResult.value.error) return false;
  if (!Array.isArray(logResult.value)) return false;
  if (logResult.value.length === 0) return true; // 空数组也算有效
  // 验证第一个元素是否包含预期的字段
  const firstItem = logResult.value[0];
  return firstItem && typeof firstItem === "object" && "template" in firstItem;
});

// 计算属性：日志结果数组
const logResultArray = computed(() => {
  if (!isValidLogResult.value) return [];
  return logResult.value || [];
});

/** 分析日志 */
async function handleAnalyzeLog(file: FileInfo) {
  console.log("分析日志文件:", file);
  if (!file) return;
  if (!formData.agentId) {
    ElMessage.warning("请先选择代理");
    return;
  }

  currentLogFile.value = file;
  logDialogVisible.value = true;
  logLoading.value = true;
  logResult.value = null;
  console.log("分析日志文件:", 1);
  try {
    const logFilePath = getFullPath(file);
    const { data } = await analyzerLog(
      formData.agentId,
      analysisBasePath.value + "/" + logFilePath
    );
    console.log(data);
    // 解析 data 字段 (JSON 字符串) 为数组
    let parsedArray = null;
    const dataStr = data;
    if (typeof dataStr === "string") {
      try {
        const parsed = JSON.parse(dataStr);
        // 验证解析后是否为数组
        if (Array.isArray(parsed)) {
          parsedArray = parsed;
        }
      } catch {
        parsedArray = null;
      }
    }

    // 设置结果：是数组则显示表格，否则显示异常
    if (parsedArray !== null) {
      logResult.value = parsedArray;
    } else {
      logResult.value = { error: "format_error", raw: data };
    }
  } catch (error: any) {
    logResult.value = { error: `分析失败: ${error.message || error}` };
    ElMessage.error("日志分析失败");
  } finally {
    logLoading.value = false;
  }
}

/** 重新分析日志 */
async function refreshLogResult() {
  if (!currentLogFile.value) return;
  await handleAnalyzeLog(currentLogFile.value);
}

/** 查询所有服务器 */
function handleQuery() {
  loading.value = true;
  // 获取服务列表
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
  });
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  handleQuery();
}

function handleServerChange() {
  serviceInfoList.value.forEach((service) => {
    if (service.id === formData.serverId) {
      formData.workPath = service.workPath; // 重置代理选择
      analysisBasePath.value = service.workPath; // 固定分析日志的基础路径
    }
  });
  console.log("选择的跳板机ID:", formData.workPath);
  if (formData.serverId) {
    loadAgentList();
  }
}

/** 加载文件列表 */
function loadAgentList() {
  fileLoading.value = true;
  agentList({
    pageNum: 1,
    pageSize: 15000,
    serviceId: formData.serverId,
  }).then((response) => {
    agentDataList.value = response.data;
    fileLoading.value = false;
  });
}

/** 路径变化 */
function handleAgentChange() {
  if (formData.agentId) {
    loadFileList();
  }
}
function loadFileList() {
  listFiles(formData.agentId, formData.workPath)
    .then(({ data }) => {
      fileList.value = data;
    })
    .finally(() => {});
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

/** 点击文件行 */
function handleFileClick(row: FileInfo) {
  if (row.type === "directory" || row.type === "dir") {
    // 如果是目录，进入该目录
    breadcrumbList.value.push(row.name);
    if (formData.workPath.endsWith("/")) {
      formData.workPath = formData.workPath + row.name;
    } else {
      formData.workPath = formData.workPath + "/" + row.name;
    }
    loadFileList();
  } else {
    // 如果是文件，填充到源文件路径
    if (formData.workPath.endsWith("/")) {
      formData.sourcePath = formData.workPath + row.name;
    } else {
      formData.sourcePath = formData.workPath + "/" + row.name;
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

/* 面包屑导航样式 */
.breadcrumb-nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.breadcrumb-path {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.breadcrumb-item {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 8px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.breadcrumb-item:hover {
  color: #409eff;
  background: #ecf5ff;
}

.breadcrumb-item.active {
  font-weight: 600;
  color: #409eff;
  background: #ecf5ff;
}

/* 文件夹列表样式 */
.folder-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  padding: 8px;
  overflow-y: auto;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.empty-folder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-icon {
  margin-bottom: 12px;
  font-size: 48px;
  color: #c0c4cc;
}

.folder-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  transition: all 0.2s;
}

.folder-item:hover {
  background: #f5f7fa;
  border-color: #409eff;
  box-shadow: 0 2px 8px rgb(64 158 255 / 15%);
}

.folder-item.is-directory {
  background: #ecf5ff;
  border-color: #d9ecff;
}

.folder-item.is-directory:hover {
  background: #d9ecff;
  border-color: #409eff;
}

.folder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 24px;
  border-radius: 4px;
}

.icon-directory {
  color: #409eff;
}

.icon-file {
  color: #909399;
}

.folder-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.folder-name {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-path {
  overflow: hidden;
  font-size: 12px;
  color: #909399;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 日志分析弹窗样式 */
.log-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.log-loading {
  padding: 20px;
}

.log-content {
  display: flex;
  flex-direction: column;
  max-height: 60vh;
}

.log-header {
  padding: 16px 20px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
}

.log-info {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.log-info:last-child {
  margin-bottom: 0;
}

.log-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.log-value {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.log-value.path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-body {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.log-table-wrapper {
  padding: 0;
}

.log-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #f56c6c;
}

.log-error .error-icon {
  margin-bottom: 12px;
  font-size: 48px;
}

.log-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;
}

.log-empty .info-icon {
  margin-bottom: 12px;
  font-size: 48px;
  color: #c0c4cc;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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
