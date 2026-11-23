/* =========================================================
   Ajutor comun pentru testele de browser: un server static pentru
   folderul proiectului și o pagină Chromium care nu iese pe internet.
   Fișierul începe cu _ ca să nu fie rulat ca test.
   ========================================================= */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const RADACINA = path.join(__dirname, '..');

const TIPURI = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

// Pornește serverul și browserul. Întoarce { adresa, browser, opreste }.
async function porneste() {
  const server = http.createServer((req, res) => {
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
  const adresa = `http://127.0.0.1:${server.address().port}`;

  const executablePath = process.env.CHROMIUM_PATH ||
    (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch({ executablePath });

  async function opreste() {
    await browser.close();
    await new Promise((gata) => server.close(gata));
  }
  return { adresa, browser, opreste };
}

/* Deschide o pagină a site-ului la lățimea dată. Cererile către alte site-uri
   (fonturi, analytics) sunt blocate, ca rezultatele să nu depindă de internet.
   Tranzițiile și animațiile sunt oprite, ca stilurile citite să fie cele finale. */
async function deschide(browser, adresa, cale, ecran) {
  const pagina = await browser.newPage({ viewport: { width: ecran.width, height: ecran.height } });
  await pagina.route('**/*', (route) =>
    new URL(route.request().url()).origin === adresa ? route.continue() : route.abort());
  await pagina.goto(adresa + cale);
  await pagina.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; } .fade-in { opacity: 1 !important; transform: none !important; }'
  });
  return pagina;
}

module.exports = { porneste, deschide };
