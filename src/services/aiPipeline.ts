/**
 * AI 写作流水线
 *
 * 整合所有提示词模块和 LLM 服务，提供高层方法。
 * 每个方法负责一个完整的 AI 任务流程：
 * 1. 从参数获取上下文
 * 2. 组装 prompt（填充模板变量）
 * 3. 调用 llmService.chat 或 chatStream
 * 4. 返回结构化结果
 *
 * 依赖：
 * - llmService: LLM 调用服务
 * - prompts: 所有提示词模块
 * - types: 类型定义
 */

import { llmService, type ChatMessage } from './llm';
import type {
  NovelProject,
  Character,
  Chapter,
  Volume,
  BrainstormMessage,
  ReviewResult,
  ReviewVerdict,
  ReviewIssue,
  CharacterState,
  CanonEntry,
  GlobalSummary,
} from '../types';

// ============================================================
// 提示词导入
// ============================================================

import {
  brainstormSystemPrompt,
  getDimensionPrompt,
  fillPromptTemplate,
  brainstormConfirmPrompt,
} from '../prompts/brainstorm';

import {
  outlineSystemPrompt,
  volumeOutlinePrompt,
} from '../prompts/outline';

import {
  draftSystemPrompt,
  firstChapterDraftPrompt,
  nextChapterDraftPrompt,
} from '../prompts/draft';

import {
  reviewSystemPrompt,
  comprehensiveReviewPrompt,
} from '../prompts/review';

import {
  finalizationSystemPrompt,
  updateSummaryPrompt,
  updateCharacterStatePrompt,
  canonCheckPrompt,
  fillFinalizationTemplate,
} from '../prompts/finalization';

import {
  getStyleSystemPrompt,
} from '../prompts/styles';

import {
  generateForbiddenWordsPrompt,
} from '../prompts/forbiddenWords';

import {
  getPromptForTask,
} from '../prompts';

// ============================================================
// 辅助类型
// ============================================================

/** 大纲生成结果 */
export interface OutlineResult {
  /** 生成的卷大纲内容（Markdown） */
  content: string;
  /** 使用的模型 */
  model: string;
  /** token 消耗 */
  totalTokens: number;
}

/** 审查结果（流水线层） */
export interface PipelineReviewResult extends ReviewResult {
  /** 使用的模型 */
  model: string;
  /** token 消耗 */
  totalTokens: number;
}

/** 设定同步结果 */
export interface UpdateResult {
  /** 更新后的全局摘要 */
  globalSummary: string;
  /** 角色状态更新列表 */
  characterUpdates: Array<{
    characterId: string;
    characterName: string;
    changes: string;
    newState: CharacterState;
  }>;
  /** Canon 变更条目 */
  canonEntries: CanonEntry[];
  /** 一致性检查结果 */
  consistencyResult: ConsistencyResult;
  /** 使用的模型 */
  model: string;
  /** token 消耗 */
  totalTokens: number;
}

/** 一致性检查结果 */
export interface ConsistencyResult {
  /** 是否通过 */
  passed: boolean;
  /** 严重问题列表 */
  severeIssues: string[];
  /** 一般问题列表 */
  minorIssues: string[];
  /** Canon 变更建议 */
  canonChangeSuggestions: Array<{
    changeType: string;
    content: string;
    impact: string;
    action: string;
  }>;
  /** 总分 */
  score: number;
  /** 完整的检查报告 */
  report: string;
  /** 使用的模型 */
  model: string;
  /** token 消耗 */
  totalTokens: number;
}

/** 流式回调类型 */
export type StreamCallback = (token: string) => void;

// ============================================================
// AI 写作流水线
// ============================================================

export class AIPipeline {
  private llm = llmService;

  // ============================================================
  // 1. 灵感收束：生成下一个问题
  // ============================================================

  /**
   * 灵感收束：根据当前维度和历史对话，生成下一个问题（流式版本）
   *
   * 核心改进：将完整对话历史作为 ChatMessage[] 传递给 LLM，
   * 而不是仅依赖上下文摘要字符串。这样 AI 能看到用户实际输入的内容。
   *
   * @param dimension 当前维度 ID（如 'genreTone', 'coreConflict' 等）
   * @param history 之前的对话历史
   * @param onToken 流式回调，每收到一个 token 片段就调用
   * @param projectInfo 已有的项目信息（如已确认的类型、设定等）
   * @returns AI 生成的下一个问题（含选项）
   */
  async brainstormNextQuestionStream(
    dimension: string,
    history: BrainstormMessage[],
    onToken: (token: string) => void,
    projectInfo?: Partial<NovelProject>,
  ): Promise<string> {
    // 获取对应维度的提示词模板
    const dimensionPrompt = getDimensionPrompt(dimension);
    if (!dimensionPrompt) {
      throw new Error(`未找到维度 "${dimension}" 对应的提示词模板`);
    }

    // 构建上下文摘要：从历史对话中提取已确认的信息
    const previousContext = this.buildBrainstormContext(history, projectInfo);

    // 填充模板变量
    const userPrompt = fillPromptTemplate(dimensionPrompt, {
      previousContext,
      genre: projectInfo?.genre ?? '待定',
      conflict: projectInfo?.conflict ?? '待定',
      protagonist: projectInfo?.coreSeed ?? '待定',
      worldSetting: projectInfo?.worldBuilding ?? '待定',
    });

    // 组装消息：system + 完整对话历史 + 当前维度提示词
    const messages: ChatMessage[] = [
      { role: 'system', content: brainstormSystemPrompt },
    ];

    // 将历史对话注入为 chat 消息，让 AI 看到用户实际输入的内容
    // 跳过第一条欢迎消息（assistant 的初始化消息）
    const historyMessages = this.buildChatHistoryFromBrainstorm(history);
    messages.push(...historyMessages);

    // 当前维度的提问作为最后一条 user 消息
    messages.push({ role: 'user', content: userPrompt });

    // 调用 LLM 流式接口
    let fullContent = '';
    await this.llm.chatStream(
      messages,
      {
        onToken: (token) => {
          fullContent += token;
          onToken(token);
        },
        onComplete: (content) => {
          fullContent = content;
        },
        onError: (error) => {
          console.error('[AIPipeline] 头脑风暴流式错误:', error);
        },
      },
      undefined,
      'brainstorm'
    );

    return fullContent;
  }

