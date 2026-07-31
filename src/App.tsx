import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppState, useAppDispatch, uiActions, aiActions, selectWritingProgress } from './store';
import type { ProjectStage } from './types';
import { llmService } from './services/llm';
import { countChineseWords } from './utils/wordCount';
import Sidebar from './components/layout/Sidebar';
import StatusBar from './components/layout/StatusBar';
import ProjectList from './components/project/ProjectList';
import CreateProjectDialog from './components/project/CreateProjectDialog';
import BrainstormPanel from './components/brainstorm/BrainstormPanel';
import OutlinePanel from './components/outline/OutlinePanel';
import ChapterEditor from './components/editor/ChapterEditor';
import ReviewPanel from './components/review/ReviewPanel';
import SettingsPanel from './components/settings/SettingsPanel';
import CharacterPanel from './components/characters/CharacterPanel';
import WorldbuildingPanel from './components/world/WorldbuildingPanel';
import OutlineToolsPanel from './components/outline/OutlineToolsPanel';
import PromptManagerPanel from './components/settings/PromptManagerPanel';
import ExportPanel from './components/export/ExportPanel';
import { ToastProvider } from './components/common/Toast';
import NotificationCenter from './components/common/NotificationCenter';
import { aiPipeline } from './services/aiPipeline';
import {
  PenLine,
  BookOpen,
  Users,
  Globe,
  BookMarked,
  Search,
  FileCode,
  Download,
} from 'lucide-react';

// ============================================================================
// 辅助函数
// ============================================================================

/** 根据项目阶段计算当前步骤 (1-5) */
function getStepFromStage(stage?: ProjectStage): number {
  switch (stage) {
    case 'brainstorm': return 1;
    case 'outline': return 2;
    case 'draft': return 3;
    case 'review': return 4;
    case 'update': return 5;
    default: return 1;
  }
}

// ============================================================================
// 写作台内部 Tab 定义（项目级功能）
// ============================================================================

type WritingTab =
  | 'brainstorm'
  | 'outline'
  | 'editor'
  | 'review'
  | 'characters'
  | 'world'
  | 'outline-tools'
  | 'prompts'
  | 'export';

const WRITING_TABS: { key: WritingTab; label: string; icon: React.ReactNode }[] = [
  { key: 'brainstorm', label: '灵感', icon: <PenLine size={14} /> },
  { key: 'outline', label: '大纲', icon: <BookOpen size={14} /> },
  { key: 'editor', label: '写作', icon: <PenLine size={14} /> },
  { key: 'review', label: '审查', icon: <Search size={14} /> },
  { key: 'characters', label: '角色', icon: <Users size={14} /> },
  { key: 'world', label: '世界观', icon: <Globe size={14} /> },
  { key: 'outline-tools', label: '伏笔/情节线', icon: <BookMarked size={14} /> },
  { key: 'prompts', label: '提示词', icon: <FileCode size={14} /> },
  { key: 'export', label: '导出', icon: <Download size={14} /> },
];

// ============================================================================
// 写作工作台 - 顶部 Tab + 内容面板
// ============================================================================

