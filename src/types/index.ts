// ============================================================================
// Novel Flow - 完整类型定义系统
// ============================================================================
// 融合 novel-flow-one-by-one（Markdown + YAML frontmatter + 双层状态机）
// 与 AI_NovelGenerator（文件系统存储 + 雪花写作法4步骤）的设计理念
// ============================================================================

// ============================================================================
// 项目状态 - 双层状态机
// ============================================================================

/** 项目宏观状态 */
export type ProjectStatus =
  | 'idea'       // 灵感阶段
  | 'planned'    // 已规划
  | 'drafting'   // 写作中
  | 'reviewing'  // 审查中
  | 'done'       // 已完成
  | 'blocked';   // 阻塞

/** 项目微观阶段（雪花写作法步骤） */
export type ProjectStage =
  | 'brainstorm' // 灵感收束
  | 'outline'    // 章节规划
  | 'draft'      // 草稿生成
  | 'review'     // 审查
  | 'update';    // 定稿/更新

// ============================================================================
// 小说项目
// ============================================================================

/** 小说项目 - 核心数据模型 */
export interface NovelProject {
  id: string;
  name: string;
  author: string;
  genre: string;               // 题材（如：都市、科幻、悬疑）
  theme: string;               // 主题（如：人性救赎、科技伦理）
  style: NovelStyle;           // 写作风格
  targetWords: number;         // 目标字数
  chapterTargetWords: number;  // 每章目标字数，默认 2300
  status: ProjectStatus;
  stage: ProjectStage;
  currentVolume: number;
  currentChapter: number;
  blockedReason?: string;
  lastSkill?: string;
  storagePath?: string;        // 项目文件存储路径（本地文件系统）
  createdAt: string;
  updatedAt: string;

  // ---- 雪花写作法产物（参考 AI_NovelGenerator） ----
  coreSeed?: string;           // 核心种子（一句话故事）
  characterDynamics?: string;  // 角色动力学
  worldBuilding?: string;      // 世界观构建
  plotArchitecture?: string;   // 情节架构

  // ---- novel-flow 设定 ----
  premise?: string;            // 前提设定
  conflict?: string;           // 核心冲突
  openingStrategy?: string;    // 开篇策略
  nonGoals?: string;           // 非目标（明确不写什么）

  // ---- canon 变更日志 ----
  canonLog: CanonEntry[];
}

// ============================================================================
// Canon 变更条目
// ============================================================================

/** Canon 变更条目 - 记录设定变更 */
export interface CanonEntry {
  chapter: number;
  volume: number;
  change: string;
  timestamp: string;
}

// ============================================================================
// 角色
// ============================================================================

/** 角色类型 */
export type CharacterRole = 'protagonist' | 'supporting' | 'antagonist' | 'minor';

/** 角色 - 完整定义 */
export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: CharacterRole;

  // ---- 核心特质 ----
  drive: string;        // 驱动力
  fear: string;         // 恐惧
  trait: string;        // 特征
  backstory: string;    // 背景故事

  // ---- 角色弧光（参考 AI_NovelGenerator） ----
  surfaceGoal: string;    // 表面追求
  deepDesire: string;     // 深层渴望
  soulNeed: string;       // 灵魂需求
  initialArc: string;     // 初始状态
  triggerEvent: string;   // 触发事件
  transformation: string; // 蜕变节点
  finalState: string;     // 最终状态

  // ---- 运行时状态 ----
  currentState: CharacterState;
  changeLog: CharacterChange[];
}

/** 角色运行时状态 */
export interface CharacterState {
  items: string[];                          // 持有物品
  abilities: string[];                      // 能力列表
  status: string;                           // 当前状态描述
  relationships: Record<string, string>;    // 与其他角色的关系
  events: string[];                         // 经历的事件
}

