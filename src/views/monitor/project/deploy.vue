<template>
  <div class="app-container">
    <div class="top-title">
      <div>应用管理 / {{ props.info.index ? "应用部署" : "查看配置" }}</div>
      <div>
        <el-button v-if="step == 2" type="primary" @click="seeRecord"
          >查看部署日志
        </el-button>
        <el-button type="primary" @click="goBack">返回</el-button>
      </div>
    </div>
    <el-card shadow="never">
      <el-form
        ref="deptFormRef"
        label-width="120px"
        :model="formData"
        :rules="rules"
      >
        <div v-show="step == 0">
          <el-form-item label="Dockerfile：" prop="dockerfileContent">
            <div ref="dockerfileEditorRef" class="codemirror-container"></div>
          </el-form-item>
          <el-form-item label="DockerCompose:" prop="dockerComposeContent">
            <div
              ref="dockercomposeEditorRef"
              class="codemirror-container"
            ></div>
          </el-form-item>
        </div>
        <div v-if="step == 1">
          <el-form-item label="同步方式:" required>
            <el-radio-group
              v-model="formData.fileType"
              @change="handleFileTypeChange"
              size="default"
              fill="#409eff"
            >
              <el-radio-button label="源服务器" :value="1" />
              <el-radio-button label="jar包" :value="2" />
              <el-radio-button label="手动同步" :value="3" />
            </el-radio-group>
          </el-form-item>
          <el-form-item
            label="源文件服务:"
            prop="sourceAgentId"
            v-if="formData.fileType == 1"
          >
            <el-select
              v-model="formData.sourceAgentId"
              filterable
              size="default"
              style="width: 400px"
            >
              <el-option
                v-for="(item, index) in hostList"
                :value="item.id"
                :label="item.label"
                :key="index"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            label="jar包:"
            prop="sourceAgentId"
            v-if="formData.fileType == 2"
          >
            <el-select
              v-model="formData.sourceAgentId"
              filterable
              size="default"
              style="width: 400px"
            >
              <el-option
                v-for="(item, index) in jarList"
                :value="item.id"
                :label="item.fileName"
                :key="index"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="源文件目录:">
            <div>{{ props.info.sourceDir }}/{{ props.info.name }}</div>
          </el-form-item>
          <el-form-item label="指向目录:">
            <div>{{ props.info.targetDir }}/{{ props.info.name }}</div>
          </el-form-item>
          <el-form-item label="选择环境服务:" prop="serviceId">
            <el-select
              v-model="formData.serviceId"
              filterable
              size="default"
              style="width: 400px"
            >
              <el-option
                v-for="(item, index) in serviceInfoList"
                :value="item.id"
                :label="item.name"
                :key="index"
              />
            </el-select>
          </el-form-item>
        </div>
        <div v-if="step == 2">
          <el-form-item label="部署方式:" prop="requestMethod">
            <el-select
              v-model="formData.deployType"
              filterable
              size="default"
              style="width: 400px"
              @change="handleChange"
            >
              <el-option
                v-for="item in deployTypeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-button
              type="primary"
              @click="loadAgentList"
              style="margin-left: auto"
              >刷新
            </el-button>
          </el-form-item>

          <el-form-item label="逐个同步部署:">
            <el-switch
              v-model="formData.sync"
              :active-value="true"
              :inactive-value="false"
              active-text="同步部署"
              inactive-text="不同步"
            />
          </el-form-item>

          <el-form-item label="选择部署服务器:">
            <el-table
              ref="dataTableRef"
              v-loading="loading"
              :data="dataList"
              highlight-current-row
              border
              @selection-change="handleSelectionChange"
            >
              <el-table-column type="selection" width="55" />
              <el-table-column label="主机名" prop="hostname" align="center" />
              <el-table-column
                label="服务名"
                prop="serviceName"
                align="center"
              />
              <el-table-column
                label="网络状态"
                prop="createTime"
                align="center"
              >
                <template #default="scope">
                  <el-tag v-if="scope.row.online" type="success">在线</el-tag>
                  <el-tag v-else type="info">离线</el-tag>
                </template>
              </el-table-column>
              <el-table-column
                label="容器名"
                prop="dockerName"
                align="center"
              />
              <el-table-column label="容器状态" prop="status" align="center" />
              <el-table-column
                label="容器更新时间"
                prop="updateTime"
                align="center"
              />
            </el-table>
          </el-form-item>
        </div>
      </el-form>
      <div v-if="props.info.index" style="width: 100%; text-align: center">
        <el-button v-if="step > 0" @click="lastStep">上一步</el-button>
        <el-button type="primary" v-if="step < 2" @click="nextStep"
          >下一步
        </el-button>
        <el-button type="primary" v-if="step == 2" @click="deployBtn"
          >部署
        </el-button>
      </div>
    </el-card>
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
          label="创建时间"
          prop="createTime"
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
              >部署成功
            </el-tag>
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
            确 定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
