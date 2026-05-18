import React, { useState, useMemo } from 'react';
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
  ScrollText,
  BookOpen,
  Sparkles,
  Settings,
} from 'lucide-react';
import { useAppState } from '../../store';

interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'markdown' | 'prompt' | 'config';
  content?: string;
  children?: FileItem[];
}

interface ProjectFilePanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ProjectFilePanel: React.FC<ProjectFilePanelProps> = ({ isOpen, onToggle }) => {
  const state = useAppState();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['prompts', 'chapters']));

  const currentProject = state.project.currentProject;

  // 构建文件树
  const fileTree = useMemo<FileItem[]>(() => {
    if (!currentProject) return [];

    const chapters = state.project.chapters.filter(ch => ch.projectId === currentProject.id);
    const volumes = state.project.volumes.filter(v => v.projectId === currentProject.id);

    return [
      {
        id: 'prompts',
        name: '提示词文件',
        type: 'folder',
        children: [
          {
            id: 'project-md',
            name: 'project.md',
            type: 'prompt',
            content: generateProjectMd(currentProject),
          },
          {
            id: 'style-prompt',
            name: 'style_prompt.txt',
            type: 'prompt',
            content: currentProject.style?.customRules || '',
          },
          {
            id: 'brainstorm-history',
            name: 'brainstorm_history.md',
            type: 'markdown',
            content: generateBrainstormHistory(state.project.brainstormMessages),
          },
        ],
      },
      {
        id: 'chapters',
        name: '章节内容',
        type: 'folder',
        children: volumes.map(vol => ({
          id: `vol-${vol.id}`,
          name: vol.title,
          type: 'folder',
          children: chapters
            .filter(ch => ch.volumeNumber === vol.volumeNumber)
            .map(ch => ({
              id: ch.id,
              name: `${ch.chapterNumber.toString().padStart(3, '0')}_${ch.title}.md`,
              type: 'markdown',
              content: ch.draftContent || ch.finalContent || '',
            })),
        })),
      },
      {
        id: 'characters',
        name: '角色设定',
        type: 'folder',
        children: state.project.characters
          .filter(c => c.projectId === currentProject.id)
          .map(c => ({
            id: c.id,
            name: `${c.name}.md`,
            type: 'markdown',
            content: generateCharacterMd(c),
          })),
      },
      {
        id: 'config',
        name: '项目配置',
        type: 'folder',
        children: [
          {
            id: 'novel-style',
            name: 'novel_style.json',
            type: 'config',
            content: JSON.stringify(currentProject.style, null, 2),
          },
          {
            id: 'target-words',
            name: 'target_words.txt',
            type: 'config',
            content: `目标字数: ${currentProject.targetWords}\n章节目标: ${currentProject.chapterTargetWords}`,
          },
        ],
      },
    ];
  }, [currentProject, state.project.chapters, state.project.volumes, state.project.characters, state.project.brainstormMessages]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getFileIcon = (type: FileItem['type']) => {
    switch (type) {
      case 'folder':
        return <Folder size={16} className="text-amber-500" />;
      case 'markdown':
        return <FileText size={16} className="text-blue-500" />;
      case 'prompt':
        return <Sparkles size={16} className="text-purple-500" />;
      case 'config':
        return <Settings size={16} className="text-slate-500" />;
      default:
        return <FileText size={16} className="text-slate-400" />;
    }
  };

  const renderFileTree = (items: FileItem[], depth = 0) => {
    return items.map(item => {
      const isExpanded = expandedFolders.has(item.id);
      const paddingLeft = depth * 16 + 12;

      return (
        <div key={item.id}>
          <div
            className={`
              flex items-center gap-2 py-1.5 px-3 text-sm cursor-pointer
              hover:bg-slate-100 transition-colors
              ${item.type === 'folder' ? 'font-medium text-slate-700' : 'text-slate-600'}
            `}
            style={{ paddingLeft }}
            onClick={() => item.type === 'folder' && toggleFolder(item.id)}
          >
            {item.type === 'folder' && (
              <span className="text-slate-400">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            )}
            {getFileIcon(item.type)}
            <span className="truncate">{item.name}</span>
          </div>
          {item.type === 'folder' && isExpanded && item.children && (
            <div>{renderFileTree(item.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-10
                   flex items-center justify-center w-8 h-24
                   bg-white border border-slate-200 border-r-0 rounded-l-lg
                   shadow-lg hover:bg-slate-50 transition-colors"
        title="展开项目文件"
      >
        <PanelRightOpen size={18} className="text-slate-400" />
      </button>
    );
  }

  return (
    <div className="w-64 h-full bg-white border-l border-slate-200 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-blue-600" />
          <span className="font-medium text-slate-900">项目文件</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="收起"
        >
          <PanelRightClose size={18} />
        </button>
      </div>

      {/* 文件树 */}
      <div className="flex-1 overflow-y-auto py-2">
        {currentProject ? (
          renderFileTree(fileTree)
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 px-4">
            <ScrollText size={48} className="mb-3 opacity-30" />
            <p className="text-sm text-center">暂无项目</p>
            <p className="text-xs text-center mt-1">请先创建或打开一个项目</p>
          </div>
        )}
      </div>

      {/* 底部信息 */}
      {currentProject && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">
            <p className="font-medium text-slate-700 truncate">{currentProject.name}</p>
            <p className="mt-1">
              {state.project.chapters.filter(ch => ch.projectId === currentProject.id).length} 章节
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// 辅助函数：生成 project.md 内容
function generateProjectMd(project: import('../../types').NovelProject): string {
  return `# ${project.name}

## 核心设定

**类型**: ${project.genre || '待定'}
**主题**: ${project.theme || '待定'}
**核心冲突**: ${project.conflict || '待定'}

## 世界观

${project.worldBuilding || '待补充'}

## 核心种子

${project.coreSeed || '待补充'}

## 写作风格

- **预设风格**: ${project.style?.name || '未设置'}
- **描述**: ${project.style?.description || '未设置'}

## 目标

- **总字数**: ${project.targetWords?.toLocaleString() || '未设置'}
- **章节目标**: ${project.chapterTargetWords || '未设置'} 字/章
`;
}

// 辅助函数：生成灵感收束历史
function generateBrainstormHistory(messages: import('../../types').BrainstormMessage[]): string {
  if (messages.length === 0) return '# 灵感收束历史\n\n暂无记录';
  
  return `# 灵感收束历史

${messages.map(msg => {
  const role = msg.role === 'assistant' ? 'AI' : '作者';
  const dimension = msg.dimension ? ` (${msg.dimension})` : '';
  return `## ${role}${dimension}

${msg.content}
`;
}).join('\n---\n\n')}`;
}

// 辅助函数：生成角色 Markdown
function generateCharacterMd(character: import('../../types').Character): string {
  return `# ${character.name}

## 基本信息

- **角色定位**: ${character.role || '未知'}

## 核心特质

- **驱动力**: ${character.drive || '待补充'}
- **恐惧**: ${character.fear || '待补充'}
- **特征**: ${character.trait || '待补充'}

## 背景故事

${character.backstory || '待补充'}

## 角色弧光

- **表面追求**: ${character.surfaceGoal || '待补充'}
- **深层渴望**: ${character.deepDesire || '待补充'}
- **灵魂需求**: ${character.soulNeed || '待补充'}
- **初始状态**: ${character.initialArc || '待补充'}
- **触发事件**: ${character.triggerEvent || '待补充'}
- **蜕变节点**: ${character.transformation || '待补充'}
- **最终状态**: ${character.finalState || '待补充'}
`;
}

export default ProjectFilePanel;
