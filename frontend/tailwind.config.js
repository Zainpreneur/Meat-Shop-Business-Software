/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf3f2",
          100: "#fce4e1",
          200: "#f9cdc7",
          300: "#f3aaa0",
          400: "#e9796a",
          500: "#d9503d",
          600: "#c13a26",
          700: "#a12e1d",
          800: "#7d2417",
          900: "#5c1a11",
        },
      },
    },
  },
  plugins: [],
};
