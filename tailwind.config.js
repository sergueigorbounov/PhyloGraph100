/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Match your current dark theme
        'dark-bg': '#1e2124',
        'dark-panel': '#2c2f33',
        'dark-accent': '#36393f',
        'dark-highlight': '#7289da',
      },
    },
  },
  plugins: [],
}