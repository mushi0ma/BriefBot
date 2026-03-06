import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import TelegramProvider from "./TelegramProvider";

export const metadata: Metadata = {
  title: "BriefBot — Личный кабинет",
  description: "Telegram Mini App — User Dashboard for BriefBot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
