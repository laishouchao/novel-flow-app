import React, { useState, useMemo, useCallback } from 'react';
import {
  Globe,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Mountain,
  Landmark,
  Crown,
  Scroll,
  Zap,
} from 'lucide-react';
import { useAppState, useAppDispatch, projectActions } from '../../store';
import type { WorldFaction } from '../../types';
import { generateId } from '../../utils/id';
import Button from '../common/Button';
import Dialog from '../common/Dialog';

// ============================================================================
// 世界观模块配置
// ============================================================================

interface WorldField {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
}

interface WorldModule {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  fields: WorldField[];
}

const WORLD_MODULES: WorldModule[] = [
  {
    id: 'origins',
    title: '世界起源',
    icon: <Globe size={18} />,
    description: '世界的根本设定与历史',
    fields: [
      { key: 'creationMyth', label: '创世神话', placeholder: '描述这个世界的起源传说...', multiline: true },
      { key: 'historicalEras', label: '历史纪元', placeholder: '列出重要的历史时期...', multiline: true },
      { key: 'civilizationStatus', label: '文明现状', placeholder: '当前文明的发展水平与状态...', multiline: true },
    ],
  },
  {
    id: 'nature',
    title: '自然环境',
    icon: <Mountain size={18} />,
    description: '地理、气候与生态',
    fields: [
      { key: 'geography', label: '地理概况', placeholder: '大陆、海洋、山脉、河流的分布...' },
      { key: 'climate', label: '气候特征', placeholder: '各地区的气候特点...' },
      { key: 'ecology', label: '生态系统', placeholder: '植被、动物、特殊物种...' },
      { key: 'resources', label: '重要资源', placeholder: '稀有资源、能源、矿藏...' },
      { key: 'naturalDisasters', label: '自然灾害', placeholder: '地震、风暴、异象等...' },
      { key: 'specialLocations', label: '特殊地点', placeholder: '秘境、遗迹、禁地...' },
    ],
  },
  {
    id: 'society',
    title: '人文环境',
    icon: <Landmark size={18} />,
    description: '政治、经济与文化',
    fields: [
      { key: 'politics', label: '政治体系', placeholder: '国家、政权、法律制度...' },
      { key: 'economy', label: '经济体系', placeholder: '货币、贸易、产业链...' },
      { key: 'culture', label: '文化习俗', placeholder: '节日、礼仪、禁忌...' },
      { key: 'religion', label: '宗教信仰', placeholder: '神系、教派、信仰体系...' },
      { key: 'technology', label: '科技水平', placeholder: '工具、武器、交通工具...' },
      { key: 'language', label: '语言文字', placeholder: '通用语、方言、文字系统...' },
      { key: 'races', label: '种族与人口', placeholder: '主要种族、人口分布、特殊族群...' },
    ],
  },
  {
    id: 'power',
    title: '力量体系',
    icon: <Zap size={18} />,
    description: '修炼、魔法与特殊能力',
    fields: [
      { key: 'systemOverview', label: '体系概述', placeholder: '力量体系的基本原理...' },
      { key: 'levels', label: '等级划分', placeholder: '修炼境界、能力等级...' },
      { key: 'specialAbilities', label: '特殊能力', placeholder: '天赋、血脉、特殊技能...' },
      { key: 'limitations', label: '限制与代价', placeholder: '使用力量的限制和副作用...' },
    ],
  },
];

// ============================================================================
// 势力编辑表单
// ============================================================================

interface FactionFormProps {
  faction?: WorldFaction;
  onSave: (faction: WorldFaction) => void;
  onClose: () => void;
}

