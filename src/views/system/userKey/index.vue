<script setup lang="ts">
import {
  generateKeyPair,
  getPublicKey,
  encryptData,
  decryptData,
} from "@/api/key";
import { getUserPage } from "@/api/user";

import { UserQuery, UserPageVO } from "@/api/user/types";

defineOptions({
  name: "KeyManager",
  inheritAttrs: false,
});

const queryFormRef = ref(ElForm); // 查询表单

const loading = ref(false);
const encryptDialog = reactive<DialogOption>({
  visible: false,
  title: "加密数据",
});

const decryptDialog = reactive<DialogOption>({
  visible: false,
  title: "解密数据",
});

const queryParams = reactive<UserQuery>({
  pageNum: 1,
  pageSize: 10,
});
const userList = ref<UserPageVO[]>();
const total = ref(0);

const encryptFormData = reactive({
  userId: "",
  plainText: "",
  cipherText: "",
});

const decryptFormData = reactive({
  userId: "",
  cipherText: "",
  plainText: "",
  password: "",
});

const encryptRules = reactive({
  userId: [{ required: true, message: "用户ID不能为空", trigger: "blur" }],
  plainText: [
    { required: true, message: "待加密数据不能为空", trigger: "blur" },
  ],
});

const decryptRules = reactive({
  userId: [{ required: true, message: "用户ID不能为空", trigger: "blur" }],
  cipherText: [
    { required: true, message: "待解密数据不能为空", trigger: "blur" },
  ],
});

/**
 * 查询用户列表[citation:2][citation:6]
 */
function handleQuery() {
  loading.value = true;
  getUserPage(queryParams)
    .then(({ data }) => {
      userList.value = data.list;
      total.value = data.total;
    })
    .finally(() => {
      loading.value = false;
    });
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  handleQuery();
}

/** 生成密钥对 */
async function handleGenerateKeyPair(row: { [key: string]: any }) {
  ElMessageBox.confirm(
    "确认要为用户「" + row.username + "」生成RSA密钥对吗?",
    "生成密钥对",
    {
      confirmButtonText: "生成",
      cancelButtonText: "取消",
      type: "warning",
    }
  )
    .then(() => {
      loading.value = true;
      generateKeyPair({ userId: row.username })
        .then(({ data }) => {
          ElMessage.success("密钥对生成成功");
        })
        .finally(() => {
          loading.value = false;
        });
    })
    .catch(() => {});
}

/** 查看公钥 */
async function viewPublicKey(row: { [key: string]: any }) {
  loading.value = true;
  getPublicKey(row.username)
    .then(({ data }) => {
      ElMessageBox.alert(
        `<div style="word-break: break-all; max-height: 400px; overflow-y: auto;">
          <strong>用户：</strong> ${row.nickname} (${row.username})<br/>
          <strong>公钥内容：</strong><br/>
          ${data}
        </div>`,
        "公钥信息",
        {
          dangerouslyUseHTMLString: true,
          confirmButtonText: "复制",
          showCancelButton: true,
          cancelButtonText: "关闭",
          customClass: "public-key-dialog",
        }
      )
        .then(() => {
          // 复制到剪贴板
          navigator.clipboard.writeText(data).then(() => {
            ElMessage.success("公钥已复制到剪贴板");
          });
        })
        .catch(() => {});
    })
    .finally(() => {
      loading.value = false;
    });
}

/** 重新生成密钥对 */
function regenerateKeyPair(row: { [key: string]: any }) {
  ElMessageBox.confirm(
    "确认要为用户「" + row.username + "」重新生成密钥对吗?",
    "重新生成密钥",
    {
      confirmButtonText: "重新生成",
      cancelButtonText: "取消",
      type: "warning",
    }
  )
    .then(() => {
      loading.value = true;
      generateKeyPair({ userId: row.username })
        .then(() => {
          ElMessage.success("密钥对重新生成成功");
        })
        .finally(() => {
          loading.value = false;
        });
    })
    .catch(() => {});
}

/** 打开加密弹窗 */
function openEncryptDialog(row: { [key: string]: any }) {
  encryptFormData.userId = row.username;
  encryptFormData.plainText = "";
  encryptFormData.cipherText = "";
  encryptDialog.visible = true;
}

/** 关闭加密弹窗 */
function closeEncryptDialog() {
  encryptDialog.visible = false;
}

/** 打开解密弹窗 */
function openDecryptDialog(row: { [key: string]: any }) {
  decryptFormData.userId = row.username;
  decryptFormData.cipherText = "";
  decryptFormData.plainText = "";
  decryptFormData.password = "";
  decryptDialog.visible = true;
}

/** 关闭解密弹窗 */
function closeDecryptDialog() {
  decryptDialog.visible = false;
}

