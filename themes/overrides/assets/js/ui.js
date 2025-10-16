// Initialize all Flowbite components consistently across sites.
// Using the single initializer keeps behavior uniform as you add components.
import { initFlowbite } from 'flowbite'

function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

ready(() => {
  try { initFlowbite(); } catch {}
});
