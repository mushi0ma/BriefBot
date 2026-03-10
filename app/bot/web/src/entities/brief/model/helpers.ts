export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric", month: "short",
  }) + ", " + d.toLocaleTimeString("ru-RU", {
    hour: "2-digit", minute: "2-digit",
  });
}

export function stateInfo(state: string) {
  switch (state) {
    case "done": return { label: "Готов", color: "bg-[#30d158]/15 text-[#30d158]" };
    case "failed": return { label: "Ошибка", color: "bg-[#ff453a]/15 text-[#ff453a]" };
    default: return { label: "Обработка...", color: "bg-[#ff9f0a]/15 text-[#ff9f0a]" };
  }
}
