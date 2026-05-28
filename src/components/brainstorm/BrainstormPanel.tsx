import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  ArrowLeft,
  CheckCircle,
  Bot,
  User,
  FileText,
  AlertCircle,
} from 'lucide-react';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import { useAppState, useAppDispatch, projectActions, uiActions } from '../../store';
import { useToast } from '../common/Toast';
import { aiPipeline } from '../../services/aiPipeline';
import { hasLLMConfig } from '../../utils/llmHelpers';
import type { BrainstormDimension, NovelProject } from '../../types';

/** 灵感收束的9个维度 */
const DIMENSIONS = [
  '核心概念',
  '世界观设定',
  '主角人设',
  '核心冲突',
  '情感基调',
  '叙事视角',
  '关键转折',
  '主题深度',
  '独特卖点',
];

/** DIMENSIONS 数组索引 0-8 对应 BrainstormDimension 类型 */
const DIMENSION_TYPES: BrainstormDimension[] = [
  'inspiration',
  'genre',
  'theme',
  'protagonist',
  'worldview',
  'conflict',
  'opening',
  'style',
  'word_count',
];

/** 将 aiPipeline.brainstormConfirm 返回的 Partial<NovelProject> 转换为 Markdown 预览 */
function buildPreviewFromProjectData(data: Partial<NovelProject>): string {
  return `# 项目蓝图

## 核心概念
${data.coreSeed ?? '待完善'}

## 类型与风格
- 类型：${data.genre ?? '待定'}
- 风格：${data.style?.description ?? '待定'}

## 世界观设定
${data.worldBuilding ?? '待完善'}

## 主角设定
${data.coreSeed ?? '待完善'}

## 核心冲突
${data.conflict ?? '待完善'}

## 情感基调
${data.style?.description ?? '待完善'}

## 目标字数
- 总字数：${data.targetWords?.toLocaleString() ?? '待定'}
- 每章字数：${data.chapterTargetWords?.toLocaleString() ?? '待定'}

---
*由 NovelFlow 灵感收束引擎生成*`;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  options?: string[];
  timestamp: Date;
}

