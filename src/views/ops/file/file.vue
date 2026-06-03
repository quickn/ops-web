<script setup lang="ts">
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup, EditorView } from "codemirror";
import { autocompletion } from "@codemirror/autocomplete";
import {
  createFileApi,
  deleteFileApi,
  getByPathApi,
  getFileListApi,
  saveFileApi,
  syncFileByJumpServer,
} from "@/api/file";
import { FileInfoForm, FileListInfo, SyncFileParam } from "@/api/file/types";
import { listAll } from "@/api/monitor/service";
import { ServiceInfo } from "@/api/monitor/service/types";

defineOptions({
  name: "FileManagement",
  inheritAttrs: false,
});

interface Props {
  agentId?: number;
  filePath?: string;
  serviceId?: number;
  serviceName?: string;
  hostname?: string;
}

const props = withDefaults(defineProps<Props>(), {
  agentId: undefined,
  filePath: "/usr/local/nginx",
  serviceId: undefined,
  serviceName: undefined,
  hostname: undefined,
});

const queryFormRef = ref(ElForm);
const deptFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<string[]>([]);
const dialog = reactive<DialogOption>({
  visible: false,
});

const dialogEdit = reactive<DialogOption>({
  visible: false,
});

/** 同步对话框状态 */
const syncDialog = reactive({
  visible: false,
  loading: false,
  targetServiceIds: [] as number[],
  serviceList: [] as ServiceInfo[],
  syncType: 1,
});

/** 获取选中服务的 workPath 列表 */
const selectedWorkPaths = computed(() => {
  if (syncDialog.targetServiceIds.length === 0) return [];

  return syncDialog.targetServiceIds
    .map((id) => {
      const service = syncDialog.serviceList.find((s) => s.id === id);
      if (!service) return null;

      const workPath = service.workPath || "";
      // 目标路径：workPath + 文件名（替换掉源路径）
      const targetPath =
        workPath + queryParams.filePath.replace(queryParams.workPath, "");
      return {
        name: service.name,
        workPath: workPath || "未配置工作路径",
        targetPath: targetPath,
      };
    })
    .filter(Boolean);
});

const queryParams = reactive<FileInfoForm>({
  filePath: props.filePath,
  agentId: props.agentId,
  workPath: props.filePath,
  showHide: false,
  onlyShowFile: false,
  onlyShowDic: false,
});

const fileList = ref<FileListInfo[]>();
const breadcrumbList = ref<Array<{ name: string; path: string }>>([]);

const formData = reactive<FileInfoForm>({
  fileName: "",
  filePath: "",
  agentId: props.agentId,
});

/** 进入目录 */
function enterDirectory(dirName: string) {
  queryParams.filePath = `${queryParams.filePath}/${dirName}`;
  updateBreadcrumb();
  handleQuery();
}

/** 更新面包屑导航 */
function updateBreadcrumb() {
  const paths = queryParams.filePath.split("/").filter((p) => p);
  breadcrumbList.value = [
    { name: "根目录", path: "/" },
    ...paths.map((p, index) => ({
      name: p,
      path: "/" + paths.slice(0, index + 1).join("/"),
    })),
  ];
}

/** 点击面包屑导航 */
function handleBreadcrumbClick(path: string) {
  queryParams.filePath = path;
  updateBreadcrumb();
  handleQuery();
}

/** 查询 */
function handleQuery() {
  if (!queryParams.agentId) {
    ElMessage.warning("请选择Agent");
    return;
  }
  loading.value = true;
  getFileListApi(queryParams).then(({ data }) => {
    fileList.value = data;
    loading.value = false;
  });
}

/** 删除选中文件 */
function handleDelete() {
  if (ids.value.length === 0) {
    ElMessage.warning("请先选择要删除的文件");
    return;
  }
  const fileNames = ids.value.join("、");
  ElMessageBox.confirm(`确认删除文件「${fileNames}」?`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    const deletePromises = ids.value.map((fileName) =>
      deleteFileApi({
        fileName,
        filePath: queryParams.filePath,
        agentId: queryParams.agentId!,
      })
    );
    Promise.all(deletePromises)
      .then(() => {
        ElMessage.success("删除成功");
        ids.value = [];
        handleQuery();
      })
      .finally(() => (loading.value = false));
  });
}

function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.agentId = props.agentId;
  queryParams.filePath = props.filePath;
  queryParams.showHide = false;
  queryParams.onlyShowFile = false;
  queryParams.onlyShowDic = false;
  updateBreadcrumb();
  handleQuery();
}

