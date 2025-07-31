---
title: How to Prevent Google Analytics Script From Slowing Down Your Website and Ruining your Page Speed Performance Score
date: 2025-07-28
is_published: Published
tags:
  - google-analytics
  - web-design
  - script
---
The Google Analytics script is heavy and will slow down your website. I have proven this for myself by going to Page Speed Insights and testing websites with and without the script. Many of the recommendations such as using the defer attribute are not helpful. Other recommendations like turning off enhanced measurement by toggling off outbound clicks, site search, video engagement, and file downloads, marginally help but do not solve the problem.

The script below solves the problem. It works by delaying the script from loading in the best way possible. It ensures the script is only loaded when the user interacts with the site by touching the screen (on a phone or tablet) or scrolls (on desktop). If none of this happens it waits 4 seconds and then fires.

The one downside of this script is that you will not capture users data for users who land on your site and drop within 4 seconds without interacting in any way. I think the benefit far outweighs the cost and I use it for all of my websites, especially considering that page load speed is one of the biggest factors in causing users to drop off in the first place. My tests show this script to improve most websites load times by at least a half a second.

To use the script you simple replace the Google Analytics ID with your own script. Try it for yourself and notice the difference.

If you would like help with SEO or Web Design for your small business, you can contact me at [RankUtah.com.](https://rankutah.com/)

For additional tips for improving the speed of your website, scroll to the Image Optimization and Page Speed section of my article on \[On-Page Search Engine Optimization\]([https://blog.rankutah.com/utah-on-page-search-engine-optimization/](https://blog.rankutah.com/utah-on-page-search-engine-optimization/)).

Enjoy the script!

```
<script>
(function() {
  const gtagId = 'G-REPLACE_ME'; // Google Analytics ID

  function loadGA() {
    if (window.gtagLoaded) return;      // only load once
    window.gtagLoaded = true;

    // Load GA library
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
    document.head.appendChild(script);

    script.onload = () => {
      try {
        window.dataLayer = window.dataLayer || [];
        function gtag(){ dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', gtagId);
        gtag('event', 'page_view', { page_path: window.location.pathname });
      } catch (e) {
        console.error('Error initializing Google Analytics:', e);
      }
    };
  }

  // Defer until 4 sec or first user interaction
  setTimeout(loadGA, 4000);
  document.addEventListener('scroll', loadGA, { once: true });
  document.addEventListener('mousemove', loadGA, { once: true });
  document.addEventListener('touchstart', loadGA, { once: true });
})();
</script> 
```