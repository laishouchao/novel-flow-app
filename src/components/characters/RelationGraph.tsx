import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Link2,
  Plus,
  Trash2,
  Eye,
  List,
} from 'lucide-react';
import { useAppState, useAppDispatch, projectActions } from '../../store';
import type { CharacterRelation, RelationType, CharacterRole } from '../../types';
import { generateId } from '../../utils/id';
import Button from '../common/Button';
import Dialog from '../common/Dialog';

// ============================================================================
// 关系类型配置
// ============================================================================

const RELATION_TYPE_CONFIG: Record<RelationType, { label: string; color: string; lineColor: string }> = {
  family:    { label: '家人', color: 'text-amber-700', lineColor: '#d97706' },
  lover:     { label: '恋人', color: 'text-pink-600', lineColor: '#db2777' },
  friend:    { label: '朋友', color: 'text-emerald-600', lineColor: '#059669' },
  enemy:     { label: '敌人', color: 'text-red-600', lineColor: '#dc2626' },
  mentor:    { label: '师徒', color: 'text-purple-600', lineColor: '#9333ea' },
  superior:  { label: '上下级', color: 'text-blue-600', lineColor: '#2563eb' },
  ally:      { label: '盟友', color: 'text-teal-600', lineColor: '#0d9488' },
  rival:     { label: '宿敌', color: 'text-orange-600', lineColor: '#ea580c' },
  colleague: { label: '同门', color: 'text-cyan-600', lineColor: '#0891b2' },
  other:     { label: '其他', color: 'text-slate-600', lineColor: '#64748b' },
};

const RELATION_TYPES = Object.keys(RELATION_TYPE_CONFIG) as RelationType[];

// 角色颜色
const ROLE_COLORS: Record<CharacterRole, string> = {
  protagonist: '#6366f1',
  supporting: '#059669',
  antagonist: '#dc2626',
  minor: '#94a3b8',
};

// ============================================================================
// 力导向图引擎（纯 Canvas 实现）
// ============================================================================

interface GraphNode {
  id: string;
  name: string;
  role: CharacterRole;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphLink {
  source: string;
  target: string;
  relation: CharacterRelation;
}

function useForceGraph(
  nodes: GraphNode[],
  links: GraphLink[],
  width: number,
  height: number
) {
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const animRef = useRef<number>(0);
  const [tick, setTick] = useState(0);

  // 始终保持 linksRef 为最新值，避免 effect 闭包读到过期的 links
  linksRef.current = links;

  useEffect(() => {
    // 初始化节点位置
    const existing = new Map(nodesRef.current.map(n => [n.id, { x: n.x, y: n.y }]));
    nodesRef.current = nodes.map(n => {
      const pos = existing.get(n.id);
      return {
        ...n,
        x: pos?.x ?? width / 2 + (Math.random() - 0.5) * 200,
        y: pos?.y ?? height / 2 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0,
      };
    });

    let iteration = 0;
    const maxIterations = 300;

    const simulate = () => {
      if (iteration >= maxIterations) return;
      iteration++;

      const ns = nodesRef.current;
      const alpha = Math.max(0.001, 1 - iteration / maxIterations);

      // 排斥力（所有节点对）
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          let dx = ns[j].x - ns[i].x;
          let dy = ns[j].y - ns[i].y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          let force = (300 * 300) / dist;
          let fx = (dx / dist) * force * alpha;
          let fy = (dy / dist) * force * alpha;
          ns[i].vx -= fx;
          ns[i].vy -= fy;
          ns[j].vx += fx;
          ns[j].vy += fy;
        }
      }

      // 吸引力（相连节点）
      const nodeMap = new Map(ns.map(n => [n.id, n]));
      for (const link of linksRef.current) {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (!s || !t) continue;
        let dx = t.x - s.x;
        let dy = t.y - s.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = (dist - 150) * 0.05 * alpha;
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }

      // 中心引力
      for (const n of ns) {
        n.vx += (width / 2 - n.x) * 0.01 * alpha;
        n.vy += (height / 2 - n.y) * 0.01 * alpha;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        // 边界约束
        n.x = Math.max(40, Math.min(width - 40, n.x));
        n.y = Math.max(40, Math.min(height - 40, n.y));
      }

      setTick(t => t + 1);
      animRef.current = requestAnimationFrame(simulate);
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes.length, links.length, width, height]);

  return { nodes: nodesRef.current, tick };
}

// ============================================================================
// Canvas 渲染
// ============================================================================