/** 行复选框选中记录选中ID集合 */
function handleSelectionChange(selection: any) {
  ids.value = selection.map((item: any) => item.name);
}

/** 添加数据  */
async function handleSubmit() {
  formData.agentId = queryParams.agentId;
  deptFormRef.value.validate((valid: any) => {
    if (valid) {
      createFileApi(formData)
        .then(() => {
          ElMessage.success("新增成功");
          closeDialog();
          handleQuery();
        })
        .finally(() => (loading.value = false));
    }
  });
}

/** 保存文件 */
function handleSaveFile() {
  const content = getCommanContent();
  if (!content && content !== "") {
    ElMessage.warning("编辑器未就绪，请稍后再试");
    return;
  }
  loading.value = true;
  saveFileApi({
    fileName: queryParams.fileName,
    filePath: queryParams.filePath,
    fileContent: content,
    agentId: queryParams.agentId,
  })
    .then(() => {
      ElMessage.success("保存成功");
    })
    .finally(() => (loading.value = false));
}

/** 拷贝编辑内容到剪贴板 */
async function handleCopyContent() {
  const content = getCommanContent();
  if (!content && content !== "") {
    ElMessage.warning("编辑器未就绪，请稍后再试");
    return;
  }
  try {
    await navigator.clipboard.writeText(content);
    ElMessage.success("已复制到剪贴板");
  } catch {
    ElMessage.error("复制失败，请手动复制");
  }
}

/** 打开同步对话框 */
function openSyncDialog() {
  if (ids.value.length === 0) {
    ElMessage.warning("请先选择要同步的文件");
    return;
  }
  // 加载服务列表
  listAll().then(({ data }) => {
    if (data) {
      syncDialog.serviceList = data.filter(
        (item) => item.id !== props.serviceId
      );
    }
    syncDialog.targetServiceIds = [];
    syncDialog.visible = true;
  });
}

/** 关闭同步对话框 */
function closeSyncDialog() {
  syncDialog.visible = false;
  syncDialog.targetServiceIds = [];
}

/** 执行文件同步 */
async function handleSyncSubmit() {
  if (syncDialog.targetServiceIds.length === 0) {
    ElMessage.warning("请选择目标环境");
    return;
  }
  syncDialog.loading = true;
  const syncPromises = ids.value.flatMap((fileName) =>
    syncDialog.targetServiceIds.map((serviceId) => {
      const service = syncDialog.serviceList.find((s) => s.id === serviceId);
      const workPath = service?.workPath || "";
      const sourcePath = `${queryParams.filePath}/${fileName}`;
      const filePath = sourcePath.replace(queryParams.workPath, "");
      // 构建目标路径：workPath + 文件名（替换掉源路径中的filePath部分）
      const targetPath = workPath ? `${workPath}${filePath}` : sourcePath;
      const params: SyncFileParam = {
        sourceAgentId: queryParams.agentId,
        jumpServiceId: serviceId,
        sourcePath: sourcePath,
        targetPath: targetPath,
        syncType: 1,
      };
      return syncFileByJumpServer(params);
    })
  );

  Promise.all(syncPromises)
    .then(() => {
      ElMessage.success("同步完成");
      closeSyncDialog();
    })
    .catch(() => {
      ElMessage.error("同步失败，请检查日志");
    })
    .finally(() => {
      syncDialog.loading = false;
    });
}

/**
 * 打开弹窗
 *
 * @param fileName 文件名
 */
async function openDialog(fileName?: string) {
  if (fileName) {
    dialog.visible = true;
    initCodeContent();
    dialog.title = "编辑文档";
    queryParams.fileName = fileName;
    getByPathApi(queryParams).then(({ data }) => {
      form.value.commandContent = data || "";
    });
  } else {
    formData.filePath = queryParams.filePath;
    dialogEdit.visible = true;
  }
}

/** 关闭弹窗 */
function closeDialog() {
  dialog.visible = false;
  dialogEdit.visible = false;
  form.value.commandContent = null;
  resetForm();
}

const allKeyList = ref([]);

// 自定义的代码不全，options为自定义内容，以@开头进行匹配
function myCompletions(context) {
  let word = context.matchBefore(/@\w*/);
  if (!word && !context.explicit) return null;
  return {
    from: word.from ? word.from : context.pos,
    options: allKeyList.value,
  };
}

const codeData = reactive({
  form: {},
});

let editor: any;
const { form } = toRefs(codeData);

