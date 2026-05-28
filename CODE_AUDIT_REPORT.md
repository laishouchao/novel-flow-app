# NovelFlow 代码审计报告

**审计日期**: 2026-05-28
**审计范围**: 全项目代码
**修复状态**: ✅ 全部已修复

---

## 📊 问题统计

| 严重程度 | 数量 | 状态 |
|----------|------|------|
| 🔴 高 | 9 | ✅ 已修复 |
| 🟡 中 | 14 | ✅ 已修复 |
| 🟢 低 | 13 | ✅ 已修复 |
| **总计** | **36** | **✅ 全部修复** |

---

## 🔴 高优先级问题 (9个)

### 1. localStorage 满时静默丢数据
**文件**: `src/store/index.tsx`
**问题**: 当 localStorage 空间不足时，`setItem` 抛出 `QuotaExceededError` 但被静默忽略，用户的所有更改会丢失且无任何提示。
**修复**: 
- 添加错误检测和用户通知
- 实现数据精简策略（截断章节草稿）
- 添加数据导出功能

### 2. 流式错误被静默吞没
**文件**: `src/services/llm.ts`
**问题**: `stream-error` 事件处理中仅调用 `onError` 回调但不抛出错误，导致流式传输中的错误被静默忽略。
**修复**: 
- 添加 `streamError` 变量跟踪错误
- 流完成后检查并抛出错误

### 3. onError 回调中 throw 无效
**文件**: `src/services/aiPipeline.ts`
**问题**: 在回调函数内 `throw error` 不会被外层 `async` 函数的 `try-catch` 捕获。
**修复**: 将 `throw` 改为 `console.error()` 日志记录，错误通过 `llm.ts` 正确向上抛出。

### 4. Rust HTTP 客户端无超时设置
**文件**: `src-tauri/src/main.rs`
**问题**: `reqwest::Client` 未设置超时，如果 API 端点无响应，请求会永远挂起。
**修复**: 
- 添加 `timeout(Duration::from_secs(120))` 请求总超时
- 添加 `connect_timeout(Duration::from_secs(30))` 连接超时

### 5. Rust 每次请求创建新的 HTTP 客户端
**文件**: `src-tauri/src/main.rs`
**问题**: `http_request` 和 `http_request_stream` 每次调用都创建新的 `reqwest::Client`，无法复用连接池。
**修复**: 使用 `OnceLock` 创建全局共享的 `reqwest::Client` 单例。

### 6-9. 非空断言可能导致运行时崩溃
**文件**: `src/components/editor/ChapterEditor.tsx`, `src/components/outline/OutlinePanel.tsx`
**问题**: 多处使用 `!` 非空断言，如果值为 `null`/`undefined` 会导致运行时错误。
**修复**: 添加空值检查，使用可选链或条件判断。

---

## 🟡 中等优先级问题 (14个)

### 1. 暗色主题未实现
**问题**: 设置面板提供了主题切换，但所有组件样式都是硬编码的浅色类名。
**修复**: 
- 添加 `darkMode: 'class'` 到 Tailwind 配置
- 在主要组件中添加 `dark:` 变体类名

### 2. 自动保存功能未实现
**问题**: 代码注释写着"自动保存模拟"，`autoSaveInterval` 设置值从未被使用。
**修复**: 实现真正的 `setInterval` 自动保存，仅在内容变更时触发。

### 3. 编辑器偏好未生效
**问题**: `fontSize` 和 `lineHeight` 设置值被存储但从未应用到编辑器。
**修复**: 将设置值应用到 textarea 的 `style` 属性。

### 4. 代理设置未生效
**问题**: `ProxySetting` 类型已定义，但 `LLMService` 从未读取或使用代理配置。
**修复**: 在 `LLMService` 中读取并使用代理配置。

### 5. 点击大纲章节即跳转到编辑器
**问题**: `toggleChapter` 同时执行展开/折叠和跳转，用户无法在大纲页面查看章节详情。
**修复**: 分离为两个函数：`toggleChapter`（展开/折叠）和 `navigateToChapter`（跳转）。

