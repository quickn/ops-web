<template>
  <!--
    告警规则新增/编辑弹窗（共用组件：预警规则页面、任务告警表单共用）
    - ruleId 为空：新增模式（表单重置为默认值）
    - ruleId 非空：编辑模式（加载规则详情）
  -->
  <el-dialog
    v-model="visible"
    :title="title"
    width="820px"
    destroy-on-close
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form
      ref="formRef"
      v-loading="detailLoading"
      :model="formData"
      :rules="rules"
      label-width="110px"
    >
      <el-form-item label="规则名称" prop="ruleName">
        <el-input v-model="formData.ruleName" placeholder="请输入规则名称" />
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="预警通道" prop="alertChannels">
            <el-select
              v-model="channelList"
              multiple
              placeholder="请选择预警通道"
              style="width: 100%"
              @change="handleChannelChange"
            >
              <el-option
                v-for="item in ALERT_CHANNEL_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="预警级别" prop="alertLevel">
            <el-select v-model="formData.alertLevel" placeholder="请选择预警级别" style="width: 100%">
              <el-option
                v-for="item in ALERT_LEVEL_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="报警联系人组" prop="contactGroupId">
        <el-select
          v-model="formData.contactGroupId"
          placeholder="请选择联系人组"
          clearable
          filterable
          style="width: 100%"
          @change="handleContactGroupChange"
        >
          <el-option
            v-for="item in contactGroupList"
            :key="item.id"
            :label="item.groupName"
            :value="item.id!"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="触发类型" prop="triggerType">
        <el-radio-group v-model="formData.triggerType">
          <el-radio
            v-for="item in TRIGGER_TYPE_OPTIONS"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item
        v-if="formData.triggerType === TRIGGER_TYPE_THRESHOLD"
        label="触发阈值"
        prop="conditionThreshold"
      >
        <el-input-number
          v-model="formData.conditionThreshold"
          :min="0"
          :precision="2"
          controls-position="right"
          style="width: 110px"
        />
        <div class="condition-tip">执行结果中的数值超过该阈值时触发预警</div>
      </el-form-item>

      <el-form-item v-else label="触发关键字" prop="conditionKeyword">
        <el-input
          v-model="formData.conditionKeyword"
          placeholder="多个关键字用逗号分隔，结果包含任一关键字即触发"
        />
      </el-form-item>

      <el-divider content-position="left">降噪配置</el-divider>

      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="静默期" prop="silencePeriod">
            <div class="flex items-center gap-1 w-full">
              <el-input-number
                v-model="formData.silencePeriod"
                :min="0"
                :max="1440"
                controls-position="right"
                style="flex: 1"
              />
              <span class="text-sm text-gray-500">分钟</span>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="触发阈值" prop="triggerThreshold">
            <div class="flex items-center gap-1 w-full">
              <el-input-number
                v-model="formData.triggerThreshold"
                :min="1"
                :max="100"
                controls-position="right"
                style="flex: 1"
              />
              <span class="text-sm text-gray-500">次</span>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="聚合窗口" prop="aggregateWindow">
            <div class="flex items-center gap-1 w-full">
              <el-input-number
                v-model="formData.aggregateWindow"
                :min="0"
                :max="1440"
                controls-position="right"
                style="flex: 1"
              />
              <span class="text-sm text-gray-500">分钟</span>
            </div>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="是否启用" prop="isEnabled">
            <el-switch v-model="formData.isEnabled" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="备注" prop="remark">
        <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="备注信息" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确 定</el-button>
        <el-button @click="visible = false">取 消</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { getAlertRuleById, listAllAlertContactGroup, saveAlertRule } from "@/api/ops/alert";
import {
  ALERT_CHANNEL_EMAIL,
  ALERT_CHANNEL_OPTIONS,
  ALERT_LEVEL_OPTIONS,
  AlertContactGroup,
  AlertRule,
  TRIGGER_TYPE_KEYWORD,
  TRIGGER_TYPE_OPTIONS,
  TRIGGER_TYPE_THRESHOLD
} from "@/api/ops/alert/types";

defineOptions({
  name: "AlertRuleEditDialog"
});

const props = defineProps<{
  /** 告警规则ID（为空时为新增模式） */
  ruleId?: number;
}>();