function drawGraph(
  ctx: CanvasRenderingContext2D,
  nodes: GraphNode[],
  links: GraphLink[],
  hoveredNode: string | null,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 画连线
  for (const link of links) {
    const s = nodeMap.get(link.source);
    const t = nodeMap.get(link.target);
    if (!s || !t) continue;

    const config = RELATION_TYPE_CONFIG[link.relation.relationType];
    const isHovered = hoveredNode === link.source || hoveredNode === link.target;

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.strokeStyle = isHovered ? config.lineColor : config.lineColor + '80';
    ctx.lineWidth = isHovered ? 2.5 : 1.5;
    ctx.stroke();

    // 关系标签
    const mx = (s.x + t.x) / 2;
    const my = (s.y + t.y) / 2;
    const label = link.relation.label || config.label;

    ctx.font = '11px -apple-system, sans-serif';
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(mx - tw / 2 - 4, my - 8, tw + 8, 16);
    ctx.fillStyle = isHovered ? config.lineColor : '#64748b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);

    // 单向箭头
    if (!link.relation.isBidirectional) {
      const angle = Math.atan2(t.y - s.y, t.x - s.x);
      const arrowLen = 10;
      const ax = t.x - Math.cos(angle) * 28;
      const ay = t.y - Math.sin(angle) * 28;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - Math.cos(angle - 0.4) * arrowLen, ay - Math.sin(angle - 0.4) * arrowLen);
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - Math.cos(angle + 0.4) * arrowLen, ay - Math.sin(angle + 0.4) * arrowLen);
      ctx.strokeStyle = config.lineColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // 画节点
  for (const node of nodes) {
    const isHovered = hoveredNode === node.id;
    const color = ROLE_COLORS[node.role];
    const radius = isHovered ? 26 : 22;

    // 光晕
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = color + '20';
      ctx.fill();
    }

    // 圆形
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(node.x - 4, node.y - 4, 2, node.x, node.y, radius);
    grad.addColorStop(0, color + 'dd');
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = isHovered ? 3 : 1.5;
    ctx.stroke();

    // 文字
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${isHovered ? 15 : 13}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.name ? node.name[0] : '?', node.x, node.y);

    // 名称
    if (node.name) {
      ctx.fillStyle = isHovered ? '#1e293b' : '#475569';
      ctx.font = `${isHovered ? 'bold 12px' : '11px'} -apple-system, sans-serif`;
      ctx.fillText(node.name, node.x, node.y + radius + 14);
    }
  }
}

// ============================================================================
// 关系编辑对话框
// ============================================================================

interface RelationFormProps {
  relation?: CharacterRelation;
  characters: { id: string; name: string }[];
  onSave: (relation: CharacterRelation) => void;
  onClose: () => void;
}

