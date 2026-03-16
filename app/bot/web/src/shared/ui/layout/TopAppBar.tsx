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
    <header className="sticky top-0 z-10 bg-tg-bg border-b border-[var(--border-color)]">
      <div className="flex items-center p-4 justify-between">
        <div className="flex size-10 shrink-0 items-center justify-start">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center justify-center p-1 text-tg-button hover:bg-tg-secondary-bg rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center text-tg-text">
          {title}
        </h1>

        <div className="flex size-10 items-center justify-end">
          {actionIcon && onAction && (
            <button
              onClick={onAction}
              className="flex items-center justify-center text-tg-hint hover:text-tg-button transition-colors"
            >
              {actionIcon}
            </button>
          )}
        </div>
      </div>

      {tabs && tabs.length > 0 && (
        <nav className="flex px-4 overflow-x-auto no-scrollbar border-b border-[var(--border-color)]">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={`flex-none px-4 py-3 text-sm font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                  isActive
                    ? 'text-tg-button border-tg-button'
                    : 'text-tg-hint border-transparent hover:text-tg-text'
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
