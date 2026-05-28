import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Wand2,
  FileText,
  Edit3,
  ChevronDown,
  ChevronRight,
  Star,
  StarOff,
  AlertCircle,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import Button from '../common/Button';
import { StructureBadge } from '../common/Badge';
import { useToast } from '../common/Toast';
import { useAppState, useAppDispatch, projectActions, editorActions, uiActions } from '../../store';
import { aiPipeline } from '../../services/aiPipeline';
import { hasLLMConfig } from '../../utils/llmHelpers';
import type { Chapter as StoreChapter, ChapterStructureTag, ChapterStatus as StoreChapterStatus } from '../../types';

/** 结构标记类型 */
type StructureType = 'setup' | 'build' | 'climax' | 'fallout';

/**
 * 从AI生成的文本中解析章节信息
 * 支持多种AI输出格式：## 第一章、**第一章**、- 第一章、第一章：、Chapter 1 等
 */
function parseChaptersFromContent(content: string): { title: string; task: string }[] {
  const lines = content.split('\n');
  const chapters: { title: string; task: string }[] = [];
  
  // 定义章节匹配模式（按优先级排列）
  const chapterPatterns = [
    // ## 第一章 标题 / ### 第1章 标题
    /^#{1,4}\s*第[一二三四五六七八九十百千\d壹贰叁肆伍陆柒捌玖拾佰仟]+章[：:、.\-\s]*(.*)/,
    // **第一章 标题** / *第一章 标题*
    /^\*{1,2}\s*第[一二三四五六七八九十百千\d壹贰叁肆伍陆柒捌玖拾佰仟]+章[：:、.\-\s]*(.*?)\s*\**/,
    // - 第一章 标题 / 1. 第一章 标题
    /^[-*•]\s*第[一二三四五六七八九十百千\d壹贰叁肆伍陆柒捌玖拾佰仟]+章[：:、.\-\s]*(.*)/,
    /^\d+[.、)]\s*第[一二三四五六七八九十百千\d壹贰叁肆伍陆柒捌玖拾佰仟]+章[：:、.\-\s]*(.*)/,
    // 第一章：标题 / 第一章 标题（最基础的格式）
    /^第[一二三四五六七八九十百千\d壹贰叁肆伍陆柒捌玖拾佰仟]+章[：:、.\-\s]+(.+)/,
    // Chapter 1: Title / chapter 1 标题
    /^[Cc]hapter\s*\d+[：:、.\-\s]+(.+)/,
    // 纯数字编号章节：1. 标题 / 1、标题（至少要有一定长度的标题）
    /^\d+[.、)]\s+(.{4,})/,
  ];
  
  let currentChapter: { title: string; taskLines: string[] } | null = null;
  
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    
    // 去除 markdown 粗体标记用于匹配
    const cleanLine = line.replace(/\*{1,2}/g, '').trim();
    
    let matched = false;
    for (const pattern of chapterPatterns) {
      const match = cleanLine.match(pattern);
      if (match) {
        // 保存上一个章节
        if (currentChapter) {
          chapters.push({
            title: currentChapter.title,
            task: currentChapter.taskLines.join('\n').trim(),
          });
        }
        // 提取标题：使用匹配到的内容，或从原始行中提取
        let title = match[1]?.trim() || '';
        if (!title) {
          // 从原始行中去除章节标记作为标题
          title = cleanLine
            .replace(/^#{1,4}\s*/, '')
            .replace(/^第[一二三四五六七八九十百千\d壹贰叁肆伍陆柒捌玖拾佰仟]+章[：:、.\-\s]*/, '')
            .replace(/^\*{1,2}/, '').replace(/\*{1,2}$/, '')
            .trim();
        }
        currentChapter = {
          title: title || `第${chapters.length + 1}章`,
          taskLines: [line],
        };
        matched = true;
        break;
      }
    }
    
    if (!matched && currentChapter) {
      // 非章节标题行，追加到当前章节的描述中
      currentChapter.taskLines.push(line);
    }
  }
  
  // 保存最后一个章节
  if (currentChapter) {
    chapters.push({
      title: currentChapter.title,
      task: currentChapter.taskLines.join('\n').trim(),
    });
  }
  
  return chapters;
}

/** 章节状态 */
type ChapterStatus = 'planned' | 'drafted' | 'reviewed' | 'revised' | 'done';

