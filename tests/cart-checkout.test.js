/* =========================================================
   Teste de browser: CTA-uri, coș și checkout (pagina principală).

   Nicio plată reală: în testele de checkout, /api/checkout e simulat
   și „pagina Stripe” e o pagină de test de pe serverul local.
   Modul 'stripe' e pornit doar în browserul de test (script.js din proiect
   rămâne în modul 'demo').

   Rulare:  npm test
   ========================================================= */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { porneste, deschide } = require('./_pagina.js');
const { PRODUCTS, PRECOMANDA } = require('../products.js');

const TELEFON = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };
const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

let mediu;
before(async () => { mediu = await porneste(); });
after(async () => { if (mediu) await mediu.opreste(); });

const produs = (id) => PRODUCTS.find((p) => p.id === id);
const lei = (n) => new Intl.NumberFormat('ro-RO').format(n) + ' lei';

function pagina(cale, ecran = TELEFON, rute) {
  return deschide(mediu.browser, mediu.adresa, cale, ecran, rute);
}

// E elementul în ecran? (după un link spre o secțiune)
async function inEcran(p, selector) {
  await p.waitForFunction((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return r.top >= -2 && r.top < window.innerHeight;
  }, selector, { timeout: 5000 });
  return true;
}

const continutCos = (p) => p.evaluate(() => ({
  randuri: [...document.querySelectorAll('#bag-items .bag-item')].map((li) => ({
    nume: li.querySelector('.bag-item-name').textContent,
    qty: li.querySelector('.qty span').textContent,
    pret: li.querySelector('.bag-item-price').textContent
  })),
  numar: document.getElementById('bag-count').textContent,
  subtotal: document.getElementById('bag-subtotal').textContent,
  gol: !document.getElementById('bag-empty').hidden,
  salvat: JSON.parse(localStorage.getItem('elen-cos') || '[]'),
  mesaj: document.getElementById('toast').textContent
}));

/* ---------- Navigarea CTA ---------- */

for (const ecran of [TELEFON, DESKTOP]) {
  test(`CTA hero „Precomandă din prima serie” duce la magazin (${ecran.width} px)`, async () => {
    const p = await pagina('/', ecran);
    await p.click('.hero .btn');
    assert.equal(await p.evaluate(() => location.hash), '#magazin');
    assert.ok(await inEcran(p, '#magazin'));
    await p.close();
  });
}

test('CTA „Precomandă” de pe card adaugă în coș și anunță', async () => {
  const p = await pagina('/');
  await p.click('#product-grid [data-add="sola"]');
  const c = await continutCos(p);
  assert.equal(c.numar, '1');
  assert.equal(c.mesaj, 'Sola a fost adăugat în coș');
  await p.close();
});

test('CTA „Precomandă” din fereastra produsului adaugă și închide fereastra', async () => {
  const p = await pagina('/');
  await p.click('#product-grid [data-view="lido"]');
  await p.click('#qv-add');
  assert.equal(await p.evaluate(() => document.getElementById('quickview').open), false);
  assert.equal((await continutCos(p)).numar, '1');
  await p.close();
});

test('serie rezervată complet: CTA devine „Anunță-mă la seria 2” și duce la abonare', async () => {
  const p = await pagina('/');
  // Simulăm că toată seria Lido e rezervată
  await p.evaluate((serie) => { rezervate.lido = serie; afiseazaProduse(); }, produs('lido').serie);
  const cta = p.locator('#product-grid .product-card', { hasText: 'Lido' }).locator('a.btn');
  assert.equal((await cta.textContent()).trim(), 'Anunță-mă la seria 2');
  await cta.click();
  assert.equal(await p.evaluate(() => location.hash), '#abonare');
  assert.ok(await inEcran(p, '#abonare'));
  await p.close();
});

