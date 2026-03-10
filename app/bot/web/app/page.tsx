"use client";

import { useEffect, useState, useCallback } from "react";
import { useTelegram } from "@/src/shared/lib/telegram";
import { type Brief } from "@/src/entities/brief";
import { type UserSettings } from "@/src/entities/user";
import { TabIcon, type Tab } from "@/src/shared/ui";
import { createApiFetch } from "@/src/shared/api";
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

  const apiFetch = useCallback(
    (path: string, opts?: RequestInit) => createApiFetch(initData)(path, opts),
    [initData]
  );

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    Promise.all([
      apiFetch("/api/history").then((r) => r.json()),
      apiFetch("/api/settings").then((r) => r.json()),
    ])
      .then(([h, s]) => {
        setBriefs(h.briefs ?? []);
        setSettings({ brand_color: s.brand_color ?? null, logo_url: s.logo_url ?? null, default_template: s.default_template ?? null });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isReady, apiFetch]);

  const updateSetting = async (field: string, value: string) => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify({ [field]: value }) });
      if (res.ok) setSettings((p) => ({ ...p, [field]: value }));
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
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

      {loading ? (
        <div className="px-4 space-y-3 animate-in">
          {[1, 2, 3].map(i => (
            <div key={i} className="tg-section p-4 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
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
