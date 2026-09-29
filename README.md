<p align="center">
  <h1 align="center">Cloud-OPS 运维监控管理平台</h1>
  <p align="center">轻量级一体化运维监控平台 · 前端</p>
</p>

<p align="center">
    <img src="https://img.shields.io/badge/Vue-3.3-brightgreen.svg"/>
    <img src="https://img.shields.io/badge/TypeScript-5.x-blue.svg"/>
    <img src="https://img.shields.io/badge/Vite-4.x-green.svg"/>
    <img src="https://img.shields.io/badge/Element%20Plus-2.x-blue.svg"/>
    <img src="https://img.shields.io/badge/Pinia-2.x-critical.svg"/>
    <img src="https://img.shields.io/badge/ECharts-5.x-orange.svg"/>
    <img src="https://img.shields.io/badge/xterm-6-black.svg"/>
    <img src="https://img.shields.io/badge/license-MIT-green.svg"/>
</p>

## 项目介绍

**Cloud-OPS** 是一套面向中小团队的一体化运维监控管理平台，覆盖 **服务器监控、数据库管理、中间件管理、Web 终端、定时任务、告警通知、AI 智能助手** 等日常运维场景。

平台采用前后端分离架构，由三个工程组成：

| 工程                                                        | 说明                                   | 端口 |
|-----------------------------------------------------------|--------------------------------------| ---- |
| **ops-web**（本仓库）                                          | 前端，Vue 3 + TypeScript + Element Plus | 3000 |
| **[ops-server](https://gitee.com/quickn/ops-server.git)** | Java 后端（Spring Boot），主要业务接口          | 8989 |
| **[ops-py](https://gitee.com/quickn/ops-py)**             | Python 后端，管理中间件账号，提供中间件接口操作          | 18080 |
| **[ops-agent](https://gitee.com/quickn/ops-agent)**       | 运维终端 ，采集服务器信息，执行远程命令                 |  |
前端通过 **双后端代理** 同时对接 Java 与 Python 两个后端，见下文 [双后端架构](#双后端架构)。

## 核心特性

- **实时监控**：CPU / 内存 / 磁盘 / 进程 / 系统信息 / 服务健康检查，ECharts 可视化大屏
- **Web 终端**：基于 xterm 6 的浏览器 SSH 终端，支持 WebSocket 代理
- **运维作业**：指令库（脚本/命令管理）、定时任务调度、任务告警、文件同步分发
- **数据库管理**：MySQL 连接管理、库/表浏览、数据控制台
- **中间件管理**：Nginx 配置管理、Nacos 配置中心与服务列表
- **应用运维**：JAR 部署、项目管理、Docker 容器统计、日志查询与解析
- **AI 智能助手**：内置 AI Agent，多会话管理，支持 DeepSeek 系列模型，流式输出
- **权限系统**：动态路由 + 按钮级权限（`v-hasPerm`）+ 角色权限（`v-hasRole`），用户/角色/菜单/部门/字典管理
- **现代化前端工程**：UnoCSS 原子化样式、SCSS、自动导入（Vue API / Element Plus 组件与图标）、国际化、暗黑模式、多标签导航、布局切换（左侧/顶部/混合）

## 功能模块

| 模块 | 内容                                                                    |
| ---- |-----------------------------------------------------------------------|
| Dashboard | 监控总览大盘                                                                |
| 监控中心 | CPU/内存、磁盘管理、进程统计、系统信息、服务状态、健康检查、容器统计、日志、邮件通知、外部链接、文件、指令、JAR、项目、Docker |
| 运维作业 | 终端（Web SSH）、指令库、定时任务、任务告警、告警管理、文件管理、Agent 管理、账号配置                     |
| 数据库 | MySQL 连接 / 数据库 / 表 / 数据 / 控制台                                         |
| 中间件 | Nginx 管理、Nacos 配置与服务，XxlJobb管理                                        |
| 部署管理 | 数据库变更脚本管理 （表结构同步与数据同步），docker应用部署                                     |
| AI 助手 | 多会话 AI Agent（DeepSeek）                                                |
| 系统管理 | 用户、角色、菜单、部门、字典、用户密钥                                                   |

## 技术栈

| 类别 | 技术 |
| ---- | ---- |
| 框架 | Vue 3.3 + Composition API（`<script setup lang="ts">`） |
| 语言 | TypeScript 5 |
| 构建 | Vite 4 |
| UI | Element Plus 2 + UnoCSS + SCSS |
| 状态管理 | Pinia（setup function 语法） |
| 路由 | Vue Router 4（Hash 路由 + 动态路由） |
| HTTP | Axios（双后端代理） |
| 图表 | ECharts 5 |
| 终端 | xterm 6 |
| 编辑器 | CodeMirror 6、WangEditor |
| 代码规范 | ESLint + Prettier + Stylelint + Husky + Commitlint |

## 项目结构

```
ops-web
├── mock/                        # Mock 数据
├── public/                      # 静态资源
├── src/
│   ├── api/                     # API 层（按业务域划分）
│   ├── assets/                  # 图标/图片
│   ├── components/              # 通用组件（Pagination、Upload、SvgIcon...）
│   ├── directive/               # 自定义指令（v-hasPerm、v-hasRole）
│   ├── enums/                   # 枚举
│   ├── lang/                    # 国际化
│   ├── layout/                  # 布局
│   ├── router/                  # 路由
│   ├── store/                   # Pinia 状态
│   ├── styles/                  # 全局样式
│   ├── types/                   # 类型定义
│   ├── utils/                   # 工具函数
│   ├── views/                   # 页面（dashboard/monitor/ops/mysql/...）
│   ├── permission.ts            # 路由守卫（动态路由 + 白名单）
│   └── settings.ts              # 系统设置
├── .env.development             # 开发环境变量
├── .env.production              # 生产环境变量
└── vite.config.ts               # Vite 配置（双代理 + 自动导入）
```

## 环境要求

| 环境 | 版本 | 备注 |
| ---- | ---- | ---- |
| Node.js | 16+ | 建议 18 LTS |
| 包管理器 | pnpm | 项目强制使用 pnpm |
| 开发工具 | VSCode | 安装 Vue Language Features (Volar)、TypeScript Vue Plugin |

## 快速开始

```bash
# 克隆代码
git clone https://gitee.com/quickn/ops-web.git
cd ops-web

# 安装 pnpm（已安装可跳过）
npm install pnpm -g

# 安装依赖
pnpm install

# 启动（默认端口 3000，自动打开浏览器）
pnpm run dev
```

> 前端启动后需要同时启动两个后端服务，否则接口报错：
>
> - **ops-server**（Java）：默认 `http://localhost:8989`
> - **ops-py**（Python）：默认 `http://localhost:18080`
>
> 后端启动方式请参考对应工程的 README。

## 环境变量说明

`.env.development`（开发环境）：

```properties
VITE_APP_TITLE = 'Cloud-OPS'
VITE_APP_PORT = 3000

# Java 后端代理：/dev-api → http://localhost:8989
VITE_APP_BASE_API = '/dev-api'
VITE_APP_TARGET_URL = 'http://localhost:8989'

# Python 后端代理：/py-api → http://localhost:18080（含 WebSocket）
VITE_APP_BASE_API_PY = '/py-api'
VITE_APP_TARGET_URL_PY = 'http://localhost:18080'
```

`.env.production`（生产环境）：

```properties
VITE_BASE_PATH = '/m-web'        # 构建产物 base path
VITE_APP_BASE_API = '/monitor'   # Java 后端接口前缀
VITE_APP_BASE_API_PY = '/pyApi'  # Python 后端接口前缀
```

## 双后端架构

前端通过 URL 前缀区分请求走向（见 `vite.config.ts` 与 Axios 实例逻辑）：

```
浏览器
  ├── /dev-api/**  ──► Java 后端  (ops-server, localhost:8989)   # 业务接口
  └── /py-api/**   ──► Python 后端 (ops-py, localhost:18080)   # 运维接口 / WebSocket
```

- 开发环境由 Vite `server.proxy` 代理（Python 代理开启 `ws: true` 支持 WebSocket）
- **Python 后端接口一律以 `/pyApi/` 前缀调用**，其余走 Java 后端

## 生产部署

```bash
# 打包（产物在 dist/ 目录，base path 为 /m-web）
pnpm run build
```

将 `dist` 目录内容拷贝至服务器（如 `/usr/share/nginx/html/m-web`），Nginx 参考配置：

```nginx
server {
    listen       80;
    server_name  localhost;

    # 前端静态资源（hash 路由，无需 try_files 兜底也可，但推荐加上）
    location /m-web/ {
        alias  /usr/share/nginx/html/m-web/;
        index  index.html index.htm;
        try_files $uri $uri/ /m-web/index.html;
    }

    # Java 后端反向代理（业务接口）
    location /monitor/ {
        proxy_pass http://127.0.0.1:8989/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Python 后端反向代理（运维接口 + WebSocket，必须升级 Upgrade 头）
    location /pyApi/ {
        proxy_pass http://127.0.0.1:18080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;   # WebSocket 长连接
    }
}
```

## 开发指南

### 组件编写

- 统一使用 `<script setup lang="ts">` → `<template>` → `<style lang="scss" scoped>` 顺序
- 使用 `defineOptions({ name: "XxxYyy" })` 命名组件
- Vue API（`ref`、`computed`、`watch`、`onMounted` 等）与 `@vueuse/core` 函数**自动导入，无需手动 import**
- Element Plus 组件与图标**自动按需导入，无需注册**

### API 请求规范

```typescript
// GET 分页列表
request({ url: BASE + "/page", method: "get", params: query });
// POST 新增
request({ url: BASE, method: "post", data: formData });
// PUT 更新
request({ url: BASE, method: "put", data: formData });
// DELETE 删除
request({ url: BASE + "/" + ids, method: "delete" });
```

统一响应格式：`{ code: "00000", data: ..., msg: "..." }`，`code === "00000"` 视为成功。

### 权限控制

```html
<el-button v-hasPerm="['sys:user:add']">新增</el-button>
<el-button v-hasRole="['ADMIN']">管理员操作</el-button>
```

动态路由由后端 `/api/v1/menus/routes` 下发，`ROOT` 角色拥有全部权限；无权限时指令直接移除 DOM 元素。

### 提交规范

```bash
pnpm run commit   # 唤起交互式提交（cz-git）
```

遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)，配合 Husky + lint-staged 在提交前自动执行 ESLint / Prettier / Stylelint 校验。

## 常见问题

- **页面访问空白**：升级浏览器，低版本内核不支持可选链等新语法
- **组件/函数引用爆红**：重启 VSCode（自动导入类型提示偶发失效）
- **接口 404 / WebSocket 连不上**：确认两个后端均已启动，且 `.env.development` 中代理地址正确
- **依赖安装失败**：项目限制仅能使用 pnpm，请勿使用 npm / yarn

## 参与贡献

欢迎 Issue 与 PR：

1. Fork 本仓库并克隆到本地
2. 新建分支：`git checkout -b feat/xxx`
3. 提交代码：`pnpm run commit`
4. 推送并创建 Pull Request

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。

## 致谢

本项目前端工程基于开源模板 [vue3-element-admin](https://gitee.com/youlaiorg/vue3-element-admin)（有来开源组织）构建，感谢原作者及开源社区的贡献。