/** 角色状态变更记录 */
export interface CharacterChange {
  chapter: number;
  volume: number;
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

// ============================================================================
// 角色关系
// ============================================================================

/** 关系类型 */
export type RelationType =
  | 'family'       // 家人
  | 'lover'        // 恋人
  | 'friend'       // 朋友
  | 'enemy'        // 敌人
  | 'mentor'       // 师徒
  | 'superior'     // 上下级
  | 'ally'         // 盟友
  | 'rival'        // 宿敌
  | 'colleague'    // 同门/同事
  | 'other';       // 其他

/** 角色关系 */
export interface CharacterRelation {
  id: string;
  fromCharacterId: string;
  toCharacterId: string;
  relationType: RelationType;
  label: string;            // 关系描述标签
  description?: string;     // 详细描述
  isBidirectional: boolean; // 是否双向关系
}

// ============================================================================
// 势力/阵营
// ============================================================================

/** 势力/阵营 */
export interface WorldFaction {
  id: string;
  name: string;
  description: string;
  goals: string;
  leader: string;
  territory: string;
  hostility: 'friendly' | 'neutral' | 'hostile';
}

// ============================================================================
// 伏笔与情节线
// ============================================================================

/** 伏笔 */
export interface Foreshadowing {
  id: string;
  content: string;
  type: string;                     // 伏笔类型（character/plot/worldview/item/emotion/mystery/symbol/foreshadow/callback/other）
  plantedChapter: string;           // 埋设章节
  resolvedChapter: string;          // 收束章节
  status: 'planted' | 'echoed' | 'resolved' | 'abandoned';
}

/** 情节线阶段 */
export type StorylinePhase = 'introduction' | 'development' | 'complication' | 'climax' | 'resolution';

/** 情节线 */
export interface Storyline {
  id: string;
  name: string;
  description: string;
  currentPhase: StorylinePhase;
  isMainPlot: boolean;
  progress: number;                 // 0-1 进度
}

// ============================================================================
// 卷
// ============================================================================

/** 卷 - 分卷管理 */
export interface Volume {
  id: string;
  projectId: string;
  volumeNumber: number;
  title: string;
  goal: string;              // 当前卷目标
  futureDirection: string;   // 后续方向
  createdAt: string;
}

// ============================================================================
// 章节
// ============================================================================

/** 章节结构标签 */
export type ChapterStructureTag = 'setup' | 'build' | 'climax' | 'fallout';

/** 章节状态 */
export type ChapterStatus =
  | 'pending'
  | 'drafting'
  | 'reviewing'
  | 'minor_fix'
  | 'rewrite'
  | 'done'
  | 'rejected';

/** 章节 - 完整定义 */
export interface Chapter {
  id: string;
  projectId: string;
  volumeId: string;
  chapterNumber: number;
  volumeNumber: number;
  title: string;
  task: string;                   // 任务说明
  structureTag: ChapterStructureTag;
  status: ChapterStatus;
  reviewRound: number;
  canonChanged: boolean;

  // ---- AI_NovelGenerator 目录元数据 ----
  suspenseLevel: number;         // 悬念密度 1-5
  foreshadowing: string;         // 伏笔操作
  plotTwistLevel: number;        // 认知颠覆强度 1-5

  // ---- 写作内容 ----
  draftContent: string;          // 草稿
  finalContent: string;          // 定稿
  summary: string;               // 章节摘要
  reviewNotes: string;           // 审查意见
  finalSummary: string;          // 定稿摘要
  wordCount: number;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 写作风格
// ============================================================================

/** 预设风格 */
export type PresetStyle =
  | 'cold_realism'     // 冷峻写实
  | 'system_power'     // 系统力量
  | 'bizarre_suspense' // 诡奇悬疑
  | 'custom';          // 自定义

/** 写作风格 - 完整定义 */
export interface NovelStyle {
  preset: PresetStyle;
  name: string;
  description: string;

