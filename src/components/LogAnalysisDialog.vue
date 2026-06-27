<script setup lang="ts">
import type { LogAnalysisResponse, LogAnalysisResult, LogCluster, LogCmdForm } from "@/api/monitor/log/types";
import { fileLogAnalysis, fileLogDetail } from "@/api/monitor/log";

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

// 详情对话框
const detailDialogVisible = ref(false);
const detailLoading = ref(false);
const detailContent = ref("");
const searchKeyword = ref("");
const originalTemplate = ref("");
const lineCount = ref(0);

// 时间范围筛选
const timeRange = reactive({
  minTime: "",
  maxTime: ""
});

// 监听对话框打开，自动触发分析
watch(
  () => props.visible,
  (newVal) => {
    if (newVal && props.queryParams) {
      performAnalysis();
    }
  }
);

// 执行带时间范围的日志分析
async function performAnalysisWithTimeRange() {
  if (!props.queryParams) return;

  loading.value = true;
  try {
    const params: LogCmdForm = {
      ...props.queryParams,
      timeout: 120,
      action: "analyze"
    };

    // 添加时间范围参数
    if (timeRange.minTime) {
      params.startTime = timeRange.minTime;
    }
    if (timeRange.maxTime) {
      params.endTime = timeRange.maxTime;
    }

    const { data } = await fileLogAnalysis(params);
    // data 是一个数组，每个元素包含 code, data(string), agentId, msgType
    const responseList: LogAnalysisResponse[] = Array.isArray(data) ? data : [data];

    // 合并所有 code=0 的分析结果
    const mergedResult: LogAnalysisResult = {
      totalLines: 0,
      totalClusters: 0,
      clusters: [],
      minTime: undefined,
      maxTime: undefined
    };

    let clusterIdCounter = 1;

    responseList.forEach((response) => {
      if (response.code === 0) {
        // 解析 data 字段（可能是字符串或对象）
        const parsedData = typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data;
        if (parsedData.totalLines) {
          mergedResult.totalLines += parsedData.totalLines || 0;
          mergedResult.minTime = parsedData.minTime || mergedResult.minTime;
          mergedResult.maxTime = parsedData.maxTime || mergedResult.maxTime;
        }
        if (parsedData && parsedData.clusters) {
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

function handleClose() {
  analysisData.value = null;
  emit("close");
}

async function performAnalysis() {
  if (!props.queryParams) return;

  loading.value = true;
  try {
    props.queryParams.timeout = 120;
    const { data } = await fileLogAnalysis(props.queryParams);
    // data 是一个数组，每个元素包含 code, data(string), agentId, msgType
    const responseList: LogAnalysisResponse[] = Array.isArray(data) ? data : [data];

    // 合并所有 code=0 的分析结果
    const mergedResult: LogAnalysisResult = {
      totalLines: 0,
      totalClusters: 0,
      clusters: [],
      minTime: undefined,
      maxTime: undefined
    };

    let clusterIdCounter = 1;

    responseList.forEach((response) => {
      if (response.code === 0) {
        // 解析 data 字段（可能是字符串或对象）
        const parsedData = typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data;
        if (parsedData.totalLines) {
          mergedResult.totalLines += parsedData.totalLines || 0;
          mergedResult.minTime = parsedData.minTime || mergedResult.minTime;
          mergedResult.maxTime = parsedData.maxTime || mergedResult.maxTime;
        }
        if (parsedData && parsedData.clusters) {
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

// 打开日志详情对话框
function openDetailDialog(template: string) {
  if (!props.queryParams) return;

  // 保存原始模板用于显示
  originalTemplate.value = template;

  // 提取 <*> 中间的内容
  const wildcardPattern = /<\*>/g;
  const matches = template.match(wildcardPattern);
  
  let extractedKeyword = template; // 默认使用原始模板
  
  if (matches && matches.length > 0) {
    // 按 <*> 分割模板
    const parts = template.split('<*>');
    
    if (matches.length === 1) {
      // 只有一个 <*>，保留右边的内容
      // parts[0] 是左边，parts[1] 是右边
      extractedKeyword = parts[1] ? parts[1].trim() : '';
    } else if (matches.length >= 2) {
      // 多个 <*>，只保留中间的内容（去掉最左和最右）
      // parts[0] 是最左边（不要），parts[parts.length-1] 是最右边（不要）
      // 保留 parts[1] 到 parts[parts.length-2]
      const middleParts = parts.slice(1, -1);
      const filteredParts = middleParts
        .map(part => part.trim())
        .filter(part => part.length > 0);
      
      if (filteredParts.length > 0) {
        extractedKeyword = filteredParts.join(' ');
      }
    }
  } else {
    // 如果没有 <*> 标记，尝试提取类路径
    const classPattern = /\]\s+(com\.[a-zA-Z0-9_.]+)\s+/;
    const match = template.match(classPattern);
    
    if (match && match[1]) {
      // 如果提取到类路径，将原始关键字和类路径组合
      const originalKeyword = props.queryParams.keyword || '';
      const classPath = match[1];
      // 组合关键字：原始关键字 + 类路径（用空格分隔）
      extractedKeyword = originalKeyword ? `${originalKeyword} ${classPath}` : classPath;
    }
  }

  // 去除所有 [] 及其中的内容
  extractedKeyword = extractedKeyword.replace(/\[[^\]]*\]/g, '').trim();
  // 清理多余的空格（多个连续空格合并为一个）
  extractedKeyword = extractedKeyword.replace(/\s+/g, ' ').trim();
  
  // 如果有关键字且包含空格，只保留第一个字符串
  if (extractedKeyword && extractedKeyword.includes(' ')) {
    extractedKeyword = extractedKeyword.split(' ')[0];
  }

  searchKeyword.value = extractedKeyword; // 设置提取后的关键字
  detailContent.value = "";
  detailDialogVisible.value = true;
  
  // 如果提取到有效关键字，自动执行查询
  if (extractedKeyword && extractedKeyword.trim().length > 0) {
    // 等待对话框渲染完成后执行查询
    setTimeout(() => {
      executeDetailQuery();
    }, 300);
  } else {
    // 没有提取到内容，提示用户手动输入
    ElMessage.info('未提取到有效关键字，请手动编辑后点击查询');
  }
}

// 执行日志详情查询
async function executeDetailQuery() {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning("请输入搜索关键字");
    return;
  }

  if (!props.queryParams) return;

  detailLoading.value = true;
  detailContent.value = "";
  lineCount.value = 0;

  try {
    const params: LogCmdForm = {
      ...props.queryParams,
      timeout: 120,
      keyword: searchKeyword.value.trim()
    };

    const { data } = await fileLogDetail(params);
    const logData = data.data || "暂无详细日志信息";
    detailContent.value = logData;
    
    // 统计行数
    if (logData && logData !== "暂无详细日志信息") {
      lineCount.value = logData.split('\n').filter(line => line.trim().length > 0).length;
    }
  } catch (error) {
    ElMessage.error("获取日志详情失败");
    console.error("Detail error:", error);
    detailContent.value = "获取日志详情失败";
    lineCount.value = 0;
  } finally {
    detailLoading.value = false;
  }
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
        <el-card class="overview-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>统计概览</span>
              <el-button type="primary" size="small" @click="performAnalysisWithTimeRange">
                <i-ep-search />
                开始分析
              </el-button>
            </div>
          </template>
          <el-form :inline="true" style="margin-bottom: 16px">
            <el-form-item label="最小时间">
              <el-date-picker
                v-model="timeRange.minTime"
                type="datetime"
                placeholder="选择最小时间"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm"
                style="width: 220px"
              />
            </el-form-item>
            <el-form-item label="最大时间">
              <el-date-picker
                v-model="timeRange.maxTime"
                type="datetime"
                placeholder="选择最大时间"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm"
                style="width: 220px"
              />
            </el-form-item>
          </el-form>
          <div class="stat-value">总日志行数: {{ analysisData.totalLines }}  最小时间: {{ analysisData.minTime }} 最大时间: {{ analysisData.maxTime }}</div>
        </el-card>

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
                  <div class="template-content" @click="openDetailDialog(row.template)">
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

  <!-- 日志详情对话框 -->
  <el-dialog
    v-model="detailDialogVisible"
    title="日志详情查询"
    width="80%"
    :close-on-click-modal="false"
  >
    <!-- 原始模板参考区域 -->
    <el-alert
      v-if="originalTemplate"
      title="原始日志模板"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom: 15px"
    >
      <div class="template-reference">
        {{ formatTemplate(originalTemplate) }}
      </div>
    </el-alert>

    <!-- 搜索区域 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true">
        <el-form-item label="搜索关键字" style="width: 100%; margin-bottom: 0">
          <el-input
            v-model="searchKeyword"
            placeholder="请输入搜索关键字"
            clearable
            style="flex: 1"
          >
            <template #append>
              <el-button type="primary" @click="executeDetailQuery" :loading="detailLoading">
                <i-ep-search />
                查询
              </el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
      <!-- 行数统计 -->
      <div v-if="lineCount > 0" class="line-count-info">
        <el-tag type="success" size="small">
          <i-ep-document style="margin-right: 4px" />
          共 {{ lineCount }} 行日志
        </el-tag>
      </div>
    </el-card>

    <!-- 结果展示区域 -->
    <div v-loading="detailLoading" class="log-detail-container">
      <pre v-if="!detailLoading && detailContent" class="log-content">{{ detailContent }}</pre>
      <el-empty v-else-if="!detailLoading" description="请输入关键字并点击查询" />
    </div>

    <template #footer>
      <el-button @click="detailDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.log-analysis-container {
  height: calc(100vh - 200px);
  overflow-y: auto;
  padding: 20px;
}

.overview-card {
  margin-bottom: 20px;
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
  transition: all 0.3s;

  &:hover {
    background-color: #ecf5ff;
    color: #409eff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

.log-detail-container {
  max-height: 60vh;
  overflow-y: auto;
  padding: 10px;
  margin-top: 15px;
}

.search-card {
  margin-bottom: 0;
  border: none;
}

.line-count-info {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}

.template-reference {
  margin-top: 8px;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
  word-break: break-all;
  white-space: pre-wrap;
}

.log-content {
  margin: 0;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #303133;
}
</style>
