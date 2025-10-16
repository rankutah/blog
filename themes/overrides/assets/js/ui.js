// Minimal Flowbite imports; expand only as needed
// We keep this tiny to reduce JS bytes and main-thread work.
import { initAccordions } from 'flowbite'

function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

ready(() => {
  try {
    initAccordions();
  } catch {}
});
