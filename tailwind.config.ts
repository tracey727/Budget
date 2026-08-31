import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f7fa",
          100: "#e9edf3",
          200: "#cfd8e3",
          300: "#a7b6ca",
          400: "#788dab",
          500: "#576e90",
          600: "#435776",
          700: "#374760",
          800: "#303d51",
          900: "#2b3546",
          950: "#1c2230",
        },
        brand: {
          50: "#ecfdf6",
          100: "#d1faea",
          200: "#a7f3d6",
          300: "#6ee7bd",
          400: "#34d39e",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
