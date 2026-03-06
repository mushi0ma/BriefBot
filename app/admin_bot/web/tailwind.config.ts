import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "tg-bg": "var(--tg-theme-bg-color, #1c1c1e)",
        "tg-secondary-bg": "var(--tg-theme-secondary-bg-color, #2c2c2e)",
        "tg-button": "var(--tg-theme-button-color, #2481cc)",
        "tg-button-text": "var(--tg-theme-button-text-color, #ffffff)",
        "tg-text": "var(--tg-theme-text-color, #ffffff)",
        "tg-hint": "var(--tg-theme-hint-color, #98989e)",
        "tg-link": "var(--tg-theme-link-color, #2481cc)",
      },
    },
  },
  plugins: [],
};
export default config;
