"use client";

import { useEffect, useState, useCallback } from "react";
import { useTelegram } from "./TelegramProvider";

/* ── Types ────────────────────────────────────────────────────── */
interface Brief {
  id: string;
  template_slug: string;
  processing_state: string;
  brief_data: Record<string, string> | null;
  pdf_url: string | null;
  processing_time_ms: number | null;
  created_at: string;
}

interface UserSettings {
  brand_color: string | null;
  logo_url: string | null;
  default_template: string | null;
}

type Tab = "history" | "settings" | "templates";

const PRESET_COLORS = [
  "#E74C3C", "#2980B9", "#27AE60", "#F39C12",
  "#8E44AD", "#2C3E50", "#E67E22", "#1ABC9C",
];

const TEMPLATES = [
  { slug: "default", name: "🎯 Универсальный", desc: "Подходит для любых проектов" },
  { slug: "design", name: "🎨 Дизайн", desc: "Визуальные проекты и брендинг" },
  { slug: "development", name: "💻 Разработка", desc: "Сайты и приложения" },
  { slug: "marketing", name: "📊 Маркетинг", desc: "Продвижение и реклама" },
];

/* ── Helper ────────────────────────────────────────────────────── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function stateLabel(state: string): { text: string; color: string } {
  switch (state) {
    case "done": return { text: "✅ Готов", color: "text-green-400" };
    case "failed": return { text: "❌ Ошибка", color: "text-red-400" };
    default: return { text: "⏳ Обработка", color: "text-yellow-400" };
  }
}

/* ── Skeleton ──────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-3 w-1/3" />
    </div>
  );
}

/* ── Brief Card ────────────────────────────────────────────────── */
function BriefCard({ brief }: { brief: Brief }) {
  const status = stateLabel(brief.processing_state);
  const summary = brief.brief_data?.summary;

  return (
    <div className="glass-card p-4 animate-fade-in-up space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs uppercase tracking-wide text-tg-hint">
            {brief.template_slug}
          </span>
          <p className={`text-sm font-medium ${status.color}`}>{status.text}</p>
        </div>
        <span className="text-xs text-tg-hint">{formatDate(brief.created_at)}</span>
      </div>

      {summary && (
        <p className="text-sm text-tg-text/80 line-clamp-2">{summary}</p>
      )}

      <div className="flex gap-2 pt-1">
        {brief.pdf_url && brief.pdf_url.startsWith("http") && (
          <a
            href={brief.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-full bg-tg-button text-tg-button-text font-medium"
          >
            📄 Скачать PDF
          </a>
        )}
        {brief.processing_time_ms && (
          <span className="text-xs text-tg-hint self-center">
            {(brief.processing_time_ms / 1000).toFixed(1)}с
          </span>
        )}
      </div>
    </div>
  );
}

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
  const [logoInput, setLogoInput] = useState("");

  const apiFetch = useCallback(
    async (path: string, opts: RequestInit = {}) => {
      return fetch(path, {
        ...opts,
        headers: {
          Authorization: initData,
          "Content-Type": "application/json",
          ...opts.headers,
        },
      });
    },
    [initData]
  );

  // Load data
  useEffect(() => {
    if (!isReady) return;
    setLoading(true);

    Promise.all([
      apiFetch("/api/history").then((r) => r.json()),
      apiFetch("/api/settings").then((r) => r.json()),
    ])
      .then(([historyData, settingsData]) => {
        setBriefs(historyData.briefs ?? []);
        setSettings({
          brand_color: settingsData.brand_color ?? null,
          logo_url: settingsData.logo_url ?? null,
          default_template: settingsData.default_template ?? null,
        });
        setLogoInput(settingsData.logo_url ?? "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isReady, apiFetch]);

  const updateSetting = async (field: string, value: string) => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, [field]: value }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "history", label: "📋 История" },
    { key: "settings", label: "⚙️ Настройки" },
    { key: "templates", label: "📁 Шаблоны" },
  ];

  return (
    <main className="min-h-screen p-4 pb-20 max-w-lg mx-auto">
      {/* Header */}
      <h1 className="text-xl font-bold text-center mb-4 animate-fade-in-up">
        💼 Личный кабинет
      </h1>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm rounded-lg font-medium transition-all ${tab === t.key
                ? "bg-tg-button text-tg-button-text shadow-lg"
                : "text-tg-hint hover:text-tg-text"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          {/* ── History Tab ──────────────────────────────────────── */}
          {tab === "history" && (
            <div className="space-y-3">
              {briefs.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-tg-hint text-sm">
                    Пока нет брифов. Отправьте аудио или текст боту!
                  </p>
                </div>
              ) : (
                briefs.map((b) => <BriefCard key={b.id} brief={b} />)
              )}
            </div>
          )}

          {/* ── Settings Tab ─────────────────────────────────────── */}
          {tab === "settings" && (
            <div className="space-y-4">
              {/* Color Picker */}
              <div className="glass-card p-4 animate-fade-in-up">
                <h2 className="text-sm font-semibold mb-3">🎨 Цвет акцента PDF</h2>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateSetting("brand_color", c)}
                      disabled={saving}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${settings.brand_color === c
                          ? "border-white scale-110 shadow-lg"
                          : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                {settings.brand_color && (
                  <p className="text-xs text-tg-hint mt-2">
                    Выбран: <span className="font-mono">{settings.brand_color}</span>
                  </p>
                )}
              </div>

              {/* Logo URL */}
              <div className="glass-card p-4 animate-fade-in-up">
                <h2 className="text-sm font-semibold mb-3">🖼 Логотип</h2>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={logoInput}
                    onChange={(e) => setLogoInput(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-tg-text placeholder:text-tg-hint/50 outline-none focus:border-tg-button"
                  />
                  <button
                    onClick={() => updateSetting("logo_url", logoInput)}
                    disabled={saving || !logoInput}
                    className="px-4 py-2 rounded-lg bg-tg-button text-tg-button-text text-sm font-medium disabled:opacity-40"
                  >
                    {saving ? "..." : "Сохранить"}
                  </button>
                </div>
                {settings.logo_url && (
                  <p className="text-xs text-tg-hint mt-2 truncate">
                    Текущий: {settings.logo_url}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Templates Tab ────────────────────────────────────── */}
          {tab === "templates" && (
            <div className="space-y-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => updateSetting("default_template", t.slug)}
                  disabled={saving}
                  className={`glass-card p-4 w-full text-left animate-fade-in-up transition-all ${settings.default_template === t.slug
                      ? "border-tg-button border-2"
                      : "hover:bg-white/10"
                    }`}
                >
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-tg-hint mt-1">{t.desc}</p>
                  {settings.default_template === t.slug && (
                    <span className="text-xs text-tg-button mt-1 inline-block">
                      ✓ Выбран по умолчанию
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
