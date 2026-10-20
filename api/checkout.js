/* =========================================================
   Precomandă cu plata prin card, prin Stripe (o funcție serverless Vercel)
   Folosită doar când PLATA.card este 'stripe' în script.js.

   Browserul trimite { items: [{ id, qty }], tip: 'integral' | 'avans', acces: 'COD', email? }. Funcția:
     - ia prețurile din products.js (nu din browser)
     - verifică dacă mai sunt locuri în prima serie (din plățile reale din Stripe)
     - verifică codul de acces anticipat pentru modelele încă nelansate
     - cere de la Stripe o pagină de plată în lei și trimite înapoi adresa ei
   Cheia secretă nu ajunge niciodată în browser.

   Setare (o singură dată), în Vercel > proiectul tău > Settings > Environment Variables:
     STRIPE_SECRET_KEY     cheia de la https://dashboard.stripe.com/apikeys (începe cu sk_test_ sau sk_live_)
     ACCES_ANTICIPAT_COD   codul din linkul trimis abonaților (ex. NORA-ABONATI)
   Nu e nevoie de npm install: funcția vorbește direct cu API-ul Stripe.
   ========================================================= */

const { PRODUCTS, PRECOMANDA, locuriLibere, etapaLansare } = require('../products.js');
const { stripe, numaraRezervari } = require('./_stripe.js');
const { emailValid, normalizeaza } = require('./_email.js');

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
  const avans = body.tip === 'avans';
  const codCorect = process.env.ACCES_ANTICIPAT_COD;
  const areAcces = Boolean(codCorect) && body.acces === codCorect;

  try {
    const rezervate = await numaraRezervari();

    // Stripe vrea câmpuri de forma line_items[0][quantity]=1
    const form = new URLSearchParams();
    const produseComandate = [];
    let restDePlata = 0;
    let linie = 0;

    for (const item of items) {
      const produs = PRODUCTS.find((p) => p.id === item.id);
      const qty = Math.floor(Number(item.qty));
      if (!produs || !(qty >= 1 && qty <= MAX_BUCATI)) continue; // ignorăm ce nu e în regulă

      const etapa = etapaLansare(produs);
      if (etapa === 'curand' || (etapa === 'abonati' && !areAcces)) {
        return res.status(403).json({ error: `${produs.nume} nu se poate precomanda încă. Ai nevoie de linkul de acces anticipat.` });
      }
      const libere = locuriLibere(produs, rezervate[produs.id]);
      if (libere <= 0) {
        return res.status(409).json({ error: `Prima serie ${produs.nume} s-a rezervat complet.` });
      }
      if (qty > libere) {
        return res.status(409).json({ error: libere === 1
          ? `Din prima serie ${produs.nume} mai e liberă o singură bucată.`
          : `Din prima serie ${produs.nume} mai sunt libere doar ${bucati(libere)}.` });
      }

      // Cu avans: plătește acum avansul (dar niciodată mai mult decât prețul), restul la livrare
      const deIncasat = avans ? Math.min(PRECOMANDA.avans, produs.pretPrecomanda) : produs.pretPrecomanda;
      restDePlata += (produs.pretPrecomanda - deIncasat) * qty;
      const nume = avans
        ? `Avans precomandă ${produs.nume} — ${produs.culoare}`
        : `Precomandă ${produs.nume} — ${produs.culoare}`;

      form.append(`line_items[${linie}][quantity]`, String(qty));
      form.append(`line_items[${linie}][price_data][currency]`, 'ron');
      form.append(`line_items[${linie}][price_data][unit_amount]`, String(deIncasat * 100)); // în bani
      form.append(`line_items[${linie}][price_data][product_data][name]`, nume);
      produseComandate.push(`${produs.id}:${qty}`);
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
    // Ultima frază îi spune clientului că agentul de vânzări îi poate scrie despre modele noi (vezi README)
    form.append('custom_text[submit][message]', (avans
      ? `Plătești acum avansul. Restul de ${restDePlata.toLocaleString('ro-RO')} lei îl plătești la livrare, în ${PRECOMANDA.livrare}.`
      : `Precomandă: livrare în ${PRECOMANDA.livrare}.`) +
      ' Îți putem scrie despre modelele noi Elen; te poți dezabona din orice email.');

    // Folosite de contorul de rezervări și ca să știi ce ai de livrat și de încasat
    form.append('metadata[elen_produse]', produseComandate.join(','));
    form.append('metadata[tip]', avans ? 'avans' : 'integral');
    form.append('metadata[rest_de_plata_lei]', String(restDePlata));
    form.append('metadata[livrare]', PRECOMANDA.livrare);
    if (areAcces) form.append('metadata[acces_anticipat]', 'da');

    // Emailul lăsat în coș: completat deja pe pagina de plată, iar agentul de vânzări
    // știe că acel coș s-a plătit și nu mai trimite emailuri despre el
    if (emailValid(body.email)) {
      form.append('customer_email', normalizeaza(body.email));
      form.append('metadata[cos_email]', normalizeaza(body.email));
    }

    const sesiune = await stripe('checkout/sessions', { method: 'POST', body: form });
    return res.status(200).json({ url: sesiune.url });
  } catch (error) {
    console.error('Eroare la plată:', error.message);
    return res.status(502).json({ error: 'Plata nu s-a putut deschide. Încearcă din nou.' });
  }
};
