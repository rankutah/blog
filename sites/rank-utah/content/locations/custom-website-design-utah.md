---
title: "Custom Website Design in Utah"
description: "Website design for small businesses across Utah. Fast, phone‑friendly sites with clear call and text buttons, managed hosting, an encrypted (HTTPS) connection, and friendly ongoing support. Serving all of Utah."
layout: "flowbite"
url: "/locations/custom-website-design-utah"
hero: true
# Do not manually link this in locations listing; PPC / statewide target.
schema:
  service:
    enabled: true
    serviceType: "Custom Website Design"
    description: "Custom, fast business websites built to help more customers call, text, or request a quote across Utah."
    areaServed: "Utah"
    offers:
      - "@type": Offer
        priceCurrency: USD
        price: "99"
        availability: "https://schema.org/InStock"
      - "@type": Offer
        priceCurrency: USD
        price: "199"
        availability: "https://schema.org/InStock"
  faq:
    enabled: true
    items:
      - question: "How long does a custom site take?"
        answer: "Typical turnaround is 2–3 weeks once content is ready. Smaller sites can be done faster."
      - question: "Do you handle hosting?"
        answer: "Yes. Managed hosting, CDN, security, and ongoing updates are included."
      - question: "Is there a big upfront fee?"
        answer: "No. A predictable monthly price covers hosting, domain renewals, updates, and improvements."
      - question: "What about Local Search Engine Optimization (SEO)?"
        answer: "Basic search setup is included (page titles/descriptions and fast loading). Extra local SEO—keyword research/content alignment, Google Business Profile, Apple Maps/Bing, 100+ listings, and reporting—is available separately."
      - question: "Are content updates really unlimited?"
        answer: "Yes. Request changes any time by call, text, or email."
params:
  ppc: true
  hideFooterLinks: true
  # Optional: could add noindex: true if purely paid, leaving indexed for now.

---

{{< hero img="/media/utah-website-design-hero.avif" alt="Utah landscape image for website design hero banners" bleed="true" overlay="true" overlayShade="bg-black/50" vh="svh" align="center" spacer="false" >}}
# Custom Website Design for Small Businesses in Utah<br><span id="dynamic-city" class="block mt-2 hidden leading-tight text-xl sm:text-3xl" aria-live="polite"></span> {.text-white}
Affordable websites built by a professional web developer in Utah County

{{<button id="ppc-call" url="tel:+13853238130" text="Call or Text: (385) 323-8130">}}
{{<button id="learn-more" url="#main-content" text="Learn More">}}

<div class="mt-6"></div>
{{< /hero >}}

_Utah office: [Pleasant Grove, UT](/locations/pleasant-grove-ut) — serving businesses across the U.S._

<div id="main-content" class="scroll-mt-24"></div>

