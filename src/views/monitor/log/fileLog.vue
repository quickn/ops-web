<script setup lang="ts">
import { fileLogList } from "@/api/monitor/log";

import { listAll } from "@/api/monitor/service";

import { LogCmdForm } from "@/api/monitor/log/types";

import { getListByServiceId } from "@/api/docker";

import { ServiceInfo } from "@/api/monitor/service/types";

const queryFormRef = ref(ElForm);

const loading = ref(false);

const queryParams = reactive<LogCmdForm>({});

const serviceInfoList = ref<ServiceInfo[]>();

const textContent = ref<any>("");

const options = [
  { value: "info", text: "INFO" },
  { value: "debug", text: "DEBUG" },
  { value: "error", text: "ERROR" },
];

const dockerList = ref<string[]>();

function replaceAll(str: string, find: string, replace: string) {
  return str.replace(new RegExp(find, "g"), replace);
}

/** 查询 */
function handleQuery() {
  loading.value = true;
  textContent.value = "";
  fileLogList(queryParams).then(({ data }) => {
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
  queryParams.logLevel = options[0].value;
  listAll().then(({ data }) => {
    serviceInfoList.value = data;
    queryParams.serviceId = serviceInfoList.value[0].id;
    if (queryParams.serviceId != undefined) {
      handleSelectChange(queryParams.serviceId);
    }
  });
});

function handleSelectChange(serviceId: number) {
  getListByServiceId(serviceId).then(({ data }) => {
    dockerList.value = data;
    queryParams.dockerName = data[0];
  });
}
</script>

<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="服务" prop="status">
          <el-select
            v-model="queryParams.serviceId"
            clearable
            style="width: 100px"
            @change="handleSelectChange"
          >
            <el-option
              v-for="item in serviceInfoList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="容器名" style="width: 160px">
          <el-select v-model="queryParams.dockerName" clearable>
            <el-option
              v-for="item in dockerList"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>

        <el-form-item prop="keywords" label="" style="width: 150px">
          <el-input
            v-model="queryParams.keyword"
            placeholder="关键字"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item prop="keywords" label="" style="width: 150px">
          <el-input
            v-model="queryParams.grepPara"
            placeholder="grep参数 -a10 -b10 "
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="日志时间" style="width: 210px">
          <el-date-picker
            v-model="queryParams.createDate"
            type="date"
            placeholder="选择日期"
          />
        </el-form-item>

        <el-form-item label="日志级别" style="width: 170px">
          <el-select
            v-model="queryParams.logLevel"
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
            搜索
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