interface Chapter {
  id: string;
  index: number;
  title: string;
  structure: StructureType;
  suspenseDensity: number; // 0-5 星
  status: ChapterStatus;
  taskDescription?: string;
  foreshadowing?: string;
  cognitiveSubversion?: number; // 认知颠覆强度 0-10
}

interface Volume {
  id: string;
  name: string;
  chapters: Chapter[];
}



/** store ChapterStatus -> 组件 ChapterStatus 映射 */
function mapChapterStatus(status: StoreChapterStatus): ChapterStatus {
  switch (status) {
    case 'pending': return 'planned';
    case 'drafting': return 'drafted';
    case 'reviewing': return 'reviewed';
    case 'minor_fix': return 'revised';
    case 'rewrite': return 'drafted';
    case 'done': return 'done';
    case 'rejected': return 'drafted';
    default: return 'planned';
  }
}

/** store ChapterStructureTag -> 组件 StructureType 映射 */
function mapStructureTag(tag: ChapterStructureTag): StructureType {
  switch (tag) {
    case 'setup': return 'setup';
    case 'build': return 'build';
    case 'climax': return 'climax';
    case 'fallout': return 'fallout';
    default: return 'setup';
  }
}

const statusIcons: Record<ChapterStatus, React.ReactNode> = {
  planned: <Circle size={14} className="text-slate-300" />,
  drafted: <Edit3 size={14} className="text-blue-500" />,
  reviewed: <AlertCircle size={14} className="text-amber-500" />,
  revised: <CheckCircle2 size={14} className="text-emerald-500" />,
  done: <CheckCircle2 size={14} className="text-emerald-600" />,
};

const statusLabels: Record<ChapterStatus, string> = {
  planned: '待写',
  drafted: '初稿',
  reviewed: '待修改',
  revised: '已修改',
  done: '完成',
};

