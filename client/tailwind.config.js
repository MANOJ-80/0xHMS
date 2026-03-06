/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f5efe4',
        ink: '#172121',
        teal: '#1e6f73',
        moss: '#3f5f45',
        coral: '#dd6e42',
        sand: '#d8c3a5',
      },
      fontFamily: {
        display: ['Sora', 'Trebuchet MS', 'sans-serif'],
        body: ['Manrope', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 24px 80px rgba(23, 33, 33, 0.12)',
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at top left, rgba(221, 110, 66, 0.22), transparent 30%), radial-gradient(circle at top right, rgba(30, 111, 115, 0.22), transparent 35%), linear-gradient(135deg, rgba(245, 239, 228, 0.95), rgba(216, 195, 165, 0.75))',
      },
    },
  },
  plugins: [],
}
