/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pt-red':       '#C8102E',
        'pt-red-dark':  '#A00C24',
        'pt-text':      '#1F2937',
        'pt-muted':     '#6B7280',
        'pt-bg':        '#F9FAFB',
        'pt-border':    '#E5E7EB',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
