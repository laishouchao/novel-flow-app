// ============================================================================
// Novel Flow - 全局状态管理系统
// ============================================================================
// 使用 React Context + useReducer 模式
// 包含 ProjectState / EditorState / AIState / UIState 四大状态域
// ============================================================================

import { createContext, useContext, useReducer, useState, useEffect, type Dispatch, type ReactNode } from 'react';
import type {
  NovelProject,
  Chapter,
  Volume,
  Character,
  BrainstormMessage,
  AppConfig,
  ReviewResult,
  StreamEvent,
  GlobalSummary,
  CanonEntry,
  CharacterState,
  CharacterChange,
  ProjectStatus,
  ProjectStage,
  ChapterStatus,
  AppView,
  EditorViewMode,
  SidebarPanel,
  Notification,
  DialogState,
  NovelStyle,
  LLMConfig,
  TaskModelAssignment,
  PresetStyle,
  ProxySetting,
} from '../types';
import { generateNotificationId } from '../utils/id';

// ============================================================================
// 状态定义
// ============================================================================

/** 项目状态域 */
export interface ProjectState {
  /** 项目列表 */
  projects: NovelProject[];
  /** 当前活跃项目 */
  currentProject: NovelProject | null;
  /** 当前项目的卷列表 */
  volumes: Volume[];
  /** 当前项目的章节列表 */
  chapters: Chapter[];
  /** 当前项目的角色列表 */
  characters: Character[];
  /** 全局摘要 */
  globalSummary: GlobalSummary | null;
  /** 灵感收束对话历史 */
  brainstormMessages: BrainstormMessage[];
  /** 项目加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
}

/** 编辑器状态域 */
export interface EditorState {
  /** 当前编辑的章节 */
  currentChapter: Chapter | null;
  /** 编辑器内容（草稿） */
  editorContent: string;
  /** 编辑器视图模式 */
  viewMode: EditorViewMode;
  /** 是否有未保存的更改 */
  isDirty: boolean;
  /** 上次保存时间 */
  lastSavedAt: string | null;
  /** 审查结果 */
  reviewResult: ReviewResult | null;
  /** 是否正在审查 */
  isReviewing: boolean;
}

/** AI 状态域 */
export interface AIState {
  /** 应用配置 */
  config: AppConfig | null;
  /** 当前使用的 LLM 配置 */
  activeLLM: LLMConfig | null;
  /** 是否正在生成 */
  isGenerating: boolean;
  /** 当前生成任务描述 */
  generatingTask: string | null;
  /** 流式输出缓冲区 */
  streamBuffer: string;
  /** 流式事件列表 */
  streamEvents: StreamEvent[];
  /** 当前任务类型 */
  currentTaskType: TaskModelAssignment[keyof TaskModelAssignment] | null;
}

/** UI 状态域 */
export interface UIState {
  /** 当前视图 */
  currentView: AppView;
  /** 侧边栏是否展开 */
  sidebarOpen: boolean;
  /** 侧边栏当前面板 */
  sidebarPanel: SidebarPanel;
  /** 对话框状态 */
  dialog: DialogState;
  /** 通知列表 */
  notifications: Notification[];
  /** 是否处于全屏模式 */
  isFullscreen: boolean;
  /** 编辑器偏好设置 */
  editorPrefs: {
    fontSize: number;
    lineHeight: number;
    autoSaveInterval: number;
    theme: 'light' | 'dark';
  };
}

/** 应用全局状态 */
export interface AppState {
  project: ProjectState;
  editor: EditorState;
  ai: AIState;
  ui: UIState;
}

// ============================================================================
// Action 定义
// ============================================================================

// ---- Project Actions ----

export type ProjectAction =
  | { type: 'PROJECT_SET_LIST'; payload: NovelProject[] }
  | { type: 'PROJECT_SET_CURRENT'; payload: NovelProject }
  | { type: 'PROJECT_CLEAR_CURRENT' }
  | { type: 'PROJECT_ADD'; payload: NovelProject }
  | { type: 'PROJECT_UPDATE'; payload: Partial<NovelProject> & Record<string, unknown> }
  | { type: 'PROJECT_DELETE'; payload: string }
  | { type: 'PROJECT_SET_STATUS'; payload: { status: ProjectStatus; blockedReason?: string } }
  | { type: 'PROJECT_SET_STAGE'; payload: ProjectStage }
  | { type: 'PROJECT_SET_LOADING'; payload: boolean }
  | { type: 'PROJECT_SET_ERROR'; payload: string | null }
  | { type: 'VOLUME_SET_LIST'; payload: Volume[] }
  | { type: 'VOLUME_ADD'; payload: Volume }
  | { type: 'VOLUME_UPDATE'; payload: { id: string; updates: Partial<Volume> } }
  | { type: 'VOLUME_DELETE'; payload: string }
  | { type: 'CHAPTER_SET_LIST'; payload: Chapter[] }
  | { type: 'CHAPTER_ADD'; payload: Chapter }
  | { type: 'CHAPTER_UPDATE'; payload: { id: string; updates: Partial<Chapter> } }
  | { type: 'CHAPTER_DELETE'; payload: string }
  | { type: 'CHAPTER_SET_STATUS'; payload: { id: string; status: ChapterStatus } }
  | { type: 'CHARACTER_SET_LIST'; payload: Character[] }
  | { type: 'CHARACTER_ADD'; payload: Character }
  | { type: 'CHARACTER_UPDATE'; payload: { id: string; updates: Partial<Character> } }
  | { type: 'CHARACTER_DELETE'; payload: string }
  | { type: 'CHARACTER_UPDATE_STATE'; payload: { id: string; state: CharacterState } }
  | { type: 'CHARACTER_ADD_CHANGE'; payload: { characterId: string; change: CharacterChange } }
  | { type: 'CANON_ADD_ENTRY'; payload: CanonEntry }
  | { type: 'GLOBAL_SUMMARY_SET'; payload: GlobalSummary }
  | { type: 'BRAINSTORM_ADD_MESSAGE'; payload: BrainstormMessage }
  | { type: 'BRAINSTORM_SET_MESSAGES'; payload: BrainstormMessage[] }
  | { type: 'BRAINSTORM_CLEAR' };

// ---- Editor Actions ----

export type EditorAction =
  | { type: 'EDITOR_SET_CHAPTER'; payload: Chapter | null }
  | { type: 'EDITOR_SET_CONTENT'; payload: string }
  | { type: 'EDITOR_APPEND_CONTENT'; payload: string }
  | { type: 'EDITOR_SET_VIEW_MODE'; payload: EditorViewMode }
  | { type: 'EDITOR_SET_DIRTY'; payload: boolean }
  | { type: 'EDITOR_MARK_SAVED'; payload: string }
  | { type: 'EDITOR_SET_REVIEW_RESULT'; payload: ReviewResult | null }
  | { type: 'EDITOR_SET_REVIEWING'; payload: boolean }
  | { type: 'EDITOR_RESET' };

// ---- AI Actions ----

export type AIAction =
  | { type: 'AI_SET_CONFIG'; payload: AppConfig }
  | { type: 'AI_UPDATE_CONFIG'; payload: Partial<AppConfig> }
  | { type: 'AI_SET_ACTIVE_LLM'; payload: LLMConfig | null }
  | { type: 'AI_ADD_LLM_CONFIG'; payload: LLMConfig }
  | { type: 'AI_UPDATE_LLM_CONFIG'; payload: { id: string; updates: Partial<LLMConfig> } }
  | { type: 'AI_DELETE_LLM_CONFIG'; payload: string }
  | { type: 'AI_SET_TASK_ASSIGNMENT'; payload: TaskModelAssignment }
  | { type: 'AI_SET_DEFAULT_STYLE'; payload: PresetStyle }
  | { type: 'AI_ADD_CUSTOM_STYLE'; payload: NovelStyle }
  | { type: 'AI_UPDATE_CUSTOM_STYLE'; payload: { name: string; updates: Partial<NovelStyle> } }
  | { type: 'AI_DELETE_CUSTOM_STYLE'; payload: string }
  | { type: 'AI_SET_PROXY'; payload: ProxySetting }
  | { type: 'AI_ADD_RECENT_PROJECT'; payload: string }
  | { type: 'AI_SET_GENERATING'; payload: { generating: boolean; task?: string; taskType?: string } }
  | { type: 'AI_STREAM_TOKEN'; payload: string }
  | { type: 'AI_STREAM_EVENT'; payload: StreamEvent }
  | { type: 'AI_CLEAR_STREAM' }
  | { type: 'AI_RESET' };

// ---- UI Actions ----

export type UIAction =
  | { type: 'UI_SET_VIEW'; payload: AppView }
  | { type: 'UI_TOGGLE_SIDEBAR' }
  | { type: 'UI_SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'UI_SET_SIDEBAR_PANEL'; payload: SidebarPanel }
  | { type: 'UI_OPEN_DIALOG'; payload: DialogState }
  | { type: 'UI_CLOSE_DIALOG' }
  | { type: 'UI_ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'createdAt'> }
  | { type: 'UI_REMOVE_NOTIFICATION'; payload: string }
  | { type: 'UI_CLEAR_NOTIFICATIONS' }
  | { type: 'UI_SET_FULLSCREEN'; payload: boolean }
  | { type: 'UI_SET_EDITOR_PREFS'; payload: UIState['editorPrefs'] }
  | { type: 'UI_RESET' };

/** 所有 Action 的联合类型 */
export type AppAction =
  | { domain: 'project'; action: ProjectAction }
  | { domain: 'editor'; action: EditorAction }
  | { domain: 'ai'; action: AIAction }
  | { domain: 'ui'; action: UIAction };

// ============================================================================
// 初始状态
// ============================================================================

const initialProjectState: ProjectState = {
  projects: [],
  currentProject: null,
  volumes: [],
  chapters: [],
  characters: [],
  globalSummary: null,
  brainstormMessages: [],
  loading: false,
  error: null,
};

const initialEditorState: EditorState = {
  currentChapter: null,
  editorContent: '',
  viewMode: 'edit',
  isDirty: false,
  lastSavedAt: null,
  reviewResult: null,
  isReviewing: false,
};

const initialAIState: AIState = {
  config: null,
  activeLLM: null,
  isGenerating: false,
  generatingTask: null,
  streamBuffer: '',
  streamEvents: [],
  currentTaskType: null,
};

const initialUIState: UIState = {
  currentView: 'home',
  sidebarOpen: true,
  sidebarPanel: 'chapters',
  dialog: { type: null, open: false },
  notifications: [],
  isFullscreen: false,
  editorPrefs: {
    fontSize: 16,
    lineHeight: 1.8,
    autoSaveInterval: 30,
    theme: 'light',
  },
};

export const initialState: AppState = {
  project: initialProjectState,
  editor: initialEditorState,
  ai: initialAIState,
  ui: initialUIState,
};

// ============================================================================
// Reducer - Project
// ============================================================================

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    // ---- 项目列表 ----
    case 'PROJECT_SET_LIST':
      return { ...state, projects: action.payload, loading: false, error: null };

    case 'PROJECT_SET_CURRENT': {
      // 切换项目时，重置所有项目关联状态，防止旧项目数据污染新项目
      const isNewProject = state.currentProject?.id !== action.payload.id;
      const proj = action.payload as NovelProject & Record<string, unknown>;
      return {
        ...state,
        currentProject: action.payload,
        loading: false,
        error: null,
        // 仅在切换到不同项目时重置关联状态
        // 但如果项目对象上已有数据（从 PROJECT_UPDATE 存储的），则恢复而非清空
        ...(isNewProject ? {
          volumes: Array.isArray(proj.volumes) ? proj.volumes as Volume[] : [],
          chapters: Array.isArray(proj.chapters) ? proj.chapters as Chapter[] : [],
          characters: Array.isArray(proj.characters) ? proj.characters as Character[] : [],
          globalSummary: (proj.globalSummary as GlobalSummary) ?? null,
          brainstormMessages: Array.isArray(proj.brainstormMessages) ? proj.brainstormMessages as BrainstormMessage[] : [],
        } : {}),
      };
    }

    case 'PROJECT_CLEAR_CURRENT':
      return {
        ...state,
        currentProject: null,
        volumes: [],
        chapters: [],
        characters: [],
        globalSummary: null,
        brainstormMessages: [],
      };

    case 'PROJECT_ADD':
      return {
        ...state,
        projects: [...state.projects, action.payload],
        currentProject: action.payload,
        // 创建新项目时重置所有关联状态
        volumes: [],
        chapters: [],
        characters: [],
        globalSummary: null,
        brainstormMessages: [],
      };

    case 'PROJECT_UPDATE': {
      const updates = action.payload;
      if (!state.currentProject) return state;
      const updated = { ...state.currentProject, ...updates, updatedAt: new Date().toISOString() };
      // 同步分离字段：当 updates 中包含 volumes/chapters/characters 等数据时，
      // 同时更新顶层分离字段，确保 OutlinePanel 等组件能读取到数据
      const fieldSync: Partial<ProjectState> = {};
      if ('volumes' in updates && Array.isArray(updates.volumes)) {
        fieldSync.volumes = updates.volumes as Volume[];
      }
      if ('chapters' in updates && Array.isArray(updates.chapters)) {
        fieldSync.chapters = updates.chapters as Chapter[];
      }
      if ('characters' in updates && Array.isArray(updates.characters)) {
        fieldSync.characters = updates.characters as Character[];
      }
      if ('globalSummary' in updates) {
        fieldSync.globalSummary = updates.globalSummary as GlobalSummary | null;
      }
      if ('brainstormMessages' in updates && Array.isArray(updates.brainstormMessages)) {
        fieldSync.brainstormMessages = updates.brainstormMessages as BrainstormMessage[];
      }
      return {
        ...state,
        currentProject: updated,
        projects: state.projects.map((p) =>
          p.id === updated.id ? updated : p
        ),
        ...fieldSync,
      };
    }

    case 'PROJECT_DELETE':
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.payload),
        currentProject:
          state.currentProject?.id === action.payload ? null : state.currentProject,
      };

