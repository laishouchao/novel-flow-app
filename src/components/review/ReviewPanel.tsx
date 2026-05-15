import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  ArrowLeft,
  Shield,
  Eye,
  BookOpen,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Ban,
  Type,
  Swords,
} from 'lucide-react';
import Button from '../common/Button';
import Badge from '../common/Badge';

type ReviewResult = 'pass' | 'minor_fix' | 'rewrite_required' | 'reject';
type GateStatus = 'pass' | 'warning' | 'fail';

interface GateCheck {
  name: string;
  icon: React.ReactNode;
  status: GateStatus;
  details: string;
}

interface Issue {
  id: string;
  category: 'banned_word' | 'ai_pattern' | 'formatting' | 'canon_conflict';
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  suggestion?: string;
}

interface ReviewPanelProps {
  result?: ReviewResult;
  gates?: GateCheck[];
  issues?: Issue[];
  onAccept?: () => void;
  onRewrite?: () => void;
  onBackToOutline?: () => void;
}

const resultConfig: Record<ReviewResult, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pass: {
    label: '通过',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: <CheckCircle2 size={24} className="text-emerald-500" />,
  },
  minor_fix: {
    label: '需要小修',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    icon: <AlertTriangle size={24} className="text-amber-500" />,
  },
  rewrite_required: {
    label: '需要重写',
    color: 'text-orange-700',
    bg: 'bg-orange-50 border-orange-200',
    icon: <AlertCircle size={24} className="text-orange-500" />,
  },
  reject: {
    label: '驳回',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: <XCircle size={24} className="text-red-500" />,
  },
};

const categoryConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  banned_word: { label: '禁用词命中', icon: <Ban size={14} />, color: 'text-red-600' },
  ai_pattern: { label: 'AI句式', icon: <Type size={14} />, color: 'text-amber-600' },
  formatting: { label: '排版问题', icon: <AlertCircle size={14} />, color: 'text-blue-600' },
  canon_conflict: { label: 'Canon冲突', icon: <Swords size={14} />, color: 'text-purple-600' },
};

const severityConfig: Record<string, { label: string; variant: 'danger' | 'warning' | 'info' }> = {
  error: { label: '错误', variant: 'danger' },
  warning: { label: '警告', variant: 'warning' },
  info: { label: '提示', variant: 'info' },
};

const sampleGates: GateCheck[] = [
  {
    name: '读者视角',
    icon: <Eye size={18} />,
    status: 'pass',
    details: '叙事流畅，读者代入感良好',
  },
  {
    name: '禁用词检查',
    icon: <Ban size={18} />,
    status: 'warning',
    details: '发现 2 个疑似禁用词',
  },
  {
    name: 'Canon 一致性',
    icon: <BookOpen size={18} />,
    status: 'pass',
    details: '与前文设定一致，无冲突',
  },
  {
    name: '升级感检查',
    icon: <TrendingUp size={18} />,
    status: 'fail',
    details: '本章缺少明确的升级感节点',
  },
];

const sampleIssues: Issue[] = [
  {
    id: '1',
    category: 'banned_word',
    severity: 'warning',
    message: '疑似禁用词："不禁"',
    line: 12,
    suggestion: '建议替换为更自然的表达',
  },
  {
    id: '2',
    category: 'banned_word',
    severity: 'warning',
    message: '疑似禁用词："竟然"',
    line: 25,
    suggestion: '可替换为"没想到"或"谁知"',
  },
  {
    id: '3',
    category: 'ai_pattern',
    severity: 'error',
    message: '检测到典型AI句式："然而，真正的挑战才刚刚开始"',
    line: 30,
    suggestion: '建议改写为更自然的转折表达',
  },
  {
    id: '4',
    category: 'ai_pattern',
    severity: 'warning',
    message: '连续使用"不仅...而且..."句式',
    line: 15,
    suggestion: '变换句式结构，避免重复',
  },
  {
    id: '5',
    category: 'formatting',
    severity: 'info',
    message: '段落过长（超过200字），建议适当分段',
    line: 8,
    suggestion: '在对话或场景转换处分段',
  },
  {
    id: '6',
    category: 'formatting',
    severity: 'info',
    message: '缺少场景转换标记',
    line: 20,
    suggestion: '在时间/地点转换时添加空行或分隔符',
  },
];

