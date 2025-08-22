/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e6f1f8",
          100: "#cce3f1",
          200: "#99c8e3",
          300: "#66acd5",
          400: "#3391c7",
          500: "#0077b6",
          600: "#005f92",
          700: "#00476d",
          800: "#002f49",
          900: "#001824",
        },
        accent: {
          50: "#edfafc",
          100: "#daf5f9",
          200: "#b5ebf4",
          300: "#90e1ee",
          400: "#6bd7e8",
          500: "#48CAE4",
          600: "#39a2b7",
          700: "#2b7989",
          800: "#1c515b",
          900: "#0e282e",
        },
        success: {
          500: "#22c55e",
        },
        warning: {
          500: "#f59e0b",
        },
        error: {
          500: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter-Regular", "sans-serif"],
        medium: ["Inter-Medium", "sans-serif"],
        bold: ["Inter-Bold", "sans-serif"],
      },
    },
  },
  plugins: [],
};