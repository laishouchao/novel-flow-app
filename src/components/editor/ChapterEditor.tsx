import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  Eye,
  Columns,
  Pencil,
  Wand2,
  ShieldCheck,
  Sparkles,
  Minimize2,
  Maximize2,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Bot,
  Send,
  Copy,
  Check,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import Button from '../common/Button';
import { useAppState, useAppDispatch, editorActions, projectActions } from '../../store';
import { useToast } from '../common/Toast';
import { aiPipeline, type StreamCallback } from '../../services/aiPipeline';
import { llmService } from '../../services/llm';
import { hasLLMConfig } from '../../utils/llmHelpers';
import { countChineseWords } from '../../utils/wordCount';
import ProjectFilePanel from './ProjectFilePanel';
import type { EditorViewMode, ReviewResult } from '../../types';

type AIAction = 'draft' | 'review' | 'deai' | 'expand' | 'condense';

const editorAiActions: { key: AIAction; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'draft', label: '生成草稿', icon: <Wand2 size={16} />, desc: '根据大纲生成章节草稿' },
  { key: 'review', label: '审查章节', icon: <ShieldCheck size={16} />, desc: 'AI审查当前章节' },
  { key: 'deai', label: '去AI味', icon: <Sparkles size={16} />, desc: '去除AI生成的痕迹' },
  { key: 'expand', label: '扩写', icon: <Maximize2 size={16} />, desc: '扩展当前内容' },
  { key: 'condense', label: '缩写', icon: <Minimize2 size={16} />, desc: '精简当前内容' },
];

const defaultPromptTemplates: Record<AIAction, string> = {
  draft: '请根据以下大纲生成章节草稿，保持与前文的连贯性，注意人物性格的一致性。',
  review: '请审查以下章节内容，检查逻辑连贯性、人物行为合理性、伏笔一致性。',
  deai: '请对以下文本进行"去AI味"处理，使其更加自然、有人的写作风格特征。',
  expand: '请扩写以下内容，增加细节描写、环境渲染和人物心理活动。',
  condense: '请精简以下内容，保留核心情节和关键信息，去除冗余描写。',
};

/** store EditorViewMode -> 组件 ViewMode 映射 */
function mapEditorViewMode(mode: EditorViewMode): 'edit' | 'preview' | 'compare' {
  switch (mode) {
    case 'edit': return 'edit';
    case 'preview': return 'preview';
    case 'split': return 'compare';
    default: return 'edit';
  }
}

/** 组件 ViewMode -> store EditorViewMode 映射 */
function toStoreViewMode(mode: 'edit' | 'preview' | 'compare'): EditorViewMode {
  switch (mode) {
    case 'edit': return 'edit';
    case 'preview': return 'preview';
    case 'compare': return 'split';
    default: return 'edit';
  }
}

/** 将 ReviewResult 格式化为可读文本 */
function formatReviewResult(result: ReviewResult): string {
  const verdictMap: Record<string, string> = {
    pass: '通过',
    minor_fix: '有条件通过（需要小修）',
    rewrite_required: '不通过（需要重写）',
    reject: '拒绝',
  };

  const lines: string[] = [];
  lines.push(`## 审查结果\n`);
  lines.push(`### 整体评价`);
  lines.push(`结论：**${verdictMap[result.verdict] ?? result.verdict}**\n`);

  if (result.issues.length > 0) {
    lines.push(`### 发现的问题`);
    result.issues.forEach((issue, idx) => {
      const severityLabel: Record<string, string> = {
        error: '严重',
        warning: '警告',
        info: '提示',
      };
      lines.push(`${idx + 1}. **[${severityLabel[issue.severity] ?? issue.severity}]** ${issue.content}`);
    });
    lines.push('');
  }

  if (result.canonConflicts.length > 0) {
    lines.push(`### Canon 冲突`);
    result.canonConflicts.forEach((conflict, idx) => {
      lines.push(`${idx + 1}. ${conflict}`);
    });
    lines.push('');
  }

  if (result.suggestions.length > 0) {
    lines.push(`### 建议修改`);
    result.suggestions.forEach((suggestion, idx) => {
      lines.push(`${idx + 1}. ${suggestion}`);
    });
    lines.push('');
  }

  if (result.upgradeCheck) {
    lines.push(`### 升级检查\n${result.upgradeCheck}`);
  }

  return lines.join('\n');
}

