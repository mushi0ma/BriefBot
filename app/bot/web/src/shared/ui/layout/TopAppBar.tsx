import React from 'react';

interface TopAppBarProps {
  title: string;
  onBack?: () => void;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  onBack,
  actionIcon,
  onAction,
  tabs,
  activeTab,
  onTabChange
}) => {
  return (
    <header className="sticky top-0 z-10 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center p-4 justify-between">
        <div className="flex size-10 shrink-0 items-center justify-start">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center justify-center p-1 text-primary hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center text-slate-900 dark:text-slate-100">
          {title}
        </h1>

        <div className="flex size-10 items-center justify-end">
          {actionIcon && onAction && (
            <button
              onClick={onAction}
              className="flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
            >
              {actionIcon}
            </button>
          )}
        </div>
      </div>

      {tabs && tabs.length > 0 && (
        <nav className="flex px-4 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`flex-none px-4 py-3 text-sm font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                  isActive
                    ? 'text-primary border-primary'
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
};
