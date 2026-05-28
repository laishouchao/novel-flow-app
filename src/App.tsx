import { useCallback, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useAppState, useAppDispatch, uiActions, selectWritingProgress } from './store';
import type { ProjectStage } from './types';
import { llmService } from './services/llm';
import Sidebar from './components/layout/Sidebar';
import StatusBar from './components/layout/StatusBar';
import ProjectList from './components/project/ProjectList';
import CreateProjectDialog from './components/project/CreateProjectDialog';
import BrainstormPanel from './components/brainstorm/BrainstormPanel';
import OutlinePanel from './components/outline/OutlinePanel';
import ChapterEditor from './components/editor/ChapterEditor';
import ReviewPanel from './components/review/ReviewPanel';
import SettingsPanel from './components/settings/SettingsPanel';
import { ToastProvider } from './components/common/Toast';

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

/** 将路由路径映射为 Sidebar 导航项 */
function navFromPath(pathname: string): 'writing' | 'projects' | 'settings' {
  if (pathname.startsWith('/project')) return 'projects';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'writing';
}

// ============================================================================
// 写作工作台 - 根据项目状态显示不同面板
// ============================================================================

function WritingDesk() {
  const state = useAppState();

  const currentView = state.ui.currentView;
  const projectStatus = state.project.currentProject?.status;
  const projectStage = state.project.currentProject?.stage;

  // 缓存总字数计算，避免每次渲染都重新计算
  const totalWordCount = useMemo(
    () => state.project.chapters.reduce((sum, c) => sum + c.wordCount, 0),
    [state.project.chapters]
  );

  // 无项目时跳转到项目管理
  if (!state.project.currentProject) {
    return <Navigate to="/project" replace />;
  }

  // 根据项目状态自动路由到对应面板
  const renderMainPanel = () => {
    // 编辑器和审查视图始终优先
    if (currentView === 'editor') return <ChapterEditor />;
    if (currentView === 'review') return <ReviewPanel />;

    // 大纲阶段优先于 brainstorm 视图（防止 brainstorm 完成后残留旧视图）
    if (projectStage === 'outline' || projectStatus === 'planned') {
      return <OutlinePanel />;
    }

    // 用户手动切换的 brainstorm 视图
    if (currentView === 'brainstorm') return <BrainstormPanel />;

    // 根据状态机自动路由
    if (projectStatus === 'idea' && projectStage === 'brainstorm') {
      return <BrainstormPanel />;
    }
    if (projectStatus === 'idea' && !projectStage) {
      return <OutlinePanel />;
    }
    if (projectStatus === 'drafting') {
      return <ChapterEditor />;
    }
    if (projectStatus === 'reviewing') {
      return <ReviewPanel />;
    }
    if (projectStatus === 'done') {
      return <ChapterEditor />;
    }
    if (projectStatus === 'blocked') {
      return <OutlinePanel />;
    }

    // 默认显示编辑器
    return <ChapterEditor />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">{renderMainPanel()}</div>
      <StatusBar
        projectName={state.project.currentProject.name}
        volumeIndex={state.project.currentProject.currentVolume}
        chapterIndex={state.project.currentProject.currentChapter}
        projectStatus={state.project.currentProject.status}
        chapterWordCount={state.editor.currentChapter?.wordCount}
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

  // Sidebar 导航
  const currentNav = navFromPath(location.pathname);

  // 读取并应用主题设置
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