/** 加密数据 */
const handleEncrypt = useThrottleFn(() => {
  const encryptFormRef = ref(ElForm);
  encryptFormRef.value.validate((valid: any) => {
    if (valid) {
      loading.value = true;
      encryptData({
        userId: encryptFormData.userId,
        plainText: encryptFormData.plainText,
      })
        .then(({ data }) => {
          encryptFormData.cipherText = data;
          ElMessage.success("加密成功");
        })
        .catch((error) => {
          ElMessage.error(error.message || "加密失败");
        })
        .finally(() => {
          loading.value = false;
        });
    }
  });
}, 3000);

/** 解密数据 */
const handleDecrypt = useThrottleFn(() => {
  const decryptFormRef = ref(ElForm);
  decryptFormRef.value.validate((valid: any) => {
    if (valid) {
      loading.value = true;
      decryptData({
        userId: decryptFormData.userId,
        cipherText: decryptFormData.cipherText,
        privateKeyPassword: decryptFormData.password,
      })
        .then(({ data }) => {
          decryptFormData.plainText = data;
          ElMessage.success("解密成功");
        })
        .catch((error) => {
          ElMessage.error(error.message || "解密失败");
        })
        .finally(() => {
          loading.value = false;
        });
    }
  });
}, 3000);

/** 复制加密结果 */
function copyEncryptResult() {
  if (encryptFormData.cipherText) {
    navigator.clipboard.writeText(encryptFormData.cipherText).then(() => {
      ElMessage.success("已复制到剪贴板");
    });
  } else {
    ElMessage.warning("没有可复制的内容");
  }
}

/** 复制解密结果 */
function copyDecryptResult() {
  if (decryptFormData.plainText) {
    navigator.clipboard.writeText(decryptFormData.plainText).then(() => {
      ElMessage.success("已复制到剪贴板");
    });
  } else {
    ElMessage.warning("没有可复制的内容");
  }
}

/** 快速测试 */
async function quickTest() {
  ElMessageBox.prompt("请输入用户ID", "快速测试", {
    confirmButtonText: "开始测试",
    cancelButtonText: "取消",
    inputPattern: /\S+/,
    inputErrorMessage: "用户ID不能为空",
  })
    .then(async ({ value }) => {
      loading.value = true;
      try {
        // 1. 生成密钥对
        await generateKeyPair({ userId: value });

        // 2. 获取公钥
        const { data: publicKey } = await getPublicKey(value);

        // 3. 加密测试数据
        const testText = "Hello, RSA加密测试!";
        const { data: encrypted } = await encryptData({
          userId: value,
          plainText: testText,
        });

        // 4. 解密数据
        const { data: decrypted } = await decryptData({
          userId: value,
          cipherText: encrypted,
          privateKeyPassword: "your_secure_password",
        });

        ElMessageBox.alert(
          `
          <div style="text-align: left;">
            <p><strong>用户ID:</strong> ${value}</p>
            <p><strong>原始文本:</strong> ${testText}</p>
            <p><strong>加密后:</strong> ${encrypted.substring(0, 50)}...</p>
            <p><strong>解密后:</strong> ${decrypted}</p>
            <p><strong>测试结果:</strong> ${
              testText === decrypted ? "✅ 成功" : "❌ 失败"
            }</p>
          </div>
        `,
          "快速测试结果",
          {
            dangerouslyUseHTMLString: true,
          }
        );
      } catch (error: any) {
        ElMessage.error("测试失败: " + error.message);
      } finally {
        loading.value = false;
      }
    })
    .catch(() => {});
}

onMounted(() => {
  handleQuery();
});
</script>

