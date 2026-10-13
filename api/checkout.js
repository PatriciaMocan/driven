/* =========================================================
   Stripe checkout (a Vercel serverless function)
   Only used when CHECKOUT.mode is 'stripe' in script.js.

   The browser sends { items: [{ id, qty }] }. This function looks up
   the real prices in products.js, asks Stripe for a checkout page,
   and sends back its URL. Your secret key never reaches the browser.

   Setup (once): in Vercel, open your project > Settings > Environment
   Variables and add STRIPE_SECRET_KEY with your key from
   https://dashboard.stripe.com/apikeys (use the sk_test_... key first).
   No npm install needed: it talks to Stripe's API directly.
   ========================================================= */

const PRODUCTS = require('../products.js');

// Countries you ship to (two-letter codes). Edit to match your shipping policy.
const SHIP_TO = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY is not set in Vercel' });
  }

  const items = (req.body && Array.isArray(req.body.items)) ? req.body.items : [];

  // Stripe expects form-encoded fields like line_items[0][quantity]=1
  const form = new URLSearchParams();
  let line = 0;
  for (const item of items) {
    const product = PRODUCTS.find((p) => p.id === item.id);
    const qty = Math.floor(Number(item.qty));
    if (!product || !(qty >= 1 && qty <= 10)) continue; // ignore anything unexpected

    form.append(`line_items[${line}][quantity]`, String(qty));
    form.append(`line_items[${line}][price_data][currency]`, 'eur');
    form.append(`line_items[${line}][price_data][unit_amount]`, String(product.price * 100)); // in cents
    form.append(`line_items[${line}][price_data][product_data][name]`, `${product.name} — ${product.colour}`);
    line += 1;
  }

  if (line === 0) {
    return res.status(400).json({ error: 'The bag is empty' });
  }

  // Where Stripe sends people after paying or cancelling
  const origin = `https://${req.headers.host}`;
  form.append('mode', 'payment');
  form.append('success_url', `${origin}/?checkout=success`);
  form.append('cancel_url', `${origin}/?checkout=cancelled`);
  SHIP_TO.forEach((country, i) => form.append(`shipping_address_collection[allowed_countries][${i}]`, country));

  try {
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form
    });
    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error('Stripe error:', session.error && session.error.message);
      return res.status(502).json({ error: 'Stripe could not create the checkout' });
    }
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Checkout failed' });
  }
};