    case 'PROJECT_SET_STATUS': {
      if (!state.currentProject) return state;
      const { status, blockedReason } = action.payload;
      const updated = {
        ...state.currentProject,
        status,
        blockedReason: status === 'blocked' ? blockedReason : undefined,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        currentProject: updated,
        projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
      };
    }

    case 'PROJECT_SET_STAGE': {
      if (!state.currentProject) return state;
      const updated = {
        ...state.currentProject,
        stage: action.payload,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        currentProject: updated,
        projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
      };
    }

    case 'PROJECT_SET_LOADING':
      return { ...state, loading: action.payload };

    case 'PROJECT_SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    // ---- 卷 ----
    case 'VOLUME_SET_LIST':
      return { ...state, volumes: action.payload };

    case 'VOLUME_ADD':
      return { ...state, volumes: [...state.volumes, action.payload] };

    case 'VOLUME_UPDATE':
      return {
        ...state,
        volumes: state.volumes.map((v) =>
          v.id === action.payload.id ? { ...v, ...action.payload.updates } : v
        ),
      };

    case 'VOLUME_DELETE':
      return { ...state, volumes: state.volumes.filter((v) => v.id !== action.payload) };

    // ---- 章节 ----
    case 'CHAPTER_SET_LIST':
      return { ...state, chapters: action.payload };

