export const content = ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"]

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Poppins", "system-ui", "-apple-system", "sans-serif"]
      },
      colors: {
        // Cluely-inspired color palette
        cluely: {
          dark: {
            bg: "#18181b",        // Main dark background
            card: "#1e1e21",      // Slightly lighter for cards
            border: "#2a2a2d",    // Subtle borders
          },
          accent: {
            teal: "#14b8a6",      // Primary teal accent
            cyan: "#06b6d4",      // Cyan variant
            "teal-dark": "#0f766e", // Darker teal
          },
          text: {
            primary: "#fafafa",   // White/light text
            secondary: "#d4d4d8", // Slightly muted
            muted: "#a1a1aa",     // More muted
          }
        }
      },
      animation: {
        in: "in 0.2s ease-out",
        out: "out 0.2s ease-in",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        "text-gradient-wave": "textGradientWave 2s infinite ease-in-out",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0, transform: "scale(0.95)" },
          "100%": { opacity: 1, transform: "scale(1)" }
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 }
        },
        textGradientWave: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" }
        },
        shimmer: {
          "0%": {
            backgroundPosition: "200% 0"
          },
          "100%": {
            backgroundPosition: "-200% 0"
          }
        },
        in: {
          "0%": { transform: "translateY(100%)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 }
        },
        out: {
          "0%": { transform: "translateY(0)", opacity: 1 },
          "100%": { transform: "translateY(100%)", opacity: 0 }
        },
        pulse: {
          "0%, 100%": {
            opacity: 1
          },
          "50%": {
            opacity: 0.5
          }
        },
        "pulse-ring": {
          "0%": {
            transform: "scale(0.95)",
            opacity: 0.9
          },
          "70%": {
            transform: "scale(1)",
            opacity: 0
          },
          "100%": {
            transform: "scale(1)",
            opacity: 0
          }
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      }
    }
  },
  plugins: []
}
