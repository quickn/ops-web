<template>
  <div class="app-container config-edit-page">
    <el-card shadow="never" class="edit-card">
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="100px"
        class="edit-form"
      >
        <div class="form-fields-wrapper">
          <el-form-item label="服务器地址" prop="configId">
            <el-select
              v-model="editForm.configId"
              placeholder="请选择 Nacos 服务器"
              clearable
              filterable
              style="width: 100%"
              disabled
            >
              <el-option
                v-for="server in serverList"
                :key="server.id"
                :label="`${server.configName || ''} (${server.url || ''})`"
                :value="server.id!"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Data ID" prop="dataId">
            <el-input
              v-model="editForm.dataId"
              placeholder="请输入配置ID"
              :disabled="isEdit"
            />
          </el-form-item>
          <el-form-item label="Group" prop="group">
            <el-input
              v-model="editForm.group"
              placeholder="配置分组，默认 DEFAULT_GROUP"
            />
          </el-form-item>
          <el-form-item label="命名空间" prop="tenant">
            <el-select
              v-model="editForm.tenant"
              placeholder="请选择命名空间"
              clearable
              filterable
              style="width: 100%"
            >
              <el-option label="public（默认）" value="" />
              <el-option
                v-for="ns in namespaceList"
                :key="ns.namespace"
                :label="ns.namespaceShowName || ns.namespace"
                :value="ns.namespace || ''"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="配置类型" prop="type">
            <el-select
              v-model="editForm.type"
              placeholder="请选择配置类型"
              style="width: 100%"
            >
              <el-option label="yaml" value="yaml" />
              <el-option label="json" value="json" />
              <el-option label="properties" value="properties" />
              <el-option label="xml" value="xml" />
              <el-option label="text" value="text" />
              <el-option label="html" value="html" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="配置内容" prop="content" class="editor-form-item">
          <div id="yaml-editor" class="yaml-editor-container"></div>
        </el-form-item>
        <el-form-item class="btn-form-item">
          <el-button
            type="primary"
            :loading="submitLoading"
            @click="handleSubmit"
          >
            <i-ep-check />
            保 存
          </el-button>
          <el-button @click="goBack">
            <i-ep-close />
            取 消
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useTagsViewStore } from "@/store/modules/tagsView";
import { basicSetup, EditorView } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { yaml } from "@codemirror/lang-yaml";
import {
  getConfigDetail,
  getNacosServerList,
  getNamespaces,
  publishConfig,
} from "@/api/nacos";
import { NacosConfigPublish, NacosNamespace } from "@/api/nacos/types";
import { AccountConfig } from "@/api/accountConfig/types";

defineOptions({
  name: "NacosConfigEdit",
  inheritAttrs: false,
});

const route = useRoute();
const router = useRouter();
const tagsViewStore = useTagsViewStore();
const editFormRef = ref(ElForm);
const submitLoading = ref(false);
const namespaceList = ref<NacosNamespace[]>([]);
const serverList = ref<AccountConfig[]>([]);
let yamlEditor: EditorView | null = null;

const isEdit = ref(false);

const editForm = reactive<NacosConfigPublish>({
  configId: route.query.configId ? Number(route.query.configId) : undefined,
  dataId: (route.query.dataId as string) || "",
  group: (route.query.group as string) || "DEFAULT_GROUP",
  tenant: (route.query.tenant as string) || "",
  content: "",
  type: (route.query.type as string) || "yaml",
});

const editRules = reactive({
  dataId: [{ required: true, message: "请输入 Data ID", trigger: "blur" }],
  content: [{ required: true, message: "请输入配置内容", trigger: "blur" }],
});

// 判断编辑模式
const dataIdParam = route.query.dataId as string;
isEdit.value = !!dataIdParam;

/** 返回上一页并关闭当前页 */
function goBack() {
  // 从标签页和缓存中删除当前页面
  tagsViewStore.delView(route);
  // 返回上一页
  router.back();
}

/** 加载 Nacos 服务器列表 */
function loadServerList() {
  getNacosServerList().then(({ data }) => {
    if (data && Array.isArray(data)) {
      serverList.value = data;
      // 如果从路由参数指定了configId，则设置对应的服务器
      if (editForm.configId && data.length > 0) {
        const server = data.find(
          (s: AccountConfig) => s.id === editForm.configId
        );
        if (server) {
          editForm.configId = server.id;
        }
      }
      // 如果没有指定服务器且有服务器列表，默认选择第一个
      else if (!editForm.configId && data.length > 0) {
        editForm.configId = data[0].id;
      }
    }
  });
}

/** 加载命名空间列表 */
function loadNamespaces() {
  if (!editForm.configId) return;
  getNamespaces({ configId: editForm.configId }).then(({ data }) => {
    if (data && Array.isArray(data)) {
      namespaceList.value = data;
    }
  });
}

/** 初始化 CodeMirror YAML 编辑器 */
function initEditor() {
  setTimeout(() => {
    const container = document.getElementById("yaml-editor");
    if (!container) return;

    if (yamlEditor) {
      yamlEditor.destroy();
      yamlEditor = null;
    }

    yamlEditor = new EditorView({
      doc: editForm.content || "",
      extensions: [basicSetup, yaml(), oneDark],
      parent: container,
    });
  }, 200);
}

/** 获取编辑器中的内容 */
function getEditorContent(): string {
  if (!yamlEditor) return "";
  return yamlEditor.state.doc.toString();
}

/** 提交保存 */
function handleSubmit() {
  editForm.content = getEditorContent();
  editFormRef.value?.validate((valid: boolean) => {
    if (!valid) return;
    if (!editForm.content.trim()) {
      ElMessage.warning("请输入配置内容");
      return;
    }
    submitLoading.value = true;
    publishConfig({
      configId: editForm.configId,
      dataId: editForm.dataId,
      group: editForm.group,
      tenant: editForm.tenant,
      content: editForm.content,
      type: editForm.type,
    })
      .then(() => {
        ElMessage.success(isEdit.value ? "编辑成功" : "新增成功");
        goBack();
      })
      .finally(() => {
        submitLoading.value = false;
      });
  });
}

onMounted(() => {
  loadServerList();
  loadNamespaces();
  if (isEdit.value) {
    getConfigDetail({
      configId: editForm.configId,
      dataId: editForm.dataId,
      group: editForm.group,
      tenant: editForm.tenant,
    }).then(({ data }) => {
      editForm.content = data.content || "";
      initEditor();
    });
  } else {
    initEditor();
  }
});

onUnmounted(() => {
  if (yamlEditor) {
    yamlEditor.destroy();
    yamlEditor = null;
  }
});
</script>

<style scoped>
.config-edit-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 84px);
}

.edit-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.edit-card :deep(.el-card__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.edit-form {
  display: flex;
  flex: 1;
  flex-direction: column;
  max-width: 100%;
  overflow: hidden;
}

.form-fields-wrapper {
  flex-shrink: 0;
}

.editor-form-item {
  flex: 1;
  min-height: 0;
}

.editor-form-item :deep(.el-form-item__content) {
  display: flex;
  flex-direction: column;
}

.btn-form-item {
  flex-shrink: 0;
  margin-bottom: 0;
}

.yaml-editor-container {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: #282c34;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

/* 自定义滚动条样式 */
.yaml-editor-container ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.yaml-editor-container ::-webkit-scrollbar-track {
  background: #f5f7fa;
  border-radius: 4px;
}

.yaml-editor-container ::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 4px;
}

.yaml-editor-container ::-webkit-scrollbar-thumb:hover {
  background: #909399;
}
</style>
