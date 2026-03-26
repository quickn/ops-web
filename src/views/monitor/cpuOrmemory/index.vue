<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <!-- <el-form-item label="项目">
          <el-select v-model="queryParams.projectId" placeholder="全部" clearable style="width: 100px">
            <el-option v-for="item in projectList" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item> -->
        <el-form-item label="服务">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="全部"
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
        <el-form-item label="IP">
          <el-input
            v-model="queryParams.hostname"
            placeholder="IP"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>
        <el-form-item label="时间">
          <el-radio-group v-model="timeType" size="default" fill="#409eff">
            <el-radio-button label="1小时" :value="1" />
            <el-radio-button label="3小时" :value="2" />
            <el-radio-button label="6小时" :value="3" />
            <el-radio-button label="12小时" :value="4" />
            <el-radio-button label="1天" :value="5" />
            <el-radio-button label="3天" :value="6" />
            <el-radio-button label="7天" :value="7" />
            <el-radio-button label="14天" :value="8" />
            <el-radio-button label="自定义" :value="9" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="时间范围" v-if="timeType == 9">
          <el-date-picker
            size="default"
            v-model="queryParams.time"
            type="daterange"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery"
            ><i-ep-search />搜索</el-button
          >
          <el-button @click="resetQuery"><i-ep-refresh />重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card shadow="never">
      <div v-if="cpuListLength != 0">
        <div
          style="
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          "
          v-for="(item, index) in cpuListLength"
          :key="index"
        >
          <div
            :id="'cpuCharts' + index"
            style="
              width: 750px;
              height: 420px;
              background: #e5e5e5;
              border-radius: 10px;
            "
          ></div>
          <div
            :id="'memCharts' + index"
            style="
              width: 750px;
              height: 420px;
              background: #e5e5e5;
              border-radius: 10px;
            "
          ></div>
        </div>
      </div>
      <div v-else style="text-align: center">暂无数据</div>
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
        <el-form-item label="IP" prop="name">
          <el-input v-model="formData.hostname" disabled placeholder="IP" />
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

        <el-form-item label="是否开启docker监控" prop="name">
          <el-switch
            v-model="formData.isDocker"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>

        <el-form-item label="cpu预警值" prop="name">
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
  listPage,
  deleteByIds,
  upgradeClientByServiceId,
  addData,
} from "@/api/monitor/agent";

import { cpuList, memList } from "@/api/monitor/cpuOrmemory";
import { listAll } from "@/api/monitor/service";
import { ServiceInfo } from "@/api/monitor/service/types";
import { AgentConfig, AgentConfigForm } from "@/api/monitor/agent/types";
import * as echarts from "echarts";
import { formatDD } from "@/utils/common";
const queryFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);
const queryParams = reactive<AgentConfig>({ pageNum: 1, pageSize: 15 });
const timeType = ref<number>(1);
const cpuListLength = ref<number>(0);
const dataList = ref<AgentConfig[]>();
const serviceInfoList = ref<ServiceInfo[]>();
const projectList = ref<ServiceInfo[]>();
const cpuObjList = ref<ServiceInfo[]>();
const memObjList = ref<ServiceInfo[]>();
const dialogEdit = reactive<DialogOption>({
  visible: false,
});

const formData = reactive<AgentConfigForm>({
  id: null,
  hostname: null,
  isMonitor: false,
  isMail: false,
  isDocker: false,
  cpuWarnVal: 0,
  memWarnVal: 0,
  diskWarnVal: 0,
  cpuWarnValDocker: 0,
});

