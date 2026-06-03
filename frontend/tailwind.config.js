/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#080b12",
        panel: "#101622",
        line: "rgba(255,255,255,0.1)",
        mint: "#49d6a8",
        cyan: "#61d7f4",
        amber: "#f6c66d"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(73, 214, 168, 0.16)"
      }
    }
  },
  plugins: []
};
