<script setup lang="ts">
import {javascript} from "@codemirror/lang-javascript";
import {oneDark} from "@codemirror/theme-one-dark";
import {basicSetup, EditorView} from "codemirror";
import {autocompletion} from "@codemirror/autocomplete";
import {
  addConfig,
  checkConfigApi,
  deleteConfig,
  getAgentList,
  getConfig,
  listFiles,
  saveAndReloadConfigApi,
} from "@/api/nginx";
import {NginxFile} from "@/api/nginx/types";
import {FileInfo} from "@/api/monitor/file-sync/types"
import {AgentConfig} from "@/api/monitor/agent/types";

defineOptions({
  name: "NginxFile",
  inheritAttrs: false,
});

const queryFormRef = ref(ElForm);
const deptFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);
const dialog = reactive<DialogOption>({
  visible: false,
});

const dialogEdit = reactive<DialogOption>({
  visible: false,
});

const queryParams = reactive<NginxFile>({path: "/usr/local/nginx", agentId: undefined});
const deptList = ref<FileInfo[]>();
const agentList = ref<AgentConfig[]>([]);
const breadcrumbList = ref<Array<{name: string, path: string}>>([]);

const formData = reactive<NginxFile>({
  fileName: null,
  fileNamePath: null,
});

/** 进入目录 */
function enterDirectory(dirName: string) {
  queryParams.path = `${queryParams.path}/${dirName}`;
  updateBreadcrumb();
  handleQuery();
}

/** 更新面包屑导航 */
function updateBreadcrumb() {
  const paths = queryParams.path.split('/').filter(p => p);
  breadcrumbList.value = [
    { name: '根目录', path: '/' },
    ...paths.map((p, index) => ({
      name: p,
      path: '/' + paths.slice(0, index + 1).join('/')
    }))
  ];
}

/** 点击面包屑导航 */
function handleBreadcrumbClick(path: string) {
  queryParams.path = path;
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
  listFiles(queryParams).then(({data}) => {
    deptList.value = data;
    loading.value = false;
  });
}

/** 加载Agent列表 */
function loadAgentList() {
  getAgentList().then(({data}) => {
    if (data) {
      agentList.value = data || [];
    }
  });
}

function handleDelete(deptId?: number) {
  ElMessageBox.confirm(`确认删除已选中的数据项?`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    deleteConfig(deptId!).then(() => {
      ElMessage.success("删除成功");
      resetQuery();
    });
  });
}

function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.agentId = undefined;
  queryParams.path = "/usr/local/nginx";
  updateBreadcrumb();
  handleQuery();
}

/** 行复选框选中记录选中ID集合 */
function handleSelectionChange(selection: any) {
  ids.value = selection.map((item: any) => item.id);
}

