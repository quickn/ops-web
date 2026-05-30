---
name: cloud-ops-dev
description: Cloud-OPS 运维管理平台开发助手。帮助添加 CRUD 页面、API 接口、路由配置、权限设置等常见开发任务。
---

# Cloud-OPS 开发助手

你正在 Cloud-OPS（运维监控管理平台）项目中工作，这是一个基于 **Vue 3 + TypeScript + Element Plus + Vite** 的后台管理系统。

## 技术栈速览

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3.3 + Composition API (`<script setup lang="ts">`) |
| 语言 | TypeScript |
| 构建 | Vite 4 |
| UI | Element Plus 2 + UnoCSS + SCSS |
| 状态管理 | Pinia (setup function 语法) |
| 路由 | Vue Router 4 (动态路由) |
| HTTP | Axios (双后端代理) |
| 图表 | ECharts |
| 终端 | xterm 6 |
| 国际化 | vue-i18n (中/英) |

## 项目架构关键点

### 双后端代理

- **Java 后端** (`/dev-api`) → `localhost:8989` — 主要业务接口
- **Python 后端** (`/py-api`) → `localhost:18080` — 运维/WebSocket 接口

在 `src/utils/request.ts` 中，Axios 实例会检查 URL 前缀：
- 以 `/pyApi/` 开头 → 使用 Python 后端 baseURL
- 否则 → 使用 Java 后端 baseURL

API 运行时可配：通过 `src/utils/api-config.ts` + `localStorage` 实现。

### 自动导入（unplugin）

以下内容由 Vite 插件自动导入，**不需要手动 import**：
- Vue API：`ref`, `reactive`, `computed`, `watch`, `onMounted` 等
- `@vueuse/core` 函数
- Element Plus 组件和图标

### 权限系统

- **路由级权限**：动态路由从后端 `/api/v1/menus/routes` 获取，`ROOT` 角色拥有全部权限
- **按钮级权限**：使用 `v-hasPerm="['sys:user:add']"` 指令控制
- **角色权限**：使用 `v-hasRole="['ADMIN']"` 指令控制
- **路由守卫**：在 `src/permission.ts` 中处理 token 验证和动态路由加载

---

## 开发任务指南

### 1. 添加新的 CRUD 页面

按照以下步骤操作：

#### Step 1: 创建 API 层

在 `src/api/<module>/` 下创建文件：

```typescript
// src/api/<module>/types.ts — 类型定义
export interface XxxVO {
  id: number;
  name: string;
  // ... 其他字段
}

export interface XxxQuery extends PageQuery {
  name?: string;
}
```

```typescript
// src/api/<module>/index.ts — API 函数
import request from "@/utils/request";

const BASE = "/api/v1/xxx";

export function listXxxPage(query: XxxQuery) {
  return request<any, PageResult<XxxVO[]>>({
    url: BASE + "/page",
    method: "get",
    params: query,
  });
}

export function addXxx(data: XxxVO) {
  return request({ url: BASE, method: "post", data });
}

export function updateXxx(data: XxxVO) {
  return request({ url: BASE, method: "put", data });
}

export function deleteXxxByIds(ids: string) {
  return request({ url: BASE + "/" + ids, method: "delete" });
}
```

#### Step 2: 创建页面组件

在 `src/views/<module>/` 下创建 `.vue` 文件：

```vue
<script setup lang="ts">
defineOptions({ name: "XxxManagement", inheritAttrs: false });

import { listXxxPage, addXxx, updateXxx, deleteXxxByIds } from "@/api/<module>";
import type { XxxVO, XxxQuery } from "@/api/<module>/types";

// 使用项目内置的 hooks（查看其他页面复用 pattern）
const loading = ref(false);
const list = ref<XxxVO[]>([]);
const total = ref(0);
const queryParams = reactive<XxxQuery>({ pageNum: 1, pageSize: 10 });

// 搜索、重置、新增、编辑、删除等方法...
</script>

<template>
  <div class="app-container">
    <!-- 搜索区域 -->
    <el-card shadow="never">
      <el-form :model="queryParams" inline>
        <!-- 搜索字段 -->
      </el-form>
    </el-card>
    <!-- 表格区域 -->
    <el-card shadow="never">
      <el-table :data="list" border v-loading="loading">
        <!-- 表格列 -->
      </el-table>
      <pagination v-model:total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="fetchList" />
    </el-card>
    <!-- 新增/编辑弹窗 -->
  </div>
</template>

<style lang="scss" scoped>
// 使用 SCSS + scoped，匹配项目风格
</style>
```

