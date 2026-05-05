<script setup lang="ts">
import {createDatabase, dropDatabase, listDatabases} from "@/api/mysql";
import {useRoute, useRouter} from "vue-router";


// ==================== 路由参数 ====================
const route = useRoute();
const router = useRouter();
const connectionId = (route.query.connection_id as string) || "";

// ==================== 状态 ====================
const loading = ref(false);
const databases = ref<string[]>([]);

// 新增数据库
const createVisible = ref(false);
const createFormRef = ref();
const createForm = reactive({
  db_name: "",
  charset: "utf8mb4",
  collation: "utf8mb4_unicode_ci",
});
const createRules = {
  db_name: [
    {required: true, message: "请输入数据库名称", trigger: "blur"},
    {
      pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      message: "只能包含字母、数字和下划线，不能以数字开头",
      trigger: "blur",
    },
  ],
};

// ==================== 方法 ====================

async function fetchDatabases() {
  if (!connectionId) {
    ElMessage.warning("请先建立连接");
    router.push("/mysql/connection");
    return;
  }
  loading.value = true;
  try {
    const res: any = await listDatabases(connectionId);
    if (res.code === 0) {
      databases.value = res.data || [];
    } else {
      ElMessage.error(res.msg);
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "获取数据库列表失败");
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  try {
    const res: any = await createDatabase(
      connectionId,
      createForm.db_name,
      createForm.charset,
      createForm.collation
    );
    if (res.code === 0) {
      ElMessage.success(res.msg);
      createVisible.value = false;
      createForm.db_name = "";
      await fetchDatabases();
    } else {
      ElMessage.error(res.msg);
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "创建失败");
  }
}

async function handleDrop(dbName: string) {
  ElMessageBox.confirm(
    `确定要删除数据库 "${dbName}" 吗？此操作不可恢复！`,
    "危险操作",
    {confirmButtonText: "确定删除", cancelButtonText: "取消", type: "error"}
  ).then(async () => {
    try {
      const res: any = await dropDatabase(connectionId, dbName);
      if (res.code === 0) {
        ElMessage.success(res.msg);
        await fetchDatabases();
      } else {
        ElMessage.error(res.msg);
      }
    } catch (e: any) {
      ElMessage.error(e?.message || "删除失败");
    }
  }).catch(() => {
  });
}

function enterTable(dbName: string) {
  router.push({
    path: "/mysql/table",
    query: {connection_id: connectionId, database: dbName},
  });
}

function enterConsole(dbName: string) {
  router.push({
    path: "/mysql/console",
    query: {connection_id: connectionId, database: dbName},
  });
}

function backToConnection() {
  router.push("/mysql/connection");
}

// ==================== 初始化 ====================
onMounted(() => {
  fetchDatabases();
});
</script>

<template>
  <div class="app-container">
    <!-- 顶部信息栏 -->
    <div class="connection-bar">
      <el-button @click="backToConnection" text>
        <el-icon>
          <ArrowLeft/>
        </el-icon>
        返回连接
      </el-button>
      <el-tag type="success" effect="dark" style="margin-left: 12px">
        连接ID: {{ connectionId }}
      </el-tag>
    </div>

    <!-- 操作栏 -->
    <div class="search-container">
      <el-button type="primary" @click="createVisible = true">
        <el-icon>
          <Plus/>
        </el-icon>
        新增数据库
      </el-button>
      <el-button @click="fetchDatabases">
        <el-icon>
          <Refresh/>
        </el-icon>
        刷新
      </el-button>
    </div>

    <!-- 数据库列表 -->
    <el-card shadow="never" v-loading="loading">
      <template #header>
        <span><el-icon><Folder/></el-icon> 数据库列表 ({{ databases.length }})</span>
      </template>

      <el-empty v-if="!loading && databases.length === 0" description="暂无数据库"/>

      <el-table :data="databases.map((d) => ({ name: d }))" border highlight-current-row>
        <el-table-column label="序号" width="60" align="center">
          <template #default="scope">{{ scope.$index + 1 }}</template>
        </el-table-column>
        <el-table-column label="数据库名" prop="name" min-width="200">
          <template #default="scope">
            <el-icon style="margin-right: 6px; color: #e6a23c">
              <Folder/>
            </el-icon>
            <span style="font-weight: 500; font-size: 14px">{{ scope.row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="380" align="center" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="enterTable(scope.row.name)">
              <el-icon>
                <Grid/>
              </el-icon>
              查看表
            </el-button>
            <el-button type="info" size="small" @click="enterConsole(scope.row.name)">
              <el-icon>
                <Terminal/>
              </el-icon>
              命令行
            </el-button>
            <el-button type="danger" size="small" @click="handleDrop(scope.row.name)">
              <el-icon>
                <Delete/>
              </el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建数据库对话框 -->
    <el-dialog v-model="createVisible" title="新增数据库" width="480px" :close-on-click-modal="false">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="80px">
        <el-form-item label="数据库名" prop="db_name">
          <el-input v-model="createForm.db_name" placeholder="例如: my_database"/>
        </el-form-item>
        <el-form-item label="字符集">
          <el-select v-model="createForm.charset" style="width: 100%">
            <el-option label="utf8mb4 (推荐)" value="utf8mb4"/>
            <el-option label="utf8" value="utf8"/>
            <el-option label="gbk" value="gbk"/>
            <el-option label="latin1" value="latin1"/>
          </el-select>
        </el-form-item>
        <el-form-item label="排序规则">
          <el-select v-model="createForm.collation" style="width: 100%">
            <el-option label="utf8mb4_unicode_ci" value="utf8mb4_unicode_ci"/>
            <el-option label="utf8mb4_general_ci" value="utf8mb4_general_ci"/>
            <el-option label="utf8_unicode_ci" value="utf8_unicode_ci"/>
            <el-option label="utf8_general_ci" value="utf8_general_ci"/>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.connection-bar {
  display: flex;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 12px;
}
</style>
