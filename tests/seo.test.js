/* =========================================================
   Teste pentru Google Search Console: sitemap, robots.txt, canonical.

   1. Fiecare adresă din sitemap.xml e o pagină care există și nu are „noindex”.
   2. Fiecare pagină fără „noindex” e în sitemap și are un canonical identic.
   3. robots.txt nu blochează paginile din sitemap și arată spre sitemap,
      pe același domeniu.

   Rulare:  npm test
   ========================================================= */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RADACINA = path.join(__dirname, '..');
const citeste = (f) => fs.readFileSync(path.join(RADACINA, f), 'utf8');

const sitemap = citeste('sitemap.xml');
const ADRESE = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
const DOMENIU = new URL(ADRESE[0]).origin;

// adresa publică → fișierul din proiect
const fisier = (adresa) => {
  const cale = new URL(adresa).pathname;
  return cale === '/' ? 'index.html' : cale.slice(1);
};
const areNoindex = (html) => /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
const canonical = (html) => (html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i) || [])[1];

test('sitemap.xml: fiecare adresă e o pagină care există, fără noindex, pe același domeniu', () => {
  assert.ok(ADRESE.length > 0, 'sitemap.xml nu are nicio adresă');
  for (const a of ADRESE) {
    assert.equal(new URL(a).origin, DOMENIU, `${a} e pe alt domeniu decât restul sitemap-ului`);
    const f = fisier(a);
    assert.ok(fs.existsSync(path.join(RADACINA, f)), `${a} → ${f} nu există`);
    assert.ok(!areNoindex(citeste(f)), `${a} are noindex, dar e în sitemap`);
  }
});

test('fiecare pagină fără noindex e în sitemap și are canonical spre aceeași adresă', () => {
  const pagini = fs.readdirSync(RADACINA).filter((f) => f.endsWith('.html'));
  for (const f of pagini) {
    const html = citeste(f);
    if (areNoindex(html)) continue;
    const adresa = ADRESE.find((a) => fisier(a) === f);
    assert.ok(adresa, `${f} poate apărea în Google, dar lipsește din sitemap.xml`);
    assert.equal(canonical(html), adresa, `${f}: canonical diferă de adresa din sitemap`);
  }
});

test('robots.txt arată spre sitemap și nu blochează paginile din el', () => {
  const robots = citeste('robots.txt');
  const linie = robots.match(/^Sitemap:\s*(\S+)/mi);
  assert.ok(linie, 'robots.txt nu are linia Sitemap:');
  assert.equal(linie[1], DOMENIU + '/sitemap.xml');

  const blocate = [...robots.matchAll(/^Disallow:\s*(\S+)/gmi)].map((m) => m[1]);
  for (const a of ADRESE) {
    const cale = new URL(a).pathname;
    for (const b of blocate) assert.ok(!cale.startsWith(b), `robots.txt blochează ${a} (Disallow: ${b})`);
  }
});
