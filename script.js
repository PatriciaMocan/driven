/* =========================================================
   Elen Sunglasses — logica precomenzilor
   1. SETĂRI PLATĂ  <-- partea pe care o vei modifica cel mai probabil
   2. Utilitare (prețuri în lei, texte, mesaje)
   3. Rezervări din prima serie (contorul „34 din 100”)
   4. Acces anticipat pentru abonați
   5. Lista de produse, filtre și sortare
   6. Fereastra produsului (poze, serie, dimensiuni)
   7. Coșul și opțiunile de plată (integral sau avans)
   8. Plata cu cardul prin Stripe
   9. Formularul de abonare
  10. Animații la scroll, data livrării, anul din subsol
  11. Agentul de vânzări: coșul păstrat pe email, recenziile clienților

   Data livrării și avansul se schimbă în products.js (PRECOMANDA).
   ========================================================= */


/* ---------- 1. SETĂRI PLATĂ ----------
   card:
     'demo'    nu se încasează nimic, coșul afișează doar un mesaj (implicit, sigur)
     'stripe'  plata prin Stripe, folosind api/checkout.js
               (ai nevoie de STRIPE_SECRET_KEY în Vercel, vezi README) */
const PLATA = {
  card: 'demo'
};

/* Agentul care recuperează vânzări (vezi README, „Agentul de vânzări”):
     false   coșul nu cere email, recenziile nu apar, abonarea doar afișează mulțumirea
     true    coșul poate fi păstrat pe email, abonații se salvează, apar recenziile aprobate
             (ai nevoie de baza de date Upstash și de Resend, configurate în Vercel) */
const EMAILURI = {
  activ: false
};


/* ---------- 2. Utilitare ---------- */

// 1690 -> "1.690 lei"
const numarRo = new Intl.NumberFormat('ro-RO');
function lei(suma) {
  return numarRo.format(suma) + ' lei';
}

// 20 noiembrie
const dataRo = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long' });

const MAX_BUCATI = 10; // păstrează aceeași limită ca în api/checkout.js

function gasesteProdus(id) {
  return PRODUCTS.find((p) => p.id === id);
}

// Desenul afișat dacă poza produsului lipsește sau nu se încarcă
function pozaRezerva(produs) {
  return 'images/model-' + produs.id + '.svg';
}

// În română: 1 bucată, 2–19 bucăți, 20 de bucăți, 101 bucăți...
function bucati(n) {
  if (n === 1) return '1 bucată';
  const rest = n % 100;
  return n + (rest === 0 || rest >= 20 ? ' de bucăți' : ' bucăți');
}

// Avansul plătit acum pentru o pereche (niciodată mai mult decât prețul)
function avansPereche(p) {
  return Math.min(PRECOMANDA.avans, p.pretPrecomanda);
}

