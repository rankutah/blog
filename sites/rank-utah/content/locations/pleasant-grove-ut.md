---
title: "Freelancer in Pleasant Grove, UT - Web Design & SEO Services - Digital Marketing Agency Near You for Small Businesses in Utah County"
description: "Benjamin provides affordable web design and SEO services for small businesses in Utah County, from an office in Pleasant Grove, Utah."
layout: "flowbite"
url: "/locations/pleasant-grove-ut"
hero: true
schema:
  localBusiness:
    enabled: true
    type: ProfessionalService
    name: "Clear Presence"
    "@id": "https://clearpresence.io/#professionalservice"
    url: "https://clearpresence.io/"
    telephone: "+1-385-323-8130"
    image: "/media/logo.png"
    areaServed:
      - "Pleasant Grove, UT"
      - "Lindon, UT"
      - "Saratoga Springs, UT"
      - "Eagle Mountain, UT"
      - "Orem, UT"
      - "Provo, UT"
      - "American Fork, UT"
      - "Lehi, UT"
      - "Spanish Fork, UT"
      - "Springville, UT"
      - "Utah County, UT"
    address:
      streetAddress: "348 S 2000 W, Suite B206"
      addressLocality: "Pleasant Grove"
      addressRegion: "UT"
      postalCode: "84062"
      addressCountry: "US"
    openingHoursSpecification:
      - "@type": OpeningHoursSpecification
        dayOfWeek: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday]
        opens: "08:00"
        closes: "20:00"
    hasMap: "https://www.google.com/maps/place/348+S+2000+W+b206,+Pleasant+Grove,+UT+84062"
    geo:
      latitude: "40.35949"
      longitude: "-111.77212"
    priceRange: "$99–$199/mo"
  service:
    enabled: true
    serviceType: "Website Design & Local SEO Services"
    description: "Clear Presence is a Website Design & Local SEO company in Pleasant Grove, Utah. Offering small business websites at affordable rates with a focus on local search engine optimization (SEO)."
    areaServed:
      - "Pleasant Grove, UT"
      - "Lindon, UT"
      - "Saratoga Springs, UT"
      - "Eagle Mountain, UT"
      - "Orem, UT"
      - "Provo, UT"
      - "American Fork, UT"
      - "Lehi, UT"
      - "Spanish Fork, UT"
      - "Springville, UT"
      - "Utah County, UT"
    offers:
      - "@type": Offer
        name: "Business Website"
        price: "99.00"
        priceCurrency: "USD"
      - "@type": Offer
        name: "Business Website + Local SEO"
        price: "199.00"
        priceCurrency: "USD"
---


{{< hero img="/media/utah-website-design-hero.avif" alt="Utah landscape hero image for website design and local SEO services in Utah County" bleed="true" overlay="true" overlayShade="bg-black/40" vh="svh" yBottom="none" align="center" spacer="false">}}
# Web Design & SEO Services for Utah County from Pleasant Grove, UT  {.text-white}
Fast, custom websites + local marketing near you. Plans starting at $99/month.

{{< button url="/pricing" text="See Pricing" >}} {{< button url="#main-content" text="How it Works" >}}


<div class="mt-6"></div>
{{< /hero >}}

<div id="main-content" class="scroll-mt-24"></div>

{{< cols min="18rem" gap="2rem" v="start">}}

{{< col card="false" bg="blue-100" darkbg="gray-800" y="start" >}}