<script>
(function(){
  const p = new URLSearchParams(location.search);
  const raw = p.get('city');
  const isPaid = p.has('gclid') || (p.get('utm_source')||'').toLowerCase()==='google';
  if(!raw || !isPaid) return;
  // Guard against unresolved Google Ads location macro or generic placeholders
  const placeholderPattern = /^\s*\{location\(city\)\}\s*$/i;
  if (placeholderPattern.test(raw)) return; // literal macro not replaced
  const lowerRaw = raw.toLowerCase().trim();
  if (["location", "city", "location city", "locationcity"].includes(lowerRaw)) return;
  let cleaned = raw.replace(/[-_]+/g,' ')            // hyphens/underscores to space
                   .replace(/[^a-zA-Z'\s]/g,'')     // keep letters, apostrophes, spaces
                   .trim()
                   .toLowerCase()
                   .replace(/\s{2,}/g,' ');         // collapse whitespace
  if(!cleaned) return;
  const words = cleaned.split(' ');
  // Additional post-clean guard: if still generic after cleaning
  if (["location", "city", "locationcity"].includes(cleaned)) return;
  if (cleaned.length < 2 || cleaned.length > 30 || words.length > 3) return; // guard length/word count
  const city = words.map(w=> w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
  // Inject second heading line dynamically (paid traffic only)
  const span = document.getElementById('dynamic-city');
  if(!span) return;
  const displayCity = city.length > 28 ? city.slice(0,25) + '…' : city;
  span.textContent = 'Serving ' + displayCity;
  span.classList.remove('hidden');
  if (window.gtag) {
    window.gtag('event','ppc_city_injection',{
      event_category:'landing_variant',
      event_label: city,
      transport_type:'beacon'
    });
  }
})();
</script>

## Website Design in Utah
Get a website that helps more customers call, text, and request a quote. Expect a fast, phone‑friendly site built for local search with clear call and text buttons, plus ongoing help by call, text, or email.

{{< cols min="18rem" gap="2rem" v="start" >}}

{{< col card="false" bg="blue-100" darkbg="gray-800" y="start" >}}
### What You Get
- Custom branded design
- Clear page layout
- Fast loading on phones and computers
- Search-friendly setup
- Clean images that load quickly
- Contact forms with spam protection and basic reporting
- Ongoing updates and support
- Managed hosting & security
- Domain renewals included

### Built For Results
Easy contact buttons, quick loading pages, and content that’s easy to scan.

{{< button url="/pricing" text="Pricing" >}}
{{< /col >}}

{{< col card="false" bg="gray-100" darkbg="gray-800" y="start" >}}
### Featured Work &nbsp; &nbsp; &nbsp; {{< button url="/portfolio" text="Portfolio" >}}

{{< cols min="16rem" gap="1.5rem" v="start" >}}
{{< col card="false" bg="gray-100" darkbg="gray-800" y="start" >}}
#### Quartz Worx – Countertops
![Custom Website Design in Utah](/media/website-design-quartz-worx.avif)
{{< /col >}}
{{< col card="false" bg="blue-100" darkbg="gray-800" y="start" >}}
#### Cedar City Strength – Fitness
![](/media/website-design-cedar-city-strength.avif)
{{< /col >}}
{{< /cols >}}

{{< cols min="16rem" gap="1.5rem" v="start" >}}
{{< col card="false" bg="gray-100" darkbg="gray-800" y="start" >}}
#### Blue Ridge Abbey – Hospitality
![](/media/website-design-blue-ridge-abbey.jpg)
{{< /col >}}
{{< col card="false" bg="blue-100" darkbg="gray-800" y="start" >}}
#### BlueridgeTech – IT Services
![](/media/website-design-blueridge-tech.avif)
{{< /col >}}
{{< /cols >}}

{{< /col >}}

{{< /cols >}}

## Why Utah Small Businesses Choose Clear Presence

- Local Utah company focused on your success
- Affordable flat rate prices without lock-in contracts
- Unlimited support via call, text, email, or meetings
- Unlimited updates and edits with long-term support
- A modern, mobile-friendly website built to load fast

Want to compare speed? Take the [Website Speed Challenge](/speed-challenge/).

## Customer Website Design Experiences
{{< elfsight id="34cbde4c-9d31-432c-8bcb-9e123ab873fa" >}}

{{< cols min="18rem" gap="2rem" v="start" >}}

{{< col card="false" bg="gray-100" darkbg="gray-800" y="start" >}}

## Ready To Get Started

I love partnering with business owners and specialize in building fast custom websites that turn visits into calls, bookings, and messages. Personally, I enjoy running, audiobooks, and all things tech. After growing up in St. George and living in various parts of the state, I now live in Orem with my wife and three daughters. I graduated from Southern Virginia University in Business and completed my Master’s degree at the University of Utah in Software Development.

![Benjamin Awerkamp – Utah Website Designer](/media/benjamin-awerkamp-profile.jpg)
{.w-40 .mb-4}

**Benjamin Awerkamp** <br>
Website Design & Local SEO <br>
Call or Text: [(385) 323-8130](tel:+13853238130) <br>
Master's in Software Development <br>
Bachelor's in Business Management

### Share a bit about your business and goals.

{{< contact-form
  id="contact1"
  action="https://submit-form.com/I4t2OG4uj"
  name="true"
  email="false"
  custom="Email or Phone"
  phone="false"
  business="false"
  subject="false"
  message="true"
  consent="false"
  classes="max-w-xl"
>}}

{{< button submit="true" form="contact1" text="Submit Message" >}}
{{< /col >}}

{{< col card="false" bg="blue-100" darkbg="gray-800" y="start" >}}
## How it Works
1. Sign up for services
2. Fill out the onboarding form
3. Have your website sent to you for review
4. Request changes and approve when ready
5. Go live
6. Continue to request updates as needed

## FAQ
{{< faqs >}}

### Do you handle hosting & the website url name?
Yes. Managed hosting and your website name is included.

### Do I own the site?
Yes, you own the site from day one. If services are canceled, help is provided to transfer the site and domain to a new developer.

### Are there upfront fees?
No. Pricing is a flat monthly cost that includes domain renewal, hosting, a simple monthly report, and ongoing support and updates. Details are on the [pricing page](/pricing).

### Are content updates really unlimited?
Yes, you can request changes anytime in the way that works best for you (call, text, or email). There are no additional fees for changes or updates.

{{< /faqs >}}

{{< button url="/pricing" text="Pricing" >}}
{{< button url="/contact" text="Contact" >}}

## Have Another Question?

Text your question (even during non-business hours) and a reply will come as soon as possible.

{{< button url="sms:+13853238130" text="Text (385) 323-8130" >}}


{{< /col >}}
{{< /cols >}}
