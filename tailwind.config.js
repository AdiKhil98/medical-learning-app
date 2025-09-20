/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fdf7f6",
          100: "#fbeeec",
          200: "#f6ddd9",
          300: "#f0ccc6",
          400: "#ebbbb3",
          500: "#e2827f", // Burning Sand - main brand
          600: "#da6862",
          700: "#d24e45",
          800: "#ca3428",
          900: "#b15740", // Brown Rust - darkest
        },
        accent: {
          50: "#fdf8f7",
          100: "#faf1ef",
          200: "#f5e3df",
          300: "#f0d5cf",
          400: "#ebc7bf",
          500: "#e5877e", // Tonys Pink - light accent
          600: "#df6d63",
          700: "#d95348",
          800: "#d3392d",
          900: "#b87e70", // Old Rose - dark accent
        },
        success: {
          500: "#22c55e",
        },
        warning: {
          500: "#e5877e", // Tonys Pink
        },
        error: {
          500: "#b15740", // Brown Rust
        },
        background: {
          50: "#fdfcfb",
          100: "#faf9f7",
          200: "#f8f3e8", // White Linen
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