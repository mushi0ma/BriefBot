"use client";
import React, { useState } from 'react';

export function AccessDeniedState() {
  const [copied, setCopied] = useState(false);
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'BriefKzBot';
  const httpsUrl = `https://t.me/${botUsername}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="bg-tg-bg font-sans text-tg-text min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full flex flex-col items-center text-center">
        {/* Icon Container */}
        <div className="relative mb-10">
          {/* Telegram Style Logo Representation */}
          <div className="w-32 h-32 bg-tg-button rounded-full flex items-center justify-center shadow-lg">
            <span
              className="material-symbols-outlined text-white text-7xl select-none"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              send
            </span>
          </div>

          {/* Lock Badge */}
          <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-tg-secondary-bg rounded-full border-4 border-tg-bg flex items-center justify-center">
            <span className="material-symbols-outlined text-tg-text text-2xl">
              lock
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4 tracking-tight">
          Только в Telegram
        </h1>

        {/* Description */}
        <p className="text-tg-hint text-base leading-relaxed mb-10 px-4">
          Это приложение разработано для работы исключительно внутри Telegram. Пожалуйста, откройте бота в вашем приложении Telegram, чтобы продолжить.
        </p>

        {/* Actions */}
        <div className="w-full space-y-4">
          <a
            href={httpsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-tg-button hover:opacity-90 text-tg-button-text font-bold py-4 rounded-xl transition-opacity flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">
              rocket_launch
            </span>
            Открыть Telegram
          </a>

          <button
            onClick={handleCopy}
            className="w-full bg-tg-button/10 hover:bg-tg-button/20 text-tg-button font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Скопировано!' : 'Скопировать ссылку'}
          </button>
        </div>

        {/* Support/Info Footer */}
        <div className="mt-12 flex items-center gap-2 text-tg-hint text-sm">
          <span className="material-symbols-outlined text-lg">info</span>
          <span>Требуется Telegram Desktop или Mobile</span>
        </div>
      </div>
    </div>
  );
}