import {
  agentList,
  deploy,
  deployList,
  jarData,
  putData,
  syncData,
} from "@/api/monitor/project";
import { LogInfo } from "@/api/monitor/log/types";
import { ServiceInfo } from "@/api/monitor/service/types";
import { originServerList } from "@/api/monitor/agent";
import { listAll } from "@/api/monitor/service";
import { ElLoading } from "element-plus";
import { basicSetup, EditorView } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { yaml } from "@codemirror/lang-yaml";

const props = defineProps({
  info: {
    type: Object,
    required: true,
  },
});
const queryFormRef = ref(ElForm);
const deptFormRef = ref(ElForm);
const dataTableRef = ref(ElTable);

// CodeMirror 编辑器实例
let dockerfileEditor: EditorView | null = null;
let dockercomposeEditor: EditorView | null = null;
const dockerfileEditorRef = ref<HTMLElement | null>(null);
const dockercomposeEditorRef = ref<HTMLElement | null>(null);

const formData = reactive<LogInfo>({
  dockerfileContent: props.info.dockerfileContent || "",
  dockerComposeContent: props.info.dockerComposeContent || "",
  fileType: 1,
  serviceId: "",
  sourceAgentId: "",
  sync: true,
});
const emit = defineEmits(["setData", "changePage"]);
const step = ref(0);
const hostList = ref<ServiceInfo[]>([]);
// Dockerfile相关
const dockerfileContent = ref("");
const dockerComposeContent = ref("");
const dockerfileLoading = ref(false);
const serviceInfoList = ref<ServiceInfo[]>([]);
const jarList = ref<any[]>([]);
const loading = ref(false);
const dataList = ref<any[]>([]);
const deployArr = ref<LogInfo[]>();
const deployEdit = reactive<DialogOption>({
  visible: false,
});
const deployTypeOptions = [
  { value: 1, label: "重新构建" },
  { value: 2, label: "直接替换源文件" },
];

const selectedRows = ref<any[]>([]);
const rules = reactive({
  dockerfileContent: [
    { required: true, message: "Dockerfile内容不能为空", trigger: "blur" },
  ],
  dockerComposeContent: [
    { required: true, message: "Docker Compose内容不能为空", trigger: "blur" },
  ],
  fileType: [
    { required: true, message: "同步方式不能为空", trigger: "change" },
  ],
  serviceId: [
    { required: true, message: "源文件服务不能为空", trigger: "change" },
  ],
  sourceAgentId: [
    { required: true, message: "环境服务不能为空", trigger: "change" },
  ],
});

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

function showDockerfileDialog(row) {
  dockerfileContent.value = "";
  dockerfileLoading.value = true;
  if (row.dockerfileContent && row.dockerfileContent.trim()) {
    dockerfileContent.value = row.dockerfileContent;
  } else {
    // 否则生成默认的Dockerfile，使用正确的JAR文件名
    dockerfileContent.value = getDefaultDockerfile(row.dockerfileContent);
  }
  dockerfileDialogVisible.value = true;
  dockerfileLoading.value = false;
}

function handleFileTypeChange(value) {
  formData.sourceAgentId = "";
}

/** 获取默认Dockerfile */
function getDefaultDockerfile(jar: JarPackage): string {
  const jarFileName = props.info.name || "app.jar";
  return `FROM adoptopenjdk:8-jdk-hotspot

WORKDIR /home/park

ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 复制JAR文件到容器中
COPY ${jarFileName}.jar /home/park/

# 暴露端口
EXPOSE 8080

# 启动命令
ENTRYPOINT ["java", "-jar", "${jarFileName}.jar"]`;
}

/** 获取默认DockerCompose */
function getDefaultDockerCompose(jar: JarPackage): string {
  const jarFileName = props.info.name || "app.jar";
  const baseName = jarFileName.replace(/\.jar$/i, "");
  return `services:
  ${baseName}:
    build: .
    image: ${baseName}
    container_name: ${baseName}
    restart: always
    ports:
      - "8080:8080"
    environment:
      - TZ=Asia/Shanghai
      - JAVA_OPTS=-Xms256m -Xmx512m -Duser.timezone=Asia/Shanghai`;
}

