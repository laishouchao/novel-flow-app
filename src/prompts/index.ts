/**
 * 提示词注册中心
 *
 * 统一导出所有提示词模块，提供便捷的获取方法。
 * 所有提示词按任务阶段分组管理：
 * - brainstorm: 灵感收束
 * - outline: 章节规划
 * - draft: 章节写作
 * - review: 审查
 * - finalization: 定稿/更新
 * - styles: 风格引擎
 * - forbiddenWords: 禁用词表
 */

// ============================================================
// 子模块导出
// ============================================================

// 内部导入（用于懒加载系统提示词）
import { brainstormSystemPrompt as _brainstormSP } from './brainstorm';
import { outlineSystemPrompt as _outlineSP } from './outline';
import { draftSystemPrompt as _draftSP } from './draft';
import { reviewSystemPrompt as _reviewSP } from './review';
import { finalizationSystemPrompt as _finalizationSP } from './finalization';

// 灵感收束提示词
export {
  brainstormSystemPrompt,
  genreTonePrompt,
  coreConflictPrompt,
  protagonistArchetypePrompt,
  worldSettingPrompt,
  narrativeStructurePrompt,
  emotionalCorePrompt,
  uniqueSellingPointPrompt,
  characterRelationshipsPrompt,
  endgameVisionPrompt,
  brainstormConfirmPrompt,
  brainstormDimensions,
  getDimensionPrompt,
  fillPromptTemplate,
} from './brainstorm';

// 章节规划提示词
export {
  outlineSystemPrompt,
  volumeOutlinePrompt,
  chapterOutlineDetailPrompt,
  outlineReviewPrompt,
} from './outline';

// 章节写作提示词
export {
  draftSystemPrompt,
  firstChapterDraftPrompt,
  nextChapterDraftPrompt,
  selfCheckPrompt,
  chapterFinalCheckPrompt,
  continueWritingPrompt,
  rewritePrompt,
} from './draft';

// 审查提示词
export {
  reviewSystemPrompt,
  readerPerspectiveReviewPrompt,
  forbiddenWordsReviewPrompt,
  canonConsistencyReviewPrompt,
  narrativeQualityReviewPrompt,
  comprehensiveReviewPrompt,
} from './review';

// 定稿提示词
export {
  finalizationSystemPrompt,
  updateSummaryPrompt,
  updateCharacterStatePrompt,
  canonCheckPrompt,
  fillFinalizationTemplate,
} from './finalization';

// 风格引擎
export {
  styles,
  getStyle,
  getAvailableStyles,
  getStyleSystemPrompt,
  embedStyleRules,
} from './styles';
export type { StyleRule } from './styles';

// 禁用词表
export {
  forbiddenWordCategories,
  getEnabledForbiddenWords,
  getAllForbiddenWords,
  checkForbiddenWords,
  generateForbiddenWordsPrompt,
} from './forbiddenWords';
export type { ForbiddenWordCategory } from './forbiddenWords';

// ============================================================
// 提示词注册表
// ============================================================

/** 任务类型枚举，与 LLM 服务的 TaskType 对应 */
export type PromptTaskType =
  | 'brainstorm'
  | 'outline'
  | 'draft'
  | 'review'
  | 'finalization'
  | 'summary'
  | 'consistency'
  | 'style'
  | 'general';

/** 提示词模板条目 */
export interface PromptTemplateEntry {
  /** 模板 ID */
  id: string;
  /** 所属任务类型 */
  taskType: PromptTaskType;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 模板内容（包含 {变量} 占位符） */
  template: string;
  /** 是否为系统提示词 */
  isSystemPrompt: boolean;
}

