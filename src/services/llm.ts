/**
 * LLM 调用服务
 *
 * 兼容 OpenAI API 格式，支持：
 * - 流式输出（SSE）
 * - 非流式输出
 * - 多配置管理（不同任务用不同模型）
 * - 自动重试（3次）
 * - 超时控制
 * - 代理支持
 * - Think标签清理（移除 DeepSeek 等模型的 💭 标签）
 * - 错误处理
 */

import { invoke } from '@tauri-apps/api/tauri';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { generateShortId } from '../utils/id';

// ============================================================
// 类型定义
// ============================================================

export interface LLMServiceConfig {
  /** API 基础地址，例如 https://api.openai.com/v1 */
  baseUrl: string;
  /** API 密钥 */
  apiKey: string;
  /** 模型名称，例如 gpt-4o、deepseek-chat */
  model: string;
  /** 最大生成 token 数，默认 4096 */
  maxTokens?: number;
  /** 温度参数，默认 0.7 */
  temperature?: number;
  /** 超时时间（毫秒），默认 300000（5分钟）。大纲生成等长任务可能需要较长时间 */
  timeout?: number;
  /** HTTP 代理地址，例如 http://127.0.0.1:7890 */
  proxyUrl?: string;
  /** 额外的请求头 */
  extraHeaders?: Record<string, string>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  /** 完整的回复文本（已清理 think 标签） */
  content: string;
  /** 使用的模型名称 */
  model: string;
  /** prompt tokens 消耗 */
  promptTokens: number;
  /** completion tokens 消耗 */
  completionTokens: number;
  /** 总 token 消耗 */
  totalTokens: number;
}

export interface LLMStreamOptions {
  /** 流式回调，每收到一个 token 片段就调用 */
  onToken: (token: string) => void;
  /** 流式完成回调 */
  onComplete?: (fullContent: string) => void;
  /** 流式错误回调 */
  onError?: (error: LLMServiceError) => void;
}

export type TaskType =
  | 'brainstorm'
  | 'outline'
  | 'draft'
  | 'review'
  | 'finalization'
  | 'summary'
  | 'general';

interface LLMError {
  code: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
}

// ============================================================
// 配置管理器
// ============================================================

/**
 * LLM 配置管理器
 * 支持多配置管理，不同任务类型可使用不同模型
 */
export class LLMConfigManager {
  private configs = new Map<string, LLMServiceConfig>();
  private defaultConfig: LLMServiceConfig | null = null;

  /**
   * 注册配置
   * @param name 配置名称（如 'brainstorm', 'draft' 等任务类型）
   * @param config LLM 配置
   * @param isDefault 是否设为默认配置
   */
  register(name: string, config: LLMServiceConfig, isDefault = false): void {
    this.configs.set(name, config);
    if (isDefault) {
      this.defaultConfig = config;
    }
  }

  /**
   * 获取指定任务类型的配置，回退到默认配置
   * 回退顺序：精确匹配 -> 默认配置 -> 第一个注册的配置
   * @throws 如果没有找到任何配置
   */
  get(taskType: TaskType | string): LLMServiceConfig {
    // 1. 精确匹配任务类型
    const exactMatch = this.configs.get(taskType);
    if (exactMatch) return exactMatch;

    // 2. 使用默认配置
    if (this.defaultConfig) return this.defaultConfig;

    // 3. 使用第一个注册的配置（仅在只有一个配置时回退，避免不可预测行为）
    if (this.configs.size === 1) {
      return this.configs.values().next().value!;
    }

    throw new LLMServiceError({
      code: 'NO_CONFIG',
      message: `未找到任务类型 "${taskType}" 的 LLM 配置，请先添加配置或设置默认配置`,
      retryable: false,
    });
  }

  /**
   * 检查是否有任何配置可用
   */
  hasAnyConfig(): boolean {
    return this.configs.size > 0 || !!this.defaultConfig;
  }

  /**
   * 设置默认配置
   */
  setDefault(config: LLMServiceConfig): void {
    this.defaultConfig = config;
  }