  /**
   * 灵感收束：根据当前维度和历史对话，生成下一个问题（非流式版本，兼容旧代码）
   *
   * @param dimension 当前维度 ID（如 'genreTone', 'coreConflict' 等）
   * @param history 之前的对话历史
   * @param projectInfo 已有的项目信息（如已确认的类型、设定等）
   * @returns AI 生成的下一个问题（含选项）
   */
  async brainstormNextQuestion(
    dimension: string,
    history: BrainstormMessage[],
    projectInfo?: Partial<NovelProject>,
  ): Promise<string> {
    // 获取对应维度的提示词模板
    const dimensionPrompt = getDimensionPrompt(dimension);
    if (!dimensionPrompt) {
      throw new Error(`未找到维度 "${dimension}" 对应的提示词模板`);
    }

    // 构建上下文摘要：从历史对话中提取已确认的信息
    const previousContext = this.buildBrainstormContext(history, projectInfo);

    // 填充模板变量
    const userPrompt = fillPromptTemplate(dimensionPrompt, {
      previousContext,
      genre: projectInfo?.genre ?? '待定',
      conflict: projectInfo?.conflict ?? '待定',
      protagonist: projectInfo?.coreSeed ?? '待定',
      worldSetting: projectInfo?.worldBuilding ?? '待定',
    });

    // 组装消息：system + 完整对话历史 + 当前维度提示词
    const messages: ChatMessage[] = [
      { role: 'system', content: brainstormSystemPrompt },
    ];

    const historyMessages = this.buildChatHistoryFromBrainstorm(history);
    messages.push(...historyMessages);
    messages.push({ role: 'user', content: userPrompt });

    // 调用 LLM
    const response = await this.llm.chat(messages, undefined, 'brainstorm');
    return response.content;
  }

  // ============================================================
  // 2. 灵感收束：确认并生成项目设定
  // ============================================================

