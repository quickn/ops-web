<template>
  <div class="app-container">
    <!-- 搜索区 -->
    <div class="search-container">
      <el-form
        ref="queryFormRef"
        :model="queryParams"
        :inline="true"
        style="display: flex; flex-wrap: wrap; align-items: center"
      >
        <el-form-item prop="ruleName" label="规则名称" style="width: 200px">
          <el-input
            v-model="queryParams.ruleName"
            placeholder="规则名称"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item prop="alertLevel" label="预警级别" style="width: 160px">
          <el-select
            v-model="queryParams.alertLevel"
            placeholder="全部"
            clearable
          >
            <el-option
              v-for="item in ALERT_LEVEL_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="isEnabled" label="状态" style="width: 140px">
          <el-select
            v-model="queryParams.isEnabled"
            placeholder="全部"
            clearable
          >
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetQuery">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>

        <el-form-item style="margin-left: auto">
          <el-button type="success" @click="openDialog()">
            <el-icon><Plus /></el-icon>
            新增
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格区 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="dataList" border highlight-current-row>
        <el-table-column label="ID" prop="id" width="70" align="center" />
        <el-table-column label="规则名称" prop="ruleName" min-width="160" show-overflow-tooltip />
        <el-table-column label="预警通道" width="120" align="center">
          <template #default="scope">
            <template v-for="ch in parseChannels(scope.row.alertChannels)" :key="ch">
              <el-tag
                :type="ch === 'SMS' ? 'warning' : 'info'"
                size="small"
                style="margin: 2px"
              >
                {{ getChannelLabel(ch) }}
              </el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="预警级别" width="90" align="center">
          <template #default="scope">
            <el-tag :type="getLevelTagType(scope.row.alertLevel)" size="small">
              {{ getLevelLabel(scope.row.alertLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="联系人组" prop="contactGroupName" width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="80" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.isEnabled ? 'success' : 'info'" size="small">
              {{ scope.row.isEnabled ? "启用" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="静默期(分)" prop="silencePeriod" width="100" align="center" />
        <el-table-column label="触发阈值" prop="triggerThreshold" width="90" align="center" />
        <el-table-column label="创建人" prop="createByName" width="100" align="center" show-overflow-tooltip />
        <el-table-column label="创建时间" prop="createTime" width="170" align="center" />
        <el-table-column label="操作" fixed="right" align="center" width="260">
          <template #default="scope">
            <el-button type="primary" size="small" link @click="openDialog(scope.row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="warning" size="small" link @click="handleManualTrigger(scope.row)">
              <el-icon><Bell /></el-icon>
              触发
            </el-button>
            <el-button
              type="primary"
              size="small"
              link
              @click="handleToggleEnabled(scope.row)"
            >
              {{ scope.row.isEnabled ? "禁用" : "启用" }}
            </el-button>
            <el-button type="danger" size="small" link @click="handleDelete(scope.row.id)">
              <el-icon><Delete /></el-icon>
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

    <!-- 新增/编辑弹窗（共用组件） -->
    <RuleEditDialog v-model="ruleDialogVisible" :rule-id="editingRuleId" @saved="handleQuery" />

    <!-- 手动触发弹窗 -->
    <el-dialog
      v-model="triggerDialogVisible"
      title="手动触发预警"
      width="500px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="规则">
          <el-input :model-value="triggerRule?.ruleName" disabled />
        </el-form-item>
        <el-form-item label="预警内容">
          <el-input
            v-model="triggerContent"
            type="textarea"
            :rows="3"
            placeholder="请输入预警内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" :loading="triggerLoading" @click="handleTriggerConfirm">确认触发</el-button>
        <el-button @click="triggerDialogVisible = false">取 消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Bell, Delete, Edit, Plus, Refresh, Search } from "@element-plus/icons-vue";
import {
  listAlertRulePage,
  saveAlertRule,
  deleteAlertRule,
  manualTriggerAlert
} from "@/api/ops/alert";
import {
  ALERT_CHANNEL_OPTIONS,
  ALERT_LEVEL_OPTIONS,
  AlertRule,
  AlertRuleQuery
} from "@/api/ops/alert/types";
import RuleEditDialog from "./ruleEditDialog.vue";

defineOptions({ name: "AlertIndex" });

const queryFormRef = ref(ElForm);

const loading = ref(false);
const total = ref(0);

const queryParams = reactive<AlertRuleQuery>({
  pageNum: 1,
  pageSize: 15,
  ruleName: "",
  alertLevel: undefined,
  isEnabled: undefined
});

const dataList = ref<AlertRule[]>([]);

// 新增/编辑弹窗
const ruleDialogVisible = ref(false);
const editingRuleId = ref<number | undefined>(undefined);

// 手动触发
const triggerDialogVisible = ref(false);
const triggerRule = ref<AlertRule | null>(null);
const triggerContent = ref("");
const triggerLoading = ref(false);

/** 解析通道字符串为数组 */
function parseChannels(channels?: string): string[] {
  if (!channels) return [];
  return channels.split(",").map((c) => c.trim()).filter(Boolean);
}

/** 获取通道标签 */
function getChannelLabel(code: string): string {
  const opt = ALERT_CHANNEL_OPTIONS.find((o) => o.value === code);
  return opt?.label || code;
}

/** 获取预警级别标签 */
function getLevelLabel(level?: number): string {
  const opt = ALERT_LEVEL_OPTIONS.find((o) => o.value === level);
  return opt?.label || "-";
}

/** 获取预警级别 tag 类型 */
function getLevelTagType(level?: number): "info" | "warning" | "danger" {
  switch (level) {
    case 1: return "info";
    case 2: return "warning";
    case 3: return "danger";
    default: return "info";
  }
}

/** 查询 */
function handleQuery() {
  loading.value = true;
  listAlertRulePage(queryParams)
    .then(({ data }) => {
      dataList.value = data.records;
      total.value = data.total;
    })
    .finally(() => (loading.value = false));
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  handleQuery();
}

/** 打开新增/编辑弹窗 */
function openDialog(data?: AlertRule) {
  editingRuleId.value = data?.id;
  ruleDialogVisible.value = true;
}

/** 启用/禁用 */
function handleToggleEnabled(row: AlertRule) {
  const target = !row.isEnabled;
  const action = target ? "启用" : "禁用";
  ElMessageBox.confirm(`确认${action}规则【${row.ruleName}】吗？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "info"
  }).then(() => {
    saveAlertRule({ ...row, isEnabled: target }).then(() => {
      ElMessage.success(`${action}成功`);
      handleQuery();
    });
  });
}

/** 手动触发 */
function handleManualTrigger(row: AlertRule) {
  triggerRule.value = row;
  triggerContent.value = "";
  triggerDialogVisible.value = true;
}

/** 确认触发 */
function handleTriggerConfirm() {
  if (!triggerContent.value.trim()) {
    ElMessage.warning("请输入预警内容");
    return;
  }
  triggerLoading.value = true;
  manualTriggerAlert(triggerRule.value!.id!, triggerContent.value)
    .then(() => {
      ElMessage.success("预警已触发");
      triggerDialogVisible.value = false;
    })
    .finally(() => (triggerLoading.value = false));
}

/** 删除 */
function handleDelete(id?: number) {
  if (!id) return;
  ElMessageBox.confirm("确定要删除该预警规则吗？", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning"
  }).then(() => {
    deleteAlertRule(id).then(() => {
      ElMessage.success("删除成功");
      handleQuery();
    });
  });
}

onMounted(() => {
  handleQuery();
});
</script>

<style scoped>
.app-container {
  padding: 20px;
}
.search-container {
  margin-bottom: 20px;
}
</style>