test('„Cum le facem”: CTA duce la magazin, „Coș” deschide coșul pe pagina principală', async () => {
  let p = await pagina('/cum-le-facem.html');
  await p.click('.page-cta .btn');
  await p.waitForURL(/index\.html#magazin$/);
  assert.ok(await inEcran(p, '#magazin'));
  await p.close();

  p = await pagina('/cum-le-facem.html');
  await p.click('.bag-button');
  await p.waitForURL(/index\.html#cos$/);
  assert.equal(await p.evaluate(() => document.getElementById('bag').open), true);
  await p.close();
});

/* ---------- Conținutul coșului ---------- */

test('coșul arată produsele, cantitățile, subtotalul și cele două variante de plată', async () => {
  const p = await pagina('/');
  await p.click('#product-grid [data-add="sola"]');
  await p.click('#product-grid [data-add="sola"]');
  await p.click('#product-grid [data-add="lido"]');
  await p.click('#bag-open');

  const sola = produs('sola');
  const lido = produs('lido');
  const total = sola.pretPrecomanda * 2 + lido.pretPrecomanda;
  const avans = Math.min(PRECOMANDA.avans, sola.pretPrecomanda) * 2 + Math.min(PRECOMANDA.avans, lido.pretPrecomanda);

  const c = await continutCos(p);
  assert.deepEqual(c.randuri, [
    { nume: 'Sola', qty: '2', pret: lei(sola.pretPrecomanda * 2) },
    { nume: 'Lido', qty: '1', pret: lei(lido.pretPrecomanda) }
  ]);
  assert.equal(c.numar, '3');
  assert.equal(c.subtotal, lei(total));
  assert.deepEqual(c.salvat, [{ id: 'sola', qty: 2 }, { id: 'lido', qty: 1 }]);

  const optiuni = await p.$$eval('.pay-option', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  assert.match(optiuni[0], new RegExp(`Avans ${lei(avans)} acum`));
  assert.match(optiuni[0], new RegExp(`Restul de ${lei(total - avans)} la livrare`));
  assert.match(optiuni[1], new RegExp(`Tot acum, ${lei(total)}`));
  await p.close();
});

test('coșul rămâne după reîncărcarea paginii', async () => {
  const p = await pagina('/');
  await p.click('#product-grid [data-add="marea"]');
  await p.reload();
  const c = await continutCos(p);
  assert.equal(c.numar, '1');
  assert.deepEqual(c.salvat, [{ id: 'marea', qty: 1 }]);
  await p.close();
});

/* ---------- Validarea cantității ---------- */

test('„+” se oprește la 10 bucăți', async () => {
  const p = await pagina('/');
  await p.click('#product-grid [data-add="sola"]');
  await p.click('#bag-open');
  for (let i = 0; i < 12; i += 1) await p.click('#bag .qty button[data-qty="1"]');
  const c = await continutCos(p);
  assert.equal(c.randuri[0].qty, '10');
  assert.equal(c.numar, '10');
  await p.close();
});

test('„+” se oprește la locurile libere din serie', async () => {
  const p = await pagina('/');
  await p.evaluate((serie) => { rezervate.riva = serie - 2; afiseazaProduse(); }, produs('riva').serie);
  await p.click('#product-grid [data-add="riva"]');
  await p.click('#bag-open');
  for (let i = 0; i < 5; i += 1) await p.click('#bag .qty button[data-qty="1"]');
  assert.equal((await continutCos(p)).randuri[0].qty, '2');
  await p.close();
});

test('„−” până la zero scoate produsul și golește coșul', async () => {
  const p = await pagina('/');
  await p.click('#product-grid [data-add="sola"]');
  await p.click('#bag-open');
  await p.click('#bag .qty button[data-qty="-1"]');
  const c = await continutCos(p);
  assert.equal(c.randuri.length, 0);
  assert.equal(c.numar, '0');
  assert.equal(c.gol, true);
  await p.close();
});

test('link de coș cu același model de două ori: un singur rând, cel mult 10, cu mesaj', async () => {
  const p = await pagina('/?cos=sola:10,sola:10#cos');
  const c = await continutCos(p);
  assert.deepEqual(c.randuri.map((r) => [r.nume, r.qty]), [['Sola', '10']]);
  assert.equal(c.numar, '10');
  assert.equal(c.mesaj, 'Am ajustat cantitățile din coș.');
  await p.close();
});

test('coș salvat cu cantități greșite: corectat la reîncărcare, cu mesaj', async () => {
  const p = await pagina('/');
  await p.evaluate(() => localStorage.setItem('elen-cos', JSON.stringify([
    { id: 'lido', qty: 2.5 }, { id: 'marea', qty: 50 }, { id: 'nu-exista', qty: 1 }, { id: 'sola', qty: -1 }
  ])));
  await p.reload();
  const c = await continutCos(p);
  assert.deepEqual(c.randuri.map((r) => [r.nume, r.qty]), [['Lido', '2'], ['Marea', '10']]);
  assert.deepEqual(c.salvat, [{ id: 'lido', qty: 2 }, { id: 'marea', qty: 10 }]);
  assert.equal(c.mesaj, 'Am ajustat cantitățile din coș.');

  // După corectare, o nouă reîncărcare nu mai arată mesajul
  await p.reload();
  assert.equal((await continutCos(p)).mesaj, '');
  await p.close();
});

test('coș salvat corect: niciun mesaj de ajustare', async () => {
  const p = await pagina('/');
  await p.evaluate(() => localStorage.setItem('elen-cos', JSON.stringify([{ id: 'lido', qty: 2 }])));
  await p.reload();
  const c = await continutCos(p);
  assert.deepEqual(c.salvat, [{ id: 'lido', qty: 2 }]);
  assert.equal(c.mesaj, '');
  await p.close();
});

/* ---------- Checkout ---------- */

// Pagina în modul 'stripe' (doar în test), cu /api/checkout simulat de `raspunde`
async function paginaStripe(raspunde) {
  const cereri = [];
  const p = await pagina('/', TELEFON, async (route, url) => {
    if (url.pathname === '/script.js') {
      await route.fulfill({ contentType: 'text/javascript', body: SCRIPT.replace("card: 'demo'", "card: 'stripe'") });
      return true;
    }
    if (url.pathname === '/api/checkout') {
      cereri.push(JSON.parse(route.request().postData()));
      await raspunde(route);
      return true;
    }
    if (url.pathname === '/stripe-test') {
      await route.fulfill({ contentType: 'text/html', body: '<title>Stripe (test)</title>' });
      return true;
    }
    if (url.pathname.startsWith('/api/')) {
      await route.fulfill({ status: 404, body: '' });
      return true;
    }
    return false;
  });
  return { p, cereri };
}

async function laCheckout(p) {
  await p.click('#product-grid [data-add="sola"]');
  await p.click('#product-grid [data-add="sola"]');
  await p.click('#bag-open');
}

test('checkout reușit: trimite coșul și deschide pagina de plată', async () => {
  const { p, cereri } = await paginaStripe((route) => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ url: mediu.adresa + '/stripe-test' })
  }));
  await laCheckout(p);
  await p.check('[name="plata"][value="integral"]');
  await p.click('#checkout-button');
  await p.waitForURL(/\/stripe-test$/);

  assert.equal(cereri.length, 1);
  assert.deepEqual(cereri[0].items, [{ id: 'sola', qty: 2 }]);
  assert.equal(cereri[0].tip, 'integral');
  await p.close();
});

