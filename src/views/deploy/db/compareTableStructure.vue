<script setup lang="ts">
import { compareTableStructure } from "@/api/deploy/db";

import { listAll } from "@/api/monitor/service";

import { LogCmdForm } from "@/api/monitor/log/types";

import { ServiceInfo } from "@/api/monitor/service/types";

const queryFormRef = ref(ElForm);

const loading = ref(false);

const queryParams = reactive<LogCmdForm>({});

const serviceInfoList = ref<ServiceInfo[]>();

const textContent = ref<any>("");

const options = [
  { value: true, text: "场内" },
  { value: false, text: "路测" },
];

const share_options = [
  { value: true, text: "主库" },
  { value: false, text: "分库" },
];

function replaceAll(str: string, find: string, replace: string) {
  return str.replace(new RegExp(find, "g"), replace);
}

/** 查询 */
function handleQuery() {
  loading.value = true;
  textContent.value = "";
  compareTableStructure(queryParams).then(({ data }) => {
    if (queryParams.keyword != undefined) {
      data = replaceAll(
        data,
        queryParams.keyword,
        '<font color="red">' + queryParams.keyword + "</font>"
      );
    }
    let container = document.getElementById("log_div");
    container!.innerHTML = data;
    loading.value = false;
  });
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  handleQuery();
}

onMounted(() => {
  //默认选中第一个
  queryParams.is_share = share_options[0].value;
  queryParams.is_inside = options[0].value;
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
    queryParams.label = serviceInfoList.value[0].label;
    if (queryParams.label != undefined) {
      handleSelectChange(queryParams.label);
    }
  });
});

function handleSelectChange(label: string) {
  queryParams.env = label;
}
</script>

<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="服务" prop="status">
          <el-select
            v-model="queryParams.label"
            clearable
            style="width: 100px"
            @change="handleSelectChange"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.label"
              :label="item.name"
              :value="item.label"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择库" style="width: 170px">
          <el-select
            v-model="queryParams.is_share"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="item in share_options"
              :key="item.value"
              :label="item.text"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="业务" style="width: 170px">
          <el-select
            v-model="queryParams.is_inside"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="item in options"
              :key="item.value"
              :label="item.text"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <i-ep-search />
            比对
          </el-button>
          <el-button @click="resetQuery">
            <i-ep-refresh />
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    <el-card shadow="never">
      <div v-loading="loading" class="txt" id="log_div"></div>
    </el-card>
  </div>
</template>

<style>
.txt {
  min-height: 400px;
  font-family: Arial, "Microsoft YaHei", "黑体", "宋体", sans-serif;
  font-size: 10px;
  color: white;
  white-space: pre-wrap;
  background-color: #0a0a0a;
}
</style>
