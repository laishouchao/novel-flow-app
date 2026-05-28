import React, { useState, useMemo, useCallback } from 'react';
import {
  Download,
  FileText,
  FileJson,
  FileType,
  Check,
} from 'lucide-react';
import { useAppState } from '../../store';
import Button from '../common/Button';

// ============================================================================
// 导出工具函数
// ============================================================================

/** 导出为 Markdown */
function exportToMarkdown(project: any, chapters: any[], characters: any[], volumes: any[]): string {
  const lines: string[] = [];

  // 标题
  lines.push(`# ${project.name}`);
  lines.push('');
  if (project.author) lines.push(`**作者：** ${project.author}`);
  if (project.genre) lines.push(`**题材：** ${project.genre}`);
  if (project.theme) lines.push(`**主题：** ${project.theme}`);
  lines.push(`**目标字数：** ${project.targetWords?.toLocaleString() || '未设定'}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 角色
  if (characters.length > 0) {
    lines.push('## 角色设定');
    lines.push('');
    for (const char of characters) {
      lines.push(`### ${char.name}`);
      lines.push(`- **类型：** ${char.role}`);
      if (char.trait) lines.push(`- **特征：** ${char.trait}`);
      if (char.drive) lines.push(`- **驱动力：** ${char.drive}`);
      if (char.fear) lines.push(`- **恐惧：** ${char.fear}`);
      if (char.backstory) lines.push(`- **背景：** ${char.backstory}`);
      lines.push('');
    }
  }

  // 按卷输出章节
  const sortedVolumes = [...volumes].sort((a, b) => a.volumeNumber - b.volumeNumber);
  for (const vol of sortedVolumes) {
    lines.push(`## ${vol.title}`);
    lines.push('');

    const volChapters = chapters
      .filter(c => c.volumeNumber === vol.volumeNumber)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);

    for (const ch of volChapters) {
      lines.push(`### 第${ch.chapterNumber}章 ${ch.title}`);
      lines.push('');

      const content = ch.finalContent || ch.draftContent;
      if (content) {
        lines.push(content);
      } else if (ch.task) {
        lines.push(`> ${ch.task}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/** 导出为纯文本 */
function exportToText(project: any, chapters: any[], volumes: any[]): string {
  const lines: string[] = [];

  lines.push(project.name);
  lines.push('='.repeat(project.name.length * 2));
  lines.push('');

  const sortedVolumes = [...volumes].sort((a, b) => a.volumeNumber - b.volumeNumber);
  for (const vol of sortedVolumes) {
    lines.push(`【${vol.title}】`);
    lines.push('');

    const volChapters = chapters
      .filter(c => c.volumeNumber === vol.volumeNumber)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);

    for (const ch of volChapters) {
      lines.push(`第${ch.chapterNumber}章 ${ch.title}`);
      lines.push('-'.repeat(30));
      lines.push('');

      const content = ch.finalContent || ch.draftContent;
      if (content) {
        lines.push(content);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/** 导出为 JSON */
function exportToJson(project: any, chapters: any[], characters: any[], volumes: any[], relations: any[]): string {
  return JSON.stringify({
    project: {
      name: project.name,
      author: project.author,
      genre: project.genre,
      theme: project.theme,
      targetWords: project.targetWords,
      status: project.status,
    },
    volumes: volumes.map(v => ({
      title: v.title,
      volumeNumber: v.volumeNumber,
      goal: v.goal,
    })),
    chapters: chapters.map(c => ({
      title: c.title,
      chapterNumber: c.chapterNumber,
      volumeNumber: c.volumeNumber,
      status: c.status,
      wordCount: c.wordCount,
      summary: c.summary,
      draftContent: c.draftContent,
      finalContent: c.finalContent,
    })),
    characters: characters.map(c => ({
      name: c.name,
      role: c.role,
      trait: c.trait,
      drive: c.drive,
      fear: c.fear,
      backstory: c.backstory,
      surfaceGoal: c.surfaceGoal,
      deepDesire: c.deepDesire,
      soulNeed: c.soulNeed,
      currentState: c.currentState,
    })),
    relations,
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

// ============================================================================
// 下载工具
// ============================================================================

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// 导出选项配置
// ============================================================================

interface ExportOption {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
  mimeType: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    key: 'markdown',
    label: 'Markdown',
    description: '带格式的文档，适合阅读和二次编辑',
    icon: <FileText size={20} className="text-blue-600" />,
    extension: '.md',
    mimeType: 'text/markdown',
  },
  {
    key: 'text',
    label: '纯文本',
    description: '无格式的纯文本，适合直接阅读',
    icon: <FileType size={20} className="text-slate-600" />,
    extension: '.txt',
    mimeType: 'text/plain',
  },
  {
    key: 'json',
    label: 'JSON',
    description: '完整项目数据，适合备份和迁移',
    icon: <FileJson size={20} className="text-amber-600" />,
    extension: '.json',
    mimeType: 'application/json',
  },
];

// ============================================================================
// 主面板
// ============================================================================

export default function ExportPanel() {
  const state = useAppState();

  const project = state.project.currentProject;
  const chapters = state.project.chapters;
  const characters = state.project.characters;
  const volumes = state.project.volumes;
  const relations = state.project.relations;

  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);

  // 统计
  const stats = useMemo(() => ({
    totalWords: chapters.reduce((sum, c) => sum + c.wordCount, 0),
    chapterCount: chapters.length,
    volumeCount: volumes.length,
    characterCount: characters.length,
    doneChapters: chapters.filter(c => c.status === 'done').length,
  }), [chapters, volumes, characters]);

  const handleExport = useCallback((option: ExportOption) => {
    if (!project) return;

    setExporting(option.key);

    try {
      let content: string;
      const sortedChapters = [...chapters].sort((a, b) =>
        a.volumeNumber === b.volumeNumber
          ? a.chapterNumber - b.chapterNumber
          : a.volumeNumber - b.volumeNumber
      );

      switch (option.key) {
        case 'markdown':
          content = exportToMarkdown(project, sortedChapters, characters, volumes);
          break;
        case 'text':
          content = exportToText(project, sortedChapters, volumes);
          break;
        case 'json':
          content = exportToJson(project, sortedChapters, characters, volumes, relations);
          break;
        default:
          return;
      }

      const filename = `${project.name}${option.extension}`;
      downloadFile(content, filename, option.mimeType);

      setExported(option.key);
      setTimeout(() => setExported(null), 3000);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(null);
    }
  }, [project, chapters, characters, volumes, relations]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <Download size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">请先选择一个项目</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <Download size={22} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">导出项目</h2>
        </div>

        {/* 项目概览 */}
        <div className="flex items-center gap-6 text-sm text-slate-600">
          <span>📖 {project.name}</span>
          <span>📝 {stats.chapterCount} 章</span>
          <span>📊 {stats.totalWords.toLocaleString()} 字</span>
          <span>👤 {stats.characterCount} 个角色</span>
          <span>✅ {stats.doneChapters}/{stats.chapterCount} 已定稿</span>
        </div>
      </div>

      {/* 导出选项 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {EXPORT_OPTIONS.map(option => {
            const isExporting = exporting === option.key;
            const isExported = exported === option.key;

            return (
              <div
                key={option.key}
                className="flex items-center gap-4 p-5 rounded-xl border border-slate-200 bg-white
                  hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="shrink-0 w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-800">{option.label}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    文件名: {project.name}{option.extension}
                  </p>
                </div>
                <Button
                  variant={isExported ? 'secondary' : 'primary'}
                  size="sm"
                  icon={isExported ? <Check size={14} /> : isExporting ? undefined : <Download size={14} />}
                  loading={isExporting}
                  onClick={() => handleExport(option)}
                >
                  {isExported ? '已导出' : isExporting ? '导出中...' : '导出'}
                </Button>
              </div>
            );
          })}

          {/* 提示 */}
          <div className="mt-8 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">💡 导出说明</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>Markdown</strong>：包含角色设定和所有已写章节内容，带格式标记</li>
              <li>• <strong>纯文本</strong>：仅包含章节正文，适合直接阅读或粘贴到其他平台</li>
              <li>• <strong>JSON</strong>：包含完整项目数据（角色、关系、章节、世界观），可用于备份或迁移到其他工具</li>
              <li>• 已定稿的章节导出 finalContent，未定稿的导出 draftContent</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
