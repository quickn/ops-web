<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="类型" prop="type">
          <el-select v-model="queryParams.type" placeholder="全部" clearable style="width: 150px">
            <el-option label="shell" value="shell" />
            <el-option label="python" value="python" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词" prop="keyword">
          <el-input
            v-model="queryParams.keyword"
            placeholder="请输入指令关键词"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          />
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
        <el-form-item style="margin-left: auto">
          <el-button type="success" @click="handleAdd">
            <el-icon>
              <Plus />
            </el-icon>
            新增
          </el-button>
          <el-button
            type="danger"
            :disabled="selectedIds.length === 0"
            @click="handleBatchDelete"
          >
            <el-icon>
              <Delete />
            </el-icon>
            批量删除
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card shadow="never">
      <el-table
        v-loading="loading"
        :data="dataList"
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column label="指令名称" prop="cmdName" width="300" show-overflow-tooltip />
        <el-table-column label="指令内容" prop="cmd" show-overflow-tooltip>
          <template #default="scope">
            <pre class="cmd-cell">{{ scope.row.cmd }}</pre>
          </template>
        </el-table-column>
        <el-table-column label="类型" prop="type" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.type === 'shell' ? 'success' : 'warning'" size="small">
              {{ scope.row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" prop="updateTime" width="180" />
        <el-table-column fixed="right" label="操作" width="150" align="center">
          <template #default="scope">
            <el-button type="primary" size="small" link @click="handleEdit(scope.row)">
              <el-icon>
                <Edit />
              </el-icon>
              编辑
            </el-button>
            <el-button type="danger" size="small" link @click="handleDelete(scope.row)">
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="1000px"
      :close-on-click-modal="false"
      @opened="initEditor"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="80px">
        <el-form-item label="指令名称" prop="cmdName">
          <el-input v-model="formData.cmdName" placeholder="请输入指令名称" clearable />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="shell" value="shell" />
            <el-option label="python" value="python" />
          </el-select>
        </el-form-item>
        <el-form-item label="指令内容" prop="cmd">
          <div id="cmd-editor" ref="editorRef" class="code-editor"></div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Delete, Edit, Plus, Refresh, Search } from "@element-plus/icons-vue";
import { addCmdLib, batchDeleteCmdLib, deleteCmdLib, pageCmdLib, updateCmdLib } from "@/api/ops/cmdlib";
import { CmdLib, CmdLibQuery } from "@/api/ops/cmdlib/types";
import { basicSetup, EditorView } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";

defineOptions({
  name: "CmdLibIndex",
  inheritAttrs: false
});

const queryFormRef = ref(ElForm);
const formRef = ref(ElForm);
const loading = ref(false);
const submitLoading = ref(false);
const total = ref(0);
const dialogVisible = ref(false);
const dialogTitle = ref("");
const selectedIds = ref<number[]>([]);
const isEdit = ref(false);

const queryParams = reactive<CmdLibQuery>({
  pageNum: 1,
  pageSize: 15
});

const dataList = ref<CmdLib[]>([]);

const editorRef = ref<HTMLDivElement>();
let editor: EditorView | null = null;

const formData = reactive<CmdLib>({
  cmdName: "",
  cmd: "",
  type: "shell"
});

const rules = reactive({
  cmdName: [{ required: true, message: "请输入指令名称", trigger: "blur" }],
  type: [{ required: true, message: "请选择类型", trigger: "change" }],
  cmd: [{ required: true, message: "请输入指令内容", trigger: "blur" }]
});


/** 查询 */
function handleQuery() {
  loading.value = true;
  pageCmdLib(queryParams)
    .then(({ data }) => {
      dataList.value = data.records;
      total.value = data.total;
    })
    .finally(() => {
      loading.value = false;
    });
}

/** 重置 */
function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  handleQuery();
}

/** 行选中 */
function handleSelectionChange(selection: CmdLib[]) {
  selectedIds.value = selection.map((item) => item.id!);
}

/** 初始化代码编辑器 */
function initEditor() {
  nextTick(() => {
    const container = document.getElementById("cmd-editor") as HTMLDivElement | null;
    if (!container) return;

    if (!editor) {
      editor = new EditorView({
        doc: "",
        extensions: [basicSetup, javascript(), oneDark],
        parent: container
      });
    }

    const docText = formData.cmd || "";
    if (editor.state.doc.toString() !== docText) {
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: docText }
      });
    }
    editor.requestMeasure();
    editor.focus();
  });
}

/** 同步编辑器内容到表单 */
function syncEditorToForm() {
  if (editor) {
    formData.cmd = editor.state.doc.toString();
  }
}

/** 销毁编辑器 */
function destroyEditor() {
  if (editor) {
    editor.destroy();
    editor = null;
  }
}

/** 监听表单指令内容变化，同步到编辑器 */
watch(
  () => formData.cmd,
  (val) => {
    if (!editor) return;
    const text = val || "";
    if (editor.state.doc.toString() === text) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: text }
    });
  }
);

/** 新增 */
function handleAdd() {
  isEdit.value = false;
  dialogTitle.value = "新增指令";
  Object.assign(formData, { id: undefined, cmdName: "", cmd: "", type: "shell" });
  dialogVisible.value = true;
}

/** 编辑 */
function handleEdit(row: CmdLib) {
  isEdit.value = true;
  dialogTitle.value = "编辑指令";
  Object.assign(formData, row);
  dialogVisible.value = true;
}

/** 提交 */
function handleSubmit() {
  syncEditorToForm();
  formRef.value.validate((valid: boolean) => {
    if (!valid) return;
    submitLoading.value = true;
    const apiCall = isEdit.value ? updateCmdLib(formData) : addCmdLib(formData);
    apiCall
      .then(() => {
        ElMessage.success(isEdit.value ? "编辑成功" : "新增成功");
        dialogVisible.value = false;
        handleQuery();
      })
      .finally(() => {
        submitLoading.value = false;
      });
  });
}

/** 删除 */
function handleDelete(row: CmdLib) {
  ElMessageBox.confirm("确定要删除该指令吗？", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(() => {
    deleteCmdLib(row.id!).then(() => {
      ElMessage.success("删除成功");
      handleQuery();
    });
  });
}

/** 批量删除 */
function handleBatchDelete() {
  if (selectedIds.value.length === 0) return;
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedIds.value.length} 条指令吗？`,
    "警告",
    {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    }
  ).then(() => {
    batchDeleteCmdLib(selectedIds.value).then(() => {
      ElMessage.success("删除成功");
      selectedIds.value = [];
      handleQuery();
    });
  });
}

onMounted(() => {
  handleQuery();
});

onUnmounted(() => {
  destroyEditor();
});
</script>

<style scoped>
.app-container {
  padding: 20px;
}

.search-container {
  margin-bottom: 20px;
}

.cmd-cell {
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  font-family: "Courier New", Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  max-height: 150px;
  overflow-y: auto;
}

.code-editor {
  height: 500px;
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.code-editor :deep(.cm-editor) {
  height: 100%;
}
</style>
