// Tiny, framework-free UI helpers to replace Flowbite init for
// collapse menus and dropdowns used in the navbar.

function ready(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function initCollapse() {
  document.querySelectorAll('[data-collapse-toggle]')
    .forEach(btn => {
      const id = btn.getAttribute('data-collapse-toggle');
      const target = id && document.getElementById(id);
      if (!target) return;
      btn.addEventListener('click', () => {
        const isHidden = target.classList.toggle('hidden');
        const expanded = !isHidden;
        btn.setAttribute('aria-expanded', String(expanded));
      });
    });
}

function initDropdowns() {
  const buttons = Array.from(document.querySelectorAll('[data-dropdown-toggle]'));
  if (!buttons.length) return;

  function closeAll(exceptId) {
    buttons.forEach(b => {
      const id = b.getAttribute('data-dropdown-toggle');
      const el = id && document.getElementById(id);
      if (!el || id === exceptId) return;
      el.classList.add('hidden');
      b.setAttribute('aria-expanded', 'false');
    });
  }

  buttons.forEach(btn => {
    const id = btn.getAttribute('data-dropdown-toggle');
    const menu = id && document.getElementById(id);
    if (!menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nowHidden = menu.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', String(!nowHidden));
      if (!nowHidden) closeAll(id); // close others
    });
  });

  document.addEventListener('click', (e) => {
    // Close if clicking outside any open menu
    const isInsideMenu = (el) => el.closest && (el.closest('[data-dropdown-toggle]') || el.closest('[id^="menu-"]'));
    if (!isInsideMenu(e.target)) closeAll();
  });
}

ready(() => {
  initCollapse();
  initDropdowns();
});
