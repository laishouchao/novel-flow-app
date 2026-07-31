import React, { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  Settings,
  Key,
  Palette,
  Type,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Save,
  Shield,
  Server,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import Button from '../common/Button';
import Card, { CardContent } from '../common/Card';
import Badge from '../common/Badge';
import { useAppState, useAppDispatch, aiActions, uiActions } from '../../store';
import { useToast } from '../common/Toast';
import { llmService } from '../../services/llm';
import type { LLMServiceConfig } from '../../services/llm';
import type {
  AuthorizationConfig,
  PresetStyle,
  NovelStyle,
} from '../../types';

// ============================================================================
// 组件内部类型
// ============================================================================

type SettingsTab = 'api' | 'style' | 'editor';

interface StylePreset {
  id: PresetStyle;
  name: string;
  description: string;
  features: string[];
}

/** API 返回的模型列表项 */
interface ModelInfo {
  id: string;
  object?: string;
  owned_by?: string;
}

// ============================================================================
// 常量
// ============================================================================

const DEFAULT_PROXY_URL = 'http://model.mify.ai.srv/v1/';

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

// ============================================================================
// 组件
// ============================================================================

const SettingsPanel: React.FC = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { addToast } = useToast();

  const config = state.ai.config;

  // ---- 本地状态 ----
  const [activeTab, setActiveTab] = useState<SettingsTab>('api');

  // 授权码配置本地状态
  const savedAuth = config?.authConfig;
  const [authCode, setAuthCode] = useState(savedAuth?.authCode ?? '');
  const [proxyBaseUrl, setProxyBaseUrl] = useState(savedAuth?.proxyBaseUrl ?? DEFAULT_PROXY_URL);
  const [selectedModel, setSelectedModel] = useState(savedAuth?.selectedModel ?? '');
  const [temperature, setTemperature] = useState(savedAuth?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(savedAuth?.maxTokens ?? 4096);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [testError, setTestError] = useState('');

  // 可用模型列表
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const [editorPrefs, setEditorPrefs] = useState(state.ui.editorPrefs);
  const [customStyleName, setCustomStyleName] = useState('');
  const [customStyleDesc, setCustomStyleDesc] = useState('');

  // ---- 同步 store 中的 authConfig 到本地 ----
  useEffect(() => {
    if (savedAuth) {
      setAuthCode(savedAuth.authCode);
      setProxyBaseUrl(savedAuth.proxyBaseUrl);
      setSelectedModel(savedAuth.selectedModel);
      setTemperature(savedAuth.temperature);
      setMaxTokens(savedAuth.maxTokens);
    }
  }, [savedAuth]);

  // ---- 从代理 API 获取可用模型列表 ----
  const handleFetchModels = useCallback(async () => {
    const url = (proxyBaseUrl.trim() || DEFAULT_PROXY_URL).replace(/\/+$/, '');
    setLoadingModels(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authCode.trim()) {
        headers['Authorization'] = `Bearer ${authCode.trim()}`;
      }

      const response = await invoke<{
        status: number;
        status_text: string;
        headers: Record<string, string>;
        body: string;
      }>('http_request', {
        request: {
          url: `${url}/models`,
          method: 'GET',
          headers,
          body: '',
          timeout_secs: 15,
        },
      });

      if (response.status >= 200 && response.status < 300) {
        const data = JSON.parse(response.body);
        const models: ModelInfo[] = data.data ?? [];
        setAvailableModels(models);
        if (models.length > 0) {
          addToast('success', `获取到 ${models.length} 个可用模型`);
        } else {
          addToast('warning', 'API 返回了空的模型列表');
        }
      } else {
        addToast('error', `获取模型列表失败: HTTP ${response.status}`);
      }
    } catch (error) {
      addToast('error', `获取模型列表失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoadingModels(false);
    }
  }, [proxyBaseUrl, authCode, addToast]);

  // ---- 保存授权码配置 ----
  const handleSaveAuth = useCallback(() => {
    if (!authCode.trim()) {
      addToast('warning', '请填写授权码');
      return;
    }
    if (!selectedModel.trim()) {
      addToast('warning', '请选择或填写模型名称');
      return;
    }

    const authConfig: AuthorizationConfig = {
      authCode: authCode.trim(),
      proxyBaseUrl: proxyBaseUrl.trim() || DEFAULT_PROXY_URL,
      selectedModel: selectedModel.trim(),
      temperature,
      maxTokens,
    };

    dispatch(aiActions.updateConfig({ authConfig }));

    // 同时生成一个对应的 LLMConfig，确保下游 AI 调用正常工作
    const llmConfig = {
      id: 'auth-default',
      name: '代理模型',
      interfaceFormat: 'openai' as const,
      apiKey: authConfig.authCode,
      baseUrl: authConfig.proxyBaseUrl,
      model: authConfig.selectedModel,
      maxTokens: authConfig.maxTokens,
      temperature: authConfig.temperature,
      timeout: 300000,
    };

    // 更新或添加 LLM 配置
    const existingIdx = config?.llmConfigs.findIndex((c) => c.id === 'auth-default') ?? -1;
    if (existingIdx >= 0) {
      dispatch(aiActions.updateLLMConfig('auth-default', llmConfig));
    } else {
      dispatch(aiActions.addLLMConfig(llmConfig));
    }

    // 自动指派所有任务到此配置
    dispatch(aiActions.setTaskAssignment({
      brainstorm: 'auth-default',
      outline: 'auth-default',
      draft: 'auth-default',
      review: 'auth-default',
      finalization: 'auth-default',
      summary: 'auth-default',
    }));

    addToast('success', '配置已保存');
  }, [authCode, proxyBaseUrl, selectedModel, temperature, maxTokens, config?.llmConfigs, dispatch, addToast]);

  // ---- 测试连接 ----
  const handleTestConnection = useCallback(async () => {
    if (!authCode.trim()) {
      addToast('warning', '请先填写授权码');
      return;
    }
    if (!selectedModel.trim()) {
      addToast('warning', '请先选择或填写模型名称');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestError('');

    const serviceConfig: LLMServiceConfig = {
      baseUrl: proxyBaseUrl.trim() || DEFAULT_PROXY_URL,
      apiKey: authCode.trim(),
      model: selectedModel.trim(),
      maxTokens: 150,
      temperature,
      timeout: 15000,
    };

    try {
      const result = await llmService.testConnection(serviceConfig);
      if (result.success) {
        setTestResult('success');
        addToast('success', '连接成功');
      } else {
        setTestResult('fail');
        setTestError(result.details || result.error || '连接失败');
        addToast('error', `连接失败: ${result.error || '请检查授权码和模型名称'}`);
      }
    } catch (error) {
      setTestResult('fail');
      setTestError(error instanceof Error ? error.message : '未知错误');
      addToast('error', `连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setTesting(false);
    }
  }, [authCode, proxyBaseUrl, selectedModel, temperature, addToast]);

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
    dispatch(uiActions.setEditorPrefs(editorPrefs));
    addToast('success', '设置已保存');
  }, [dispatch, addToast, editorPrefs]);

  // ---- Tab 定义 ----
  const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'api', label: 'API 配置', icon: <Key size={16} /> },
    { key: 'style', label: '风格管理', icon: <Palette size={16} /> },
    { key: 'editor', label: '编辑器偏好', icon: <Type size={16} /> },
  ];

  // ============================================================================
  // 渲染：API 配置 Tab（简化版：授权码 + 代理 + 模型选择）
  // ============================================================================

  const renderAPITab = () => (
    <div className="space-y-6">
      {/* 授权码配置卡片 */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-700">AI 接入配置</h3>
          </div>
          <p className="text-xs text-slate-400">
            填写授权码并选择模型即可使用所有 AI 功能。所有请求通过统一代理服务转发。
          </p>

          {/* 授权码 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
              <Key size={12} />
              授权码
            </label>
            <input
              type="password"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="输入你的授权码"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder:text-slate-400"
            />
          </div>

          {/* 代理地址 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
              <Server size={12} />
              代理地址
            </label>
            <input
              type="text"
              value={proxyBaseUrl}
              onChange={(e) => setProxyBaseUrl(e.target.value)}
              placeholder={DEFAULT_PROXY_URL}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-400 mt-1">
              默认：{DEFAULT_PROXY_URL}
            </p>
          </div>

          {/* 模型选择 */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
              <Cpu size={12} />
              模型
            </label>
            <div className="flex gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           bg-white"
              >
                <option value="">
                  {availableModels.length > 0 ? '请选择模型' : '点击右侧按钮获取模型列表'}
                </option>
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFetchModels}
                loading={loadingModels}
                icon={<RefreshCw size={14} className={loadingModels ? 'animate-spin' : ''} />}
                className="shrink-0"
              >
                获取列表
              </Button>
            </div>
            {/* 手动输入 */}
            <input
              type="text"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              placeholder="或手动输入模型名称，格式：provider/model（如 xiaomi/mimo-v2.5-pro）"
              className="w-full mt-2 px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder:text-slate-400"
            />
          </div>

          {/* 温度和最大 Token */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                温度 (Temperature)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1">0-2，越高越随机</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                最大输出 Token
              </label>
              <input
                type="number"
                step="256"
                min="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-400 mt-1">单次最大生成量</p>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="primary"
              icon={<Save size={14} />}
              onClick={handleSaveAuth}
            >
              保存配置
            </Button>
            <Button
              variant="ghost"
              icon={
                testing ? undefined :
                testResult === 'success' ? <Wifi size={14} className="text-emerald-500" /> :
                testResult === 'fail' ? <WifiOff size={14} className="text-red-500" /> :
                <Wifi size={14} />
              }
              loading={testing}
              onClick={handleTestConnection}
            >
              测试连接
            </Button>
            {testResult === 'success' && (
              <Badge variant="success">连接成功</Badge>
            )}
            {testResult === 'fail' && (
              <Badge variant="danger">连接失败</Badge>
            )}
          </div>

          {/* 测试错误详情 */}
          {testResult === 'fail' && testError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
              {testError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">使用说明</h3>
          <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
            <p>1. 填写授权码后，点击「获取列表」自动拉取该账号可用的模型列表</p>
            <p>2. 从下拉框选择模型，或手动输入 <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700">provider/model</code> 格式的模型名称</p>
            <p>3. 点击「测试连接」验证配置是否正确</p>
            <p>4. 确认无误后点击「保存配置」，系统将自动完成所有任务的模型指派</p>
          </div>
        </CardContent>
      </Card>
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
            const isSelected = config?.defaultStyle === preset.id;
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
      {config?.customStyles && config.customStyles.length > 0 && (
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
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* 顶部标题 */}
      <div className="shrink-0 px-6 py-5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <Settings size={20} className="text-slate-600 dark:text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">设置</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">配置 NovelFlow 的各项参数</p>
      </div>

      {/* 标签页 */}
      <div className="shrink-0 px-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${
                  activeTab === tab.key
                    ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600'
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
      <div className="flex-1 overflow-y-auto px-6 py-5 dark:text-slate-200">
        {activeTab === 'api' && renderAPITab()}
        {activeTab === 'style' && renderStyleTab()}
        {activeTab === 'editor' && renderEditorTab()}
      </div>
    </div>
  );
};

export default SettingsPanel;
