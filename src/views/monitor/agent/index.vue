<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="服务" prop="status">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="全部"
            clearable
            style="width: 100px"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
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

    <el-card shadow="never">
      <el-table
        ref="dataTableRef"
        v-loading="loading"
        :data="dataList"
        highlight-current-row
        border
        @selection-change="handleSelectionChange"
      >
        <!--        <el-table-column type="selection" width="55" align="center" />-->
        <el-table-column label="ID" prop="id" width="90" />
        <el-table-column label="服务名" prop="serviceName" width="90" />
        <el-table-column label="是否为跳板机" prop="isJumpServer" width="80">
          <template #default="scope">
            <el-tag v-if="scope.row.isJumpServer" type="success">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="remoteIp" prop="remoteIp" width="90" />
        <el-table-column label="是否为源服务" prop="isOriginServer" width="80">
          <template #default="scope">
            <el-tag v-if="scope.row.isOriginServer" type="success">是</el-tag>
            <el-tag v-else type="info">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="IP" prop="hostname" width="130" />
        <el-table-column label="是否监控" prop="isMonitor" width="80" />
        <el-table-column label="是否发送邮件" prop="isMail" width="80" />
        <el-table-column label="是否docker监控" prop="isDocker" width="100" />
        <el-table-column label="cpu域值" prop="cpuWarnVal" width="80" />
        <el-table-column label="内存阈值" prop="memWarnVal" width="120" />
        <el-table-column label="磁盘阈值" prop="diskWarnVal" width="100" />
        <el-table-column
          label="docker容器Cpu阈值"
          prop="cpuWarnValDocker"
          width="100"
        />
        <el-table-column label="是否在线" prop="state">
          <template #default="{ row }">
            <el-tag :type="row.online == 1 ? 'success' : 'danger'">{{
              row.online == 1 ? "在线" : "下线"
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="终端版本" prop="clientVersion" width="100" />
        <el-table-column label="更新时间" prop="updateTime" width="160" />
        <el-table-column
          fixed="right"
          label="操作"
          width="190"
          style="padding: 0"
        >
          <template #default="scope">
            <el-button
              v-hasPerm="['sys:dept:edit']"
              type="primary"
              link
              size="small"
              @click.stop="upgradeClient(scope.row.id)"
            >
              <i-ep-edit />
              升级客户端
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="restartAgent(scope.row.id)"
            >
              <i-ep-edit />
              重启
            </el-button>
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
              type="primary"
              size="small"
              link
              @click="deleteById(scope.row.id)"
            >
              <i-ep-delete />
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
        label-width="200px"
      >
        <el-form-item label="服务" prop="status">
          <el-select
            v-model="formData.serviceId"
            placeholder="全部"
            clearable
            style="width: 100px"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="IP" prop="name">
          <el-input v-model="formData.hostname" disabled placeholder="IP" />
        </el-form-item>
        <el-form-item label="是否为跳板机">
          <el-switch
            v-model="formData.isJumpServer"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>
        <el-form-item
          label="remoteIp"
          prop="remoteIp"
          v-if="formData.isJumpServer"
        >
          <el-input v-model="formData.remoteIp" placeholder="remoteIp" />
        </el-form-item>
        <el-form-item label="是否为源服务">
          <el-switch
            v-model="formData.isOriginServer"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>

        <el-form-item label="是否开启监控" prop="isMonitor">
          <el-switch
            v-model="formData.isMonitor"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>

        <el-form-item label="是否发送邮件" prop="name">
          <el-switch
            v-model="formData.isMail"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>

        <el-form-item label="是否开启docker监控" prop="isDocker">
          <el-switch
            v-model="formData.isDocker"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>

        <el-form-item label="是否开启docker统计" prop="isDockerStats">
          <el-switch
            v-model="formData.isDockerStats"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>

        <el-form-item label="cpu预警值" prop="cpuWarnVal">
          <el-input v-model="formData.cpuWarnVal" placeholder="cpu预警值" />
        </el-form-item>

        <el-form-item label="内存预警值" prop="name">
          <el-input v-model="formData.memWarnVal" placeholder="内存预警值" />
        </el-form-item>

        <el-form-item label="磁盘预警值" prop="name">
          <el-input v-model="formData.diskWarnVal" placeholder="磁盘预警值" />
        </el-form-item>

        <el-form-item label="docker容器Cpu阈值" prop="name">
          <el-input
            v-model="formData.cpuWarnValDocker"
            placeholder="docker服务Cpu阈值"
          />
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

<script setup lang="ts">
import {
  addData,
  deleteByIds,
  handleAgent,
  listPage,
} from "@/api/monitor/agent";

import { listAll } from "@/api/monitor/service";
import { ServiceInfo } from "@/api/monitor/service/types";
import { AgentConfig, AgentConfigForm } from "@/api/monitor/agent/types";

const queryFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);

const queryParams = reactive<AgentConfig>({ pageNum: 1, pageSize: 15 });

const dataList = ref<AgentConfig[]>();

const serviceInfoList = ref<ServiceInfo[]>();

const dialogEdit = reactive<DialogOption>({
  visible: false,
});

const formData = reactive<AgentConfigForm>({
  id: null,
  serviceId: null,
  hostname: null,
  isMonitor: false,
  isDockerStats: false,
  isMail: false,
  isDocker: false,
  cpuWarnVal: 0,
  memWarnVal: 0,
  diskWarnVal: 0,
  cpuWarnValDocker: 0,
  isJumpServer: false,
  isOriginServer: false,
  remoteIp: null,
});

/** 查询 */
function handleQuery() {
  loading.value = true;
  listPage(queryParams).then(({ data }) => {
    dataList.value = data.records;
    total.value = data.total;
    loading.value = false;
  });
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
  });
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  handleQuery();
}

