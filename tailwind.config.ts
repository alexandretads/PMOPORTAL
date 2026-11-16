/**
 * Design system do Portal PMO Unimed Campo Grande.
 * Os mesmos tokens estão espelhados em src/index.css (@theme) para o
 * motor de estilos usado no build do Vite.
 */
const config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          900: "#003D2E",
          700: "#006B4F",
          500: "#00A67A",
          100: "#D6F0E6",
        },
        status: {
          ok: "#059669",
          warn: "#D97706",
          danger: "#DC2626",
          muted: "#94A3B8",
          paused: "#7C3AED",
          done: "#0891B2",
          dangerSoft: "#FEF2F2",
        },
        bg: "#F8FAF9",
        surface: "#FFFFFF",
        border: "#E5E7EB",
        text: "#0F172A",
        text2: "#64748B",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,.05)",
        md: "0 4px 12px rgba(15,23,42,.06)",
        lg: "0 12px 32px rgba(15,23,42,.10)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in .35s ease-out both",
        "slide-in": "slide-in .25s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
