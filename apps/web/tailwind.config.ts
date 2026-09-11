import type { Config } from "tailwindcss";

/**
 * Tailwind v4 configuration. Tokens and theme live in `src/index.css` via
 * `@theme inline` (the v4 CSS-first flow, matching the shadcn/ui v4 setup);
 * this file is kept because the change contract requires a `tailwind.config.ts`
 * artifact and `components.json` references it. `darkMode: class` is declared
 * here for tooling that reads this file; dark variants are defined in CSS.
 */
export default {
  darkMode: "class",
  theme: {
    extend: {},
  },
} satisfies Config;