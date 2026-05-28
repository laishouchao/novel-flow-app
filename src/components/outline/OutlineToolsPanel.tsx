import React, { useState, useMemo, useCallback } from 'react';
import {
  BookMarked,
  GitBranch,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react';
import { useAppState, useAppDispatch, projectActions } from '../../store';
import type { Foreshadowing, Storyline, StorylinePhase } from '../../types';
import { generateId } from '../../utils/id';
import Button from '../common/Button';
import Dialog from '../common/Dialog';

// ============================================================================
// 伏笔类型配置
// ============================================================================

const FORESHADOWING_TYPES = [
  { value: 'character', label: '角色伏笔', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { value: 'plot', label: '情节伏笔', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { value: 'worldview', label: '世界观伏笔', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { value: 'item', label: '物品伏笔', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  { value: 'emotion', label: '情感伏笔', color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200' },
  { value: 'mystery', label: '悬念伏笔', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { value: 'symbol', label: '象征伏笔', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  { value: 'foreshadow', label: '预兆伏笔', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  { value: 'callback', label: '呼应伏笔', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
  { value: 'other', label: '其他', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
] as const;

type ForeshadowingStatus = 'planted' | 'echoed' | 'resolved' | 'abandoned';

const FORESHADOWING_STATUS_CONFIG: Record<ForeshadowingStatus, { label: string; icon: React.ReactNode; color: string }> = {
  planted: { label: '已埋设', icon: <Circle size={14} />, color: 'text-blue-600' },
  echoed: { label: '已呼应', icon: <Clock size={14} />, color: 'text-amber-600' },
  resolved: { label: '已收束', icon: <CheckCircle2 size={14} />, color: 'text-emerald-600' },
  abandoned: { label: '已放弃', icon: <AlertTriangle size={14} />, color: 'text-slate-400' },
};

// ============================================================================
// 情节线阶段配置
// ============================================================================

const STORYLINE_PHASES: { value: StorylinePhase; label: string }[] = [
  { value: 'introduction', label: '引入' },
  { value: 'development', label: '发展' },
  { value: 'complication', label: '复杂化' },
  { value: 'climax', label: '高潮' },
  { value: 'resolution', label: '解决' },
];

const STORYLINE_COLORS = [
  'from-indigo-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-sky-600',
];

// ============================================================================
// 伏笔编辑表单
// ============================================================================

function ForeshadowingForm({ item, onSave, onClose }: {
  item?: Foreshadowing;
  onSave: (item: Foreshadowing) => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState(item?.content || '');
  const [type, setType] = useState(item?.type || 'plot');
  const [plantedChapter, setPlantedChapter] = useState(item?.plantedChapter || '');
  const [resolvedChapter, setResolvedChapter] = useState(item?.resolvedChapter || '');
  const [status, setStatus] = useState<ForeshadowingStatus>(item?.status || 'planted');

  const handleSave = () => {
    if (!content.trim()) return;
    onSave({
      id: item?.id || generateId('fs'),
      content: content.trim(),
      type,
      plantedChapter,
      resolvedChapter,
      status,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">伏笔内容 *</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="描述这个伏笔的内容..."
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">伏笔类型</label>
        <div className="flex flex-wrap gap-2">
          {FORESHADOWING_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`
                px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors
                ${type === t.value
                  ? `${t.bg} ${t.color} ${t.border}`
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">状态</label>
        <div className="flex gap-2">
          {(Object.entries(FORESHADOWING_STATUS_CONFIG) as [ForeshadowingStatus, typeof FORESHADOWING_STATUS_CONFIG[ForeshadowingStatus]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${status === key
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              <span className={cfg.color}>{cfg.icon}</span>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">埋设章节</label>
          <input
            type="text"
            value={plantedChapter}
            onChange={e => setPlantedChapter(e.target.value)}
            placeholder="如：第3章"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">收束章节</label>
          <input
            type="text"
            value={resolvedChapter}
            onChange={e => setResolvedChapter(e.target.value)}
            placeholder="如：第15章"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!content.trim()}>保存</Button>
      </div>
    </div>
  );
}

// ============================================================================
// 情节线编辑表单
// ============================================================================

function StorylineForm({ item, onSave, onClose }: {
  item?: Storyline;
  onSave: (item: Storyline) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [phase, setPhase] = useState<StorylinePhase>(item?.currentPhase || 'introduction');
  const [isMainPlot, setIsMainPlot] = useState(item?.isMainPlot ?? true);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: item?.id || generateId('sl'),
      name: name.trim(),
      description,
      currentPhase: phase,
      isMainPlot,
      progress: STORYLINE_PHASES.findIndex(p => p.value === phase) / (STORYLINE_PHASES.length - 1),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">情节线名称 *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="如：主角复仇线、感情线"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">描述</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="情节线的主要内容..."
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">当前阶段</label>
        <div className="flex gap-2">
          {STORYLINE_PHASES.map(p => (
            <button
              key={p.value}
              onClick={() => setPhase(p.value)}
              className={`
                flex-1 px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-colors
                ${phase === p.value
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isMainPlot"
          checked={isMainPlot}
          onChange={e => setIsMainPlot(e.target.checked)}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="isMainPlot" className="text-sm text-slate-600">主线情节</label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!name.trim()}>保存</Button>
      </div>
    </div>
  );
}

// ============================================================================
// 伏笔追踪视图
// ============================================================================

function ForeshadowingView({ items, onEdit, onDelete }: {
  items: Foreshadowing[];
  onEdit: (item: Foreshadowing) => void;
  onDelete: (id: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<ForeshadowingStatus | 'all'>('all');

  const filtered = useMemo(() => {
    let list = [...items];
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);
    return list;
  }, [items, statusFilter]);

  // 统计
  const stats = useMemo(() => ({
    total: items.length,
    planted: items.filter(i => i.status === 'planted').length,
    echoed: items.filter(i => i.status === 'echoed').length,
    resolved: items.filter(i => i.status === 'resolved').length,
    overdue: items.filter(i => i.status === 'planted' && !i.resolvedChapter).length,
  }), [items]);

  return (
    <div className="flex flex-col h-full">
      {/* 统计栏 */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-500">共 <strong className="text-slate-800">{stats.total}</strong> 个伏笔</span>
          <span className="text-blue-600">已埋设 {stats.planted}</span>
          <span className="text-amber-600">已呼应 {stats.echoed}</span>
          <span className="text-emerald-600">已收束 {stats.resolved}</span>
          {stats.overdue > 0 && (
            <span className="text-red-600 flex items-center gap-1">
              <AlertTriangle size={12} />
              {stats.overdue} 个待收束
            </span>
          )}
        </div>
        <div className="flex-1" />
        {/* 筛选 */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ForeshadowingStatus | 'all')}
          className="px-2 py-1 text-xs rounded border border-slate-300 bg-white"
        >
          <option value="all">全部状态</option>
          {Object.entries(FORESHADOWING_STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <BookMarked size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">暂无伏笔</p>
          </div>
        ) : (
          filtered.map(item => {
            const typeCfg = FORESHADOWING_TYPES.find(t => t.value === item.type) || FORESHADOWING_TYPES[9];
            const statusCfg = FORESHADOWING_STATUS_CONFIG[item.status];

            return (
              <div key={item.id} className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors group">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 ${statusCfg.color}`}>{statusCfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}>
                        {typeCfg.label}
                      </span>
                      <span className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                    <p className="text-sm text-slate-700">{item.content}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      {item.plantedChapter && <span>📍 埋设: {item.plantedChapter}</span>}
                      {item.resolvedChapter && <span>✅ 收束: {item.resolvedChapter}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(item)} className="p-1 text-slate-400 hover:text-blue-600 rounded">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 情节线追踪视图
// ============================================================================

function StorylineView({ items, onEdit, onDelete }: {
  items: Storyline[];
  onEdit: (item: Storyline) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <GitBranch size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">暂无情节线</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {items.map((item, idx) => {
        const color = STORYLINE_COLORS[idx % STORYLINE_COLORS.length];
        const phaseIdx = STORYLINE_PHASES.findIndex(p => p.value === item.currentPhase);
        const progress = ((phaseIdx + 1) / STORYLINE_PHASES.length) * 100;

        return (
          <div key={item.id} className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${color}`} />
                <h4 className="font-semibold text-slate-800 text-sm">{item.name}</h4>
                {item.isMainPlot && (
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-200">主线</span>
                )}
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                  {STORYLINE_PHASES[phaseIdx]?.label || '未知'}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(item)} className="p-1 text-slate-400 hover:text-blue-600 rounded">
                  <Edit3 size={14} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {item.description && (
              <p className="text-sm text-slate-600 mb-3">{item.description}</p>
            )}

            {/* 进度条 */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{Math.round(progress)}%</span>
            </div>

            {/* 阶段标记 */}
            <div className="flex items-center justify-between mt-2">
              {STORYLINE_PHASES.map((p, i) => {
                const isActive = i <= phaseIdx;
                return (
                  <div key={p.value} className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    <span className={`text-[10px] mt-1 ${isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                      {p.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// 主面板
// ============================================================================

export default function OutlineToolsPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const currentProject = state.project.currentProject;

  // 从项目读取伏笔和情节线数据
  const foreshadowings = useMemo(() => {
    return currentProject?.foreshadowings || [];
  }, [currentProject]);

  const storylines = useMemo(() => {
    return currentProject?.storylines || [];
  }, [currentProject]);

  const [activeTab, setActiveTab] = useState<'foreshadowing' | 'storyline'>('foreshadowing');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Foreshadowing | Storyline | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'foreshadowing' | 'storyline'; id: string } | null>(null);

  // 伏笔操作
  const handleSaveForeshadowing = useCallback((item: Foreshadowing) => {
    if (!currentProject) return;
    let updated: Foreshadowing[];
    if (editingItem && 'plantedChapter' in editingItem) {
      updated = foreshadowings.map(f => f.id === item.id ? item : f);
    } else {
      updated = [...foreshadowings, item];
    }
    dispatch(projectActions.update({ foreshadowings: updated }));
    setShowForm(false);
    setEditingItem(undefined);
  }, [currentProject, foreshadowings, editingItem, dispatch]);

  // 情节线操作
  const handleSaveStoryline = useCallback((item: Storyline) => {
    if (!currentProject) return;
    let updated: Storyline[];
    if (editingItem && 'currentPhase' in editingItem) {
      updated = storylines.map(s => s.id === item.id ? item : s);
    } else {
      updated = [...storylines, item];
    }
    dispatch(projectActions.update({ storylines: updated }));
    setShowForm(false);
    setEditingItem(undefined);
  }, [currentProject, storylines, editingItem, dispatch]);

  const handleDelete = useCallback(() => {
    if (!deleteConfirm || !currentProject) return;
    if (deleteConfirm.type === 'foreshadowing') {
      const updated = foreshadowings.filter(f => f.id !== deleteConfirm.id);
      dispatch(projectActions.update({ foreshadowings: updated }));
    } else {
      const updated = storylines.filter(s => s.id !== deleteConfirm.id);
      dispatch(projectActions.update({ storylines: updated }));
    }
    setDeleteConfirm(null);
  }, [deleteConfirm, currentProject, foreshadowings, storylines, dispatch]);

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <BookMarked size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">请先选择一个项目</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <BookMarked size={22} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">大纲工具</h2>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('foreshadowing')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'foreshadowing' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BookMarked size={14} />
            伏笔追踪
            {foreshadowings.length > 0 && (
              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px]">{foreshadowings.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('storyline')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'storyline' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <GitBranch size={14} />
            情节线
            {storylines.length > 0 && (
              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px]">{storylines.length}</span>
            )}
          </button>
          <div className="flex-1" />
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => { setEditingItem(undefined); setShowForm(true); }}
          >
            {activeTab === 'foreshadowing' ? '添加伏笔' : '添加情节线'}
          </Button>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'foreshadowing' ? (
          <ForeshadowingView
            items={foreshadowings}
            onEdit={(item) => { setEditingItem(item); setShowForm(true); }}
            onDelete={(id) => setDeleteConfirm({ type: 'foreshadowing', id })}
          />
        ) : (
          <StorylineView
            items={storylines}
            onEdit={(item) => { setEditingItem(item); setShowForm(true); }}
            onDelete={(id) => setDeleteConfirm({ type: 'storyline', id })}
          />
        )}
      </div>

      {/* 表单对话框 */}
      <Dialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingItem(undefined); }}
        title={editingItem ? (activeTab === 'foreshadowing' ? '编辑伏笔' : '编辑情节线') : (activeTab === 'foreshadowing' ? '添加伏笔' : '添加情节线')}
        size="md"
      >
        {activeTab === 'foreshadowing' ? (
          <ForeshadowingForm
            item={editingItem as Foreshadowing}
            onSave={handleSaveForeshadowing}
            onClose={() => { setShowForm(false); setEditingItem(undefined); }}
          />
        ) : (
          <StorylineForm
            item={editingItem as Storyline}
            onSave={handleSaveStoryline}
            onClose={() => { setShowForm(false); setEditingItem(undefined); }}
          />
        )}
      </Dialog>

      {/* 删除确认 */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>删除</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">确定要删除吗？此操作不可撤销。</p>
      </Dialog>
    </div>
  );
}
