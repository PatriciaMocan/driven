/* =========================================================
   Teste pentru imaginea din hero (pagina principală).

   Pagina cere images/hero.jpg. Dacă fotografia lipsește sau nu se încarcă,
   atributul onerror din index.html afișează desenul images/hero.svg.
   Testele verifică ambele cazuri, pe telefon și pe desktop.

   Rulare:  npm test
   Ai nevoie de Chromium. Dacă nu e găsit singur, spune-i testului unde e:
     CHROMIUM_PATH=/calea/catre/chrome npm test
   sau instalează-l o dată cu:  npx playwright-core install chromium
   ========================================================= */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const RADACINA = path.join(__dirname, '..');

// O fotografie JPEG minusculă (4 × 3 px), folosită ca „hero.jpg” în testul în care fotografia există
const JPEG_TEST = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAADAAQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDLooorkOo//9k=',
  'base64'
);

const TIPURI = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const ECRANE = [
  { nume: 'telefon', width: 375, height: 812 },
  { nume: 'desktop', width: 1440, height: 900 }
];

let server;
let adresa;
let browser;

// Un server static minimal pentru folderul proiectului (fișierele lipsă dau 404, ca pe Vercel)
before(async () => {
  server = http.createServer((req, res) => {
    const cale = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const fisier = path.join(RADACINA, cale === '/' ? 'index.html' : cale);
    if (!fisier.startsWith(RADACINA) || !fs.existsSync(fisier) || fs.statSync(fisier).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TIPURI[path.extname(fisier)] || 'application/octet-stream' });
    fs.createReadStream(fisier).pipe(res);
  });
  await new Promise((gata) => server.listen(0, '127.0.0.1', gata));
  adresa = `http://127.0.0.1:${server.address().port}`;

  const executablePath = process.env.CHROMIUM_PATH ||
    (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  browser = await chromium.launch({ executablePath });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((gata) => server.close(gata));
});

/* Deschide pagina principală. `heroJpg` decide ce primește browserul pentru images/hero.jpg:
     'lipsa'   404, ca atunci când fotografia nu a fost urcată
     'exista'  o fotografie JPEG validă
   Cererile către alte site-uri (fonturi, analytics) sunt blocate, ca testul să nu depindă de internet. */
async function deschide(ecran, heroJpg, extra) {
  const pagina = await browser.newPage({ viewport: { width: ecran.width, height: ecran.height } });
  const cereri = [];
  pagina.on('request', (r) => cereri.push(new URL(r.url()).pathname));

  await pagina.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== adresa) return route.abort();
    if (url.pathname === '/images/hero.jpg') {
      return heroJpg === 'exista'
        ? route.fulfill({ status: 200, contentType: 'image/jpeg', body: JPEG_TEST })
        : route.fulfill({ status: 404, body: '' });
    }
    if (extra) return extra(route, url);
    return route.continue();
  });

  await pagina.goto(adresa + '/');
  // Așteptăm ca imaginea din hero să termine de încărcat (cu fallback cu tot)
  await pagina.waitForFunction(() => {
    const img = document.querySelector('.hero-bg');
    return img && img.complete && (img.naturalWidth > 0 || img.src.endsWith('/images/hero.svg'));
  });
  return { pagina, cereri };
}

function stareHero(pagina) {
  return pagina.evaluate(() => {
    const img = document.querySelector('.hero-bg');
    const titlu = document.querySelector('.hero-title');
    const hero = document.querySelector('.hero');
    const r = titlu.getBoundingClientRect();
    const h = hero.getBoundingClientRect();
    return {
      src: new URL(img.src).pathname,
      incarcata: img.complete && img.naturalWidth > 0,
      vizibila: getComputedStyle(img).display !== 'none' && img.getBoundingClientRect().height > 0,
      culoareTitlu: getComputedStyle(titlu).color,
      titluInHero: r.top >= h.top && r.bottom <= h.bottom && r.left >= 0 && r.right <= window.innerWidth,
      textTitlu: titlu.textContent.trim(),
      latimePagina: document.documentElement.scrollWidth
    };
  });
}

for (const ecran of ECRANE) {
  test(`fallback: fără images/hero.jpg se afișează images/hero.svg (${ecran.nume})`, async () => {
    const { pagina, cereri } = await deschide(ecran, 'lipsa');
    const stare = await stareHero(pagina);

    assert.equal(stare.src, '/images/hero.svg', 'imaginea trebuie să treacă pe desenul de rezervă');
    assert.ok(stare.incarcata, 'desenul de rezervă trebuie să se încarce, nu să apară ca imagine stricată');
    assert.ok(stare.vizibila, 'imaginea din hero trebuie să fie vizibilă');
    assert.ok(cereri.includes('/images/hero.jpg'), 'pagina trebuie să încerce întâi fotografia reală');

    // Textul rămâne lizibil peste desen
    assert.equal(stare.textTitlu, 'Elen');
    assert.equal(stare.culoareTitlu, 'rgb(255, 255, 255)');
    assert.ok(stare.titluInHero, 'titlul trebuie să stea în interiorul hero-ului, fără să iasă din ecran');
    assert.ok(stare.latimePagina <= ecran.width, 'pagina nu trebuie să se poată derula pe orizontală');

    await pagina.close();
  });

  test(`cu images/hero.jpg se afișează fotografia, nu desenul (${ecran.nume})`, async () => {
    const { pagina, cereri } = await deschide(ecran, 'exista');
    const stare = await stareHero(pagina);

    assert.equal(stare.src, '/images/hero.jpg', 'fotografia reală trebuie să rămână afișată');
    assert.ok(stare.incarcata, 'fotografia trebuie să se încarce');
    assert.ok(!cereri.includes('/images/hero.svg'), 'desenul de rezervă nu trebuie cerut când fotografia există');
    assert.equal(stare.culoareTitlu, 'rgb(255, 255, 255)');
    assert.ok(stare.titluInHero);

    await pagina.close();
  });
}

test('fallback: dacă lipsește și desenul, pagina nu intră într-o buclă de reîncercări', async () => {
  const { pagina, cereri } = await deschide(ECRANE[0], 'lipsa', (route, url) =>
    url.pathname === '/images/hero.svg' ? route.fulfill({ status: 404, body: '' }) : route.continue());
  // Lăsăm timp pentru eventuale cereri repetate
  await pagina.waitForTimeout(500);

  assert.equal(cereri.filter((c) => c === '/images/hero.svg').length, 1, 'hero.svg trebuie cerut o singură dată');
  assert.equal(cereri.filter((c) => c === '/images/hero.jpg').length, 1, 'hero.jpg trebuie cerut o singură dată');
  // Titlul rămâne pe pagină chiar fără nicio imagine
  assert.equal(await pagina.textContent('.hero-title'), 'Elen');

  await pagina.close();
});
