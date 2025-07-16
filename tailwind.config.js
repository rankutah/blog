/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Scan all templates, content, and scripts
    "./**/*.{html,md,js,ts,jsx,tsx}",

    // Exclude bulky or generated folders
    "!./node_modules/**/*",
    "!./public/**/*",
    "!./resources/**/*",

    // But include Flowbite’s JS so its dynamic classes aren’t purged
    "./node_modules/flowbite/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('flowbite/plugin'),
    require('@tailwindcss/typography'),
  ],
}