// Mesaj scurt jos pe ecran
const toast = document.getElementById('toast');
let toastTimer;
function arataMesaj(mesaj) {
  toast.textContent = mesaj;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

// Citire și scriere în browser, cu protecție pentru modul privat
function citesteLocal(cheie) {
  try { return localStorage.getItem(cheie); } catch (e) { return null; }
}
function scrieLocal(cheie, valoare) {
  try { localStorage.setItem(cheie, valoare); } catch (e) { /* ignorăm */ }
}

// Analytics (analytics.js). Nu trimite nimic fără acordul vizitatorului.
function track(eveniment, date) {
  if (window.Elen && window.Elen.track) window.Elen.track(eveniment, date);
}

// Produsele în formatul de e-commerce GA4, cu valoarea totală în lei
function dateProduse(lista) {
  const items = lista.map(({ p, qty }) => ({
    item_id: p.id,
    item_name: p.nume,
    item_category: p.material,
    item_variant: p.culoare,
    price: p.pretPrecomanda,
    quantity: qty
  }));
  const value = items.reduce((s, i) => s + i.price * i.quantity, 0);
  return { currency: 'RON', value: value, items: items };
}


/* ---------- 3. Rezervări din prima serie ----------
   Pornim de la rezervateManual din products.js. Cu Stripe pornit, cerem
   numărul real de la api/rezervari.js (plățile reușite) și redesenăm pagina. */
const rezervate = {};
PRODUCTS.forEach((p) => { rezervate[p.id] = p.rezervateManual || 0; });

function libere(p) {
  return locuriLibere(p, rezervate[p.id]);
}

async function incarcaRezervari() {
  if (PLATA.card !== 'stripe') return;
  try {
    const raspuns = await fetch('/api/rezervari');
    const date = await raspuns.json();
    if (!raspuns.ok) return;
    Object.assign(rezervate, date.rezervate);
    afiseazaProduse();
    afiseazaCos();
  } catch (e) { /* rămânem la numerele din products.js */ }
}

// „34 din 100 rezervate”, „Ultimele 3 locuri”, „Prima serie: 100 de bucăți”
function textSerie(p) {
  const r = rezervate[p.id];
  const l = libere(p);
  if (l <= 0) return 'Prima serie s-a rezervat complet';
  if (l === 1) return 'Ultimul loc din prima serie';
  if (l <= 5) return 'Ultimele ' + l + ' locuri din prima serie';
  if (r <= 0) return 'Prima serie: ' + bucati(p.serie);
  return r + ' din ' + p.serie + ' rezervate';
}

// Bara de progres a seriei
function baraSerie(p) {
  const procent = Math.min(100, Math.round((rezervate[p.id] / p.serie) * 100));
  return `<span class="serie-bar" aria-hidden="true"><span style="width:${procent}%"></span></span>`;
}


/* ---------- 4. Acces anticipat pentru abonați ----------
   În emailul către abonați trimiți un link de forma
     https://elensunglasses.ro/?acces=CODUL-TAU
   Codul se salvează în browser și e verificat pe server la plată
   (variabila ACCES_ANTICIPAT_COD din Vercel). */
const ACCES_KEY = 'elen-acces';
const parametri = new URLSearchParams(window.location.search);

if (parametri.get('acces')) {
  scrieLocal(ACCES_KEY, parametri.get('acces').trim());
  arataMesaj('Acces anticipat activat. Bine ai venit!');
  track('acces_anticipat');
}
const codAcces = citesteLocal(ACCES_KEY) || '';
document.getElementById('early-banner').hidden = !codAcces;

// Poate fi precomandat produsul acum? Întoarce { ok, motiv }
function disponibilitate(p) {
  const etapa = etapaLansare(p);
  if (etapa === 'curand') return { ok: false, motiv: 'Precomenzi de pe ' + dataRo.format(new Date(p.lansare)) };
  if (etapa === 'abonati' && !codAcces) return { ok: false, motiv: 'Doar pentru abonați până pe ' + dataRo.format(new Date(p.lansare)) };
  if (libere(p) <= 0) return { ok: false, motiv: 'Prima serie s-a rezervat complet' };
  return { ok: true, motiv: '' };
}

// Eticheta mică de pe poză
function eticheta(p) {
  const etapa = etapaLansare(p);
  if (etapa === 'abonati') return codAcces ? 'Acces anticipat' : 'În curând';
  if (etapa === 'curand') return 'În curând';
  if (libere(p) <= 0) return 'Seria 1 rezervată';
  return '';
}

// Textul de sub preț: serie sau motivul pentru care nu se poate precomanda
function textDisponibilitate(p) {
  const disp = disponibilitate(p);
  return disp.ok || etapaLansare(p) === 'disponibil' ? textSerie(p) : disp.motiv;
}


/* ---------- 5. Lista de produse, filtre și sortare ---------- */
const grid = document.getElementById('product-grid');
const sortSelect = document.getElementById('sort');
const sizeSelect = document.getElementById('size-filter');
const filterButtons = document.querySelectorAll('.filter');
let filtruMaterial = 'toate';

function afiseazaProduse() {
  let lista = PRODUCTS.filter((p) =>
    (filtruMaterial === 'toate' || p.material === filtruMaterial) &&
    (sizeSelect.value === 'toate' || marimeRama(p) === sizeSelect.value)
  );

  // Copie, ca ordinea din products.js să rămână „Recomandate”
  lista = lista.slice();
  if (sortSelect.value === 'pret-cresc') lista.sort((a, b) => a.pretPrecomanda - b.pretPrecomanda);
  if (sortSelect.value === 'pret-descr') lista.sort((a, b) => b.pretPrecomanda - a.pretPrecomanda);

  document.getElementById('no-results').hidden = lista.length > 0;

  grid.innerHTML = lista.map((p) => {
    const disp = disponibilitate(p);
    const tag = eticheta(p);
    const d = p.dimensiuni;
    let buton;
    if (disp.ok) {
      buton = `<button class="btn btn-outline btn-small" type="button" data-add="${p.id}">Precomandă</button>`;
    } else if (etapaLansare(p) !== 'disponibil') {
      buton = `<a class="btn btn-outline btn-small" href="#abonare">Vreau acces anticipat</a>`;
    } else {
      buton = `<a class="btn btn-outline btn-small" href="#abonare">Anunță-mă la seria 2</a>`;
    }
    return `
      <li class="product-card${disp.ok ? '' : ' is-unavailable'}">
        <button class="product-media" type="button" data-view="${p.id}" aria-label="Vezi detalii: ${p.nume}">
          ${tag ? `<span class="product-tag">${tag}</span>` : ''}
          <img src="${p.poze[0]}" alt="${p.alt}" width="800" height="1000"
               loading="lazy" decoding="async"
               onerror="this.onerror=null;this.src='${pozaRezerva(p)}'">
        </button>
        <div class="product-info">
          <div>
            <h3 class="product-name">${p.nume}</h3>
            <p class="product-colour">${p.culoare}</p>
          </div>
          <div class="product-prices">
            <p class="product-price">${lei(p.pretPrecomanda)}</p>
            <p class="product-later">${lei(p.pret)} după lansare</p>
          </div>
        </div>
        <p class="product-meta">
          Mărime ${marimeRama(p)} · <span class="nowrap">${d.lentila}□${d.punte}-${d.brat}</span>
        </p>
        ${baraSerie(p)}
        <p class="stock ${libere(p) > 0 && libere(p) <= 5 ? 'is-low' : ''}">${textDisponibilitate(p)}</p>
        <p class="product-short">${p.scurt}</p>
        ${buton}
      </li>`;
  }).join('');
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filtruMaterial = button.dataset.filter;
    filterButtons.forEach((b) => {
      b.classList.toggle('is-active', b === button);
      b.setAttribute('aria-pressed', b === button ? 'true' : 'false');
    });
    afiseazaProduse();
    trackFiltre();
  });
});
sortSelect.addEventListener('change', () => { afiseazaProduse(); trackFiltre(); });
sizeSelect.addEventListener('change', () => { afiseazaProduse(); trackFiltre(); });

