import React, { useState } from 'react';
import Dialog from '../common/Dialog';
import Button from '../common/Button';
import { useAppState, useAppDispatch, projectActions, uiActions } from '../../store';
import { generateId } from '../../utils/id';
import type { NovelProject, NovelStyle, PresetStyle } from '../../types';

export interface ProjectFormData {
  name: string;
  author: string;
  genre: string;
  style: string;
  targetWordCount: number;
  chapterWordCount: number;
}

const genres = [
  { value: 'fantasy', label: '玄幻' },
  { value: 'urban', label: '都市' },
  { value: 'scifi', label: '科幻' },
  { value: 'historical', label: '历史' },
  { value: 'mystery', label: '悬疑' },
  { value: 'romance', label: '言情' },
  { value: 'other', label: '其他' },
];

const styles = [
  { value: 'cold_narration', label: '冷白描', desc: '克制、冷静、白描式叙事' },
  { value: 'system_power', label: '系统爽文', desc: '系统流、升级感、爽点密集' },
  { value: 'weird_suspense', label: '怪诞悬疑', desc: '诡异氛围、层层悬念' },
  { value: 'custom', label: '自定义', desc: '自行定义写作风格' },
];

/** 根据表单中的 style 值构建 NovelStyle 对象 */
function buildNovelStyle(styleValue: string, customStyle: string): NovelStyle {
  if (styleValue === 'custom') {
    return {
      preset: 'custom' as PresetStyle,
      name: customStyle || '自定义风格',
      description: customStyle || '用户自定义写作风格',
      sentenceRules: [],
      descriptionRules: [],
      dialogueRules: [],
      emotionRules: [],
      forbiddenPatterns: [],
      forbiddenWords: [],
    };
  }

  // 预设风格映射
  const presetMap: Record<string, { preset: PresetStyle; name: string; description: string }> = {
    cold_narration: {
      preset: 'cold_realism',
      name: '冷白描',
      description: '克制、冷静、白描式叙事',
    },
    system_power: {
      preset: 'system_power',
      name: '系统爽文',
      description: '系统流、升级感、爽点密集',
    },
    weird_suspense: {
      preset: 'bizarre_suspense',
      name: '怪诞悬疑',
      description: '诡异氛围、层层悬念',
    },
  };

  const mapped = presetMap[styleValue] || {
    preset: 'cold_realism' as PresetStyle,
    name: '冷白描',
    description: '克制、冷静、白描式叙事',
  };

  return {
    preset: mapped.preset,
    name: mapped.name,
    description: mapped.description,
    sentenceRules: [],
    descriptionRules: [],
    dialogueRules: [],
    emotionRules: [],
    forbiddenPatterns: [],
    forbiddenWords: [],
  };
}

const CreateProjectDialog: React.FC = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const isOpen = state.ui.dialog.type === 'create_project' && state.ui.dialog.open;

  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    author: '',
    genre: 'fantasy',
    style: 'cold_narration',
    targetWordCount: 500000,
    chapterWordCount: 2300,
  });

  const [customStyle, setCustomStyle] = useState('');

  const updateField = <K extends keyof ProjectFormData>(
    key: K,
    value: ProjectFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleClose = () => {
    dispatch(uiActions.closeDialog());
    // 重置表单
    setFormData({
      name: '',
      author: '',
      genre: 'fantasy',
      style: 'cold_narration',
      targetWordCount: 500000,
      chapterWordCount: 2300,
    });
    setCustomStyle('');
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    const styleValue = formData.style === 'custom' && customStyle.trim()
      ? customStyle.trim()
      : formData.style;

    const now = new Date().toISOString();
    const project: NovelProject = {
      id: generateId('proj'),
      name: formData.name.trim(),
      author: formData.author.trim(),
      genre: formData.genre,
      theme: '',
      style: buildNovelStyle(styleValue, customStyle.trim()),
      targetWords: formData.targetWordCount,
      chapterTargetWords: formData.chapterWordCount,
      status: 'idea',
      stage: 'brainstorm',
      currentVolume: 0,
      currentChapter: 0,
      createdAt: now,
      updatedAt: now,
      canonLog: [],
    };

    dispatch(projectActions.add(project));
    dispatch(uiActions.closeDialog());

    // 重置表单
    setFormData({
      name: '',
      author: '',
      genre: 'fantasy',
      style: 'cold_narration',
      targetWordCount: 500000,
      chapterWordCount: 2300,
    });
    setCustomStyle('');
  };

  const isValid = formData.name.trim().length > 0;

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title="新建小说项目"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid}>
            创建项目
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* 项目名称 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            项目名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="输入小说名称"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-slate-400"
            autoFocus
          />
        </div>

        {/* 作者名 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            作者名
          </label>
          <input
            type="text"
            value={formData.author}
            onChange={(e) => updateField('author', e.target.value)}
            placeholder="输入作者笔名"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder:text-slate-400"
          />
        </div>

        {/* 题材选择 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            题材
          </label>
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <button
                key={g.value}
                onClick={() => updateField('genre', g.value)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm border transition-colors
                  ${
                    formData.genre === g.value
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }
                `}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* 写作风格选择 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            写作风格
          </label>
          <div className="grid grid-cols-2 gap-2">
            {styles.map((s) => (
              <button
                key={s.value}
                onClick={() => updateField('style', s.value)}
                className={`
                  text-left px-3 py-2.5 rounded-lg border transition-colors
                  ${
                    formData.style === s.value
                      ? 'bg-blue-50 border-blue-300'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }
                `}
              >
                <span
                  className={`text-sm font-medium ${
                    formData.style === s.value ? 'text-blue-700' : 'text-slate-700'
                  }`}
                >
                  {s.label}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
          {formData.style === 'custom' && (
            <input
              type="text"
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              placeholder="描述你的写作风格..."
              className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder:text-slate-400"
            />
          )}
        </div>

        {/* 目标字数 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              目标总字数
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.targetWordCount}
                onChange={(e) =>
                  updateField('targetWordCount', Number(e.target.value))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                字
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              约 {(formData.targetWordCount / 10000).toFixed(0)} 万字
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              每章目标字数
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.chapterWordCount}
                onChange={(e) =>
                  updateField('chapterWordCount', Number(e.target.value))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                字/章
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              约{' '}
              {Math.round(formData.targetWordCount / formData.chapterWordCount)}{' '}
              章
            </p>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default CreateProjectDialog;
