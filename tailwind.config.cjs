// tailwind.config.cjs
const plugin = require('tailwindcss/plugin');
const colors = require('tailwindcss/colors');

const PALETTES = [
  'red','orange','amber','yellow','lime','green','emerald',
  'teal','cyan','sky','blue','indigo','violet','purple',
  'fuchsia','pink','rose'
];

module.exports = {
  darkMode: 'class',
  content: [
    './sites/**/*.{html,md,js,ts,jsx,tsx,toml}',
    './themes/overrides/**/*.{html,md,js,ts,jsx,tsx}',
    './node_modules/flowbite/**/*.js',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // 1) Your CSS‑var palette plugin
    plugin(({ addBase }) => {
      const base = { ':root': {} };
      // default primary = rose
      Object.entries(colors.rose).forEach(([s, hex]) => {
        base[':root'][`--color-primary-${s}`] = hex;
      });
      // override when <html class="PAL">
      PALETTES.forEach(pal => {
        const map = {};
        Object.entries(colors[pal]).forEach(([s, hex]) => {
          map[`--color-primary-${s}`] = hex;
        });
        base[`.${pal}`] = map;
      });
      addBase(base);
    }),

    require('flowbite/plugin'),
    require('@tailwindcss/typography'),
  ],
};
