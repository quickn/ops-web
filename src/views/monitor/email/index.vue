<script setup lang="ts">
import { addData, getLastData, testSend } from "@/api/monitor/email";

import { EmailConfig } from "@/api/monitor/email/types";

defineOptions({
  name: "EmailSet",
  inheritAttrs: false,
});

const deptFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);

const dialogEdit = reactive<DialogOption>({
  visible: true,
});

const formData = reactive<EmailConfig>({ id: null });

/** 查询 */
function handleQuery() {
  loading.value = true;
  getLastData().then(({ data }) => {
    Object.assign(formData, data);
    debugger;
    loading.value = false;
  });
}

/** 添加数据  */
async function handleSubmit() {
  deptFormRef.value.validate((valid: any) => {
    if (valid) {
      addData(formData)
        .then(() => {
          ElMessage.success("成功");
        })
        .finally(() => (loading.value = false));
    }
  });
}

async function handleTestSubmit() {
  deptFormRef.value.validate((valid: any) => {
    if (valid) {
      testSend(formData)
        .then(() => {
          ElMessage.success("成功");
        })
        .finally(() => (loading.value = false));
    }
  });
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
  formData.id = undefined;
}

const rules = reactive({
  appName: [{ required: true, message: "接口名", trigger: "blur" }],
  heathUrl: [{ required: true, message: "链接", trigger: "blur" }],
});

onMounted(() => {
  handleQuery();
});
</script>
<template>
  <div class="app-container">
    <el-card
      v-model="dialogEdit.visible"
      :title="dialogEdit.title"
      width="800px"
      @closed="closeDialog"
    >
      <el-form
        ref="deptFormRef"
        :model="formData"
        :rules="rules"
        label-width="250px"
      >
        <el-form-item label="发送邮箱账号" prop="name">
          <el-input
            v-model="formData.fromMailName"
            placeholder="发送邮箱账号"
          />
        </el-form-item>

        <el-form-item label="发送邮箱密码" prop="name">
          <el-input
            v-model="formData.fromPwd"
            type="password"
            placeholder="发送邮箱密码"
          />
        </el-form-item>

        <el-form-item label="发送邮箱SMTP服务器" prop="name">
          <el-input
            v-model="formData.smtpHost"
            placeholder="发送邮箱SMTP服务器"
          />
        </el-form-item>

        <el-form-item label="发送邮箱的SMTP端口,25或465" prop="name">
          <el-input
            v-model="formData.smtpPort"
            placeholder="发送邮箱的SMTP端口"
          />
        </el-form-item>

        <el-form-item label="接受邮件,多个邮件用;隔开" prop="name">
          <el-input v-model="formData.toMail" placeholder="接受邮件" />
        </el-form-item>

        <el-form-item label="接口预警最大时间间隔" prop="name">
          <el-input
            v-model="formData.timeInterval"
            placeholder="接口预警最大时间间隔"
          />
        </el-form-item>

        <el-form-item label="是否开启邮件通知" prop="isSendMail">
          <el-switch
            v-model="formData.isSendMail"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>

        <div style="margin: 60px auto; text-align: center">
          <el-button type="primary" @click="handleTestSubmit"> 测试</el-button>
          <el-button type="primary" @click="handleSubmit"> 保存</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>
