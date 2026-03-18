"use client";

import { useEffect, useState } from "react";
import { TelegramProvider as BaseProvider } from "@/src/shared/lib/telegram";

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) return null;

  return <BaseProvider>{children}</BaseProvider>;
}
