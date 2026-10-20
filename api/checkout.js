/* =========================================================
   Plata cu cardul prin Stripe (o funcție serverless Vercel)
   Folosită doar când PLATA.card este 'stripe' în script.js.

   Browserul trimite { items: [{ id, qty }], acces: 'COD' }. Funcția:
     - ia prețurile și stocul din products.js (nu din browser)
     - verifică dacă modelele nelansate sunt cumpărate cu un cod de acces valid
     - cere de la Stripe o pagină de plată în lei și trimite înapoi adresa ei
   Cheia secretă nu ajunge niciodată în browser.

   Setare (o singură dată), în Vercel > proiectul tău > Settings > Environment Variables:
     STRIPE_SECRET_KEY     cheia de la https://dashboard.stripe.com/apikeys (începe cu sk_test_ sau sk_live_)
     ACCES_ANTICIPAT_COD   codul din linkul trimis abonaților (ex. NORA-ABONATI)
   Nu e nevoie de npm install: funcția vorbește direct cu API-ul Stripe.
   ========================================================= */

const { PRODUCTS, etapaLansare } = require('../products.js');

const MAX_BUCATI = 10; // aceeași limită ca în script.js

// 1 bucată, 5 bucăți, 20 de bucăți
function bucati(n) {
  if (n === 1) return '1 bucată';
  const rest = n % 100;
  return n + (rest === 0 || rest >= 20 ? ' de bucăți' : ' bucăți');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Folosește POST' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Plata cu cardul nu e configurată încă.' });
  }

  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : [];
  const codCorect = process.env.ACCES_ANTICIPAT_COD;
  const areAcces = Boolean(codCorect) && body.acces === codCorect;

  // Stripe vrea câmpuri de forma line_items[0][quantity]=1
  const form = new URLSearchParams();
  let linie = 0;
  for (const item of items) {
    const produs = PRODUCTS.find((p) => p.id === item.id);
    const qty = Math.floor(Number(item.qty));
    if (!produs || !(qty >= 1 && qty <= MAX_BUCATI)) continue; // ignorăm ce nu e în regulă

    const etapa = etapaLansare(produs);
    if (etapa === 'curand' || (etapa === 'abonati' && !areAcces)) {
      return res.status(403).json({ error: `${produs.nume} nu e încă disponibil. Ai nevoie de linkul de acces anticipat.` });
    }
    if (produs.stoc <= 0) {
      return res.status(409).json({ error: `${produs.nume} s-a epuizat.` });
    }
    if (qty > produs.stoc) {
      return res.status(409).json({ error: `Mai avem doar ${bucati(produs.stoc)} din ${produs.nume}.` });
    }

    form.append(`line_items[${linie}][quantity]`, String(qty));
    form.append(`line_items[${linie}][price_data][currency]`, 'ron');
    form.append(`line_items[${linie}][price_data][unit_amount]`, String(produs.pret * 100)); // în bani
    form.append(`line_items[${linie}][price_data][product_data][name]`, `${produs.nume} — ${produs.culoare}`);
    linie += 1;
  }

  if (linie === 0) {
    return res.status(400).json({ error: 'Coșul e gol.' });
  }

  // Unde trimite Stripe clientul după plată sau renunțare
  const origin = `https://${req.headers.host}`;
  form.append('mode', 'payment');
  form.append('locale', 'ro');
  form.append('success_url', `${origin}/?plata=reusita`);
  form.append('cancel_url', `${origin}/?plata=anulata`);
  form.append('shipping_address_collection[allowed_countries][0]', 'RO'); // livrăm doar în România
  form.append('phone_number_collection[enabled]', 'true');                // curierul are nevoie de telefon
  if (areAcces) form.append('metadata[acces_anticipat]', 'da');

  try {
    const raspuns = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form
    });
    const sesiune = await raspuns.json();

    if (!raspuns.ok) {
      console.error('Eroare Stripe:', sesiune.error && sesiune.error.message);
      return res.status(502).json({ error: 'Plata nu s-a putut deschide. Încearcă din nou.' });
    }
    return res.status(200).json({ url: sesiune.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Plata nu s-a putut deschide. Încearcă din nou.' });
  }
};
