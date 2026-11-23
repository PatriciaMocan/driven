/* =========================================================
   Teste pentru țintele de atingere (style.css, secțiunea 19).

   Pe mobil (sub 900 px), controalele pe care le apeși trebuie să aibă
   cel puțin 44 × 44 px, să arate conturul de focus la tastatură și să se
   întunece ușor când sunt apăsate. Pe desktop totul rămâne ca înainte.

   Rulare:  npm test
   ========================================================= */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { porneste, deschide } = require('./_pagina.js');

const MIN = 44;
const TELEFON = { width: 375, height: 812 };
const TABLETA = { width: 768, height: 1024 };
const DESKTOP = { width: 1440, height: 900 };
const CULOARE_FOCUS = 'rgb(181, 83, 46)'; // --color-accent

let mediu;
before(async () => { mediu = await porneste(); });
after(async () => { if (mediu) await mediu.opreste(); });

const pagina = (cale, ecran) => deschide(mediu.browser, mediu.adresa, cale, ecran);

// Dimensiunile tuturor elementelor vizibile care se potrivesc cu selectorul
function dimensiuni(p, selector) {
  return p.$$eval(selector, (els) => els
    .filter((el) => el.getClientRects().length > 0)
    .map((el) => {
      const r = el.getBoundingClientRect();
      const nume = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return { nume, w: r.width, h: r.height };
    }));
}

async function verificaMinim(p, selector) {
  const lista = await dimensiuni(p, selector);
  assert.ok(lista.length > 0, `nu am găsit niciun element vizibil pentru ${selector}`);
  for (const el of lista) {
    assert.ok(el.w >= MIN && el.h >= MIN,
      `${selector} „${el.nume}” are ${el.w.toFixed(1)} × ${el.h.toFixed(1)} px, sub ${MIN} × ${MIN}`);
  }
}

// Pune un produs în coș și deschide coșul
async function deschideCosul(p) {
  await p.click('#product-grid [data-add]');
  await p.click('#bag-open');
  await p.waitForSelector('#bag[open] .qty button');
}

/* ---------- Dimensiuni pe mobil ---------- */

const PE_PAGINA = [
  '.main-nav a',
  '.bag-button',
  '.filter',
  '#size-filter',
  '#sort',
  '#product-grid .btn',
  '.faq summary',
  '.text-link',
  '.footer-links a'
];

for (const ecran of [TELEFON, TABLETA]) {
  test(`pagina principală: controalele au minim 44 × 44 px (${ecran.width} px)`, async () => {
    const p = await pagina('/', ecran);
    for (const selector of PE_PAGINA) await verificaMinim(p, selector);
    await p.close();
  });
}

test('fereastra produsului: butonul de închidere are minim 44 × 44 px', async () => {
  const p = await pagina('/', TELEFON);
  await p.click('#product-grid [data-view]');
  await p.waitForSelector('#quickview[open]');
  await verificaMinim(p, '#quickview .dialog-close');
  await p.close();
});

test('coșul: închidere, cantitate și opțiunile de plată au minim 44 × 44 px', async () => {
  const p = await pagina('/', TELEFON);
  await deschideCosul(p);
  await verificaMinim(p, '#bag .dialog-close');
  await verificaMinim(p, '#bag .qty button');
  // Butonul radio e mic, dar întreaga etichetă din jurul lui e ținta
  await verificaMinim(p, '#bag .pay-option');
  await verificaMinim(p, '#checkout-button');
  await p.close();
});

test('formularul de abonare: căsuța de acord are o etichetă de minim 44 px înălțime', async () => {
  const p = await pagina('/', TELEFON);
  const [eticheta] = await dimensiuni(p, 'label[for="consent"]');
  assert.ok(eticheta.h >= MIN, `eticheta are ${eticheta.h} px înălțime`);
  await p.close();
});

test('pagina „Cum le facem”: navigarea și subsolul au minim 44 × 44 px', async () => {
  const p = await pagina('/cum-le-facem.html', TELEFON);
  await verificaMinim(p, '.main-nav a');
  await verificaMinim(p, '.footer-links a');
  await p.close();
});

test('linkurile din interiorul frazelor rămân neschimbate pe mobil', async () => {
  const p = await pagina('/', TELEFON);
  const stiluri = await p.$$eval('.vat-note a, .size-help a', (els) =>
    els.map((el) => ({ display: getComputedStyle(el).display, minHeight: getComputedStyle(el).minHeight })));
  assert.ok(stiluri.length >= 2);
  for (const s of stiluri) {
    assert.equal(s.display, 'inline');
    assert.equal(s.minHeight, '0px');
  }
  await p.close();
});

/* ---------- Desktopul rămâne la fel ----------
   Valorile au fost măsurate înainte de schimbare, la 1440 px (lățime × înălțime, în px). */
const DESKTOP_INAINTE = {
  '.main-nav a': [56.4, 23.1],
  '.bag-button': [54.8, 31.1],
  '.filter': [69.9, 38.8],
  '#size-filter': [161, 36],
  '#sort': [181, 36],
  '#product-grid .btn': [126.6, 39.6],
  '.faq summary': [736, 26.4],
  '.faq details': [736, 59.4],
  '.text-link': [159.1, 20],
  '.footer-links a': [67.8, 18]
};

