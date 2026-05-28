import React from 'react';
import {
  PenLine,
  FolderKanban,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { StepProgressBar } from '../common/ProgressBar';
import { ProjectStatusBadge } from '../common/Badge';

type NavItem = 'writing' | 'projects' | 'settings';

interface SidebarProps {
  currentNav?: NavItem;
  onNavChange?: (nav: NavItem) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  projectInfo?: {
    name: string;
    status: string;
    progress: number;
  };
  currentStep?: number;
}

const navItems: { key: NavItem; label: string; icon: React.ReactNode }[] = [
  { key: 'writing', label: '写作台', icon: <PenLine size={20} /> },
  { key: 'projects', label: '项目管理', icon: <FolderKanban size={20} /> },
  { key: 'settings', label: '设置', icon: <Settings size={20} /> },
];

const writingSteps = ['灵感', '大纲', '写作', '审查', '同步'];

const Sidebar: React.FC<SidebarProps> = ({
  currentNav = 'writing',
  onNavChange,
  collapsed = false,
  onToggleCollapse,
  projectInfo,
  currentStep = 2,
}) => {
  return (
    <aside
      className={`
        flex flex-col h-full bg-slate-900 text-white
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo 区域 */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">
            Novel<span className="text-blue-400">Flow</span>
          </span>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavChange?.(item.key)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-colors duration-150
              ${
                currentNav === item.key
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }
            `}
            title={collapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        {/* 当前项目信息卡片 */}
        {projectInfo && currentNav === 'writing' && !collapsed && (
          <div className="mt-6 mx-1 p-3 rounded-lg bg-slate-800/80 border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-1">当前项目</p>
            <p className="text-sm font-medium text-slate-200 truncate">
              {projectInfo.name}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <ProjectStatusBadge status={projectInfo.status} />
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500">写作进度</span>
                <span className="text-[10px] text-slate-400">
                  {projectInfo.progress}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${projectInfo.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 写作流程步骤指示器 */}
        {currentNav === 'writing' && !collapsed && (
          <div className="mt-6 mx-1">
            <p className="text-xs text-slate-500 mb-3 px-1">写作流程</p>
            <StepProgressBar steps={writingSteps} currentStep={currentStep} />
          </div>
        )}
      </nav>

      {/* 底部折叠按钮 */}
      <div className="px-2 py-3 border-t border-slate-700/50">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                     text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>收起侧栏</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
