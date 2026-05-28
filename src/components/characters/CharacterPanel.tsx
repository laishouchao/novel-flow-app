import React, { useState, useMemo, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  ChevronRight,
  Edit3,
  Trash2,
  Save,
  Heart,
  Skull,
  User,
  Zap,
  BookOpen,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppState, useAppDispatch, projectActions } from '../../store';
import type { Character, CharacterRole, CharacterState } from '../../types';
import { generateCharacterId } from '../../utils/id';
import Button from '../common/Button';
import Dialog from '../common/Dialog';

// ============================================================================
// 角色配置
// ============================================================================

const ROLE_CONFIG: Record<CharacterRole, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  protagonist: {
    label: '主角',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    icon: <Star size={14} />,
  },
  supporting: {
    label: '配角',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    icon: <Heart size={14} />,
  },
  antagonist: {
    label: '反派',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    icon: <Skull size={14} />,
  },
  minor: {
    label: '次要',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    icon: <User size={14} />,
  },
};

const ROLE_ORDER: CharacterRole[] = ['protagonist', 'supporting', 'antagonist', 'minor'];

/** 角色头像字颜色 */
const AVATAR_COLORS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-fuchsia-600',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ============================================================================
// Star icon (lucide-react 没有 Star 导出时的备用)
// ============================================================================

