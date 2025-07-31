---
date: 2025-06-01
is_published: Published
title: Navbar Setup for Carrd Websites
tags:
  - web-design
---
This is a simple guide showing two options for setting up a navigation menu bar on a [Carrd.co website.](https://Carrd.co)

Step 1: Watch the [Youtube Video Demo](https://www.youtube.com/watch?v=I6Vopo5VXWQ)

Step 2: Choose your embed option below:

## Simple Carrd Nav Menu

Drop this in the on-click area of your Hambuger Menu Icon (see video for reference)

```
if (window.location.hash === '#nav') {

window.history.back();

}
```

## Advanced Carrd Nav Menu (Embed)

Drop this in your header as an embed and be sure to uncheck the box that says Defer script tag on the embed options

```
<!-- Carrd Embed: Horizontal Top Nav with Vertical Indented Submenus -->
<template id="nav-template">
<ul class="nav-menu" aria-label="Primary navigation">
<li><a href="https://website.com/">Home</a></li>
<li><a href="#about">About</a></li>
<li><a href="#services">Services</a></li>
<li><a href="#book">Book</a></li>
<li><a href="#contact">Contact</a></li>
<!-- How to do submenus
<li class="has-submenu">
<span class="submenu-toggle">Services ▾</span>
<ul class="submenu">
<li><a href="#design">Design</a></li>
<li class="has-submenu">
<span class="submenu-toggle">SEO ▾</span>
<ul class="submenu">
<li><a href="#onpage">On-Page SEO</a></li>
<li><a href="#offpage">Off-Page SEO</a></li>
</ul>
</li>
<li><a href="#support">Support</a></li>
</ul>
</li> -->
</ul>
</template>
<style>
:root {
--nav-bg: #DBD4C1;
--nav-text: #000000;
}
.nav-embed {
position: relative;
display: flex;
align-items: center;
width: 100%;
}
/* Desktop styles /
@media (min-width: 768px) {
.nav-toggle,
.nav-panel {
display: none !important;
visibility: hidden !important;
pointer-events: none !important;
height: 0 !important;
width: 0 !important;
opacity: 0 !important;
position: absolute !important;
}
.nav-embed > .nav-menu {
display: flex !important;
flex: 1;
justify-content: center;
gap: 2rem;
padding: 0;
margin: 0;
list-style: none;
}
.nav-embed > .nav-menu > li {
position: relative;
display: flex;
flex-direction: column;
white-space: nowrap;
}
.nav-embed a,
.nav-embed span.submenu-toggle {
color: var(--nav-text);
text-decoration: none;
padding: 1rem;
font-size: 1rem;
cursor: pointer;
}
/
Submenu dropdowns /
.nav-embed .submenu {
display: none;
position: absolute;
left: 0;
top: 100%;
min-width: 240px;
background: var(--nav-bg);
list-style: none;
margin: 0;
padding: .5rem 0;
z-index: 99;
box-shadow: 0 2px 16px rgba(0,0,0,0.18);
border-radius: 0 0 8px 8px;
}
.nav-embed .has-submenu.open > .submenu {
display: block;
}
.nav-embed .submenu > li {
display: block;
margin: 0;
}
.nav-embed .submenu > li > a,
.nav-embed .submenu > li > span.submenu-toggle {
display: block;
padding-left: 2rem;
padding-top: .75rem;
padding-bottom: .75rem;
font-size: 1.25rem;
}
/
Fix vertical stacking for nested submenus /
.nav-embed .submenu .has-submenu {
position: static;
}
.nav-embed .submenu .submenu {
position: static;
left: unset;
top: unset;
min-width: 0;
box-shadow: none;
background: none;
display: none;
padding: 0;
margin: 0;
}
.nav-embed .submenu .has-submenu.open > .submenu {
display: block;
margin: 0;
}
.nav-embed .submenu .submenu > li > a,
.nav-embed .submenu .submenu > li > span.submenu-toggle {
padding-left: 3rem;
padding-top: .6rem;
padding-bottom: .6rem;
font-size: 1.1rem;
}
/
Add subtle separator between items for clarity /
.nav-embed .submenu > li:not(:last-child) {
border-bottom: 1px solid #333;
}
.nav-embed .submenu .submenu > li:not(:last-child) {
border-bottom: 1px solid #333;
}
}
/
Mobile styles /
.nav-embed > .nav-menu { display: none; }
.nav-toggle {
margin-left: auto;
font-size: 2.5rem;
color: var(--nav-text);
background: none;
border: none;
cursor: pointer;
display: block !important;
z-index: 200;
transition: transform .3s ease;
}
.nav-toggle.open { transform: rotate(90deg); }
.nav-panel {
position: fixed; top: 0; right: 0;
width: 70vw; height: 100vh;
background: var(--nav-bg);
transform: translateX(100%);
transition: transform .3s ease;
z-index: 199;
display: flex; flex-direction: column;
}
.nav-panel.open { transform: translateX(0); }
.nav-panel .nav-menu {
list-style: none; margin: 0; padding: 5rem 0 1rem;
overflow-y: auto; flex: 1;
}
.nav-panel li { margin: 0; }
.nav-panel a,
.nav-panel span.submenu-toggle {
display: block;
padding: 1rem 0 1rem 2rem;
font-size: 1.5rem;
color: var(--nav-text);
text-decoration: none;
cursor: pointer;
}
.nav-panel li.open > .submenu { display: block; }
.nav-panel .submenu {
display: none; padding-left: 2rem;
}
.nav-panel .submenu .submenu { padding-left: 3rem; }
/
Separator lines for mobile submenus */
.nav-panel .submenu > li:not(:last-child) {
border-bottom: 1px solid #333;
}
.nav-panel .submenu .submenu > li:not(:last-child) {
border-bottom: 1px solid #333;
}
</style>
<div class="nav-embed">
<!-- desktop menu will be injected here -->
<!-- mobile toggle -->
<button class="nav-toggle" aria-label="Toggle menu">☰</button>
<!-- mobile panel -->
<nav class="nav-panel" aria-label="Mobile navigation"></nav>
</div>
<script>
(function(){
const tpl = document.getElementById('nav-template').content;
const embed = document.querySelector('.nav-embed');
// inject desktop menu
embed.insertBefore(tpl.cloneNode(true), embed.querySelector('.nav-toggle'));
// inject mobile panel menu
embed.querySelector('.nav-panel').appendChild(tpl.cloneNode(true));
const toggle = embed.querySelector('.nav-toggle');
const panel = embed.querySelector('.nav-panel');
// --- Unified submenu logic (recursive for any .has-submenu) ---
function setupSubmenus(root, isDesktop) {
root.querySelectorAll('li.has-submenu').forEach(li => {
const trigger = li.querySelector(':scope > .submenu-toggle');
if (!trigger) return;
trigger.addEventListener('click', function(e) {
e.stopPropagation();
// Only close siblings at the same level, not nested children!
li.parentElement.querySelectorAll(':scope > li.has-submenu').forEach(sibling => {
if (sibling !== li) sibling.classList.remove('open');
});
li.classList.toggle('open');
});
});
}
// Desktop
const desktopMenu = embed.querySelector('.nav-embed > .nav-menu');
setupSubmenus(desktopMenu, true);
// Close all on outside click (desktop)
document.addEventListener('click', e => {
if (!embed.contains(e.target)) {
desktopMenu.querySelectorAll('li.has-submenu').forEach(li => li.classList.remove('open'));
}
});
// Mobile
const mobileMenu = panel.querySelector('.nav-menu');
setupSubmenus(mobileMenu, false);
// Mobile panel open/close
function openPanel(){
panel.classList.add('open');
toggle.classList.add('open');
toggle.textContent = '✕';
document.body.style.overflow = 'hidden';
}
function closePanel(){
panel.classList.remove('open');
toggle.classList.remove('open');
toggle.textContent = '☰';
document.body.style.overflow = '';
mobileMenu.querySelectorAll('li.has-submenu').forEach(li=>li.classList.remove('open'));
}
toggle.addEventListener('click', e=>{
e.stopPropagation();
panel.classList.contains('open')? closePanel(): openPanel();
});
document.addEventListener('click', e=>{
if (!embed.contains(e.target)) closePanel();
});
panel.querySelectorAll('a').forEach(a=>a.addEventListener('click', closePanel));
})();
</script>
```