---
title: Does Google Analytics Slow Down Your Website?
date: 2025-07-28
is_published: Published
tags:
  - google-analytics
  - web-design
  - script
lastmod: 2025-08-21
---
Google Analytics is heavy and will slow down your website. I have proven this for myself by going to Page Speed Insights and testing websites with and without analytics. Some sites recommend using the defer attribute on your script but that does not help. Other sites recommend turning off enhanced measurement by toggling off outbound clicks, site search, video engagement, and file downloads. This marginally helps but does not solve the problem.

The free script below solves the problem. It works by delaying Google Analytics from loading until the user interacts with the site by touching the screen (on a phone or tablet) or scrolling (on desktop). If none of this happens it waits 4 seconds and then execute.

The one downside of this script is that you will not capture users data for users who land on your site and drop within 4 seconds without interacting in any way. This is a small cost when considering that page load speed is one of the biggest factors in causing users to drop off in the first place. My tests show this script to improve most websites load times by at least a half a second and I use if for all of my sites. 

To use the script simply replace the Google Analytics ID with your own Google Analytics ID. Try it for yourself and then use [PageSpeed Insights](https://pagespeed.web.dev/) to test the difference. If it helps you out please share it online with others. 

If you would like help with SEO or Web Design, you can contact me at [ClearPresence.io](https://clearpresence.io/)

For additional tips for improving the speed of your website, scroll to the Image Optimization and Page Speed section of my article on [On-Page SEO](on-page-seo-strategy-utah.md).

Hope you enjoy the script below and your Google Analytics without the slow website!

## Google Analytics Slow Website Fix

```
<script>
// 1) Stub dataLayer & gtag() immediately
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };

(function () {
  const gtagId = 'G-LGYK5V1CTV'; // GA4 Measurement ID

  // 2) Initialize GA4: config auto-fires page_view
  function initGtag() {
    gtag('js', new Date());
    gtag('config', gtagId);

    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
    document.head.appendChild(s);
  }

  // 3) Lazy-load GA4 once
  function loadTrackingScripts() {
    if (window.trackingLoaded) return;
    window.trackingLoaded = true;
    initGtag();
  }

  // Trigger after 4s or on first scroll/mouse/touch
  setTimeout(loadTrackingScripts, 4000);
  document.addEventListener('scroll', loadTrackingScripts, { once: true });
  document.addEventListener('mousemove', loadTrackingScripts, { once: true });
  document.addEventListener('touchstart', loadTrackingScripts, { once: true });
})();
</script>

```