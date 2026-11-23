/* =========================================================
   Teste pentru linkuri și pentru informațiile încă lipsă.

   1. Linkurile interne de pe paginile publice duc la pagini și secțiuni care există.
   2. Linkurile legale din subsol duc la paginile legale, pe toate paginile.
   3. Placeholderele: testul „fără placeholdere” e marcat TODO cât timp datele
      reale lipsesc (vezi docs/date-de-completat.md). Rulează și listează ce mai
      lipsește, dar nu oprește suita. După ce completezi datele, scoate `todo`.
   4. Linkurile externe (ANPC, Instagram) se verifică doar cu VERIFICA_EXTERN=1,
      fiindcă au nevoie de internet:  VERIFICA_EXTERN=1 npm test

   Rulare:  npm test
   ========================================================= */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { porneste, deschide } = require('./_pagina.js');

const PAGINI = ['/index.html', '/cum-le-facem.html', '/termeni.html', '/livrare-retur.html', '/confidentialitate.html'];
const LEGALE = {
  'Termeni și condiții': 'termeni.html',
  'Livrare și retur': 'livrare-retur.html',
  'Politica de confidențialitate': 'confidentialitate.html'
};
const ECRAN = { width: 1280, height: 900 };

let mediu;
before(async () => { mediu = await porneste(); });
after(async () => { if (mediu) await mediu.opreste(); });

// Toate linkurile de pe o pagină: href așa cum e scris și adresa completă
function linkuri(p) {
  return p.$$eval('a[href]', (els) => els.map((a) => ({
    text: a.textContent.trim().replace(/\s+/g, ' '),
    href: a.getAttribute('href'),
    absolut: a.href,
    buton: a.hasAttribute('data-cookie-settings') // „Setări cookie” e un buton JavaScript, nu un link
  })));
}

/* ---------- 1. Linkuri interne ---------- */

for (const cale of PAGINI) {
  test(`${cale}: fiecare link intern duce la o pagină și o secțiune care există`, async () => {
    const p = await deschide(mediu.browser, mediu.adresa, cale, ECRAN);
    const lista = await linkuri(p);
    await p.close();

    for (const l of lista) {
      if (l.buton) continue;
      assert.notEqual(l.href, '#', `„${l.text}” duce la # (nicăieri)`);
      const url = new URL(l.absolut);
      if (url.origin !== mediu.adresa) continue; // externe: testul 4

      const raspuns = await fetch(url.origin + url.pathname);
      assert.equal(raspuns.status, 200, `„${l.text}” → ${l.href} nu există`);

      if (url.hash && url.hash !== '#cos') { // #cos deschide coșul, nu e o secțiune
        const html = await raspuns.text();
        assert.ok(html.includes(`id="${url.hash.slice(1)}"`), `„${l.text}” → ${l.href}: secțiunea ${url.hash} nu există`);
      }
    }
  });
}

/* ---------- 2. Linkurile legale ---------- */

for (const cale of PAGINI) {
  test(`${cale}: subsolul are cele trei linkuri legale, spre paginile reale`, async () => {
    const p = await deschide(mediu.browser, mediu.adresa, cale, ECRAN);
    const dinSubsol = await p.$$eval('.footer-legal a', (els) => els.map((a) => [a.textContent.trim(), a.getAttribute('href')]));
    await p.close();
    for (const [text, fisier] of Object.entries(LEGALE)) {
      assert.ok(dinSubsol.some(([t, h]) => t === text && h === fisier), `lipsește „${text}” → ${fisier}`);
    }
  });
}

for (const [titlu, fisier] of Object.entries(LEGALE)) {
  test(`${fisier}: pagina există, are titlul corect și antetul site-ului`, async () => {
    const p = await deschide(mediu.browser, mediu.adresa, '/' + fisier, ECRAN);
    assert.equal((await p.textContent('h1')).trim(), titlu);
    assert.equal(await p.title(), `${titlu} — Elen Sunglasses`);
    assert.ok(await p.isVisible('.site-header .logo'));
    assert.equal(await p.getAttribute(`.footer-legal a[href="${fisier}"]`, 'aria-current'), 'page');
    await p.close();
  });
}

/* ---------- 3. Placeholdere ---------- */

// Tot ce vede vizitatorul sau un motor de căutare: textul paginii, linkurile, meta-etichetele
async function continutPublic(cale) {
  const p = await deschide(mediu.browser, mediu.adresa, cale, ECRAN);
  // Deschidem întrebările frecvente, ca textul lor să intre în verificare
  await p.$$eval('details', (els) => els.forEach((d) => { d.open = true; }));
  const date = await p.evaluate(() => ({
    text: document.body.innerText,
    hrefuri: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    meta: [...document.querySelectorAll('meta[content]')].map((m) => m.getAttribute('content'))
  }));
  await p.close();
  return date;
}

