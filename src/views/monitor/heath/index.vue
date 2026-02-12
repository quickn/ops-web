<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="接口名" prop="keywords">
          <el-input
            v-model="queryParams.apiName"
            placeholder="接口名称"
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="环境ID" prop="keywords">
          <el-input
            v-model="queryParams.serviceId"
            placeholder="环境ID"
            @keyup.enter="handleQuery"
          />
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
      </el-form>
    </div>

    <el-card>
      <template #header>
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
      </template>

      <el-table
        v-loading="loading"
        :data="deptList"
        row-key="id"
        default-expand-all
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="apiName" label="接口名" min-width="200" />
        <el-table-column prop="apiUrl" label="接口地址" width="300" />
        <el-table-column prop="requestMethod" label="请求方式" width="100" />
        <el-table-column prop="contentType" label="内容类型 " width="300" />
        <el-table-column prop="param" label="参数 " width="300" />
        <el-table-column prop="isMonitor" label="是否开启监控 " width="120" />
        <el-table-column
          prop="timeoutWarnTime"
          label="超时预警时间(秒) "
          width="150"
        />
        <el-table-column prop="body" label="接口返回结果" width="300" />
        <el-table-column prop="heathStatus" label="健康状态" width="100" />
        <el-table-column prop="responseTime" label="最新响应时间" width="120" />
        <el-table-column label="操作" fixed="right" align="left" width="200">
          <template #default="scope">
            <el-button
              v-hasPerm="['sys:dept:edit']"
              type="primary"
              link
              size="small"
              @click.stop="openDialog(scope.row)"
            >
              <i-ep-edit />
              编辑
            </el-button>
            <el-button
              v-hasPerm="['sys:dept:delete']"
              type="primary"
              link
              size="small"
              @click.stop="handleDelete(scope.row.id)"
            >
              <i-ep-delete />
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogEdit.visible"
      :title="dialogEdit.title"
      width="900px"
      @closed="closeDialog"
    >
      <el-form
        ref="deptFormRef"
        :model="formData"
        :rules="rules"
        label-width="150px"
      >
        <el-form-item label="服务" prop="serviceId">
          <el-select v-model="formData.serviceId" filterable size="default">
            <el-option
              v-for="(item, index) in serviceInfoList"
              :value="item.id"
              :label="item.name"
              :key="index"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="接口名称" prop="apiName">
          <el-input v-model="formData.apiName" placeholder="接口名称" />
        </el-form-item>
        <el-form-item label="接口地址" prop="apiUrl">
          <el-input v-model="formData.apiUrl" placeholder="接口地址" />
        </el-form-item>
        <el-form-item label="请求方式" prop="requestMethod">
          <el-select v-model="formData.requestMethod" filterable size="default">
            <el-option value="get" label="get" />
            <el-option value="post" label="post" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容类型" prop="contentType">
          <el-select v-model="formData.contentType" filterable size="default">
            <el-option value="application/json" label="application/json" />
            <el-option
              value="x-www-form-urlencoded"
              label="x-www-form-urlencoded"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="参数" prop="param">
          <el-input v-model="formData.param" placeholder="参数" />
        </el-form-item>
        <el-form-item label="是否开启监控" prop="isMonitor">
          <el-select v-model="formData.isMonitor" filterable size="default">
            <el-option :value="true" label="是" />
            <el-option :value="false" label="否" />
          </el-select>
        </el-form-item>
        <el-form-item label="超时预警时间(秒)" prop="timeoutWarnTime">
          <el-input
            v-model="formData.timeoutWarnTime"
            placeholder="超时预警时间"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button type="warning" @click="handleTestApi"> 测试</el-button>
          <el-button type="primary" @click="handleSubmit"> 确 定</el-button>
          <el-button @click="closeDialog"> 取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { addData, deleteData, listData, testApi } from "@/api/heath";
import { listAll } from "@/api/monitor/service";
import { HeathMonitor } from "@/api/heath/types";

defineOptions({
  name: "HeathMonitor",
  inheritAttrs: false,
});

const queryFormRef = ref(ElForm);
const deptFormRef = ref(ElForm);
const serviceInfoList = ref<ServiceInfo[]>([]);
const loading = ref(false);
const addStatus = ref(true);
const ids = ref<number[]>([]);
const rules = reactive({
  serviceId: [{ required: true, message: "接口名", trigger: "blur" }],
  apiName: [{ required: true, message: "链接", trigger: "blur" }],
  apiUrl: [{ required: true, message: "链接", trigger: "blur" }],
  requestMethod: [{ required: true, message: "链接", trigger: "blur" }],
  contentType: [{ required: true, message: "链接", trigger: "blur" }],
  param: [{ required: true, message: "链接", trigger: "blur" }],
  isMonitor: [{ required: true, message: "链接", trigger: "blur" }],
  timeoutWarnTime: [{ required: true, message: "链接", trigger: "blur" }],
});
const dialogEdit = reactive<DialogOption>({
  visible: false,
});

const queryParams = reactive<HeathMonitor>({ id: null });
const deptList = ref<HeathMonitor[]>();

const formData = reactive<HeathMonitor>({
  serviceId: null,
  apiName: null,
  apiUrl: null,
  requestMethod: null,
  contentType: null,
  param: null,
  isMonitor: null,
  timeoutWarnTime: null,
});

/** 查询 */
function handleQuery() {
  loading.value = true;
  listData(queryParams).then(({ data }) => {
    deptList.value = data.records;
    loading.value = false;
  });
}

/** 删除部门 */
function handleDelete(ids?: number) {
  ElMessageBox.confirm(`确认删除已选中的数据项?`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    deleteData(ids).then(() => {
      ElMessage.success("删除成功");
      resetQuery();
    });
  });
}

/**重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  handleQuery();
}

/** 行复选框选中记录选中ID集合 */
function handleSelectionChange(selection: any) {
  ids.value = selection.map((item: any) => item.id);
}

/** 添加数据  */
async function handleTestApi() {
  deptFormRef.value.validate((valid: any) => {
    if (valid) {
      testApi(formData)
        .then((res) => {
          let data = res.data;
          if (data.heathStatus == 200) {
            ElMessage.success("测试成功 结果：" + data.body);
          } else {
            ElMessage.error("测试失败 状态:" + data.heathStatus);
          }
        })
        .finally(() => (loading.value = false));
    }
  });
}

async function handleSubmit() {
  deptFormRef.value.validate((valid: any) => {
    if (valid) {
      addData(formData)
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
 * @param parentId 父部门ID
 * @param deptId 部门ID
 */
async function openDialog(data?: HeathMonitor) {
  if (data) {
    addStatus.value = false;
    dialogEdit.visible = true;
    dialogEdit.title = "编辑";
    Object.assign(formData, data);
  } else {
    if (formData) {
      dialogEdit.title = "新增";
      addStatus.value = true;
      formData.serviceId = null;
      formData.apiName = "";
      formData.apiUrl = "";
      formData.requestMethod = "";
      formData.contentType = "";
      formData.param = "";
      formData.isMonitor = true;
      formData.timeoutWarnTime = "";
    }
    dialogEdit.visible = true;
  }
}

/** 关闭弹窗 */
function closeDialog() {
  dialogEdit.visible = false;
  resetForm();
}

/** 重置表单  */
function resetForm() {
  deptFormRef.value.resetFields();
  deptFormRef.value.clearValidate();
  formData.id = null;
  formData.sort = 1;
}

function fetchServiceList() {
  // 假设有一个API可以获取主机列表
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
  });
}

onMounted(() => {
  handleQuery();
  fetchServiceList();
});
</script>
