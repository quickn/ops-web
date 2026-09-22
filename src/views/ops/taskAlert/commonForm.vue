<template>
  <!--
    任务告警公共参数表单（仅 el-form-item，需置于父组件 el-form 内使用）
    公共字段：任务名称、任务类型(可选)、cron、启动状态、失败阈值、启用告警、邮件告警、备注
    所属服务选择见 ServiceSelect 组件，由父组件自行放置
  -->
  <div>

    <el-form-item v-if="showTaskType" label="任务类型" prop="taskType">
      <dictionary
        v-model="formData.taskType"
        type-code="taskType"
        placeholder="请选择任务类型"
        @change="handleTaskTypeChange"
      />
    </el-form-item>

    <el-form-item label="任务名称" prop="taskName">
      <el-input v-model="formData.taskName" placeholder="请输入任务名称" />
    </el-form-item>

    <el-form-item label="cron 表达式" prop="cron">
      <el-input v-model="formData.cron" placeholder="例如：0 0 2 * * ?">
        <template #append>
          <el-button @click="showCronHelp = !showCronHelp">Cron说明</el-button>
        </template>
      </el-input>
      <div v-if="showCronHelp" class="cron-help">
        <p>Cron表达式格式：秒 分 时 日 月 周</p>
        <ul>
          <li><code>0 0 2 * * ?</code> 每天凌晨2点执行</li>
          <li><code>0 0/30 * * * ?</code> 每30分钟执行</li>
          <li><code>0 0 9-18 * * ?</code> 每天9点到18点整点执行</li>
        </ul>
      </div>
    </el-form-item>

    <el-form-item label="启动状态" prop="status">
      <el-switch
        v-model="formData.status"
        :active-value="1"
        :inactive-value="0"
        active-text="启动"
        inactive-text="停止"
      />
    </el-form-item>

    <el-form-item label="失败阈值" prop="failThreshold">
      <el-input-number
        v-model="formData.failThreshold"
        :min="1"
        :max="100"
        placeholder="连续失败次数阈值"
      />
    </el-form-item>

    <el-form-item label="启用告警" prop="isEnabled">
      <el-switch
        v-model="formData.isEnabled"
        :active-value="true"
        :inactive-value="false"
      />
    </el-form-item>

    <el-form-item label="邮件告警" prop="isEmail">
      <el-switch
        v-model="formData.isEmail"
        :active-value="true"
        :inactive-value="false"
      />
    </el-form-item>

    <el-form-item label="备注" prop="remark">
      <el-input
        v-model="formData.remark"
        type="text"
        placeholder="请输入备注"
      />
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { TaskAlert } from "@/api/ops/taskAlert/types";

defineOptions({
  name: "TaskAlertCommonForm",
});

defineProps({
  /** 父组件的表单数据对象（reactive，直接双向绑定字段） */
  formData: {
    type: Object as () => TaskAlert,
    required: true,
  },
  /** 是否显示任务类型选择 */
  showTaskType: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits<{
  (e: "taskTypeChange", type?: string | number): void;
}>();

const showCronHelp = ref(false);

/** 任务类型切换 */
function handleTaskTypeChange(type?: string | number) {
  emit("taskTypeChange", type);
}
</script>

<style scoped>
.cron-help {
  width: 100%;
  padding: 12px 16px;
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.8;
  color: #606266;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.cron-help p {
  margin: 0 0 8px;
  font-weight: 500;
}

.cron-help ul {
  padding-left: 20px;
  margin: 0;
}

.cron-help code {
  padding: 2px 6px;
  font-family: monospace;
  background: #e8eaed;
  border-radius: 3px;
}
</style>
