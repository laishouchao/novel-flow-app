import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useAppState } from "./store";
import Sidebar from "./components/layout/Sidebar";
import StatusBar from "./components/layout/StatusBar";
import ProjectList from "./components/project/ProjectList";
import CreateProjectDialog from "./components/project/CreateProjectDialog";
import BrainstormPanel from "./components/brainstorm/BrainstormPanel";
import OutlinePanel from "./components/outline/OutlinePanel";
import ChapterEditor from "./components/editor/ChapterEditor";
import ReviewPanel from "./components/review/ReviewPanel";
import SettingsPanel from "./components/settings/SettingsPanel";
import Toast from "./components/common/Toast";

/* ====== 写作工作台 - 根据项目状态显示不同面板 ====== */
function WritingDesk() {
  const state = useAppState();

  const currentView = state.ui.currentView;
  const projectStatus = state.project.currentProject?.status;
  const projectStage = state.project.currentProject?.stage;

  // 无项目时跳转到项目管理
  if (!state.project.currentProject) {
    return <Navigate to="/project" replace />;
  }

  // 根据项目状态自动路由到对应面板
  const renderMainPanel = () => {
    // 用户手动切换视图时优先显示
    if (currentView === "editor") return <OutlinePanel />;
    if (currentView === "review") return <ReviewPanel />;
    if (currentView === "brainstorm") return <BrainstormPanel />;

    // 根据状态机自动路由
    if (projectStatus === "idea" && projectStage === "brainstorm") {
      return <BrainstormPanel />;
    }
    if (projectStatus === "idea" && (projectStage === "outline" || !projectStage)) {
      return <OutlinePanel />;
    }
    if (projectStatus === "planned") {
      return <OutlinePanel />;
    }
    if (projectStatus === "drafting") {
      return <ChapterEditor />;
    }
    if (projectStatus === "reviewing") {
      return <ReviewPanel />;
    }
    if (projectStatus === "done") {
      return <ChapterEditor />;
    }
    if (projectStatus === "blocked") {
      return <OutlinePanel />;
    }

    // 默认显示编辑器
    return <ChapterEditor />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">{renderMainPanel()}</div>
      <StatusBar />
    </div>
  );
}

/* ====== 项目管理页面 ====== */
function ProjectManager() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ProjectList />
      </div>
    </div>
  );
}

/* ====== 设置页面 ====== */
function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <SettingsPanel />
      </div>
    </div>
  );
}

/* ====== 主应用布局 ====== */
function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<WritingDesk />} />
          <Route path="/project" element={<ProjectManager />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <CreateProjectDialog open={false} onClose={() => {}} />
      <Toast message="" visible={false} />
    </div>
  );
}

/* ====== 根组件：注入全局状态 ====== */
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </AppProvider>
  );
}