// Ce caută oamenii: material, mărime, ordine
function trackFiltre() {
  track('filtru_produse', { material: filtruMaterial, marime: sizeSelect.value, sortare: sortSelect.value });
}

// Un singur „ascultător” pentru toate cardurile
grid.addEventListener('click', (event) => {
  const vezi = event.target.closest('[data-view]');
  const adauga = event.target.closest('[data-add]');
  if (vezi) deschideProdus(vezi.dataset.view);
  if (adauga) adaugaInCos(adauga.dataset.add);
});


/* ---------- 6. Fereastra produsului ---------- */
const quickview = document.getElementById('quickview');
const qvImg = document.getElementById('qv-img');
const qvThumbs = document.getElementById('qv-thumbs');
const qvAdd = document.getElementById('qv-add');
let produsDeschis = null;

function arataPoza(p, src) {
  qvImg.onerror = () => { qvImg.onerror = null; qvImg.src = pozaRezerva(p); };
  qvImg.src = src;
  qvThumbs.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b.dataset.src === src));
}

function deschideProdus(id) {
  const p = gasesteProdus(id);
  const d = p.dimensiuni;
  const disp = disponibilitate(p);
  produsDeschis = id;

  qvImg.alt = p.alt;
  // Miniaturi: o poză care lipsește își ascunde singură miniatura
  qvThumbs.innerHTML = p.poze.length > 1 ? p.poze.map((src, i) => `
    <button type="button" data-src="${src}" aria-label="Poza ${i + 1}">
      <img src="${src}" alt="" width="80" height="100" onerror="this.parentElement.remove()">
    </button>`).join('') : '';
  arataPoza(p, p.poze[0]);

  document.getElementById('qv-colour').textContent = p.culoare;
  document.getElementById('qv-name').textContent = p.nume;
  document.getElementById('qv-price').innerHTML =
    lei(p.pretPrecomanda) + ' la precomandă <span class="qv-later">' + lei(p.pret) + ' după lansare · TVA inclus</span>';
  const serie = document.getElementById('qv-stock');
  serie.innerHTML = baraSerie(p) + textDisponibilitate(p) +
    (disp.ok ? '<br>Avans ' + lei(avansPereche(p)) + ' acum, restul la livrare, în ' + PRECOMANDA.livrare + '.' : '');
  serie.classList.toggle('is-low', libere(p) > 0 && libere(p) <= 5);
  document.getElementById('qv-desc').textContent = p.descriere;

  document.getElementById('qv-size-code').textContent =
    'Mărime ' + marimeRama(p) + ' · pe braț scrie ' + d.lentila + '□' + d.punte + '-' + d.brat;
  document.getElementById('qv-size').innerHTML = [
    ['Lățime lentilă', d.lentila],
    ['Punte', d.punte],
    ['Lungime braț', d.brat],
    ['Înălțime lentilă', d.inaltime],
    ['Lățime totală', d.totala]
  ].map(([nume, mm]) => `<tr><th scope="row">${nume}</th><td>${mm} mm</td></tr>`).join('');

  document.getElementById('qv-details').innerHTML = p.detalii.map((x) => `<li>${x}</li>`).join('');

  qvAdd.disabled = !disp.ok;
  qvAdd.textContent = disp.ok ? 'Precomandă' : disp.motiv;

  quickview.showModal();
  track('view_item', dateProduse([{ p: p, qty: 1 }]));
}

