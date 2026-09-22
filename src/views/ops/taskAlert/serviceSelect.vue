<template>
  <!--
    服务选择表单项（仅 el-form-item，需置于父组件 el-form 内使用）
    选中后通过 change 事件回传完整服务对象，由父组件同步 serviceName 等信息
  -->
  <el-form-item label="所属服务" prop="serviceId">
    <el-select
      v-model="selectedServiceId"
      placeholder="请选择服务"
      filterable
      clearable
      style="width: 100%"
      @change="handleChange"
    >
      <el-option
        v-for="item in serviceList"
        :key="item.id"
        :label="item.name"
        :value="item.id"
      />
    </el-select>
  </el-form-item>
</template>

<script setup lang="ts">
import { listAll } from "@/api/monitor/service";
import { ServiceInfo } from "@/api/monitor/service/types";

defineOptions({
  name: "TaskAlertServiceSelect",
});

const props = defineProps({
  /** 选中的服务ID（v-model） */
  modelValue: { type: Number, default: undefined },
});

const emit = defineEmits<{
  (e: "update:modelValue", value?: number): void;
  (e: "change", service?: ServiceInfo): void;
}>();

const serviceList = ref<ServiceInfo[]>([]);

const selectedServiceId = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

/** 加载服务列表 */
function loadServiceList() {
  listAll().then(({ data }) => {
    serviceList.value = data || [];
  });
}

/** 服务切换：回传完整服务对象 */
function handleChange(serviceId?: number) {
  const service = serviceList.value.find((item) => item.id === serviceId);
  emit("change", service);
}

onMounted(() => {
  loadServiceList();
});
</script>
