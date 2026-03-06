"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";

interface TelegramWebApp {
    ready: () => void;
    expand: () => void;
    close: () => void;
    initData: string;
    initDataUnsafe: {
        user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
        };
        auth_date: number;
        hash: string;
    };
    themeParams: Record<string, string>;
    colorScheme: "light" | "dark";
    MainButton: {
        text: string;
        show: () => void;
        hide: () => void;
        onClick: (cb: () => void) => void;
    };
}

declare global {
    interface Window {
        Telegram?: {
            WebApp: TelegramWebApp;
        };
    }
}

interface TelegramContextValue {
    webApp: TelegramWebApp | null;
    initData: string;
    isReady: boolean;
}

const TelegramContext = createContext<TelegramContextValue>({
    webApp: null,
    initData: "",
    isReady: false,
});

export function useTelegram() {
    return useContext(TelegramContext);
}

export default function TelegramProvider({ children }: { children: ReactNode }) {
    const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
            setWebApp(tg);

            // Apply Telegram theme CSS variables
            const params = tg.themeParams;
            if (params) {
                const root = document.documentElement;
                Object.entries(params).forEach(([key, value]) => {
                    root.style.setProperty(`--tg-theme-${key.replace(/_/g, "-")}`, value);
                });
            }
        }
        setIsReady(true);
    }, []);

    return (
        <TelegramContext.Provider
            value={{
                webApp,
                initData: webApp?.initData ?? "",
                isReady,
            }}
        >
            {children}
        </TelegramContext.Provider>
    );
}
