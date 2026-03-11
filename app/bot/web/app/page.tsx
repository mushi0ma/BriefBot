"use client";

import { useEffect, useState, useCallback } from "react";
import { useTelegram } from "@/src/shared/lib/telegram";
import { type Brief } from "@/src/entities/brief";
import { type UserSettings } from "@/src/entities/user";
import { TabIcon, type Tab } from "@/src/shared/ui";
import { createApiFetch } from "@/src/shared/api";
import { AlertCircle, RefreshCw } from "lucide-react";
import { HistoryTab } from "@/src/widgets/history-tab";
import { SettingsTab } from "@/src/widgets/settings-tab";
import { TemplatesTab } from "@/src/widgets/templates-tab";

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
    <main className="min-h-screen pb-24 max-w-lg mx-auto">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-[20px] font-semibold">Личный кабинет</h1>
      </div>

      {saveError && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-xl bg-red-500/10 text-red-500 text-[13px] flex items-center gap-2 animate-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {loading ? (
        <div className="px-4 space-y-3 animate-in">
          {[1, 2, 3].map(i => (
            <div key={i} className="tg-section p-4 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="px-4 py-12 flex flex-col items-center gap-4 text-center animate-in">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-[15px] font-medium">Ошибка загрузки</p>
            <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] mt-1">{error}</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--tg-theme-button-color,#3e88f7)] text-white text-[14px] font-medium transition-opacity hover:opacity-90"
          >
            <RefreshCw className="w-4 h-4" />
            Повторить
          </button>
        </div>
      ) : (
        <div className="animate-in">
          {tab === "history" && <HistoryTab briefs={briefs} />}
          {tab === "settings" && <SettingsTab settings={settings} onUpdate={updateSetting} saving={saving} />}
          {tab === "templates" && <TemplatesTab selected={settings.default_template} onSelect={(slug) => updateSetting("default_template", slug)} saving={saving} />}
        </div>
      )}

      <nav className="tg-tab-bar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`tg-tab ${tab === t.key ? "active" : ""}`}
          >
            <span className="tg-tab-icon">
              <TabIcon tab={t.key} active={tab === t.key} />
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
