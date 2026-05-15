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
  /** 超时时间（毫秒），默认 60000 */
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
  onError?: (error: Error) => void;
}

export interface LLMError {
  code: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
}

export type TaskType =
  | 'brainstorm'      // 灵感收束
  | 'outline'         // 大纲生成
  | 'draft'           // 章节写作
  | 'review'          // 审查
  | 'summary'         // 摘要生成
  | 'consistency'     // 一致性检查
  | 'finalization'    // 定稿/设定同步
  | 'general';        // 通用

// ============================================================
// 配置管理器
// ============================================================

/**
 * 多配置管理器 -- 不同任务可以使用不同的模型和参数
 */
export class LLMConfigManager {
  private configs: Map<string, LLMServiceConfig> = new Map();
  private defaultConfig: LLMServiceConfig | null = null;

  /**
   * 注册一个配置
   * @param name 配置名称或任务类型
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
   */
  get(taskType: TaskType | string): LLMServiceConfig {
    return this.configs.get(taskType) ?? this.defaultConfig ?? this.configs.values().next().value as LLMServiceConfig;
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

  constructor(configManager?: LLMConfigManager) {
    this.configManager = configManager ?? new LLMConfigManager();
  }

  /**
   * 获取配置管理器
   */
  getConfigManager(): LLMConfigManager {
    return this.configManager;
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
    const resolvedConfig = config ?? this.configManager.get(taskType);
    const url = this.buildUrl(resolvedConfig);
    const body = this.buildRequestBody(messages, resolvedConfig, false);
    const headers = this.buildHeaders(resolvedConfig);

    const controller = new AbortController();
    const timeout = resolvedConfig.timeout ?? 60000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw new LLMServiceError({
          code: errorData.code ?? 'API_ERROR',
          message: errorData.message ?? `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        });
      }

      const data = await response.json();
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
      clearTimeout(timeoutId);
      if (error instanceof LLMServiceError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new LLMServiceError({
          code: 'TIMEOUT',
          message: `请求超时（${timeout}ms）`,
          retryable: true,
        });
      }
      throw new LLMServiceError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : '网络请求失败',
        retryable: true,
      });
    }
  }

  // ----------------------------------------------------------
  // 带重试的调用
  // ----------------------------------------------------------

  /**
   * 带自动重试的聊天请求
   * @param messages 消息列表
   * @param config LLM 配置
   * @param maxRetries 最大重试次数，默认 3
   * @param retryDelay 重试间隔（毫秒），默认 1000，每次重试指数退避
   */
  async chatWithRetry(
    messages: ChatMessage[],
    config?: LLMServiceConfig,
    taskType: TaskType = 'general',
    maxRetries?: number,
    retryDelay?: number,
  ): Promise<LLMResponse> {
    const retries = maxRetries ?? this.defaultMaxRetries;
    const baseDelay = retryDelay ?? this.defaultRetryDelay;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.chat(messages, config, taskType);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!isRetryableError(error) || attempt >= retries) {
          throw lastError;
        }

        // 指数退避：1s, 2s, 4s ...
        const waitTime = baseDelay * Math.pow(2, attempt);
        console.warn(
          `[LLM] 第 ${attempt + 1} 次重试，${waitTime}ms 后重试... 错误: ${lastError.message}`,
        );
        await delay(waitTime);
      }
    }

    throw lastError!;
  }

  // ----------------------------------------------------------
  // 流式调用
  // ----------------------------------------------------------

  /**
   * 流式聊天请求（SSE）
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
    const resolvedConfig = config ?? this.configManager.get(taskType);
    const url = this.buildUrl(resolvedConfig);
    const body = this.buildRequestBody(messages, resolvedConfig, true);
    const headers = this.buildHeaders(resolvedConfig);

    const controller = new AbortController();
    const timeout = resolvedConfig.timeout ?? 120000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let fullContent = '';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        const error = new LLMServiceError({
          code: errorData.code ?? 'API_ERROR',
          message: errorData.message ?? `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        });
        options.onError?.(error);
        throw error;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new LLMServiceError({
          code: 'NO_RESPONSE_BODY',
          message: '响应体为空，无法读取流',
          retryable: false,
        });
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 按行解析 SSE 数据
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              options.onToken(delta);
            }
          } catch {
            // 忽略无法解析的行
          }
        }
      }

      // 清理 think 标签后返回
      const cleanedContent = cleanThinkTags(fullContent);
      options.onComplete?.(cleanedContent);
      return cleanedContent;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof LLMServiceError) {
        options.onError?.(error);
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        const err = new LLMServiceError({
          code: 'TIMEOUT',
          message: `流式请求超时（${timeout}ms）`,
          retryable: true,
        });
        options.onError?.(err);
        throw err;
      }
      const err = new LLMServiceError({
        code: 'STREAM_ERROR',
        message: error instanceof Error ? error.message : '流式读取失败',
        retryable: true,
      });
      options.onError?.(err);
      throw err;
    }
  }

  // ----------------------------------------------------------
  // 连接测试
  // ----------------------------------------------------------

  /**
   * 测试 LLM 连接是否正常
   * @param config LLM 配置
   */
  async testConnection(config: LLMServiceConfig): Promise<boolean> {
    try {
      const response = await this.chat(
        [
          { role: 'user', content: '请回复"连接成功"四个字。' },
        ],
        {
          ...config,
          maxTokens: 20,
          timeout: 15000,
        },
      );
      return response.content.length > 0;
    } catch {
      return false;
    }
  }

  // ----------------------------------------------------------
  // 内部工具方法
  // ----------------------------------------------------------

  /**
   * 构建 API URL
   */
  private buildUrl(config: LLMServiceConfig): string {
    let baseUrl = config.baseUrl.replace(/\/+$/, '');
    if (!baseUrl.endsWith('/chat/completions')) {
      baseUrl += '/chat/completions';
    }
    return baseUrl;
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
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
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

    // 合并额外请求头
    if (config.extraHeaders) {
      Object.assign(headers, config.extraHeaders);
    }

    return headers;
  }

  /**
   * 从非流式响应中提取文本内容
   */
  private extractContent(data: Record<string, unknown>): string {
    const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
    if (choices?.[0]?.message?.content) {
      return choices[0].message.content;
    }
    // 某些 API 返回格式不同
    if (typeof data.content === 'string') {
      return data.content;
    }
    if (typeof data.text === 'string') {
      return data.text;
    }
    return '';
  }

  /**
   * 解析错误响应
   */
  private async parseErrorResponse(
    response: Response,
  ): Promise<{ code?: string; message?: string }> {
    try {
      const data = await response.json();
      return {
        code: data.error?.code ?? data.code,
        message: data.error?.message ?? data.message ?? data.error,
      };
    } catch {
      return { message: response.statusText };
    }
  }
}

// ============================================================
// 导出便捷实例
// ============================================================

/** 全局默认配置管理器 */
export const globalConfigManager = new LLMConfigManager();

/** 全局默认 LLM 服务实例 */
export const llmService = new LLMService(globalConfigManager);
