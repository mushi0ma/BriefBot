import { z } from 'zod';

export const TemplateSchema = z.object({
  slug: z.string(),
  icon: z.string(),
  name: z.string(),
  desc: z.string(),
});

export type Template = z.infer<typeof TemplateSchema>;

export const TEMPLATES: Template[] = [
  { slug: "default", icon: "🎯", name: "Универсальный", desc: "Подходит для любых проектов" },
  { slug: "design", icon: "🎨", name: "Дизайн", desc: "Визуальные проекты и брендинг" },
  { slug: "development", icon: "💻", name: "Разработка", desc: "Сайты и приложения" },
  { slug: "marketing", icon: "📊", name: "Маркетинг", desc: "Продвижение и реклама" },
];
