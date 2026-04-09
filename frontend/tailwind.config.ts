import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Lato", "Sora", "sans-serif"],
        body: ["Open Sans", "Manrope", "sans-serif"]
      },
      boxShadow: {
        glass: "0 8px 32px rgba(15, 23, 42, 0.25)"
      }
    }
  },
  plugins: []
} satisfies Config;
