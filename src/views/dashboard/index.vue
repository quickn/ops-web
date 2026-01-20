<template>
  <div class="dashboard-container">
    <!-- 用户信息 -->
    <el-row class="mb-8">
      <el-card class="w-full">
        <div class="flex justify-between flex-wrap">
          <div class="flex items-center">
            <img class="user-avatar" :src="userStore.avatar + '?imageView2/1/w/80/h/80'" />
            <span class="ml-[10px] text-[16px]">
              {{ userStore.nickname }}
            </span>
          </div>

          <div class="leading-[40px]">
            {{ greetings }}
          </div>
        </div>
      </el-card>
    </el-row>
    <!-- <el-card>
      <template #header>
        <el-button v-hasPerm="['sys:dept:add']" type="success" @click="openDialog()">
          <i-ep-plus />
          新增
        </el-button>
        <el-button v-hasPerm="['sys:dept:delete']" type="danger" :disabled="ids.length === 0" @click="handleDelete()">
          <i-ep-delete />
          删除
        </el-button>
      </template>

<el-table v-loading="loading" :data="deptList" row-key="id" default-expand-all
  :tree-props="{ children: 'children', hasChildren: 'hasChildren' }" @selection-change="handleSelectionChange">
  <el-table-column type="selection" width="55" align="center" />
  <el-table-column prop="appName" label="项目名" min-width="300" />
  <el-table-column prop="heathUrl" label="链接地址" width="300" />
  <el-table-column prop="serviceName" label="服务名" width="300" />
  <el-table-column label="操作" fixed="right" align="left" width="200">
    <template #default="scope">
            <el-button v-hasPerm="['sys:dept:edit']" type="primary" link size="small"
              @click.stop="openDialog(scope.row)">
              <i-ep-edit />
              编辑
            </el-button>
            <el-button v-hasPerm="['sys:dept:delete']" type="primary" link size="small"
              @click.stop="handleDelete(scope.row.id)">
              <i-ep-delete />
              删除
            </el-button>
          </template>
  </el-table-column>
</el-table>
</el-card> -->
  </div>
</template>
<script setup lang="ts">
import { useUserStore } from "@/store/modules/user";
import { useTransition, TransitionPresets } from "@vueuse/core";

defineOptions({
  // eslint-disable-next-line
  name: "Dashboard",
  inheritAttrs: false,
});

const userStore = useUserStore();
const queryFormRef = ref(ElForm);
const deptFormRef = ref(ElForm);

const loading = ref(false);
const ids = ref<number[]>([]);
const date: Date = new Date();

const greetings = computed(() => {
  const hours = date.getHours();
  if (hours >= 6 && hours < 8) {
    return "晨起披衣出草堂，轩窗已自喜微凉🌅！";
  } else if (hours >= 8 && hours < 12) {
    return "上午好🌞！";
  } else if (hours >= 12 && hours < 18) {
    return "下午好☕！";
  } else if (hours >= 18 && hours < 24) {
    return "晚上好🌃！";
  } else if (hours >= 0 && hours < 6) {
    return "偷偷向银河要了一把碎星，只等你闭上眼睛撒入你的梦中，晚安🌛！";
  }
});

const duration = 5000;

// 收入金额
const amount = ref(0);
const amountOutput = useTransition(amount, {
  duration: duration,
  transition: TransitionPresets.easeOutExpo,
});
amount.value = 2000;

// 访问数
const visitCount = ref(0);
const visitCountOutput = useTransition(visitCount, {
  duration: duration,
  transition: TransitionPresets.easeOutExpo,
});
visitCount.value = 2000;

//消息数
const messageCount = ref(0);
const messageCountOutput = useTransition(messageCount, {
  duration: duration,
  transition: TransitionPresets.easeOutExpo,
});
messageCount.value = 2000;

// 订单数
const orderCount = ref(0);
const orderCountOutput = useTransition(orderCount, {
  duration: duration,
  transition: TransitionPresets.easeOutExpo,
});
orderCount.value = 2000;
async function openDialog(data?: HeathMonitor) {
  if (data) {
    dialogEdit.visible = true;
    dialogEdit.title = "编辑文档";
    Object.assign(formData, data);
  } else {
    if (formData) {
      formData.id = undefined;
      formData.appName = undefined;
      formData.heathUrl = undefined;
    }
    dialogEdit.visible = true;
  }
}

/** 关闭弹窗 */
function closeDialog() {
  dialogEdit.visible = false;
  resetForm();
}

function handleDelete(ids?: number) {
  ElMessageBox.confirm(`确认删除已选中的数据项?`, "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    deleteData(ids).then(() => {
      ElMessage.success("删除成功");
      resetQuery();
    });
  });
}

/**重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  handleQuery();
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  position: relative;
  padding: 24px;

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .github-corner {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 99;
    border: 0;
  }

  .data-box {
    display: flex;
    justify-content: space-between;
    padding: 20px;
    font-weight: bold;
    color: var(--el-text-color-regular);
    background: var(--el-bg-color-overlay);
    border-color: var(--el-border-color);
    box-shadow: var(--el-box-shadow-dark);
  }

  .svg-icon {
    fill: currentcolor !important;
  }
}
</style>
