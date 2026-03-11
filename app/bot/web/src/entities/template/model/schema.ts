import { z } from 'zod';

export const TemplateSchema = z.object({
  slug: z.string(),
  name: z.string(),
  desc: z.string(),
});

export type Template = z.infer<typeof TemplateSchema>;

export const TEMPLATES: Template[] = [
  { slug: "default", name: "Универсальный", desc: "Подходит для любых проектов" },
  { slug: "design", name: "Дизайн", desc: "Визуальные проекты и брендинг" },
  { slug: "development", name: "Разработка", desc: "Сайты и приложения" },
  { slug: "marketing", name: "Маркетинг", desc: "Продвижение и реклама" },
];
