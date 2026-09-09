import type { Config } from "tailwindcss";

/**
 * Tailwind v4 CSS-first configuration.
 * The actual theme is configured via CSS @theme in src/app/globals.css.
 * This JS config is kept for editor intellisense only.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
};

export default config;
