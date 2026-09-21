<script setup lang="ts">
import {
  listOwnedServices,
  listDeptServices,
  assignDeptServices,
} from "@/api/monitor/service";
import { ServiceInfo } from "@/api/monitor/service/types";

defineOptions({
  name: "DeptServiceDialog",
  inheritAttrs: false,
});

interface Props {
  visible: boolean;
  /** 目标部门ID */
  deptId?: number;
  /** 目标部门名 */
  deptName?: string;
}

interface Emits {
  (e: "update:visible", value: boolean): void;
  (e: "success"): void;
}

const props = withDefaults(defineProps<Props>(), {
  deptId: undefined,
  deptName: "",
});

const emit = defineEmits<Emits>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
});

const loading = ref(false);
const saveLoading = ref(false);
const tableRef = ref();

/** 可分配的服务列表（当前登录用户名下的服务） */
const serviceList = ref<ServiceInfo[]>([]);
/** 已勾选的服务ID */
const checkedIds = ref<number[]>([]);

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      handleOpen();
    }
  }
);

/** 打开弹框时加载数据并回显目标部门已分配的服务 */
async function handleOpen() {
  const targetDeptId = props.deptId;
  if (!targetDeptId) {
    return;
  }
  loading.value = true;
  checkedIds.value = [];
  serviceList.value = [];
  try {
    const [allRes, assignedRes] = await Promise.all([
      listOwnedServices(),
      listDeptServices(targetDeptId),
    ]);
    serviceList.value = allRes.data || [];
    const assignedIds = (assignedRes.data || []).map((item) => item.id);
    checkedIds.value = assignedIds as number[];
    // 回显目标部门已分配的服务
    nextTick(() => {
      tableRef.value?.clearSelection();
      serviceList.value.forEach((row) => {
        if (assignedIds.includes(row.id)) {
          tableRef.value?.toggleRowSelection(row, true);
        }
      });
    });
  } finally {
    loading.value = false;
  }
}

/** 勾选变更 */
function handleSelectionChange(selection: ServiceInfo[]) {
  checkedIds.value = selection.map((item) => item.id as number);
}

/** 保存分配 */
function handleSave() {
  const targetDeptId = props.deptId;
  if (!targetDeptId) {
    return;
  }
  saveLoading.value = true;
  assignDeptServices({ deptId: targetDeptId, serviceIds: checkedIds.value })
    .then(() => {
      ElMessage.success("分配成功");
      dialogVisible.value = false;
      emit("success");
    })
    .finally(() => (saveLoading.value = false));
}

/** 关闭弹框 */
function handleClose() {
  dialogVisible.value = false;
}

/** 关闭动画结束后重置状态 */
function handleClosed() {
  tableRef.value?.clearSelection();
  serviceList.value = [];
  checkedIds.value = [];
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`给部门「${deptName}」分配服务`"
    width="800px"
    append-to-body
    :close-on-click-modal="false"
    @closed="handleClosed"
  >
    <el-alert
      class="mb-3"
      type="info"
      show-icon
      :closable="false"
      title="仅可勾选当前登录用户名下的服务"
    />

    <el-table
      ref="tableRef"
      v-loading="loading"
      :data="serviceList"
      row-key="id"
      border
      max-height="400"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column label="ID" prop="id" width="80" align="center" />
      <el-table-column
        label="服务名"
        prop="name"
        min-width="120"
        show-overflow-tooltip
      />
      <el-table-column
        label="标签"
        prop="label"
        min-width="100"
        show-overflow-tooltip
      />
      <el-table-column
        label="工作路径"
        prop="workPath"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column label="是否监控" prop="isMonitor" width="100" align="center">
        <template #default="scope">
          {{ scope.row.isMonitor ? "是" : "否" }}
        </template>
      </el-table-column>
      <el-table-column label="排序" prop="sort" width="80" align="center" />
    </el-table>

    <template #footer>
      <el-button type="primary" :loading="saveLoading" @click="handleSave">
        <i-ep-check />
        保存
      </el-button>
      <el-button @click="handleClose">取 消</el-button>
    </template>
  </el-dialog>
</template>