const visible = defineModel<boolean>({ default: false });

const emit = defineEmits<{
  (e: "saved", rule: AlertRule): void;
}>();

const formRef = ref(ElForm);

const detailLoading = ref(false);
const submitLoading = ref(false);

const title = computed(() => (props.ruleId ? "编辑预警规则" : "新增预警规则"));

const contactGroupList = ref<AlertContactGroup[]>([]);

const channelList = ref<string[]>([]);

const formData = reactive<AlertRule>({} as AlertRule);

const rules = reactive({
  ruleName: [{ required: true, message: "请输入规则名称", trigger: "blur" }],
  alertChannels: [{ required: true, message: "请选择预警通道", trigger: "change" }],
  alertLevel: [{ required: true, message: "请选择预警级别", trigger: "change" }],
  contactGroupId: [{ required: true, message: "请选择报警联系人组", trigger: "change" }],
  triggerType: [{ required: true, message: "请选择触发类型", trigger: "change" }],
  conditionKeyword: [
    {
      validator: (_rule: any, value: string, callback: (error?: Error) => void) => {
        if (formData.triggerType === TRIGGER_TYPE_KEYWORD && !value?.trim()) {
          callback(new Error("请输入触发关键字"));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ],
  conditionThreshold: [
    {
      validator: (_rule: any, value: number, callback: (error?: Error) => void) => {
        if (
          formData.triggerType === TRIGGER_TYPE_THRESHOLD &&
          (value === null || value === undefined)
        ) {
          callback(new Error("请输入触发阈值"));
        } else {
          callback();
        }
      },
      trigger: "blur"
    }
  ]
});

/** 解析通道字符串为数组 */
function parseChannels(channels?: string): string[] {
  if (!channels) return [];
  return channels.split(",").map((c) => c.trim()).filter(Boolean);
}

/** 通道多选变更 */
function handleChannelChange(val: string[]) {
  formData.alertChannels = val.join(",");
}

/** 联系人组切换 */
function handleContactGroupChange(val?: number) {
  const group = contactGroupList.value.find((g) => g.id === val);
  formData.contactGroupName = group?.groupName;
}

/** 加载联系人组列表 */
function loadContactGroupList() {
  listAllAlertContactGroup().then(({ data }) => {
    contactGroupList.value = data || [];
  });
}

/** 重置表单为默认值（新增模式） */
function resetForm() {
  Object.keys(formData).forEach((key) => {
    (formData as any)[key] = undefined;
  });
  formData.isEnabled = true;
  formData.alertLevel = 2;
  formData.triggerType = TRIGGER_TYPE_KEYWORD;
  formData.silencePeriod = 5;
  formData.triggerThreshold = 1;
  formData.aggregateWindow = 0;
  formData.alertChannels = ALERT_CHANNEL_EMAIL;
  channelList.value = [ALERT_CHANNEL_EMAIL];
}

/** 加载规则详情（编辑模式） */
function loadRuleDetail() {
  if (!props.ruleId) {
    resetForm();
    return;
  }
  detailLoading.value = true;
  getAlertRuleById(props.ruleId)
    .then(({ data }) => {
      Object.assign(formData, data);
      channelList.value = parseChannels(data.alertChannels);
    })
    .finally(() => (detailLoading.value = false));
}

/** 提交 */
function handleSubmit() {
  formRef.value.validate((valid: boolean) => {
    if (!valid) return;
    submitLoading.value = true;
    saveAlertRule(formData)
      .then(() => {
        ElMessage.success("保存成功");
        visible.value = false;
        emit("saved", { ...formData });
      })
      .finally(() => (submitLoading.value = false));
  });
}

watch(visible, (val) => {
  if (val) {
    loadContactGroupList();
    loadRuleDetail();
  }
});

/** 触发类型切换：清空另一类型的值并清除校验 */
watch(
  () => formData.triggerType,
  (val) => {
    if (val === TRIGGER_TYPE_KEYWORD) {
      formData.conditionThreshold = undefined;
    } else {
      formData.conditionKeyword = undefined;
    }
    formRef.value?.clearValidate(["conditionKeyword", "conditionThreshold"]);
  }
);
</script>

<style scoped>
.condition-tip {
  width: 100%;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}
</style>
