/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px) scaleY(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scaleY(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out forwards',
        slideDown: 'slideDown 0.25s ease-out forwards',
      },
      colors: {
        // Trading Dashboard Dark theme
        dark: {
          bg: "#08090C",       // Deep dark slate/black
          card: "#111318",     // Dark card background
          border: "#1F232B",   // Cool dark borders
          text: "#F3F4F6",     // Soft gray text
          muted: "#9CA3AF",    // Muted text
        },
        brand: {
          success: "#10B981",  // Neon green ROI/GMV success
          danger: "#EF4444",   // ROI Drop alert
          warning: "#F59E0B",  // Low stock alert
          cyan: "#06B6D4",     // Budget scale color
          indigo: "#6366F1",   // Primary button / link color
        }
      },
    },
  },
  plugins: [],
}
