---
title: "Contact"
description: "Request a free quote from NOVA Gutter."
layout: flowbite
---
{{< cols >}}

{{< col >}}
## Call for a Quote

Call us directly and receive an estimate for your project.

{{< button url="tel:+19543808242" text="Call (954) 380-8242" >}}

## Leave a Message
Tell us about your property and we’ll get back with options and an estimate.

{{< contact-form id="contact1" phone=true custom="Full Address, Service Needed" message=false consent=false >}}

{{< button submit="true" form="contact1" text="Request a Quote" >}}

<script>
(function() {
  const form = document.getElementById('contact1');
  if (!form) return;

  const counterEndpoint = 'https://script.google.com/macros/s/AKfycbwLrCsm00OW-5rtyCHNWwQA8O9q-tMIKA9QP_QEaNsjsXaTnas-_qO4MAyP4NowCY8d/exec';
  const PAD = 6;
  const FETCH_TIMEOUT_MS = 10000; // Increased to 10s to handle Google's cold starts

  function pad(n) { return String(n).padStart(PAD, '0'); }

  async function fetchCounter() {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(counterEndpoint, { signal: ctrl.signal, cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.value || null;
    } catch (err) {
      console.warn('Counter timed out or failed. Proceeding without reference.');
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  form.addEventListener('submit', async (e) => {
    if (!form.checkValidity()) return;
    e.preventDefault();

    const submitBtn = document.querySelector('button[form="contact1"][type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...'; // Keeps the user from clicking again or refreshing
    }

    const serverVal = await fetchCounter();
    const fd = new FormData(form);

    // Set the reference: Padded number if successful, empty string if timed out
    const referenceValue = serverVal ? pad(serverVal) : "";
    fd.set('reference', referenceValue);

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

      if (!resp.ok) throw new Error('Submit failed');

      // Success Message
      const success = document.createElement('div');
      success.className = 'p-4 mt-4 rounded bg-green-50 text-green-700 text-sm';
      success.innerHTML = 'Quote request sent. We will contact you soon.';
      form.replaceWith(success);

    } catch (err) {
      console.error('Submission error', err);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || 'Request a Quote';
      }
      alert('Submission failed. Please check your internet connection and try again.');
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
