import React, { useState } from 'react';
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

/** 结构标记类型 */
type StructureType = 'setup' | 'build' | 'climax' | 'fallout';

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

interface OutlinePanelProps {
  volumes?: Volume[];
  onGenerateVolume?: (volumeId: string) => void;
  onGenerateAll?: () => void;
  onChapterClick?: (volumeId: string, chapterId: string) => void;
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

const sampleVolumes: Volume[] = [
  {
    id: 'v1',
    name: '第一卷：起源',
    chapters: [
      {
        id: 'c1-1',
        index: 1,
        title: '命运的齿轮',
        structure: 'setup',
        suspenseDensity: 2,
        status: 'done',
        taskDescription: '引入主角，建立世界观基础',
        foreshadowing: '埋下神秘钥匙的伏笔',
        cognitiveSubversion: 3,
      },
      {
        id: 'c1-2',
        index: 2,
        title: '暗流涌动',
        structure: 'build',
        suspenseDensity: 3,
        status: 'drafted',
        taskDescription: '主角发现异常事件，引出主线冲突',
        foreshadowing: '暗示导师的真实身份',
        cognitiveSubversion: 5,
      },
      {
        id: 'c1-3',
        index: 3,
        title: '真相碎片',
        structure: 'climax',
        suspenseDensity: 5,
        status: 'planned',
        taskDescription: '第一卷高潮，揭示部分真相',
        foreshadowing: '为第二卷的转折做铺垫',
        cognitiveSubversion: 8,
      },
      {
        id: 'c1-4',
        index: 4,
        title: '新的开始',
        structure: 'fallout',
        suspenseDensity: 2,
        status: 'planned',
        taskDescription: '高潮后的平静，为下一卷做过渡',
        cognitiveSubversion: 2,
      },
    ],
  },
  {
    id: 'v2',
    name: '第二卷：觉醒',
    chapters: [
      {
        id: 'c2-1',
        index: 1,
        title: '觉醒之力',
        structure: 'setup',
        suspenseDensity: 3,
        status: 'planned',
        taskDescription: '引入新能力体系，主角开始修炼',
        cognitiveSubversion: 4,
      },
      {
        id: 'c2-2',
        index: 2,
        title: '试炼之路',
        structure: 'build',
        suspenseDensity: 4,
        status: 'planned',
        taskDescription: '主角经历试炼，遇到重要配角',
        cognitiveSubversion: 6,
      },
    ],
  },
];

const OutlinePanel: React.FC<OutlinePanelProps> = ({
  volumes = sampleVolumes,
  onGenerateVolume,
  onGenerateAll,
  onChapterClick,
}) => {
  const [activeVolumeId, setActiveVolumeId] = useState(volumes[0]?.id || '');
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const activeVolume = volumes.find((v) => v.id === activeVolumeId);

  const handleGenerateVolume = (volumeId: string) => {
    setGenerating(volumeId);
    setTimeout(() => {
      setGenerating(null);
      onGenerateVolume?.(volumeId);
    }, 2000);
  };

  const handleGenerateAll = () => {
    setGenerating('all');
    setTimeout(() => {
      setGenerating(null);
      onGenerateAll?.();
    }, 3000);
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapterId((prev) => (prev === chapterId ? null : chapterId));
    onChapterClick?.(activeVolumeId, chapterId);
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
    <div className="h-full flex flex-col bg-white">
      {/* 顶部工具栏 */}
      <div className="shrink-0 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">章节大纲</h2>
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
            >
              生成当前卷
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Wand2 size={14} />}
              onClick={handleGenerateAll}
              loading={generating === 'all'}
            >
              生成全部
            </Button>
          </div>
        </div>

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

      {/* 章节列表 */}
      <div className="flex-1 overflow-y-auto">
        {activeVolume && (
          <div className="divide-y divide-slate-100">
            {activeVolume.chapters.map((chapter) => (
              <div key={chapter.id}>
                {/* 章节行 */}
                <div
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => toggleChapter(chapter.id)}
                >
                  {/* 展开箭头 */}
                  <span className="text-slate-400">
                    {expandedChapterId === chapter.id ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </span>

                  {/* 序号 */}
                  <span className="w-8 text-center text-sm font-mono text-slate-400">
                    {String(chapter.index).padStart(2, '0')}
                  </span>

                  {/* 状态图标 */}
                  {statusIcons[chapter.status]}

                  {/* 标题 */}
                  <span className="flex-1 text-sm font-medium text-slate-800 truncate">
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
                          <Button variant="primary" size="sm">
                            保存修改
                          </Button>
                          <Button variant="ghost" size="sm">
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
                <button className="w-full py-3 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center justify-center gap-2">
                  <Plus size={16} />
                  添加新章节
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutlinePanel;