  /**
   * 获取所有已注册的配置名称
   */
  listConfigs(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * 移除指定配置
   */
  remove(name: string): boolean {
    return this.configs.delete(name);
  }

  /**
   * 清空所有配置
   */
  clear(): void {
    this.configs.clear();
    this.defaultConfig = null;
  }
}

// ============================================================
// Think 标签清理
// ============================================================

/**
 * 清理 DeepSeek 等模型的 💭...💭 标签
 * 支持多种变体：
 * - 💭...💭
 * - <thinking>...</thinking>
 * - 嵌套的 think 标签
 * - 未闭合的 think 标签（流式中可能出现）
 */
export function cleanThinkTags(text: string): string {
  let cleaned = text;

  // 清理已闭合的 💭...💭 标签（含多行内容）
  cleaned = cleaned.replace(/💭[\s\S]*?💭/g, '');

  // 清理 <thinking>...</thinking> 标签（含多行内容）
  cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

  // 清理未闭合的 💭 标签（流式输出中可能出现）
  cleaned = cleaned.replace(/💭[\s\S]*$/g, '');

  // 清理未闭合的 <thinking> 标签
  cleaned = cleaned.replace(/<thinking>[\s\S]*$/gi, '');

  // 清理残留的空行（连续3个以上换行合并为2个）
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

// ============================================================
// 错误处理
// ============================================================

export class LLMServiceError extends Error {
  code: string;
  statusCode?: number;
  retryable: boolean;

  constructor(error: LLMError) {
    super(error.message);
    this.name = 'LLMServiceError';
    this.code = error.code;
    this.statusCode = error.statusCode;
    this.retryable = error.retryable;
  }
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof LLMServiceError) {
    return error.retryable;
  }
  // 网络错误、超时错误默认可重试
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  return false;
}

/**
 * 延迟指定毫秒
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// LLM 服务核心
// ============================================================

export class LLMService {
  private configManager: LLMConfigManager;
  private defaultMaxRetries = 3;
  private defaultRetryDelay = 1000;
  private configProvider?: () => { llmConfigs: Array<{ id: string; name: string; baseUrl: string; apiKey: string; model: string; maxTokens: number; temperature: number; timeout: number; proxyUrl?: string }>; taskAssignment?: Record<string, string>; proxySetting?: { enabled: boolean; httpProxy?: string; httpsProxy?: string } } | null;

  constructor(configManager?: LLMConfigManager) {
    this.configManager = configManager ?? new LLMConfigManager();
  }

  /**
   * 设置配置提供者（用于从外部 Store 获取配置）
   */
  setConfigProvider(provider: () => { llmConfigs: Array<{ id: string; name: string; baseUrl: string; apiKey: string; model: string; maxTokens: number; temperature: number; timeout: number; proxyUrl?: string }>; taskAssignment?: Record<string, string>; proxySetting?: { enabled: boolean; httpProxy?: string; httpsProxy?: string } } | null): void {
    this.configProvider = provider;
  }

  /**
   * 获取配置管理器
   */
  getConfigManager(): LLMConfigManager {
    return this.configManager;
  }

  /**
   * 同步外部配置到内部配置管理器
   */
  syncConfigs(): void {
    if (!this.configProvider) return;
    
    const externalConfig = this.configProvider();
    if (!externalConfig || !externalConfig.llmConfigs || externalConfig.llmConfigs.length === 0) {
      this.configManager.clear();
      return;
    }

    // 清空现有配置
    this.configManager.clear();

    // 确定代理 URL（优先使用 LLMConfig 上的 proxyUrl，其次使用全局代理设置）
    const globalProxyUrl = externalConfig.proxySetting?.enabled
      ? (externalConfig.proxySetting.httpsProxy || externalConfig.proxySetting.httpProxy)
      : undefined;

    // 注册所有配置
    for (const config of externalConfig.llmConfigs) {
      const serviceConfig: LLMServiceConfig = {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        timeout: config.timeout,
        proxyUrl: config.proxyUrl || globalProxyUrl,
      };
      this.configManager.register(config.id, serviceConfig);
    }

    // 根据任务指派设置默认配置
    if (externalConfig.taskAssignment) {
      for (const [taskType, configId] of Object.entries(externalConfig.taskAssignment)) {
        const config = externalConfig.llmConfigs.find(c => c.id === configId);
        if (config) {
          const serviceConfig: LLMServiceConfig = {
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            model: config.model,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            timeout: config.timeout,
            proxyUrl: config.proxyUrl || globalProxyUrl,
          };
          this.configManager.register(taskType, serviceConfig);
        }
      }
    }
  }

