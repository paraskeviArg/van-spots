// Vercel serverless function: proxies chat requests to Anthropic API.
// The ANTHROPIC_API_KEY environment variable must be set in Vercel dashboard.
// This file lives in api/ so Vercel exposes it at /api/claude

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables'
    });
  }

  const { messages, model, max_tokens, system } = req.body || {};

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Safety: cap max_tokens so a runaway request cannot rack up cost
  const chosenModel = model || 'claude-sonnet-5';
  const maxTokens = Math.min(Math.max(max_tokens || 1500, 100), 4000);

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: chosenModel,
        max_tokens: maxTokens,
        messages,
        ...(system ? { system } : {}),
      }),
    });

    const data = await anthropicResponse.json();
    return res.status(anthropicResponse.status).json(data);
  } catch (err) {
    console.error('Anthropic proxy error:', err);
    return res.status(500).json({ error: err.message || 'API call failed' });
  }
}