qvThumbs.addEventListener('click', (event) => {
  const b = event.target.closest('button');
  if (b) arataPoza(gasesteProdus(produsDeschis), b.dataset.src);
});

qvAdd.addEventListener('click', () => {
  adaugaInCos(produsDeschis);
  quickview.close();
});

// Linkul „Cum îți alegi mărimea” închide fereastra înainte de a derula
document.getElementById('qv-guide-link').addEventListener('click', () => quickview.close());


/* ---------- 7. Coșul ----------
   Coșul e o listă de forma [{ id: 'sola', qty: 1 }], salvată în browser. */
const bagDialog = document.getElementById('bag');
const bagItems = document.getElementById('bag-items');
const bagMessage = document.getElementById('bag-message');
const payOptions = document.getElementById('pay-options');
// Emailul din coș, pentru agentul de vânzări (secțiunea 11)
const bagEmail = document.getElementById('bag-email');
const bagEmailInput = document.getElementById('bag-email-input');
const bagEmailConsent = document.getElementById('bag-email-consent');
const EMAIL_KEY = 'elen-email';
const ACORD_KEY = 'elen-email-acord';
let acordTrimis = citesteLocal(ACORD_KEY) === 'da';
let timerCos;
bagEmailInput.value = citesteLocal(EMAIL_KEY) || '';
bagEmailConsent.checked = acordTrimis;
const BAG_KEY = 'elen-cos';
let cos = incarcaCos();
let tipPlata = 'avans'; // 'avans' sau 'integral'

/* Linkul din emailurile despre coș: /?cos=sola:1,lido:2#cos
   Pune coșul înapoi exact cum era, chiar și pe alt telefon sau calculator. */
if (parametri.get('cos')) {
  const dinLink = parametri.get('cos').split(',').map((bucata) => {
    const [id, qty] = bucata.split(':');
    return { id: id, qty: Math.min(MAX_BUCATI, Math.floor(Number(qty)) || 0) };
  }).filter((item) => gasesteProdus(item.id) && item.qty > 0);
  if (dinLink.length) cos = dinLink;
}

