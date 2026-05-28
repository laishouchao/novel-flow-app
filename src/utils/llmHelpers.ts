// ============================================================================
// Novel Flow - LLM 辅助工具函数
// ============================================================================

import type { AppState } from '../store';

/**
 * 检查是否有可用的 LLM 配置
 * 统一判断逻辑，避免各组件重复实现
 *
 * @param aiState - store 中的 ai 状态
 * @returns 是否有可用的 LLM 配置
 */
export function hasLLMConfig(aiState: AppState['ai']): boolean {
  return !!(
    aiState.config?.llmConfigs &&
    aiState.config.llmConfigs.length > 0
  );
}
