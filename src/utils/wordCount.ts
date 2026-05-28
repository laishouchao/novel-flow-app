// ============================================================================
// Novel Flow - 中文字数统计工具
// ============================================================================
// 精确统计中文字数，支持中英混合文本
// ============================================================================

/**
 * 统计文本中的中文字数
 *
 * 统计规则：
 * - 每个中文字符计为 1 字
 * - 每个中文标点计为 1 字
 * - 连续的英文单词计为 1 字
 * - 连续的数字序列计为 1 字
 * - 换行符、空白字符不计入
 *
 * @param text - 待统计的文本
 * @returns 字数
 *
 * @example
 * countChineseWords('你好世界')           // 4
 * countChineseWords('你好 Hello 世界')     // 5 (你好=2, Hello=1, 世界=2)
 * countChineseWords('第1章 开始')          // 4 (第=1, 1=1, 章=1, 开始=2)
 */
export function countChineseWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;

  let count = 0;
  let inEnglishWord = false;
  let inNumberSequence = false;

  // 使用 for...of 迭代以正确处理代理对（surrogate pairs）
  for (const char of text) {
    const code = char.codePointAt(0)!;

    // 中文字符范围（CJK 统一汉字，含扩展 B 区代理对字符）
    if (isChineseCharacter(code)) {
      count++;
      inEnglishWord = false;
      inNumberSequence = false;
      continue;
    }

    // 中文标点符号
    if (isChinesePunctuation(char)) {
      count++;
      inEnglishWord = false;
      inNumberSequence = false;
      continue;
    }

    // 英文字母
    if (isEnglishLetter(code)) {
      if (!inEnglishWord) {
        count++;
        inEnglishWord = true;
      }
      inNumberSequence = false;
      continue;
    }

    // 数字
    if (isDigit(code)) {
      if (!inNumberSequence) {
        count++;
        inNumberSequence = true;
      }
      inEnglishWord = false;
      continue;
    }

    // 其他字符（空白、换行等）重置状态
    inEnglishWord = false;
    inNumberSequence = false;
  }

  return count;
}

/**
 * 统计文本中的总字符数（含空白）
 *
 * @param text - 待统计的文本
 * @returns 字符数
 */
export function countCharacters(text: string): number {
  if (!text) return 0;
  return text.length;
}

/**
 * 统计文本中的非空白字符数
 *
 * @param text - 待统计的文本
 * @returns 非空白字符数
 */
export function countCharactersNoSpaces(text: string): number {
  if (!text) return 0;
  return text.replace(/\s/g, '').length;
}

/**
 * 统计段落数
 *
 * @param text - 待统计的文本
 * @returns 段落数
 */
export function countParagraphs(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.split(/\n+/).filter((p) => p.trim().length > 0).length;
}

/**
 * 统计句子数（以中文句号、问号、感叹号以及英文句号分隔）
 *
 * @param text - 待统计的文本
 * @returns 句子数
 */
export function countSentences(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const sentences = text.split(/[。！？.!?]+/).filter((s) => s.trim().length > 0);
  return sentences.length;
}

/**
 * 统计对话行数（以引号包裹的内容）
 *
 * @param text - 待统计的文本
 * @returns 对话行数
 */
export function countDialogueLines(text: string): number {
  if (!text) return 0;
  // 匹配中文引号和英文引号
  const matches = text.match(/[\u201c\u201d"][^"'""\n]+[\u201c\u201d"]/g);
  if (!matches) return 0;
  return matches.length;
}

/**
 * 计算预估阅读时间（中文平均阅读速度 500 字/分钟）
 *
 * @param text - 待计算的文本
 * @param wordsPerMinute - 每分钟阅读字数，默认 500
 * @returns 阅读时间描述，如 "约 5 分钟"
 */
export function estimateReadingTime(text: string, wordsPerMinute: number = 500): string {
  const words = countChineseWords(text);
  if (words === 0) return '不到 1 分钟';

  const minutes = Math.ceil(words / wordsPerMinute);

  if (minutes < 1) return '不到 1 分钟';
  if (minutes === 1) return '约 1 分钟';
  return `约 ${minutes} 分钟`;
}

/**
 * 计算写作进度百分比
 *
 * @param currentWords - 当前字数
 * @param targetWords - 目标字数
 * @returns 进度百分比（0-100）
 */
export function calculateProgress(currentWords: number, targetWords: number): number {
  if (targetWords <= 0) return 0;
  return Math.min(100, Math.round((currentWords / targetWords) * 100));
}

/**
 * 格式化字数显示（大数字友好）
 *
 * @param count - 字数
 * @returns 格式化后的字符串，如 "1.2万"
 */
export function formatWordCount(count: number): string {
  if (count < 10000) return String(count);
  const wan = count / 10000;
  if (wan < 10) return `${wan.toFixed(1)}万`;
  return `${Math.round(wan)}万`;
}

/**
 * 生成字数统计报告
 *
 * @param text - 待分析的文本
 * @returns 包含各项统计数据的对象
 */
export function getWordCountReport(text: string): WordCountReport {
  const words = countChineseWords(text);
  const characters = countCharacters(text);
  const charactersNoSpaces = countCharactersNoSpaces(text);
  const paragraphs = countParagraphs(text);
  const sentences = countSentences(text);
  const dialogues = countDialogueLines(text);
  const readingTime = estimateReadingTime(text);

  return {
    words,
    characters,
    charactersNoSpaces,
    paragraphs,
    sentences,
    dialogues,
    readingTime,
  };
}

/** 字数统计报告 */
export interface WordCountReport {
  /** 中文字数（主要指标） */
  words: number;
  /** 总字符数（含空白） */
  characters: number;
  /** 非空白字符数 */
  charactersNoSpaces: number;
  /** 段落数 */
  paragraphs: number;
  /** 句子数 */
  sentences: number;
  /** 对话行数 */
  dialogues: number;
  /** 预估阅读时间 */
  readingTime: string;
}

// ============================================================================
// 内部辅助函数
// ============================================================================

/**
 * 判断字符编码是否为中文字符
 * 覆盖 CJK 统一汉字基本区（U+4E00 - U+9FFF）
 * 和扩展 A 区（U+3400 - U+4DBF）
 */
function isChineseCharacter(code: number): boolean {
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||   // CJK 统一汉字基本区
    (code >= 0x3400 && code <= 0x4dbf) ||   // CJK 扩展 A
    (code >= 0x20000 && code <= 0x2a6df) || // CJK 扩展 B（代理对处理）
    (code >= 0xf900 && code <= 0xfaff)      // CJK 兼容汉字
  );
}

/**
 * 判断字符是否为中文标点符号
 */
function isChinesePunctuation(char: string): boolean {
  const chinesePunctuation = '\uFF0C\u3002\u3001\uFF1B\uFF1A\uFF1F\uFF01\u201C\u201D\u2018\u2019\u3010\u3011\u300A\u300B\uFF08\uFF09\u2014\u2026\u00B7';
  return chinesePunctuation.includes(char);
}

/**
 * 判断字符编码是否为英文字母
 */
function isEnglishLetter(code: number): boolean {
  return (
    (code >= 0x41 && code <= 0x5a) || // A-Z
    (code >= 0x61 && code <= 0x7a)    // a-z
  );
}

/**
 * 判断字符编码是否为数字
 */
function isDigit(code: number): boolean {
  return code >= 0x30 && code <= 0x39; // 0-9
}
