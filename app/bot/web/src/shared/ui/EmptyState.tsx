"use client";
import React from 'react';
import { motion } from 'framer-motion';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Container for the illustration with a soft animated pulse background */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 bg-[var(--tg-theme-button-color,#3e88f7)]/5 rounded-full blur-2xl transform scale-150 animate-pulse" />
        
        {/* Minimalist Empty Folder SVG (unDraw style abstraction) */}
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 text-[var(--tg-theme-button-color,#3e88f7)]"
        >
          {/* Background folder back */}
          <path
            d="M5 25C5 19.4772 9.47715 15 15 15H42.7639C46.3317 15 49.6548 16.9113 51.4427 20.0388L55 26.2655H105C110.523 26.2655 115 30.7427 115 36.2655V95C115 100.523 110.523 105 105 105H15C9.47715 105 5 100.523 5 95V25Z"
            fill="currentColor"
            fillOpacity="0.1"
          />
          {/* Paper sticking out */}
          <rect x="25" y="30" width="70" height="60" rx="4" fill="currentColor" fillOpacity="0.15" />
          <line x1="35" y1="45" x2="65" y2="45" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" />
          <line x1="35" y1="55" x2="85" y2="55" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" />
          {/* Folder front */}
          <path
            d="M5 45C5 42.2386 7.23858 40 10 40H110C112.761 40 115 42.2386 115 45V95C115 100.523 110.523 105 105 105H15C9.47715 105 5 100.523 5 95V45Z"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <path
            d="M5 45C5 42.2386 7.23858 40 10 40H110C112.761 40 115 42.2386 115 45V95C115 100.523 110.523 105 105 105H15C9.47715 105 5 100.523 5 95V45Z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h3 className="text-xl font-semibold text-[var(--tg-theme-text-color,#000)] mb-2">
          Здесь пока пусто
        </h3>
        <p className="text-[15px] leading-relaxed text-[var(--tg-theme-hint-color,#98989e)] max-w-[260px] mx-auto">
          Отправьте боту аудиосообщение клиента, чтобы создать первый бриф!
        </p>
      </motion.div>
    </div>
  );
}
