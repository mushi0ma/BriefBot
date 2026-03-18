"use client";
import React from 'react';
import { Activity, Users, Terminal, HeartPulse, FileText, Settings, LayoutGrid } from 'lucide-react';

export type Tab = "history" | "settings" | "templates" | "monitoring" | "group" | "terminal" | "ecg";

interface TabIconProps {
  name: string;
  className?: string;
  active?: boolean;
}

const TAB_ICONS: Record<string, React.ElementType> = {
  history: FileText,
  settings: Settings,
  templates: LayoutGrid,
  monitoring: Activity,
  group: Users,
  terminal: Terminal,
  ecg: HeartPulse,
};

export function TabIcon({ name, className, active }: TabIconProps) {
  const Icon = TAB_ICONS[name] || FileText;
  return (
    <Icon
      className={className || "w-6 h-6 transition-colors duration-200"}
      strokeWidth={active ? 2 : 1.5}
      color={active ? "var(--tg-theme-button-color, #3e88f7)" : "currentColor"}
    />
  );
}
