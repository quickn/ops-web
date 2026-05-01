<template>
  <div :class="{ 'app-container': !isDialog }">
    <!-- 返回按钮 -->
    <div v-if="!isDialog" class="header-bar">
      <el-button @click="handleBack">
        <el-icon>
          <ArrowLeft/>
        </el-icon>
        返回
      </el-button>
      <span class="page-title">{{ isEdit ? '编辑任务' : '新增任务' }}</span>
    </div>

    <el-card shadow="never" v-loading="pageLoading">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
        style="max-width: 900px"
      >
        <!-- 基本信息 -->
        <el-divider content-position="left">
          <el-icon>
            <InfoFilled/>
          </el-icon>
          基本信息
        </el-divider>

        <el-form-item label="所属服务" prop="serviceId">
          <el-select
            v-model="formData.serviceId"
            placeholder="请选择所属服务"
            style="width: 100%"
          >
            <el-option
              v-for="item in serviceList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="任务描述" prop="jobDesc">
          <el-input
            v-model="formData.jobDesc"
            type="textarea"
            :rows="3"
            placeholder="请输入任务描述"
          />
        </el-form-item>

        <el-form-item label="负责人" prop="author">
          <el-input
            v-model="formData.author"
            placeholder="请输入负责人"
            clearable
          />
        </el-form-item>

        <el-form-item label="报警邮件" prop="alarmEmail">
          <el-input
            v-model="formData.alarmEmail"
            placeholder="请输入报警邮件，多个用逗号分隔"
            clearable
          />
        </el-form-item>

        <!-- 调度配置 -->
        <el-divider content-position="left">
          <el-icon>
            <Timer/>
          </el-icon>
          调度配置
        </el-divider>

        <el-form-item label="调度类型" prop="scheduleType">
          <el-radio-group v-model="formData.scheduleType">
            <el-radio label="NONE">无调度</el-radio>
            <el-radio label="CRON">Cron表达式</el-radio>
            <el-radio label="FIX_RATE">固定间隔</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          v-if="formData.scheduleType !== 'NONE'"
          label="调度配置"
          prop="scheduleConf"
        >
          <el-input
            v-model="formData.scheduleConf"
            :placeholder="
              formData.scheduleType === 'CRON'
                ? '请输入Cron表达式，如 0/30 * * * * ?'
                : '请输入间隔秒数，如 60'
            "
            clearable
          >
            <template v-if="formData.scheduleType === 'CRON'" #append>
              <el-button @click="showCronHelp = !showCronHelp">
                Cron说明
              </el-button>
            </template>
          </el-input>
          <div
            v-if="showCronHelp && formData.scheduleType === 'CRON'"
            class="cron-help"
          >
            <p>Cron表达式格式：秒 分 时 日 月 周</p>
            <ul>
              <li><code>0/30 * * * * ?</code> 每30秒执行一次</li>
              <li><code>0 0/5 * * * ?</code> 每5分钟执行一次</li>
              <li><code>0 0 2 * * ?</code> 每天凌晨2点执行</li>
              <li><code>0 0 9-18 * * ?</code> 每天9点到18点整点执行</li>
            </ul>
          </div>
        </el-form-item>

        <el-form-item label="调度过期策略" prop="misfirePolicy">
          <el-radio-group v-model="formData.misfirePolicy">
            <el-radio label="DO_NOTHING">忽略</el-radio>
            <el-radio label="FIRE_ONCE_NOW">立即执行一次</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 执行配置 -->
        <el-divider content-position="left">
          <el-icon>
            <Operation/>
          </el-icon>
          执行配置
        </el-divider>

        <el-form-item label="运行模式" prop="glueType">
          <el-radio-group v-model="formData.glueType">
            <el-radio label="BEAN">BEAN模式</el-radio>
            <el-radio label="GLUE_SHELL">Shell脚本</el-radio>
            <el-radio label="GLUE_PYTHON">Python脚本</el-radio>
            <el-radio label="GLUE_POWERSHELL">PowerShell脚本</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          v-if="formData.glueType === 'BEAN'"
          label="执行器Handler"
          prop="executorHandler"
        >
          <el-input
            v-model="formData.executorHandler"
            placeholder="请输入执行器Handler名称"
            clearable
          />
        </el-form-item>

        <el-form-item
          v-else
          label="GLUE源代码"
          prop="glueSource"
        >
          <el-input
            v-model="formData.glueSource"
            type="textarea"
            :rows="12"
            :placeholder="getGlueSourcePlaceholder()"
          />
        </el-form-item>

        <el-form-item label="执行参数" prop="executorParam">
          <el-input
            v-model="formData.executorParam"
            placeholder="请输入执行参数，JSON格式"
            clearable
          />
        </el-form-item>

        <el-form-item label="路由策略" prop="executorRouteStrategy">
          <el-select
            v-model="formData.executorRouteStrategy"
            placeholder="请选择路由策略"
            style="width: 100%"
          >
            <el-option label="第一个" value="FIRST"/>
            <el-option label="最后一个" value="LAST"/>
            <el-option label="轮询" value="ROUND"/>
            <el-option label="随机" value="RANDOM"/>
            <el-option label="一致性Hash" value="CONSISTENT_HASH"/>
            <el-option label="最不经常使用" value="LEAST_FREQUENTLY_USED"/>
            <el-option label="最近最久未使用" value="LEAST_RECENTLY_USED"/>
            <el-option label="故障转移" value="FAILOVER"/>
            <el-option label="忙碌转移" value="BUSYOVER"/>
            <el-option label="分片广播" value="SHARDING_BROADCAST"/>
          </el-select>
        </el-form-item>

        <el-form-item label="阻塞处理策略" prop="executorBlockStrategy">
          <el-select
            v-model="formData.executorBlockStrategy"
            placeholder="请选择阻塞处理策略"
            style="width: 100%"
          >
            <el-option label="单机串行" value="SERIAL_EXECUTION"/>
            <el-option label="丢弃后续调度" value="DISCARD_LATER"/>
            <el-option label="覆盖之前调度" value="COVER_EARLY"/>
          </el-select>
        </el-form-item>

        <!-- 高级配置 -->
        <el-divider content-position="left">
          <el-icon>
            <Setting/>
          </el-icon>
          高级配置
        </el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="重试次数" prop="retryCount">
              <el-input-number
                v-model="formData.retryCount"
                :min="0"
                :max="10"
                placeholder="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="超时时间(秒)" prop="timeout">
              <el-input-number
                v-model="formData.timeout"
                :min="0"
                :max="86400"
                placeholder="0表示不限制"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            保存
          </el-button>
          <el-button @click="handleBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import {ArrowLeft, InfoFilled, Operation, Setting, Timer,} from "@element-plus/icons-vue";
