# NovelFlow 小说创作工作台

[![Version](https://img.shields.io/badge/version-0.2.0-blue)](https://github.com/laishouchao/novel-flow-app/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

一款专为小说创作者设计的桌面端 AI 辅助写作工具，基于 Tauri + React + TypeScript 构建。

## ✨ 特性

- 🤖 **AI 辅助创作** - 支持 OpenAI API 格式的大语言模型，全流程 AI 辅助
- 📝 **灵感收束** - 通过多维度对话引导，将模糊灵感转化为清晰的项目设定
- 📚 **大纲管理** - 卷/章节两级结构，支持 AI 生成章节大纲
- ✍️ **章节写作** - 内置 Markdown 编辑器，支持 AI 续写、扩写、润色
- 🔍 **智能审查** - AI 自动检查剧情一致性、角色设定、伏笔回收
- 🎨 **写作风格** - 支持冷峻写实、系统爽文、诡秘悬疑等多种预设风格
- 💾 **本地存储** - 所有数据保存在本地，保护创作隐私

## 🚀 快速开始

### 下载安装

从 [Releases](https://github.com/laishouchao/novel-flow-app/releases) 页面下载对应平台的安装包：

- Windows: `.msi` 或 `.exe`
- macOS: `.dmg`
- Linux: `.AppImage` 或 `.deb`

### 配置 AI 模型

1. 打开设置页面
2. 添加 LLM 配置：
   - **Base URL**: API 地址（如 `https://api.openai.com/v1` 或 `https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions`）
   - **API Key**: 你的 API 密钥
   - **模型名称**: 如 `gpt-4`、`ark-code-latest` 等
3. 点击"测试连接"验证配置

> 💡 支持所有兼容 OpenAI API 格式的服务，包括火山引擎、DeepSeek、Azure OpenAI 等

## 📖 使用指南

### 1. 创建项目

- 点击"新建项目"
- 选择或自定义写作风格
- 设定目标字数

### 2. 灵感收束

- 进入"灵感收束"面板
- 与 AI 对话，逐步明确：
  - 核心概念与世界观
  - 主角人设
  - 核心冲突
  - 情感基调
  - 叙事视角
  - ...
- 完成后生成项目蓝图预览

### 3. 大纲规划

- 创建卷和章节
- 使用"生成大纲"让 AI 自动规划章节内容
- 手动调整章节任务说明和伏笔设置

### 4. 章节写作

- 点击章节进入写作台
- 使用 AI 助手：
  - **续写** - 根据上下文生成后续内容
  - **扩写** - 扩充当前段落细节
  - **润色** - 优化文笔表达
  - **审查** - AI 检查剧情问题
- 实时字数统计和自动保存

### 5. 审查与定稿

- AI 自动检查：
  - Canon 设定一致性
  - 角色行为是否符合人设
  - 伏笔是否正确回收
  - 剧情逻辑漏洞
- 根据审查意见修改
- 定稿后自动更新全局摘要

## 🛠️ 开发

### 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS
- **桌面端**: Tauri v1 (Rust)
- **状态管理**: 自定义 Store + localStorage 持久化
- **构建工具**: Vite

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/laishouchao/novel-flow-app.git
cd novel-flow-app

# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建生产版本
npm run tauri build
```

### 项目结构

```
novel-flow-app/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── services/           # AI Pipeline、LLM 服务
│   ├── prompts/            # AI 提示词模板
│   ├── store/              # 状态管理
│   └── types/              # TypeScript 类型定义
├── src-tauri/              # Tauri/Rust 后端
│   └── src/
│       └── main.rs         # Rust 主程序
└── scripts/                # 构建脚本
```

## 📝 更新日志

### v0.2.0 (2025-01-18)

**Bug 修复**
- 修复流式输出完成检测不可靠的问题
- 修复大纲生成结果未保存到 store 的问题
- 修复灵感收束确认时数据不完整的问题
- 修复编辑器偏好设置无法保存的问题
- 修复章节编辑时 title 被错误覆盖的问题
- 修复项目列表字数统计始终为 0 的问题
- 修复 Volume.projectId 类型不一致的问题

**功能改进**
- 编辑器偏好设置支持持久化到 localStorage
- 大纲生成后自动创建章节到 store
- 流式输出完成后自动清理显示区域

### v0.1.0 (2025-01-15)

- 初始版本发布
- 支持灵感收束、大纲管理、章节写作核心功能
- 支持 OpenAI API 格式的 LLM 接入
- 支持流式 AI 输出

## 📄 许可证

[MIT](LICENSE)

## 🤝 贡献

欢迎 Issue 和 PR！

---

Made with ❤️ for writers
