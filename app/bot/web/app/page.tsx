"use client";

import { useEffect, useState, useCallback } from "react";
import { useTelegram } from "@/src/shared/lib/telegram";
import { type Brief } from "@/src/entities/brief";
import { type UserSettings } from "@/src/entities/user";
import { TabIcon, type Tab, SkeletonSection, SkeletonColorGrid } from "@/src/shared/ui";
import { createApiFetch } from "@/src/shared/api";
import { AlertCircle, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { HistoryTab } from "@/src/widgets/history-tab";
import { SettingsTab } from "@/src/widgets/settings-tab";
import { TemplatesTab } from "@/src/widgets/templates-tab";
import { ProfileHeader } from "@/src/widgets/profile-header";

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/* ── Dashboard ────────────────────────────────────────────────── */
export default function Dashboard() {
  const { initData, isReady } = useTelegram();
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
    if (!isReady) return;
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
  }, [isReady, apiFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSetting = async (field: string, value: string) => {
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "history", label: "История" },
    { key: "settings", label: "Настройки" },
    { key: "templates", label: "Шаблоны" },
  ];

  if (!isReady) return null;

  return (
    <main className="min-h-screen pb-24 max-w-lg mx-auto bg-zinc-50 text-zinc-900 font-sans">
      <div className="px-4 pt-5 pb-3 bg-white border-b border-zinc-200">
        <h1 className="text-lg font-semibold tracking-tight">Личный кабинет</h1>
      </div>

      {/* Profile Header */}
      <ProfileHeader briefsCount={briefs.length} />

      {saveError && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-red-500/10 text-red-500 text-[13px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {loading ? (
        <div className="animate-in">
          {tab === "history" && (
            <>
              <div className="flex items-center gap-2 px-4 mb-3">
                <div className="skeleton h-10 flex-1 rounded-xl" />
                <div className="skeleton h-10 flex-1 rounded-xl" />
              </div>
              <div className="flex items-center gap-2 px-4 mb-1 mt-4">
                <div className="skeleton h-3 w-24" />
              </div>
              <SkeletonSection rows={4} />
            </>
          )}
          {tab === "settings" && (
            <div className="space-y-6">
              <section>
                <div className="flex items-center gap-2 px-4 mb-2">
                  <div className="skeleton h-3 w-28" />
                </div>
                <SkeletonColorGrid />
              </section>
              <section>
                <div className="flex items-center gap-2 px-4 mb-2">
                  <div className="skeleton h-3 w-20" />
                </div>
                <div className="mx-4 tg-section rounded-xl p-4">
                  <div className="skeleton h-10 w-full rounded-lg" />
                </div>
              </section>
            </div>
          )}
          {tab === "templates" && <SkeletonSection rows={4} />}
        </div>
      ) : error ? (
        <div className="px-4 py-12 flex flex-col items-center gap-4 text-center animate-in">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center border border-red-200">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">Ошибка загрузки</p>
            <p className="text-xs text-zinc-500 mt-1">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium shadow-sm transition-opacity hover:opacity-90"
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

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex justify-around px-2 pb-[env(safe-area-inset-bottom,16px)] pt-2 z-50">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-col items-center gap-1 text-[10px] px-4 py-1.5 transition-colors rounded-md ${
              tab === t.key ? "text-zinc-900 font-semibold" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <span className="text-[22px] leading-none mb-0.5">
              <TabIcon tab={t.key} active={tab === t.key} />
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
