import type { Config } from "tailwindcss";

/**
 * Genevieve App — dark burgundy and gold.
 *
 * `brand` is the gold scale and `ink` the burgundy scale, so the existing
 * utility classes across the app resolve to the house palette without every
 * page needing to be rewritten.
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Gold — mid values are the readable accents on a dark ground.
        brand: {
          50: "#fdf9ec",
          100: "#f9f0cf",
          200: "#f2e09f",
          300: "#eacd6c",
          400: "#e2bd4c",
          500: "#d9b03e",
          600: "#d4af37",
          700: "#b08d29",
          800: "#8a6d22",
          900: "#6b541f",
          950: "#3d2f0f",
        },
        // Burgundy — the ground the whole app sits on.
        ink: {
          50: "#f6efe3",
          100: "#e6d8c4",
          200: "#5c1c2b",
          300: "#6d2434",
          400: "#7d2b3d",
          500: "#5c1c2b",
          600: "#4a121f",
          700: "#3a0c17",
          800: "#2b0811",
          900: "#1e0509",
          950: "#140306",
        },
        gold: {
          DEFAULT: "#d4af37",
          bright: "#f0d57e",
          deep: "#a8842a",
        },
        wine: {
          DEFAULT: "#3a0c17",
          deep: "#1e0509",
          raised: "#4a121f",
          high: "#5c1c2b",
        },
        cream: {
          DEFAULT: "#f6efe3",
          dim: "#cdbfa8",
        },
      },
      fontFamily: {
        script: ["var(--font-script)", "cursive"],
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        gilt: "0 0 0 1px rgba(212,175,55,0.28), 0 18px 40px -24px rgba(0,0,0,0.9)",
        medallion: "0 10px 30px -12px rgba(0,0,0,0.75)",
      },
    },
  },
  plugins: [],
} satisfies Config;