    case 'CHAPTER_ADD':
      return { ...state, chapters: [...state.chapters, action.payload] };

    case 'CHAPTER_UPDATE':
      return {
        ...state,
        chapters: state.chapters.map((c) =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        ),
      };

    case 'CHAPTER_DELETE':
      return { ...state, chapters: state.chapters.filter((c) => c.id !== action.payload) };

    case 'CHAPTER_SET_STATUS':
      return {
        ...state,
        chapters: state.chapters.map((c) =>
          c.id === action.payload.id
            ? { ...c, status: action.payload.status, updatedAt: new Date().toISOString() }
            : c
        ),
      };

    // ---- 角色 ----
    case 'CHARACTER_SET_LIST':
      return { ...state, characters: action.payload };

    case 'CHARACTER_ADD':
      return { ...state, characters: [...state.characters, action.payload] };

    case 'CHARACTER_UPDATE':
      return {
        ...state,
        characters: state.characters.map((ch) =>
          ch.id === action.payload.id ? { ...ch, ...action.payload.updates } : ch
        ),
      };

    case 'CHARACTER_DELETE':
      return { ...state, characters: state.characters.filter((ch) => ch.id !== action.payload) };

    case 'CHARACTER_UPDATE_STATE':
      return {
        ...state,
        characters: state.characters.map((ch) =>
          ch.id === action.payload.id
            ? { ...ch, currentState: action.payload.state }
            : ch
        ),
      };

