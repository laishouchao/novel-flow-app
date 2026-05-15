import React, { useState } from 'react';
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

type SettingsTab = 'api' | 'style' | 'editor';

interface LLMConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface TaskModelAssignment {
  task: string;
  label: string;
  configId: string;
}

interface StylePreset {
  id: string;
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

interface SettingsPanelProps {
  onSave?: (settings: any) => void;
}

const sampleLLMConfigs: LLMConfig[] = [
  {
    id: 'cfg-1',
    name: 'GPT-4o 主力',
    provider: 'openai',
    apiKey: 'sk-****',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
  },
  {
    id: 'cfg-2',
    name: 'Claude 精修',
    provider: 'anthropic',
    apiKey: 'sk-ant-****',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.5,
    maxTokens: 8192,
  },
];

const sampleTaskAssignments: TaskModelAssignment[] = [
  { task: 'brainstorm', label: '灵感收束', configId: 'cfg-1' },
  { task: 'outline', label: '大纲生成', configId: 'cfg-1' },
  { task: 'draft', label: '草稿生成', configId: 'cfg-1' },
  { task: 'review', label: '章节审查', configId: 'cfg-2' },
  { task: 'finalize', label: '定稿润色', configId: 'cfg-2' },
  { task: 'summary', label: '摘要生成', configId: 'cfg-1' },
];

const stylePresets: StylePreset[] = [
  {
    id: 'cold_narration',
    name: '冷白描',
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
    id: 'weird_suspense',
    name: '怪诞悬疑',
    description: '诡异氛围、层层悬念，以细节和暗示构建不安感',
    features: ['诡异氛围', '层层悬念', '细节暗示', '心理恐怖'],
  },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onSave }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('api');
  const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>(sampleLLMConfigs);
  const [taskAssignments, setTaskAssignments] = useState<TaskModelAssignment[]>(sampleTaskAssignments);
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [isNewConfig, setIsNewConfig] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'fail'>>({});

  const [editorPrefs, setEditorPrefs] = useState<EditorPreferences>({
    fontSize: 16,
    lineHeight: 1.8,
    autoSaveInterval: 30,
    theme: 'light',
  });

  const [customStyle, setCustomStyle] = useState('');

  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'api', label: 'API 配置', icon: <Key size={16} /> },
    { key: 'style', label: '风格管理', icon: <Palette size={16} /> },
    { key: 'editor', label: '编辑器偏好', icon: <Type size={16} /> },
  ];

  const handleAddConfig = () => {
    const newConfig: LLMConfig = {
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
  };

  const handleEditConfig = (config: LLMConfig) => {
    setEditingConfig({ ...config });
    setIsNewConfig(false);
  };

  const handleDeleteConfig = (id: string) => {
    setLlmConfigs((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveConfig = () => {
    if (!editingConfig) return;
    if (isNewConfig) {
      setLlmConfigs((prev) => [...prev, editingConfig]);
    } else {
      setLlmConfigs((prev) =>
        prev.map((c) => (c.id === editingConfig.id ? editingConfig : c))
      );
    }
    setEditingConfig(null);
    setIsNewConfig(false);
  };

  const handleTestConnection = (id: string) => {
    setTestingId(id);
    setTimeout(() => {
      setTestingId(null);
      setTestResults((prev) => ({ ...prev, [id]: 'success' }));
    }, 2000);
  };

  const handleTaskAssignmentChange = (task: string, configId: string) => {
    setTaskAssignments((prev) =>
      prev.map((a) => (a.task === task ? { ...a, configId } : a))
    );
  };

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
          {llmConfigs.map((config) => (
            <Card key={config.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-slate-800">
                        {config.name}
                      </h4>
                      <Badge variant="outline">{config.provider}</Badge>
                      {testResults[config.id] === 'success' && (
                        <Badge variant="success">已连接</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500">
                      <div>
                        <span className="text-slate-400">模型：</span>
                        {config.model}
                      </div>
                      <div>
                        <span className="text-slate-400">温度：</span>
                        {config.temperature}
                      </div>
                      <div>
                        <span className="text-slate-400">Base URL：</span>
                        <span className="truncate">{config.baseUrl}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">最大Token：</span>
                        {config.maxTokens}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestConnection(config.id)}
                      loading={testingId === config.id}
                      icon={
                        testingId === config.id ? undefined : testResults[config.id] === 'success' ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} />
                      }
                    >
                      测试
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditConfig(config)}
                      icon={<Edit3 size={14} />}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConfig(config.id)}
                      icon={<Trash2 size={14} />}
                      className="text-slate-400 hover:text-red-500"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                  提供商
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
                  <option value="anthropic">Anthropic</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="zhipu">智谱AI</option>
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
          {taskAssignments.map((assignment) => (
            <div
              key={assignment.task}
              className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 bg-white"
            >
              <label className="text-xs font-medium text-slate-600">
                {assignment.label}
              </label>
              <select
                value={assignment.configId}
                onChange={(e) =>
                  handleTaskAssignmentChange(assignment.task, e.target.value)
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {llmConfigs.map((cfg) => (
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

  const renderStyleTab = () => (
    <div className="space-y-6">
      {/* 预设风格 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">预设风格</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {stylePresets.map((preset) => (
            <Card key={preset.id} hoverable>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-1">
                  {preset.name}
                </h4>
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
          ))}
        </div>
      </div>

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
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
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
                <Button variant="primary" size="sm" icon={<Save size={14} />}>
                  保存风格
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

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
        <Button variant="primary" icon={<Save size={16} />} onClick={() => onSave?.(editorPrefs)}>
          保存设置
        </Button>
      </div>
    </div>
  );

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