function createDockerfile(row) {
  if (row.dockerfileContent && row.dockerfileContent.trim()) {
    formData.dockerfileContent = row.dockerfileContent;
  } else {
    // 否则生成默认的Dockerfile，使用正确的JAR文件名
    formData.dockerfileContent = getDefaultDockerfile(row.name);
  }
}

function createDockerCompose(row) {
  if (row.dockerComposeContent && row.dockerComposeContent.trim()) {
    formData.dockerComposeContent = row.dockerComposeContent;
  } else {
    // 否则生成默认的DockerCompose，使用正确的JAR文件名
    formData.dockerComposeContent = getDefaultDockerCompose(row.name);
  }
}

function loadAgentList() {
  agentList({
    serviceId: formData.serviceId,
    dockerName: props.info.name,
  }).then(({ data }) => {
    dataList.value = data;
  });
}

/** 同步 CodeMirror 编辑器内容到 formData */
function syncEditorsToFormData() {
  if (dockerfileEditor) {
    formData.dockerfileContent = dockerfileEditor.state.doc.toString();
  }
  if (dockercomposeEditor) {
    formData.dockerComposeContent = dockercomposeEditor.state.doc.toString();
  }
}

/** 初始化 Dockerfile CodeMirror 编辑器 */
function initDockerfileEditor() {
  const container = dockerfileEditorRef.value;
  if (!container) return;
  if (dockerfileEditor) {
    dockerfileEditor.destroy();
    dockerfileEditor = null;
  }
  const isEditable = !!props.info.index;
  dockerfileEditor = new EditorView({
    doc: formData.dockerfileContent || "",
    extensions: [basicSetup, oneDark, EditorView.editable.of(isEditable)],
    parent: container,
  });
}

/** 初始化 DockerCompose CodeMirror 编辑器（YAML 模式） */
function initDockercomposeEditor() {
  const container = dockercomposeEditorRef.value;
  if (!container) return;
  if (dockercomposeEditor) {
    dockercomposeEditor.destroy();
    dockercomposeEditor = null;
  }
  const isEditable = !!props.info.index;
  dockercomposeEditor = new EditorView({
    doc: formData.dockerComposeContent || "",
    extensions: [
      basicSetup,
      yaml(),
      oneDark,
      EditorView.editable.of(isEditable),
    ],
    parent: container,
  });
}

/** 延迟初始化两个 CodeMirror 编辑器 */
function initCodeMirrorEditors() {
  nextTick(() => {
    initDockerfileEditor();
    initDockercomposeEditor();
  });
}

/** 销毁两个 CodeMirror 编辑器 */
function destroyCodeMirrorEditors() {
  if (dockerfileEditor) {
    dockerfileEditor.destroy();
    dockerfileEditor = null;
  }
  if (dockercomposeEditor) {
    dockercomposeEditor.destroy();
    dockercomposeEditor = null;
  }
}

function nextStep() {
  syncEditorsToFormData();
  deptFormRef.value.validate((valid: any) => {
    if (valid) {
      if (step.value == 0) {
        putData({
          id: props.info.id,
          dockerfileContent: formData.dockerfileContent,
          dockerComposeContent: formData.dockerComposeContent,
        }).then(() => {
          ElMessage.success("配置保存成功");
        });
      }
      if (step.value == 1) {
        localStorage.setItem(
          "formDataServiceId",
          JSON.stringify(formData.serviceId)
        );
        const loadings = ElLoading.service({
          lock: true,
          text: "同步中...",
          background: "rgba(0, 0, 0, 0.7)",
        });
        if (formData.fileType == 1) {
          syncData({
            type: formData.fileType,
            sourceAgentId: formData.sourceAgentId,
            serviceId: formData.serviceId,
            jarDownloadUrl: "",
            projectId: props.info.id,
          })
            .then(({ data }) => {
              if (data) {
                loadings.close();
                loadAgentList();
                step.value = step.value + 1;
                console.log("Proceeding to step:", step.value, dataList.value);
              }
            })
            .catch(() => {
              loadings.close();
            });
        } else if (formData.fileType == 2) {
          jarList.value.forEach((item) => {
            if (item.id == formData.sourceAgentId) {
              formData.jarDownloadUrl = item.downloadUrl;
              formData.sourceAgentId = item.serviceId;
            }
          });
          syncData({
            type: formData.fileType,
            // sourceAgentId: formData.sourceAgentId,
            serviceId: formData.serviceId,
            jarDownloadUrl: formData.jarDownloadUrl,
            projectId: props.info.id,
          })
            .then(({ data }) => {
              if (data) {
                loadings.close();
                console.log("Sync data response:", data);
                agentList({
                  serviceId: formData.serviceId,
                  dockerName: props.info.name,
                }).then(({ data }) => {
                  dataList.value = data;
                });
                step.value = step.value + 1;
                console.log("Proceeding to step:", step.value, dataList.value);
              }
            })
            .catch(() => {
              loadings.close();
            });
        } else if (formData.fileType == 3) {
          syncData({
            type: formData.fileType,
            serviceId: formData.serviceId,
            projectId: props.info.id,
          })
            .then(({ data }) => {
              if (data) {
                loadings.close();
                console.log("Sync data response:", data);
                agentList({
                  serviceId: formData.serviceId,
                  dockerName: props.info.name,
                }).then(({ data }) => {
                  dataList.value = data;
                });
                step.value = step.value + 1;
                console.log("Proceeding to step:", step.value, dataList.value);
              }
            })
            .catch(() => {
              loadings.close();
            });
        }
      } else {
        step.value = step.value + 1;
      }
    }
  });
}