function incarcaCos() {
  try {
    const salvat = JSON.parse(citesteLocal(BAG_KEY)) || [];
    // Scoatem ce nu mai există în products.js
    return salvat.filter((item) => gasesteProdus(item.id) && item.qty > 0);
  } catch (e) {
    return [];
  }
}

function salveazaCos() {
  scrieLocal(BAG_KEY, JSON.stringify(cos));
  pastreazaCosPeEmail();
}

// Câte bucăți se pot precomanda dintr-un produs
function limita(p) {
  return Math.min(MAX_BUCATI, libere(p));
}

function adaugaInCos(id) {
  const p = gasesteProdus(id);
  const disp = disponibilitate(p);
  if (!disp.ok) { arataMesaj(disp.motiv); return; }

  const item = cos.find((i) => i.id === id);
  if (item && item.qty >= limita(p)) {
    arataMesaj(libere(p) <= MAX_BUCATI
      ? 'Din prima serie ' + p.nume + ' mai sunt libere doar ' + bucati(libere(p)) + '.'
      : 'Online poți precomanda cel mult ' + MAX_BUCATI + ' bucăți. Scrie-ne pentru mai multe.');
    return;
  }
  if (item) item.qty += 1;
  else cos.push({ id: id, qty: 1 });
  salveazaCos();
  afiseazaCos();
  arataMesaj(p.nume + ' a fost adăugat în coș');
  track('add_to_cart', dateProduse([{ p: p, qty: 1 }]));
}

function schimbaCantitate(id, schimbare) {
  const item = cos.find((i) => i.id === id);
  if (!item) return;
  const inainte = item.qty;
  item.qty = Math.min(item.qty + schimbare, limita(gasesteProdus(id)));
  if (item.qty <= 0) cos = cos.filter((i) => i.id !== id);
  salveazaCos();
  afiseazaCos();
  const diferenta = item.qty - inainte;
  if (diferenta > 0) track('add_to_cart', dateProduse([{ p: gasesteProdus(id), qty: diferenta }]));
  if (diferenta < 0) track('remove_from_cart', dateProduse([{ p: gasesteProdus(id), qty: Math.min(-diferenta, inainte) }]));
}

function totalCos() {
  return cos.reduce((s, item) => s + gasesteProdus(item.id).pretPrecomanda * item.qty, 0);
}

function dateCos() {
  return dateProduse(cos.map((item) => ({ p: gasesteProdus(item.id), qty: item.qty })));
}

function totalAvans() {
  return cos.reduce((s, item) => s + avansPereche(gasesteProdus(item.id)) * item.qty, 0);
}

function afiseazaCos() {
  const numar = cos.reduce((s, item) => s + item.qty, 0);
  const total = totalCos();
  const avans = totalAvans();

  document.getElementById('bag-count').textContent = numar;
  document.getElementById('bag-subtotal').textContent = lei(total);
  document.getElementById('bag-empty').hidden = numar > 0;
  document.getElementById('bag-foot').hidden = numar === 0;
  bagMessage.textContent = '';

  bagItems.innerHTML = cos.map((item) => {
    const p = gasesteProdus(item.id);
    return `
      <li class="bag-item">
        <img src="${p.poze[0]}" alt="" width="80" height="100"
             onerror="this.onerror=null;this.src='${pozaRezerva(p)}'">
        <div class="bag-item-text">
          <p class="bag-item-name">${p.nume}</p>
          <p class="bag-item-colour">${p.culoare} · mărime ${marimeRama(p)}</p>
          <div class="qty">
            <button type="button" data-qty="-1" data-id="${p.id}" aria-label="O bucată mai puțin din ${p.nume}">&minus;</button>
            <span aria-label="Cantitate">${item.qty}</span>
            <button type="button" data-qty="1" data-id="${p.id}" aria-label="O bucată în plus din ${p.nume}">+</button>
          </div>
        </div>
        <p class="bag-item-price">${lei(p.pretPrecomanda * item.qty)}</p>
      </li>`;
  }).join('');

  // Cele două feluri de a plăti, cu sumele calculate
  payOptions.innerHTML = `
    <label class="pay-option">
      <input type="radio" name="plata" value="avans" ${tipPlata === 'avans' ? 'checked' : ''}>
      <span><strong>Avans ${lei(avans)} acum</strong>
        <small>Restul de ${lei(total - avans)} la livrare, cu cardul sau ramburs</small></span>
    </label>
    <label class="pay-option">
      <input type="radio" name="plata" value="integral" ${tipPlata === 'integral' ? 'checked' : ''}>
      <span><strong>Tot acum, ${lei(total)}</strong>
        <small>Nu mai plătești nimic la livrare</small></span>
    </label>`;
}

