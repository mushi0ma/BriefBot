import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  large?: boolean;
  icon?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  trend,
  trendUp,
  className = "",
  large = false,
  icon
}) => {
  return (
    <div className={`flex flex-col gap-1 rounded-xl p-4 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {icon && (
          <span className="material-symbols-outlined text-sm">{icon}</span>
        )}
        <p className={`font-medium ${large ? 'text-sm' : 'text-xs uppercase tracking-wider'}`}>
          {label}
        </p>
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <p className={`font-bold text-slate-900 dark:text-white ${large ? 'text-3xl leading-tight' : 'text-xl'}`}>
          {value}
        </p>

        {trend && (
          <p className={`text-xs font-bold leading-normal flex items-center gap-1 ${
            trendUp === true ? 'text-emerald-500' :
            trendUp === false ? 'text-red-500' : 'text-slate-400'
          }`}>
            {trendUp === true && <span className="material-symbols-outlined text-[14px]">trending_up</span>}
            {trendUp === false && <span className="material-symbols-outlined text-[14px]">trending_down</span>}
            {trend}
          </p>
        )}
      </div>
    </div>
  );
};