/** 所有提示词模板注册表 */
const promptRegistry: PromptTemplateEntry[] = [
  // ---- 灵感收束 ----
  {
    id: 'brainstorm_system',
    taskType: 'brainstorm',
    name: '灵感收束系统提示词',
    description: '定义灵感收束 AI 的行为模式和回答格式',
    template: '',
    isSystemPrompt: true,
  },
  {
    id: 'brainstorm_genre_tone',
    taskType: 'brainstorm',
    name: '类型基调',
    description: '维度1：确定小说的类型、子类型和整体基调',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'brainstorm_core_conflict',
    taskType: 'brainstorm',
    name: '核心冲突',
    description: '维度2：确定故事的核心矛盾和驱动力',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'brainstorm_protagonist',
    taskType: 'brainstorm',
    name: '主角原型',
    description: '维度3：确定主角的性格、能力和成长弧线',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'brainstorm_world_setting',
    taskType: 'brainstorm',
    name: '世界观设定',
    description: '维度4：确定故事发生的世界的基本规则',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'brainstorm_narrative_structure',
    taskType: 'brainstorm',
    name: '叙事结构',
    description: '维度5：确定故事的整体叙事架构',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'brainstorm_emotional_core',
    taskType: 'brainstorm',
    name: '情感内核',
    description: '维度6：确定故事要传达的核心情感和主题',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'brainstorm_usp',
    taskType: 'brainstorm',
    name: '独特卖点',
    description: '维度7：确定故事区别于同类作品的独特之处',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'brainstorm_character_relationships',
    taskType: 'brainstorm',
    name: '角色关系网',
    description: '维度8：确定主角周围的关键角色及其关系',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'brainstorm_endgame',
    taskType: 'brainstorm',
    name: '终局愿景',
    description: '维度9：确定故事的结局走向和最终要传达的信息',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'brainstorm_confirm',
    taskType: 'brainstorm',
    name: '灵感收束确认',
    description: '整合所有维度回答，生成完整项目方案',
    template: '',
    isSystemPrompt: false,
  },

  // ---- 章节规划 ----
  {
    id: 'outline_system',
    taskType: 'outline',
    name: '大纲生成系统提示词',
    description: '定义大纲策划师的行为模式和输出格式',
    template: '',
    isSystemPrompt: true,
  },
  {
    id: 'outline_volume',
    taskType: 'outline',
    name: '整卷大纲生成',
    description: '根据项目方案生成整卷的详细章节大纲',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'outline_chapter_detail',
    taskType: 'outline',
    name: '单章大纲细化',
    description: '将单章大纲细化为可直接写作的详细蓝图',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'outline_review',
    taskType: 'outline',
    name: '大纲审查',
    description: '从多维度审查已生成的大纲',
    template: '',
    isSystemPrompt: false,
  },

  // ---- 章节写作 ----
  {
    id: 'draft_system',
    taskType: 'draft',
    name: '写作系统提示词',
    description: '定义写作 AI 的核心原则和风格要求',
    template: '',
    isSystemPrompt: true,
  },
  {
    id: 'draft_first_chapter',
    taskType: 'draft',
    name: '第一章写作',
    description: '第一章的特殊写作要求（开篇铁律、叙事任务等）',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'draft_next_chapter',
    taskType: 'draft',
    name: '后续章节写作',
    description: '后续章节的写作要求（承接、伏笔、结构标记等）',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'draft_self_check',
    taskType: 'draft',
    name: '生成期自检',
    description: '流式生成中每300-500字触发的自检提示词',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'draft_chapter_final_check',
    taskType: 'draft',
    name: '章末检查',
    description: '章节完成后的最终检查提示词',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'draft_continue',
    taskType: 'draft',
    name: '续写',
    description: '自检后继续写作的提示词',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'draft_rewrite',
    taskType: 'draft',
    name: '重写',
    description: '根据审查反馈重写部分内容的提示词',
    template: '',
    isSystemPrompt: false,
  },

  // ---- 审查 ----
  {
    id: 'review_system',
    taskType: 'review',
    name: '审查系统提示词',
    description: '定义审查编辑的审查标准和输出格式',
    template: '',
    isSystemPrompt: true,
  },
  {
    id: 'review_reader_perspective',
    taskType: 'review',
    name: '读者视角审查',
    description: '第一层：以目标读者角度审查阅读体验',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'review_forbidden_words',
    taskType: 'review',
    name: '禁用词审查',
    description: '第二层：检查禁用词和文字质量问题',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'review_canon_consistency',
    taskType: 'review',
    name: 'Canon 一致性审查',
    description: '第三层：检查与已有设定和前文内容的一致性',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'review_narrative_quality',
    taskType: 'review',
    name: '叙事质量审查',
    description: '第四层：从叙事技巧角度审查',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'review_comprehensive',
    taskType: 'review',
    name: '综合审查报告',
    description: '整合四层审查结果，生成综合审查报告',
    template: '',
    isSystemPrompt: false,
  },

  // ---- 定稿/更新 ----
  {
    id: 'finalization_system',
    taskType: 'finalization',
    name: '定稿系统提示词',
    description: '定义定稿编辑的工作原则',
    template: '',
    isSystemPrompt: true,
  },
  {
    id: 'finalization_update_summary',
    taskType: 'summary',
    name: '全局摘要更新',
    description: '基于新章节内容更新全局前文摘要',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'finalization_update_character_state',
    taskType: 'finalization',
    name: '角色状态更新',
    description: '增量更新角色运行时状态',
    template: '',
    isSystemPrompt: false,
  },
  {
    id: 'finalization_canon_check',
    taskType: 'consistency',
    name: 'Canon 一致性检查',
    description: '检查世界观、角色、时间线、空间逻辑的一致性',
    template: '',
    isSystemPrompt: false,
  },
];