payOptions.addEventListener('change', (event) => {
  tipPlata = event.target.value;
});

bagItems.addEventListener('click', (event) => {
  const b = event.target.closest('[data-qty]');
  if (b) schimbaCantitate(b.dataset.id, Number(b.dataset.qty));
});

document.getElementById('bag-open').addEventListener('click', () => {
  bagDialog.showModal();
  track('view_cart', dateCos());
});

// Butoanele de închidere și click-ul pe zona întunecată închid orice fereastră
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

// Verificăm coșul chiar înainte de plată (locurile din serie se pot ocupa între timp)
function problemaCos() {
  for (const item of cos) {
    const p = gasesteProdus(item.id);
    const disp = disponibilitate(p);
    if (!disp.ok) return p.nume + ': ' + disp.motiv.toLowerCase() + '. Scoate-l din coș ca să continui.';
    if (item.qty > libere(p)) return 'Din prima serie ' + p.nume + ' mai sunt libere doar ' + bucati(libere(p)) + '.';
  }
  return '';
}

// Deschide coșul direct când se ajunge pe index.html#cos (de pe pagina „Cum le facem”)
if (window.location.hash === '#cos') bagDialog.showModal();


/* ---------- 8. Plata cu cardul prin Stripe ---------- */
const checkoutButton = document.getElementById('checkout-button');
const COMANDA_KEY = 'elen-comanda-in-curs';

checkoutButton.addEventListener('click', async () => {
  if (cos.length === 0) return;
  const problema = problemaCos();
  if (problema) { bagMessage.textContent = problema; return; }

  const comanda = Object.assign(dateCos(), { tip_plata: tipPlata, platit_acum: tipPlata === 'avans' ? totalAvans() : totalCos() });
  track('begin_checkout', comanda);

  if (PLATA.card === 'demo') {
    bagMessage.textContent = 'Plata nu e conectată încă. Vezi README ca să conectezi Stripe.';
    return;
  }

  checkoutButton.disabled = true;
  checkoutButton.textContent = 'Un moment…';
  await pastreazaCosPeEmail(true);
  try {
    // Trimitem doar id-uri, cantități și felul plății. Prețul și locurile sunt verificate pe server.
    const raspuns = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cos, tip: tipPlata, acces: codAcces, email: emailCos() })
    });
    const date = await raspuns.json();
    if (!raspuns.ok || !date.url) throw new Error(date.error || 'Eroare la plată');
    scrieLocal(COMANDA_KEY, JSON.stringify(comanda)); // pentru evenimentul purchase, la întoarcere
    window.location.href = date.url; // pagina de plată Stripe
  } catch (error) {
    bagMessage.textContent = error.message && error.message !== 'Failed to fetch'
      ? error.message
      : 'Plata nu s-a deschis. Încearcă din nou peste un minut.';
    checkoutButton.disabled = false;
    checkoutButton.textContent = 'Precomandă';
  }
});

