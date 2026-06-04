/** @type {import('tailwindcss').Config} */
export default {
  // Tambahkan path file proyek Anda di sini
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warna merah khas ScrumApps Anda tetap terjaga
        'scrum-red': '#ee1e2d',
      }
    },
  },
  plugins: [],
}