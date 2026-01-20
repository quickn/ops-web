<template>
  <div class="app-container">
    <div class="top-title">
      <div>应用管理 / 配置文件</div>
      <el-button type="primary" @click="goBack">返回</el-button>
    </div>
    <el-card shadow="never">
      <el-form ref="deptFormRef" label-width="120px" :model="formData" :rules="rules">
        <div v-if="step == 0">
          <el-form-item label="Dockerfile：" prop="dockerfileContent">
            <el-input v-model="formData.dockerfileContent" style="width: 90%" type="textarea" :rows="15"
              placeholder="请输入Dockerfile内容" resize="none" />
          </el-form-item>
          <el-form-item label="DockerCompose:" prop="dockerComposeContent">
            <el-input v-model="formData.dockerComposeContent" style="width: 90%" type="textarea" :rows="15"
              placeholder="请输入Docker Compose配置内容" resize="none" />
          </el-form-item>
        </div>
      </el-form>
      <div style="width: 100%; text-align: center">
        <el-button type="primary" @click="deployBtn">保存</el-button>
        <el-button @click="goBack">返回</el-button>
      </div>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import {
  listData,
  deleteByIds,
  addData,
  putData,
  syncData,
  jarData,
  agentList,
  deploy,
} from "@/api/monitor/project";
import { LogInfo } from "@/api/monitor/log/types";
import { ServiceInfo } from "@/api/monitor/service/types";
import { listPage } from "@/api/monitor/agent";
import { listAll } from "@/api/monitor/service";
import { de, el } from "element-plus/es/locale";
import { ElLoading } from "element-plus";
const props = defineProps({
  info: {
    type: Object,
    required: true,
  },
});
const queryFormRef = ref(ElForm);
const deptFormRef = ref(ElForm);
const dataTableRef = ref(ElTable);
const formData = reactive<LogInfo>({
  dockerfileContent: props.info.dockerfileContent || "",
  dockerComposeContent: props.info.dockerComposeContent || "",
  fileType: 1,
  serviceId: "",
  sourceAgentId: "",
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
  dockerfileContent.value = "";
  dockerfileLoading.value = true;
  if (row.dockerfileContent && row.dockerfileContent.trim()) {
    formData.dockerfileContent = row.dockerfileContent;
  } else {
    // 否则生成默认的Dockerfile，使用正确的JAR文件名
    formData.dockerfileContent = getDefaultDockerfile(row.dockerfileContent);
  }
  dockerfileLoading.value = false;
}
function createDockerCompose(row) {
  dockerComposeContent.value = "";
  dockerComposeContent.value = true;
  if (row.dockerComposeContent && row.dockerComposeContent.trim()) {
    formData.dockerComposeContent = row.dockerComposeContent;
  } else {
    // 否则生成默认的Dockerfile，使用正确的JAR文件名
    formData.dockerComposeContent = getDefaultDockerCompose(
      row.dockerComposeContent
    );
  }
  dockerfileLoading.value = false;
}
function deployBtn() {
  putData({
    id: props.info.id,
    dockerfileContent: formData.dockerfileContent,
    dockerComposeContent: formData.dockerComposeContent,
  }).then(() => {
    ElMessage.success("配置保存成功");
  });
}
function goBack() {
  emit("changePage", "page");
}
onActivated(() => {
  createDockerfile(props.info);
  createDockerCompose(props.info);
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
</style>