    case 'CHARACTER_ADD_CHANGE':
      return {
        ...state,
        characters: state.characters.map((ch) =>
          ch.id === action.payload.characterId
            ? { ...ch, changeLog: [...ch.changeLog, action.payload.change] }
            : ch
        ),
      };

    // ---- Canon ----
    case 'CANON_ADD_ENTRY': {
      if (!state.currentProject) return state;
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          canonLog: [...state.currentProject.canonLog, action.payload],
          updatedAt: new Date().toISOString(),
        },
      };
    }

    // ---- 全局摘要 ----
    case 'GLOBAL_SUMMARY_SET':
      return { ...state, globalSummary: action.payload };

    // ---- 灵感收束 ----
    case 'BRAINSTORM_ADD_MESSAGE':
      return { ...state, brainstormMessages: [...state.brainstormMessages, action.payload] };

    case 'BRAINSTORM_SET_MESSAGES':
      return { ...state, brainstormMessages: action.payload };

    case 'BRAINSTORM_CLEAR':
      return { ...state, brainstormMessages: [] };

    default:
      return state;
  }
}

// ============================================================================
// Reducer - Editor
// ============================================================================

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'EDITOR_SET_CHAPTER':
      return {
        ...state,
        currentChapter: action.payload,
        editorContent: action.payload?.draftContent ?? '',
        isDirty: false,
        reviewResult: null,
      };

    case 'EDITOR_SET_CONTENT':
      return {
        ...state,
        editorContent: action.payload,
        isDirty: action.payload !== (state.currentChapter?.draftContent ?? ''),
      };

    case 'EDITOR_APPEND_CONTENT':
      return {
        ...state,
        editorContent: state.editorContent + action.payload,
        isDirty: true,
      };

    case 'EDITOR_SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'EDITOR_SET_DIRTY':
      return { ...state, isDirty: action.payload };

    case 'EDITOR_MARK_SAVED':
      return { ...state, isDirty: false, lastSavedAt: action.payload };

    case 'EDITOR_SET_REVIEW_RESULT':
      return { ...state, reviewResult: action.payload, isReviewing: false };

    case 'EDITOR_SET_REVIEWING':
      return { ...state, isReviewing: action.payload };

    case 'EDITOR_RESET':
      return { ...initialEditorState };

    default:
      return state;
  }
}

// ============================================================================
// Reducer - AI
// ============================================================================

function aiReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case 'AI_SET_CONFIG':
      return { ...state, config: action.payload };

    case 'AI_UPDATE_CONFIG': {
      if (!state.config) return state;
      return { ...state, config: { ...state.config, ...action.payload } };
    }

    case 'AI_SET_ACTIVE_LLM':
      return { ...state, activeLLM: action.payload };

    case 'AI_ADD_LLM_CONFIG': {
      if (!state.config) return state;
      return {
        ...state,
        config: {
          ...state.config,
          llmConfigs: [...state.config.llmConfigs, action.payload],
        },
      };
    }

    case 'AI_UPDATE_LLM_CONFIG': {
      if (!state.config) return state;
      return {
        ...state,
        config: {
          ...state.config,
          llmConfigs: state.config.llmConfigs.map((c) =>
            c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
          ),
        },
      };
    }

    case 'AI_DELETE_LLM_CONFIG': {
      if (!state.config) return state;
      return {
        ...state,
        config: {
          ...state.config,
          llmConfigs: state.config.llmConfigs.filter((c) => c.id !== action.payload),
        },
        activeLLM:
          state.activeLLM?.id === action.payload ? null : state.activeLLM,
      };
    }

    case 'AI_SET_TASK_ASSIGNMENT': {
      if (!state.config) return state;
      return {
        ...state,
        config: { ...state.config, taskAssignment: action.payload },
      };
    }

    case 'AI_SET_DEFAULT_STYLE': {
      if (!state.config) return state;
      return {
        ...state,
        config: { ...state.config, defaultStyle: action.payload },
      };
    }

    case 'AI_ADD_CUSTOM_STYLE': {
      if (!state.config) return state;
      return {
        ...state,
        config: {
          ...state.config,
          customStyles: [...state.config.customStyles, action.payload],
        },
      };
    }

    case 'AI_UPDATE_CUSTOM_STYLE': {
      if (!state.config) return state;
      return {
        ...state,
        config: {
          ...state.config,
          customStyles: state.config.customStyles.map((s) =>
            s.name === action.payload.name ? { ...s, ...action.payload.updates } : s
          ),
        },
      };
    }

    case 'AI_DELETE_CUSTOM_STYLE': {
      if (!state.config) return state;
      return {
        ...state,
        config: {
          ...state.config,
          customStyles: state.config.customStyles.filter(
            (s) => s.name !== action.payload
          ),
        },
      };
    }

    case 'AI_SET_PROXY': {
      if (!state.config) return state;
      return {
        ...state,
        config: { ...state.config, proxySetting: action.payload },
      };
    }

    case 'AI_ADD_RECENT_PROJECT': {
      if (!state.config) return state;
      const recent = [
        action.payload,
        ...state.config.recentProjects.filter((id) => id !== action.payload),
      ].slice(0, 10);
      return {
        ...state,
        config: { ...state.config, recentProjects: recent },
      };
    }

    case 'AI_SET_GENERATING':
      return {
        ...state,
        isGenerating: action.payload.generating,
        generatingTask: action.payload.task ?? null,
        currentTaskType: (action.payload.taskType as TaskModelAssignment[keyof TaskModelAssignment]) ?? null,
        streamBuffer: action.payload.generating ? state.streamBuffer : '',
        streamEvents: action.payload.generating ? state.streamEvents : [],
      };

    case 'AI_STREAM_TOKEN':
      return {
        ...state,
        streamBuffer: state.streamBuffer + action.payload,
      };

    case 'AI_STREAM_EVENT':
      return {
        ...state,
        streamEvents: [...state.streamEvents, action.payload],
      };

    case 'AI_CLEAR_STREAM':
      return { ...state, streamBuffer: '', streamEvents: [] };

    case 'AI_RESET':
      return { ...initialAIState };

    default:
      return state;
  }
}

// ============================================================================
// Reducer - UI
// ============================================================================

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'UI_SET_VIEW':
      return { ...state, currentView: action.payload };

    case 'UI_TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case 'UI_SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.payload };

    case 'UI_SET_SIDEBAR_PANEL':
      return { ...state, sidebarPanel: action.payload, sidebarOpen: true };

    case 'UI_OPEN_DIALOG':
      return { ...state, dialog: { ...action.payload, open: true } };

    case 'UI_CLOSE_DIALOG':
      return { ...state, dialog: { type: null, open: false, data: undefined } };

    case 'UI_ADD_NOTIFICATION': {
      const notification: Notification = {
        ...action.payload,
        id: generateNotificationId(),
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        notifications: [...state.notifications, notification],
      };
    }

    case 'UI_REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };

    case 'UI_CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };

    case 'UI_SET_FULLSCREEN':
      return { ...state, isFullscreen: action.payload };

    case 'UI_SET_EDITOR_PREFS':
      return { ...state, editorPrefs: action.payload };

    case 'UI_RESET':
      return { ...initialUIState };

    default:
      return state;
  }
}

// ============================================================================
// 根 Reducer
// ============================================================================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.domain) {
    case 'project':
      return { ...state, project: projectReducer(state.project, action.action) };
    case 'editor':
      return { ...state, editor: editorReducer(state.editor, action.action) };
    case 'ai':
      return { ...state, ai: aiReducer(state.ai, action.action) };
    case 'ui':
      return { ...state, ui: uiReducer(state.ui, action.action) };
    default:
      return state;
  }
}

// ============================================================================
// localStorage 持久化
// ============================================================================

const STORAGE_KEY = 'novelflow-state';

function loadState(): Partial<AppState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return {
      project: saved.project ? { ...initialProjectState, ...saved.project } : undefined,
      ai: saved.ai ? { ...initialAIState, ...saved.ai } : undefined,
      ui: saved.ui ? { ...initialUIState, ...saved.ui } : undefined,
    };
  } catch {
    return null;
  }
}

