module.exports = {
  plugins: {
    'postcss-import': {},
    '@tailwindcss/postcss': {
      config: './tailwind.config.cjs'
    },
    autoprefixer: {},
  }
};
