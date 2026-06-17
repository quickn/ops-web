<script setup lang="ts">
import type { LogAnalysisResponse, LogAnalysisResult, LogCluster, LogCmdForm } from "@/api/monitor/log/types";
import { fileLogAnalysis } from "@/api/monitor/log";

interface Props {
  visible: boolean;
  queryParams?: LogCmdForm | null;
}

interface Emits {
  (e: "update:visible", value: boolean): void;

  (e: "close"): void;
}

const props = withDefaults(defineProps<Props>(), {
  queryParams: null
});

const emit = defineEmits<Emits>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value)
});

const loading = ref(false);
const analysisData = ref<LogAnalysisResult | null>(null);

// 监听对话框打开，自动触发分析
watch(
  () => props.visible,
  (newVal) => {
    if (newVal && props.queryParams) {
      performAnalysis();
    }
  }
);

function handleClose() {
  analysisData.value = null;
  emit("close");
}

async function performAnalysis() {
  if (!props.queryParams) return;

  loading.value = true;
  try {
    const { data } = await fileLogAnalysis(props.queryParams);
    // data 是一个数组，每个元素包含 code, data(string), agentId, msgType
    const responseList: LogAnalysisResponse[] = Array.isArray(data) ? data : [data];

    // 合并所有 code=0 的分析结果
    const mergedResult: LogAnalysisResult = {
      totalLines: 0,
      totalClusters: 0,
      clusters: []
    };

    let clusterIdCounter = 1;

    responseList.forEach((response) => {
      if (response.code === 0) {
        // 解析 data 字段（可能是字符串或对象）
        const parsedData = typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data;

        if (parsedData && parsedData.clusters) {
          mergedResult.totalLines += parsedData.totalLines || 0;

          // 重新分配 clusterId 并合并 clusters
          parsedData.clusters.forEach((cluster: LogCluster) => {
            mergedResult.clusters.push({
              ...cluster,
              clusterId: clusterIdCounter++
            });
          });
        }
      }
    });

    mergedResult.totalClusters = mergedResult.clusters.length;

    // 按 count 降序排序
    mergedResult.clusters.sort((a, b) => b.count - a.count);

    analysisData.value = mergedResult;
  } catch (error) {
    ElMessage.error("日志分析失败");
    console.error("Analysis error:", error);
  } finally {
    loading.value = false;
  }
}

function formatTemplate(template: string): string {
  if (!template) return "";
  return template.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function getPercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Number(((count / total) * 100).toFixed(2));
}

function getProgressColor(percentage: number): string {
  if (percentage >= 50) return "#f56c6c";
  if (percentage >= 30) return "#e6a23c";
  if (percentage >= 10) return "#409eff";
  return "#67c23a";
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="日志分析报告"
    fullscreen
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="log-analysis-container">
      <template v-if="analysisData">
        <!-- 统计概览 -->
        <div class="stat-value">总日志行数: {{ analysisData.totalLines }}</div>

        <!-- 聚类详情 -->
        <el-card class="clusters-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>聚类详情</span>
              <el-tag type="info" size="small">
                共 {{ analysisData.clusters.length }} 个聚类
              </el-tag>
            </div>
          </template>

          <el-table
            :data="analysisData.clusters"
            stripe
            style="width: 100%"
            :default-sort="{ prop: 'count', order: 'descending' }"
          >
            <el-table-column
              label="排名"
              type="index"
              width="60"
              align="center"
            />

            <el-table-column
              prop="clusterId"
              label="聚类ID"
              width="100"
              align="center"
              sortable
            />

            <el-table-column
              prop="count"
              label="出现次数"
              width="120"
              align="center"
              sortable
            >
              <template #default="{ row }">
                <el-tag type="primary" effect="plain">
                  {{ row.count }} 次
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column
              label="占比"
              width="180"
              align="center"
            >
              <template #default="{ row }">
                <div class="progress-container">
                  <el-progress
                    :percentage="getPercentage(row.count, analysisData.totalLines)"
                    :color="getProgressColor(getPercentage(row.count, analysisData.totalLines))"
                    :stroke-width="12"
                    :text-inside="true"
                  />
                </div>
              </template>
            </el-table-column>

            <el-table-column
              label="日志模板"
              min-width="300"
            >
              <template #default="{ row }">
                <el-tooltip
                  :content="formatTemplate(row.template)"
                  placement="top"
                  :show-after="500"
                >
                  <div class="template-content">
                    {{ formatTemplate(row.template) }}
                  </div>
                </el-tooltip>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 可视化图表 -->
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>分布可视化</span>
            </div>
          </template>
          <div class="chart-container">
            <div
              v-for="item in analysisData.clusters"
              :key="item.clusterId"
              class="chart-bar-item"
            >
              <div class="bar-label">
                <el-tag size="small" type="info">
                  Cluster {{ item.clusterId }}
                </el-tag>
              </div>
              <div class="bar-wrapper">
                <div
                  class="bar-fill"
                  :style="{
                    width: getPercentage(item.count, analysisData.totalLines) + '%',
                    backgroundColor: getProgressColor(
                      getPercentage(item.count, analysisData.totalLines)
                    ),
                  }"
                >
                  <span class="bar-text">{{ item.count }} ({{
                      getPercentage(item.count, analysisData.totalLines)
                    }}%)</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </template>

      <el-empty
        v-else
        description="暂无分析数据"
        :image-size="200"
      />
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.log-analysis-container {
  height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 20px;
}

.overview-card,
.clusters-card,
.chart-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.stat-value {
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 10px;
}

.progress-container {
  padding: 0 10px;
}

.template-content {
  max-height: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  font-family: "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
  cursor: pointer;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;

  &:hover {
    background-color: #ecf5ff;
  }
}

.chart-container {
  padding: 20px 0;
}

.chart-bar-item {
  margin-bottom: 15px;

  .bar-label {
    margin-bottom: 8px;
  }

  .bar-wrapper {
    background-color: #f5f7fa;
    border-radius: 4px;
    overflow: hidden;
    height: 32px;

    .bar-fill {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 10px;
      transition: width 0.6s ease;
      border-radius: 4px;
      min-width: 80px;

      .bar-text {
        color: white;
        font-size: 12px;
        font-weight: 600;
      }
    }
  }
}

:deep(.el-table) {
  font-size: 13px;
}

:deep(.el-progress__text) {
  font-size: 12px !important;
}
</style>
