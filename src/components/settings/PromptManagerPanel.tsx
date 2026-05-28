import React, { useState, useMemo, useCallback } from 'react';
import {
  Edit3,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileCode,
  BookOpen,
  PenLine,
  Search as SearchIcon,
  ClipboardCheck,
  Sparkles,
} from 'lucide-react';
import { useAppState, useAppDispatch, aiActions } from '../../store';
import { getAllSystemPrompts } from '../../prompts';
import Button from '../common/Button';

// ============================================================================
// 任务类型配置
// ============================================================================

interface TaskConfig {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const TASK_CONFIGS: TaskConfig[] = [
  { key: 'brainstorm', label: '灵感收束', description: '引导用户从模糊想法到完整项目蓝图', icon: <Sparkles size={16} />, color: 'text-purple-600' },
  { key: 'outline', label: '章节规划', description: '根据项目设定生成章节大纲', icon: <BookOpen size={16} />, color: 'text-blue-600' },
  { key: 'draft', label: '章节写作', description: '根据大纲生成高质量章节正文', icon: <PenLine size={16} />, color: 'text-emerald-600' },
  { key: 'review', label: '智能审查', description: '从读者视角审查章节质量', icon: <SearchIcon size={16} />, color: 'text-amber-600' },
  { key: 'finalization', label: '定稿更新', description: '更新全局摘要、角色状态、设定一致性', icon: <ClipboardCheck size={16} />, color: 'text-cyan-600' },
];

// ============================================================================
// 提示词卡片
// ============================================================================

function PromptCard({
  config,
  defaultPrompt,
  customPrompt,
  onSave,
  onReset,
}: {
  config: TaskConfig;
  defaultPrompt: string;
  customPrompt: string | undefined;
  onSave: (content: string) => void;
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [copied, setCopied] = useState(false);

  const activePrompt = customPrompt || defaultPrompt;
  const hasCustom = !!customPrompt;

  const handleEdit = () => {
    setEditContent(activePrompt);
    setEditing(true);
    setExpanded(true);
  };

  const handleSave = () => {
    onSave(editContent);
    setEditing(false);
  };

  const handleReset = () => {
    onReset();
    setEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // 变量提取
  const variables = useMemo(() => {
    const matches = activePrompt.match(/\{([^}]+)\}/g);
    return matches ? [...new Set(matches)] : [];
  }, [activePrompt]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* 头部 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <span className={config.color}>{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">{config.label}</h3>
            {hasCustom && (
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium border border-amber-200">
                已自定义
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {activePrompt.length} 字
          </span>
          <span className="text-slate-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </button>

      {/* 内容 */}
      {expanded && (
        <div className="border-t border-slate-100">
          {/* 工具栏 */}
          <div className="flex items-center gap-2 px-5 py-2 bg-slate-50">
            <Button variant="ghost" size="sm" icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={handleCopy}>
              {copied ? '已复制' : '复制'}
            </Button>
            {!editing ? (
              <Button variant="ghost" size="sm" icon={<Edit3 size={14} />} onClick={handleEdit}>
                编辑
              </Button>
            ) : (
              <>
                <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={handleSave}>
                  保存
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  取消
                </Button>
              </>
            )}
            {hasCustom && (
              <Button variant="ghost" size="sm" icon={<RotateCcw size={14} />} onClick={handleReset} className="text-amber-600">
                恢复默认
              </Button>
            )}
            {variables.length > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] text-slate-500">变量:</span>
                {variables.slice(0, 5).map(v => (
                  <span key={v} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-mono">
                    {v}
                  </span>
                ))}
                {variables.length > 5 && (
                  <span className="text-[10px] text-slate-400">+{variables.length - 5}</span>
                )}
              </div>
            )}
          </div>

          {/* 提示词内容 */}
          <div className="px-5 py-4 max-h-96 overflow-y-auto">
            {editing ? (
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  resize-none bg-slate-50"
                rows={20}
                spellCheck={false}
              />
            ) : (
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {activePrompt}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 主面板
// ============================================================================

export default function PromptManagerPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  // 获取所有默认系统提示词
  const defaultPrompts = useMemo(() => getAllSystemPrompts(), []);

  // 获取自定义提示词覆盖
  const customPrompts = useMemo(() => {
    const raw = state.ai.config?.customPrompts;
    return (raw as Record<string, string>) || {};
  }, [state.ai.config]);

  const [search, setSearch] = useState('');

  // 保存自定义提示词
  const handleSave = useCallback((taskType: string, content: string) => {
    const updated = { ...customPrompts, [taskType]: content };
    dispatch(aiActions.updateConfig({ customPrompts: updated }));
  }, [customPrompts, dispatch]);

  // 恢复默认
  const handleReset = useCallback((taskType: string) => {
    const updated = { ...customPrompts };
    delete updated[taskType];
    dispatch(aiActions.updateConfig({ customPrompts: updated }));
  }, [customPrompts, dispatch]);

  // 搜索过滤
  const filteredConfigs = useMemo(() => {
    if (!search.trim()) return TASK_CONFIGS;
    const q = search.toLowerCase();
    return TASK_CONFIGS.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.key.toLowerCase().includes(q)
    );
  }, [search]);

  // 统计
  const customCount = Object.keys(customPrompts).filter(k => customPrompts[k]?.trim()).length;

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <FileCode size={22} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">提示词管理</h2>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {customCount > 0 ? `${customCount} 个已自定义` : '全部默认'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索提示词..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                placeholder:text-slate-400"
            />
          </div>
          <p className="text-xs text-slate-500">
            查看和自定义各阶段的 AI 提示词模板
          </p>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredConfigs.map(config => (
          <PromptCard
            key={config.key}
            config={config}
            defaultPrompt={defaultPrompts[config.key] || ''}
            customPrompt={customPrompts[config.key]}
            onSave={(content) => handleSave(config.key, content)}
            onReset={() => handleReset(config.key)}
          />
        ))}

        {filteredConfigs.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <FileCode size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">没有匹配的提示词</p>
          </div>
        )}
      </div>
    </div>
  );
}
