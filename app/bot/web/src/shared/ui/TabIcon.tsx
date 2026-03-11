"use client";
import React from 'react';
import { FileText, Settings, LayoutGrid } from 'lucide-react';

export type Tab = "history" | "settings" | "templates";

interface TabIconProps {
  tab: Tab;
  active: boolean;
}

const TAB_ICONS = {
  history: FileText,
  settings: Settings,
  templates: LayoutGrid,
} as const;

export function TabIcon({ tab, active }: TabIconProps) {
  const Icon = TAB_ICONS[tab];
  return (
    <Icon
      className="w-6 h-6 transition-colors duration-200"
      strokeWidth={active ? 2 : 1.5}
      color={active ? "var(--tg-theme-button-color, #3e88f7)" : "currentColor"}
    />
  );
}
