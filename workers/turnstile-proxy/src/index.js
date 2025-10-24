export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const contentType = request.headers.get('content-type') || '';
    let formData;
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const bodyText = await request.text();
      formData = new URLSearchParams(bodyText);
    } else if (contentType.includes('multipart/form-data')) {
      formData = await request.formData();
    } else if (contentType.includes('application/json')) {
      const json = await request.json();
      formData = new URLSearchParams();
      Object.entries(json).forEach(([k, v]) => formData.append(k, v));
    } else {
      // best-effort
      const bodyText = await request.text();
      formData = new URLSearchParams(bodyText);
    }

    const token = formData.get('cf-turnstile-response');
    const remoteip = request.headers.get('cf-connecting-ip') || '';
    if (!token) {
      return new Response('Missing Turnstile token', { status: 400 });
    }

    // Verify Turnstile
    const verifyResp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip,
      }),
    });

    const verifyJson = await verifyResp.json();
    if (!verifyJson.success) {
      return new Response('Turnstile verification failed', { status: 403 });
    }

    // Forward to Formspark
    const endpoint = env.FORMSPARK_ENDPOINT;
    if (!endpoint) {
      return new Response('Missing FORMSPARK_ENDPOINT', { status: 500 });
    }

    // Remove token from body before forwarding (optional)
    formData.delete('cf-turnstile-response');

    const forwardResp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const text = await forwardResp.text();
    return new Response(text, { status: forwardResp.status, headers: { 'content-type': forwardResp.headers.get('content-type') || 'text/plain' } });
  },
};
