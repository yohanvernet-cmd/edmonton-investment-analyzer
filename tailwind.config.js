/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a5f' },
        score: { excellent: '#22c55e', good: '#84cc16', medium: '#eab308', poor: '#ef4444' },
      },
    },
  },
  plugins: [],
};