  /**
   * 检查是否有可用的 LLM 配置
   */
  hasConfig(): boolean {
    this.syncConfigs();
    return this.configManager.hasAnyConfig();
  }

  // ----------------------------------------------------------
  // 非流式调用
  // ----------------------------------------------------------

  /**
   * 发送聊天请求（非流式）
   * @param messages 消息列表
   * @param config LLM 配置（可选，不传则根据 taskType 获取）
   * @param taskType 任务类型（用于配置管理器查找对应配置）
   */
  async chat(
    messages: ChatMessage[],
    config?: LLMServiceConfig,
    taskType: TaskType = 'general',
  ): Promise<LLMResponse> {
    this.syncConfigs();
    const resolvedConfig = config ?? this.configManager.get(taskType);
    const url = this.buildUrl(resolvedConfig);
    const body = this.buildRequestBody(messages, resolvedConfig, false);
    const headers = this.buildHeaders(resolvedConfig);

    try {
      // 使用 Tauri 命令发送 HTTP 请求，绕过 CORS 限制
      // 将前端配置的超时（毫秒）转换为秒传给后端，默认 300 秒
      const timeoutSecs = resolvedConfig.timeout
        ? Math.ceil(resolvedConfig.timeout / 1000)
        : 300;
      const response = await invoke<{
        status: number;
        status_text: string;
        headers: Record<string, string>;
        body: string;
      }>('http_request', {
        request: {
          url,
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          timeout_secs: timeoutSecs,
        },
      });

      if (response.status < 200 || response.status >= 300) {
        let errorMessage = `HTTP ${response.status}: ${response.status_text}`;
        try {
          const errorData = JSON.parse(response.body);
          if (errorData.error) {
            errorMessage = `${errorData.error.code || 'API_ERROR'}: ${errorData.error.message || response.status_text}`;
          }
        } catch {
          if (response.body) {
            errorMessage += ` | 响应: ${response.body.substring(0, 500)}`;
          }
        }
        throw new LLMServiceError({
          code: 'API_ERROR',
          message: errorMessage,
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        });
      }

      const data = JSON.parse(response.body);
      const content = this.extractContent(data);
      const cleanedContent = cleanThinkTags(content);
      const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      return {
        content: cleanedContent,
        model: data.model ?? resolvedConfig.model,
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
      };
    } catch (error) {
      if (error instanceof LLMServiceError) {
        throw error;
      }
      throw new LLMServiceError({
        code: 'REQUEST_FAILED',
        message: error instanceof Error ? error.message : String(error),
        retryable: true,
      });
    }
  }

