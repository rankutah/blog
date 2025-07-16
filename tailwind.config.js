/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./sites/**/*.{html,md}",
    "./themes/overrides/**/*.html",
    "./node_modules/flowbite/**/*.js"
  ],
  theme: { extend: {} },
  plugins: [
    require('flowbite/plugin'),
    require('@tailwindcss/typography')
  ],
}
 