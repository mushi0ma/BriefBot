"use client";

import { useEffect, useState, useCallback } from "react";
import { useTelegram } from "@/src/shared/lib/telegram";
import { type Brief } from "@/src/entities/brief";
import { type UserSettings } from "@/src/entities/user";
import { type Tab } from "@/src/shared/ui";
import { createApiFetch } from "@/src/shared/api";
import { AlertCircle, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { HistoryTab } from "@/src/widgets/history-tab";
import { SettingsTab } from "@/src/widgets/settings-tab";
import { TemplatesTab } from "@/src/widgets/templates-tab";
import { ProfileHeader } from "@/src/widgets/profile-header";
import { TopAppBar, BottomNavBar, type NavItem, LoadingState, AccessDeniedState } from "@/src/shared/ui";

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/* ── Dashboard ────────────────────────────────────────────────── */
export default function Dashboard() {
  const { initData, isReady, webApp } = useTelegram();
  const [tab, setTab] = useState<Tab>("history");
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    brand_color: null, logo_url: null, default_template: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const apiFetch = useCallback(
    (path: string, opts?: RequestInit) => createApiFetch(initData)(path, opts),
    [initData]
  );

  const loadData = useCallback(() => {
    if (!isReady || !initData) return;
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch("/api/history").then((r) => r.json()),
      apiFetch("/api/settings").then((r) => r.json()),
    ])
      .then(([h, s]) => {
        setBriefs(h.briefs ?? []);
        setSettings({ brand_color: s.brand_color ?? null, logo_url: s.logo_url ?? null, default_template: s.default_template ?? null });
      })
      .catch((e) => {
        console.error(e);
        setError(e instanceof Error ? e.message : "Не удалось загрузить данные");
      })
      .finally(() => setLoading(false));
  }, [isReady, initData, apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSetting = async (field: string, value: string | boolean) => {
    setSaving(true);
    setSaveError(null);
    try {
      await apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify({ [field]: value }) });
      setSettings((p) => ({ ...p, [field]: value }));
    } catch (e) {
      console.error(e);
      setSaveError(e instanceof Error ? e.message : "Не удалось сохранить");
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const navItems: NavItem[] = [
    { id: "history", label: "История", icon: "history" },
    { id: "settings", label: "Настройки", icon: "settings" },
    { id: "templates", label: "Шаблоны", icon: "dashboard" },
  ];

  if (!isReady) return <LoadingState />;

  // Require telegram initData in production environments
  // Since process.env might not easily distinguish local dev from deployed, we check if Telegram WebApp is present
  if (isReady && !webApp && process.env.NEXT_PUBLIC_ALLOW_OUTSIDE !== "true") {
    return <AccessDeniedState />;
  }

  // During local development, if we don't have mock data and no webApp, still show denied (unless we inject mock data)
  // For safety, let's just check initData
  if (!initData && process.env.NEXT_PUBLIC_ALLOW_OUTSIDE !== "true") {
    return <AccessDeniedState />;
  }


  return (
    <main className="min-h-screen pb-24 max-w-lg mx-auto bg-tg-bg text-tg-text font-sans">
      <TopAppBar title="Личный кабинет" />

      <div className="pt-5">
        {/* Profile Header */}
        <ProfileHeader briefsCount={briefs.length} />

        {saveError && (
          <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-red-500/10 text-red-500 text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {loading ? (
          <div className="animate-in pt-12">
            <LoadingState />
          </div>
        ) : error ? (
          <div className="px-4 py-12 flex flex-col items-center gap-4 text-center animate-in">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center border border-red-200">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-tg-text">Ошибка загрузки</p>
              <p className="text-xs text-tg-hint mt-1">{error}</p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-tg-button text-tg-button-text text-sm font-medium shadow-sm transition-opacity hover:opacity-90"
            >
              <RefreshCw className="w-4 h-4" />
              Повторить
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {tab === "history" && <HistoryTab briefs={briefs} />}
              {tab === "settings" && <SettingsTab settings={settings} onUpdate={updateSetting} saving={saving} />}
              {tab === "templates" && <TemplatesTab selected={settings.default_template} onSelect={(slug) => updateSetting("default_template", slug)} saving={saving} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <BottomNavBar
        items={navItems}
        activeId={tab}
        onChange={(id) => setTab(id as Tab)}
      />
    </main>
  );
}