/** 查询 */
function handleQuery() {
  loading.value = true;
  if (queryParams.time && queryParams.time.length == 2) {
    queryParams.startTime = queryParams.time[0] + " 00:00:00";
    queryParams.endTime = queryParams.time[1] + " 23:59:59";
  } else {
    queryParams.startTime = null;
    queryParams.endTime = null;
  }
  if (timeType.value == 1) {
    queryParams.startTime = formatDD(
      new Date().getTime() - 1 * 60 * 60 * 1000,
      "YYYY-MM-DD HH:mm:ss"
    );
    queryParams.endTime = formatDD(new Date().getTime(), "YYYY-MM-DD HH:mm:ss");
  }
  if (timeType.value == 2) {
    queryParams.startTime = formatDD(
      new Date().getTime() - 3 * 60 * 60 * 1000,
      "YYYY-MM-DD HH:mm:ss"
    );
    queryParams.endTime = formatDD(new Date().getTime(), "YYYY-MM-DD HH:mm:ss");
  }
  if (timeType.value == 3) {
    queryParams.startTime = formatDD(
      new Date().getTime() - 6 * 60 * 60 * 1000,
      "YYYY-MM-DD HH:mm:ss"
    );
    queryParams.endTime = formatDD(new Date().getTime(), "YYYY-MM-DD HH:mm:ss");
  }
  if (timeType.value == 4) {
    queryParams.startTime = formatDD(
      new Date().getTime() - 12 * 60 * 60 * 1000,
      "YYYY-MM-DD HH:mm:ss"
    );
    queryParams.endTime = formatDD(new Date().getTime(), "YYYY-MM-DD HH:mm:ss");
  }
  if (timeType.value == 5) {
    queryParams.startTime = formatDD(
      new Date().getTime() - 1 * 24 * 60 * 60 * 1000,
      "YYYY-MM-DD HH:mm:ss"
    );
    queryParams.endTime = formatDD(new Date().getTime(), "YYYY-MM-DD HH:mm:ss");
  }
  if (timeType.value == 6) {
    queryParams.startTime = formatDD(
      new Date().getTime() - 3 * 24 * 60 * 60 * 1000,
      "YYYY-MM-DD HH:mm:ss"
    );
    queryParams.endTime = formatDD(new Date().getTime(), "YYYY-MM-DD HH:mm:ss");
  }
  if (timeType.value == 7) {
    queryParams.startTime = formatDD(
      new Date().getTime() - 7 * 24 * 60 * 60 * 1000,
      "YYYY-MM-DD HH:mm:ss"
    );
    queryParams.endTime = formatDD(new Date().getTime(), "YYYY-MM-DD HH:mm:ss");
  }
  if (timeType.value == 8) {
    queryParams.startTime = formatDD(
      new Date().getTime() - 14 * 24 * 60 * 60 * 1000,
      "YYYY-MM-DD HH:mm:ss"
    );
    queryParams.endTime = formatDD(new Date().getTime(), "YYYY-MM-DD HH:mm:ss");
  }
  setTimeout(() => {
    let Data1: any = [];
    let Data2: any = [];
    cpuList(queryParams).then(({ data }) => {
      cpuListLength.value = data.length;
      Data1 = data;
      memList(queryParams).then(({ data }) => {
        Data2 = data;
        if (cpuListLength.value != 0) {
          initPowerLineChart(Data1, Data2);
        }
      });
    });
  }, 200);
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

function initPowerLineChart(arr1, arr2) {
  for (let i = 0; i < cpuListLength.value; i++) {
    const cpuChart: any = echarts.init(
      document.getElementById("cpuCharts" + i)!
    );
    const memChart: any = echarts.init(
      document.getElementById("memCharts" + i)!
    );
    let cpuData1: any = [];
    let cpuData2: any = [];
    let memData1: any = [];
    let memData2: any = [];
    arr1[i].list.map((item: any) => {
      cpuData1.push(item.time);
      cpuData2.push(item.value);
    });
    arr2[i].list.map((item: any) => {
      memData1.push(item.time);
      memData2.push(item.value);
    });
    const option1 = {
      backgroundColor: "transparent",
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      legend: {
        show: true,
        right: "auto",
      },
      tooltip: { trigger: "axis" },
      xAxis: {
        data: cpuData1,
      },
      yAxis: [
        {
          type: "value",
          name: "CPU负载(%)",
          splitLine: {
            show: true,
            lineStyle: { type: "dashed", color: "#f5f5f5" },
          },
        },
      ],
      series: [
        {
          name: arr1[i].ip + " 服务CPU负载",
          type: "line",
          data: cpuData2,
          showSymbol: false,
          lineStyle: { color: "#1DC39E" },
          itemStyle: { color: "#1DC39E", borderColor: "#1DC39E" },
        },
      ],
    };
    cpuChart.setOption(option1, true);
    const option2 = {
      backgroundColor: "transparent",
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      legend: {
        show: true,
        right: "auto",
      },
      tooltip: { trigger: "axis" },
      xAxis: {
        data: memData1,
      },
      yAxis: [
        {
          type: "value",
          name: "内存使用率(%)",
          splitLine: {
            show: true,
            lineStyle: { type: "dashed", color: "#f5f5f5" },
          },
        },
      ],
      series: [
        {
          name: arr2[i].ip + " 服务内存使用率",
          type: "line",
          data: memData2,
          showSymbol: false,
          lineStyle: { color: "#1DC39E" },
          itemStyle: { color: "#1DC39E", borderColor: "#1DC39E" },
        },
      ],
    };
    memChart.setOption(option2, true);
  }
}

/** 删除角色 */
function upgradeClient(id) {
  ElMessageBox.confirm("确定要升级客户端?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    upgradeClientByServiceId(id)
      .then(() => {
        ElMessage.success("升级成功");
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
onMounted(() => {
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
    if (serviceInfoList.value.length > 0) {
      queryParams.serviceId = serviceInfoList.value[0].id;
    }
  });
  handleQuery();
});
</script>
