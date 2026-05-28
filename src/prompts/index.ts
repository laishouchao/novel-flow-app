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
// TODO: 提示词模板注册表尚未实现，当前所有模板内容为空。
// 如需启用模板管理功能，请填充各条目的 template 字段。
const promptRegistry: PromptTemplateEntry[] = [];

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