// ============================================================
// 系统提示词映射
// ============================================================

/** 任务类型到系统提示词的映射 */
const systemPromptMap: Record<string, string> = {
  brainstorm: '',  // 延迟导入，避免循环依赖
  outline: '',
  draft: '',
  review: '',
  finalization: '',
  summary: '',
  consistency: '',
  style: '',
  general: '你是一位专业的AI助手，请根据用户的要求提供帮助。',
};

// 使用懒加载填充系统提示词映射
function ensureSystemPromptsLoaded(): void {
  if (systemPromptMap.brainstorm !== '') return;

  // 动态导入已通过顶部 export 完成，此处直接赋值
  // 这些模块在文件顶部已被导入，可以直接引用
  try {
    systemPromptMap.brainstorm = _brainstormSP;
    systemPromptMap.outline = _outlineSP;
    systemPromptMap.draft = _draftSP;
    systemPromptMap.review = _reviewSP;
    systemPromptMap.finalization = _finalizationSP;
    // 摘要和一致性检查复用定稿系统提示词
    systemPromptMap.summary = systemPromptMap.finalization;
    systemPromptMap.consistency = systemPromptMap.finalization;
  } catch {
    // 如果 require 不可用（ESM 环境），使用默认值
    systemPromptMap.brainstorm = '你是一位资深的小说策划编辑。';
    systemPromptMap.outline = '你是一位专业的小说大纲策划师。';
    systemPromptMap.draft = '你是一位专业的小说写手。';
    systemPromptMap.review = '你是一位严格的小说审稿编辑。';
    systemPromptMap.finalization = '你是一位专业的小说定稿编辑。';
    systemPromptMap.summary = systemPromptMap.finalization;
    systemPromptMap.consistency = systemPromptMap.finalization;
  }
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 根据任务类型返回对应的系统提示词（system prompt）
 *
 * @param taskType 任务类型
 * @returns 对应的系统提示词字符串
 */
export function getPromptForTask(taskType: string): string {
  ensureSystemPromptsLoaded();
  return systemPromptMap[taskType] ?? systemPromptMap.general;
}

/**
 * 返回所有可用的提示词模板列表
 *
 * @returns 提示词模板条目数组（不含模板内容，仅元信息）
 */
export function getAllPromptTemplates(): Array<{
  id: string;
  taskType: PromptTaskType;
  name: string;
  description: string;
  isSystemPrompt: boolean;
}> {
  return promptRegistry.map(({ id, taskType, name, description, isSystemPrompt }) => ({
    id,
    taskType,
    name,
    description,
    isSystemPrompt,
  }));
}

/**
 * 根据任务类型筛选提示词模板
 *
 * @param taskType 任务类型
 * @returns 该任务类型下的所有提示词模板
 */
export function getPromptTemplatesByTask(
  taskType: PromptTaskType,
): PromptTemplateEntry[] {
  return promptRegistry.filter((entry) => entry.taskType === taskType);
}

/**
 * 获取所有系统提示词（isSystemPrompt = true）
 *
 * @returns 所有系统提示词的映射
 */
export function getAllSystemPrompts(): Record<string, string> {
  ensureSystemPromptsLoaded();
  return { ...systemPromptMap };
}