  // ---- 风格规则 ----
  sentenceRules: string[];       // 句式规则
  descriptionRules: string[];    // 描写规则
  dialogueRules: string[];       // 对话规则
  emotionRules: string[];        // 情感表达规则
  forbiddenPatterns: string[];   // 禁止模式（正则）
  forbiddenWords: string[];      // 禁止词汇
  customRules?: string;          // 自定义补充规则
}

// ============================================================================
// LLM 配置
// ============================================================================

/** LLM 接口格式 */
export type LLMInterfaceFormat = 'openai' | 'claude' | 'ollama' | 'gemini' | 'custom';

/** LLM 配置 */
export interface LLMConfig {
  id: string;
  name: string;
  interfaceFormat: LLMInterfaceFormat;
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  proxyUrl?: string;
}

/** 分任务模型指派 */
export interface TaskModelAssignment {
  brainstorm: string;      // 灵感收束
  outline: string;         // 章节规划
  draft: string;           // 草稿生成
  review: string;          // 审查
  finalization: string;    // 定稿
  summary: string;         // 摘要生成
  [key: string]: string;   // 允许额外的任务类型
}

// ============================================================================
// 应用配置
// ============================================================================

/** 代理设置 */
export interface ProxySetting {
  enabled: boolean;
  httpProxy?: string;
  httpsProxy?: string;
}

/** 应用全局配置 */
export interface AppConfig {
  llmConfigs: LLMConfig[];
  embeddingConfig?: LLMConfig;
  taskAssignment: TaskModelAssignment;
  defaultStyle: PresetStyle;
  customStyles: NovelStyle[];
  proxySetting: ProxySetting;
  recentProjects: string[];
}

// ============================================================================
// 审查系统
// ============================================================================

/** 审查结论 */
export type ReviewVerdict =
  | 'pass'              // 通过
  | 'minor_fix'         // 小修
  | 'rewrite_required'  // 需要重写
  | 'reject';           // 拒绝

/** 审查结果 */
export interface ReviewResult {
  verdict: ReviewVerdict;
  issues: ReviewIssue[];
  suggestions: string[];
  canonConflicts: string[];
  upgradeCheck: string;
}

/** 审查问题类型 */
export type ReviewIssueType =
  | 'forbidden_word'     // 禁用词
  | 'ai_pattern'         // AI 痕迹
  | 'layout'             // 排版问题
  | 'canon'              // 设定冲突
  | 'upgrade'            // 升级检查
  | 'repetition';        // 重复问题

/** 审查问题严重程度 */
export type ReviewIssueSeverity = 'error' | 'warning' | 'info';

/** 审查问题条目 */
export interface ReviewIssue {
  type: ReviewIssueType;
  content: string;
  position?: number;
  severity: ReviewIssueSeverity;
}

// ============================================================================
// 灵感收束对话
// ============================================================================

/** 灵感收束维度 */
export type BrainstormDimension =
  | 'inspiration'    // 灵感采集
  | 'genre'          // 题材与气质
  | 'theme'          // 主题
  | 'protagonist'    // 主角与关系网
  | 'worldview'      // 世界观
  | 'conflict'       // 冲突与驱动力
  | 'opening'        // 开篇策略
  | 'style'          // 写作风格
  | 'word_count'     // 字数规划
  | 'non_goals'      // 非目标
  | 'confirm';       // 组装确认

/** 灵感收束对话消息 */
export interface BrainstormMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  dimension: BrainstormDimension;
  confirmed: boolean;
  timestamp: string;
}

// ============================================================================
// 全局摘要
// ============================================================================

/** 全局摘要 - 用于上下文压缩 */
export interface GlobalSummary {
  projectId: string;
  content: string;
  lastUpdatedChapter: number;
  updatedAt: string;
}

// ============================================================================
// 流式生成事件
// ============================================================================

/** 流式事件类型 */
export type StreamEventType = 'token' | 'done' | 'error' | 'status';

/** 流式生成事件 */
export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  error?: string;
  status?: string;
}

// ============================================================================
// 编辑器相关
// ============================================================================

/** 编辑器视图模式 */
export type EditorViewMode = 'edit' | 'preview' | 'split';

/** 侧边栏面板 */
export type SidebarPanel =
  | 'chapters'
  | 'characters'
  | 'canon'
  | 'outline'
  | 'settings';

/** 应用全局视图 */
export type AppView =
  | 'home'              // 项目首页
  | 'brainstorm'        // 灵感收束
  | 'editor'            // 编辑器
  | 'review'            // 审查
  | 'settings';         // 设置

// ============================================================================
// 文件系统存储（参考 AI_NovelGenerator）
// ============================================================================

/** 项目文件结构描述 */
export interface ProjectFileStructure {
  root: string;
  architectureFile: string;    // 架构 txt
  directoryFile: string;       // 目录 txt
  summaryFile: string;         // 摘要 txt
  characterStateFile: string;  // 角色状态 txt
  chaptersDir: string;         // 章节目录
  canonDir: string;            // canon 日志目录
}

// ============================================================================
// 雪花写作法步骤
// ============================================================================

/** 雪花写作法步骤定义 */
export type SnowflakeStep =
  | 'core_seed'           // 核心种子（一句话故事）
  | 'character_dynamics'  // 角色动力学
  | 'world_building'      // 世界观构建
  | 'plot_architecture';  // 情节架构

/** 雪花写作法步骤进度 */
export interface SnowflakeProgress {
  step: SnowflakeStep;
  completed: boolean;
  output?: string;
  startedAt?: string;
  completedAt?: string;
}

// ============================================================================
// 导航与路由
// ============================================================================

/** 路由参数 */
export interface RouteParams {
  projectId?: string;
  volumeId?: string;
  chapterId?: string;
  view?: AppView;
}

// ============================================================================
// 通知与对话框
// ============================================================================

/** 通知类型 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/** 通知消息 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;       // 持续时间（毫秒），0 表示不自动关闭
  createdAt: string;
}

/** 对话框类型 */
export type DialogType =
  | 'confirm_delete'
  | 'confirm_unblock'
  | 'llm_config'
  | 'style_editor'
  | 'export'
  | 'import'
  | 'about'
  | 'create_project';

/** 对话框状态 */
export interface DialogState {
  type: DialogType | null;
  open: boolean;
  data?: Record<string, string | number | boolean>;
}
