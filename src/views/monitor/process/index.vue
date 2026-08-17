<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="服务" prop="serviceId">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="选择服务"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="主机IP" prop="hostname">
          <el-input
            v-model="queryParams.hostname"
            placeholder="请输入主机IP"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="进程名" prop="processName">
          <el-input
            v-model="queryParams.processName"
            placeholder="请输入进程名"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="容器名" prop="containerName">
          <el-input
            v-model="queryParams.containerName"
            placeholder="请输入容器名"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="时间范围" prop="timeRange">
          <el-date-picker
            v-model="timeRange"
            type="datetimerange"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            range-separator="至"
            clearable
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm"
            style="width: 360px"
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

    <el-card shadow="never">
      <el-table
        ref="dataTableRef"
        v-loading="loading"
        :data="dataList"
        highlight-current-row
        border
        show-overflow-tooltip
      >
        <el-table-column label="服务名称" prop="serviceName" width="150" />
        <el-table-column label="主机IP" prop="hostname" width="150" />
        <el-table-column label="进程名" prop="processName" width="150" />
        <el-table-column label="PID" prop="pid" width="80">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showPidChart(row)">
              {{ row.pid }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="用户" prop="user" width="100" />
        <el-table-column label="容器名称" prop="containerName" width="160" />
        <el-table-column label="物理内存(KB)" prop="rsz" width="120">
          <template #default="{ row }">
            {{ row.rsz ? row.rsz.toLocaleString() : "-" }}
          </template>
        </el-table-column>
        <el-table-column label="CPU占用(%)" prop="pcpu" width="120">
          <template #default="{ row }">
            <span v-if="row.pcpu != null">{{ row.pcpu }}%</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="默认网卡发送(Mbps)" prop="sentRate" width="100">
          <template #default="{ row }">
            {{ formatTraffic(row.sentRate) }}
          </template>
        </el-table-column>
        <el-table-column label="默认网卡接收(Mbps)" prop="recvRate" width="100">
          <template #default="{ row }">
            {{ formatTraffic(row.recvRate) }}
          </template>
        </el-table-column>
        <el-table-column label="TCP连接总数" prop="connTotal" width="100">
          <template #default="{ row }">
            {{ formatTraffic(row.connTotal) }}
          </template>
        </el-table-column>
        <el-table-column label="ES连接数" prop="connEstablished" width="100">
          <template #default="{ row }">
            {{ formatTraffic(row.connEstablished) }}
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="180" />
      </el-table>

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="handleQuery"
      />
    </el-card>

    <!-- PID 进程指标趋势图弹窗 -->
    <el-dialog
      v-model="chartDialog.visible"
      width="1500px"
      top="5vh"
      @opened="initCharts"
      @closed="destroyCharts"
    >
      <template #header>
        <div style="display: flex; align-items: center; gap: 12px">
          <span>PID: {{ chartDialog.pid }} 最近指标趋势</span>
          <el-date-picker
            v-model="chartTimeRange"
            type="datetimerange"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            range-separator="至"
            clearable
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm"
            style="width: 360px"
            @change="onChartDateChange"
          />
          <el-select
            v-model="chartLimit"
            placeholder="条数"
            style="width: 100px"
            @change="onChartLimitChange"
          >
            <el-option
              v-for="item in limitOptions"
              :key="item"
              :label="item + '条'"
              :value="item"
            />
          </el-select>
        </div>
      </template>
      <div v-loading="chartLoading" style="min-height: 400px">
        <div v-if="!chartLoading && pidDataList.length > 0">
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px">
            <div
              v-for="(item, index) in chartIds"
              :key="index"
              :id="item"
              style="width: 48%; height: 320px; background: #fafafa; border-radius: 8px"
            />
          </div>
        </div>
        <div v-if="!chartLoading && pidDataList.length === 0" style="text-align: center; padding: 60px 0; color: #999">
          暂无数据
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "ProcessNetStat" });

import { listPage, listByPid } from "@/api/monitor/processStat";
import { listAll } from "@/api/monitor/service";
import { ProcessStat } from "@/api/monitor/processStat/types";
import { ServiceInfo } from "@/api/monitor/service/types";
import * as echarts from "echarts";

const loading = ref(false);
const total = ref(0);
const queryParams = reactive<ProcessStat>({ pageSize: 15, pageNum: 1 });
const dataList = ref<ProcessStat[]>();
const serviceInfoList = ref<ServiceInfo[]>();

// 查询时间范围 [startTime, endTime]
const timeRange = ref<string[]>([]);

// PID 图表弹窗
const chartLoading = ref(false);
const chartLimit = ref(20);
const chartTimeRange = ref<string[]>([]);
const limitOptions = [20, 30, 40, 50, 60, 70, 80, 90, 100];
const chartDialog = reactive({
  visible: false,
  pid: null as number | null,
});
const pidDataList = ref<ProcessStat[]>([]);

