import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  outline: 'bg-transparent text-slate-600 border-slate-300',
};

const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className = '',
}) => {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        border whitespace-nowrap
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

/** 项目状态专用 Badge */
export const ProjectStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusMap: Record<string, { label: string; variant: BadgeVariant }> = {
    idea: { label: '灵感', variant: 'info' },
    planned: { label: '已规划', variant: 'default' },
    drafting: { label: '写作中', variant: 'warning' },
    reviewing: { label: '审查中', variant: 'info' },
    done: { label: '已完成', variant: 'success' },
    blocked: { label: '受阻', variant: 'danger' },
  };

  const config = statusMap[status] || { label: status, variant: 'default' as BadgeVariant };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

/** 结构标记专用 Badge */
export const StructureBadge: React.FC<{ type: string }> = ({ type }) => {
  const typeMap: Record<string, { label: string; className: string }> = {
    setup: { label: '铺垫', className: 'bg-blue-50 text-blue-700 border-blue-300' },
    build: { label: '递进', className: 'bg-green-50 text-green-700 border-green-300' },
    climax: { label: '高潮', className: 'bg-red-50 text-red-700 border-red-300' },
    fallout: { label: '余波', className: 'bg-slate-50 text-slate-600 border-slate-300' },
  };

  const config = typeMap[type] || { label: type, className: 'bg-slate-100 text-slate-700 border-slate-200' };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
};

export default Badge;