## Website Design & Local SEO Near You
- Serving small businesses in Utah County ([remote or in-person](https://cal.com/clearpresence/30min))
- Call or Text: <a href="tel:+13853238130">(385) 323-8130</a>
- Business Hours: Mon–Sat, 8am–8pm (MT)
- Office: <a href="https://maps.app.goo.gl/uPi6ijNoRyDvUA738" target="_blank" rel="noopener">348 S 2000 W, Suite B206, Pleasant Grove, UT 84062</a>

[![Clear Presence — website design and local SEO for Utah small businesses](/media/clearpresence-office-storefront-web-design-local-seo.avif)](https://maps.app.goo.gl/uPi6ijNoRyDvUA738)


{{< /col >}}

{{< col card="false" bg="gray-100" darkbg="gray-800" y="start" >}}


## Office Location in Pleasant Grove, UT

My Pleasant Grove office is conveniently located in Grove Cove, just west of Grove Station and across the street from Oliver's Place. I'm less than 3 minutes from the I-15 Pleasant Grove Blvd exit, making it easy to reach from anywhere in Utah County. Please schedule a meeting if you would like to visit.

{{< button url="https://cal.com/clearpresence/30min" text="Schedule a Meeting" >}}


<div class="map-placeholder" id="pg-map-placeholder" style="position:relative;width:100%;max-width:640px;aspect-ratio:4/3;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;margin-bottom:1rem">
  <button type="button" style="all:unset;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:.5rem;font-family:inherit;color:#0f172a">
    <strong>Load Interactive Map</strong>
    <span style="font-size:.8rem;color:#475569">Click or scroll to load Google Maps for Pleasant Grove</span>
  </button>
</div>
<script>
  (function(){
    var loaded=false;
    var ph=document.getElementById('pg-map-placeholder');
    if(!ph) return;
    function inject(){
      if(loaded) return; loaded=true;
      var iframe=document.createElement('iframe');
      iframe.src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3040.2270534319678!2d-111.77212352186059!3d40.359489571448805!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x874d83518bf2d615%3A0x7743ab4d90b06212!2sClear%20Presence!5e0!3m2!1sen!2sus!4v1761685916027!5m2!1sen!2sus";
      iframe.width="600";
      iframe.height="440";
      iframe.style.border="0";
      iframe.setAttribute('allowfullscreen','');
      iframe.setAttribute('loading','lazy');
      iframe.referrerPolicy='no-referrer-when-downgrade';
      iframe.style.width='100%';
      iframe.style.height='100%';
      ph.innerHTML='';
      ph.appendChild(iframe);
    }
    ph.addEventListener('click', inject, {once:true});
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting){
            inject();
            io.disconnect();
          }
        });
      }, {root:null,rootMargin:'200px'});
      io.observe(ph);
    } else {
      // Fallback: load after a gentle timeout if no IO support
      setTimeout(inject, 8000);
    }
  })();
</script>
<noscript>
  <p>
    View the map on Google Maps:
    <a href="https://www.google.com/maps/place/348+S+2000+W+b206,+Pleasant+Grove,+UT+84062" rel="noopener" target="_blank">Clear Presence, Pleasant Grove, UT</a>
  </p>
</noscript>


{{< /col >}}

{{< /cols >}}

{{< section >}}

{{< cols min="18rem" gap="2rem" v="start">}}

{{< col card="false" bg="blue-100" darkbg="gray-800" y="start" >}}

## 3 Simple Steps to Get Started