import {addJob, getJobById, updateJob} from "@/api/monitor/jobinfo";
import {JobInfo} from "@/api/monitor/jobinfo/types";
import {listAll} from "@/api/monitor/service";
import {ServiceInfo} from "@/api/monitor/service/types";
import {useRoute, useRouter} from "vue-router";

defineOptions({
  name: "JobInfoEdit",
  inheritAttrs: false,
});

const props = defineProps({
  editId: {type: Number, default: undefined},
  isDialog: {type: Boolean, default: false},
  editData: {type: Object, default: undefined},
});

const emit = defineEmits<{
  (e: "success"): void;
  (e: "cancel"): void;
}>();

const router = useRouter();
const route = useRoute();

const formRef = ref(ElForm);
const pageLoading = ref(false);
const submitLoading = ref(false);
const isEdit = ref(false);
const showCronHelp = ref(false);
const serviceList = ref<ServiceInfo[]>([]);

const formData = reactive<JobInfo>({
  serviceId: undefined,
  jobDesc: "",
  author: "",
  alarmEmail: "",
  scheduleType: "NONE",
  scheduleConf: "",
  misfirePolicy: "DO_NOTHING",
  glueType: "BEAN",
  executorHandler: "",
  glueSource: "",
  executorParam: "",
  routeStrategy: "ROUND",
  retryCount: 0,
  timeout: 0,
});

const rules = reactive({
  serviceId: [{required: true, message: "请选择所属服务", trigger: "change"}],
  scheduleType: [{required: true, message: "请选择调度类型", trigger: "change"}],
  glueType: [{required: true, message: "请选择运行模式", trigger: "change"}],
  routeStrategy: [{required: true, message: "请选择路由策略", trigger: "change"}],
});

/** 获取GLUE源代码占位符 */
function getGlueSourcePlaceholder(): string {
  const placeholders: Record<string, string> = {
    GLUE_SHELL: "#!/bin/bash\necho 'Hello World'",
    GLUE_PYTHON: "#!/usr/bin/env python\nprint('Hello World')",
    GLUE_POWERSHELL: "Write-Host 'Hello World'",
  };
  return placeholders[formData.glueType || ""] || "请输入脚本代码";
}

/** 获取服务列表 */
function loadServiceList() {
  listAll().then(({data}) => {
    serviceList.value = data;
  });
}

/** 加载任务详情（编辑模式） */
function loadJobDetail(id: number) {
  pageLoading.value = true;
  getJobById(id)
    .then(({data}) => {
      Object.assign(formData, data);
      isEdit.value = true;
    })
    .catch(() => {
      ElMessage.error("加载任务详情失败");
      router.back();
    })
    .finally(() => {
      pageLoading.value = false;
    });
}

/** 提交表单 */
function handleSubmit() {
  formRef.value.validate((valid: boolean) => {
    if (!valid) return;

    submitLoading.value = true;

    const apiCall = isEdit.value
      ? updateJob(formData)
      : addJob(formData);

    apiCall
      .then(() => {
        ElMessage.success(isEdit.value ? "更新成功" : "新增成功");
        if (props.isDialog) {
          emit("success");
        } else {
          router.push({name: "JobInfoIndex"});
        }
      })
      .finally(() => {
        submitLoading.value = false;
      });
  });
}

/** 返回列表 */
function handleBack() {
  if (props.isDialog) {
    emit("cancel");
  } else {
    router.push({name: "JobInfoIndex"});
  }
}

onMounted(() => {
  loadServiceList();
  // 优先级: editData(对话框传参) > editId(路由传参) > route.query(独立页面)
  if (props.editData) {
    Object.assign(formData, props.editData as JobInfo);
    isEdit.value = true;
  } else if (props.editId) {
    loadJobDetail(props.editId);
  } else if (!props.isDialog) {
    const id = route.query.id;
    if (id) {
      loadJobDetail(Number(id));
    }
  }
});
</script>

<style scoped>
.app-container {
  padding: 20px;
}

.header-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin-left: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.cron-help {
  margin-top: 8px;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.cron-help p {
  margin: 0 0 8px 0;
  font-weight: 500;
}

.cron-help ul {
  margin: 0;
  padding-left: 20px;
}

.cron-help code {
  padding: 2px 6px;
  background: #e8eaed;
  border-radius: 3px;
  font-family: monospace;
}
</style>