// 初始化编辑器
function initCodeContent() {
  setTimeout(() => {
    if (!editor) {
      editor = new EditorView({
        doc: "Press Ctrl-Space in here...\n",
        extensions: [
          basicSetup,
          javascript(),
          oneDark,
          autocompletion({ override: [myCompletions] }),
        ],
        parent: document.getElementById("coder"),
        options: {
          lineNumbers: true,
          line: true,
          extraKeys: {
            Ctrl: "autocomplete",
          },
          matchBrackets: true,
        },
      });
    }
    editor.dispatch({
      changes: {
        from: 0,
        to: editor.state.doc.length,
        insert: form.value.commandContent || "Press Ctrl-Space in here...\n",
      },
    });
  }, 500);
}

// 获取当前编辑器中的内容字符串
function getCommanContent() {
  if (!editor) {
    return null;
  }
  return editor.state.doc.toString();
}

/** 重置表单  */
function resetForm() {
  deptFormRef.value.resetFields();
  deptFormRef.value.clearValidate();
}

const rules = reactive({
  fileName: [{ required: true, message: "文件名", trigger: "blur" }],
  filePath: [{ required: true, message: "文件路径", trigger: "blur" }],
});

// 暴露方法给父组件
defineExpose({
  openDialog,
  getCommanContent,
  queryParams,
  form,
});

onMounted(() => {
  updateBreadcrumb();
  handleQuery();
});
</script>