function deployBtn() {
  if (selectedRows.value.length == 0) {
    ElMessage.warning("请至少选择一台部署服务器");
    return;
  }
  const deployLoading = ElLoading.service({
    lock: true,
    text: "部署中...",
    background: "rgba(0, 0, 0, 0.7)",
  });
  const agentIds = selectedRows.value.map((row) => row.id);
  deploy({
    projectId: props.info.id,
    agentIds: agentIds,
    deployType: parseInt(formData.deployType),
    sync: formData.sync,
  })
    .then(({ data }) => {
      deployLoading.close();
      console.log("Deploy data response:", data);
      ElMessage.success("部署命令已发送，请稍后查看部署状态");
    })
    .catch(() => {
      deployLoading.close();
    });
}

function lastStep() {
  step.value = step.value - 1;
}

function handleSelectionChange(val) {
  console.log("Selected rows:", val);
  selectedRows.value = val;
}

function fetchHostList() {
  // 假设有一个API可以获取主机列表
  originServerList({
    pageNum: 1,
    pageSize: 15000,
    isOriginServer: true,
  }).then((response) => {
    hostList.value = response.data;
    hostList.value.forEach((item) => {
      item.label = item.hostname + " (" + item.serviceName + ")";
      if (item.isOriginServer) {
        formData.sourceAgentId = item.id;
      }
    });
  });
  jarData({}).then(({ data }) => {
    jarList.value = data.records;
    console.log("Fetched jar list:", jarList.value);
  });
}

function fetchServiceList() {
  // 假设有一个API可以获取主机列表
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
    setTimeout(() => {
      if (localStorage.getItem("formDataServiceId")) {
        formData.serviceId = Number(localStorage.getItem("formDataServiceId"));
      } else {
        formData.serviceId = data[0]?.id;
      }
      console.log(formData.serviceId);
    }, 500);
  });
}

function seeRecord() {
  deployList({ id: props.info.id }).then(({ data }) => {
    deployArr.value = data;
    deployEdit.visible = true;
  });
}

function goBack() {
  emit("changePage", "page");
}

function handleChange(value) {
  console.log(value);
  localStorage.setItem("deployType", JSON.stringify(value));
}

onActivated(() => {
  console.log("Deploy component activated with info:", props.info);
  if (props.info.dockerComposeContent) {
    step.value = 1;
  } else {
    step.value = 0;
  }
  createDockerfile(props.info);
  createDockerCompose(props.info);
  fetchHostList();
  fetchServiceList();
  // v-show 使 DOM 始终存在，每次 destroy → recreate 安全地初始化
  initCodeMirrorEditors();
});

onMounted(() => {
  let deployType = localStorage.getItem("deployType");
  if (deployType) {
    formData.deployType = Number(localStorage.getItem("deployType"));
  } else {
    formData.deployType = 1;
  }
});

onUnmounted(() => {
  destroyCodeMirrorEditors();
});
</script>
<style>
.top-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  font-size: 18px;
  font-weight: bold;
}

.codemirror-container {
  width: 90%;
  min-height: 300px;
  max-height: 500px;
  overflow: auto;
  background-color: #282c34;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.codemirror-container .cm-editor {
  height: 100%;
}
</style>
