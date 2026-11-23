/* =========================================================
   Teste pentru api/checkout.js (plata prin Stripe).

   Nu se face nicio cerere reală: fetch e înlocuit cu un Stripe simulat,
   care răspunde ca Stripe în test mode și oprește testul dacă funcția
   ar încerca să contacteze orice altă adresă. Cheia folosită e una inventată,
   de forma sk_test_..., deci nici teoretic nu poate încasa bani.

   Rulare:  npm test
   ========================================================= */

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { PRODUCTS, PRECOMANDA } = require('../products.js');
const checkout = require('../api/checkout.js');

const fetchOriginal = global.fetch;
const envOriginal = { ...process.env };
let cereriStripe;       // ce a primit Stripe-ul simulat
let rezervariStripe;    // plăți „reușite” deja existente, pentru contorul de rezervări
let eroareStripe;       // dacă e setată, crearea sesiunii eșuează cu acest mesaj

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_simulat_pentru_teste';
  delete process.env.ACCES_ANTICIPAT_COD;
  cereriStripe = [];
  rezervariStripe = [];
  eroareStripe = null;

  global.fetch = async (url, optiuni = {}) => {
    assert.ok(String(url).startsWith('https://api.stripe.com/v1/'), `cerere neașteptată către ${url}`);
    const cale = String(url).slice('https://api.stripe.com/v1/'.length);
    cereriStripe.push({ cale, metoda: optiuni.method, antet: optiuni.headers, corp: optiuni.body ? Object.fromEntries(optiuni.body.entries()) : null });

    if (optiuni.method === 'GET') {
      return { ok: true, json: async () => ({ data: rezervariStripe.map((p, i) => ({ id: 'cs_test_' + i, metadata: { elen_produse: p } })), has_more: false }) };
    }
    if (eroareStripe) {
      return { ok: false, json: async () => ({ error: { message: eroareStripe } }) };
    }
    return { ok: true, json: async () => ({ id: 'cs_test_nou', url: 'https://checkout.stripe.com/c/pay/cs_test_nou' }) };
  };
});

afterEach(() => {
  global.fetch = fetchOriginal;
  process.env = { ...envOriginal };
});

// Apelează funcția ca Vercel: întoarce { status, body }
async function cere(body, metoda = 'POST') {
  let raspuns;
  const res = {
    status(cod) { this.cod = cod; return this; },
    json(date) { raspuns = { status: this.cod, body: date }; return this; }
  };
  await checkout({ method: metoda, body, headers: { host: 'elen.test' } }, res);
  return raspuns;
}

const sesiuneNoua = () => cereriStripe.find((c) => c.metoda === 'POST');
const produs = (id) => PRODUCTS.find((p) => p.id === id);

/* ---------- Succes ---------- */

test('plata integrală: 200 cu adresa Stripe, prețurile din products.js, în lei', async () => {
  const r = await cere({ items: [{ id: 'sola', qty: 2 }, { id: 'lido', qty: 1 }], tip: 'integral' });
  assert.equal(r.status, 200);
  assert.equal(r.body.url, 'https://checkout.stripe.com/c/pay/cs_test_nou');

  const s = sesiuneNoua();
  assert.equal(s.cale, 'checkout/sessions');
  assert.equal(s.antet.Authorization, 'Bearer sk_test_simulat_pentru_teste');
  assert.equal(s.corp['line_items[0][quantity]'], '2');
  assert.equal(s.corp['line_items[0][price_data][unit_amount]'], String(produs('sola').pretPrecomanda * 100));
  assert.equal(s.corp['line_items[0][price_data][currency]'], 'ron');
  assert.equal(s.corp['line_items[1][price_data][unit_amount]'], String(produs('lido').pretPrecomanda * 100));
  assert.equal(s.corp['metadata[elen_produse]'], 'sola:2,lido:1');
  assert.equal(s.corp['metadata[tip]'], 'integral');
  assert.equal(s.corp['metadata[rest_de_plata_lei]'], '0');
  assert.equal(s.corp.success_url, 'https://elen.test/?plata=reusita&sid={CHECKOUT_SESSION_ID}');
  assert.equal(s.corp.cancel_url, 'https://elen.test/?plata=anulata');
});

test('avans: se încasează avansul, restul apare în metadata', async () => {
  const r = await cere({ items: [{ id: 'sola', qty: 2 }], tip: 'avans' });
  assert.equal(r.status, 200);
  const s = sesiuneNoua();
  const avans = Math.min(PRECOMANDA.avans, produs('sola').pretPrecomanda);
  assert.equal(s.corp['line_items[0][price_data][unit_amount]'], String(avans * 100));
  assert.equal(s.corp['metadata[tip]'], 'avans');
  assert.equal(s.corp['metadata[rest_de_plata_lei]'], String((produs('sola').pretPrecomanda - avans) * 2));
});

test('prețul trimis din browser e ignorat', async () => {
  await cere({ items: [{ id: 'sola', qty: 1, pret: 1, pretPrecomanda: 1 }], tip: 'integral' });
  assert.equal(sesiuneNoua().corp['line_items[0][price_data][unit_amount]'], String(produs('sola').pretPrecomanda * 100));
});

