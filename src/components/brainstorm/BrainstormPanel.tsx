import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  ArrowLeft,
  CheckCircle,
  Bot,
  User,
  FileText,
} from 'lucide-react';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';

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

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  options?: string[];
  timestamp: Date;
}

interface BrainstormPanelProps {
  onComplete?: (projectMd: string) => void;
  onBack?: () => void;
}

const BrainstormPanel: React.FC<BrainstormPanelProps> = ({
  onComplete,
  onBack,
}) => {
  const [currentDimension, setCurrentDimension] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [completedDimensions, setCompletedDimensions] = useState<boolean[]>(
    new Array(DIMENSIONS.length).fill(false)
  );
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 初始化第一条AI消息
  useEffect(() => {
    if (messages.length === 0) {
      addAIMessage(
        `欢迎来到灵感收束！我们将通过 ${DIMENSIONS.length} 个维度来构建你的小说蓝图。\n\n让我们从第一个维度开始：**${DIMENSIONS[0]}**\n\n请描述你想要创作的小说的核心概念是什么？`,
        ['我想写一个关于...的故事', '让我想想...', '我有一个大致的想法']
      );
    }
  }, []);

  const addAIMessage = (content: string, options?: string[]) => {
    const msg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'ai',
      content,
      options,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const addUserMessage = (content: string) => {
    const msg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    addUserMessage(text);
    setInputValue('');
    simulateAIResponse(text);
  };

  const handleOptionClick = (option: string) => {
    if (isLoading) return;
    addUserMessage(option);
    simulateAIResponse(option);
  };

  const simulateAIResponse = (_userInput: string) => {
    setIsLoading(true);

    // 模拟AI响应延迟
    setTimeout(() => {
      const nextDim = currentDimension + 1;

      if (nextDim < DIMENSIONS.length) {
        // 还有下一个维度
        addAIMessage(
          `很好！关于"${DIMENSIONS[currentDimension]}"的信息已记录。\n\n接下来是第 ${nextDim + 1} 个维度：**${DIMENSIONS[nextDim]}**\n\n请描述你的小说在${DIMENSIONS[nextDim]}方面的设定：`,
          ['参考经典作品', '我有明确的想法', '需要更多灵感']
        );
        setCurrentDimension(nextDim);
      } else {
        // 所有维度完成
        setCompletedDimensions((prev) =>
          prev.map((_, i) => (i <= currentDimension ? true : false))
        );
        const samplePreview = generateSamplePreview();
        setPreviewContent(samplePreview);
        setShowPreview(true);
        addAIMessage(
          `太棒了！所有 ${DIMENSIONS.length} 个维度的灵感收束已完成。\n\n我已经根据你的描述生成了项目蓝图（project.md）的预览，请查看并确认。`,
          []
        );
      }

      // 标记当前维度为已完成
      setCompletedDimensions((prev) => {
        const next = [...prev];
        next[currentDimension] = true;
        return next;
      });

      setIsLoading(false);
    }, 1500);
  };

  const generateSamplePreview = () => {
    return `# 项目蓝图

## 核心概念
基于灵感收束对话生成的核心概念描述...

## 世界观设定
- 时代背景：待完善
- 社会结构：待完善
- 力量体系：待完善

## 主角人设
- 姓名：待完善
- 性格特征：待完善
- 成长弧线：待完善

## 核心冲突
- 外部冲突：待完善
- 内部冲突：待完善

## 情感基调
整体基调：待完善

## 叙事视角
视角选择：待完善

## 关键转折
转折点规划：待完善

## 主题深度
核心主题：待完善

## 独特卖点
差异化元素：待完善

---
*由 NovelFlow 灵感收束引擎生成*`;
  };

  const handleConfirmPreview = () => {
    onComplete?.(previewContent);
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

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部：维度名称和进度 */}
      <div className="shrink-0 border-b border-slate-200">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <ArrowLeft size={18} />
              </button>
            )}
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
                      disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              icon={<Send size={16} />}
              className="shrink-0"
            >
              发送
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrainstormPanel;