function FactionForm({ faction, onSave, onClose }: FactionFormProps) {
  const [name, setName] = useState(faction?.name || '');
  const [description, setDescription] = useState(faction?.description || '');
  const [goals, setGoals] = useState(faction?.goals || '');
  const [leader, setLeader] = useState(faction?.leader || '');
  const [territory, setTerritory] = useState(faction?.territory || '');
  const [hostility, setHostility] = useState<WorldFaction['hostility']>(faction?.hostility || 'neutral');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: faction?.id || generateId('faction'),
      name: name.trim(),
      description,
      goals,
      leader,
      territory,
      hostility,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">势力名称 *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="输入势力名称"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">敌对程度</label>
        <div className="flex gap-2">
          {(['friendly', 'neutral', 'hostile'] as const).map(h => {
            const labels = { friendly: '友好', neutral: '中立', hostile: '敌对' };
            const colors = {
              friendly: 'bg-emerald-50 border-emerald-300 text-emerald-700',
              neutral: 'bg-slate-50 border-slate-300 text-slate-700',
              hostile: 'bg-red-50 border-red-300 text-red-700',
            };
            return (
              <button
                key={h}
                onClick={() => setHostility(h)}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                  ${hostility === h ? colors[h] : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                `}
              >
                {labels[h]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">领袖</label>
        <input
          type="text"
          value={leader}
          onChange={e => setLeader(e.target.value)}
          placeholder="势力领袖"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">描述</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="势力的背景、特点..."
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">目标</label>
        <textarea
          value={goals}
          onChange={e => setGoals(e.target.value)}
          placeholder="势力的核心目标..."
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">领地/势力范围</label>
        <input
          type="text"
          value={territory}
          onChange={e => setTerritory(e.target.value)}
          placeholder="势力的控制区域"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!name.trim()}>保存</Button>
      </div>
    </div>
  );
}

// ============================================================================
// 势力列表
// ============================================================================

function FactionList({
  factions,
  onEdit,
  onDelete,
}: {
  factions: WorldFaction[];
  onEdit: (f: WorldFaction) => void;
  onDelete: (id: string) => void;
}) {
  if (factions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Crown size={36} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">暂无势力设定</p>
        <p className="text-xs mt-1">点击「添加势力」创建</p>
      </div>
    );
  }

  const hostilityConfig = {
    friendly: { label: '友好', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    neutral: { label: '中立', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
    hostile: { label: '敌对', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  };

  return (
    <div className="space-y-3 p-4">
      {factions.map(f => {
        const hCfg = hostilityConfig[f.hostility];
        return (
          <div key={f.id} className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors group">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown size={16} className="text-amber-600" />
                <h4 className="font-semibold text-slate-800">{f.name}</h4>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${hCfg.bg} ${hCfg.color} ${hCfg.border}`}>
                  {hCfg.label}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(f)} className="p-1 text-slate-400 hover:text-blue-600 rounded">
                  <Edit3 size={14} />
                </button>
                <button onClick={() => onDelete(f.id)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {f.description && <p className="text-sm text-slate-600 mb-1">{f.description}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {f.leader && <span>👤 领袖: {f.leader}</span>}
              {f.territory && <span>🗺️ 领地: {f.territory}</span>}
              {f.goals && <span>🎯 目标: {f.goals}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// 世界观模块编辑卡片
// ============================================================================

function WorldModuleCard({
  module,
  data,
  onChange,
}: {
  module: WorldModule;
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const filledCount = module.fields.filter(f => data[f.key]?.trim()).length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* 头部 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <span className="text-blue-600">{module.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">{module.title}</h3>
          <p className="text-xs text-slate-500">{module.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {filledCount}/{module.fields.length}
          </span>
          <span className="text-slate-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </button>

      {/* 内容 */}
      {expanded && (
        <div className="px-5 py-4 border-t border-slate-100 space-y-4">
          {module.fields.map(field => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{field.label}</label>
              {field.multiline ? (
                <textarea
                  value={data[field.key] || ''}
                  onChange={e => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    placeholder:text-slate-400 resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={data[field.key] || ''}
                  onChange={e => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    placeholder:text-slate-400"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 主面板
// ============================================================================

export default function WorldbuildingPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const currentProject = state.project.currentProject;

  // 从项目中读取世界观数据
  const worldData = useMemo(() => {
    const raw = (currentProject as unknown as Record<string, unknown>)?.worldbuilding;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) as Record<string, Record<string, string>>; }
      catch { return {}; }
    }
    return (raw as Record<string, Record<string, string>>) || {};
  }, [currentProject]);

  const factions = useMemo(() => {
    const raw = (currentProject as unknown as Record<string, unknown>)?.worldFactions;
    return (raw as WorldFaction[]) || [];
  }, [currentProject]);

  const [activeTab, setActiveTab] = useState<'modules' | 'factions'>('modules');
  const [showFactionForm, setShowFactionForm] = useState(false);
  const [editingFaction, setEditingFaction] = useState<WorldFaction | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // 保存世界观字段
  const handleFieldChange = useCallback((moduleId: string, key: string, value: string) => {
    if (!currentProject) return;
    const newData = { ...worldData };
    if (!newData[moduleId]) newData[moduleId] = {};
    newData[moduleId][key] = value;
    dispatch(projectActions.update({ worldbuilding: JSON.stringify(newData) }));
  }, [currentProject, worldData, dispatch]);

  // 势力操作
  const handleSaveFaction = useCallback((faction: WorldFaction) => {
    if (!currentProject) return;
    let updated: WorldFaction[];
    if (editingFaction) {
      updated = factions.map(f => f.id === faction.id ? faction : f);
    } else {
      updated = [...factions, faction];
    }
    dispatch(projectActions.update({ worldFactions: updated }));
    setShowFactionForm(false);
    setEditingFaction(undefined);
  }, [currentProject, factions, editingFaction, dispatch]);

  const handleDeleteFaction = useCallback(() => {
    if (!deleteConfirm || !currentProject) return;
    const updated = factions.filter(f => f.id !== deleteConfirm);
    dispatch(projectActions.update({ worldFactions: updated }));
    setDeleteConfirm(null);
  }, [deleteConfirm, currentProject, factions, dispatch]);

  // 统计
  const totalFields = WORLD_MODULES.reduce((sum, m) => sum + m.fields.length, 0);
  const filledFields = WORLD_MODULES.reduce((sum, m) => {
    const moduleData = worldData[m.id] || {};
    return sum + m.fields.filter(f => moduleData[f.key]?.trim()).length;
  }, 0);
  const progress = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <Globe size={48} className="mx-auto mb-3 opacity-50" />
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
            <Globe size={22} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">世界观设定</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">完成度</span>
            <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-700">{progress}%</span>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('modules')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'modules'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Scroll size={14} />
            世界设定
          </button>
          <button
            onClick={() => setActiveTab('factions')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'factions'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Crown size={14} />
            势力阵营
            {factions.length > 0 && (
              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px]">
                {factions.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'modules' ? (
          <div className="p-6 space-y-4">
            {WORLD_MODULES.map(module => (
              <WorldModuleCard
                key={module.id}
                module={module}
                data={worldData[module.id] || {}}
                onChange={(key, value) => handleFieldChange(module.id, key, value)}
              />
            ))}
          </div>
        ) : (
          <div>
            <div className="px-4 pt-4">
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => { setEditingFaction(undefined); setShowFactionForm(true); }}
              >
                添加势力
              </Button>
            </div>
            <FactionList
              factions={factions}
              onEdit={(f) => { setEditingFaction(f); setShowFactionForm(true); }}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          </div>
        )}
      </div>

      {/* 势力编辑对话框 */}
      <Dialog
        open={showFactionForm}
        onClose={() => { setShowFactionForm(false); setEditingFaction(undefined); }}
        title={editingFaction ? '编辑势力' : '添加势力'}
        size="md"
      >
        <FactionForm
          faction={editingFaction}
          onSave={handleSaveFaction}
          onClose={() => { setShowFactionForm(false); setEditingFaction(undefined); }}
        />
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
            <Button variant="danger" size="sm" onClick={handleDeleteFaction}>删除</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          确定要删除势力「{deleteConfirm ? factions.find(f => f.id === deleteConfirm)?.name : ''}」吗？
        </p>
      </Dialog>
    </div>
  );
}