test('același model trimis de două ori devine o singură linie', async () => {
  const r = await cere({ items: [{ id: 'sola', qty: 1 }, { id: 'sola', qty: 2 }], tip: 'integral' });
  assert.equal(r.status, 200);
  const s = sesiuneNoua();
  assert.equal(s.corp['line_items[0][quantity]'], '3');
  assert.equal(s.corp['line_items[1][quantity]'], undefined);
  assert.equal(s.corp['metadata[elen_produse]'], 'sola:3');
});

/* ---------- Validarea cantității ---------- */

for (const [descriere, items, mesaj] of [
  ['cantitate peste 10', [{ id: 'sola', qty: 11 }], /cel mult 10 bucăți din Sola/],
  ['duplicate care trec împreună de 10', [{ id: 'sola', qty: 10 }, { id: 'sola', qty: 1 }], /cel mult 10 bucăți din Sola/],
  ['cantitate cu zecimale', [{ id: 'sola', qty: 1.7 }], /Cantitatea pentru Sola nu e validă/],
  ['cantitate zero', [{ id: 'sola', qty: 0 }], /Cantitatea pentru Sola nu e validă/],
  ['cantitate negativă', [{ id: 'sola', qty: -2 }], /Cantitatea pentru Sola nu e validă/],
  ['cantitate care nu e număr', [{ id: 'sola', qty: 'doi' }], /Cantitatea pentru Sola nu e validă/],
  ['model inexistent lângă unul valid', [{ id: 'nu-exista', qty: 1 }, { id: 'lido', qty: 1 }], /model care nu mai există/]
]) {
  test(`respinge toată comanda: ${descriere}`, async () => {
    const r = await cere({ items, tip: 'integral' });
    assert.equal(r.status, 400);
    assert.match(r.body.error, mesaj);
    assert.equal(sesiuneNoua(), undefined, 'nu trebuie creată nicio sesiune de plată');
  });
}

test('coș gol: 400', async () => {
  for (const body of [{ items: [] }, {}, { items: 'sola' }]) {
    const r = await cere(body);
    assert.equal(r.status, 400);
    assert.equal(r.body.error, 'Coșul e gol.');
  }
  assert.equal(sesiuneNoua(), undefined);
});

/* ---------- Locurile din serie și accesul anticipat ---------- */

test('nu vinde peste locurile libere, nici cu linii duplicate', async () => {
  const riva = produs('riva');
  rezervariStripe = [`riva:${riva.serie - 1}`]; // mai e un singur loc
  const r = await cere({ items: [{ id: 'riva', qty: 1 }, { id: 'riva', qty: 1 }], tip: 'integral' });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /mai e liberă o singură bucată/);
  assert.equal(sesiuneNoua(), undefined);
});

test('seria rezervată complet: 409', async () => {
  rezervariStripe = [`lido:${produs('lido').serie}`];
  const r = await cere({ items: [{ id: 'lido', qty: 1 }], tip: 'integral' });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /s-a rezervat complet/);
});

test('model doar pentru abonați: 403 fără cod, 200 cu codul corect', async () => {
  const nora = produs('nora');
  const original = { accesAbonati: nora.accesAbonati, lansare: nora.lansare };
  nora.accesAbonati = new Date(Date.now() - 86400000).toISOString();
  nora.lansare = new Date(Date.now() + 86400000).toISOString();
  process.env.ACCES_ANTICIPAT_COD = 'COD-TEST';
  try {
    const fara = await cere({ items: [{ id: 'nora', qty: 1 }], tip: 'integral' });
    assert.equal(fara.status, 403);
    const gresit = await cere({ items: [{ id: 'nora', qty: 1 }], tip: 'integral', acces: 'ALT-COD' });
    assert.equal(gresit.status, 403);
    const corect = await cere({ items: [{ id: 'nora', qty: 1 }], tip: 'integral', acces: 'COD-TEST' });
    assert.equal(corect.status, 200);
  } finally {
    Object.assign(nora, original);
  }
});

/* ---------- Erori ---------- */

test('GET: 405', async () => {
  const r = await cere(undefined, 'GET');
  assert.equal(r.status, 405);
});

test('fără cheie Stripe: 500 cu mesaj pentru client, fără nicio cerere', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  const r = await cere({ items: [{ id: 'sola', qty: 1 }] });
  assert.equal(r.status, 500);
  assert.equal(r.body.error, 'Plata cu cardul nu e configurată încă.');
  assert.equal(cereriStripe.length, 0);
});

test('Stripe răspunde cu eroare: 502, fără să arate clientului mesajul Stripe', async () => {
  eroareStripe = 'Invalid API Key provided: sk_test_****';
  const r = await cere({ items: [{ id: 'sola', qty: 1 }], tip: 'integral' });
  assert.equal(r.status, 502);
  assert.equal(r.body.error, 'Plata nu s-a putut deschide. Încearcă din nou.');
  assert.doesNotMatch(JSON.stringify(r.body), /sk_test|API Key/);
});

test('Stripe nu poate fi contactat: 502', async () => {
  global.fetch = async () => { throw new TypeError('fetch failed'); };
  const r = await cere({ items: [{ id: 'sola', qty: 1 }], tip: 'integral' });
  assert.equal(r.status, 502);
  assert.equal(r.body.error, 'Plata nu s-a putut deschide. Încearcă din nou.');
});
