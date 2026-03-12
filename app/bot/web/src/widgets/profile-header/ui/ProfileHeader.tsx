import React from "react";
import { useTelegram } from "@/src/shared/lib/telegram";
import { Sparkles, FileText } from "lucide-react";

interface ProfileHeaderProps {
  briefsCount: number;
}

export function ProfileHeader({ briefsCount }: ProfileHeaderProps) {
  const { webApp } = useTelegram();
  const user = webApp?.initDataUnsafe?.user;

  const firstName = user?.first_name ?? "User";
  const lastName = user?.last_name ?? "";
  const username = user?.username;
  const initials = `${firstName.charAt(0)}${lastName.charAt(0) || ""}`.toUpperCase();

  return (
    <div className="mx-4 mb-5 p-4 rounded-2xl bg-[var(--tg-theme-bg-color,#1c1c1e)] border border-[var(--border-color)]">
      <div className="flex items-center gap-3.5">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-[var(--tg-theme-button-color,#3e88f7)]/15 flex items-center justify-center shrink-0">
          <span className="text-[16px] font-semibold text-[var(--tg-theme-button-color,#3e88f7)]">
            {initials}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-[var(--tg-theme-text-color,#fff)] truncate">
            {firstName} {lastName}
          </p>
          {username && (
            <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] truncate">
              @{username}
            </p>
          )}
        </div>

        {/* Plan badge */}
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--tg-theme-button-color,#3e88f7)]/10 shrink-0">
          <Sparkles className="w-3 h-3 text-[var(--tg-theme-button-color,#3e88f7)]" />
          <span className="text-[11px] font-semibold text-[var(--tg-theme-button-color,#3e88f7)]">
            Free
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3.5 pt-3 border-t border-[var(--border-color)] flex items-center gap-2">
        <FileText className="w-3.5 h-3.5 text-[var(--tg-theme-hint-color,#98989e)]" />
        <span className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">
          Создано брифов:
        </span>
        <span className="text-[13px] font-semibold text-[var(--tg-theme-text-color,#fff)]">
          {briefsCount}
        </span>
      </div>
    </div>
  );
}
