import React from 'react';
import { TabIcon } from '../TabIcon';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

interface BottomNavBarProps {
  items: NavItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function BottomNavBar({ items, activeId, onChange }: BottomNavBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tg-bg/90 backdrop-blur-xl border-t border-tg-hint/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-[68px] px-2 max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className="group relative flex flex-col items-center justify-center w-full h-full min-w-[64px] transition-all duration-300 active:scale-95"
              aria-label={item.label}
              aria-selected={isActive}
              role="tab"
            >
              <div className={`relative flex items-center justify-center mb-1 transition-colors duration-300
                ${isActive ? 'text-[var(--tg-theme-button-color,#3e88f7)]' : 'text-tg-hint group-hover:text-tg-text'}`}
              >
                <TabIcon name={item.icon} className="w-6 h-6" />

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[#FF3B30] text-white text-[10px] font-bold px-1.5 min-w-[16px] h-4 rounded-full flex items-center justify-center ring-2 ring-tg-bg shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span className={`text-[11px] font-medium transition-colors duration-300
                ${isActive ? 'text-[var(--tg-theme-button-color,#3e88f7)] font-semibold' : 'text-tg-hint group-hover:text-tg-text'}`}
              >
                {item.label}
              </span>

              {isActive && (
                <div className="absolute -bottom-[2px] w-8 h-[3px] bg-[var(--tg-theme-button-color,#3e88f7)] rounded-t-full shadow-[0_-2px_8px_rgba(62,136,247,0.4)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
