
&lt;div align="center"&gt;

# QieYu - 全功能 AI 学习日志与社交平台

&lt;p&gt;
  &lt;img alt="GitHub" src="https://img.shields.io/badge/license-MIT-blue.svg"&gt;
  &lt;img alt="React" src="https://img.shields.io/badge/React-19.2.4-61dafb.svg"&gt;
  &lt;img alt="Node.js" src="https://img.shields.io/badge/Node.js-Express-43853d.svg"&gt;
  &lt;img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8.2-3178c6.svg"&gt;
&lt;/p&gt;

记录你的 AI 创意之旅，与社区分享灵感

</div>

---

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [安装指南](#安装指南)
- [使用说明](#使用说明)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 项目简介

**QieYu** 是一个全功能的 AI 学习日志与社交平台，专为 AI 创作者、开发者和学习者设计。它提供了完整的学习记录、社交互动、AI 聊天、后台管理等功能，帮助你系统化地记录和分享你的 AI 创作过程。

### 核心定位

- **学习记录**：系统化记录 ComfyUI、编程、3D 建模等多领域的学习过程
- **社交互动**：与社区分享灵感，交流创作心得
- **AI 增强**：集成本地 LLM，提供智能对话辅助
- **后台管理**：完整的用户管理、内容审核、统计分析功能

---

## 功能特性

### 1. 学习日志系统

- **多类型日志支持**：
  - ComfyUI 学习 - 记录工作流、提示词、模型参数
  - 编程开发 - 记录代码片段、Bug 修复、技术栈学习
  - 3D 建模 - Blender/Maya 建模过程、材质节点与渲染设置
  - 视频剪辑 - AE/PR 剪辑技巧、特效合成与分镜设计
  - 通用学习 - 读书笔记、思维导图、外语学习
  - 生活记录 - 日常碎片、美食探店、旅行日记
  - 游戏记录 - 游戏通关截图、攻略心得、高光时刻

- **富媒体支持**：图片上传、视频嵌入、资源关联
- **标签与分类**：灵活的分类管理，支持自定义标签
- **公开/私有**：控制日志的可见性，保护隐私

### 2. 社交功能

- **用户注册与登录**：安全的认证系统
- **好友系统**：添加好友、好友请求管理
- **公共聊天大厅**：实时公共聊天
- **私聊功能**：一对一私密聊天
- **消息提醒**：未读消息实时提醒，点击跳转对应好友
- **已读功能**：消息已读状态显示
- **点赞与互动**：为优秀内容点赞

### 3. AI 聊天助手

- **本地 LLM 集成**：支持 LM Studio、Ollama 等本地模型
- **OpenAI 兼容接口**：灵活的配置选项
- **流式对话**：流畅的实时对话体验

### 4. 个人化设置

- **主题定制**：12种配色方案（紫罗兰、天空蓝、翠绿、玫瑰红、琥珀橙、青色、粉色、靛蓝、teal、活力橙、中国红、石墨灰）
- **自定义主题**：支持选择任意颜色作为主题色
- **明暗模式**：支持深色/浅色主题切换
- **聊天背景**：自定义聊天界面背景
- **个人资料**：头像、简介等信息管理
- **数据管理**：支持导入/导出学习日志数据

### 5. 后台管理系统

- **用户管理**：查看、编辑、禁用用户账户
- **内容管理**：管理日志、聊天消息
- **统计分析**：用户数、内容数、存储使用等数据统计
- **审计日志**：完整的操作记录追踪
- **公告发布**：向用户发布系统公告

---

## 技术栈

### 前端

- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Tailwind CSS** - 样式框架
- **Lucide React** - 图标库
- **Recharts** - 图表库
- **UUID** - 唯一 ID 生成

### 后端

- **Node.js** - 运行时
- **Express** - Web 框架
- **MySQL** - 数据库
- **JWT** - 身份认证
- **Bcrypt** - 密码加密
- **CORS** - 跨域支持
- **Multer** - 文件上传

---

## 快速开始

### 前置要求

确保你的系统已安装以下软件：

- **Node.js** (v16 或更高版本)
- **MySQL** (v8.0 或更高版本)
- **npm** 或 **yarn** 包管理器

### 一键启动

```bash
# 1. 克隆项目
git clone &lt;repository-url&gt;
cd QieYu

# 2. 安装前端依赖
npm install

# 3. 配置环境变量
# 复制 .env.local 并根据需要修改
cp .env.local.example .env.local

# 4. 启动前端开发服务器
npm run dev

# 5. (可选) 启动后端服务器
cd backend
npm install
npm run dev
```

---

## 安装指南

### 1. 环境配置

#### 前端环境变量

创建 `.env.local` 文件：

```env
# Gemini API Key (可选)
GEMINI_API_KEY=your_gemini_api_key_here
```

#### 后端环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
# 服务器配置
PORT=8000

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=qieyu

# JWT 密钥
JWT_SECRET=your-secret-key-change-in-production
```

### 2. 数据库配置

#### 方式一：自动初始化

启动后端服务器时，会自动创建数据库和表结构：

```bash
cd backend
npm run dev
```

#### 方式二：手动导入

```bash
# 登录 MySQL
mysql -u root -p

# 执行 SQL 文件
source backend/qieyu.sql;
```

默认管理员账号：
- 用户名：`admin`
- 密码：`admin123`

⚠️ **重要**：生产环境请务必修改默认密码！

### 3. 安装依赖

#### 前端依赖

```bash
# 在项目根目录
npm install
```

#### 后端依赖

```bash
cd backend
npm install
```

---

## 使用说明

### 启动应用

#### 开发模式

**前端：**
```bash
npm run dev
```
访问：http://localhost:3000

**后端：**
```bash
cd backend
npm run dev
```
后端运行于：http://localhost:8000

#### 生产构建

```bash
# 构建前端
npm run build

# 预览生产版本
npm run preview
```

### 核心功能使用

#### 1. 注册与登录

- 访问首页，点击「立即注册」创建账户
- 或使用已有账户登录
- 首次登录后可完善个人资料

#### 2. 创建日志

1. 点击「新建」按钮
2. 选择日志类型
3. 填写标题、内容、参数等信息
4. 上传图片（可选）
5. 添加标签和资源
6. 选择公开或私有
7. 点击「保存」

#### 3. 社交互动

- **公共聊天**：在聊天大厅与社区交流
- **添加好友**：通过用户资料页发送好友请求
- **私聊**：与好友进行一对一对话
- **点赞**：为喜欢的日志点赞

#### 4. AI 聊天

1. 进入「AI 聊天」页面
2. 在设置中配置本地 LLM 接口
3. 开始与 AI 对话

#### 5. 后台管理

- 使用管理员账户登录
- 进入「设置」页面
- 点击「管理后台」
- 可进行用户管理、内容管理、统计查看等操作

---

## 项目结构

```
QieYu/
├── frontend/
│   ├── components/          # React 组件
│   │   ├── admin/          # 后台管理组件
│   │   ├── AIChatView.tsx  # AI 聊天视图
│   │   ├── AuthView.tsx    # 认证视图
│   │   ├── ChatView.tsx    # 聊天视图
│   │   ├── EditorView.tsx  # 编辑器视图
│   │   ├── LibraryView.tsx # 日志库视图
│   │   └── ...
│   ├── services/            # API 服务
│   │   ├── adminService.ts # 后台管理服务
│   │   ├── aiService.ts    # AI 服务
│   │   ├── dbService.ts    # 数据库服务
│   │   └── ...
│   ├── App.tsx              # 主应用组件
│   ├── constants.ts         # 常量定义
│   ├── types.ts             # TypeScript 类型定义
│   ├── vite.config.ts       # Vite 配置
│   ├── package.json
│   └── index.html
├── backend/
│   ├── server.js            # Express 服务器
│   ├── qieyu.sql            # 数据库结构
│   └── package.json
├── .env.local               # 前端环境变量
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 贡献指南

我们欢迎任何形式的贡献！

### 开发流程

1. **Fork 本仓库**
2. **创建特性分支**：`git checkout -b feature/AmazingFeature`
3. **提交更改**：`git commit -m 'Add some AmazingFeature'`
4. **推送到分支**：`git push origin feature/AmazingFeature`
5. **开启 Pull Request**

### 代码规范

- 遵循项目现有代码风格
- 使用 TypeScript 进行类型检查
- 提交前确保代码无错误
- 保持代码简洁和可读性

### 报告问题

使用 GitHub Issues 报告 Bug 或提出新功能建议。

---

## 许可证

本项目采用 **MIT 许可证**。详见 [LICENSE](LICENSE) 文件。

---

## 联系方式

如有问题或建议，欢迎通过以下方式联系：

- GitHub Issues
- 项目讨论区

---

&lt;div align="center"&gt;

**QieYu** - 记录你的 AI 创意之旅，与社区分享灵感

Made with ❤️

&lt;/div&gt;

