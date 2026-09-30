import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Semantic – for Radix UI and components */
        background: {
          DEFAULT: "var(--bg-default)",
          subtle: "var(--bg-subtle)",
          overlay: "var(--bg-overlay)",
          muted: "var(--bg-muted)",
          elevated: "var(--bg-elevated)",
        },
        border: {
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
          subtle: "var(--border-subtle)",
          focus: "var(--border-focus)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          inverse: "var(--text-inverse)",
          placeholder: "var(--text-placeholder)",
          link: "var(--text-link)",
          disabled: "var(--text-disabled)",
        },
        action: {
          primary: "var(--action-primary)",
          "primary-hover": "var(--action-primary-hover)",
          "primary-foreground": "var(--action-primary-foreground)",
          "secondary-bg": "var(--action-secondary-bg)",
          "secondary-border": "var(--action-secondary-border)",
          "secondary-foreground": "var(--action-secondary-foreground)",
          "ghost-hover": "var(--action-ghost-hover)",
          danger: "var(--action-danger)",
          "danger-foreground": "var(--action-danger-foreground)",
        },
        status: {
          success: "var(--status-success)",
          "success-bg": "var(--status-success-bg)",
          warning: "var(--status-warning)",
          "warning-bg": "var(--status-warning-bg)",
          error: "var(--status-error)",
          "error-bg": "var(--status-error-bg)",
          info: "var(--status-info)",
          "info-bg": "var(--status-info-bg)",
        },
        /* Primitives – Figma naming (Gray = Neutral, Blue = Primary) */
        gray: {
          25: "var(--gray-25)",
          50: "var(--gray-50)",
          100: "var(--gray-100)",
          200: "var(--gray-200)",
          300: "var(--gray-300)",
          400: "var(--gray-400)",
          500: "var(--gray-500)",
          600: "var(--gray-600)",
          700: "var(--gray-700)",
          800: "var(--gray-800)",
          900: "var(--gray-900)",
          black: "var(--gray-black)",
        },
        blue: {
          25: "var(--blue-25)",
          50: "var(--blue-50)",
          100: "var(--blue-100)",
          200: "var(--blue-200)",
          300: "var(--blue-300)",
          400: "var(--blue-400)",
          500: "var(--blue-500)",
          600: "var(--blue-600)",
          700: "var(--blue-700)",
          800: "var(--blue-800)",
          900: "var(--blue-900)",
        },
        secondary: {
          100: "var(--secondary-100)",
          200: "var(--secondary-200)",
          400: "var(--secondary-400)",
          500: "var(--secondary-500)",
          600: "var(--secondary-600)",
          700: "var(--secondary-700)",
          800: "var(--secondary-800)",
          900: "var(--secondary-900)",
        },
        error: {
          25: "var(--error-25)",
          300: "var(--error-300)",
          400: "var(--error-400)",
          600: "var(--error-600)",
        },
        white: "var(--white)",
      },
      borderWidth: {
        1: "var(--border-width-1)",
        2: "var(--border-width-2)",
      },
      borderColor: {
        DEFAULT: "var(--border-default)",
        strong: "var(--border-strong)",
        subtle: "var(--border-subtle)",
        focus: "var(--border-focus)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        "page-title": "var(--text-page-title)",
        "section-title": "var(--text-section-title)",
        base: "var(--text-base)",
        sm: "var(--text-sm)",
        xs: "var(--text-xs)",
      },
      fontWeight: {
        light: "var(--font-light)",
        normal: "var(--font-regular)",
        medium: "var(--font-medium)",
        semibold: "var(--font-semibold)",
        bold: "var(--font-bold)",
      },
      lineHeight: {
        32: "var(--leading-32)",
        24: "var(--leading-24)",
        20: "var(--leading-20)",
        16: "var(--leading-16)",
      },
      letterSpacing: {
        normal: "var(--tracking-normal)",
        tight: "var(--tracking-tight)",
      },
      spacing: {
        0: "var(--space-0)",
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        12: "var(--space-12)",
      },
      borderRadius: {
        none: "var(--radius-none)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        drop: "var(--shadow-drop)",
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
        fab: "var(--shadow-fab)",
        nav: "var(--shadow-nav)",
      },
      transitionTimingFunction: {
        "out-strong": "var(--ease-out-strong)",
        "in-out-strong": "var(--ease-in-out-strong)",
        drawer: "var(--ease-drawer)",
        spring: "var(--ease-spring)",
      },
      transitionDuration: {
        fast: "var(--dur-fast)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
        drawer: "var(--dur-drawer)",
      },
      keyframes: {
        "edit-button-scale": {
          "0%": { transform: "scale(0.95)" },
          "60%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)" },
        },
        "fade-slide-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        /* Enter van content/kaarten: kort omhoog + fade (stagger via animation-delay) */
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        /* Feedback-pop bij afvinken / toevoegen: nooit vanuit scale(0) */
        pop: {
          "0%": { transform: "scale(0.9)" },
          "55%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
        /* Vinkje “tekent” zichzelf (pathLength 1 → dasharray 1) */
        "check-draw": {
          "0%": { strokeDashoffset: "1" },
          "100%": { strokeDashoffset: "0" },
        },
        /* Zwevende actie / snackbar komt van beneden in */
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        /* Illustraties in empty states: trage, subtiele zweving */
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        /* Afgewezen invoer: korte jitter, daarna rust (Emil: zelden, mag iets speelser) */
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-5px)" },
          "40%": { transform: "translateX(5px)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(3px)" },
        },
      },
      animation: {
        "edit-button-scale": "edit-button-scale 0.25s ease-out forwards",
        "fade-slide-in": "fade-slide-in 0.2s ease-out both",
        /* `backwards`: startframe wordt vóór de (delay-)start getoond, maar na afloop laat de
           animatie de eigenschappen los — zodat `active:scale-*`-transitions daarna weer werken. */
        "fade-up": "fade-up var(--dur-slow) var(--ease-out-strong) backwards",
        pop: "pop 220ms var(--ease-spring) backwards",
        "check-draw": "check-draw 180ms var(--ease-out-strong) both",
        "rise-in": "rise-in var(--dur-slow) var(--ease-out-strong) backwards",
        float: "float 4s ease-in-out infinite",
        shake: "shake 320ms var(--ease-out-strong)",
      },
    },
  },
  plugins: [],
};

export default config;