1. Purchase a plan on the [pricing page](/pricing)
2. Fill out your [business info](https://docs.google.com/forms/d/e/1FAIpQLScSqrYkNw8VnusGhGGlTUD81rhMEprJlakFWR45zbSOBWplMQ/viewform?usp=sharing&ouid=112359216062622911898)
3. Coordinate with me however you like (text, email, phone, video chat, or in-person)


{{< /col >}}

{{< col card="false" bg="gray-100" darkbg="gray-800" y="start" >}}

## Areas Served in Utah

- **Inside Utah County**: Pleasant Grove, Lindon, Orem, Provo, Lehi, American Fork, Saratoga Springs, Eagle Mountain, Spanish Fork, Springville
- **Outside Utah County**: Services are [available remotely](https://cal.com/clearpresence/30min), with local meetings as needed, so businesses can get a high‑performing website across Utah.

{{< /col >}}

{{< /cols >}}

{{< /section >}}



## Reviews from Local Businesses using Digital Marketing Services
{.center}

<!-- Elfsight Google Reviews | Clear Presence (lazy-loaded globally) -->
{{< elfsight id="34cbde4c-9d31-432c-8bcb-9e123ab873fa" >}}

## 7 Reasons to Choose Clear Presence

1. Your site is designed to help you get leads
2. Your site is custom-coded so it loads faster and performs better
  - Want to compare speed? Take the [Website Speed Challenge](/speed-challenge/).
3. You get long-term personal support via text, calls, emails, or meetings
4. You get clear monthly reports that improve your marketing
    - <a href="/reports/website-and-local-seo-analytics-report.pdf" target="_blank" rel="noopener" download type="application/pdf">Download a sample report (PDF)</a>
      - How many key events happened on your website (calls, forms, bookings, purchases)
      - How many new and returning visitors did you have
      - Which platforms brought your visitors (social, search, AI, etc.)
      - Which pages performed the best
      - Where were your visitors located (by city)
      - Which buttons and links were clicked on the most
      - What did visitors search for on your site?
5. There are no fees for updates and you have a low-risk flat monthly rate (no high upfront costs)
6. You own your website from day one and can change plans or cancel at any time
7. You work one-on-one with me instead of with a faceless agency

{{< button url="#FAQs" text="Read FAQs" >}}


## What’s included?
{.center}

{{< cols min="18rem" gap="2rem" v="start" >}}

{{< col card="false" bg="gray-100" darkbg="gray-800" y="start" >}}

### Business Website Package

Fast, professional websites built to convert visitors into customers.

- Custom design tailored to your brand
- Automatic adjustment to any screen size
- High-speed on phones and computers
- Premium hosting with advanced security
- Automatic backups with every change
- Domain name and annual renewals
- Contact forms with spam protection
- Site-wide search for easy navigation
- Foundational technical + on-page SEO
- Ongoing support via phone, text, or email
- Monthly report on calls, messages, and site activity

{{< button url="/pricing" text="Visit Pricing" >}}


{{< /col >}}

{{< col card="false" bg="blue-100" darkbg="gray-800" y="start" >}}

### Local SEO Package

Get found everywhere it matters: Google, Maps, Apple, AI, and “near me” searches.

- Keyword research + content alignment
- Google Business Profile management and optimization
- Apple Maps and Bing Places management and optimization
- Business listings on 100+ sites (via aggregators)
- Ongoing support via phone, text, or email
- Monthly report on calls, messages, and site activity


{{< /col >}}

{{< /cols >}}

## Custom Websites Designed for Growth — Not Just Looks

A lot of small business websites look fine, but they don’t bring in many calls or messages. Clean, modern sites load fast, work great on phones, and make it obvious what to do next (call, text, or send a message). Add local SEO to get in front of your ideal customers. Monthly plans keep things simple and affordable.

Want to compare speed? Take the [Website Speed Challenge](/speed-challenge/).

## Website redesigns (when your current website isn’t working)

If your website is outdated, slow, hard to use on mobile, or you’re not getting calls and messages from it, a website redesign can be one of the fastest ways to improve results.

What a redesign includes:

- Rebuild using your existing content as a starting point
- Improve mobile usability and page speed
- Refresh the design so it looks modern and trustworthy
- Ongoing support so the website doesn’t fall behind again




## Simple Monthly Pricing for Small Businesses

- $99/mo Website — fast and mobile‑friendly website design with updates included
- $199/mo Website + Local SEO — includes Google Business Profile help, listings, and reporting

No hidden fees. No contracts. Unlimited updates.

## Affordable Results at a Fraction of Big Agency or Company Costs

You’ll get what actually matters: a fast, mobile‑friendly website with clear call and text buttons.
No big upfront fees—just simple monthly pricing and direct support.

## Let’s Design Something Great for Your Business

{{<button id="cta-call" url="tel:+13853238130" text="Call (385) 323-8130">}}
{{< button url="/pricing" text="See Pricing" >}}

## Featured Websites
{.center}

{{< cols min="16rem" gap="1.5rem" v="start" >}}
{{< col card="false" bg="gray-100" darkbg="gray-800" y="start" >}}
### Quartz Worx
[![Custom website design and development featuring a small business](/media/website-design-quartz-worx.avif)](https://quartzworx.com/)
{{< /col >}}
{{< col card="false" bg="blue-100" darkbg="gray-800" y="start" >}}
### Cedar City Strength
[![Custom website design for a small business in Cedar City Utah](/media/website-design-cedar-city-strength.avif)](https://cedarcitystrength.pages.dev/)
{{< /col >}}
{{< /cols >}}

{{< cols min="16rem" gap="1.5rem" v="start" >}}
{{< col card="false" bg="gray-100" darkbg="gray-800" y="start" >}}
### Blue Ridge Abbey
[![Small business website homepage built to load fast and show up in local search](/media/website-design-blue-ridge-abbey.jpg)](https://blueridgeabbey.com/)
{{< /col >}}
{{< col card="false" bg="blue-100" darkbg="gray-800" y="start" >}}
### BlueridgeTech
[![Custom website design for a small shop business](/media/website-design-blueridge-tech.avif)](https://blueridgetech.pro/)
{{< /col >}}
{{< /cols >}}

## Ready To Get Started

I love partnering with business owners and specialize in developing fast custom websites that turn visits into calls, bookings, and messages. Personally, I enjoy running, audiobooks, and all things tech. After growing up in St. George and living in Provo, I now live in Orem with my wife and three daughters. I graduated from Southern Virginia University in Business and completed my Master’s degree at the University of Utah in Software Development.

![Benjamin Awerkamp headshot](/media/profile-headshot-website-design-expert-benjamin-awerkamp.avif)
{.w-48}

**Benjamin Awerkamp** <br>
Website Design & Local SEO <br>
Call or Text: [(385) 323-8130](tel:+13853238130) <br>
Master's in Software Development <br>
Bachelor's in Business Management

### Share a bit about your business and goals.

{{< contact-form
  id="contact-pg"
  action="https://submit-form.com/I4t2OG4uj"
  name="true"
  email="false"
  custom="Email or Phone"
  business="false"
  subject="false"
  message="true"
  consent="false"
  classes="max-w-xl"
>}}

{{< button submit="true" form="contact-pg" text="Submit Message" >}}

## FAQ

<div id="FAQs" class="scroll-mt-24"></div>


{{< faqs schema="true" >}}

### What is the process? How do I start?

1. Purchase a plan on the [pricing page](/pricing)
2. Fill out your [business info](https://docs.google.com/forms/d/e/1FAIpQLScSqrYkNw8VnusGhGGlTUD81rhMEprJlakFWR45zbSOBWplMQ/viewform?usp=sharing&ouid=112359216062622911898)
3. Meet and coordinate with me via phone calls, text, email, or video calls

### Do I own the website?
Yes. You own the website from day one. If service is canceled, help is provided to transfer the website to a new developer.

### What does website design cost?
See the [pricing](/pricing) page for the most up-to-date pricing on business website packages.

### What is local SEO?
Local SEO stands for Local Search Engine Optimization. Local SEO is one of the most effective long‑term ways for a local business to get steady calls and messages because each improvement keeps working month after month (better profiles, better listings, better pages).

Unlike social media posts and ads, local SEO doesn't stop working the moment you stop posting or paying. Local SEO builds a strong foundation so you show up when nearby customers search.

Results depend on what you have to offer, the level of search interest in your area, and the level of competition.

### What does local SEO cost?
See the [pricing](/pricing) page for the most up-to-date pricing on local SEO packages.

### What results should I expect from local SEO?
Local SEO is one of the most effective long‑term ways for a local business to get steady calls and messages because each improvement keeps working month after month.

Social media posts and ads can do very well, but they stop the moment you stop posting or paying. Local SEO establishes a strong foundation so you show up when nearby customers search.

Results depend on what you have to offer, the level of search interest in your area, and your competition.

### Can I change plans later?
Yes. Plans can be changed at any time. The next invoice adjusts and services continue without interruption.

### What happens if I cancel?
No further charges after cancellation. The website stays online through the current billing period. On request, a content export is provided and the domain can be transferred.

### What makes Clear Presence different from other businesses?

1. Your site is designed with a focus on helping you get leads.
2. Your site will perform better than your competitors. Most developers use a template builder like WordPress, Wix, or Squarespace. My sites are custom-coded so they load faster and perform better. If you want to verify it yourself, take the [Website Speed Challenge](/speed-challenge/).
3. You will receive long-term personal support. I continue to maintain, update, and improve your website year after year.
4. You will receive better reports. My monthly reports give you valuable information to help you improve your marketing. Reports include:
- How many users performed key events on your website (calls, form-fills, bookings, or purchases)
- How many new users or returning users visited your site
- Which platforms brought the most key events on your website (social media, Google search, etc.)
- Which pages brought the most key events (contact page, about page, home page, services pages, etc.)
- Which cities brought you the most key events
- Which buttons and links were clicked on your website (ordered by most frequent)
- What did users search for on your website

### What experience do you have?
I started building websites for small businesses in 2023 after completing my Master’s in Software Development. Unlike many web designers who use templates, I custom‑code websites for speed, [performance](/speed-challenge/), and flexibility. Every change I make is backed up, so it’s easy to restore a previous version if needed. With degrees in both Business and Software Development (and a background in cybersecurity), you get someone who understands the technical details and your business goals. You can see more on my <a href="https://www.linkedin.com/in/benjamin-awerkamp/details/experience/" target="_blank" rel="noopener">LinkedIn</a> or the <a href="/about">About page</a>.

### How long does a new website take?
Websites can be built in 2–3 weeks with regular coordination.

### Do you handle hosting and the domain name?
Yes. Managed hosting and your domain name are included. If you want to purchase your own domain you can do that too.

### Are content updates really unlimited?
Yes. All normal small business requests (new pages, updates, changes) are unlimited. You can request changes or updates to your website at any time in the way that works best for you (call, text, or email).

{{< /faqs >}}








