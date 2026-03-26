<script setup lang="ts">
import hljs from "highlight.js";
import "highlight.js/styles/default.css"; // 引入样式，可替换其他主题
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
  { value: false, text: "主库" },
  { value: true, text: "分库" },
];

/** 查询 */
function handleQuery() {
  loading.value = true;
  textContent.value = "";
  compareTableStructure(queryParams).then(({ data }) => {
    let container = document.getElementById("sql_code");
    const formattedData = data.replace(/;/g, ";\n");
    container!.innerHTML = formattedData;
    document.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightBlock(block);
    });
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
    queryParams.env = serviceInfoList.value[0].label;
    if (queryParams.env != undefined) {
      handleSelectChange(queryParams.env);
    }
  });
});

function handleSelectChange(label: string) {
  queryParams.env = label;
}

function copyCommand() {
  let container = document.getElementById("sql_code");
  let text = container?.innerText;
  if (!text) {
    ElMessage.warning("没有命令可复制");
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => {
      ElMessage.success("命令已复制到剪贴板");
    })
    .catch(() => {
      ElMessage.error("复制失败");
    });
}
</script>

<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item label="服务" prop="status">
          <el-select
            v-model="queryParams.env"
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
        <el-form-item>
          <el-button type="primary" @click="copyCommand" size="small">
            <i-ep-document-copy />
            复制
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    <el-card shadow="never">
      <div v-loading="loading" id="log_div">
        <pre>
        <code class="sql" id="sql_code">
        </code>
        </pre>
      </div>
    </el-card>
  </div>
</template>