  /**
   * 带重试的聊天请求
   */
  async chatWithRetry(
    messages: ChatMessage[],
    config?: LLMServiceConfig,
    taskType: TaskType = 'general',
    maxRetries?: number,
  ): Promise<LLMResponse> {
    const retries = maxRetries ?? this.defaultMaxRetries;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.chat(messages, config, taskType);
      } catch (error) {
        lastError = error;

        if (attempt < retries && isRetryableError(error)) {
          const delayMs = this.defaultRetryDelay * Math.pow(2, attempt);
          console.warn(`[LLM] 第 ${attempt + 1} 次重试，等待 ${delayMs}ms...`);
          await delay(delayMs);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  // ----------------------------------------------------------
  // 流式调用
  // ----------------------------------------------------------

  /**
   * 流式聊天请求 - 使用 Tauri 后端命令
   * @param messages 消息列表
   * @param options 流式选项
   * @param config LLM 配置
   */
  async chatStream(
    messages: ChatMessage[],
    options: LLMStreamOptions,
    config?: LLMServiceConfig,
    taskType: TaskType = 'general',
  ): Promise<string> {
    this.syncConfigs();
    const resolvedConfig = config ?? this.configManager.get(taskType);
    const url = this.buildUrl(resolvedConfig);
    const body = this.buildRequestBody(messages, resolvedConfig, true);
    const headers = this.buildHeaders(resolvedConfig);

    const requestId = generateShortId('stream');
    let fullContent = '';
    let streamDone = false;
    let streamError: LLMServiceError | null = null;

    // 设置事件监听
    let unlistenChunk: UnlistenFn | null = null;
    let unlistenError: UnlistenFn | null = null;

    // 创建一个Promise，当收到done信号时resolve
    let resolveStreamDone: () => void;
    const streamDonePromise = new Promise<void>((resolve) => {
      resolveStreamDone = resolve;
    });

    try {
      // 并行注册两个事件监听器，确保在 invoke 之前都已就绪
      [unlistenChunk, unlistenError] = await Promise.all([
        // 监听流式数据块
        listen<{ request_id: string; chunk: string; done: boolean }>(
          'stream-chunk',
          (event) => {
            if (event.payload.request_id !== requestId) return;

            if (event.payload.done) {
              streamDone = true;
              resolveStreamDone();
              return;
            }

            // 处理 SSE 格式的数据
            const lines = event.payload.chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content ?? '';
                  if (delta) {
                    fullContent += delta;
                    options.onToken(delta);
                  }
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        ),
        // 监听错误
        listen<{ request_id: string; error: string }>(
          'stream-error',
          (event) => {
            if (event.payload.request_id !== requestId) return;
            streamDone = true;
            resolveStreamDone();
            streamError = new LLMServiceError({
              code: 'STREAM_ERROR',
              message: event.payload.error,
              retryable: true,
            });
            options.onError?.(streamError);
          }
        ),
      ]);

      // 调用 Tauri 流式命令
      await invoke('http_request_stream', {
        requestId,
        request: {
          url,
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        },
      });

      // 等待流完成信号（done: true 事件）
      // invoke返回后Rust端已完成所有事件emit，但JS事件队列可能还没处理完
      // 给一个短延迟让事件队列处理，然后等待done信号
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      if (!streamDone) {
        // 如果50ms内还没收到done信号，继续等待（最多30秒）
        const timeout = setTimeout(() => {
          streamDone = true;
          resolveStreamDone();
        }, 30000);
        await streamDonePromise;
        clearTimeout(timeout);
      }

      // 如果流式过程中发生了错误，抛出异常而不是静默返回
      if (streamError) {
        throw streamError;
      }

      const cleanedContent = cleanThinkTags(fullContent);
      options.onComplete?.(cleanedContent);
      return cleanedContent;
    } catch (error) {
      const err = new LLMServiceError({
        code: 'STREAM_ERROR',
        message: error instanceof Error ? error.message : '流式读取失败',
        retryable: true,
      });
      options.onError?.(err);
      throw err;
    } finally {
      // 清理事件监听
      unlistenChunk?.();
      unlistenError?.();
    }
  }

  // ----------------------------------------------------------
  // 连接测试
  // ----------------------------------------------------------

  /**
   * 测试 LLM 连接是否正常
   * @param config LLM 配置
   * @returns 测试结果，包含成功/失败状态和详细错误信息
   */
  async testConnection(config: LLMServiceConfig): Promise<{ success: boolean; error?: string; details?: string }> {
    const url = this.buildUrl(config);
    const body = this.buildRequestBody(
      [{ role: 'user', content: '请回复"连接成功"四个字。' }],
      { ...config, maxTokens: 150, timeout: 15000 },
      false,
    );
    const headers = this.buildHeaders(config);

    try {
      // 使用 Tauri 命令发送 HTTP 请求，连接测试使用 15 秒超时
      const response = await invoke<{
        status: number;
        status_text: string;
        headers: Record<string, string>;
        body: string;
      }>('http_request', {
        request: {
          url,
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          timeout_secs: 15,
        },
      });

      if (response.status < 200 || response.status >= 300) {
        let errorMessage = `HTTP ${response.status}: ${response.status_text}`;
        try {
          const errorData = JSON.parse(response.body);
          if (errorData.error) {
            errorMessage = `${errorData.error.code || 'API_ERROR'}: ${errorData.error.message || response.status_text}`;
          }
        } catch {
          if (response.body) {
            errorMessage += ` | 原始响应: ${response.body.substring(0, 500)}`;
          }
        }

        return {
          success: false,
          error: errorMessage,
          details: `请求URL: ${url}\n状态码: ${response.status}\n原始响应: ${response.body.substring(0, 1000)}`,
        };
      }

      // 解析成功响应
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(response.body);
      } catch {
        return {
          success: false,
          error: '响应解析失败',
          details: `无法解析JSON响应: ${response.body.substring(0, 500)}`,
        };
      }

      const content = this.extractContent(data);
      if (content.length > 0) {
        return { success: true };
      }

      return {
        success: false,
        error: '响应内容为空',
        details: `完整响应: ${JSON.stringify(data, null, 2).substring(0, 1000)}`,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `请求失败: ${errorMsg}`,
        details: `请求URL: ${url}\n错误类型: ${error?.constructor?.name || 'Unknown'}\n完整错误: ${errorMsg}`,
      };
    }
  }

  // ----------------------------------------------------------
  // 内部工具方法
  // ----------------------------------------------------------

  /**
   * 构建 API URL
   * 支持两种格式：
   * 1. 基础URL: https://api.openai.com/v1 -> 自动添加 /chat/completions
   * 2. 完整URL: https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions -> 直接使用
   */
  private buildUrl(config: LLMServiceConfig): string {
    let baseUrl = config.baseUrl.trim();
    
    // 如果已经是完整路径，直接使用
    if (baseUrl.includes('/chat/completions')) {
      return baseUrl.replace(/\/+$/, '');
    }
    
    // 否则添加 /chat/completions
    baseUrl = baseUrl.replace(/\/+$/, '');
    return baseUrl + '/chat/completions';
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(
    messages: ChatMessage[],
    config: LLMServiceConfig,
    stream: boolean,
  ): Record<string, unknown> {
    return {
      model: config.model,
      messages,
      max_tokens: config.maxTokens ?? 4096,
      temperature: config.temperature ?? 0.7,
      stream,
    };
  }

  /**
   * 构建请求头
   */
  private buildHeaders(config: LLMServiceConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };

    if (config.extraHeaders) {
      Object.assign(headers, config.extraHeaders);
    }

    return headers;
  }

  /**
   * 从 API 响应中提取内容
   * 支持标准 OpenAI 格式和兼容格式
   * 兼容推理模型：优先使用 content，如果为空则回退到 reasoning_content
   */
  private extractContent(data: Record<string, unknown>): string {
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    if (!choices || choices.length === 0) {
      return '';
    }

    const message = choices[0].message as Record<string, unknown> | undefined;
    if (!message) return '';

    // 优先使用 content（正常回复）
    const content = message.content as string;
    if (content && content.length > 0) {
      return content;
    }

    // 回退到 reasoning_content（推理模型的思考输出）
    const reasoningContent = message.reasoning_content as string;
    if (reasoningContent && reasoningContent.length > 0) {
      return reasoningContent;
    }

    return '';
  }

}

// ============================================================
// 全局单例
// ============================================================

/**
 * 全局 LLM 服务实例
 * 应用内统一使用此实例
 */
export const llmService = new LLMService();