test('desktop: dimensiunile controalelor sunt cele de dinainte', async () => {
  const p = await pagina('/', DESKTOP);
  for (const [selector, [w, h]] of Object.entries(DESKTOP_INAINTE)) {
    const [el] = await dimensiuni(p, selector);
    assert.ok(Math.abs(el.w - w) <= 1 && Math.abs(el.h - h) <= 1,
      `${selector}: ${el.w.toFixed(1)} × ${el.h.toFixed(1)}, așteptat ${w} × ${h}`);
  }
  await deschideCosul(p);
  const [qty] = await dimensiuni(p, '#bag .qty button');
  assert.deepEqual([qty.w, qty.h], [32, 32]);
  await p.close();
});

/* ---------- Focus de la tastatură ---------- */

// Apasă Tab până ajunge focusul pe primul element care se potrivește
async function tabPana(p, selector) {
  for (let i = 0; i < 80; i += 1) {
    await p.keyboard.press('Tab');
    if (await p.evaluate((s) => document.activeElement && document.activeElement.matches(s), selector)) return;
  }
  throw new Error(`focusul nu a ajuns pe ${selector}`);
}

const contur = (p) => p.evaluate(() => {
  const s = getComputedStyle(document.activeElement);
  return { stil: s.outlineStyle, culoare: s.outlineColor, latime: s.outlineWidth };
});

for (const ecran of [TELEFON, DESKTOP]) {
  test(`focus: conturul terracotta apare la tastatură (${ecran.width} px)`, async () => {
    const p = await pagina('/', ecran);
    for (const selector of ['.main-nav a', '.bag-button', '.filter', '#product-grid .btn', '.faq summary', '.footer-links a']) {
      await tabPana(p, selector);
      const c = await contur(p);
      assert.equal(c.stil, 'solid', `${selector} nu are contur de focus`);
      assert.equal(c.culoare, CULOARE_FOCUS, `${selector} are conturul de altă culoare`);
      assert.equal(c.latime, '2px');
    }
    await p.close();
  });
}

/* ---------- Starea apăsată (:active) ---------- */

// Citește o proprietate CSS înainte și în timp ce butonul mouse-ului e ținut apăsat pe element
async function inainteSiApasat(p, selector, proprietate) {
  const el = await p.waitForSelector(selector);
  await el.scrollIntoViewIfNeeded();
  await el.hover();
  const inainte = await el.evaluate((e, prop) => getComputedStyle(e)[prop], proprietate);
  await p.mouse.down();
  const apasat = await el.evaluate((e, prop) => getComputedStyle(e)[prop], proprietate);
  await p.mouse.up();
  return { inainte, apasat };
}

test('mobil: controalele se întunecă ușor când sunt apăsate', async () => {
  const p = await pagina('/', TELEFON);

  const navigare = await inainteSiApasat(p, '.main-nav a', 'opacity');
  assert.equal(navigare.inainte, '1');
  assert.equal(navigare.apasat, '0.7');

  const filtru = await inainteSiApasat(p, '.filter:not(.is-active)', 'backgroundColor');
  assert.notEqual(filtru.apasat, filtru.inainte, 'filtrul nu își schimbă fundalul la apăsare');
  assert.equal(filtru.apasat, 'rgba(29, 27, 25, 0.08)');

  const filtruActiv = await inainteSiApasat(p, '.filter.is-active', 'backgroundColor');
  assert.equal(filtruActiv.apasat, 'rgb(0, 0, 0)');

  const buton = await inainteSiApasat(p, '#product-grid .btn-outline', 'backgroundColor');
  assert.equal(buton.apasat, 'rgba(29, 27, 25, 0.08)');

  const intrebare = await inainteSiApasat(p, '.faq summary', 'color');
  assert.notEqual(intrebare.apasat, intrebare.inainte);

  // În coș
  await deschideCosul(p);
  const cantitate = await inainteSiApasat(p, '#bag .qty button[data-qty="1"]', 'backgroundColor');
  assert.equal(cantitate.apasat, 'rgb(233, 223, 208)'); // --color-beige
  const plata = await inainteSiApasat(p, '#checkout-button', 'backgroundColor');
  assert.equal(plata.apasat, 'rgb(147, 64, 31)');

  await p.close();
});

test('desktop: apăsarea nu adaugă efecte noi', async () => {
  const p = await pagina('/', DESKTOP);
  const navigare = await inainteSiApasat(p, '.main-nav a', 'opacity');
  assert.equal(navigare.apasat, '1');
  const filtru = await inainteSiApasat(p, '.filter:not(.is-active)', 'backgroundColor');
  assert.equal(filtru.apasat, filtru.inainte);
  await p.close();
});

/* ---------- Funcționalitatea rămâne aceeași ---------- */

test('mobil: filtrele încă filtrează și își marchează starea', async () => {
  const p = await pagina('/', TELEFON);
  await p.click('.filter[data-filter="metal"]');
  const stare = await p.evaluate(() => ({
    apasat: document.querySelector('.filter[data-filter="metal"]').getAttribute('aria-pressed'),
    activ: document.querySelector('.filter[data-filter="metal"]').classList.contains('is-active'),
    toate: document.querySelector('.filter[data-filter="toate"]').getAttribute('aria-pressed'),
    produse: [...document.querySelectorAll('#product-grid .product-name')].map((e) => e.textContent)
  }));
  assert.equal(stare.apasat, 'true');
  assert.equal(stare.activ, true);
  assert.equal(stare.toate, 'false');
  assert.deepEqual(stare.produse, ['Lido']);
  await p.close();
});
