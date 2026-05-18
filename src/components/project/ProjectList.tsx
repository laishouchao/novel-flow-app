import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, Clock, BookOpen } from 'lucide-react';
import Card, { CardContent } from '../common/Card';
import Button from '../common/Button';
import Badge, { ProjectStatusBadge } from '../common/Badge';
import ProgressBar from '../common/ProgressBar';
import { useAppState, useAppDispatch, projectActions, editorActions, uiActions } from '../../store';
import type { NovelProject } from '../../types';

interface Project {
  id: string;
  name: string;
  genre: string;
  style: string;
  wordCount: number;
  targetWordCount: number;
  status: string;
  updatedAt: string;
}

const genreLabels: Record<string, string> = {
  fantasy: '玄幻',
  urban: '都市',
  scifi: '科幻',
  historical: '历史',
  mystery: '悬疑',
  romance: '言情',
  other: '其他',
};

/** 将 NovelProject 映射为组件内部的 Project 接口 */
function mapProject(np: NovelProject): Project {
  return {
    id: np.id,
    name: np.name,
    genre: np.genre,
    style: np.style?.name || np.style?.preset || '',
    wordCount: 0, // chapters 在 store 中独立管理，暂用 0
    targetWordCount: np.targetWords,
    status: np.status,
    updatedAt: np.updatedAt
      ? new Date(np.updatedAt).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : '',
  };
}

const ProjectList: React.FC = () => {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const projects = useMemo(
    () => state.project.projects.map(np => {
      const mapped = mapProject(np);
      const totalWords = state.project.chapters
        .filter(ch => ch.projectId === np.id)
        .reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
      return { ...mapped, wordCount: totalWords };
    }),
    [state.project.projects, state.project.chapters]
  );

  const handleOpen = (project: Project) => {
    const novelProject = state.project.projects.find((p) => p.id === project.id);
    if (novelProject) {
      // 切换项目时重置编辑器状态，避免显示其他项目的内容
      dispatch(editorActions.setContent(''));
      dispatch(editorActions.setChapter(null));
      dispatch(projectActions.setCurrent(novelProject));
      navigate('/');
    }
  };

  const handleDelete = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (deleteConfirmId === project.id) {
      dispatch(projectActions.delete(project.id));
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(project.id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleCreateNew = () => {
    dispatch(uiActions.openDialog({ type: 'create_project', open: true }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">项目管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            管理你的小说创作项目
          </p>
        </div>
        <Button icon={<Plus size={18} />} onClick={handleCreateNew}>
          新建项目
        </Button>
      </div>

      {/* 项目列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          /* 空状态 */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FolderOpen size={36} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              还没有项目
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              创建你的第一个小说项目，开始AI辅助的写作之旅
            </p>
            <Button icon={<Plus size={18} />} onClick={handleCreateNew}>
              新建项目
            </Button>
          </div>
        ) : (
          /* 项目卡片网格 */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => {
              const progress = Math.round(
                (project.wordCount / project.targetWordCount) * 100
              );
              return (
                <Card
                  key={project.id}
                  hoverable
                  onClick={() => handleOpen(project)}
                >
                  <CardContent className="p-5">
                    {/* 项目名和状态 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen size={16} className="shrink-0 text-blue-500" />
                        <h3 className="font-semibold text-slate-900 truncate">
                          {project.name}
                        </h3>
                      </div>
                      <ProjectStatusBadge status={project.status} />
                    </div>

                    {/* 题材和风格 */}
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="outline">
                        {genreLabels[project.genre] || project.genre}
                      </Badge>
                      <Badge variant="outline">{project.style}</Badge>
                    </div>

                    {/* 字数进度 */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">字数进度</span>
                        <span className="text-xs font-mono text-slate-600">
                          {(project.wordCount / 10000).toFixed(1)}万 /{' '}
                          {(project.targetWordCount / 10000).toFixed(0)}万
                        </span>
                      </div>
                      <ProgressBar
                        value={progress}
                        size="sm"
                        color={
                          progress >= 100
                            ? 'bg-emerald-500'
                            : progress >= 50
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }
                      />
                    </div>

                    {/* 底部：更新时间 + 操作 */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={12} />
                        <span>{project.updatedAt}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpen(project);
                          }}
                        >
                          打开
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(e, project)}
                          className={
                            deleteConfirmId === project.id
                              ? '!text-red-600 !bg-red-50'
                              : 'text-slate-400 hover:text-red-500'
                          }
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList;
