<template>
  <div class="app-container">
    <div class="search-container">
      <el-form :inline="true">
        <el-form-item>
          <el-input
            v-model="queryParams.fileName"
            placeholder="文件名"
            style="width: 200px"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryParams.status" placeholder="状态" clearable>
            <el-option label="未部署" :value="0" />
            <el-option label="部署中" :value="1" />
            <el-option label="部署成功" :value="2" />
            <el-option label="部署失败" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
          <el-button type="success" @click="showUploadDialog"
            >上传JAR</el-button
          >
        </el-form-item>
      </el-form>
    </div>

    <el-card>
      <el-table :data="jarList" v-loading="loading">
        <el-table-column label="文件名" prop="fileName" width="200" />
        <el-table-column label="版本号" prop="version" width="100">
          <template #default="{ row }">
            <el-tag>{{ row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="镜像名称" prop="dockerImageName" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="部署目标" width="200">
          <template #default="{ row }">
            <div v-if="row.agentNames">
              <div style="font-size: 12px">{{ row.agentNames }}</div>
              <div style="font-size: 12px; color: #999">
                {{ row.targetContainerNames }}
              </div>
            </div>
            <span v-else style="color: #999">未部署</span>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" prop="createTime" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 0"
              type="primary"
              size="small"
              @click="showDeployDialog(row)"
            >
              部署
            </el-button>
            <el-button
              v-if="row.status === 2"
              type="warning"
              size="small"
              @click="redeploy(row.id)"
            >
              重新部署
            </el-button>
            <el-button size="small" @click="viewLogs(row.id)"> 日志 </el-button>
            <el-button type="danger" size="small" @click="deleteJar(row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 上传对话框 -->
    <el-dialog v-model="uploadVisible" title="上传JAR包" width="500px">
      <el-upload
        drag
        :auto-upload="false"
        :on-change="handleFileChange"
        accept=".jar"
      >
        <el-icon>
          <Upload />
        </el-icon>
        <div class="el-upload__text">
          将JAR文件拖到此处，或<em>点击选择</em>
        </div>
      </el-upload>

      <el-form :model="uploadForm" label-width="80px" style="margin-top: 20px">
        <el-form-item label="备注">
          <el-input v-model="uploadForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="uploadVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpload" :loading="uploading">
          上传
        </el-button>
      </template>
    </el-dialog>

    <!-- 部署对话框 -->
    <el-dialog v-model="deployVisible" title="部署JAR包" width="700px">
      <div
        v-if="agents.length === 0"
        style=" padding: 40px 0;text-align: center"
      >
        <el-empty description="暂无可用Agent" />
      </div>

      <div v-else>
        <div
          v-for="agent in agents"
          :key="agent.agentId"
          style="margin-bottom: 20px"
        >
          <el-checkbox v-model="agent.selected">
            <strong>{{ agent.agentName }}</strong>
          </el-checkbox>

          <div
            v-if="agent.selected"
            style=" margin-top: 10px;margin-left: 24px"
          >
            <div style="margin-bottom: 8px">选择容器：</div>
            <el-checkbox-group v-model="agent.selectedContainers">
              <el-checkbox
                v-for="container in agent.containers"
                :key="container.names"
                :label="container.names"
              >
                {{ container.names }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="deployVisible = false">取消</el-button>
        <el-button type="primary" @click="handleDeploy" :loading="deploying">
          开始部署
        </el-button>
      </template>
    </el-dialog>

    <!-- 日志对话框 -->
    <el-dialog
      v-model="logsVisible"
      :title="`部署日志 - ${currentJarName}`"
      width="800px"
    >
      <el-table :data="deployRecords" size="small">
        <el-table-column prop="agentId" label="Agent" width="100" />
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
                row.status === 2 ? "成功" : row.status === 3 ? "失败" : "部署中"
              }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deployLog" label="日志" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Upload } from "@element-plus/icons-vue";
import * as api from "@/api/monitor/jar";

const loading = ref(false);
const uploading = ref(false);
const deploying = ref(false);
const uploadVisible = ref(false);
const deployVisible = ref(false);
const logsVisible = ref(false);

const queryParams = ref({
  fileName: "",
  status: "",
});

const jarList = ref([]);
const agents = ref([]);
const deployRecords = ref([]);
const selectedFile = ref(null);
const currentJarId = ref(null);
const currentJarName = ref("");

const uploadForm = ref({
  remark: "",
});

onMounted(() => {
  loadJarList();
});

async function loadJarList() {
  loading.value = true;
  try {
    const result = await api.listJarPackages(queryParams.value);
    if (result.code === "00000") {
      // 根据您的ResultCode修改
      jarList.value = result.data;
    } else {
      ElMessage.error(result.msg || "加载列表失败");
    }
  } catch (error) {
    ElMessage.error("加载列表失败");
  } finally {
    loading.value = false;
  }
}

function handleQuery() {
  loadJarList();
}

function resetQuery() {
  queryParams.value = { fileName: "", status: "" };
  loadJarList();
}

function getStatusText(status) {
  const map = {
    0: "未部署",
    1: "部署中",
    2: "部署成功",
    3: "部署失败",
  };
  return map[status] || "未知";
}

function getStatusType(status) {
  const map = {
    0: "info",
    1: "warning",
    2: "success",
    3: "danger",
  };
  return map[status] || "info";
}

function showUploadDialog() {
  uploadVisible.value = true;
  selectedFile.value = null;
  uploadForm.value.remark = "";
}

function handleFileChange(file) {
  selectedFile.value = file.raw;
}

async function handleUpload() {
  if (!selectedFile.value) {
    ElMessage.warning("请选择文件");
    return;
  }

  uploading.value = true;
  const formData = new FormData();
  formData.append("file", selectedFile.value);
  formData.append("remark", uploadForm.value.remark);

  try {
    const result = await api.uploadJar(formData);
    if (result.code === "00000") {
      ElMessage.success("上传成功");
      uploadVisible.value = false;
      loadJarList();
    } else {
      ElMessage.error(result.msg || "上传失败");
    }
  } catch (error) {
    ElMessage.error("上传失败");
  } finally {
    uploading.value = false;
  }
}

async function showDeployDialog(jar) {
  currentJarId.value = jar.id;
  currentJarName.value = jar.fileName;

  try {
    const result = await api.getAllAgents();
    if (result.code === "00000") {
      agents.value = result.data.map((agent) => ({
        ...agent,
        selected: false,
        selectedContainers: [],
      }));
      deployVisible.value = true;
    } else {
      ElMessage.error(result.msg || "获取Agent列表失败");
    }
  } catch (error) {
    ElMessage.error("获取Agent列表失败");
  }
}

async function handleDeploy() {
  const agentIds = [];
  const containerNames = [];

  agents.value.forEach((agent) => {
    if (agent.selected && agent.selectedContainers.length > 0) {
      agent.selectedContainers.forEach((container) => {
        agentIds.push(agent.agentId);
        containerNames.push(container);
      });
    }
  });

  if (agentIds.length === 0) {
    ElMessage.error("请选择部署目标");
    return;
  }

  deploying.value = true;
  try {
    const result = await api.deployJar(currentJarId.value, {
      agentIds,
      containerNames,
    });
    if (result.code === "00000") {
      ElMessage.success("开始部署");
      deployVisible.value = false;
      loadJarList();
    } else {
      ElMessage.error(result.msg || "部署失败");
    }
  } catch (error) {
    ElMessage.error("部署失败");
  } finally {
    deploying.value = false;
  }
}

async function redeploy(id) {
  try {
    await ElMessageBox.confirm("确认重新部署？", "提示");
    const result = await api.rebuildJar(id);
    if (result.code === "00000") {
      ElMessage.success("开始重新部署");
      loadJarList();
    } else {
      ElMessage.error(result.msg || "重新部署失败");
    }
  } catch (error) {
    // 用户取消
  }
}

async function viewLogs(id) {
  currentJarId.value = id;
  const jar = jarList.value.find((j) => j.id === id);
  currentJarName.value = jar.fileName;

  try {
    const result = await api.getDeployRecords(id);
    if (result.code === "00000") {
      deployRecords.value = result.data;
      logsVisible.value = true;
    } else {
      ElMessage.error(result.msg || "获取日志失败");
    }
  } catch (error) {
    ElMessage.error("获取日志失败");
  }
}

async function deleteJar(id) {
  try {
    await ElMessageBox.confirm("确认删除？", "提示");
    const result = await api.deleteJar(id);
    if (result.code === "00000") {
      ElMessage.success("删除成功");
      loadJarList();
    } else {
      ElMessage.error(result.msg || "删除失败");
    }
  } catch (error) {
    // 用户取消
  }
}
</script>
