/* =========================================================
   Teste pentru Google: robots.txt, sitemap.xml și canonical.
   Rulare:  npm test
   ========================================================= */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const RADACINA = path.join(__dirname, '..');
const citeste = (f) => fs.readFileSync(path.join(RADACINA, f), 'utf8');

const DOMENIU = 'https://elensunglasses.ro';
const urls = [...citeste('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

function fisierPentru(url) {
  const cale = url.slice(DOMENIU.length).replace(/^\//, '');
  return cale === '' ? 'index.html' : cale;
}

test('robots.txt arată sitemap-ul și nu blochează paginile publice', () => {
  const robots = citeste('robots.txt');
  assert.match(robots, new RegExp(`^Sitemap: ${DOMENIU}/sitemap\\.xml$`, 'm'));
  const blocate = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);
  for (const url of urls) {
    const cale = url.slice(DOMENIU.length) || '/';
    assert.ok(!blocate.some((b) => cale.startsWith(b)), `${cale} e în sitemap, dar robots.txt o blochează`);
  }
});

test('fiecare pagină din sitemap există, are canonical spre ea însăși și nu are noindex', () => {
  assert.ok(urls.length > 0, 'sitemap.xml nu are nicio adresă');
  for (const url of urls) {
    assert.ok(url.startsWith(DOMENIU + '/'), `${url} nu e pe ${DOMENIU}`);
    const html = citeste(fisierPentru(url));
    const canonical = html.match(/<link rel="canonical" href="([^"]+)">/);
    assert.ok(canonical, `${fisierPentru(url)} nu are canonical`);
    assert.equal(canonical[1], url);
    assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/, `${fisierPentru(url)} are noindex, dar e în sitemap`);
  }
});

test('paginile cu noindex nu sunt în sitemap', () => {
  const pagini = fs.readdirSync(RADACINA).filter((f) => f.endsWith('.html'));
  const inSitemap = new Set(urls.map(fisierPentru));
  for (const f of pagini) {
    if (/<meta name="robots" content="[^"]*noindex/.test(citeste(f))) {
      assert.ok(!inSitemap.has(f), `${f} are noindex, dar e în sitemap`);
    }
  }
});