const OutlinePanel: React.FC = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const llmConfigured = hasLLMConfig(state.ai);

  const storeVolumes = state.project.volumes;
  const storeChapters = state.project.chapters;
  const currentProject = state.project.currentProject;

  // 如果 store 中没有卷但有项目，自动创建默认卷
  useEffect(() => {
    if (storeVolumes.length === 0 && currentProject) {
      const defaultVolume: import('../../types').Volume = {
        id: `vol-${currentProject.id}-1`,
        projectId: currentProject.id,
        volumeNumber: 1,
        title: '第一卷',
        goal: '',
        futureDirection: '',
        createdAt: new Date().toISOString(),
      };
      dispatch(projectActions.addVolume(defaultVolume));
    }
  }, [storeVolumes.length, currentProject, dispatch]);

  // 将 store 数据转换为组件内部格式
  // 处理两种情况：1) 有卷有章节 2) 无卷但有章节（将章节归入默认卷）
  const volumes = useMemo<Volume[]>(() => {
    const mapped = storeVolumes
      .sort((a, b) => a.volumeNumber - b.volumeNumber)
      .map((vol) => ({
        id: vol.id,
        name: vol.title,
        chapters: storeChapters
          .filter((ch) => ch.volumeNumber === vol.volumeNumber)
          .sort((a, b) => a.chapterNumber - b.chapterNumber)
          .map((ch) => ({
            id: ch.id,
            index: ch.chapterNumber,
            title: ch.title,
            structure: mapStructureTag(ch.structureTag),
            suspenseDensity: ch.suspenseLevel,
            status: mapChapterStatus(ch.status),
            taskDescription: ch.task,
            foreshadowing: ch.foreshadowing,
            cognitiveSubversion: ch.plotTwistLevel * 2, // store 1-5 -> 组件 0-10
          })),
      }));

    // 处理孤儿章节：不属于任何已有卷的章节
    const assignedChapterIds = new Set(
      mapped.flatMap((v) => v.chapters.map((c) => c.id))
    );
    const orphanChapters = storeChapters
      .filter((ch) => !assignedChapterIds.has(ch.id))
      .sort((a, b) => a.chapterNumber - b.chapterNumber)
      .map((ch) => ({
        id: ch.id,
        index: ch.chapterNumber,
        title: ch.title,
        structure: mapStructureTag(ch.structureTag),
        suspenseDensity: ch.suspenseLevel,
        status: mapChapterStatus(ch.status),
        taskDescription: ch.task,
        foreshadowing: ch.foreshadowing,
        cognitiveSubversion: ch.plotTwistLevel * 2,
      }));

    // 如果有孤儿章节，将它们放入第一个卷（或创建默认卷）
    if (orphanChapters.length > 0) {
      if (mapped.length > 0) {
        mapped[0].chapters = [...mapped[0].chapters, ...orphanChapters];
      } else {
        mapped.push({
          id: 'vol-default',
          name: '默认卷',
          chapters: orphanChapters,
        });
      }
    }

    return mapped;
  }, [storeVolumes, storeChapters]);

  const [activeVolumeId, setActiveVolumeId] = useState(volumes[0]?.id || '');
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [streamOutputs, setStreamOutputs] = useState<Record<string, string>>({});
  // 流式输出缓冲 - 使用 useRef 避免每个 token 都触发重渲染
  const streamBufferRef = useRef<Record<string, string>>({});
  const streamRafRef = useRef<Record<string, number>>({});

  // 当卷列表变化时，自动选中第一个卷
  useEffect(() => {
    if (volumes.length > 0 && !volumes.find(v => v.id === activeVolumeId)) {
      setActiveVolumeId(volumes[0].id);
    }
  }, [volumes, activeVolumeId]);

  // 编辑模式下的临时编辑状态
  const [editTask, setEditTask] = useState('');
  const [editForeshadowing, setEditForeshadowing] = useState('');

  const activeVolume = volumes.find((v) => v.id === activeVolumeId);

  const handleGenerateVolume = async (volumeId: string) => {
    if (!llmConfigured) {
      addToast('warning', '请先在设置中配置 AI 模型');
      navigate('/settings');
      return;
    }
    setGenerating(volumeId);
    setStreamOutputs(prev => ({ ...prev, [volumeId]: '' }));
    streamBufferRef.current[volumeId] = '';
    try {
      const vol = storeVolumes.find(v => v.id === volumeId);
      if (!vol || !state.project.currentProject) return;
      const currentProject = state.project.currentProject;
      
      let streamContent = '';
      const result = await aiPipeline.generateOutlineStream(
        currentProject,
        state.project.characters,
        [vol],
        (token) => {
          streamContent += token;
          streamBufferRef.current[volumeId] = streamContent;
          if (!streamRafRef.current[volumeId]) {
            streamRafRef.current[volumeId] = requestAnimationFrame(() => {
              setStreamOutputs(prev => ({
                ...prev,
                [volumeId]: streamBufferRef.current[volumeId]
              }));
              delete streamRafRef.current[volumeId];
            });
          }
        }
      );
      
      // 解析大纲内容并保存到 store
      // 增强解析：支持多种AI输出格式（## 第一章、**第一章**、- 第一章、第一章：等）
      const parsedChapters = parseChaptersFromContent(result.content);
      
      if (parsedChapters.length > 0) {
        // 删除该卷已有的章节
        const existingChapters = storeChapters.filter(ch => ch.volumeNumber === vol.volumeNumber);
        for (const ch of existingChapters) {
          dispatch(projectActions.deleteChapter(ch.id));
        }
        // 创建新章节
        parsedChapters.forEach((ch, index) => {
          const chapter: import('../../types').Chapter = {
            id: `ch-${Date.now()}-${index}`,
            projectId: currentProject.id,
            volumeId: vol.id,
            volumeNumber: vol.volumeNumber,
            chapterNumber: index + 1,
            title: ch.title || `第${index + 1}章`,
            task: ch.task || ch.title,
            structureTag: 'setup',
            status: 'pending',
            reviewRound: 0,
            canonChanged: false,
            draftContent: '',
            finalContent: '',
            wordCount: 0,
            suspenseLevel: 0,
            plotTwistLevel: 0,
            foreshadowing: '',
            summary: '',
            reviewNotes: '',
            finalSummary: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          dispatch(projectActions.addChapter(chapter));
        });
        addToast('success', `${vol.title} 大纲生成完成，已保存 ${parsedChapters.length} 个章节`);
      } else {
        // 无法解析章节时，将整个大纲内容保存为一个临时章节，避免内容丢失
        const fallbackChapter: import('../../types').Chapter = {
          id: `ch-${Date.now()}-fallback`,
          projectId: currentProject.id,
          volumeId: vol.id,
          volumeNumber: vol.volumeNumber,
          chapterNumber: 1,
          title: `${vol.title} 大纲草稿`,
          task: result.content,
          structureTag: 'setup',
          status: 'pending',
          reviewRound: 0,
          canonChanged: false,
          draftContent: '',
          finalContent: '',
          wordCount: 0,
          suspenseLevel: 0,
          plotTwistLevel: 0,
          foreshadowing: '',
          summary: '',
          reviewNotes: '',
          finalSummary: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        // 删除该卷已有的章节
        const existingChapters = storeChapters.filter(ch => ch.volumeNumber === vol.volumeNumber);
        for (const ch of existingChapters) {
          dispatch(projectActions.deleteChapter(ch.id));
        }
        dispatch(projectActions.addChapter(fallbackChapter));
        addToast('warning', `${vol.title} 大纲生成完成，但未能自动拆分章节，已保存为草稿`);
      }
    } catch (error) {
      addToast('error', `大纲生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setGenerating(null);
      // 延迟清理流式输出
      setTimeout(() => {
        setStreamOutputs(prev => {
          const next = { ...prev };
          delete next[volumeId];
          return next;
        });
      }, 3000);
    }
  };

  const handleGenerateAll = async () => {
    if (!llmConfigured) {
      addToast('warning', '请先在设置中配置 AI 模型');
      navigate('/settings');
      return;
    }
    setGenerating('all');
    setStreamOutputs(prev => ({ ...prev, all: '' }));
    streamBufferRef.current['all'] = '';
    try {
      if (!state.project.currentProject) return;
      const currentProject = state.project.currentProject;
      
      let streamContent = '';
      const result = await aiPipeline.generateOutlineStream(
        currentProject,
        state.project.characters,
        storeVolumes,
        (token) => {
          streamContent += token;
          streamBufferRef.current['all'] = streamContent;
          if (!streamRafRef.current['all']) {
            streamRafRef.current['all'] = requestAnimationFrame(() => {
              setStreamOutputs(prev => ({
                ...prev,
                all: streamBufferRef.current['all']
              }));
              delete streamRafRef.current['all'];
            });
          }
        }
      );
      
      // 解析大纲内容并保存到 store
      const parsedChapters = parseChaptersFromContent(result.content);
      
      if (parsedChapters.length > 0) {
        // 删除所有已有的章节
        for (const ch of storeChapters) {
          dispatch(projectActions.deleteChapter(ch.id));
        }

        // 尝试按卷标记分组
        const volumeChapterMap = new Map<number, { title: string; task: string }[]>();
        let currentVolIndex = 0;

        for (const ch of parsedChapters) {
          // 检查是否有卷标记
          const volMatch = ch.title.match(/第[一二三四五六七八九十百千\d]+卷|卷[一二三四五六七八九十百千\d]+|卷\s*\d+/);
          if (volMatch) {
            const matchedVol = storeVolumes.find((v, idx) => {
              const volTitle = v.title || `第${idx + 1}卷`;
              return ch.title.includes(volTitle) || ch.title.includes(`第${v.volumeNumber}卷`);
            });
            if (matchedVol) {
              currentVolIndex = storeVolumes.findIndex(v => v.id === matchedVol.id);
            }
          }
          if (!volumeChapterMap.has(currentVolIndex)) {
            volumeChapterMap.set(currentVolIndex, []);
          }
          volumeChapterMap.get(currentVolIndex)!.push(ch);
        }

        // 如果只分配到了一个卷，则按章节数均分
        if (volumeChapterMap.size <= 1 && storeVolumes.length > 1) {
          volumeChapterMap.clear();
          const perVol = Math.ceil(parsedChapters.length / storeVolumes.length);
          storeVolumes.forEach((_, idx) => {
            const start = idx * perVol;
            const end = Math.min(start + perVol, parsedChapters.length);
            if (start < parsedChapters.length) {
              volumeChapterMap.set(idx, parsedChapters.slice(start, end));
            }
          });
        }

        // 创建新章节
        for (const [volIdx, volChapters] of volumeChapterMap) {
          const vol = storeVolumes[volIdx];
          if (!vol) continue;
          volChapters.forEach((ch, idx) => {
            const chapter: import('../../types').Chapter = {
              id: `ch-${Date.now()}-${volIdx}-${idx}`,
              projectId: currentProject.id,
              volumeId: vol.id,
              volumeNumber: vol.volumeNumber,
              chapterNumber: idx + 1,
              title: ch.title || `第${idx + 1}章`,
              task: ch.task || ch.title,
              structureTag: 'setup',
              status: 'pending',
              reviewRound: 0,
              canonChanged: false,
              draftContent: '',
              finalContent: '',
              wordCount: 0,
              suspenseLevel: 0,
              plotTwistLevel: 0,
              foreshadowing: '',
              summary: '',
              reviewNotes: '',
              finalSummary: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            dispatch(projectActions.addChapter(chapter));
          });
        }
        addToast('success', `全部卷大纲生成完成，已保存 ${parsedChapters.length} 个章节`);
      } else {
        addToast('warning', '大纲生成完成，但未能自动拆分章节，请检查输出格式');
      }
    } catch (error) {
      addToast('error', `大纲生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setGenerating(null);
      // 3秒后清理流式输出显示
      setTimeout(() => {
        setStreamOutputs(prev => {
          const next = { ...prev };
          delete next.all;
          return next;
        });
      }, 3000);
    }
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapterId((prev) => (prev === chapterId ? null : chapterId));
  };

  const navigateToChapter = (chapterId: string) => {
    const chapter = storeChapters.find((ch) => ch.id === chapterId);
    if (chapter) {
      dispatch(editorActions.setChapter(chapter));
      dispatch(uiActions.setView('editor'));
    }
  };

  const handleSaveEdit = (chapterId: string) => {
    dispatch(
      projectActions.updateChapter(chapterId, {
        task: editTask,
        foreshadowing: editForeshadowing,
      })
    );
    setExpandedChapterId(null);
  };

  const handleCancelEdit = () => {
    setExpandedChapterId(null);
  };

  const handleAddChapter = () => {
    const activeVol = storeVolumes.find((v) => v.id === activeVolumeId);
    if (!activeVol) return;
    const existingChapters = storeChapters.filter(
      (ch) => ch.volumeNumber === activeVol.volumeNumber
    );
    const nextNumber = existingChapters.length + 1;
    const newChapter: StoreChapter = {
      id: `ch-${activeVolumeId}-${Date.now()}`,
      projectId: state.project.currentProject?.id ?? '',
      volumeId: activeVolumeId,
      chapterNumber: nextNumber,
      volumeNumber: activeVol.volumeNumber,
      title: `新章节 ${nextNumber}`,
      task: '',
      structureTag: 'setup',
      status: 'pending',
      reviewRound: 0,
      canonChanged: false,
      suspenseLevel: 2,
      foreshadowing: '',
      plotTwistLevel: 2,
      draftContent: '',
      finalContent: '',
      summary: '',
      reviewNotes: '',
      finalSummary: '',
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch(projectActions.addChapter(newChapter));
  };

  const renderStars = (count: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i}>
            {i <= count ? (
              <Star size={12} className="text-amber-400 fill-amber-400" />
            ) : (
              <StarOff size={12} className="text-slate-200" />
            )}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* 顶部工具栏 */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-700 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">章节大纲</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<Edit3 size={14} />}
              onClick={() => setEditMode(!editMode)}
              className={editMode ? '!bg-blue-50 !text-blue-600' : ''}
            >
              {editMode ? '退出编辑' : '编辑模式'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Wand2 size={14} />}
              onClick={() => handleGenerateVolume(activeVolumeId)}
              loading={generating === activeVolumeId}
              disabled={!llmConfigured && generating !== activeVolumeId}
              title={!llmConfigured ? '请先在设置中配置 AI 模型' : undefined}
            >
              生成当前卷
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Wand2 size={14} />}
              onClick={handleGenerateAll}
              loading={generating === 'all'}
              disabled={!llmConfigured && generating !== 'all'}
              title={!llmConfigured ? '请先在设置中配置 AI 模型' : undefined}
            >
              生成全部
            </Button>
          </div>
        </div>

        {/* 未配置 AI 模型时的提示 */}
        {!llmConfigured && (
          <div
            className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={() => navigate('/settings')}
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>请先配置 AI 模型，</span>
            <span className="font-medium underline">前往设置</span>
          </div>
        )}

        {/* 流式输出生成的大纲内容 */}
        {(streamOutputs[activeVolumeId] || streamOutputs.all) && (
          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-2">
              <Wand2 size={14} />
              <span>AI 正在生成大纲...</span>
              {generating && (
                <span className="inline-flex items-center">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse delay-100">●</span>
                  <span className="animate-pulse delay-200">●</span>
                </span>
              )}
            </div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
              {streamOutputs[activeVolumeId] || streamOutputs.all}
            </div>
          </div>
        )}

        {/* 卷选择器（标签页） */}
        <div className="flex gap-1">
          {volumes.map((volume) => (
            <button
              key={volume.id}
              onClick={() => setActiveVolumeId(volume.id)}
              className={`
                px-4 py-2 rounded-t-lg text-sm font-medium transition-colors
                ${
                  activeVolumeId === volume.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }
              `}
            >
              {volume.name}
              <span className="ml-1.5 text-xs text-slate-400">
                ({volume.chapters.length}章)
              </span>
            </button>
          ))}
          {editMode && (
            <button className="px-3 py-2 rounded-t-lg text-sm text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 章节列表 - 使用窗口化渲染优化大型项目性能 */}
      <div className="flex-1 overflow-y-auto">
        {activeVolume ? (
          <div className="divide-y divide-slate-100">
            {activeVolume.chapters.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FileText size={48} className="mb-4 opacity-30" />
                <p className="text-sm mb-2">暂无章节大纲</p>
                <p className="text-xs text-slate-300">点击上方「生成全部」按钮，AI 将自动生成章节大纲</p>
              </div>
            )}
            {activeVolume.chapters.map((chapter) => (
              <div key={chapter.id}>
                {/* 章节行 */}
                <div
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  onClick={() => toggleChapter(chapter.id)}
                >
                  {/* 展开箭头 - 独立点击区域 */}
                  <span
                    className="text-slate-400 dark:text-slate-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleChapter(chapter.id);
                    }}
                  >
                    {expandedChapterId === chapter.id ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </span>

                  {/* 序号 */}
                  <span className="w-8 text-center text-sm font-mono text-slate-400 dark:text-slate-500">
                    {String(chapter.index).padStart(2, '0')}
                  </span>

                  {/* 状态图标 */}
                  {statusIcons[chapter.status]}

                  {/* 标题 - 点击跳转到编辑器 */}
                  <span
                    className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 truncate hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToChapter(chapter.id);
                    }}
                  >
                    {chapter.title}
                  </span>

                  {/* 结构标记 */}
                  <StructureBadge type={chapter.structure} />

                  {/* 悬念密度 */}
                  <div className="flex items-center gap-1" title={`悬念密度: ${chapter.suspenseDensity}/5`}>
                    {renderStars(chapter.suspenseDensity)}
                  </div>

                  {/* 状态文字 */}
                  <span className="text-xs text-slate-400 w-12 text-right">
                    {statusLabels[chapter.status]}
                  </span>
                </div>

                {/* 展开详情 */}
                {expandedChapterId === chapter.id && (
                  <div className="px-5 pb-4 ml-[72px] bg-slate-50/50 border-l-2 border-blue-200">
                    <div className="space-y-3 py-2">
                      {/* 任务说明 */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">
                          任务说明
                        </label>
                        {editMode ? (
                          <textarea
                            defaultValue={chapter.taskDescription}
                            onChange={(e) => setEditTask(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                       resize-none"
                          />
                        ) : (
                          <p className="text-sm text-slate-700">
                            {chapter.taskDescription || '暂无描述'}
                          </p>
                        )}
                      </div>

                      {/* 伏笔操作 */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">
                          伏笔操作
                        </label>
                        {editMode ? (
                          <textarea
                            defaultValue={chapter.foreshadowing}
                            onChange={(e) => setEditForeshadowing(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                       resize-none"
                          />
                        ) : (
                          <p className="text-sm text-slate-700">
                            {chapter.foreshadowing || '暂无伏笔'}
                          </p>
                        )}
                      </div>

                      {/* 认知颠覆强度 */}
                      <div className="flex items-center gap-4">
                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 block">
                            认知颠覆强度
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-red-500 rounded-full transition-all"
                                style={{
                                  width: `${(chapter.cognitiveSubversion || 0) * 10}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-mono text-slate-600">
                              {chapter.cognitiveSubversion || 0}/10
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 编辑模式下的操作按钮 */}
                      {editMode && (
                        <div className="flex gap-2 pt-2">
                          <Button variant="primary" size="sm" onClick={() => handleSaveEdit(chapter.id)}>
                            保存修改
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                            取消
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* 添加章节按钮 */}
            {editMode && (
              <div className="px-5 py-3">
                <button
                  onClick={handleAddChapter}
                  className="w-full py-3 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  添加新章节
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText size={48} className="mb-4 opacity-30" />
            <p className="text-sm mb-2">正在加载大纲数据...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutlinePanel;
