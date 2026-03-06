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
  "#3e88f7", "#30d158", "#ff9f0a", "#ff453a",
  "#bf5af2", "#64d2ff", "#ff375f", "#ac8e68",
];

const TEMPLATES = [
  { slug: "default", icon: "🎯", name: "Универсальный", desc: "Подходит для любых проектов" },
  { slug: "design", icon: "🎨", name: "Дизайн", desc: "Визуальные проекты и брендинг" },
  { slug: "development", icon: "💻", name: "Разработка", desc: "Сайты и приложения" },
  { slug: "marketing", icon: "📊", name: "Маркетинг", desc: "Продвижение и реклама" },
];

/* ── Helpers ───────────────────────────────────────────────────── */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric", month: "short",
  }) + ", " + d.toLocaleTimeString("ru-RU", {
    hour: "2-digit", minute: "2-digit",
  });
}

function stateInfo(state: string) {
  switch (state) {
    case "done": return { label: "Готов", color: "bg-[#30d158]/15 text-[#30d158]" };
    case "failed": return { label: "Ошибка", color: "bg-[#ff453a]/15 text-[#ff453a]" };
    default: return { label: "Обработка...", color: "bg-[#ff9f0a]/15 text-[#ff9f0a]" };
  }
}

/* ── Tab Icon ─────────────────────────────────────────────────── */
function TabIcon({ tab, active }: { tab: Tab; active: boolean }) {
  const color = active ? "var(--tg-theme-button-color, #3e88f7)" : "currentColor";
  if (tab === "history") return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="4" y="4" width="16" height="18" rx="2" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="14" y2="13" /><line x1="8" y1="17" x2="12" y2="17" /></svg>;
  if (tab === "settings") return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}

/* ── Brief Row ────────────────────────────────────────────────── */
function BriefRow({ brief, isLast }: { brief: Brief; isLast: boolean }) {
  const status = stateInfo(brief.processing_state);
  const summary = brief.brief_data?.summary;
  const hasPdf = brief.pdf_url && brief.pdf_url.startsWith("http");

  return (
    <div className={`tg-list-item flex-col !items-stretch !gap-0 ${!isLast ? "border-b border-[var(--tg-separator)]" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="tg-list-icon bg-[var(--tg-theme-button-color,#3e88f7)]/10 text-xs">
            📋
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-normal truncate">
              {brief.template_slug.charAt(0).toUpperCase() + brief.template_slug.slice(1)}
            </p>
            <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">
              {formatDate(brief.created_at)}
            </p>
          </div>
        </div>
        <span className={`tg-badge ${status.color}`}>{status.label}</span>
      </div>

      {summary && (
        <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] mt-1.5 ml-[42px] line-clamp-2">
          {summary}
        </p>
      )}

      {hasPdf && (
        <a
          href={brief.pdf_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 mt-2 ml-[42px] text-[13px] font-medium text-[var(--tg-theme-button-color,#3e88f7)]"
        >
          <span>📄</span> Скачать PDF
        </a>
      )}
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
    async (path: string, opts: RequestInit = {}) =>
      fetch(path, {
        ...opts,
        headers: { Authorization: initData, "Content-Type": "application/json", ...opts.headers },
      }),
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
        setLogoInput(s.logo_url ?? "");
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
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-[20px] font-semibold">Личный кабинет</h1>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
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
          {/* ── HISTORY TAB ──────────────────────────────────────── */}
          {tab === "history" && (
            <>
              {briefs.length === 0 ? (
                <div className="px-4">
                  <div className="tg-section p-6 text-center">
                    <p className="text-[40px] mb-2">📭</p>
                    <p className="text-[15px] text-[var(--tg-theme-hint-color,#98989e)]">
                      Пока нет брифов
                    </p>
                    <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] mt-1">
                      Отправьте аудио или текст боту
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="tg-section-header">
                    Последние брифы
                  </p>
                  <div className="mx-4 tg-section">
                    {briefs.map((b, i) => (
                      <BriefRow key={b.id} brief={b} isLast={i === briefs.length - 1} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── SETTINGS TAB ─────────────────────────────────────── */}
          {tab === "settings" && (
            <>
              {/* Color Section */}
              <p className="tg-section-header">Цвет акцента PDF</p>
              <div className="mx-4 tg-section p-4">
                <div className="flex flex-wrap gap-3 justify-center">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateSetting("brand_color", c)}
                      disabled={saving}
                      className="relative w-11 h-11 rounded-full transition-transform"
                      style={{ backgroundColor: c }}
                    >
                      {settings.brand_color === c && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                {settings.brand_color && (
                  <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] text-center mt-3">
                    Выбран: <span className="font-mono">{settings.brand_color}</span>
                  </p>
                )}
              </div>

              {/* Logo Section */}
              <p className="tg-section-header mt-6">Логотип</p>
              <div className="mx-4 tg-section p-4">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={logoInput}
                    onChange={(e) => setLogoInput(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 bg-[var(--tg-theme-secondary-bg-color,#2c2c2e)] rounded-lg px-3 py-2.5 text-[15px] text-[var(--tg-theme-text-color,#fff)] placeholder:text-[var(--tg-theme-hint-color,#98989e)]/40 outline-none border border-[var(--tg-separator)] focus:border-[var(--tg-theme-button-color,#3e88f7)]"
                  />
                  <button
                    onClick={() => updateSetting("logo_url", logoInput)}
                    disabled={saving || !logoInput}
                    className="px-4 py-2.5 rounded-lg bg-[var(--tg-theme-button-color,#3e88f7)] text-[var(--tg-theme-button-text-color,#fff)] text-[15px] font-medium disabled:opacity-30"
                  >
                    {saving ? "..." : "OK"}
                  </button>
                </div>
                {settings.logo_url && (
                  <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)] mt-2 truncate">
                    {settings.logo_url}
                  </p>
                )}
              </div>
              <p className="text-[12px] text-[var(--tg-theme-hint-color,#98989e)] px-8 mt-1.5">
                Логотип будет отображаться в ваших PDF-брифах. Загрузите через бота или укажите URL.
              </p>
            </>
          )}

          {/* ── TEMPLATES TAB ────────────────────────────────────── */}
          {tab === "templates" && (
            <>
              <p className="tg-section-header">Шаблон по умолчанию</p>
              <div className="mx-4 tg-section">
                {TEMPLATES.map((t, i) => {
                  const selected = settings.default_template === t.slug;
                  return (
                    <button
                      key={t.slug}
                      onClick={() => updateSetting("default_template", t.slug)}
                      disabled={saving}
                      className={`tg-list-item w-full text-left ${i > 0 ? "border-t border-[var(--tg-separator)] !ml-0 !pl-4" : ""}`}
                    >
                      <div className="tg-list-icon bg-[var(--tg-theme-button-color,#3e88f7)]/10 text-base">
                        {t.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px]">{t.name}</p>
                        <p className="text-[13px] text-[var(--tg-theme-hint-color,#98989e)]">{t.desc}</p>
                      </div>
                      {selected ? (
                        <span className="text-[var(--tg-theme-button-color,#3e88f7)] text-lg">✓</span>
                      ) : (
                        <span className="tg-chevron">›</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[12px] text-[var(--tg-theme-hint-color,#98989e)] px-8 mt-1.5">
                Выбранный шаблон будет использоваться по умолчанию при генерации новых брифов.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Bottom Tab Bar ──────────────────────────────────────── */}
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