function RelationForm({ relation, characters, onSave, onClose }: RelationFormProps) {
  const [fromId, setFromId] = useState(relation?.fromCharacterId || characters[0]?.id || '');
  const [toId, setToId] = useState(relation?.toCharacterId || characters[1]?.id || '');
  const [relType, setRelType] = useState<RelationType>(relation?.relationType || 'friend');
  const [label, setLabel] = useState(relation?.label || '');
  const [desc, setDesc] = useState(relation?.description || '');
  const [bidirectional, setBidirectional] = useState(relation?.isBidirectional ?? true);

  const handleSave = () => {
    if (!fromId || !toId || fromId === toId) return;
    onSave({
      id: relation?.id || generateId('rel'),
      fromCharacterId: fromId,
      toCharacterId: toId,
      relationType: relType,
      label: label || RELATION_TYPE_CONFIG[relType].label,
      description: desc,
      isBidirectional: bidirectional,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">角色 A</label>
          <select
            value={fromId}
            onChange={e => setFromId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
          >
            {characters.map(c => (
              <option key={c.id} value={c.id}>{c.name || '未命名'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">角色 B</label>
          <select
            value={toId}
            onChange={e => setToId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
          >
            {characters.map(c => (
              <option key={c.id} value={c.id}>{c.name || '未命名'}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">关系类型</label>
        <div className="flex flex-wrap gap-2">
          {RELATION_TYPES.map(rt => {
            const cfg = RELATION_TYPE_CONFIG[rt];
            return (
              <button
                key={rt}
                onClick={() => {
                  setRelType(rt);
                  if (!label) setLabel('');
                }}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                  ${relType === rt
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }
                `}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">关系标签</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder={RELATION_TYPE_CONFIG[relType].label}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">详细描述</label>
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="描述这段关系的细节..."
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="bidirectional"
          checked={bidirectional}
          onChange={e => setBidirectional(e.target.checked)}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="bidirectional" className="text-sm text-slate-600">双向关系</label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
        <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!fromId || !toId || fromId === toId}>
          保存
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// 列表视图
// ============================================================================

function RelationListView({
  relations,
  characters,
  onEdit,
  onDelete,
}: {
  relations: CharacterRelation[];
  characters: { id: string; name: string; role: CharacterRole }[];
  onEdit: (r: CharacterRelation) => void;
  onDelete: (id: string) => void;
}) {
  const charMap = new Map(characters.map(c => [c.id, c]));

  if (relations.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Link2 size={40} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">暂无角色关系</p>
        <p className="text-xs mt-1">点击「添加关系」创建角色之间的联系</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {relations.map(rel => {
        const from = charMap.get(rel.fromCharacterId);
        const to = charMap.get(rel.toCharacterId);
        const cfg = RELATION_TYPE_CONFIG[rel.relationType];

        return (
          <div key={rel.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors group">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-800">{from?.name || '??'}</span>
              <span className="text-slate-400">
                {rel.isBidirectional ? '↔' : '→'}
              </span>
              <span className="text-sm font-medium text-slate-800">{to?.name || '??'}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border bg-slate-50 ${cfg.color}`}>
                {rel.label || cfg.label}
              </span>
            </div>
            {rel.description && (
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{rel.description}</p>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(rel)} className="p-1 text-slate-400 hover:text-blue-600 rounded">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              </button>
              <button onClick={() => onDelete(rel.id)} className="p-1 text-slate-400 hover:text-red-600 rounded">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

export default function RelationGraph({ onNodeClick }: { onNodeClick?: (characterId: string) => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const characters = state.project.characters;
  const relations = state.project.relations;

  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [showForm, setShowForm] = useState(false);
  const [editingRelation, setEditingRelation] = useState<CharacterRelation | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // 监听容器尺寸
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 构建图数据
  const graphNodes: GraphNode[] = useMemo(
    () => characters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    })),
    [characters]
  );

  const graphLinks: GraphLink[] = useMemo(
    () => relations.map(r => ({
      source: r.fromCharacterId,
      target: r.toCharacterId,
      relation: r,
    })),
    [relations]
  );

  // 力导向模拟
  const { nodes: simNodes } = useForceGraph(graphNodes, graphLinks, canvasSize.width, canvasSize.height);

  // Canvas 渲染
  useEffect(() => {
    if (viewMode !== 'graph') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    drawGraph(ctx, simNodes, graphLinks, hoveredNode, canvasSize.width, canvasSize.height);
  }, [viewMode, simNodes, graphLinks, hoveredNode, canvasSize]);

  // Canvas 鼠标交互
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found: string | null = null;
    for (const node of simNodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < 625) { // 25^2
        found = node.id;
        break;
      }
    }
    setHoveredNode(found);
    canvas.style.cursor = found ? 'pointer' : 'default';
  }, [simNodes]);

  // Canvas 点击交互
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const node of simNodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (dx * dx + dy * dy < 625) {
        onNodeClick?.(node.id);
        break;
      }
    }
  }, [simNodes, onNodeClick]);

  // 操作
  const handleSaveRelation = useCallback((rel: CharacterRelation) => {
    if (editingRelation) {
      const { id, ...updates } = rel;
      dispatch(projectActions.updateRelation(id, updates));
    } else {
      dispatch(projectActions.addRelation(rel));
    }
    setShowForm(false);
    setEditingRelation(undefined);
  }, [editingRelation, dispatch]);

  const handleDeleteRelation = useCallback(() => {
    if (deleteConfirm) {
      dispatch(projectActions.deleteRelation(deleteConfirm));
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, dispatch]);

  const charList = characters.map(c => ({ id: c.id, name: c.name, role: c.role }));

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">角色关系图谱</h3>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {relations.length} 条关系
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'graph' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              <Eye size={12} className="inline mr-1" />
              图谱
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              <List size={12} className="inline mr-1" />
              列表
            </button>
          </div>

          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setEditingRelation(undefined); setShowForm(true); }}>
            添加关系
          </Button>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-hidden" ref={containerRef}>
        {viewMode === 'graph' ? (
          characters.length < 2 ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <Link2 size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">至少需要 2 个角色才能显示关系图</p>
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              style={{ width: canvasSize.width, height: canvasSize.height }}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={handleCanvasClick}
            />
          )
        ) : (
          <div className="h-full overflow-y-auto">
            <RelationListView
              relations={relations}
              characters={charList}
              onEdit={(r) => { setEditingRelation(r); setShowForm(true); }}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          </div>
        )}
      </div>

      {/* 图例 */}
      {viewMode === 'graph' && relations.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-200 bg-slate-50 overflow-x-auto">
          <span className="text-[10px] text-slate-500 shrink-0">图例:</span>
          {Object.entries(RELATION_TYPE_CONFIG).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1 text-[10px] text-slate-600 shrink-0">
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: cfg.lineColor }} />
              {cfg.label}
            </span>
          ))}
        </div>
      )}

      {/* 添加/编辑关系对话框 */}
      <Dialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingRelation(undefined); }}
        title={editingRelation ? '编辑关系' : '添加关系'}
        size="md"
      >
        {characters.length < 2 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">至少需要 2 个角色才能建立关系</p>
          </div>
        ) : (
          <RelationForm
            relation={editingRelation}
            characters={charList}
            onSave={handleSaveRelation}
            onClose={() => { setShowForm(false); setEditingRelation(undefined); }}
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
            <Button variant="danger" size="sm" onClick={handleDeleteRelation}>删除</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">确定要删除这条关系吗？此操作不可撤销。</p>
      </Dialog>
    </div>
  );
}