function Star({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ============================================================================
// 空角色状态
// ============================================================================

function createEmptyCharacter(projectId: string): Character {
  return {
    id: generateCharacterId(),
    projectId,
    name: '',
    role: 'supporting',
    drive: '',
    fear: '',
    trait: '',
    backstory: '',
    surfaceGoal: '',
    deepDesire: '',
    soulNeed: '',
    initialArc: '',
    triggerEvent: '',
    transformation: '',
    finalState: '',
    currentState: {
      items: [],
      abilities: [],
      status: '',
      relationships: {},
      events: [],
    },
    changeLog: [],
  };
}

// ============================================================================
// 角色列表项
// ============================================================================

interface CharacterListItemProps {
  character: Character;
  isSelected: boolean;
  onClick: () => void;
}

const CharacterListItem: React.FC<CharacterListItemProps> = ({ character, isSelected, onClick }) => {
  const config = ROLE_CONFIG[character.role];
  const avatarGradient = getAvatarColor(character.name);

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
        transition-all duration-150 group
        ${isSelected
          ? 'bg-blue-50 border border-blue-200 shadow-sm'
          : 'hover:bg-slate-50 border border-transparent'
        }
      `}
    >
      {/* 头像 */}
      <div className={`
        shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient}
        flex items-center justify-center text-white text-sm font-bold
        shadow-sm
      `}>
        {character.name ? character.name[0] : '?'}
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800 truncate">
            {character.name || '未命名角色'}
          </span>
          <span className={`
            inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
            border ${config.bgColor} ${config.color} ${config.borderColor}
          `}>
            {config.icon}
            {config.label}
          </span>
        </div>
        {character.trait && (
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {character.trait}
          </p>
        )}
      </div>

      {/* 箭头 */}
      <ChevronRight
        size={14}
        className={`shrink-0 text-slate-400 transition-transform ${isSelected ? 'text-blue-500' : 'group-hover:text-slate-600'}`}
      />
    </button>
  );
};

// ============================================================================
// 角色详情面板
// ============================================================================

interface CharacterDetailProps {
  character: Character;
  onEdit: () => void;
  onDelete: () => void;
}

const CharacterDetail: React.FC<CharacterDetailProps> = ({ character, onEdit, onDelete }) => {
  const [showState, setShowState] = useState(false);
  const [showArc, setShowArc] = useState(true);
  const config = ROLE_CONFIG[character.role];
  const avatarGradient = getAvatarColor(character.name);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* 头部 */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-start gap-4">
          <div className={`
            shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${avatarGradient}
            flex items-center justify-center text-white text-xl font-bold shadow-md
          `}>
            {character.name ? character.name[0] : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-900">
                {character.name || '未命名角色'}
              </h2>
              <span className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                border ${config.bgColor} ${config.color} ${config.borderColor}
              `}>
                {config.icon}
                {config.label}
              </span>
            </div>
            {character.trait && (
              <p className="text-sm text-slate-500 italic">"{character.trait}"</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={<Edit3 size={14} />} onClick={onEdit}>
              编辑
            </Button>
            <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={onDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              删除
            </Button>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 px-6 py-5 space-y-6">
        {/* 核心特质 */}
        <Section title="核心特质" icon={<Zap size={16} />}>
          <FieldRow label="驱动力" value={character.drive} />
          <FieldRow label="恐惧" value={character.fear} />
          <FieldRow label="特征" value={character.trait} />
          <FieldRow label="背景故事" value={character.backstory} multiline />
        </Section>

        {/* 角色弧光 */}
        <Section
          title="角色弧光"
          icon={<BookOpen size={16} />}
          collapsible
          defaultOpen={showArc}
          onToggle={() => setShowArc(!showArc)}
        >
          <FieldRow label="表面追求" value={character.surfaceGoal} />
          <FieldRow label="深层渴望" value={character.deepDesire} />
          <FieldRow label="灵魂需求" value={character.soulNeed} />
          <div className="grid grid-cols-2 gap-4 mt-3">
            <ArcStep label="初始状态" value={character.initialArc} step={1} />
            <ArcStep label="触发事件" value={character.triggerEvent} step={2} />
            <ArcStep label="蜕变节点" value={character.transformation} step={3} />
            <ArcStep label="最终状态" value={character.finalState} step={4} />
          </div>
        </Section>

        {/* 运行时状态 */}
        <Section
          title="运行时状态"
          icon={<Clock size={16} />}
          collapsible
          defaultOpen={false}
          onToggle={() => setShowState(!showState)}
        >
          <FieldRow label="当前状态" value={character.currentState.status} />
          {character.currentState.abilities.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-1.5">能力</p>
              <div className="flex flex-wrap gap-1.5">
                {character.currentState.abilities.map((a, i) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
          {character.currentState.items.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-1.5">持有物品</p>
              <div className="flex flex-wrap gap-1.5">
                {character.currentState.items.map((item, i) => (
                  <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs border border-amber-200">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
          {Object.keys(character.currentState.relationships).length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-1.5">人物关系</p>
              <div className="space-y-1.5">
                {Object.entries(character.currentState.relationships).map(([name, rel]) => (
                  <div key={name} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-700">{name}</span>
                    <span className="text-slate-400">—</span>
                    <span className="text-slate-600">{rel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {character.currentState.events.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1.5">经历事件</p>
              <ul className="space-y-1">
                {character.currentState.events.map((e, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-slate-400 mt-1">•</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {character.currentState.status === '' &&
            character.currentState.abilities.length === 0 &&
            character.currentState.items.length === 0 &&
            Object.keys(character.currentState.relationships).length === 0 &&
            character.currentState.events.length === 0 && (
              <p className="text-sm text-slate-400 italic">暂无运行时状态数据</p>
            )
          }
        </Section>

        {/* 变更日志 */}
        {character.changeLog.length > 0 && (
          <Section title="变更日志" icon={<Tag size={16} />}>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {character.changeLog.slice().reverse().map((change, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-slate-400 shrink-0">
                    第{change.volume}卷第{change.chapter}章
                  </span>
                  <span className="text-slate-600">
                    <span className="font-medium">{change.field}</span>: {change.oldValue} → {change.newValue}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
};

/** 通用段落容器 */
function Section({ title, icon, children, collapsible, defaultOpen = true, onToggle }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  onToggle?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = collapsible ? open : true;

  const handleToggle = () => {
    if (collapsible) {
      setOpen(!open);
      onToggle?.();
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={handleToggle}
        className={`
          w-full flex items-center gap-2 px-4 py-3 bg-slate-50 text-left
          ${collapsible ? 'hover:bg-slate-100 cursor-pointer' : 'cursor-default'}
        `}
      >
        <span className="text-slate-500">{icon}</span>
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        {collapsible && (
          <span className="ml-auto text-slate-400">
            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

/** 字段行 */
function FieldRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div className="mb-3">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-sm text-slate-700 ${multiline ? 'whitespace-pre-wrap leading-relaxed' : ''}`}>
        {value}
      </p>
    </div>
  );
}

/** 角色弧光步骤 */
function ArcStep({ label, value, step }: { label: string; value: string; step: number }) {
  if (!value) return null;
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
          {step}
        </span>
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}

// ============================================================================
// 角色编辑表单
// ============================================================================

interface CharacterFormProps {
  character: Character;
  onSave: (character: Character) => void;
  onCancel: () => void;
}

const CharacterForm: React.FC<CharacterFormProps> = ({ character: initial, onSave, onCancel }) => {
  const [char, setChar] = useState<Character>({ ...initial });
  const [activeTab, setActiveTab] = useState<'basic' | 'arc' | 'state'>('basic');

  const update = (field: keyof Character, value: string) => {
    setChar(prev => ({ ...prev, [field]: value }));
  };

  const updateState = (field: keyof CharacterState, value: string[] | Record<string, string> | string) => {
    setChar(prev => ({
      ...prev,
      currentState: { ...prev.currentState, [field]: value },
    }));
  };

  const handleSave = () => {
    if (!char.name.trim()) return;
    onSave(char);
  };

  const tabs = [
    { key: 'basic' as const, label: '基础信息', icon: <User size={14} /> },
    { key: 'arc' as const, label: '角色弧光', icon: <BookOpen size={14} /> },
    { key: 'state' as const, label: '运行时状态', icon: <Clock size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab 栏 */}
      <div className="flex items-center gap-1 px-4 pt-4 pb-2 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === tab.key
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 表单内容 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {activeTab === 'basic' && (
          <>
            <FormInput label="角色名称" value={char.name} onChange={v => update('name', v)} required placeholder="输入角色名称" />
            <FormSelect
              label="角色类型"
              value={char.role}
              onChange={v => update('role', v as CharacterRole)}
              options={ROLE_ORDER.map(r => ({ value: r, label: ROLE_CONFIG[r].label }))}
            />
            <FormInput label="特征" value={char.trait} onChange={v => update('trait', v)} placeholder="一句话概括角色特征" />
            <FormTextarea label="驱动力" value={char.drive} onChange={v => update('drive', v)} placeholder="什么驱使这个角色行动？" />
            <FormTextarea label="恐惧" value={char.fear} onChange={v => update('fear', v)} placeholder="这个角色最害怕什么？" />
            <FormTextarea label="背景故事" value={char.backstory} onChange={v => update('backstory', v)} placeholder="角色的过去经历" rows={4} />
          </>
        )}

        {activeTab === 'arc' && (
          <>
            <FormTextarea label="表面追求" value={char.surfaceGoal} onChange={v => update('surfaceGoal', v)} placeholder="角色公开追求的目标" />
            <FormTextarea label="深层渴望" value={char.deepDesire} onChange={v => update('deepDesire', v)} placeholder="角色内心真正渴望的东西" />
            <FormTextarea label="灵魂需求" value={char.soulNeed} onChange={v => update('soulNeed', v)} placeholder="角色最根本的需求" />
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">四阶段弧光</p>
              <div className="space-y-3">
                <FormTextarea label="1. 初始状态" value={char.initialArc} onChange={v => update('initialArc', v)} placeholder="故事开始时角色的状态" />
                <FormTextarea label="2. 触发事件" value={char.triggerEvent} onChange={v => update('triggerEvent', v)} placeholder="打破平衡的关键事件" />
                <FormTextarea label="3. 蜕变节点" value={char.transformation} onChange={v => update('transformation', v)} placeholder="角色发生转变的时刻" />
                <FormTextarea label="4. 最终状态" value={char.finalState} onChange={v => update('finalState', v)} placeholder="故事结束时角色的状态" />
              </div>
            </div>
          </>
        )}

        {activeTab === 'state' && (
          <>
            <FormTextarea label="当前状态" value={char.currentState.status} onChange={v => updateState('status', v)} placeholder="角色当前的状态描述" />
            <FormArrayInput label="能力" values={char.currentState.abilities} onChange={v => updateState('abilities', v)} placeholder="添加能力" />
            <FormArrayInput label="持有物品" values={char.currentState.items} onChange={v => updateState('items', v)} placeholder="添加物品" />
            <FormKeyValueInput label="人物关系" values={char.currentState.relationships} onChange={v => updateState('relationships', v)} />
            <FormArrayInput label="经历事件" values={char.currentState.events} onChange={v => updateState('events', v)} placeholder="添加事件" />
          </>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          取消
        </Button>
        <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={handleSave} disabled={!char.name.trim()}>
          保存
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// 表单组件
// ============================================================================

function FormInput({ label, value, onChange, required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          placeholder:text-slate-400"
      />
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          placeholder:text-slate-400 resize-none"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          bg-white"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function FormArrayInput({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInput('');
    }
  };

  const remove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            placeholder:text-slate-400"
        />
        <Button variant="outline" size="sm" onClick={add}>添加</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs border border-slate-200">
            {v}
            <button onClick={() => remove(i)} className="text-slate-400 hover:text-red-500 ml-0.5">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function FormKeyValueInput({ label, values, onChange }: {
  label: string; values: Record<string, string>; onChange: (v: Record<string, string>) => void;
}) {
  const [key, setKey] = useState('');
  const [val, setVal] = useState('');

  const add = () => {
    const k = key.trim();
    const v = val.trim();
    if (k && v) {
      onChange({ ...values, [k]: v });
      setKey('');
      setVal('');
    }
  };

  const remove = (k: string) => {
    const next = { ...values };
    delete next[k];
    onChange(next);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="角色名"
          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
        <input
          type="text"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="关系描述"
          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
        <Button variant="outline" size="sm" onClick={add}>添加</Button>
      </div>
      <div className="space-y-1.5">
        {Object.entries(values).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            <span className="font-medium text-slate-700">{k}</span>
            <span className="text-slate-400">—</span>
            <span className="flex-1 text-slate-600">{v}</span>
            <button onClick={() => remove(k)} className="text-slate-400 hover:text-red-500">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 主面板
// ============================================================================

export default function CharacterPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const characters = state.project.characters;
  const currentProject = state.project.currentProject;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editChar, setEditChar] = useState<Character | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<CharacterRole | 'all'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // 筛选和排序
  const filteredCharacters = useMemo(() => {
    let list = [...characters];

    // 搜索
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.trait.toLowerCase().includes(q) ||
        c.backstory.toLowerCase().includes(q)
      );
    }

    // 角色类型筛选
    if (roleFilter !== 'all') {
      list = list.filter(c => c.role === roleFilter);
    }

    // 按角色等级排序
    list.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));

    return list;
  }, [characters, search, roleFilter]);

  const selectedCharacter = selectedId ? characters.find(c => c.id === selectedId) : null;

  // 按角色类型分组统计
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: characters.length };
    for (const r of ROLE_ORDER) {
      counts[r] = characters.filter(c => c.role === r).length;
    }
    return counts;
  }, [characters]);

  // 操作
  const handleCreate = useCallback(() => {
    if (!currentProject) return;
    const newChar = createEmptyCharacter(currentProject.id);
    setEditChar(newChar);
    setEditing(true);
  }, [currentProject]);

  const handleEdit = useCallback(() => {
    if (selectedCharacter) {
      setEditChar({ ...selectedCharacter });
      setEditing(true);
    }
  }, [selectedCharacter]);

  const handleSave = useCallback((char: Character) => {
    const exists = characters.find(c => c.id === char.id);
    if (exists) {
      dispatch(projectActions.updateCharacter(char.id, char));
    } else {
      dispatch(projectActions.addCharacter(char));
      setSelectedId(char.id);
    }
    setEditing(false);
    setEditChar(null);
  }, [characters, dispatch]);

  const handleDelete = useCallback(() => {
    if (deleteConfirm) {
      dispatch(projectActions.deleteCharacter(deleteConfirm));
      if (selectedId === deleteConfirm) {
        setSelectedId(null);
      }
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, selectedId, dispatch]);

  // 无项目
  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="text-center">
          <Users size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">请先选择一个项目</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 左侧列表 */}
      <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col bg-white">
        {/* 头部 */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              角色管理
            </h2>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {characters.length} 个角色
            </span>
          </div>

          {/* 搜索 */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索角色..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                placeholder:text-slate-400"
            />
          </div>

          {/* 角色类型筛选 */}
          <div className="flex flex-wrap gap-1.5">
            <FilterTag
              label="全部"
              count={roleCounts.all}
              active={roleFilter === 'all'}
              onClick={() => setRoleFilter('all')}
            />
            {ROLE_ORDER.map(r => (
              <FilterTag
                key={r}
                label={ROLE_CONFIG[r].label}
                count={roleCounts[r] || 0}
                active={roleFilter === r}
                onClick={() => setRoleFilter(r)}
                color={ROLE_CONFIG[r].color}
              />
            ))}
          </div>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {filteredCharacters.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {search || roleFilter !== 'all' ? '没有匹配的角色' : '还没有角色'}
              </p>
            </div>
          ) : (
            filteredCharacters.map(char => (
              <CharacterListItem
                key={char.id}
                character={char}
                isSelected={char.id === selectedId}
                onClick={() => setSelectedId(char.id)}
              />
            ))
          )}
        </div>

        {/* 创建按钮 */}
        <div className="px-3 py-3 border-t border-slate-200">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            icon={<Plus size={14} />}
            onClick={handleCreate}
          >
            新建角色
          </Button>
        </div>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 bg-slate-50 overflow-hidden">
        {editing && editChar ? (
          <div className="h-full bg-white">
            <CharacterForm
              character={editChar}
              onSave={handleSave}
              onCancel={() => { setEditing(false); setEditChar(null); }}
            />
          </div>
        ) : selectedCharacter ? (
          <CharacterDetail
            character={selectedCharacter}
            onEdit={handleEdit}
            onDelete={() => setDeleteConfirm(selectedCharacter.id)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {characters.length > 0 ? '选择一个角色查看详情' : '点击左侧「新建角色」开始创建'}
              </p>
            </div>
          </div>
        )}
      </div>

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
        <p className="text-sm text-slate-600">
          确定要删除角色「{deleteConfirm ? characters.find(c => c.id === deleteConfirm)?.name : ''}」吗？此操作不可撤销。
        </p>
      </Dialog>
    </div>
  );
}

// ============================================================================
// 筛选标签
// ============================================================================

function FilterTag({ label, count, active, onClick, color }: {
  label: string; count: number; active: boolean; onClick: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
        transition-colors border
        ${active
          ? 'bg-blue-50 text-blue-700 border-blue-300'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }
      `}
    >
      <span className={color || ''}>{label}</span>
      <span className={`
        px-1.5 py-0.5 rounded-full text-[10px]
        ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}
      `}>
        {count}
      </span>
    </button>
  );
}