// După plată, Stripe trimite clientul înapoi la /?plata=reusita&sid=ID_SESIUNE
const rezultatPlata = parametri.get('plata');
const comandaInCurs = (() => {
  try { return JSON.parse(citesteLocal(COMANDA_KEY)); } catch (e) { return null; }
})();
if (rezultatPlata === 'reusita') {
  cos = [];
  salveazaCos();
  arataMesaj('Mulțumim! Precomanda e confirmată. Îți scriem pe email înainte de livrare.');
  // transaction_id = sesiunea Stripe, ca GA4 să nu numere de două ori aceeași plată
  if (comandaInCurs) track('purchase', Object.assign(comandaInCurs, { transaction_id: parametri.get('sid') || undefined }));
}
if (rezultatPlata === 'anulata' && comandaInCurs) track('plata_anulata', comandaInCurs);
if (rezultatPlata) {
  try { localStorage.removeItem(COMANDA_KEY); } catch (e) { /* ignorăm */ }
}
if (rezultatPlata || parametri.get('acces') || parametri.get('cos')) {
  // Curățăm adresa, ca un refresh să nu repete mesajul
  history.replaceState(null, '', window.location.pathname + window.location.hash);
}


/* ---------- 9. Formularul de abonare ---------- */
const form = document.getElementById('notify-form');
const emailInput = document.getElementById('email');
const consentInput = document.getElementById('consent');
const emailError = document.getElementById('email-error');
const consentError = document.getElementById('consent-error');
const successBox = document.getElementById('form-success');

// Verificare simplă: ceva@ceva.ceva
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function setError(input, errorEl, message) {
  errorEl.textContent = message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

emailInput.addEventListener('input', () => {
  if (isValidEmail(emailInput.value)) setError(emailInput, emailError, '');
});
consentInput.addEventListener('change', () => {
  if (consentInput.checked) setError(consentInput, consentError, '');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  let valid = true;
  if (!emailInput.value.trim()) {
    setError(emailInput, emailError, 'Scrie adresa de email.');
    valid = false;
  } else if (!isValidEmail(emailInput.value)) {
    setError(emailInput, emailError, 'Adresa de email nu pare corectă. Te rugăm s-o verifici.');
    valid = false;
  } else {
    setError(emailInput, emailError, '');
  }

  if (!consentInput.checked) {
    setError(consentInput, consentError, 'Bifează căsuța ca să avem voie să-ți scriem.');
    valid = false;
  } else {
    setError(consentInput, consentError, '');
  }

  if (!valid) {
    form.querySelector('[aria-invalid="true"]').focus();
    return;
  }

  /* ===== AICI CONECTEZI SERVICIUL DE EMAIL =====
     Acum nu se trimite nimic: apare doar mesajul de mulțumire.

     --- Varianta A: Formspree (cea mai simplă) ---
     Creează un formular pe https://formspree.io, apoi scoate comentariul de mai jos
     și înlocuiește ID_FORMULAR:

     try {
       const response = await fetch('https://formspree.io/f/ID_FORMULAR', {
         method: 'POST',
         headers: { 'Accept': 'application/json' },
         body: new FormData(form),
       });
       if (!response.ok) throw new Error('Request failed');
     } catch (error) {
       setError(emailInput, emailError, 'Ceva n-a mers. Încearcă din nou peste un minut.');
       return;
     }

     --- Varianta B: Mailchimp ---
     În Mailchimp: Audience > Signup forms > Embedded forms, copiază adresa din „action”,
     pune-o în <form action="..."> din index.html, redenumește câmpurile în EMAIL și FNAME
     și șterge linia event.preventDefault() de mai sus, ca browserul să trimită direct la Mailchimp.

     --- Varianta C: agentul de vânzări (EMAILURI.activ = true) ---
     Adresa se salvează în baza de date a agentului, care le scrie abonaților la fiecare lansare.
  */
  if (EMAILURI.activ) {
    try {
      const raspuns = await fetch('/api/abonare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.value.trim(), prenume: form.elements.name.value.trim(), consent: true })
      });
      if (!raspuns.ok) throw new Error('Request failed');
    } catch (error) {
      setError(emailInput, emailError, 'Ceva n-a mers. Încearcă din nou peste un minut.');
      return;
    }
  }

  form.hidden = true;
  successBox.hidden = false;
  successBox.focus();
  track('sign_up', { method: 'newsletter' }); // fără email: nu trimitem date personale
});