const ChapterEditor: React.FC = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const currentChapter = state.editor.currentChapter;
  const editorContent = state.editor.editorContent;
  const storeViewMode = state.editor.viewMode;

  // 自动选中第一个章节（如果当前没有选中任何章节）
  useEffect(() => {
    if (!currentChapter && state.project.chapters.length > 0) {
      const firstChapter = state.project.chapters
        .slice()
        .sort((a, b) => a.chapterNumber - b.chapterNumber)[0];
      if (firstChapter) {
        dispatch(editorActions.setChapter(firstChapter));
      }
    }
  }, [currentChapter, state.project.chapters, dispatch]);

  const chapterTitle = currentChapter?.title ?? '未选择章节';
  const initialContent = editorContent;

  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'compare'>(mapEditorViewMode(storeViewMode));
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [filePanelOpen, setFilePanelOpen] = useState(true);
  const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);
  const [promptText, setPromptText] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 流式输出缓冲 - 使用 useRef 避免每个 token 都触发重渲染
  const aiOutputBufferRef = useRef('');
  const aiOutputRafRef = useRef<number | null>(null);
  // 用于取消正在进行的生成
  const abortControllerRef = useRef<AbortController | null>(null);

  const wordCount = countChineseWords(content);

  const llmConfigured = hasLLMConfig(state.ai);

  // 同步 store 的 editorContent 到本地 content
  useEffect(() => {
    setContent(editorContent);
  }, [editorContent]);

  // 同步 store 的 viewMode 到本地 viewMode
  useEffect(() => {
    setViewMode(mapEditorViewMode(storeViewMode));
  }, [storeViewMode]);

  // 自动保存 - 使用 autoSaveInterval 设置（秒），仅在有未保存更改时触发
  useEffect(() => {
    if (!currentChapter || !state.editor.isDirty) return;

    const intervalMs = (state.ui.editorPrefs.autoSaveInterval || 30) * 1000;
    const timer = setInterval(() => {
      if (currentChapter && state.editor.isDirty) {
        dispatch(
          projectActions.updateChapter(currentChapter.id, {
            draftContent: content,
            wordCount: countChineseWords(content),
            summary: generateAutoSummary(content) || currentChapter.summary,
          })
        );
        dispatch(editorActions.markSaved(new Date().toISOString()));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [currentChapter, state.editor.isDirty, state.ui.editorPrefs.autoSaveInterval, content, dispatch]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    dispatch(editorActions.setContent(newContent));
  };

  const handleViewModeChange = (mode: 'edit' | 'preview' | 'compare') => {
    setViewMode(mode);
    dispatch(editorActions.setViewMode(toStoreViewMode(mode)));
  };

  /** 从内容中自动生成章节摘要（取前 200 个字符） */
  const generateAutoSummary = (text: string): string => {
    if (!text) return '';
    // 取第一个非空段落，最多 200 字符
    const firstParagraph = text.split('\n').find((p) => p.trim().length > 0) ?? '';
    const trimmed = firstParagraph.trim();
    if (trimmed.length <= 200) return trimmed;
    return trimmed.substring(0, 200) + '...';
  };

  const handleSave = () => {
    if (!currentChapter) return;
    const autoSummary = generateAutoSummary(content);
    dispatch(
      projectActions.updateChapter(currentChapter.id, {
        draftContent: content,
        wordCount: countChineseWords(content),
        summary: autoSummary || currentChapter.summary,
      })
    );
    dispatch(editorActions.markSaved(new Date().toISOString()));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSelectAction = (action: AIAction) => {
    setSelectedAction(action);
    setPromptText(defaultPromptTemplates[action]);
    setAiOutput('');
  };

  const handleGenerate = async () => {
    if (!selectedAction || isGenerating) return;
    setIsGenerating(true);
    setAiOutput('');
    aiOutputBufferRef.current = '';

    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // 清理之前的 raf
    if (aiOutputRafRef.current !== null) {
      cancelAnimationFrame(aiOutputRafRef.current);
      aiOutputRafRef.current = null;
    }

    try {
      // 流式回调 - 缓冲 token，通过 requestAnimationFrame 批量更新
      const onStream: StreamCallback = (token: string) => {
        if (abortController.signal.aborted) return;
        aiOutputBufferRef.current += token;
        if (aiOutputRafRef.current === null) {
          aiOutputRafRef.current = requestAnimationFrame(() => {
            if (!abortController.signal.aborted) {
              setAiOutput(aiOutputBufferRef.current);
            }
            aiOutputRafRef.current = null;
          });
        }
      };

      switch (selectedAction) {
        case 'draft': {
          if (!currentChapter || !state.project.currentProject) break;
          // 找到前一章
          const chapters = state.project.chapters;
          const previousChapter = currentChapter.chapterNumber > 1
            ? chapters.find((c) => c.chapterNumber === currentChapter.chapterNumber - 1) ?? null
            : null;

          await aiPipeline.generateChapterDraft(
            currentChapter,
            {
              project: state.project.currentProject,
              characters: state.project.characters,
              globalSummary: state.project.globalSummary,
              previousChapter,
            },
            onStream
          );
          break;
        }
        case 'review': {
          if (!currentChapter || !state.project.currentProject) break;
          const chapters = state.project.chapters;
          const previousChapter = currentChapter.chapterNumber > 1
            ? chapters.find((c) => c.chapterNumber === currentChapter.chapterNumber - 1) ?? null
            : null;

          // 流式审查
          let reviewContent = '';
          const result = await aiPipeline.reviewChapterStream(
            currentChapter,
            {
              project: state.project.currentProject,
              characters: state.project.characters,
              globalSummary: state.project.globalSummary,
              previousChapter,
              canonLog: state.project.currentProject?.canonLog ?? [],
            },
            (token) => {
              reviewContent += token;
              aiOutputBufferRef.current = reviewContent;
              if (aiOutputRafRef.current === null) {
                aiOutputRafRef.current = requestAnimationFrame(() => {
                  setAiOutput(aiOutputBufferRef.current);
                  aiOutputRafRef.current = null;
                });
              }
            }
          );
          // 最终格式化显示
          const reviewText = formatReviewResult(result);
          setAiOutput(reviewText);
          dispatch(editorActions.setReviewResult(result));
          break;
        }
        case 'deai':
        case 'expand':
        case 'condense': {
          // 这些操作使用自定义 prompt + 流式输出
          const messages = [
            { role: 'system' as const, content: '你是一个专业的小说编辑助手。' },
            { role: 'user' as const, content: `${promptText}\n\n以下是需要处理的文本：\n\n${content}` },
          ];
          await llmService.chatStream(
            messages,
            { onToken: onStream },
            undefined,
            'draft'
          );
          break;
        }
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        addToast('info', '生成已取消');
      } else {
        addToast('error', `AI 调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGenerate = () => {
    abortControllerRef.current?.abort();
  };

  const handleCopyOutput = async () => {
    try {
      await navigator.clipboard.writeText(aiOutput);
      addToast('success', '已复制到剪贴板');
    } catch (error) {
      addToast('error', '复制失败，请手动选择复制');
    }
  };

  const handleInsertOutput = () => {
    const newContent = content + '\n\n' + aiOutput;
    setContent(newContent);
    dispatch(editorActions.setContent(newContent));
  };

  // 无章节时显示引导页面
  if (!currentChapter && state.project.chapters.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <Pencil size={28} className="text-amber-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            还没有章节
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            请先在"大纲规划"中创建章节，或使用 AI 生成章节大纲后再开始写作。
          </p>
          <Button
            variant="primary"
            onClick={() => dispatch(uiActions.setView('outline'))}
          >
            前往大纲规划
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* 顶部工具栏 */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {chapterTitle}
          </h2>
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">{wordCount.toLocaleString()}</span>
            <span>字</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => handleViewModeChange('edit')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${viewMode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <Pencil size={13} />
              编辑
            </button>
            <button
              onClick={() => handleViewModeChange('preview')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${viewMode === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <Eye size={13} />
              预览
            </button>
            <button
              onClick={() => handleViewModeChange('compare')}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${viewMode === 'compare' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <Columns size={13} />
              对比
            </button>
          </div>

          {/* 文件面板切换 */}
          <button
            onClick={() => setFilePanelOpen(!filePanelOpen)}
            className={`
              p-2 rounded-lg transition-colors
              ${filePanelOpen ? 'bg-amber-50 text-amber-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}
            `}
            title={filePanelOpen ? '收起文件面板' : '展开文件面板'}
          >
            <FolderOpen size={18} />
          </button>

          {/* AI面板切换 */}
          <button
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className={`
              p-2 rounded-lg transition-colors
              ${aiPanelOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}
            `}
            title={aiPanelOpen ? '收起AI面板' : '展开AI面板'}
          >
            {aiPanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>

          {/* 保存按钮 */}
          <Button
            variant="primary"
            size="sm"
            icon={saved ? <Check size={16} /> : <Save size={16} />}
            onClick={handleSave}
            className={saved ? '!bg-emerald-600 hover:!bg-emerald-700' : ''}
          >
            {saved ? '已保存' : '保存'}
          </Button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 项目文件面板 */}
        <ProjectFilePanel isOpen={filePanelOpen} onToggle={() => setFilePanelOpen(!filePanelOpen)} />

        {/* 编辑区域 */}
        <div className="flex-1 flex flex-col">
          {viewMode === 'edit' ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="开始写作..."
              style={{
                fontSize: `${state.ui.editorPrefs.fontSize}px`,
                lineHeight: state.ui.editorPrefs.lineHeight,
              }}
              className="
                flex-1 w-full px-8 py-6 text-slate-800 dark:text-slate-200
                resize-none focus:outline-none
                placeholder:text-slate-300 dark:placeholder:text-slate-600
                font-serif bg-white dark:bg-slate-900
              "
            />
          ) : viewMode === 'preview' ? (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <div className="prose prose-slate max-w-none">
                {content.split('\n').map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="text-slate-800 dark:text-slate-200 mb-4 font-serif"
                    style={{
                      fontSize: `${state.ui.editorPrefs.fontSize}px`,
                      lineHeight: state.ui.editorPrefs.lineHeight,
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            /* 对比视图 */
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-6 border-r border-slate-200">
                <div className="text-xs font-medium text-slate-400 mb-3 uppercase">
                  原文
                </div>
                <div className="text-sm leading-[1.8] text-slate-600 font-serif whitespace-pre-wrap">
                  {content || '暂无内容'}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="text-xs font-medium text-blue-400 mb-3 uppercase">
                  AI 输出
                </div>
                <div className="text-sm leading-[1.8] text-slate-800 font-serif whitespace-pre-wrap">
                  {aiOutput || '暂无AI输出'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI助手面板 */}
        {aiPanelOpen && (
          <div className="w-80 shrink-0 border-l border-slate-200 flex flex-col bg-slate-50/50">
            {/* AI操作按钮 */}
            <div className="p-3 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Bot size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-slate-700">AI 助手</span>
              </div>
              <div className="space-y-1">
                {editorAiActions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleSelectAction(action.key)}
                    disabled={!llmConfigured}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors
                      ${
                        !llmConfigured
                          ? 'opacity-50 cursor-not-allowed text-slate-400'
                          : selectedAction === action.key
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-100'
                      }
                    `}
                  >
                    <span className={selectedAction === action.key ? 'text-blue-600' : 'text-slate-400'}>
                      {action.icon}
                    </span>
                    <div>
                      <div className="font-medium">{action.label}</div>
                      <div className="text-[11px] text-slate-400">{action.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 提示词编辑 */}
            {selectedAction && (
              <div className="p-3 border-b border-slate-200">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                  提示词（可编辑）
                </label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={4}
                  className="
                    w-full px-3 py-2 rounded-lg border border-slate-200 text-xs
                    resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    bg-white text-slate-700 leading-relaxed
                  "
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleGenerate}
                    loading={isGenerating}
                    disabled={!llmConfigured}
                    icon={<Send size={14} />}
                  >
                    {isGenerating ? '生成中...' : '开始生成'}
                  </Button>
                  {isGenerating && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelGenerate}
                      icon={<Minimize2 size={14} />}
                    >
                      取消
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* AI输出区域 */}
            <div className="flex-1 overflow-y-auto p-3">
              {!llmConfigured ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <AlertCircle size={32} className="text-amber-400 mb-3" />
                  <p className="text-sm font-medium text-slate-600 mb-1">请先配置 AI 模型</p>
                  <p className="text-xs text-slate-400 mb-4">AI 助手功能需要配置 LLM API 才能使用</p>
                  <Button variant="primary" size="sm" onClick={() => navigate('/settings')}>
                    前往设置
                  </Button>
                </div>
              ) : aiOutput ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">输出结果</span>
                    <div className="flex gap-1">
                      <button
                        onClick={handleCopyOutput}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        title="复制"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={handleInsertOutput}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        title="插入到编辑器"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-slate-200">
                    {aiOutput}
                    {isGenerating && (
                      <span className="inline-block w-1.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-text-bottom" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot size={32} className="text-slate-200 mb-3" />
                  <p className="text-xs text-slate-400">
                    选择一个AI操作开始
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChapterEditor;