<template>
  <div class="app-container">
    <div class="search-container">
      <el-form
        ref="queryFormRef"
        :model="queryParams"
        :inline="true"
        style="display: flex; flex-wrap: wrap; align-items: center"
        @submit.prevent
      >
        <!-- 当前服务器信息 -->

        <el-form-item>
          <el-alert
            v-if="props.hostname"
            :title="`${props.serviceName || '未知服务'} / ${props.hostname}`"
            type="info"
            :closable="false"
            show-icon
          />
        </el-form-item>

        <el-form-item label="路径" prop="path">
          <el-input
            v-model="queryParams.filePath"
            placeholder="请输入路径"
            clearable
            style="width: 400px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item prop="showHide">
          <el-checkbox v-model="queryParams.showHide" @change="handleQuery">
            显示隐藏文件
          </el-checkbox>
        </el-form-item>
        <el-form-item prop="onlyShowFile">
          <el-checkbox v-model="queryParams.onlyShowFile" @change="handleQuery">
            只显示文件
          </el-checkbox>
        </el-form-item>
        <el-form-item prop="onlyShowDic">
          <el-checkbox v-model="queryParams.onlyShowDic" @change="handleQuery">
            只显示目录
          </el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button class="filter-item" type="primary" @click="handleQuery">
            <i-ep-search />
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <i-ep-refresh />
            重置
          </el-button>
        </el-form-item>
        <el-form-item style="margin-left: auto">
          <el-button
            v-hasPerm="['sys:dept:add']"
            type="success"
            @click="openDialog()"
          >
            <i-ep-plus />
            新增
          </el-button>
          <el-button
            v-hasPerm="['sys:dept:delete']"
            type="danger"
            :disabled="ids.length === 0"
            @click="handleDelete()"
          >
            <i-ep-delete />
            删除
          </el-button>
          <el-button
            type="warning"
            :disabled="ids.length === 0"
            @click="openSyncDialog()"
          >
            <i-ep-upload />
            同步
          </el-button>
          <!-- 插槽：父组件可以自定义操作按钮 -->
          <slot name="operations"></slot>
        </el-form-item>
      </el-form>
    </div>

    <!-- 面包屑导航 -->
    <el-breadcrumb separator="/" style="margin: 16px 0">
      <el-breadcrumb-item v-for="(item, index) in breadcrumbList" :key="index">
        <a
          v-if="index < breadcrumbList.length - 1"
          @click.prevent="handleBreadcrumbClick(item.path)"
          style="color: #409eff; cursor: pointer"
        >
          {{ item.name }}
        </a>
        <span v-else style="color: #303133">{{ item.name }}</span>
      </el-breadcrumb-item>
    </el-breadcrumb>

    <el-card>
      <el-table
        v-loading="loading"
        :data="fileList"
        row-key="name"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column
          prop="name"
          label="文件名称"
          min-width="200"
          show-overflow-tooltip
        >
          <template #default="scope">
            <div style="display: flex; gap: 8px; align-items: center">
              <el-icon
                v-if="scope.row.type === 'directory'"
                style="color: #409eff; cursor: pointer"
                @click="enterDirectory(scope.row.name)"
              >
                <i-ep-folder />
              </el-icon>
              <el-icon v-else style="color: #67c23a">
                <i-ep-document />
              </el-icon>
              <span
                v-if="scope.row.type === 'directory'"
                style="color: #409eff; cursor: pointer"
                @click="enterDirectory(scope.row.name)"
              >
                {{ scope.row.name }}
              </span>
              <span v-else>{{ scope.row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80" align="center" />
        <el-table-column
          prop="permissions"
          label="权限"
          width="120"
          align="center"
        />
        <el-table-column prop="owner" label="所有者" width="100" />
        <el-table-column prop="group" label="用户组" width="100" />
        <el-table-column prop="size" label="大小" width="100" align="center" />
        <el-table-column prop="modifyTime" label="修改时间" width="180" />

        <el-table-column label="操作" fixed="right" align="left" width="120">
          <template #default="scope">
            <el-button
              v-if="scope.row.type === 'file'"
              type="primary"
              link
              size="small"
              @click.stop="openDialog(scope.row.name)"
            >
              <i-ep-edit />
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialog.visible"
      :title="dialog.title"
      width="1000px"
      class="file-editor-dialog"
      @closed="closeDialog"
    >
      <!-- 插槽：父组件可以自定义对话框头部操作按钮 -->
      <template #header>
        <slot name="dialog-header" :get-content="getCommanContent">
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              width: 100%;
            "
          >
            <span style="font-size: 14px; color: #303133">
              {{ queryParams.filePath }}/{{ queryParams.fileName }}
            </span>
            <div style="display: flex; gap: 8px">
              <el-button @click="handleCopyContent">
                <i-ep-document-copy />
                拷贝内容
              </el-button>
              <el-button type="primary" @click="handleSaveFile">
                保存文件
              </el-button>
            </div>
          </div>
        </slot>
      </template>
      <div id="coder"></div>
    </el-dialog>

    <!-- 文件同步对话框 -->
    <el-dialog
      v-model="syncDialog.visible"
      title="文件同步"
      width="600px"
      @closed="closeSyncDialog"
    >
      <el-form label-width="100px">
        <el-form-item label="源服务">
          <span style="color: #606266"
            >{{ props.serviceName || "未知服务" }} /
            {{ props.hostname || "未知主机" }}</span
          >
        </el-form-item>
        <el-form-item label="源文件">
          <el-tag
            v-for="name in ids"
            :key="name"
            style="margin: 2px"
            type="info"
          >
            {{ name }}
          </el-tag>
        </el-form-item>
        <el-form-item label="源路径">
          <span style="color: #606266">{{ queryParams.filePath }}</span>
        </el-form-item>
        <el-form-item label="目标环境">
          <el-select
            v-model="syncDialog.targetServiceIds"
            multiple
            placeholder="请选择目标环境"
            style="width: 100%"
          >
            <el-option
              v-for="item in syncDialog.serviceList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="selectedWorkPaths.length > 0" label="目标路径">
          <div style="width: 100%">
            <div
              v-for="(path, index) in selectedWorkPaths"
              :key="index"
              style="
                padding: 8px 12px;
                margin-bottom: 8px;
                background: #f5f7fa;
                border-left: 3px solid #409eff;
                border-radius: 4px;
              "
            >
              <div style="margin-bottom: 4px">
                <span style="font-weight: 500; color: #303133">{{
                  path.name
                }}</span>
              </div>
              <div style="margin-bottom: 2px; font-size: 12px; color: #909399">
                工作路径: {{ path.workPath }}
              </div>
              <div style="font-size: 12px; color: #67c23a">
                同步到: {{ path.targetPath }}
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="同步方式">
          <el-radio-group v-model="syncDialog.syncType" disabled>
            <el-radio :value="1"> 从源服务器 rsync 到跳板机并分发 </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeSyncDialog">取消</el-button>
        <el-button
          type="primary"
          :loading="syncDialog.loading"
          @click="handleSyncSubmit"
        >
          开始同步
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dialogEdit.visible"
      :title="dialogEdit.title"
      width="600px"
      @closed="closeDialog"
    >
      <el-form
        ref="deptFormRef"
        :model="formData"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="文件路径" prop="filePath">
          <el-input
            v-model="formData.filePath"
            placeholder="文件路径"
            disabled
          />
        </el-form-item>
        <el-form-item label="文件名称" prop="fileName">
          <el-input v-model="formData.fileName" placeholder="文件名称" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleSubmit"> 确 定</el-button>
          <el-button @click="closeDialog"> 取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style>
.el-dialog {
  margin: 20px auto;
}

.cm-editor {
  height: 800px;
}

.file-editor-dialog {
  display: flex;
  flex-direction: column;
  max-height: 94vh;
  margin-top: 3vh !important;
}

.file-editor-dialog .el-dialog__header {
  flex-shrink: 0;
}

.file-editor-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