/** 添加数据  */
async function handleSubmit() {
  deptFormRef.value.validate((valid: any) => {
    if (valid) {
      addConfig(formData)
        .then(() => {
          ElMessage.success("新增成功");
          closeDialog();
          handleQuery();
        })
        .finally(() => (loading.value = false));
    }
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
    queryParams.fileNamePath = `${queryParams.path}/${fileName}`;
    getConfig(queryParams).then(({data}) => {
      form.value.commandContent = data;
    });
  } else {
    dialogEdit.visible = true;
  }
}

/** 表单提交 */
function checkConfig() {
  loading.value = true;
  if (form.value.commandContent) {
    form.value.commandContent = getCommanContent();
    queryParams.conf = form.value.commandContent;
    checkConfigApi(queryParams)
      .then(() => {
        ElMessage.success("校验通过");
      })
      .finally(() => {
        loading.value = false;
        queryParams.conf = null;
      });
  }
}

function saveAndReloadConfig() {
  loading.value = true;
  if (form.value.commandContent) {
    form.value.commandContent = getCommanContent();
    queryParams.conf = form.value.commandContent;
    saveAndReloadConfigApi(queryParams)
      .then(() => {
        ElMessage.success("加载成功");
      })
      .finally(() => {
        loading.value = false;
        queryParams.conf = null;
      });
  }
}

function reloadConfig() {
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
const {form} = toRefs(codeData);

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
          autocompletion({override: [myCompletions]}),
          // EditorView.updateListener.of((v) => {
          //   console.log(v.state.doc.toString())
          // }),
        ],
        parent: document.getElementById("coder"),
        options: {
          lineNumbers: true,
          line: true,
          //ctrl-space唤起智能提示
          extraKeys: {
            Ctrl: "autocomplete",
          },
          //括号匹配
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
  if (editor) {
    return null;
  }
  let str = "";
  editor.state.doc.children.forEach((el) => {
    str += el.text.join("\n") + "\n";
  });
  return str.slice(0, -1);
}

/** 重置表单  */
function resetForm() {
  deptFormRef.value.resetFields();
  deptFormRef.value.clearValidate();
}

const rules = reactive({
  fileName: [{required: true, message: "文件名", trigger: "blur"}],
  fileNamePath: [{required: true, message: "文件路径", trigger: "blur"}],
});

onMounted(() => {
  loadAgentList();
  updateBreadcrumb();
  handleQuery();
});
</script>
<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true"
               style="display: flex; align-items: center; flex-wrap: wrap">
        <el-form-item label="Agent" prop="agentId">
          <el-select
            v-model="queryParams.agentId"
            placeholder="请选择Agent"
            clearable
            filterable
            style="width: 250px"
            @change="handleQuery"
          >
            <el-option
              v-for="agent in agentList"
              :key="agent.id"
              :label="`${agent.serviceName} - ${agent.hostname || `Agent-${agent.id}`}`"
              :value="agent.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="路径" prop="path">
          <el-input
            v-model="queryParams.path"
            placeholder="请输入路径"
            clearable
            style="width: 250px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item>
          <el-button class="filter-item" type="primary" @click="handleQuery">
            <i-ep-search/>
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <i-ep-refresh/>
            重置
          </el-button>
        </el-form-item>
        <el-form-item style="margin-left: auto">
          <el-button
            v-hasPerm="['sys:dept:add']"
            type="success"
            @click="openDialog()"
          >
            <i-ep-plus/>
            新增
          </el-button>
          <el-button
            v-hasPerm="['sys:dept:delete']"
            type="danger"
            :disabled="ids.length === 0"
            @click="handleDelete()"
          >
            <i-ep-delete/>
            删除
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 面包屑导航 -->
    <el-breadcrumb separator="/" style="margin: 16px 0">
      <el-breadcrumb-item
        v-for="(item, index) in breadcrumbList"
        :key="index"
      >
        <a
          v-if="index < breadcrumbList.length - 1"
          @click.prevent="handleBreadcrumbClick(item.path)"
          style="cursor: pointer; color: #409eff"
        >
          {{ item.name }}
        </a>
        <span v-else style="color: #303133">{{ item.name }}</span>
      </el-breadcrumb-item>
    </el-breadcrumb>

    <el-card>

      <el-table
        v-loading="loading"
        :data="deptList"
        row-key="name"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center"/>
        <el-table-column prop="name" label="文件名称" min-width="200" show-overflow-tooltip>
          <template #default="scope">
            <div style="display: flex; align-items: center; gap: 8px">
              <el-icon v-if="scope.row.type === 'directory'" style="cursor: pointer; color: #409eff" @click="enterDirectory(scope.row.name)">
                <i-ep-folder />
              </el-icon>
              <el-icon v-else style="color: #67c23a">
                <i-ep-document />
              </el-icon>
              <span v-if="scope.row.type === 'directory'" style="cursor: pointer; color: #409eff" @click="enterDirectory(scope.row.name)">
                {{ scope.row.name }}
              </span>
              <span v-else>{{ scope.row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80" align="center"/>
        <el-table-column prop="permissions" label="权限" width="120" align="center"/>
        <el-table-column prop="owner" label="所有者" width="100"/>
        <el-table-column prop="group" label="用户组" width="100"/>
        <el-table-column prop="size" label="大小" width="100" align="center"/>
        <el-table-column prop="modifyTime" label="修改时间" width="180"/>

        <el-table-column label="操作" fixed="right" align="left" width="120">
          <template #default="scope">
            <el-button
              v-if="scope.row.type === 'file'"
              type="primary"
              link
              size="small"
              @click.stop="openDialog(scope.row.name)"
            >
              <i-ep-edit/>
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
      @closed="closeDialog"
    >
      <template #header>
        <div class="dialog-footer">
          <el-button type="primary" @click="checkConfig"> 检验配置</el-button>
          <el-button @click="saveAndReloadConfig">保存并热加载</el-button>
          <el-button @click="reloadConfig"> 载入最新配置</el-button>
        </div>
      </template>
      <div id="coder"></div>
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
        <el-form-item label="文件名称" prop="name">
          <el-input v-model="formData.fileName" placeholder="文件名称"/>
        </el-form-item>

        <el-form-item label="文件路径" prop="name">
          <el-input v-model="formData.fileNamePath" placeholder="文件路径"/>
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
