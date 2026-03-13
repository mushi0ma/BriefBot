"use client";

import React from 'react';
import { AdminUsersWidget } from '@/src/widgets/admin-users/ui/AdminUsersWidget';
import { BottomNavBar } from '@/src/shared/ui/layout';

export default function AdminUsersPage() {
  const navItems = [
    { id: 'users', label: 'Users', icon: 'group' },
    { id: 'roles', label: 'Roles', icon: 'verified_user' },
    { id: 'logs', label: 'Logs', icon: 'clinical_notes' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative font-display shadow-2xl">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md p-4 justify-between border-b border-[#2a3744]/20 dark:border-[#2a3744]">
        <div className="flex items-center gap-3">
          <button className="text-slate-900 dark:text-slate-100 flex items-center justify-center p-1 hover:bg-primary/10 rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight">User Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-primary flex items-center justify-center p-2 hover:bg-primary/10 rounded-full transition-colors">
            <span className="material-symbols-outlined">person_add</span>
          </button>
        </div>
      </header>

      <AdminUsersWidget />

      <BottomNavBar items={navItems} activeId="users" onChange={() => {}} />
    </div>
  );
}
