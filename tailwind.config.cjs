// tailwind.config.cjs
const plugin = require('tailwindcss/plugin');
const colors = require('tailwindcss/colors');

const PALETTES = [
  'red','orange','amber','yellow','lime','green','emerald',
  'teal','cyan','sky','blue','indigo','violet','purple',
  'fuchsia','pink','rose'
];

// choose site at build
const SITE = process.env.SITE || '*';

// === Color families we allow in the picker (no slate/zinc/stone) ===
const NEUTRALS = ['gray', 'neutral'];
const CHROMAS  = ['red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose'];
const FAMILIES = [...NEUTRALS, ...CHROMAS];

// We only need these shades for the picker
const STEPS_LIGHT        = ['50','100','200'];     // light mode choices
const STEPS_DARK_NEUTRAL = ['800','900','950'];    // dark mode (neutrals)
const STEPS_DARK_CHROMA  = ['950'];                // dark mode (colors)
const STEPS = new Set([...STEPS_LIGHT, ...STEPS_DARK_NEUTRAL, ...STEPS_DARK_CHROMA]);

// Build a stable safelist for brand-colored buttons and links
function buildSafelist() {
  const out = [];
  const linkFamilies = new Set([...FAMILIES, 'slate', 'zinc', 'stone']);
  for (const c of linkFamilies) {
    out.push(
      `bg-${c}-700`,
      `hover:bg-${c}-800`,
      `focus:ring-${c}-300`,
      `dark:bg-${c}-600`,
      `dark:hover:bg-${c}-700`,
      `dark:focus:ring-${c}-800`,
      // Link text colors used by link-brand mapping
      `text-${c}-600`,
      `hover:text-${c}-700`,
      `dark:hover:text-${c}-500`,
    );
  }
  // not needed for backgrounds anymore, but harmless to keep
  out.push('bg-white');

  // Ensure base background utilities we toggle on <html> are always emitted.
  // Light backgrounds for all families used by the palette
  for (const fam of linkFamilies) {
    for (const step of STEPS_LIGHT) {
      out.push(`bg-${fam}-${step}`);
    }
  }
  // Dark backgrounds (neutrals: 800/900/950; chromas: 950)
  const NEU_ALL = ['slate','gray','zinc','neutral','stone'];
  for (const fam of NEU_ALL) {
    for (const step of STEPS_DARK_NEUTRAL) {
      out.push(`bg-${fam}-${step}`);
    }
  }
  for (const fam of CHROMAS) {
    for (const step of STEPS_DARK_CHROMA) {
      out.push(`bg-${fam}-${step}`);
    }
  }

  // Ensure height utilities used by carousels are always emitted
  out.push(
    'h-56', 'h-64', 'h-96', 'h-140',
    'md:h-96', 'md:h-[28rem]', 'md:h-[36rem]', 'md:h-[44rem]',
    'md:h-[60vh]', 'lg:h-[70vh]'
  );
  return out;
}

module.exports = {
  darkMode: 'class',
  // ... your existing content globs ...
  content: [
    `./sites/${SITE}/**/*.{html,md,js,ts,jsx,tsx,toml}`,
    './themes/overrides/**/*.{html,md,js,ts,jsx,tsx}',
    './layouts/**/*.{html,md,js,ts,jsx,tsx}',
    './assets/**/*.{js,ts,jsx,tsx}',
    './node_modules/flowbite/**/*.js',
  ],
  safelist: buildSafelist(),
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif','system-ui','-apple-system','Segoe UI','Roboto','Helvetica Neue','Arial','Noto Sans','Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','Noto Color Emoji'],
      },
    },
  },
  plugins: [
    // Your existing primary-color CSS vars by palette class (unchanged)
    plugin(({ addBase }) => {
      const base = { ':root': {} };
      Object.entries(colors.rose).forEach(([s, hex]) => {
        base[':root'][`--color-primary-${s}`] = hex;
      });
      PALETTES.forEach(pal => {
        const map = {};
        Object.entries(colors[pal]).forEach(([s, hex]) => {
          map[`--color-primary-${s}`] = hex;
        });
        base[`.${pal}`] = map;
      });
      addBase(base);
    }),

    // === NEW: expose the exact background tokens as CSS variables ===
    plugin(({ addBase }) => {
      const baseVars = { ':root': {} };
      FAMILIES.forEach(fam => {
        const clr = colors[fam];
        Object.keys(clr).forEach(step => {
          if (STEPS.has(step)) {
            baseVars[':root'][`--twc-${fam}-${step}`] = clr[step];
          }
        });
      });
      addBase(baseVars);
    }),

    require('flowbite/plugin'),
    require('@tailwindcss/typography'),
  ],
};
