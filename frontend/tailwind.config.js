/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          elevated: "var(--bg-elevated)",
          subtle: "var(--bg-subtle)",
          viewer: "#050608",
        },
        border: {
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
          focus: "var(--border-focus)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--accent-base)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
        },
        urgency: {
          critical: {
            fg: "var(--urgency-critical-fg)",
            bg: "var(--urgency-critical-bg)",
            border: "var(--urgency-critical-border)",
          },
          high: {
            fg: "var(--urgency-high-fg)",
            bg: "var(--urgency-high-bg)",
            border: "var(--urgency-high-border)",
          },
          moderate: {
            fg: "var(--urgency-moderate-fg)",
            bg: "var(--urgency-moderate-bg)",
            border: "var(--urgency-moderate-border)",
          },
          routine: {
            fg: "var(--urgency-routine-fg)",
            bg: "var(--urgency-routine-bg)",
            border: "var(--urgency-routine-border)",
          },
          quality: {
            fg: "var(--quality-alert-fg)",
            bg: "var(--quality-alert-bg)",
            border: "var(--quality-alert-border)",
          }
        }
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "xs": ["0.6875rem", { lineHeight: "1rem" }],
        "sm": ["0.8125rem", { lineHeight: "1.125rem" }],
        "base": ["0.875rem", { lineHeight: "1.25rem" }],
        "lg": ["1rem", { lineHeight: "1.375rem" }],
        "xl": ["1.25rem", { lineHeight: "1.625rem" }],
      },
      borderRadius: {
        "none": "0px",
        "xs": "2px",
        "sm": "3px",
      }
    },
  },
  plugins: [],
}
