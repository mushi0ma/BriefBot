import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface BottomNavBarProps {
  items: NavItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ items, activeId, onChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-[var(--border-color)] bg-tg-bg/80 backdrop-blur-md px-2 pb-[env(safe-area-inset-bottom,16px)] pt-2">
      <div className="flex w-full items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 p-2 transition-colors ${
                isActive ? 'text-tg-button' : 'text-tg-hint hover:text-tg-text'
              }`}
            >
              <div className="flex h-8 items-center justify-center">
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
              </div>
              <p className={`text-[10px] uppercase tracking-wider ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </p>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