const BrainstormPanel: React.FC = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const storeMessages = state.project.brainstormMessages;

  // 从 store 恢复对话历史
  const restoredMessages = useMemo<ChatMessage[]>(() => {
    return storeMessages.map((msg) => ({
      id: msg.id,
      role: msg.role === 'assistant' ? 'ai' : 'user',
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    }));
  }, [storeMessages]);

  // 从 store 消息推断当前维度进度
  const restoredDimension = useMemo(() => {
    if (storeMessages.length === 0) return 0;
    // 找到最后一条有维度的 assistant 消息
    for (let i = storeMessages.length - 1; i >= 0; i--) {
      const msg = storeMessages[i];
      const dimIndex = DIMENSION_TYPES.indexOf(msg.dimension);
      if (dimIndex >= 0) return dimIndex;
    }
    return 0;
  }, [storeMessages]);

  const restoredCompleted = useMemo(() => {
    const completed = new Array(DIMENSIONS.length).fill(false) as boolean[];
    for (const msg of storeMessages) {
      const dimIndex = DIMENSION_TYPES.indexOf(msg.dimension);
      if (dimIndex >= 0 && msg.role === 'assistant') {
        completed[dimIndex] = true;
      }
    }
    return completed;
  }, [storeMessages]);

  const [currentDimension, setCurrentDimension] = useState(restoredDimension);
  const [messages, setMessages] = useState<ChatMessage[]>(restoredMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [completedDimensions, setCompletedDimensions] = useState<boolean[]>(restoredCompleted);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [confirmedProjectData, setConfirmedProjectData] = useState<Record<string, unknown> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 流式输出缓冲 - 使用 useRef 避免每个 token 都触发重渲染
  const streamBufferRef = useRef<string>('');
  const streamMessageIdRef = useRef<string>('');
  const streamRafRef = useRef<number | null>(null);

  const llmConfigured = hasLLMConfig(state.ai);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化标记，确保欢迎消息只发送一次
  const initializedRef = useRef(false);

  // 初始化第一条AI消息（仅在没有历史消息时发送）
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (storeMessages.length === 0) {
      const welcomeMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: `欢迎来到灵感收束！我们将通过 ${DIMENSIONS.length} 个维度来构建你的小说蓝图。\n\n让我们从第一个维度开始：**${DIMENSIONS[0]}**\n\n请描述你想要创作的小说的核心概念是什么？`,
        options: ['我想写一个关于...的故事', '让我想想...', '我有一个大致的想法'],
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
      dispatch(
        projectActions.addBrainstormMessage({
          id: welcomeMsg.id,
          role: 'assistant',
          content: welcomeMsg.content,
          dimension: DIMENSION_TYPES[0],
          confirmed: false,
          timestamp: welcomeMsg.timestamp.toISOString(),
        })
      );
    }
  }, [storeMessages, dispatch]);

  // 添加一个空的 AI 消息占位符，用于流式更新
  const addStreamAIMessage = (_dimension?: BrainstormDimension): string => {
    const id = `ai-${Date.now()}`;
    const msg: ChatMessage = {
      id,
      role: 'ai',
      content: '',
      options: [],
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    return id;
  };

  // 更新流式消息内容
  const updateStreamMessage = (id: string, content: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content } : msg))
    );
  };

  // 完成流式消息，保存到 store
  const finalizeStreamMessage = (id: string, content: string, options?: string[], dimension?: BrainstormDimension) => {
    // 从内容中提取选项（A/B/C/D/E 开头的行）
    const extractedOptions = options ?? extractOptionsFromContent(content);
    
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? { ...msg, content, options: extractedOptions }
          : msg
      )
    );
    
    dispatch(
      projectActions.addBrainstormMessage({
        id,
        role: 'assistant',
        content,
        dimension: dimension ?? DIMENSION_TYPES[currentDimension],
        confirmed: false,
        timestamp: new Date().toISOString(),
      })
    );
  };

  // 从内容中提取选项
  const extractOptionsFromContent = (content: string): string[] => {
    const lines = content.split('\n');
    const options: string[] = [];
    for (const line of lines) {
      const match = line.match(/^([A-E])[.．、]\s*(.+)$/);
      if (match) {
        options.push(`${match[1]}. ${match[2].trim()}`);
      }
    }
    return options;
  };

  const addAIMessage = (content: string, options?: string[], dimension?: BrainstormDimension) => {
    const id = `ai-${Date.now()}`;
    const msg: ChatMessage = {
      id,
      role: 'ai',
      content,
      options,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    dispatch(
      projectActions.addBrainstormMessage({
        id,
        role: 'assistant',
        content,
        dimension: dimension ?? DIMENSION_TYPES[currentDimension],
        confirmed: false,
        timestamp: msg.timestamp.toISOString(),
      })
    );
  };

  const addUserMessage = (content: string) => {
    const id = `user-${Date.now()}`;
    const msg: ChatMessage = {
      id,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
    dispatch(
      projectActions.addBrainstormMessage({
        id,
        role: 'user',
        content,
        dimension: DIMENSION_TYPES[currentDimension],
        confirmed: false,
        timestamp: msg.timestamp.toISOString(),
      })
    );
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    if (!llmConfigured) {
      addToast('warning', '请先配置 AI 模型，灵感收束需要 AI 模型支持。');
      return;
    }

    addUserMessage(text);
    setInputValue('');
    handleAIResponse(text);
  };

  const handleOptionClick = (option: string) => {
    if (isLoading) return;

    if (!llmConfigured) {
      addToast('warning', '请先配置 AI 模型，灵感收束需要 AI 模型支持。');
      return;
    }

    addUserMessage(option);
    handleAIResponse(option);
  };

  const handleAIResponse = async (_userInput: string) => {
    setIsLoading(true);

    try {
      const nextDim = currentDimension + 1;

      if (nextDim < DIMENSIONS.length) {
        // 创建流式消息占位符
        const messageId = addStreamAIMessage(DIMENSION_TYPES[nextDim]);
        let streamContent = '';
        streamBufferRef.current = '';
        streamMessageIdRef.current = messageId;

        // 调用 AI Pipeline 流式获取下一个维度的问题
        const history = state.project.brainstormMessages;
        await aiPipeline.brainstormNextQuestionStream(
          DIMENSION_TYPES[nextDim],
          history,
          (token) => {
            streamContent += token;
            streamBufferRef.current = streamContent;
            if (streamRafRef.current === null) {
              streamRafRef.current = requestAnimationFrame(() => {
                updateStreamMessage(streamMessageIdRef.current, streamBufferRef.current);
                streamRafRef.current = null;
              });
            }
          },
          state.project.currentProject ?? undefined
        );

        // 完成流式消息
        finalizeStreamMessage(messageId, streamContent, undefined, DIMENSION_TYPES[nextDim]);
        setCurrentDimension(nextDim);
      } else {
        // 所有维度完成，调用确认（非流式，因为是一次性生成）
        const history = state.project.brainstormMessages;
        const projectData = await aiPipeline.brainstormConfirm(history);
        setConfirmedProjectData(projectData as unknown as Record<string, unknown>); // 保存完整数据

        // 生成预览内容
        const preview = buildPreviewFromProjectData(projectData);
        setPreviewContent(preview);
        setShowPreview(true);

        addAIMessage(
          `太棒了！所有 ${DIMENSIONS.length} 个维度的灵感收束已完成。\n\n我已经根据你的描述生成了项目蓝图（project.md）的预览，请查看并确认。`,
          [],
          DIMENSION_TYPES[currentDimension]
        );

        dispatch(projectActions.setStage('outline'));
        dispatch(projectActions.setStatus('planned'));
      }
    } catch (error) {
      addToast('error', `AI 调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      // 标记当前维度为已完成
      setCompletedDimensions((prev) => {
        const next = [...prev];
        next[currentDimension] = true;
        return next;
      });
      setIsLoading(false);
    }
  };

  const handleConfirmPreview = () => {
    if (confirmedProjectData) {
      dispatch(projectActions.update({
        ...confirmedProjectData,
        coreSeed: (confirmedProjectData.coreSeed as string) ?? previewContent,
        status: 'planned',
        stage: 'outline',
      }));
    } else {
      dispatch(projectActions.update({ coreSeed: previewContent, status: 'planned', stage: 'outline' }));
    }
    // 创建默认卷（如果 store 中还没有卷对象）
    // OutlinePanel 需要至少一个卷来显示章节
    const currentProject = state.project.currentProject;
    if (currentProject && state.project.volumes.length === 0) {
      const defaultVolume: import('../../types').Volume = {
        id: `vol-${currentProject.id}-1`,
        projectId: currentProject.id,
        volumeNumber: 1,
        title: '第一卷',
        goal: '',
        futureDirection: '',
        createdAt: new Date().toISOString(),
      };
      dispatch(projectActions.addVolume(defaultVolume));
    }
    dispatch(uiActions.setView('home'));
  };

  const handlePrevDimension = () => {
    if (currentDimension > 0) {
      setCurrentDimension((prev) => prev - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const llmDisabled = !llmConfigured;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部：维度名称和进度 */}
      <div className="shrink-0 border-b border-slate-200">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => dispatch(uiActions.setView('home'))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                灵感收束
              </h2>
              <p className="text-xs text-slate-500">
                维度 {currentDimension + 1}/{DIMENSIONS.length} -{' '}
                {DIMENSIONS[currentDimension]}
              </p>
            </div>
          </div>
          {currentDimension > 0 && !showPreview && (
            <Button variant="ghost" size="sm" onClick={handlePrevDimension}>
              <ArrowLeft size={14} />
              上一维度
            </Button>
          )}
        </div>

        {/* 维度进度条 */}
        <div className="px-5 pb-3">
          <div className="flex gap-1">
            {DIMENSIONS.map((dim, index) => (
              <button
                key={dim}
                onClick={() => {
                  if (completedDimensions[index]) {
                    setCurrentDimension(index);
                  }
                }}
                className={`
                  flex-1 h-1.5 rounded-full transition-all duration-300
                  ${
                    completedDimensions[index]
                      ? 'bg-blue-500'
                      : index === currentDimension
                      ? 'bg-blue-300 animate-pulse'
                      : 'bg-slate-200'
                  }
                `}
                title={`${dim}${completedDimensions[index] ? ' (已完成)' : ''}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {DIMENSIONS.filter((_, i) => i % 2 === 0).map((dim) => (
              <span key={dim} className="text-[9px] text-slate-400">
                {dim}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 中间：对话消息列表 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* 头像 */}
            <div
              className={`
                shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${
                  msg.role === 'ai'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-slate-100 text-slate-600'
                }
              `}
            >
              {msg.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
            </div>

            {/* 消息内容 */}
            <div
              className={`
                max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                ${
                  msg.role === 'ai'
                    ? 'bg-slate-50 text-slate-800 rounded-tl-sm'
                    : 'bg-blue-600 text-white rounded-tr-sm'
                }
              `}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* AI选项按钮 */}
              {msg.options && msg.options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {msg.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(option)}
                      disabled={isLoading || llmDisabled}
                      className="
                        px-3 py-1.5 rounded-lg text-xs font-medium
                        bg-white border border-slate-200 text-slate-600
                        hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700
                        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 加载指示器 */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        )}

        {/* project.md 预览 */}
        {showPreview && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200">
              <FileText size={14} className="text-slate-500" />
              <span className="text-xs font-medium text-slate-600">
                project.md 预览
              </span>
            </div>
            <pre className="p-4 text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
              {previewContent}
            </pre>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 底部：输入区域 / 确认按钮 */}
      <div className="shrink-0 border-t border-slate-200 px-5 py-4 bg-white">
        {showPreview ? (
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={<CheckCircle size={18} />}
              onClick={handleConfirmPreview}
              className="flex-1"
            >
              确认蓝图并创建项目
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              继续调整
            </Button>
          </div>
        ) : (
          <>
            {!llmConfigured && !showPreview && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle size={20} className="text-amber-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">请先配置 AI 模型</p>
                  <p className="text-xs text-amber-600 mt-0.5">灵感收束需要 AI 模型支持，请前往设置页面配置 API。</p>
                </div>
                <Button variant="primary" size="sm" onClick={() => dispatch(uiActions.setView('settings'))}>
                  前往设置
                </Button>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`描述你的"${DIMENSIONS[currentDimension]}"...`}
                  rows={2}
                  className="
                    w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm
                    resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    placeholder:text-slate-400
                  "
                  disabled={isLoading || llmDisabled}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading || llmDisabled}
                icon={<Send size={16} />}
                className="shrink-0"
              >
                发送
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BrainstormPanel;
