---
title: "Contact"
description: "Request a free quote from NOVA Gutter."
layout: flowbite
---
{{< cols >}}

{{< col >}}
## Call for a Quote

Call us directly and receive an estimate for your project.

{{< button href="tel:+19543808242" text="Call (954) 380-8242" >}}

## Leave a Message
Tell us about your property and we’ll get back with options and an estimate.

{{< contact-form id="contact1" phone=true custom="Full Address, Service Needed" message=false consent=false >}}

{{< button submit="true" form="contact1" text="Request a Quote" >}}

<script>
// Submission with external counter (Apps Script) + hidden reference, no reference in success message.
(function() {
  const form = document.getElementById('contact1');
  if (!form) return;

  // Set this to your deployed Apps Script URL (must allow GET).
  const counterEndpoint = 'https://script.google.com/macros/s/14eSNXsVE3MlKSEZCW4frGytB4i7OuY7algjk7B_wU-yqOF93eR8nZ0g7/exec';
  const PREFIX = 'NG-';
  const PAD = 6; // e.g. 000040
  const FETCH_TIMEOUT_MS = 4000;

  async function fetchCounter() {
    if (!counterEndpoint || counterEndpoint.includes('14eSNXsVE3MlKSEZCW4frGytB4i7OuY7algjk7B_wU-yqOF93eR8nZ0g7')) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(counterEndpoint, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error('Bad status ' + res.status);
      const data = await res.json();
      if (typeof data.value === 'number') return data.value;
    } catch (err) {
      console.warn('Counter fetch failed:', err);
    } finally {
      clearTimeout(t);
    }
    return null;
  }

  function buildReference(num) {
    if (typeof num === 'number' && num > 0) {
      return PREFIX + String(num).padStart(PAD, '0');
    }
    return PREFIX + 'TMP-' + Date.now();
  }

  form.addEventListener('submit', async (e) => {
    if (!form.checkValidity()) return;
    e.preventDefault();

    const submitBtn = document.querySelector('button[form="contact1"][type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }

    // Pre-fetch counter (do not block indefinitely)
    const counterValue = await fetchCounter();
    const reference = buildReference(counterValue);
    let refInput = form.querySelector('input[name="reference"]');
    if (!refInput) {
      refInput = document.createElement('input');
      refInput.type = 'hidden';
      refInput.name = 'reference';
      form.appendChild(refInput);
    }
    refInput.value = reference;

    // Capture Turnstile token if available
    if (window.turnstile) {
      try {
        let token = window.turnstile.getResponse();
        // If empty token and Turnstile supports execute, attempt it.
        if (!token && window.turnstile.execute) {
          try { await window.turnstile.execute(); token = window.turnstile.getResponse(); } catch (ex) {}
        }
        if (token) {
          let tInput = form.querySelector('input[name="cf-turnstile-response"]');
          if (!tInput) {
            tInput = document.createElement('input');
            tInput.type = 'hidden';
            tInput.name = 'cf-turnstile-response';
            form.appendChild(tInput);
          }
          tInput.value = token;
        }
      } catch (err) {
        console.warn('Turnstile token retrieval failed', err);
      }
    }

    const fd = new FormData(form); // includes new hidden inputs
    const body = new URLSearchParams();
    fd.forEach((v, k) => body.append(k, v));

    try {
      const resp = await fetch(form.action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'application/json'
        },
        body: body.toString()
      });
      if (!resp.ok) throw new Error('Submit failed ' + resp.status);

      const success = document.createElement('div');
      success.className = 'p-4 mt-4 rounded bg-green-50 text-green-700 text-sm';
      success.innerHTML = 'Quote request sent. We will contact you soon.'; // reference intentionally omitted
      form.replaceWith(success);
    } catch (err) {
      console.error('Submission error', err);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request a Quote';
      }
      alert('Sorry, submission failed. Please try again.');
    }
  });
})();
</script>

{{< /col >}}



{{< col >}}
## Address
1726 Avenida Del Sol, Boca Raton, FL 33432

{{< map-embed src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3574.760900804521!2d-80.09102082250271!3d26.366594376976916!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88d8e1de16e98805%3A0xcaa6e8b9fb6e56a7!2sNova%20Gutter%20Corporation!5e0!3m2!1sen!2sus!4v1763404273873!5m2!1sen!2sus" height="400" >}}
{{< /col >}}

{{< /cols >}}

## Service Areas
We serve South Florida and nearby communities. Common areas include:

- Palm Beach county
- Broward County
- Miami-Dade County

If you don’t see your city listed, reach out—we likely serve your area.