  /**
   * 灵感收束完成后的确认步骤，将所有维度回答整合为完整的项目设定
   *
   * @param history 完整的灵感收束对话历史
   * @returns 生成的项目设定（Partial<NovelProject>）
   */
  async brainstormConfirm(history: BrainstormMessage[]): Promise<Partial<NovelProject>> {
    // 构建所有回答的汇总
    const allAnswers = history
      .map((msg) => {
        const roleLabel = msg.role === 'user' ? '用户' : 'AI';
        return `### ${roleLabel}（${msg.dimension}）\n${msg.content}`;
      })
      .join('\n\n---\n\n');

    // 填充确认提示词模板
    const userPrompt = fillPromptTemplate(brainstormConfirmPrompt, {
      allAnswers,
      title: '待命名',
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: brainstormSystemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.llm.chat(messages, undefined, 'brainstorm');

    // 尝试从生成的 Markdown 中提取结构化数据
    return this.parseProjectFromMarkdown(response.content);
  }

  // ============================================================
  // 3. 章节规划：生成大纲
  // ============================================================

  /**
   * 根据项目设定、角色和卷信息，生成卷大纲（流式版本）
   *
   * @param project 小说项目
   * @param characters 角色列表
   * @param volumes 卷列表
   * @param onStream 流式回调函数
   * @returns 大纲生成结果
   */
  async generateOutlineStream(
    project: NovelProject,
    characters: Character[],
    volumes: Volume[],
    onStream?: StreamCallback,
  ): Promise<OutlineResult> {
    // 构建项目方案文本
    const projectContent = this.buildProjectContent(project);
    const characterContent = this.buildCharacterContent(characters);

    // 获取当前卷信息
    const currentVolume = volumes.find((v) => v.volumeNumber === project.currentVolume);
    const volumeNumber = currentVolume?.volumeNumber ?? 1;
    const totalVolumes = volumes.length || 1;
    const volumeGoal = currentVolume?.goal ?? '推进主线剧情';
    const chapterCount = 10; // 默认每卷10章

    // 构建前情概要
    const previousSummary = this.buildPreviousSummary(project, volumes);

    // 填充模板
    const userPrompt = fillPromptTemplate(volumeOutlinePrompt, {
      volumeNumber: String(volumeNumber),
      projectContent,
      characterContent,
      previousSummary,
      totalVolumes: String(totalVolumes),
      volumeGoal,
      chapterCount: String(chapterCount),
      volumeTitle: currentVolume?.title ?? `第${volumeNumber}卷`,
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: outlineSystemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 如果有流式回调，使用流式接口
    if (onStream) {
      let fullContent = '';
      await this.llm.chatStream(
        messages,
        {
          onToken: (token) => {
            fullContent += token;
            onStream(token);
          },
          onComplete: (content) => {
            fullContent = content;
          },
          onError: (error) => {
            console.error('[AIPipeline] 大纲生成流式错误:', error);
          },
        },
        undefined,
        'outline',
      );
      return {
        content: fullContent,
        model: 'streaming',
        totalTokens: 0,
      };
    }

    // 非流式版本
    const response = await this.llm.chat(messages, undefined, 'outline');
    return {
      content: response.content,
      model: response.model,
      totalTokens: response.totalTokens,
    };
  }

  /**
   * 根据项目设定、角色和卷信息，生成卷大纲（非流式版本，兼容旧代码）
   *
   * @param project 小说项目
   * @param characters 角色列表
   * @param volumes 卷列表
   * @returns 大纲生成结果
   */
  async generateOutline(
    project: NovelProject,
    characters: Character[],
    volumes: Volume[],
  ): Promise<OutlineResult> {
    return this.generateOutlineStream(project, characters, volumes);
  }

  // ============================================================
  // 4. 章节写作：生成草稿（流式）
  // ============================================================

  /**
   * 根据章节信息生成草稿，支持流式输出
   *
   * @param chapter 当前章节
   * @param context 上下文信息
   * @param onStream 流式回调函数
   * @returns 完整的草稿内容
   */
  async generateChapterDraft(
    chapter: Chapter,
    context: {
      project: NovelProject;
      characters: Character[];
      globalSummary: GlobalSummary | null;
      previousChapter: Chapter | null;
      foreshadowingList?: string;
      knowledgeBase?: string;
    },
    onStream?: StreamCallback,
  ): Promise<string> {
    const { project, characters, globalSummary, previousChapter } = context;

    // 获取风格提示词
    const stylePrompt = getStyleSystemPrompt(project.style.preset);

    // 获取禁用词提示词
    const forbiddenWordsPrompt = generateForbiddenWordsPrompt();

    // 构建角色信息
    const characterInfo = this.buildCharacterContent(characters);
    const characterStates = this.buildCharacterStatesContent(characters);

    // 构建前章信息
    const previousChapterSummary = previousChapter?.summary ?? '';
    const previousChapterEnding = previousChapter
      ? previousChapter.draftContent.slice(-500)
      : '';

    // 选择提示词模板
    const isFirstChapter = chapter.chapterNumber === 1;
    const draftTemplate = isFirstChapter ? firstChapterDraftPrompt : nextChapterDraftPrompt;

    // 填充模板变量
    const variables: Record<string, string> = {
      stylePrompt,
      forbiddenWordsPrompt,
      title: project.name,
      genre: project.genre,
      tone: project.style.description,
      worldSetting: project.worldBuilding ?? '',
      characterInfo,
      characterStates,
      chapterOutline: chapter.task,
      globalSummary: globalSummary?.content ?? '',
      previousChapterSummary,
      previousChapterEnding,
      foreshadowingList: context.foreshadowingList ?? '暂无',
      knowledgeBase: context.knowledgeBase ?? '',
      targetWordCount: String(project.chapterTargetWords),
      chapterNumber: String(chapter.chapterNumber),
    };

    const userPrompt = fillPromptTemplate(draftTemplate, variables);

    const messages: ChatMessage[] = [
      { role: 'system', content: draftSystemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 流式或非流式调用
    if (onStream) {
      const fullContent = await this.llm.chatStream(
        messages,
        {
          onToken: onStream,
          onError: (error) => {
            console.error('[AIPipeline] 章节写作流式错误:', error);
          },
        },
        undefined,
        'draft',
      );
      return fullContent;
    } else {
      const response = await this.llm.chat(messages, undefined, 'draft');
      return response.content;
    }
  }

  // ============================================================
  // 5. 章节审查
  // ============================================================

  /**
   * 对章节进行综合审查（流式版本）
   *
   * @param chapter 待审查的章节
   * @param context 上下文信息
   * @param onStream 流式回调函数
   * @returns 审查结果
   */
  async reviewChapterStream(
    chapter: Chapter,
    context: {
      project: NovelProject;
      characters: Character[];
      globalSummary: GlobalSummary | null;
      previousChapter: Chapter | null;
      canonLog: CanonEntry[];
    },
    onStream?: StreamCallback,
  ): Promise<PipelineReviewResult> {
    const { project, characters, previousChapter, canonLog } = context;

    // 构建审查所需的上下文
    const canonContent = this.buildCanonContent(project, canonLog);
    const characterSettings = this.buildCharacterContent(characters);
    const previousSummaries = previousChapter?.summary ?? '';

    // 构建综合审查的用户提示词
    const userPrompt = fillPromptTemplate(comprehensiveReviewPrompt, {
      chapterNumber: String(chapter.chapterNumber),
      readerReview: '（将在子审查中生成）',
      forbiddenWordsReview: '（将在子审查中生成）',
      canonReview: `Canon设定：${canonContent}\n角色设定：${characterSettings}\n前文摘要：${previousSummaries}`,
      narrativeReview: `结构标记：${chapter.structureTag}\n大纲：${chapter.task}\n前章摘要：${previousSummaries}`,
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: reviewSystemPrompt },
      { role: 'user', content: `请审查以下章节内容：\n\n${chapter.draftContent}\n\n${userPrompt}` },
    ];

    // 如果有流式回调，使用流式接口
    if (onStream) {
      let fullContent = '';
      await this.llm.chatStream(
        messages,
        {
          onToken: (token) => {
            fullContent += token;
            onStream(token);
          },
          onComplete: (content) => {
            fullContent = content;
          },
          onError: (error) => {
            console.error('[AIPipeline] 章节审查流式错误:', error);
          },
        },
        undefined,
        'review',
      );

      // 解析审查结果
      const parsedResult = this.parseReviewResult(fullContent, chapter.chapterNumber);

      return {
        ...parsedResult,
        model: 'streaming',
        totalTokens: 0,
      };
    }

    // 非流式版本
    const response = await this.llm.chat(messages, undefined, 'review');

    // 解析审查结果
    const parsedResult = this.parseReviewResult(response.content, chapter.chapterNumber);

    return {
      ...parsedResult,
      model: response.model,
      totalTokens: response.totalTokens,
    };
  }

  /**
   * 对章节进行综合审查（非流式版本，兼容旧代码）
   *
   * @param chapter 待审查的章节
   * @param context 上下文信息
   * @returns 审查结果
   */
  async reviewChapter(
    chapter: Chapter,
    context: {
      project: NovelProject;
      characters: Character[];
      globalSummary: GlobalSummary | null;
      previousChapter: Chapter | null;
      canonLog: CanonEntry[];
    },
  ): Promise<PipelineReviewResult> {
    return this.reviewChapterStream(chapter, context);
  }

  // ============================================================
  // 6. 设定同步
  // ============================================================

  /**
   * 章节定稿后，同步更新项目设定（全局摘要 + 角色状态 + Canon 日志）
   *
   * @param project 小说项目
   * @param chapter 已定稿的章节
   * @param context 上下文信息
   * @returns 设定同步结果
   */
  async updateProjectState(
    project: NovelProject,
    chapter: Chapter,
    context: {
      characters: Character[];
      globalSummary: GlobalSummary | null;
      canonLog: CanonEntry[];
    },
  ): Promise<UpdateResult> {
    const { characters, globalSummary, canonLog } = context;

    // 1. 更新全局摘要
    const newSummary = await this.generateGlobalSummary(
      project,
      [chapter],
      globalSummary?.content ?? '',
    );

    // 2. 更新角色状态
    const characterUpdates: UpdateResult['characterUpdates'] = [];
    for (const character of characters) {
      const updateResult = await this.updateSingleCharacterState(
        character,
        chapter,
      );
      if (updateResult) {
        characterUpdates.push(updateResult);
      }
    }

    // 3. Canon 一致性检查
    const consistencyResult = await this.consistencyCheck(project, [chapter], {
      characters,
      canonLog,
    });

    // 4. 提取 Canon 变更建议
    const canonEntries: CanonEntry[] = consistencyResult.canonChangeSuggestions.map(
      (suggestion) => ({
        chapter: chapter.chapterNumber,
        volume: chapter.volumeNumber,
        change: `[${suggestion.changeType}] ${suggestion.content}`,
        timestamp: new Date().toISOString(),
      }),
    );

    return {
      globalSummary: newSummary,
      characterUpdates,
      canonEntries,
      consistencyResult,
      model: consistencyResult.model,
      totalTokens: consistencyResult.totalTokens,
    };
  }

  // ============================================================
  // 7. 章节摘要生成
  // ============================================================

  /**
   * 为单个章节生成摘要
   *
   * @param chapter 当前章节
   * @param prevChapters 前面章节的摘要列表（用于上下文）
   * @returns 章节摘要
   */
  async generateChapterSummary(
    chapter: Chapter,
    prevChapters: Chapter[],
  ): Promise<string> {
    const prevSummaries = prevChapters
      .filter((c) => c.summary)
      .map((c) => `第${c.chapterNumber}章：${c.summary}`)
      .join('\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: getPromptForTask('summary'),
      },
      {
        role: 'user',
        content: `请为以下章节生成摘要（200-300字）。

## 前文摘要
${prevSummaries || '（本章为第一章，无前文摘要）'}

## 本章内容（第${chapter.chapterNumber}章：${chapter.title}）
${chapter.draftContent}

## 摘要要求
1. 概括本章的主要剧情事件
2. 记录角色的关键状态变化
3. 标注本章埋设或照应的伏笔
4. 记录章末悬念/钩子
5. 控制在200-300字以内

请直接输出摘要，不要输出解释。`,
      },
    ];

    const response = await this.llm.chat(messages, undefined, 'summary');
    return response.content;
  }

  // ============================================================
  // 8. 全局摘要更新
  // ============================================================

  /**
   * 基于新章节更新全局摘要
   *
   * @param project 小说项目
   * @param newChapters 新完成的章节列表
   * @param previousSummary 当前的全局摘要
   * @returns 更新后的全局摘要
   */
  async generateGlobalSummary(
    _project: NovelProject,
    newChapters: Chapter[],
    previousSummary: string,
  ): Promise<string> {
    if (newChapters.length === 0) {
      return previousSummary;
    }

    // 取最后一个新章节作为更新依据
    const latestChapter = newChapters[newChapters.length - 1];

    const userPrompt = fillFinalizationTemplate(updateSummaryPrompt, {
      previousSummary: previousSummary || '（暂无摘要，这是第一章）',
      newChapterContent: latestChapter.draftContent,
      chapterNumber: String(latestChapter.chapterNumber),
      chapterTitle: latestChapter.title,
      maxWords: '2000',
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: finalizationSystemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.llm.chat(messages, undefined, 'summary');
    return response.content;
  }

  // ============================================================
  // 9. 一致性检查
  // ============================================================

  /**
   * 对章节进行 Canon 一致性检查
   *
   * @param project 小说项目
   * @param chapters 待检查的章节列表
   * @param context 上下文信息
   * @returns 一致性检查结果
   */
  async consistencyCheck(
    project: NovelProject,
    chapters: Chapter[],
    context: {
      characters: Character[];
      canonLog: CanonEntry[];
    },
  ): Promise<ConsistencyResult> {
    const { characters, canonLog } = context;

    // 合并所有待检查章节的内容
    const chapterContents = chapters
      .map((c) => `【第${c.chapterNumber}章：${c.title}】\n${c.draftContent}`)
      .join('\n\n---\n\n');

    // 构建 Canon 日志文本
    const canonLogText = canonLog.length > 0
      ? canonLog
          .map((entry) => `第${entry.chapter}章（第${entry.volume}卷）：${entry.change}`)
          .join('\n')
      : '（暂无 Canon 变更记录）';

    // 填充模板
    const userPrompt = fillFinalizationTemplate(canonCheckPrompt, {
      worldSetting: project.worldBuilding ?? '（暂无世界观设定）',
      characterSettings: this.buildCharacterContent(characters),
      canonLog: canonLogText,
      newChapterContent: chapterContents,
      chapterNumber: chapters.length === 1
        ? String(chapters[0].chapterNumber)
        : chapters.map((c) => c.chapterNumber).join(', '),
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: finalizationSystemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.llm.chat(messages, undefined, 'general');

    // 解析一致性检查结果
    return this.parseConsistencyResult(response.content);
  }

  // ============================================================
  // 内部辅助方法
  // ============================================================

  /**
   * 将 BrainstormMessage[] 转换为 ChatMessage[] 供 LLM 使用
   * 跳过第一条欢迎消息，将后续消息按 user/assistant 角色传递
   */
  private buildChatHistoryFromBrainstorm(history: BrainstormMessage[]): ChatMessage[] {
    if (history.length === 0) return [];

    const chatMessages: ChatMessage[] = [];
    for (let i = 0; i < history.length; i++) {
      const msg = history[i];

      // 跳过第一条 assistant 欢迎消息（通常是初始化的引导语）
      if (i === 0 && msg.role === 'assistant') continue;

      chatMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    return chatMessages;
  }

  /**
   * 构建灵感收束的上下文摘要
   * 作为 {previousContext} 变量填入提示词模板
   *
   * 修复：使用所有历史消息（不再过滤 confirmed），确保 AI 能看到用户之前的输入
   */
  private buildBrainstormContext(
    history: BrainstormMessage[],
    projectInfo?: Partial<NovelProject>,
  ): string {
    // 使用所有历史消息，不再依赖 confirmed 标记
    const allMessages = history.filter((msg) => !(history[0] === msg && msg.role === 'assistant'));
    if (allMessages.length === 0 && !projectInfo) {
      return '这是我们的第一次对话，请根据用户接下来的描述来构思。';
    }

    const parts: string[] = [];

    if (projectInfo) {
      if (projectInfo.genre) parts.push(`已确认类型：${projectInfo.genre}`);
      if (projectInfo.theme) parts.push(`已确认主题：${projectInfo.theme}`);
      if (projectInfo.coreSeed) parts.push(`核心概念：${projectInfo.coreSeed}`);
      if (projectInfo.worldBuilding) parts.push(`世界观：${projectInfo.worldBuilding}`);
    }

    if (allMessages.length > 0) {
      parts.push('\n用户在之前的对话中的关键选择：');
      for (const msg of allMessages) {
        if (msg.role === 'user') {
          parts.push(`- 用户输入：${msg.content.slice(0, 300)}`);
        } else if (msg.role === 'assistant') {
          // 只提取选项摘要，不复制全部 AI 回复（避免 token 浪费）
          const optionMatch = msg.content.match(/^([A-E])[.．、]\s*(.+)$/gm);
          if (optionMatch) {
            parts.push(`- AI 选项：${optionMatch.slice(0, 4).join(' | ')}`);
          }
        }
      }
    }

    return parts.join('\n') || '请根据用户接下来的描述来构思。';
  }

  /**
   * 从 Markdown 中解析项目设定
   */
  private parseProjectFromMarkdown(markdown: string): Partial<NovelProject> {
    const result: Partial<NovelProject> = {};

    // 提取书名 - 支持多种格式：# 《书名》、# 书名、**书名**、书名：xxx
    const titlePatterns = [
      /#\s*《(.+?)》/,
      /#\s+书名[：:]\s*(.+)/,
      /#\s+(.+?)(?:\n|$)/,
      /书名[：:]\s*(.+)/,
    ];
    for (const pattern of titlePatterns) {
      const match = markdown.match(pattern);
      if (match) {
        result.name = match[1].trim().replace(/\*+/g, '');
        break;
      }
    }

    // 提取类型 - 支持"类型"、"题材"、"小说类型"
    const genreMatch = markdown.match(/(?:类型|题材|小说类型)[：:]\s*(.+)/);
    if (genreMatch) {
      result.genre = genreMatch[1].trim();
    }

    // 提取主题
    const themeMatch = markdown.match(/主题[：:]\s*(.+)/);
    if (themeMatch) {
      result.theme = themeMatch[1].trim();
    }

    // 提取核心种子（一句话故事/核心概念/故事梗概）- 限制长度
    const loglinePatterns = [
      /(?:一句话故事|核心概念|故事梗概|Logline)[：:]?\s*\n\n?(.+?)(?=\n\n|\n#|\n##|$)/s,
      /(?:一句话故事|核心概念|故事梗概)[：:]\s*(.+)/,
    ];
    for (const pattern of loglinePatterns) {
      const match = markdown.match(pattern);
      if (match) {
        const text = match[1].trim();
        // 取第一段作为核心种子（避免太长）
        const firstPara = text.split(/\n\n/)[0].trim();
        result.coreSeed = firstPara.slice(0, 500);
        break;
      }
    }

    // 提取世界观 - 支持多种标题格式
    const worldPatterns = [
      /###?\s*(?:世界观|世界设定|背景设定)\s*\n\n?(.+?)(?=\n###|\n##|$)/s,
      /(?:世界观|世界设定|背景设定)[：:]\s*\n\n?(.+?)(?=\n\n\n|\n#|$)/s,
    ];
    for (const pattern of worldPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        result.worldBuilding = match[1].trim();
        break;
      }
    }

    // 提取核心冲突
    const conflictPatterns = [
      /###?\s*(?:核心冲突|主要矛盾|冲突)\s*\n\n?(.+?)(?=\n###|\n##|$)/s,
      /(?:核心冲突|主要矛盾)[：:]\s*(.+?)(?=\n\n|\n#|$)/s,
    ];
    for (const pattern of conflictPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        result.conflict = match[1].trim();
        break;
      }
    }

    // 提取前提设定
    const premisePatterns = [
      /###?\s*(?:前提设定|故事前提|前提)\s*\n\n?(.+?)(?=\n###|\n##|$)/s,
      /(?:前提设定|故事前提)[：:]\s*(.+?)(?=\n\n|\n#|$)/s,
    ];
    for (const pattern of premisePatterns) {
      const match = markdown.match(pattern);
      if (match) {
        result.premise = match[1].trim();
        break;
      }
    }

    // 提取角色动力学 - 支持"角色设定"、"角色"、"人物设定"
    const charPatterns = [
      /##\s*(?:角色设定|角色|人物设定|角色动力学)\s*\n\n?([\s\S]+?)(?=\n##\s*(?:叙事|情节|开篇|主题)|$)/s,
      /(?:角色动力学|角色设定)[：:]\s*\n\n?([\s\S]+?)(?=\n\n\n#|$)/s,
    ];
    for (const pattern of charPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        result.characterDynamics = match[1].trim();
        break;
      }
    }

    // 提取情节架构 - 支持"叙事结构"、"情节架构"、"情节结构"
    const plotPatterns = [
      /##\s*(?:叙事结构|情节架构|情节结构|故事结构)\s*\n\n?(.+?)(?=\n##|$)/s,
      /(?:情节架构|叙事结构)[：:]\s*(.+?)(?=\n\n\n#|$)/s,
    ];
    for (const pattern of plotPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        result.plotArchitecture = match[1].trim();
        break;
      }
    }

    // 提取开篇策略
    const openingPatterns = [
      /###?\s*(?:开篇策略|开篇|开头策略|开场)\s*\n\n?(.+?)(?=\n###|\n##|$)/s,
      /(?:开篇策略|开篇)[：:]\s*(.+?)(?=\n\n|\n#|$)/s,
    ];
    for (const pattern of openingPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        result.openingStrategy = match[1].trim();
        break;
      }
    }

    // 提取非目标
    const nonGoalsPatterns = [
      /###?\s*(?:非目标|不写什么|明确不写|排除项)\s*\n\n?(.+?)(?=\n###|\n##|$)/s,
      /(?:非目标|明确不写)[：:]\s*(.+?)(?=\n\n|\n#|$)/s,
    ];
    for (const pattern of nonGoalsPatterns) {
      const match = markdown.match(pattern);
      if (match) {
        result.nonGoals = match[1].trim();
        break;
      }
    }

    return result;
  }

  /**
   * 构建项目方案文本
   */
  private buildProjectContent(project: NovelProject): string {
    const parts: string[] = [];
    parts.push(`# 《${project.name}》项目方案\n`);
    parts.push(`- 类型：${project.genre}`);
    parts.push(`- 主题：${project.theme}`);
    parts.push(`- 目标字数：${project.targetWords}字`);
    parts.push(`- 每章目标：${project.chapterTargetWords}字`);

    if (project.coreSeed) {
      parts.push(`\n## 一句话故事\n${project.coreSeed}`);
    }
    if (project.premise) {
      parts.push(`\n## 前提设定\n${project.premise}`);
    }
    if (project.conflict) {
      parts.push(`\n## 核心冲突\n${project.conflict}`);
    }
    if (project.worldBuilding) {
      parts.push(`\n## 世界观\n${project.worldBuilding}`);
    }
    if (project.characterDynamics) {
      parts.push(`\n## 角色动力学\n${project.characterDynamics}`);
    }
    if (project.plotArchitecture) {
      parts.push(`\n## 情节架构\n${project.plotArchitecture}`);
    }
    if (project.openingStrategy) {
      parts.push(`\n## 开篇策略\n${project.openingStrategy}`);
    }
    if (project.nonGoals) {
      parts.push(`\n## 非目标\n${project.nonGoals}`);
    }

    return parts.join('\n');
  }

  /**
   * 构建角色设定文本
   */
  private buildCharacterContent(characters: Character[]): string {
    if (characters.length === 0) return '（暂无角色设定）';

    return characters
      .map((char) => {
        const roleLabel: Record<string, string> = {
          protagonist: '主角',
          supporting: '配角',
          antagonist: '反派',
          minor: '龙套',
        };
        const parts: string[] = [];
        parts.push(`### ${char.name}（${roleLabel[char.role] ?? char.role}）`);
        parts.push(`- 驱动力：${char.drive}`);
        parts.push(`- 恐惧：${char.fear}`);
        parts.push(`- 特征：${char.trait}`);
        parts.push(`- 背景故事：${char.backstory}`);
        parts.push(`- 表面追求：${char.surfaceGoal}`);
        parts.push(`- 深层渴望：${char.deepDesire}`);
        parts.push(`- 灵魂需求：${char.soulNeed}`);
        parts.push(`- 初始状态：${char.initialArc}`);
        parts.push(`- 触发事件：${char.triggerEvent}`);
        parts.push(`- 蜕变节点：${char.transformation}`);
        parts.push(`- 最终状态：${char.finalState}`);
        return parts.join('\n');
      })
      .join('\n\n');
  }

  /**
   * 构建角色当前状态文本
   */
  private buildCharacterStatesContent(characters: Character[]): string {
    if (characters.length === 0) return '（暂无角色状态）';

    return characters
      .map((char) => {
        const state = char.currentState;
        const parts: string[] = [];
        parts.push(`### ${char.name}`);
        parts.push(`- 当前状态：${state.status}`);
        if (state.items.length > 0) {
          parts.push(`- 持有物品：${state.items.join('、')}`);
        }
        if (state.abilities.length > 0) {
          parts.push(`- 能力：${state.abilities.join('、')}`);
        }
        if (Object.keys(state.relationships).length > 0) {
          const rels = Object.entries(state.relationships)
            .map(([name, rel]) => `${name}：${rel}`)
            .join('；');
          parts.push(`- 人际关系：${rels}`);
        }
        if (state.events.length > 0) {
          parts.push(`- 近期经历：${state.events.slice(-3).join('、')}`);
        }
        return parts.join('\n');
      })
      .join('\n\n');
  }

  /**
   * 构建前情概要
   */
  private buildPreviousSummary(project: NovelProject, volumes: Volume[]): string {
    const parts: string[] = [];

    // 添加卷信息
    for (const volume of volumes) {
      if (volume.volumeNumber < project.currentVolume) {
        parts.push(`第${volume.volumeNumber}卷《${volume.title}》已完成`);
      }
    }

    if (parts.length === 0) {
      return '（这是第一卷，无前情概要）';
    }

    return parts.join('\n');
  }

  /**
   * 构建 Canon 内容文本
   */
  private buildCanonContent(project: NovelProject, canonLog: CanonEntry[]): string {
    const parts: string[] = [];

    parts.push('## 世界观设定');
    parts.push(project.worldBuilding ?? '（暂无）');

    if (project.premise) {
      parts.push('\n## 前提设定');
      parts.push(project.premise);
    }

    if (canonLog.length > 0) {
      parts.push('\n## Canon 变更日志');
      for (const entry of canonLog) {
        parts.push(`- 第${entry.chapter}章（第${entry.volume}卷）：${entry.change}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * 更新单个角色的状态
   */
  private async updateSingleCharacterState(
    character: Character,
    chapter: Chapter,
  ): Promise<UpdateResult['characterUpdates'][0] | null> {
    const previousStateStr = this.buildSingleCharacterState(character);

    const userPrompt = fillFinalizationTemplate(updateCharacterStatePrompt, {
      characterName: character.name,
      previousState: previousStateStr,
      newChapterContent: chapter.draftContent,
      chapterNumber: String(chapter.chapterNumber),
      chapterTitle: chapter.title,
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: finalizationSystemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.llm.chat(messages, undefined, 'finalization');

    // 检查是否有变化
    if (response.content.includes('无变化')) {
      return null;
    }

    // 解析更新后的状态
    const newState = this.parseUpdatedCharacterState(response.content);

    return {
      characterId: character.id,
      characterName: character.name,
      changes: response.content,
      newState,
    };
  }

  /**
   * 构建单个角色的状态描述
   */
  private buildSingleCharacterState(character: Character): string {
    const state = character.currentState;
    const parts: string[] = [];
    parts.push(`### ${character.name} 当前状态`);
    parts.push(`- 当前状态：${state.status}`);
    parts.push(`- 持有物品：${state.items.length > 0 ? state.items.join('、') : '无'}`);
    parts.push(`- 能力：${state.abilities.length > 0 ? state.abilities.join('、') : '无'}`);
    if (Object.keys(state.relationships).length > 0) {
      const rels = Object.entries(state.relationships)
        .map(([name, rel]) => `${name}：${rel}`)
        .join('；');
      parts.push(`- 人际关系：${rels}`);
    } else {
      parts.push('- 人际关系：无');
    }
    if (state.events.length > 0) {
      parts.push(`- 经历事件：${state.events.join('、')}`);
    } else {
      parts.push('- 经历事件：无');
    }
    return parts.join('\n');
  }

  /**
   * 从 AI 响应中解析更新后的角色状态
   */
  private parseUpdatedCharacterState(response: string): CharacterState {
    const newState: CharacterState = {
      items: [],
      abilities: [],
      status: '',
      relationships: {},
      events: [],
    };

    // 提取持有物品
    const itemsMatch = response.match(/###\s*持有物品\s*\n([\s\S]*?)(?=\n###|$)/);
    if (itemsMatch) {
      newState.items = itemsMatch[1]
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);
    }

    // 提取能力列表
    const abilitiesMatch = response.match(/###\s*能力列表\s*\n([\s\S]*?)(?=\n###|$)/);
    if (abilitiesMatch) {
      newState.abilities = abilitiesMatch[1]
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);
    }

    // 提取当前状态
    const statusMatch = response.match(/###\s*当前状态\s*\n([\s\S]*?)(?=\n###|$)/);
    if (statusMatch) {
      newState.status = statusMatch[1].trim();
    }

    // 提取人际关系
    const relMatch = response.match(/###\s*人际关系\s*\n([\s\S]*?)(?=\n###|$)/);
    if (relMatch) {
      const relLines = relMatch[1]
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);
      for (const line of relLines) {
        const colonIdx = line.indexOf('：');
        if (colonIdx > 0) {
          const name = line.slice(0, colonIdx).trim();
          const desc = line.slice(colonIdx + 1).trim();
          newState.relationships[name] = desc;
        }
      }
    }

    // 提取经历事件
    const eventsMatch = response.match(/###\s*经历事件\s*\n([\s\S]*?)(?=\n###|$)/);
    if (eventsMatch) {
      newState.events = eventsMatch[1]
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim())
        .filter(Boolean);
    }

    return newState;
  }

  /**
   * 解析审查结果
   */
  private parseReviewResult(response: string, _chapterNumber: number): ReviewResult {
    const result: ReviewResult = {
      verdict: 'pass' as ReviewVerdict,
      issues: [],
      suggestions: [],
      canonConflicts: [],
      upgradeCheck: '',
    };

    // 判定通过/不通过
    if (response.includes('不通过') || response.includes('需要重写')) {
      result.verdict = 'rewrite_required';
    } else if (response.includes('有条件通过') || response.includes('需要修改')) {
      result.verdict = 'minor_fix';
    } else if (response.includes('通过')) {
      result.verdict = 'pass';
    }

    // 提取问题
    const issuePattern = /\|\s*\d+\s*\|[^|]+\|[^|]+\|([^|]+)\|/g;
    let match: RegExpExecArray | null;
    while ((match = issuePattern.exec(response)) !== null) {
      const content = match[1].trim();
      const issue: ReviewIssue = {
        type: 'ai_pattern',
        content,
        severity: content.includes('严重') || content.includes('P0')
          ? 'error'
          : content.includes('P1')
            ? 'warning'
            : 'info',
      };
      result.issues.push(issue);
    }

    // 提取建议
    const suggestionPattern = /(?:修改建议|建议)[：:]\s*(.+)/g;
    while ((match = suggestionPattern.exec(response)) !== null) {
      result.suggestions.push(match[1].trim());
    }

    // 提取 Canon 冲突
    const canonPattern = /Canon[^：:]*[：:]\s*(.+)/gi;
    while ((match = canonPattern.exec(response)) !== null) {
      if (match[1].includes('冲突') || match[1].includes('矛盾')) {
        result.canonConflicts.push(match[1].trim());
      }
    }

    return result;
  }

  /**
   * 解析一致性检查结果
   */
  private parseConsistencyResult(response: string): ConsistencyResult {
    const result: ConsistencyResult = {
      passed: true,
      severeIssues: [],
      minorIssues: [],
      canonChangeSuggestions: [],
      score: 10,
      report: response,
      model: '',
      totalTokens: 0,
    };

    // 检查是否通过 - 支持多种常见的通过表述
    const passedPatterns = [
      '未发现一致性问题',
      'Canon 检查通过',
      '一致性检查通过',
      '未发现明显问题',
      '未发现严重问题',
      '没有发现一致性问题',
      '没有明显问题',
      '无一致性问题',
      '检查通过',
      '一致性良好',
      'canon检查通过',
      'canon 检查通过',
    ];
    const hasPassIndicator = passedPatterns.some((p) => response.includes(p));
    if (hasPassIndicator) {
      result.passed = true;
    } else {
      result.passed = false;
    }

    // 提取严重问题
    const severePattern = /严重问题[^|]*\|[^|]*\|[^|]*\|([^|]+)\|/g;
    let match: RegExpExecArray | null;
    while ((match = severePattern.exec(response)) !== null) {
      result.severeIssues.push(match[1].trim());
    }

    // 提取一般问题
    const minorPattern = /一般问题[^|]*\|[^|]*\|([^|]+)\|/g;
    while ((match = minorPattern.exec(response)) !== null) {
      result.minorIssues.push(match[1].trim());
    }

    // 提取 Canon 变更建议
    const canonPattern = /\|\s*(新增设定|修改设定|删除设定)\s*\|([^|]+)\|([^|]+)\|([^|]+)\|/g;
    while ((match = canonPattern.exec(response)) !== null) {
      result.canonChangeSuggestions.push({
        changeType: match[1].trim(),
        content: match[2].trim(),
        impact: match[3].trim(),
        action: match[4].trim(),
      });
    }

    // 提取总分
    const scoreMatch = response.match(/总分[^|]*[：:]\s*(\d+)\/10/);
    if (scoreMatch) {
      result.score = parseInt(scoreMatch[1], 10);
    }

    // 如果有严重问题，标记为未通过
    if (result.severeIssues.length > 0) {
      result.passed = false;
    }

    return result;
  }
}

// ============================================================
// 导出便捷实例
// ============================================================

/** 全局默认 AI 写作流水线实例 */
export const aiPipeline = new AIPipeline();