#### Step 3: 注册路由

在 `src/router/index.ts` 的静态路由中添加（或让后端菜单管理动态添加）。

#### Step 4: 设置权限

在系统管理的菜单管理中配置菜单和按钮权限标识。

### 2. 组件编写规范

- 使用 `<script setup lang="ts">` 在最前，然后是 `<template>`，最后是 `<style lang="scss" scoped>`
- 使用 `defineOptions({ name: "..." })` 命名组件
- 模板中使用 Element Plus 组件，标签写 kebab-case（如 `<el-button>`, `<el-table>`）
- 使用 UnoCSS 原子类（如 `class="flex items-center"`）
- 引用项目已有的通用组件：
  - `<Pagination>` — 分页组件
  - `<Breadcrumb>` — 面包屑
  - `<SvgIcon>` — SVG 图标
  - `<Upload>` / `<MultiUpload>` — 文件上传

### 3. API 请求规范

```typescript
// GET 请求（分页列表）
request<any, PageResult<XxxVO[]>>({ url: BASE + "/page", method: "get", params: query });

// POST 请求（新增）
request({ url: BASE, method: "post", data: formData });

// PUT 请求（更新）
request({ url: BASE, method: "put", data: formData });

// DELETE 请求（删除）
request({ url: BASE + "/" + ids, method: "delete" });

// 文件下载（Excel 导出）
request({ url: BASE + "/export", method: "get", responseType: "arraybuffer" });
```

响应格式：`{ code: "00000", data: ..., msg: "..." }`，`code === "00000"` 表示成功。

### 4. Pinia Store 规范

使用 setup function 语法：

```typescript
export const useXxxStore = defineStore("xxx", () => {
  const state = ref<XxxType>(initialValue);
  const computedVal = computed(() => state.value.xxx);

  function doSomething() { ... }

  return { state, computedVal, doSomething };
});

// 用于组件外部的 hook
export function useXxxStoreHook() {
  return useXxxStore(store);
}
```

### 5. 代码质量

- 运行 `pnpm run lint:eslint` 检查代码
- 运行 `pnpm run lint:prettier` 格式化代码
- 提交使用 `pnpm run commit`（交互式 conventional commits）
- 提交前会自动运行 lint-staged

### 6. 常用全局类型

项目在 `src/types/global.d.ts` 中定义了常用类型：
- `PageQuery` — `{ pageNum: number, pageSize: number }`
- `PageResult<T>` — `{ list: T, total: number }`
- `DialogOption` — `{ title: string, visible: boolean }`
- `OptionType` — `{ value: string|number, label: string, children?: OptionType[] }`

### 7. 开发时的注意事项

- **不要手动 import Vue API**（ref, computed, watch 等都是自动导入的）
- **不要手动注册 Element Plus 组件**（unplugin-vue-components 自动处理）
- **Python 后端接口** 要以 `/pyApi/` 为前缀
- **Hash 路由** 使用的是 `createWebHashHistory`，注意路径格式
- **生产构建** base path 是 `/m-web`
- **权限指令** `v-hasPerm` 在无权限时会直接 remove DOM 元素，不是隐藏

## 添加功能时的工作流程

当用户要求添加新功能时，按以下顺序操作：

1. 先查看已有的类似页面作为参考（`src/views/` 下找相似的模块）
2. 创建/复用 API 层文件（`src/api/` 下）
3. 创建页面组件（`src/views/` 下）
4. 确认路由和权限配置
5. 运行 `pnpm run dev` 验证
6. 运行 lint 检查确保代码质量