const PLACEHOLDERE = [
  ['[EDIT ME]', (d) => d.text.includes('[EDIT ME]')],
  ['[DE COMPLETAT]', (d) => d.text.includes('[DE COMPLETAT]')],
  ['email de exemplu (example.com)', (d) => /example\.(com|org|net)/i.test(d.text + d.hrefuri.join(' '))],
  ['Instagram fără cont', (d) => d.hrefuri.some((h) => /^https?:\/\/(www\.)?instagram\.com\/?$/.test(h))],
  ['pagina legală fără text (noindex)', (d) => d.meta.includes('noindex')]
];

// Ce placeholdere mai sunt pe fiecare pagină: { '/index.html': ['[EDIT ME]', ...], ... }
async function placeholdereRamase() {
  const rezultat = {};
  for (const cale of PAGINI) {
    const d = await continutPublic(cale);
    const gasite = PLACEHOLDERE.filter(([, gasit]) => gasit(d)).map(([nume]) => nume);
    if (gasite.length) rezultat[cale] = gasite;
  }
  return rezultat;
}

for (const fisier of Object.values(LEGALE)) {
  test(`${fisier}: nicio secțiune goală; ce lipsește e marcat vizibil`, async () => {
    const p = await deschide(mediu.browser, mediu.adresa, '/' + fisier, ECRAN);
    const stare = await p.evaluate(() => ({
      sectiuni: [...document.querySelectorAll('.legal-section')].map((s) => ({
        titlu: s.querySelector('h2') ? s.querySelector('h2').textContent.trim() : '',
        text: [...s.querySelectorAll('p, li')].map((e) => e.innerText.trim()).join(' '),
        marcaj: [...s.querySelectorAll('.de-completat')].map((e) => ({
          vizibil: e.getClientRects().length > 0,
          text: e.innerText.trim()
        }))
      })),
      marcajSus: !!document.querySelector('.legal > .de-completat'),
      dataActualizare: document.querySelector('.legal-updated').innerText.trim()
    }));
    await p.close();

    assert.ok(stare.sectiuni.length > 0, 'pagina nu are secțiuni');
    let incomplete = 0;
    for (const s of stare.sectiuni) {
      assert.ok(s.titlu, 'secțiune fără titlu');
      assert.ok(s.text.length > 0, `secțiunea „${s.titlu}” e goală`);
      for (const m of s.marcaj) {
        assert.ok(m.vizibil, `marcajul din „${s.titlu}” nu se vede`);
        assert.match(m.text, /^\[DE COMPLETAT\]/);
        incomplete += 1;
      }
    }
    // Cât timp lipsește ceva, pagina o spune sus; după completare, marcajul de sus dispare și el
    if (incomplete > 0) {
      assert.ok(stare.marcajSus, 'pagina incompletă trebuie să aibă marcajul de sus');
    } else {
      assert.ok(!stare.marcajSus, 'toate secțiunile sunt completate: scoate și marcajul de sus');
      assert.doesNotMatch(stare.dataActualizare, /DE COMPLETAT/, 'completează data ultimei actualizări');
    }
  });
}

test('nicio pagină publică nu mai are placeholdere', {
  todo: 'Datele reale lipsesc încă (docs/date-de-completat.md). Scoate `todo` după ce le completezi.'
}, async () => {
  const ramase = await placeholdereRamase();
  assert.deepEqual(ramase, {}, 'Mai sunt de completat: ' + JSON.stringify(ramase, null, 2));
});

/* ---------- 4. Linkuri externe (doar cu internet) ---------- */

test('linkurile externe răspund', {
  skip: process.env.VERIFICA_EXTERN === '1' ? false : 'Pornește cu VERIFICA_EXTERN=1 (are nevoie de internet).'
}, async () => {
  const externe = new Set();
  for (const cale of PAGINI) {
    const p = await deschide(mediu.browser, mediu.adresa, cale, ECRAN);
    for (const l of await linkuri(p)) {
      if (/^https?:/.test(l.href)) externe.add(l.href);
    }
    await p.close();
  }
  for (const url of externe) {
    const raspuns = await fetch(url, { method: 'GET', redirect: 'follow' });
    assert.ok(raspuns.status < 400, `${url} răspunde ${raspuns.status}`);
  }
});