// 6 个图表的容器 id
const chartIds = [
  "chartRsz",
  "chartPcpu",
  "chartSentRate",
  "chartRecvRate",
  "chartConnTotal",
  "chartConnEstablished",
];
const chartInstances = ref<any[]>([]);

/** 查询 */
function handleQuery() {
  loading.value = true;
  queryParams.startTime = timeRange.value?.[0] || undefined;
  queryParams.endTime = timeRange.value?.[1] || undefined;
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
  queryParams.serviceId = undefined;
  queryParams.hostname = "";
  queryParams.processName = "";
  queryParams.containerName = "";
  queryParams.startTime = undefined;
  queryParams.endTime = undefined;
  timeRange.value = [];
  queryParams.pageNum = 1;
  handleQuery();
}

/** 格式化流量数据 */
function formatTraffic(value: number | undefined | null): string {
  if (value == null) return "-";
  return value.toFixed(2);
}

/** 点击PID，打开图表弹窗 */
async function showPidChart(row: ProcessStat) {
  chartDialog.pid = row.pid!;
  chartLimit.value = 20; // 默认20条
  chartTimeRange.value = timeRange.value?.length === 2 ? [...timeRange.value] : [];
  chartDialog.visible = true;
  await fetchPidData(row.pid!, chartLimit.value);
}

/** 切换条数 */
async function onChartLimitChange(limit: number) {
  await fetchPidData(chartDialog.pid!, limit);
  destroyCharts();
  setTimeout(() => initCharts(), 100);
}

/** 切换日期时间范围 */
async function onChartDateChange() {
  await fetchPidData(chartDialog.pid!, chartLimit.value);
  destroyCharts();
  setTimeout(() => initCharts(), 100);
}

/** 请求PID数据 */
async function fetchPidData(pid: number, limit: number) {
  chartLoading.value = true;
  pidDataList.value = [];
  try {
    const { data } = await listByPid(
      pid,
      limit,
      undefined,
      chartTimeRange.value?.[0] || undefined,
      chartTimeRange.value?.[1] || undefined
    );
    pidDataList.value = (data as unknown as ProcessStat[]).reverse();
  } finally {
    chartLoading.value = false;
  }
}

/** 初始化6个图表 */
function initCharts() {
  // 等DOM渲染完成后初始化
  setTimeout(() => {
    destroyCharts();
    const list = pidDataList.value;
    if (list.length === 0) return;

    const timeData = list.map((item) => item.createTime || "");

    // 6 个指标的配置
    const chartConfigs = [
      { id: "chartRsz", name: "物理内存(KB)", dataKey: "rsz" as const, color: "#5470C6" },
      { id: "chartPcpu", name: "CPU占用(%)", dataKey: "pcpu" as const, color: "#91CC75" },
      { id: "chartConnTotal", name: "TCP连接总数", dataKey: "connTotal" as const, color: "#73C0DE" },
      { id: "chartConnEstablished", name: "ES连接数", dataKey: "connEstablished" as const, color: "#FC8452" },
      { id: "chartSentRate", name: "默认网卡发送(Mbps)", dataKey: "sentRate" as const, color: "#EE6666" },
      { id: "chartRecvRate", name: "默认网卡接收(Mbps)", dataKey: "recvRate" as const, color: "#FAC858" },
    ];

    chartConfigs.forEach((cfg) => {
      const dom = document.getElementById(cfg.id);
      if (!dom) return;
      const chart = echarts.init(dom);
      chartInstances.value.push(chart);

      const seriesData = list.map((item) => item[cfg.dataKey] ?? 0);

      chart.setOption({
        tooltip: { trigger: "axis" },
        grid: { left: "8%", right: "4%", bottom: "3%", top: "40px", containLabel: true },
        title: {
          text: cfg.name,
          left: "center",
          top: 8,
          textStyle: { fontSize: 13, fontWeight: "normal" },
        },
        xAxis: {
          type: "category",
          data: timeData,
          axisLabel: { rotate: 30, fontSize: 10 },
        },
        yAxis: {
          type: "value",
          name: cfg.name,
          splitLine: { lineStyle: { type: "dashed", color: "#eee" } },
        },
        series: [
          {
            name: cfg.name,
            type: "line",
            data: seriesData,
            smooth: true,
            showSymbol: false,
            lineStyle: { color: cfg.color, width: 2 },
            itemStyle: { color: cfg.color },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: cfg.color.replace(")", ", 0.3)").replace("rgb", "rgba") },
                { offset: 1, color: cfg.color.replace(")", ", 0.05)").replace("rgb", "rgba") },
              ]),
            },
          },
        ],
      });
    });

    // 窗口大小变化时自适应
    window.addEventListener("resize", handleResize);
  }, 100);
}

/** 窗口resize处理 */
function handleResize() {
  chartInstances.value.forEach((chart) => {
    chart?.resize();
  });
}

/** 销毁图表实例 */
function destroyCharts() {
  window.removeEventListener("resize", handleResize);
  chartInstances.value.forEach((chart) => {
    chart?.dispose();
  });
  chartInstances.value = [];
}

onMounted(() => {
  handleQuery();
});
</script>