<template>
  <div class="app-container">
    <el-card shadow="never" class="mb-4">
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium">RSA密钥管理</h3>
          <div>
            <el-button type="primary" @click="quickTest" :loading="loading">
              <i-ep-magic-stick /> 快速测试
            </el-button>
          </div>
        </div>
      </template>
    </el-card>

    <div class="search-container mb-4">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="用户名" prop="keywords">
          <el-input
            v-model="queryParams.keywords"
            placeholder="用户名/昵称"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-select
            v-model="queryParams.status"
            placeholder="全部"
            clearable
            style="width: 200px"
          >
            <el-option label="启用" value="1" />
            <el-option label="禁用" value="0" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery"
            ><i-ep-search />搜索</el-button
          >
          <el-button @click="resetQuery">
            <i-ep-refresh />
            重置</el-button
          >
        </el-form-item>
      </el-form>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="userList">
        <el-table-column
          key="id"
          label="编号"
          align="center"
          prop="id"
          width="100"
        />
        <el-table-column
          key="username"
          label="用户名"
          align="center"
          prop="username"
        />
        <el-table-column
          label="用户昵称"
          width="120"
          align="center"
          prop="nickname"
        />

        <el-table-column
          label="性别"
          width="100"
          align="center"
          prop="genderLabel"
        />

        <el-table-column
          label="部门"
          width="120"
          align="center"
          prop="deptName"
        />
        <el-table-column
          label="手机号码"
          align="center"
          prop="mobile"
          width="120"
        />

        <el-table-column
          label="创建时间"
          align="center"
          prop="createTime"
          width="180"
        />
        <el-table-column label="操作" fixed="right" width="380">
          <template #default="scope">
            <el-button
              v-hasPerm="['sys:key:generate']"
              type="primary"
              size="small"
              link
              @click="handleGenerateKeyPair(scope.row)"
              ><i-ep-key />生成密钥</el-button
            >
            <el-button
              v-hasPerm="['sys:key:view']"
              type="primary"
              size="small"
              link
              @click="viewPublicKey(scope.row)"
              ><i-ep-view />查看公钥</el-button
            >
            <el-button
              v-hasPerm="['sys:key:regenerate']"
              type="primary"
              size="small"
              link
              @click="regenerateKeyPair(scope.row)"
              ><i-ep-refresh-left />重新生成</el-button
            >
            <el-button
              v-hasPerm="['sys:key:encrypt']"
              type="primary"
              size="small"
              link
              @click="openEncryptDialog(scope.row)"
              ><i-ep-lock />加密</el-button
            >
            <el-button
              v-hasPerm="['sys:key:decrypt']"
              type="primary"
              size="small"
              link
              @click="openDecryptDialog(scope.row)"
              ><i-ep-unlock />解密</el-button
            >
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

    <!-- 加密弹窗 -->
    <el-dialog
      v-model="encryptDialog.visible"
      :title="encryptDialog.title"
      width="600px"
      append-to-body
      @close="closeEncryptDialog"
    >
      <el-form
        ref="encryptFormRef"
        :model="encryptFormData"
        :rules="encryptRules"
        label-width="80px"
      >
        <el-form-item label="用户ID">
          <el-input
            v-model="encryptFormData.userId"
            readonly
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="待加密数据" prop="plainText">
          <el-input
            v-model="encryptFormData.plainText"
            type="textarea"
            :rows="4"
            placeholder="请输入需要加密的数据"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="加密结果">
          <el-input
            v-model="encryptFormData.cipherText"
            type="textarea"
            :rows="6"
            readonly
            placeholder="加密结果将显示在这里"
          />
          <div class="mt-2 flex justify-between">
            <el-button
              type="primary"
              size="small"
              @click="copyEncryptResult"
              :disabled="!encryptFormData.cipherText"
            >
              <i-ep-copy-document /> 复制结果
            </el-button>
            <span class="text-gray-500 text-sm">
              长度: {{ encryptFormData.cipherText.length }} 字符
            </span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleEncrypt" :loading="loading">
            加 密
          </el-button>
          <el-button @click="closeEncryptDialog">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 解密弹窗 -->
    <el-dialog
      v-model="decryptDialog.visible"
      :title="decryptDialog.title"
      width="600px"
      append-to-body
      @close="closeDecryptDialog"
    >
      <el-form
        ref="decryptFormRef"
        :model="decryptFormData"
        :rules="decryptRules"
        label-width="80px"
      >
        <el-form-item label="用户ID">
          <el-input
            v-model="decryptFormData.userId"
            readonly
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="待解密数据" prop="cipherText">
          <el-input
            v-model="decryptFormData.cipherText"
            type="textarea"
            :rows="6"
            placeholder="请输入需要解密的数据"
          />
        </el-form-item>

        <el-form-item label="私钥密码" prop="password">
          <el-input
            v-model="decryptFormData.password"
            type="password"
            placeholder="请输入私钥密码"
            show-password
          />
          <div class="mt-1 text-gray-500 text-sm">
            默认密码: your_secure_password
          </div>
        </el-form-item>

        <el-form-item label="解密结果">
          <el-input
            v-model="decryptFormData.plainText"
            type="textarea"
            :rows="4"
            readonly
            placeholder="解密结果将显示在这里"
          />
          <div class="mt-2 flex justify-between">
            <el-button
              type="primary"
              size="small"
              @click="copyDecryptResult"
              :disabled="!decryptFormData.plainText"
            >
              <i-ep-copy-document /> 复制结果
            </el-button>
            <span class="text-gray-500 text-sm">
              长度: {{ decryptFormData.plainText.length }} 字符
            </span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="handleDecrypt" :loading="loading">
            解 密
          </el-button>
          <el-button @click="closeDecryptDialog">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.public-key-dialog {
  max-width: 800px;
}

.public-key-dialog .el-message-box__content {
  max-height: 500px;
  overflow-y: auto;
}
</style>
