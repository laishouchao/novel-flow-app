import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const sizeClasses: Record<string, { bar: string; track: string }> = {
  sm: { bar: 'h-1.5', track: 'h-1.5' },
  md: { bar: 'h-2.5', track: 'h-2.5' },
  lg: { bar: 'h-4', track: 'h-4' },
};

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'bg-blue-600',
  showLabel = false,
  label,
  className = '',
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const sizeConfig = sizeClasses[size];

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs font-medium text-slate-600">{label}</span>
          )}
          {showLabel && (
            <span className="text-xs font-medium text-slate-500">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full bg-slate-100 rounded-full overflow-hidden ${sizeConfig.track}`}
      >
        <div
          className={`${sizeConfig.bar} rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/** 分段进度条（用于写作流程步骤指示） */
export const StepProgressBar: React.FC<{
  steps: string[];
  currentStep: number;
  className?: string;
}> = ({ steps, currentStep, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                transition-all duration-300
                ${
                  index < currentStep
                    ? 'bg-blue-600 text-white'
                    : index === currentStep
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-1'
                    : 'bg-slate-100 text-slate-400'
                }
              `}
            >
              {index < currentStep ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-[10px] whitespace-nowrap ${
                index <= currentStep ? 'text-slate-700 font-medium' : 'text-slate-400'
              }`}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`
                flex-1 h-0.5 rounded-full mt-[-16px]
                ${index < currentStep ? 'bg-blue-600' : 'bg-slate-200'}
              `}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ProgressBar;