const ReviewPanel: React.FC<ReviewPanelProps> = ({
  result = 'minor_fix',
  gates = sampleGates,
  issues = sampleIssues,
  onAccept,
  onRewrite,
  onBackToOutline,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['banned_word', 'ai_pattern', 'formatting', 'canon_conflict'])
  );
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const config = resultConfig[result];

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleIssue = (id: string) => {
    setExpandedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 按类别分组
  const groupedIssues = issues.reduce<Record<string, Issue[]>>((acc, issue) => {
    if (!acc[issue.category]) acc[issue.category] = [];
    acc[issue.category].push(issue);
    return acc;
  }, {});

  const gateStatusIcon: Record<GateStatus, React.ReactNode> = {
    pass: <CheckCircle2 size={16} className="text-emerald-500" />,
    warning: <AlertTriangle size={16} className="text-amber-500" />,
    fail: <XCircle size={16} className="text-red-500" />,
  };

  const gateStatusBg: Record<GateStatus, string> = {
    pass: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    fail: 'bg-red-50 border-red-200',
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 审查结果概览 */}
      <div className={`shrink-0 px-5 py-4 border-b ${config.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {config.icon}
            <div>
              <h2 className={`text-lg font-bold ${config.color}`}>审查结果：{config.label}</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                共发现 {issues.length} 个问题，其中{' '}
                {issues.filter((i) => i.severity === 'error').length} 个错误，{' '}
                {issues.filter((i) => i.severity === 'warning').length} 个警告
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<ArrowLeft size={14} />} onClick={onBackToOutline}>
              返回大纲
            </Button>
            <Button variant="outline" size="sm" icon={<RotateCcw size={14} />} onClick={onRewrite}>
              重写
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle2 size={14} />}
              onClick={onAccept}
            >
              接受修改
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 四层闸门检查 */}
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Shield size={16} className="text-blue-600" />
            四层闸门检查
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {gates.map((gate) => (
              <div
                key={gate.name}
                className={`rounded-xl border p-3 ${gateStatusBg[gate.status]}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    {gate.icon}
                    <span className="text-sm font-medium">{gate.name}</span>
                  </div>
                  {gateStatusIcon[gate.status]}
                </div>
                <p className="text-xs text-slate-500">{gate.details}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 问题列表 */}
        <div className="px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            问题详情
          </h3>

          <div className="space-y-2">
            {Object.entries(groupedIssues).map(([category, categoryIssues]) => {
              const catConfig = categoryConfig[category];
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* 类别标题 */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={14} className="text-slate-400" />
                    )}
                    <span className={catConfig.color}>{catConfig.icon}</span>
                    <span className="text-sm font-medium text-slate-700">
                      {catConfig.label}
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      {categoryIssues.length}
                    </Badge>
                  </button>

                  {/* 问题列表 */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100">
                      {categoryIssues.map((issue) => {
                        const sevConfig = severityConfig[issue.severity];
                        const isIssueExpanded = expandedIssues.has(issue.id);

                        return (
                          <div key={issue.id} className="px-4 py-2.5">
                            <div
                              className="flex items-start gap-3 cursor-pointer"
                              onClick={() => toggleIssue(issue.id)}
                            >
                              {isIssueExpanded ? (
                                <ChevronDown size={14} className="text-slate-400 mt-0.5 shrink-0" />
                              ) : (
                                <ChevronRight size={14} className="text-slate-400 mt-0.5 shrink-0" />
                              )}
                              <Badge variant={sevConfig.variant} className="shrink-0 mt-0.5">
                                {sevConfig.label}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-700">
                                  {issue.message}
                                  {issue.line && (
                                    <span className="ml-2 text-xs text-slate-400 font-mono">
                                      (行 {issue.line})
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* 修复建议 */}
                            {isIssueExpanded && issue.suggestion && (
                              <div className="ml-7 mt-2 pl-3 border-l-2 border-blue-200">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Lightbulb size={12} className="text-blue-500" />
                                  <span className="text-xs font-medium text-blue-600">
                                    修复建议
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600">
                                  {issue.suggestion}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPanel;
