import React from 'react';
import { FileText, Cpu, Wifi, WifiOff } from 'lucide-react';
import { ProjectStatusBadge } from '../common/Badge';

interface StatusBarProps {
  projectName?: string;
  volumeIndex?: number;
  chapterIndex?: number;
  projectStatus?: string;
  chapterWordCount?: number;
  totalWordCount?: number;
  targetWordCount?: number;
  aiModelStatus?: 'connected' | 'disconnected' | 'loading';
  aiModelName?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({
  projectName = '未选择项目',
  volumeIndex,
  chapterIndex,
  projectStatus = 'idea',
  chapterWordCount = 0,
  totalWordCount = 0,
  targetWordCount = 500000,
  aiModelStatus = 'disconnected',
  aiModelName = '未配置',
}) => {
  const chapterLabel =
    volumeIndex !== undefined && chapterIndex !== undefined
      ? `第${volumeIndex}卷 第${chapterIndex}章`
      : '未选择章节';

  const wordCountLabel = `${chapterWordCount.toLocaleString()} / ${totalWordCount.toLocaleString()}`;

  return (
    <footer className="flex items-center justify-between h-8 px-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 select-none">
      {/* 左侧：项目名 + 章节 */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 truncate">
          <FileText size={13} className="shrink-0 text-slate-400" />
          <span className="truncate max-w-[180px] font-medium text-slate-700">
            {projectName}
          </span>
        </div>
        <span className="text-slate-300">|</span>
        <span>{chapterLabel}</span>
      </div>

      {/* 中间：项目状态 */}
      <div className="flex items-center">
        <ProjectStatusBadge status={projectStatus} />
      </div>

      {/* 右侧：字数统计 + AI状态 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">字数:</span>
          <span className="font-mono text-slate-600">{wordCountLabel}</span>
          <span className="text-slate-400">
            / {(targetWordCount / 10000).toFixed(0)}万字
          </span>
        </div>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-1.5">
          <Cpu size={13} className="text-slate-400" />
          <span className="text-slate-600">{aiModelName}</span>
          {aiModelStatus === 'connected' ? (
            <Wifi size={12} className="text-emerald-500" />
          ) : aiModelStatus === 'loading' ? (
            <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          ) : (
            <WifiOff size={12} className="text-slate-400" />
          )}
        </div>
      </div>
    </footer>
  );
};

export default StatusBar;
