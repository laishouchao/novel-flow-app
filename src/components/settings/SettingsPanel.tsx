import React, { useState, useCallback, useEffect } from 'react';
import {
  Settings,
  Key,
  Palette,
  Type,
  Plus,
  Trash2,
  Edit3,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Save,
  Zap,
} from 'lucide-react';
import Button from '../common/Button';
import Card, { CardContent } from '../common/Card';
import Badge from '../common/Badge';
import { useAppState, useAppDispatch, aiActions } from '../../store';
import { useToast } from '../common/Toast';
import { llmService } from '../../services/llm';
import type { LLMServiceConfig } from '../../services/llm';
import type {
  LLMConfig as StoreLLMConfig,
  TaskModelAssignment as StoreTaskAssignment,
  PresetStyle,
  NovelStyle,
  AppConfig,
  LLMInterfaceFormat,
} from '../../types';

// ============================================================================
// 组件内部类型（与 store 类型做映射）
// ============================================================================

type SettingsTab = 'api' | 'style' | 'editor';

/** 组件内部使用的 LLM 配置（provider 字段对应 store 的 interfaceFormat） */
interface LocalLLMConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface StylePreset {
  id: PresetStyle;
  name: string;
  description: string;
  features: string[];
}

interface EditorPreferences {
  fontSize: number;
  lineHeight: number;
  autoSaveInterval: number;
  theme: 'light' | 'dark';
}

// ============================================================================
// 常量
// ============================================================================

const defaultAppConfig: AppConfig = {
  llmConfigs: [],
  taskAssignment: {
    brainstorm: '',
    outline: '',
    draft: '',
    review: '',
    finalization: '',
    summary: '',
  },
  defaultStyle: 'cold_realism',
  customStyles: [],
  proxySetting: { enabled: false },
  recentProjects: [],
};

const stylePresets: StylePreset[] = [
  {
    id: 'cold_realism',
    name: '冷峻写实',
    description: '克制、冷静、白描式叙事，以简洁的语言勾勒场景和人物',
    features: ['简洁叙事', '环境白描', '克制情感', '留白艺术'],
  },
  {
    id: 'system_power',
    name: '系统爽文',
    description: '系统流、升级感、爽点密集，节奏明快，读者代入感强',
    features: ['系统面板', '等级升级', '爽点密集', '节奏明快'],
  },
  {
    id: 'bizarre_suspense',
    name: '诡奇悬疑',
    description: '诡异氛围、层层悬念，以细节和暗示构建不安感',
    features: ['诡异氛围', '层层悬念', '细节暗示', '心理恐怖'],
  },
];

const taskLabels: { key: keyof StoreTaskAssignment; label: string }[] = [
  { key: 'brainstorm', label: '灵感收束' },
  { key: 'outline', label: '大纲生成' },
  { key: 'draft', label: '草稿生成' },
  { key: 'review', label: '章节审查' },
  { key: 'finalization', label: '定稿润色' },
  { key: 'summary', label: '摘要生成' },
];

// ============================================================================
// 类型映射工具函数
// ============================================================================

/** Store LLMConfig -> 组件内部 LocalLLMConfig */
function storeToLocal(storeConfig: StoreLLMConfig): LocalLLMConfig {
  return {
    id: storeConfig.id,
    name: storeConfig.name,
    provider: storeConfig.interfaceFormat,
    apiKey: storeConfig.apiKey,
    baseUrl: storeConfig.baseUrl,
    model: storeConfig.model,
    temperature: storeConfig.temperature,
    maxTokens: storeConfig.maxTokens,
  };
}

/** 组件内部 LocalLLMConfig -> Store LLMConfig */
function localToStore(localConfig: LocalLLMConfig): StoreLLMConfig {
  return {
    id: localConfig.id,
    name: localConfig.name,
    interfaceFormat: localConfig.provider as LLMInterfaceFormat,
    apiKey: localConfig.apiKey,
    baseUrl: localConfig.baseUrl,
    model: localConfig.model,
    maxTokens: localConfig.maxTokens,
    temperature: localConfig.temperature,
    timeout: 60000,
  };
}

// ============================================================================
// 组件
// ============================================================================