test('checkout respins de server (409): mesajul serverului, butonul revine', async () => {
  const { p } = await paginaStripe((route) => route.fulfill({
    status: 409, contentType: 'application/json',
    body: JSON.stringify({ error: 'Din prima serie Sola mai e liberă o singură bucată.' })
  }));
  await laCheckout(p);
  await p.click('#checkout-button');
  await p.waitForFunction(() => document.getElementById('bag-message').textContent !== '');
  assert.equal(await p.textContent('#bag-message'), 'Din prima serie Sola mai e liberă o singură bucată.');
  assert.equal(await p.isEnabled('#checkout-button'), true);
  assert.equal((await p.textContent('#checkout-button')).trim(), 'Precomandă');
  assert.equal((await continutCos(p)).numar, '2', 'coșul trebuie să rămână');
  await p.close();
});

for (const [descriere, raspunde] of [
  ['pagină de eroare HTML (504)', (route) => route.fulfill({ status: 504, contentType: 'text/html', body: '<html>An error occurred with this application.</html>' })],
  ['răspuns fără adresă de plată', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })],
  ['fără conexiune', (route) => route.abort('internetdisconnected')]
]) {
  test(`checkout eșuat (${descriere}): mesaj simplu, fără detalii tehnice`, async () => {
    const { p } = await paginaStripe(raspunde);
    await laCheckout(p);
    await p.click('#checkout-button');
    await p.waitForFunction(() => document.getElementById('bag-message').textContent !== '');
    assert.equal(await p.textContent('#bag-message'), 'Plata nu s-a deschis. Încearcă din nou peste un minut.');
    assert.equal(await p.isEnabled('#checkout-button'), true);
    await p.close();
  });
}

test('modul demo (setarea din proiect): niciun apel la /api/checkout, mesaj clar', async () => {
  let apelat = false;
  const p = await pagina('/', TELEFON, async (route, url) => {
    if (url.pathname === '/api/checkout') { apelat = true; await route.fulfill({ status: 500, body: '' }); return true; }
    return false;
  });
  await laCheckout(p);
  await p.click('#checkout-button');
  assert.equal(await p.textContent('#bag-message'), 'Plata nu e conectată încă. Vezi README ca să conectezi Stripe.');
  assert.equal(apelat, false);
  await p.close();
});

test('întoarcere de la Stripe: reușită golește coșul, anulată îl păstrează', async () => {
  let p = await pagina('/');
  await p.evaluate(() => localStorage.setItem('elen-cos', JSON.stringify([{ id: 'sola', qty: 1 }])));
  await p.goto(mediu.adresa + '/?plata=anulata');
  assert.equal((await continutCos(p)).numar, '1');
  assert.equal(await p.evaluate(() => location.search), '', 'adresa trebuie curățată');

  await p.goto(mediu.adresa + '/?plata=reusita&sid=cs_test_x');
  const c = await continutCos(p);
  assert.equal(c.numar, '0');
  assert.deepEqual(c.salvat, []);
  assert.match(c.mesaj, /Precomanda e confirmată/);
  await p.close();
});