/* ---------- 10. Animații la scroll, data livrării, anul ---------- */
const fadeEls = document.querySelectorAll('.fade-in');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  fadeEls.forEach((el) => observer.observe(el));
} else {
  fadeEls.forEach((el) => el.classList.add('is-visible'));
}

// Data livrării și avansul apar în mai multe locuri; le luăm din products.js
document.querySelectorAll('[data-livrare]').forEach((el) => { el.textContent = PRECOMANDA.livrare; });
document.querySelectorAll('[data-avans]').forEach((el) => { el.textContent = numarRo.format(PRECOMANDA.avans); });

document.getElementById('year').textContent = new Date().getFullYear();


/* ---------- 11. Agentul de vânzări ----------
   Coșul păstrat pe email: dacă clientul își lasă emailul și bifează căsuța,
   coșul ajunge la api/cos.js. Agentul îi scrie la 1 oră, 24 de ore și 3 zile
   dacă nu plătește, și se oprește singur după plată. */
bagEmail.hidden = !EMAILURI.activ;

function emailCos() {
  const email = bagEmailInput.value.trim();
  return isValidEmail(email) ? email : '';
}

// imediat = true înainte de plată, ca să nu pierdem coșul dacă pagina se schimbă
function pastreazaCosPeEmail(imediat) {
  clearTimeout(timerCos);
  const email = emailCos();
  // Fără acord nu salvăm nimic. Dacă și-a retras acordul, trimitem un coș gol, care oprește emailurile.
  if (!EMAILURI.activ || !email || !(bagEmailConsent.checked || acordTrimis)) return Promise.resolve();
  const trimite = () => {
    acordTrimis = bagEmailConsent.checked;
    return fetch('/api/cos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, items: bagEmailConsent.checked ? cos : [] }),
      keepalive: true
    }).catch(() => { /* coșul rămâne oricum în browser */ });
  };
  if (imediat) return trimite();
  timerCos = setTimeout(trimite, 800);
  return Promise.resolve();
}

bagEmailInput.addEventListener('change', () => {
  scrieLocal(EMAIL_KEY, emailCos());
  pastreazaCosPeEmail();
});
bagEmailConsent.addEventListener('change', () => {
  scrieLocal(ACORD_KEY, bagEmailConsent.checked ? 'da' : '');
  if (bagEmailConsent.checked && !emailCos()) bagEmailInput.focus();
  pastreazaCosPeEmail();
});

/* Recenziile aprobate în admin.html, cu pozele clienților */
const reviewGrid = document.getElementById('review-grid');

function textSigur(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function incarcaRecenzii() {
  if (!EMAILURI.activ) return;
  try {
    const raspuns = await fetch('/api/recenzii');
    const date = await raspuns.json();
    if (!raspuns.ok || !date.recenzii || date.recenzii.length === 0) return;
    reviewGrid.innerHTML = date.recenzii.map((r) => `
      <li class="review-card">
        ${r.poza ? `<img src="${r.poza}" alt="${textSigur(r.nume)} poartă ${textSigur(r.numeProdus)}" width="800" height="1000" loading="lazy" decoding="async">` : ''}
        <p class="review-stars" aria-label="${r.nota} din 5">${'★'.repeat(r.nota)}${'☆'.repeat(5 - r.nota)}</p>
        <blockquote class="review-text">${textSigur(r.text)}</blockquote>
        <p class="review-author">${textSigur(r.nume)}${gasesteProdus(r.produs)
          ? `, despre <button type="button" class="review-product" data-view="${r.produs}">${textSigur(r.numeProdus)}</button>` : ''}</p>
      </li>`).join('');
    document.getElementById('recenzii').hidden = false;
  } catch (e) { /* fără recenzii, secțiunea rămâne ascunsă */ }
}

reviewGrid.addEventListener('click', (event) => {
  const vezi = event.target.closest('[data-view]');
  if (vezi) deschideProdus(vezi.dataset.view);
});


/* ---------- Pornire ---------- */
afiseazaProduse();
afiseazaCos();
incarcaRezervari();
incarcaRecenzii();
if (parametri.get('cos')) salveazaCos(); // coșul venit din email rămâne salvat