const SettingsPanel: React.FC = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const config: AppConfig = state.ai.config ?? defaultAppConfig;

  // ---- 本地状态 ----
  const [activeTab, setActiveTab] = useState<SettingsTab>('api');
  const [editingConfig, setEditingConfig] = useState<LocalLLMConfig | null>(null);
  const [isNewConfig, setIsNewConfig] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'fail'>>({});

  const [editorPrefs, setEditorPrefs] = useState<EditorPreferences>({
    fontSize: 16,
    lineHeight: 1.8,
    autoSaveInterval: 30,
    theme: 'light',
  });

  const [customStyleName, setCustomStyleName] = useState('');
  const [customStyleDesc, setCustomStyleDesc] = useState('');

  // ---- 确保 config 存在（首次访问设置时初始化） ----
  useEffect(() => {
    if (!state.ai.config) {
      dispatch(aiActions.setConfig(defaultAppConfig));
    }
  }, [state.ai.config, dispatch]);

  // ---- LLM 配置操作 ----

  const handleAddConfig = useCallback(() => {
    const newConfig: LocalLLMConfig = {
      id: `cfg-${Date.now()}`,
      name: '新配置',
      provider: 'openai',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4096,
    };
    setEditingConfig(newConfig);
    setIsNewConfig(true);
  }, []);

  const handleEditConfig = useCallback((storeConfig: StoreLLMConfig) => {
    setEditingConfig(storeToLocal(storeConfig));
    setIsNewConfig(false);
  }, []);

  const handleDeleteConfig = useCallback((id: string) => {
    dispatch(aiActions.deleteLLMConfig(id));
  }, [dispatch]);

  const handleSaveConfig = useCallback(() => {
    if (!editingConfig) return;
    const storeConfig = localToStore(editingConfig);
    if (isNewConfig) {
      dispatch(aiActions.addLLMConfig(storeConfig));
    } else {
      dispatch(aiActions.updateLLMConfig(storeConfig.id, storeConfig));
    }
    setEditingConfig(null);
    setIsNewConfig(false);
    addToast('success', isNewConfig ? '配置已添加' : '配置已更新');
  }, [editingConfig, isNewConfig, dispatch, addToast]);

  const handleTestConnection = useCallback(async (storeConfig: StoreLLMConfig) => {
    setTestingId(storeConfig.id);
    const serviceConfig: LLMServiceConfig = {
      baseUrl: storeConfig.baseUrl,
      apiKey: storeConfig.apiKey,
      model: storeConfig.model,
      maxTokens: 20,
      temperature: storeConfig.temperature,
      timeout: 15000,
    };
    try {
      const result = await llmService.testConnection(serviceConfig);
      setTestResults((prev) => ({ ...prev, [storeConfig.id]: result.success ? 'success' : 'fail' }));
      if (result.success) {
        addToast('success', '连接成功');
      } else {
        addToast('error', `连接失败: ${result.error || '请检查 API Key 和 URL 是否正确'}`);
      }
    } catch (error) {
      setTestResults((prev) => ({ ...prev, [storeConfig.id]: 'fail' }));
      addToast('error', `连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setTestingId(null);
    }
  }, [addToast]);

  // ---- 任务指派操作 ----

  const handleTaskAssignmentChange = useCallback((task: keyof StoreTaskAssignment, configId: string) => {
    const updated: StoreTaskAssignment = {
      ...config.taskAssignment,
      [task]: configId,
    };
    dispatch(aiActions.setTaskAssignment(updated));
  }, [config.taskAssignment, dispatch]);

  // ---- 风格操作 ----

  const handleSelectPresetStyle = useCallback((preset: PresetStyle) => {
    dispatch(aiActions.setDefaultStyle(preset));
    addToast('success', '默认风格已切换');
  }, [dispatch, addToast]);

  const handleSaveCustomStyle = useCallback(() => {
    if (!customStyleName.trim() || !customStyleDesc.trim()) {
      addToast('warning', '请填写风格名称和描述');
      return;
    }
    const style: NovelStyle = {
      preset: 'custom',
      name: customStyleName.trim(),
      description: customStyleDesc.trim(),
      sentenceRules: [],
      descriptionRules: [],
      dialogueRules: [],
      emotionRules: [],
      forbiddenPatterns: [],
      forbiddenWords: [],
    };
    dispatch(aiActions.addCustomStyle(style));
    setCustomStyleName('');
    setCustomStyleDesc('');
    addToast('success', '自定义风格已保存');
  }, [customStyleName, customStyleDesc, dispatch, addToast]);

  // ---- 编辑器偏好操作 ----

  const handleSaveEditorPrefs = useCallback(() => {
    addToast('success', '设置已保存');
  }, [addToast]);

  // ---- Tab 定义 ----

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'api', label: 'API 配置', icon: <Key size={16} /> },
    { key: 'style', label: '风格管理', icon: <Palette size={16} /> },
    { key: 'editor', label: '编辑器偏好', icon: <Type size={16} /> },
  ];

  // ============================================================================
  // 渲染：API 配置 Tab
  // ============================================================================

  const renderAPITab = () => (
    <div className="space-y-6">
      {/* LLM 配置列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">LLM 配置</h3>
          <Button size="sm" icon={<Plus size={14} />} onClick={handleAddConfig}>
            添加配置
          </Button>
        </div>

        {/* 配置卡片列表 */}
        <div className="space-y-3">
          {config.llmConfigs.map((storeCfg) => {
            const localCfg = storeToLocal(storeCfg);
            return (
              <Card key={storeCfg.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-semibold text-slate-800">
                          {localCfg.name}
                        </h4>
                        <Badge variant="outline">{localCfg.provider}</Badge>
                        {testResults[storeCfg.id] === 'success' && (
                          <Badge variant="success">已连接</Badge>
                        )}
                        {testResults[storeCfg.id] === 'fail' && (
                          <Badge variant="danger">连接失败</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
                        <div>
                          <span className="text-slate-400">模型：</span>
                          {localCfg.model}
                        </div>
                        <div>
                          <span className="text-slate-400">温度：</span>
                          {localCfg.temperature}
                        </div>
                        <div>
                          <span className="text-slate-400">Base URL：</span>
                          <span className="truncate">{localCfg.baseUrl}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">最大Token：</span>
                          {localCfg.maxTokens}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestConnection(storeCfg)}
                        loading={testingId === storeCfg.id}
                        icon={
                          testingId === storeCfg.id
                            ? undefined
                            : testResults[storeCfg.id] === 'success'
                              ? <Wifi size={14} className="text-emerald-500" />
                              : <WifiOff size={14} />
                        }
                      >
                        测试
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditConfig(storeCfg)}
                        icon={<Edit3 size={14} />}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteConfig(storeCfg.id)}
                        icon={<Trash2 size={14} />}
                        className="text-slate-400 hover:text-red-500"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {config.llmConfigs.length === 0 && (
            <div className="text-center py-8 text-sm text-slate-400">
              暂无 LLM 配置，点击上方"添加配置"开始
            </div>
          )}
        </div>
      </div>

      {/* 编辑/新建配置对话框（内联） */}
      {editingConfig && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">
              {isNewConfig ? '新建 LLM 配置' : '编辑配置'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  配置名称
                </label>
                <input
                  type="text"
                  value={editingConfig.name}
                  onChange={(e) =>
                    setEditingConfig({ ...editingConfig, name: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  接口格式
                </label>
                <select
                  value={editingConfig.provider}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      provider: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="openai">OpenAI</option>
                  <option value="claude">Anthropic (Claude)</option>
                  <option value="ollama">Ollama</option>
                  <option value="gemini">Gemini</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={editingConfig.apiKey}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      apiKey: e.target.value,
                    })
                  }
                  placeholder="sk-..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Base URL
                </label>
                <input
                  type="text"
                  value={editingConfig.baseUrl}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      baseUrl: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  模型
                </label>
                <input
                  type="text"
                  value={editingConfig.model}
                  onChange={(e) =>
                    setEditingConfig({
                      ...editingConfig,
                      model: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    温度
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={editingConfig.temperature}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        temperature: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    最大Token
                  </label>
                  <input
                    type="number"
                    step="256"
                    value={editingConfig.maxTokens}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        maxTokens: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingConfig(null);
                  setIsNewConfig(false);
                }}
              >
                取消
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveConfig}>
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分任务模型指派 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Zap size={16} className="text-blue-600" />
          分任务模型指派
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {taskLabels.map(({ key, label }) => (
            <div
              key={key}
              className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 bg-white"
            >
              <label className="text-xs font-medium text-slate-600">
                {label}
              </label>
              <select
                value={config.taskAssignment[key]}
                onChange={(e) =>
                  handleTaskAssignmentChange(key, e.target.value)
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">未指定</option>
                {config.llmConfigs.map((cfg) => (
                  <option key={cfg.id} value={cfg.id}>
                    {cfg.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // 渲染：风格管理 Tab
  // ============================================================================

  const renderStyleTab = () => (
    <div className="space-y-6">
      {/* 预设风格 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">预设风格</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {stylePresets.map((preset) => {
            const isSelected = config.defaultStyle === preset.id;
            return (
              <Card
                key={preset.id}
                hoverable
                className={isSelected ? 'ring-2 ring-blue-500 border-blue-300' : ''}
                onClick={() => handleSelectPresetStyle(preset.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-slate-800">
                      {preset.name}
                    </h4>
                    {isSelected && (
                      <Badge variant="success">当前</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{preset.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preset.features.map((feature) => (
                      <Badge key={feature} variant="info">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 自定义风格列表 */}
      {config.customStyles.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">已保存的自定义风格</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {config.customStyles.map((style) => (
              <Card key={style.name} hoverable>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">
                    {style.name}
                  </h4>
                  <p className="text-xs text-slate-500">{style.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 自定义风格编辑器 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">自定义风格</h3>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  风格名称
                </label>
                <input
                  type="text"
                  value={customStyleName}
                  onChange={(e) => setCustomStyleName(e.target.value)}
                  placeholder="输入风格名称"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  风格描述
                </label>
                <textarea
                  value={customStyleDesc}
                  onChange={(e) => setCustomStyleDesc(e.target.value)}
                  placeholder="描述你的写作风格特征，包括叙事方式、语言特点、情感基调等..."
                  rows={6}
                  className="
                    w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                    resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    placeholder:text-slate-400 leading-relaxed
                  "
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Save size={14} />}
                  onClick={handleSaveCustomStyle}
                >
                  保存风格
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // ============================================================================
  // 渲染：编辑器偏好 Tab
  // ============================================================================

  const renderEditorTab = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-5">
          <h3 className="text-sm font-semibold text-slate-700">编辑器设置</h3>

          {/* 字体大小 */}
          <div>
            <label className="flex items-center justify-between text-sm text-slate-600 mb-2">
              <span>字体大小</span>
              <span className="font-mono text-slate-500">{editorPrefs.fontSize}px</span>
            </label>
            <input
              type="range"
              min="12"
              max="24"
              step="1"
              value={editorPrefs.fontSize}
              onChange={(e) =>
                setEditorPrefs({
                  ...editorPrefs,
                  fontSize: Number(e.target.value),
                })
              }
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>12px</span>
              <span>24px</span>
            </div>
          </div>

          {/* 行间距 */}
          <div>
            <label className="flex items-center justify-between text-sm text-slate-600 mb-2">
              <span>行间距</span>
              <span className="font-mono text-slate-500">{editorPrefs.lineHeight}</span>
            </label>
            <input
              type="range"
              min="1.2"
              max="3.0"
              step="0.1"
              value={editorPrefs.lineHeight}
              onChange={(e) =>
                setEditorPrefs({
                  ...editorPrefs,
                  lineHeight: Number(e.target.value),
                })
              }
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1.2</span>
              <span>3.0</span>
            </div>
          </div>

          {/* 自动保存间隔 */}
          <div>
            <label className="flex items-center justify-between text-sm text-slate-600 mb-2">
              <span>自动保存间隔</span>
              <span className="font-mono text-slate-500">{editorPrefs.autoSaveInterval}秒</span>
            </label>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={editorPrefs.autoSaveInterval}
              onChange={(e) =>
                setEditorPrefs({
                  ...editorPrefs,
                  autoSaveInterval: Number(e.target.value),
                })
              }
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>10秒</span>
              <span>120秒</span>
            </div>
          </div>

          {/* 主题切换 */}
          <div>
            <label className="block text-sm text-slate-600 mb-3">主题</label>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setEditorPrefs({ ...editorPrefs, theme: 'light' })
                }
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors
                  ${
                    editorPrefs.theme === 'light'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }
                `}
              >
                <Sun size={18} />
                <span className="text-sm font-medium">浅色</span>
              </button>
              <button
                onClick={() =>
                  setEditorPrefs({ ...editorPrefs, theme: 'dark' })
                }
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors
                  ${
                    editorPrefs.theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }
                `}
              >
                <Moon size={18} />
                <span className="text-sm font-medium">深色</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 预览 */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">预览效果</h3>
          <div
            className={`
              p-4 rounded-lg border border-slate-200
              ${editorPrefs.theme === 'dark' ? 'bg-slate-900' : 'bg-white'}
            `}
          >
            <p
              className="font-serif leading-relaxed"
              style={{
                fontSize: `${editorPrefs.fontSize}px`,
                lineHeight: editorPrefs.lineHeight,
                color: editorPrefs.theme === 'dark' ? '#e2e8f0' : '#1e293b',
              }}
            >
              夜色如墨，月光透过云层的缝隙洒落在古老的石板路上。林远站在巷口，目光深邃地望着远处的灯火。他的手指不自觉地摩挲着口袋里那枚冰凉的铜钥匙。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" icon={<Save size={16} />} onClick={handleSaveEditorPrefs}>
          保存设置
        </Button>
      </div>
    </div>
  );

  // ============================================================================
  // 主渲染
  // ============================================================================

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 顶部标题 */}
      <div className="shrink-0 px-6 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={20} className="text-slate-600" />
          <h1 className="text-xl font-bold text-slate-900">设置</h1>
        </div>
        <p className="text-sm text-slate-500">配置 NovelFlow 的各项参数</p>
      </div>

      {/* 标签页 */}
      <div className="shrink-0 px-6 border-b border-slate-200">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-blue-600'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {activeTab === 'api' && renderAPITab()}
        {activeTab === 'style' && renderStyleTab()}
        {activeTab === 'editor' && renderEditorTab()}
      </div>
    </div>
  );
};

export default SettingsPanel;