/** 行checkbox 选中事件 */
function handleSelectionChange(selection: any) {
  ids.value = selection.map((item: any) => item.id);
}

/** 删除角色 */
function deleteById(id) {
  ElMessageBox.confirm("确定要删除服务?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    deleteByIds(id)
      .then(() => {
        ElMessage.success("删除成功");
        handleQuery();
      })
      .finally(() => (loading.value = false));
  });
}

onMounted(() => {
  handleQuery();
});

function upgradeClient(id) {
  ElMessageBox.confirm("确定要升级客户端?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    handleAgent(id, "upgrade")
      .then(() => {
        ElMessage.success("升级成功");
      })
      .finally(() => (loading.value = false));
  });
}

function restartAgent(id) {
  ElMessageBox.confirm("确定要重启客户端?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    handleAgent(id, "restart")
      .then(() => {
        ElMessage.success("重启成功");
      })
      .finally(() => (loading.value = false));
  });
}

async function openDialog(data?: AgentConfig) {
  if (data) {
    dialogEdit.visible = true;
    dialogEdit.title = "编辑文档";
    const keys = Reflect.ownKeys(formData);
    keys.forEach(function (value) {
      formData[value] = data[value];
    });
  } else {
    if (formData) {
      formData.id = undefined;
    }
    dialogEdit.visible = true;
  }
}

/** 关闭弹窗 */
function closeDialog() {
  dialogEdit.visible = false;
  resetForm();
}

const deptFormRef = ref(ElForm);

function resetForm() {
  deptFormRef.value.resetFields();
  deptFormRef.value.clearValidate();
  formData.id = null;
}

const rules = reactive({
  cpuWarnVal: [
    { required: true, message: "cpu预警值不能为空", trigger: "blur" },
  ],
  memWarnVal: [
    { required: true, message: "内存预警值不能为空", trigger: "blur" },
  ],
  diskWarnVal: [
    { required: true, message: "磁盘预警值不能为空", trigger: "blur" },
  ],
  remoteIp: [
    {
      required: true,
      message: "remoteIp不能为空",
      trigger: "blur",
    },
  ],
});

/** 添加数据  */
async function handleSubmit() {
  deptFormRef.value.validate((valid: any) => {
    if (valid) {
      addData(formData)
        .then(() => {
          ElMessage.success("更新成功");
          closeDialog();
          handleQuery();
        })
        .finally(() => (loading.value = false));
    }
  });
}
</script>