function saveState(state: AppState): { success: boolean; error?: string } {
  try {
    const toSave = {
      project: state.project,
      ai: state.ai,
      ui: { editorPrefs: state.ui.editorPrefs },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return { success: true };
  } catch (error) {
    const isQuotaError =
      error instanceof DOMException &&
      (error.code === 22 || error.code === 1014 || error.name === 'QuotaExceededError');

    if (isQuotaError) {
      // 尝试精简数据后重新保存：移除章节草稿内容以节省空间
      try {
        const trimmedProject = {
          ...state.project,
          chapters: state.project.chapters.map((ch) => ({
            ...ch,
            draftContent: ch.draftContent ? ch.draftContent.slice(0, 200) + '...[已截断]' : '',
          })),
        };
        const toSave = {
          project: trimmedProject,
          ai: state.ai,
          ui: { editorPrefs: state.ui.editorPrefs },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        return { success: true, error: 'STORAGE_TRIMMED' };
      } catch {
        // 精简后仍然失败
      }
    }

    console.error('[Store] 保存状态到 localStorage 失败:', error);
    return { success: false, error: 'STORAGE_FULL' };
  }
}

/**
 * 将当前状态导出为 JSON 文件供用户下载备份
 */
export function exportStateAsJson(state: AppState): void {
  const toExport = {
    project: state.project,
    ai: state.ai,
    ui: state.ui,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
  const blob = new Blob([JSON.stringify(toExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `novelflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Context
// ============================================================================

const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<Dispatch<AppAction> | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [preloadedState] = useState<Partial<AppState> | null>(() => loadState());
  const [state, dispatch] = useReducer(appReducer, preloadedState
    ? {
        project: { ...initialProjectState, ...preloadedState.project },
        editor: initialEditorState,
        ai: { ...initialAIState, ...preloadedState.ai },
        ui: { ...initialUIState, ...preloadedState.ui },
      }
    : initialState);

  // Debounced save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = saveState(state);
      if (result.error === 'STORAGE_FULL') {
        dispatch({
          domain: 'ui',
          action: {
            type: 'UI_ADD_NOTIFICATION',
            payload: {
              type: 'error',
              title: '存储空间不足',
              message: '无法保存项目数据到本地存储。建议导出备份后清理浏览器数据。',
            },
          },
        });
      } else if (result.error === 'STORAGE_TRIMMED') {
        dispatch({
          domain: 'ui',
          action: {
            type: 'UI_ADD_NOTIFICATION',
            payload: {
              type: 'warning',
              title: '存储空间紧张',
              message: '本地存储空间不足，部分章节草稿已被截断。建议导出备份。',
            },
          },
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [state, dispatch]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 获取应用全局状态
 * @throws 如果在 AppProvider 外使用则抛出错误
 */
export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (context === null) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

/**
 * 获取应用状态分发器
 * @throws 如果在 AppProvider 外使用则抛出错误
 */
export function useAppDispatch(): Dispatch<AppAction> {
  const context = useContext(AppDispatchContext);
  if (context === null) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return context;
}

/**
 * 便捷 Hook：同时获取状态和分发器
 */
export function useAppStore(): [AppState, Dispatch<AppAction>] {
  return [useAppState(), useAppDispatch()];
}

// ============================================================================
// Action Creator 辅助函数
// ============================================================================

/** 创建带 domain 前缀的 action */
function domainAction<D extends 'project' | 'editor' | 'ai' | 'ui'>(
  domain: D,
  action: D extends 'project'
    ? ProjectAction
    : D extends 'editor'
      ? EditorAction
      : D extends 'ai'
        ? AIAction
        : UIAction
): AppAction {
  return { domain, action } as AppAction;
}

// ---- Project Action Creators ----

export const projectActions = {
  setList: (projects: NovelProject[]) =>
    domainAction('project', { type: 'PROJECT_SET_LIST', payload: projects }),
  setCurrent: (project: NovelProject) =>
    domainAction('project', { type: 'PROJECT_SET_CURRENT', payload: project }),
  clearCurrent: () =>
    domainAction('project', { type: 'PROJECT_CLEAR_CURRENT' }),
  add: (project: NovelProject) =>
    domainAction('project', { type: 'PROJECT_ADD', payload: project }),
  update: (updates: Partial<NovelProject> & Record<string, unknown>) =>
    domainAction('project', { type: 'PROJECT_UPDATE', payload: updates }),
  delete: (id: string) =>
    domainAction('project', { type: 'PROJECT_DELETE', payload: id }),
  setStatus: (status: ProjectStatus, blockedReason?: string) =>
    domainAction('project', { type: 'PROJECT_SET_STATUS', payload: { status, blockedReason } }),
  setStage: (stage: ProjectStage) =>
    domainAction('project', { type: 'PROJECT_SET_STAGE', payload: stage }),
  setLoading: (loading: boolean) =>
    domainAction('project', { type: 'PROJECT_SET_LOADING', payload: loading }),
  setError: (error: string | null) =>
    domainAction('project', { type: 'PROJECT_SET_ERROR', payload: error }),
  setVolumes: (volumes: Volume[]) =>
    domainAction('project', { type: 'VOLUME_SET_LIST', payload: volumes }),
  addVolume: (volume: Volume) =>
    domainAction('project', { type: 'VOLUME_ADD', payload: volume }),
  updateVolume: (id: string, updates: Partial<Volume>) =>
    domainAction('project', { type: 'VOLUME_UPDATE', payload: { id, updates } }),
  deleteVolume: (id: string) =>
    domainAction('project', { type: 'VOLUME_DELETE', payload: id }),
  setChapters: (chapters: Chapter[]) =>
    domainAction('project', { type: 'CHAPTER_SET_LIST', payload: chapters }),
  addChapter: (chapter: Chapter) =>
    domainAction('project', { type: 'CHAPTER_ADD', payload: chapter }),
  updateChapter: (id: string, updates: Partial<Chapter>) =>
    domainAction('project', { type: 'CHAPTER_UPDATE', payload: { id, updates } }),
  deleteChapter: (id: string) =>
    domainAction('project', { type: 'CHAPTER_DELETE', payload: id }),
  setChapterStatus: (id: string, status: ChapterStatus) =>
    domainAction('project', { type: 'CHAPTER_SET_STATUS', payload: { id, status } }),
  setCharacters: (characters: Character[]) =>
    domainAction('project', { type: 'CHARACTER_SET_LIST', payload: characters }),
  addCharacter: (character: Character) =>
    domainAction('project', { type: 'CHARACTER_ADD', payload: character }),
  updateCharacter: (id: string, updates: Partial<Character>) =>
    domainAction('project', { type: 'CHARACTER_UPDATE', payload: { id, updates } }),
  deleteCharacter: (id: string) =>
    domainAction('project', { type: 'CHARACTER_DELETE', payload: id }),
  updateCharacterState: (id: string, state: CharacterState) =>
    domainAction('project', { type: 'CHARACTER_UPDATE_STATE', payload: { id, state } }),
  addCharacterChange: (characterId: string, change: CharacterChange) =>
    domainAction('project', { type: 'CHARACTER_ADD_CHANGE', payload: { characterId, change } }),
  addCanonEntry: (entry: CanonEntry) =>
    domainAction('project', { type: 'CANON_ADD_ENTRY', payload: entry }),
  setGlobalSummary: (summary: GlobalSummary) =>
    domainAction('project', { type: 'GLOBAL_SUMMARY_SET', payload: summary }),
  addBrainstormMessage: (message: BrainstormMessage) =>
    domainAction('project', { type: 'BRAINSTORM_ADD_MESSAGE', payload: message }),
  setBrainstormMessages: (messages: BrainstormMessage[]) =>
    domainAction('project', { type: 'BRAINSTORM_SET_MESSAGES', payload: messages }),
  clearBrainstorm: () =>
    domainAction('project', { type: 'BRAINSTORM_CLEAR' }),
};

// ---- Editor Action Creators ----

export const editorActions = {
  setChapter: (chapter: Chapter | null) =>
    domainAction('editor', { type: 'EDITOR_SET_CHAPTER', payload: chapter }),
  setContent: (content: string) =>
    domainAction('editor', { type: 'EDITOR_SET_CONTENT', payload: content }),
  appendContent: (content: string) =>
    domainAction('editor', { type: 'EDITOR_APPEND_CONTENT', payload: content }),
  setViewMode: (mode: EditorViewMode) =>
    domainAction('editor', { type: 'EDITOR_SET_VIEW_MODE', payload: mode }),
  setDirty: (dirty: boolean) =>
    domainAction('editor', { type: 'EDITOR_SET_DIRTY', payload: dirty }),
  markSaved: (timestamp: string) =>
    domainAction('editor', { type: 'EDITOR_MARK_SAVED', payload: timestamp }),
  setReviewResult: (result: ReviewResult | null) =>
    domainAction('editor', { type: 'EDITOR_SET_REVIEW_RESULT', payload: result }),
  setReviewing: (reviewing: boolean) =>
    domainAction('editor', { type: 'EDITOR_SET_REVIEWING', payload: reviewing }),
  reset: () =>
    domainAction('editor', { type: 'EDITOR_RESET' }),
};

// ---- AI Action Creators ----

export const aiActions = {
  setConfig: (config: AppConfig) =>
    domainAction('ai', { type: 'AI_SET_CONFIG', payload: config }),
  updateConfig: (updates: Partial<AppConfig>) =>
    domainAction('ai', { type: 'AI_UPDATE_CONFIG', payload: updates }),
  setActiveLLM: (config: LLMConfig | null) =>
    domainAction('ai', { type: 'AI_SET_ACTIVE_LLM', payload: config }),
  addLLMConfig: (config: LLMConfig) =>
    domainAction('ai', { type: 'AI_ADD_LLM_CONFIG', payload: config }),
  updateLLMConfig: (id: string, updates: Partial<LLMConfig>) =>
    domainAction('ai', { type: 'AI_UPDATE_LLM_CONFIG', payload: { id, updates } }),
  deleteLLMConfig: (id: string) =>
    domainAction('ai', { type: 'AI_DELETE_LLM_CONFIG', payload: id }),
  setTaskAssignment: (assignment: TaskModelAssignment) =>
    domainAction('ai', { type: 'AI_SET_TASK_ASSIGNMENT', payload: assignment }),
  setDefaultStyle: (style: PresetStyle) =>
    domainAction('ai', { type: 'AI_SET_DEFAULT_STYLE', payload: style }),
  addCustomStyle: (style: NovelStyle) =>
    domainAction('ai', { type: 'AI_ADD_CUSTOM_STYLE', payload: style }),
  updateCustomStyle: (name: string, updates: Partial<NovelStyle>) =>
    domainAction('ai', { type: 'AI_UPDATE_CUSTOM_STYLE', payload: { name, updates } }),
  deleteCustomStyle: (name: string) =>
    domainAction('ai', { type: 'AI_DELETE_CUSTOM_STYLE', payload: name }),
  setProxy: (proxy: ProxySetting) =>
    domainAction('ai', { type: 'AI_SET_PROXY', payload: proxy }),
  addRecentProject: (projectId: string) =>
    domainAction('ai', { type: 'AI_ADD_RECENT_PROJECT', payload: projectId }),
  setGenerating: (generating: boolean, task?: string, taskType?: string) =>
    domainAction('ai', { type: 'AI_SET_GENERATING', payload: { generating, task, taskType } }),
  streamToken: (token: string) =>
    domainAction('ai', { type: 'AI_STREAM_TOKEN', payload: token }),
  streamEvent: (event: StreamEvent) =>
    domainAction('ai', { type: 'AI_STREAM_EVENT', payload: event }),
  clearStream: () =>
    domainAction('ai', { type: 'AI_CLEAR_STREAM' }),
  reset: () =>
    domainAction('ai', { type: 'AI_RESET' }),
};

// ---- UI Action Creators ----

export const uiActions = {
  setView: (view: AppView) =>
    domainAction('ui', { type: 'UI_SET_VIEW', payload: view }),
  toggleSidebar: () =>
    domainAction('ui', { type: 'UI_TOGGLE_SIDEBAR' }),
  setSidebarOpen: (open: boolean) =>
    domainAction('ui', { type: 'UI_SET_SIDEBAR_OPEN', payload: open }),
  setSidebarPanel: (panel: SidebarPanel) =>
    domainAction('ui', { type: 'UI_SET_SIDEBAR_PANEL', payload: panel }),
  openDialog: (dialog: DialogState) =>
    domainAction('ui', { type: 'UI_OPEN_DIALOG', payload: dialog }),
  closeDialog: () =>
    domainAction('ui', { type: 'UI_CLOSE_DIALOG' }),
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) =>
    domainAction('ui', { type: 'UI_ADD_NOTIFICATION', payload: notification }),
  removeNotification: (id: string) =>
    domainAction('ui', { type: 'UI_REMOVE_NOTIFICATION', payload: id }),
  clearNotifications: () =>
    domainAction('ui', { type: 'UI_CLEAR_NOTIFICATIONS' }),
  setFullscreen: (fullscreen: boolean) =>
    domainAction('ui', { type: 'UI_SET_FULLSCREEN', payload: fullscreen }),
  setEditorPrefs: (prefs: UIState['editorPrefs']) =>
    domainAction('ui', { type: 'UI_SET_EDITOR_PREFS', payload: prefs }),
  reset: () =>
    domainAction('ui', { type: 'UI_RESET' }),
};

// ============================================================================
// 选择器（Selectors）- 用于从状态中提取派生数据
// ============================================================================

/** 获取当前项目的卷（按卷号排序） */
export function selectSortedVolumes(state: AppState): Volume[] {
  return [...state.project.volumes].sort((a, b) => a.volumeNumber - b.volumeNumber);
}

/** 获取当前项目指定卷的章节（按章节号排序） */
export function selectChaptersByVolume(state: AppState, volumeNumber: number): Chapter[] {
  return state.project.chapters
    .filter((c) => c.volumeNumber === volumeNumber)
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
}

/** 获取当前项目的主要角色（主角 + 配角 + 反派） */
export function selectMainCharacters(state: AppState): Character[] {
  return state.project.characters.filter(
    (c) => c.role === 'protagonist' || c.role === 'supporting' || c.role === 'antagonist'
  );
}

/** 获取当前项目的写作进度百分比 */
export function selectWritingProgress(state: AppState): number {
  const project = state.project.currentProject;
  if (!project || project.targetWords === 0) return 0;
  const totalWords = state.project.chapters.reduce((sum, c) => sum + c.wordCount, 0);
  return Math.min(100, Math.round((totalWords / project.targetWords) * 100));
}

/** 获取当前项目各状态的章节统计 */
export function selectChapterStatusCounts(
  state: AppState
): Record<ChapterStatus, number> {
  const counts: Record<ChapterStatus, number> = {
    pending: 0,
    drafting: 0,
    reviewing: 0,
    minor_fix: 0,
    rewrite: 0,
    done: 0,
    rejected: 0,
  };
  for (const chapter of state.project.chapters) {
    counts[chapter.status]++;
  }
  return counts;
}

/** 检查当前项目是否有未保存的更改 */
export function selectHasUnsavedChanges(state: AppState): boolean {
  return state.editor.isDirty;
}

/** 获取当前正在进行的任务信息 */
export function selectActiveTask(state: AppState): {
  isGenerating: boolean;
  task: string | null;
  streamBuffer: string;
} {
  return {
    isGenerating: state.ai.isGenerating,
    task: state.ai.generatingTask,
    streamBuffer: state.ai.streamBuffer,
  };
}