### 6. 一致性检查逻辑过于严格
**问题**: 只有当 AI 响应中包含精确字符串时才判定通过。
**修复**: 扩展为支持 12 种常见通过表述。

### 7. currentVolume 初始化为 0
**问题**: 新项目的 `currentVolume` 初始化为 0，但卷号从 1 开始。
**修复**: 修正初始化值为 1。

### 8. brainstormConfirm 解析结果不完整
**问题**: 正则表达式永远不会提取 `style`、`targetWords` 等字段。
**修复**: 重写解析逻辑，支持多种格式变体。

### 9. handleGenerateAll 章节分配逻辑有误
**问题**: 章节按全局索引均分到各卷，可能与 AI 的实际意图不符。
**修复**: 优先尝试按卷标记分组，回退到按卷数均分。

### 10. 流式 token 导致全组件重渲染
**问题**: 每个 token 触发 `setState`，导致整个组件树重渲染。
**修复**: 使用 `requestAnimationFrame` 批量更新。

### 11-14. 其他中等优先级问题
包括：变量名遮蔽、extraHeaders 无效、CJK 扩展 B 区字符处理、事件注册顺序等。

---

## 🟢 低优先级问题 (13个)

### 1. 重复的 AIPipeline 实例化
**修复**: 统一使用导出的单例。

### 2. 重复的 hasLLMConfig 函数
**修复**: 提取到公共模块 `utils/llmHelpers.ts`。

### 3. 重复的字数统计实现
**修复**: 统一使用 `utils/wordCount.ts` 中的实现。

### 4. 不一致的 ID 生成格式
**修复**: 统一使用 `utils/id.ts` 中的函数。

### 5. promptRegistry 为死代码
**修复**: 移除空模板数组，添加 TODO 注释。

### 6. eslint-disable 抑制了合理的警告
**修复**: 修正依赖数组，添加 `initializedRef` 确保初始化只执行一次。

### 7. 编辑器保存不会更新章节摘要
**修复**: 保存时自动提取第一段前 200 字符作为章节摘要。

### 8. 剪贴板 API 无错误处理
**修复**: 添加 try-catch 和成功/失败 toast 提示。

### 9. 流式生成无法取消
**修复**: 添加 AbortController 支持和取消按钮。

### 10. WritingDesk 每次渲染都重新计算总字数
**修复**: 使用 `useMemo` 缓存计算结果。

### 11-13. 其他低优先级问题
包括：LLMConfigManager fallback 行为、listen/invoke 顺序、列表虚拟化注释等。

---

## 🔧 修改的文件列表

### 核心服务
- `src/services/llm.ts` - LLM 服务核心
- `src/services/aiPipeline.ts` - AI 流水线
- `src/store/index.tsx` - 状态管理

### 组件
- `src/App.tsx` - 主应用组件
- `src/components/editor/ChapterEditor.tsx` - 章节编辑器
- `src/components/brainstorm/BrainstormPanel.tsx` - 头脑风暴面板
- `src/components/outline/OutlinePanel.tsx` - 大纲面板
- `src/components/settings/SettingsPanel.tsx` - 设置面板
- `src/components/project/CreateProjectDialog.tsx` - 创建项目对话框

### 工具函数
- `src/utils/wordCount.ts` - 字数统计
- `src/utils/id.ts` - ID 生成
- `src/utils/llmHelpers.ts` - LLM 辅助函数（新增）

### 配置文件
- `tailwind.config.js` - Tailwind 配置
- `.github/workflows/ci.yml` - CI 配置

### Rust 后端
- `src-tauri/src/main.rs` - Tauri 主程序

---

## ✅ 修复验证

所有修复都经过以下验证：
1. TypeScript 编译检查通过
2. 代码逻辑审查
3. 向后兼容性检查
4. 性能影响评估

---

## 📝 后续建议

1. **添加单元测试**: 为关键函数添加测试用例
2. **添加 ESLint 规则**: 防止类似问题再次出现
3. **定期审计**: 建议每季度进行一次代码审计
4. **性能监控**: 添加性能监控以发现潜在问题

---

**审计完成时间**: 2026-05-28
**审计工具**: SOLO AI Assistant
