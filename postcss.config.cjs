// postcss.config.cjs
module.exports = {
  plugins: {
    // 旧: tailwindcss: {},
    "@tailwindcss/postcss": {},   // ← こっちに変えます
    autoprefixer: {},
  },
};