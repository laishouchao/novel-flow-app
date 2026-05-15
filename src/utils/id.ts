// ============================================================================
// Novel Flow - ID 生成工具
// ============================================================================
// 提供多种 ID 生成策略，满足不同场景需求
// ============================================================================

/**
 * 生成带前缀的唯一 ID
 * 格式: {prefix}_{timestamp}_{random}
 *
 * @param prefix - ID 前缀（如 'proj', 'ch', 'vol', 'char'）
 * @returns 唯一 ID 字符串
 *
 * @example
 * generateId('proj')   // 'proj_1715740800000_a3f2k9'
 * generateId('ch')     // 'ch_1715740800000_b7g1m4'
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 生成短 ID（适用于通知等临时场景）
 * 格式: {type}-{timestamp}-{random}
 *
 * @param type - 类型标识
 * @returns 短 ID 字符串
 */
export function generateShortId(type: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 6);
  return `${type}-${timestamp}-${random}`;
}

/**
 * 生成项目 ID
 * @returns 项目 ID（格式: proj_xxx）
 */
export function generateProjectId(): string {
  return generateId('proj');
}

/**
 * 生成卷 ID
 * @returns 卷 ID（格式: vol_xxx）
 */
export function generateVolumeId(): string {
  return generateId('vol');
}

/**
 * 生成章节 ID
 * @returns 章节 ID（格式: ch_xxx）
 */
export function generateChapterId(): string {
  return generateId('ch');
}

/**
 * 生成角色 ID
 * @returns 角色 ID（格式: char_xxx）
 */
export function generateCharacterId(): string {
  return generateId('char');
}

/**
 * 生成 LLM 配置 ID
 * @returns LLM 配置 ID（格式: llm_xxx）
 */
export function generateLLMConfigId(): string {
  return generateId('llm');
}

/**
 * 生成对话消息 ID
 * @returns 消息 ID（格式: msg_xxx）
 */
export function generateMessageId(): string {
  return generateId('msg');
}

/**
 * 生成通知 ID
 * @returns 通知 ID（格式: notif_xxx）
 */
export function generateNotificationId(): string {
  return generateShortId('notif');
}

/**
 * 生成有序序列 ID（用于章节排序等场景）
 *
 * @param prefix - 前缀
 * @param volumeNumber - 卷号
 * @param chapterNumber - 章节号
 * @returns 有序 ID（格式: {prefix}_v{volume}_c{chapter}）
 *
 * @example
 * generateSequentialId('ch', 1, 5)  // 'ch_v1_c5'
 */
export function generateSequentialId(
  prefix: string,
  volumeNumber: number,
  chapterNumber: number
): string {
  return `${prefix}_v${volumeNumber}_c${chapterNumber}`;
}

/**
 * 从有序 ID 中解析卷号和章节号
 *
 * @param id - 有序 ID
 * @returns 包含 volumeNumber 和 chapterNumber 的对象，解析失败返回 null
 *
 * @example
 * parseSequentialId('ch_v1_c5')  // { volumeNumber: 1, chapterNumber: 5 }
 */
export function parseSequentialId(
  id: string
): { volumeNumber: number; chapterNumber: number } | null {
  const match = id.match(/_v(\d+)_c(\d+)$/);
  if (!match) return null;
  return {
    volumeNumber: parseInt(match[1], 10),
    chapterNumber: parseInt(match[2], 10),
  };
}

/**
 * 验证 ID 格式是否合法
 *
 * @param id - 待验证的 ID
 * @param prefix - 期望的前缀（可选）
 * @returns 是否合法
 */
export function isValidId(id: string, prefix?: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (prefix) {
    return id.startsWith(`${prefix}_`);
  }
  // 通用格式: {word}_{timestamp}_{random}
  return /^[a-z]+_\d+_[a-z0-9]+$/.test(id);
}
