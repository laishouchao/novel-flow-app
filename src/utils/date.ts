// ============================================================================
// Novel Flow - 日期格式化工具
// ============================================================================
// 提供统一的日期时间格式化函数
// ============================================================================

/**
 * 获取当前时间的 ISO 字符串
 * @returns ISO 8601 格式的时间字符串
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * 将日期字符串解析为 Date 对象
 *
 * @param dateStr - ISO 8601 格式的日期字符串
 * @returns Date 对象，解析失败返回 null
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * 格式化为完整的日期时间字符串（中文）
 *
 * @param dateStr - ISO 8601 格式的日期字符串
 * @returns 格式化后的字符串，如 "2024年5月15日 14:30:25"
 */
export function formatDateTime(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return '';
  return formatDateFromDate(date) + ' ' + formatTimeFromDate(date);
}

/**
 * 格式化为日期字符串（中文）
 *
 * @param dateStr - ISO 8601 格式的日期字符串
 * @returns 格式化后的字符串，如 "2024年5月15日"
 */
export function formatDate(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return '';
  return formatDateFromDate(date);
}

/**
 * 格式化为时间字符串
 *
 * @param dateStr - ISO 8601 格式的日期字符串
 * @returns 格式化后的字符串，如 "14:30:25"
 */
export function formatTime(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return '';
  return formatTimeFromDate(date);
}

/**
 * 格式化为短日期字符串
 *
 * @param dateStr - ISO 8601 格式的日期字符串
 * @returns 格式化后的字符串，如 "05-15 14:30"
 */
export function formatShortDateTime(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

/**
 * 格式化为相对时间（如 "3分钟前"、"2小时前"）
 *
 * @param dateStr - ISO 8601 格式的日期字符串
 * @returns 相对时间字符串
 */
export function formatRelativeTime(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return '';
  return getRelativeTime(date);
}

/**
 * 计算两个日期之间的时间差（人类可读格式）
 *
 * @param startDate - 起始日期字符串
 * @param endDate - 结束日期字符串（默认为当前时间）
 * @returns 时间差描述，如 "2天3小时"
 */
export function formatDuration(startDate: string, endDate?: string): string {
  const start = parseDate(startDate);
  const end = endDate ? parseDate(endDate) : new Date();
  if (!start || !end) return '';

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return '';

  return formatDurationMs(diffMs);
}

/**
 * 判断日期是否为今天
 *
 * @param dateStr - ISO 8601 格式的日期字符串
 * @returns 是否为今天
 */
export function isToday(dateStr: string): boolean {
  const date = parseDate(dateStr);
  if (!date) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * 判断日期是否在本周内
 *
 * @param dateStr - ISO 8601 格式的日期字符串
 * @returns 是否在本周内
 */
export function isThisWeek(dateStr: string): boolean {
  const date = parseDate(dateStr);
  if (!date) return false;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return date >= startOfWeek && date < endOfWeek;
}

// ============================================================================
// 内部辅助函数
// ============================================================================

function formatDateFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

function formatTimeFromDate(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffWeeks < 4) return `${diffWeeks}周前`;
  if (diffMonths < 12) return `${diffMonths}个月前`;
  return formatDateFromDate(date);
}

function formatDurationMs(diffMs: number): string {
  const seconds = Math.floor(diffMs / 1000) % 60;
  const minutes = Math.floor(diffMs / (1000 * 60)) % 60;
  const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds}秒`);

  return parts.join('') || '0秒';
}
