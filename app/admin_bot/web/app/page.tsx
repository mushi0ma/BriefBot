"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TopAppBar, BottomNavBar, type NavItem, LoadingState, AdminRestrictedState, AccessDeniedState } from "@/src/shared/ui";
import { DashboardTab } from "@/src/widgets/dashboard-tab";
import { UsersTab } from "@/src/widgets/users-tab";
import { LogsTab } from "@/src/widgets/logs-tab";
import { HealthTab } from "@/src/widgets/health-tab";

type Tab = "dashboard" | "users" | "logs" | "health";

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);

  const verifyAdmin = useCallback(() => {
    const MOCK_ADMIN_IDS = [123];
    // Attempt to read Telegram user ID from various mockable sources
    let userId: number | undefined;

    if (typeof window !== 'undefined') {
      try {
        const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number } }, initData?: string } } }).Telegram?.WebApp;
        if (tg?.initDataUnsafe?.user?.id) {
          userId = tg.initDataUnsafe.user.id;
        } else {
          // Fallback parsing initData string for e2e mocking
          const initDataStr = tg?.initData || sessionStorage.getItem('__telegram_init_data');
          if (initDataStr) {
            const params = new URLSearchParams(initDataStr);
            const userStr = params.get('user');
            if (userStr) {
              const userObj = JSON.parse(decodeURIComponent(userStr));
              userId = userObj.id;
            }
          }
        }
      } catch (e) {
        console.error("Error reading mock telegram user:", e);
      }
    }


    // Check if telegram context was found within the try block
    let isTgContext = false;
    if (typeof window !== 'undefined') {
       const tg = (window as unknown as { Telegram?: { WebApp?: { initData?: string, initDataUnsafe?: { user?: unknown } } } }).Telegram?.WebApp;
       if (tg?.initData || tg?.initDataUnsafe?.user || sessionStorage.getItem('__telegram_init_data')) {
           isTgContext = true;
       }
    }

    if (isTgContext) {
      setIsTelegram(true);
    } else {
      setIsTelegram(false);
    }

    if (userId && MOCK_ADMIN_IDS.includes(userId)) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    verifyAdmin();
  }, [verifyAdmin]);

  const navItems: NavItem[] = [
    { id: "dashboard", label: "Дашборд", icon: "monitoring" },
    { id: "users", label: "Пользователи", icon: "group" },
    { id: "logs", label: "Логи", icon: "terminal" },
    { id: "health", label: "Статус", icon: "ecg", badge: 1 },
  ];

  const getTabTitle = (currentTab: Tab) => {
    switch (currentTab) {
      case "dashboard": return "Аналитика";
      case "users": return "Аналитика пользователей";
      case "logs": return "Системные логи";
      case "health": return "Состояние системы";
      default: return "Админ панель";
    }
  };

  if (loading) return <LoadingState />;


  if (process.env.NEXT_PUBLIC_ALLOW_OUTSIDE !== "true") {
    if (!isTelegram) {
      return <AccessDeniedState />;
    }
    if (!isAuthorized) {
      return <AdminRestrictedState />;
    }
  }


  return (
    <main className="min-h-screen pb-24 max-w-lg mx-auto bg-tg-bg text-tg-text font-sans">
      <TopAppBar title={getTabTitle(tab)} />

      <div className="pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {tab === "dashboard" && <DashboardTab />}
            {tab === "users" && <UsersTab />}
            {tab === "logs" && <LogsTab />}
            {tab === "health" && <HealthTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNavBar
        items={navItems}
        activeId={tab}
        onChange={(id) => setTab(id as Tab)}
      />
    </main>
  );
}