function WritingDesk() {
  const state = useAppState();

  const projectStatus = state.project.currentProject?.status;
  const projectStage = state.project.currentProject?.stage;

  // 根据项目状态决定默认 Tab
  const getDefaultTab = (): WritingTab => {
    if (projectStage === 'outline' || projectStatus === 'planned') return 'outline';
    if (projectStatus === 'idea' && projectStage === 'brainstorm') return 'brainstorm';
    if (projectStatus === 'drafting') return 'editor';
    if (projectStatus === 'reviewing') return 'review';
    return 'editor';
  };

  const [activeTab, setActiveTab] = useState<WritingTab>(getDefaultTab);

  // 追踪用户是否手动选择了辅助 Tab（不自动切换）
  const userSelectedAuxRef = useRef(false);

  // 仅在项目 stage/status 变化时自动切换（不响应 currentView 变化）
  useEffect(() => {
    if (userSelectedAuxRef.current) return; // 用户手动选了辅助 tab，不自动切换
    setActiveTab(getDefaultTab());
  }, [projectStage, projectStatus]);

  // 缓存总字数计算
  const totalWordCount = useMemo(
    () => state.project.chapters.reduce((sum, c) => sum + c.wordCount, 0),
    [state.project.chapters]
  );

  // 无项目时跳转到项目管理
  if (!state.project.currentProject) {
    return <Navigate to="/project" replace />;
  }

  // 渲染当前 Tab 对应的面板
  const renderPanel = () => {
    switch (activeTab) {
      case 'brainstorm': return <BrainstormPanel />;
      case 'outline': return <OutlinePanel />;
      case 'editor': return <ChapterEditor />;
      case 'review': return <ReviewPanel />;
      case 'characters': return <CharacterPanel />;
      case 'world': return <WorldbuildingPanel />;
      case 'outline-tools': return <OutlineToolsPanel />;
      case 'prompts': return <PromptManagerPanel />;
      case 'export': return <ExportPanel />;
      default: return <ChapterEditor />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部 Tab 栏 */}
      <div className="flex items-center border-b border-slate-200 bg-white px-2 shrink-0 overflow-x-auto">
        {WRITING_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              // 辅助 Tab 标记为用户手动选择，不被自动切换覆盖
              const auxTabs: WritingTab[] = ['characters', 'world', 'outline-tools', 'prompts', 'export'];
              userSelectedAuxRef.current = auxTabs.includes(tab.key);
            }}
            className={`
              flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap
              border-b-2 transition-colors
              ${activeTab === tab.key
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">{renderPanel()}</div>

      {/* 底部状态栏 */}
      <StatusBar
        projectName={state.project.currentProject.name}
        volumeIndex={state.project.currentProject.currentVolume}
        chapterIndex={state.project.currentProject.currentChapter}
        projectStatus={state.project.currentProject.status}
        chapterWordCount={countChineseWords(state.editor.editorContent)}
        totalWordCount={totalWordCount}
        targetWordCount={state.project.currentProject.targetWords}
        aiModelStatus={state.ai.config?.llmConfigs && state.ai.config.llmConfigs.length > 0 ? 'connected' : 'disconnected'}
        aiModelName={state.ai.activeLLM?.model ?? (state.ai.config?.llmConfigs && state.ai.config.llmConfigs.length > 0 ? state.ai.config.llmConfigs[0].model : '未配置')}
      />
    </div>
  );
}

// ============================================================================
// 项目管理页面
// ============================================================================

function ProjectManager() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ProjectList />
      </div>
    </div>
  );
}

// ============================================================================
// 设置页面
// ============================================================================

function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <SettingsPanel />
      </div>
    </div>
  );
}

// ============================================================================
// 主应用布局
// ============================================================================

function AppLayout() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const currentProject = state.project.currentProject;
  const progress = selectWritingProgress(state);

  // 初始化 LLM 服务配置提供者
  useEffect(() => {
    llmService.setConfigProvider(() => {
      const aiConfig = state.ai.config;
      if (!aiConfig || !aiConfig.llmConfigs || aiConfig.llmConfigs.length === 0) {
        return null;
      }
      return {
        llmConfigs: aiConfig.llmConfigs.map(c => ({
          id: c.id,
          name: c.name,
          baseUrl: c.baseUrl,
          apiKey: c.apiKey,
          model: c.model,
          maxTokens: c.maxTokens,
          temperature: c.temperature,
          timeout: c.timeout,
          proxyUrl: c.proxyUrl,
        })),
        taskAssignment: aiConfig.taskAssignment,
        proxySetting: aiConfig.proxySetting,
      };
    });
  }, [state.ai.config]);

  // 设置 AI Pipeline 回调，桥接到 store
  useEffect(() => {
    aiPipeline.setCallbacks({
      onGeneratingChange: (isGenerating, task) => {
        dispatch(aiActions.setGenerating(isGenerating, task));
      },
      onStreamToken: (token) => {
        dispatch(aiActions.streamToken(token));
      },
    });
  }, [dispatch]);

  // Sidebar 导航（只有 3 个全局项）
  const currentNav: 'writing' | 'projects' | 'settings' =
    location.pathname.startsWith('/project') ? 'projects' :
    location.pathname.startsWith('/settings') ? 'settings' :
    'writing';

  const isDarkTheme = state.ui.editorPrefs.theme === 'dark';

  const handleNavChange = useCallback((nav: 'writing' | 'projects' | 'settings') => {
    switch (nav) {
      case 'writing': navigate('/'); break;
      case 'projects': navigate('/project'); break;
      case 'settings': navigate('/settings'); break;
    }
  }, [navigate]);

  const handleToggleCollapse = useCallback(() => {
    dispatch(uiActions.toggleSidebar());
  }, [dispatch]);

  return (
    <div className={`flex h-screen ${isDarkTheme ? 'dark' : ''}`}>
    <div className="flex h-full w-full bg-gray-50 dark:bg-slate-900">
      <Sidebar
        currentNav={currentNav}
        onNavChange={handleNavChange}
        collapsed={!state.ui.sidebarOpen}
        onToggleCollapse={handleToggleCollapse}
        projectInfo={currentProject ? {
          name: currentProject.name,
          status: currentProject.status,
          progress,
        } : undefined}
        currentStep={currentProject ? getStepFromStage(currentProject.stage) : undefined}
      />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<WritingDesk />} />
          <Route path="/project" element={<ProjectManager />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <CreateProjectDialog />
      <NotificationCenter />
      </div>
    </div>
  );
}

// ============================================================================
// 根组件：注入全局状态
// ============================================================================

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ToastProvider>
          <AppLayout />
        </ToastProvider>
      </BrowserRouter>
    </AppProvider>
  );
}
