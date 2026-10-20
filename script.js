/* =========================================================
   Elen Sunglasses — logica magazinului
   1. SETĂRI PLATĂ  <-- partea pe care o vei modifica cel mai probabil
   2. Utilitare (prețuri în lei, stoc, poze)
   3. Acces anticipat pentru abonați
   4. Lista de produse, filtre și sortare
   5. Fereastra produsului (poze, stoc, dimensiuni)
   6. Coșul
   7. Plata cu cardul (Stripe sau Shopify)
   8. Comanda cu plata ramburs
   9. Formularul de abonare
  10. Animații la scroll și anul din subsol
   ========================================================= */


/* ---------- 1. SETĂRI PLATĂ ----------
   card:
     'demo'    nu se încasează nimic, coșul afișează doar un mesaj (implicit, sigur)
     'stripe'  plata cu cardul prin Stripe, folosind api/checkout.js
               (ai nevoie de STRIPE_SECRET_KEY în Vercel, vezi README)
     'shopify' trimite coșul în checkout-ul magazinului tău Shopify
     'oprit'   ascunde plata cu cardul
   ramburs:
     activ         true = clienții pot alege plata la livrare
     formspreeUrl  adresa formularului Formspree unde ajung comenzile (vezi README).
                   Cât timp e goală, comanda NU se trimite nicăieri (mod demo). */
const PLATA = {
  card: 'demo',
  shopifyDomain: 'magazinul-tau.myshopify.com',
  ramburs: {
    activ: true,
    formspreeUrl: ''
  }
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

function textStoc(n) {
  if (n <= 0) return 'Stoc epuizat';
  if (n === 1) return 'Ultima bucată';
  if (n <= 3) return 'Ultimele ' + n + ' bucăți';
  return bucati(n) + ' în stoc';
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


/* ---------- 3. Acces anticipat pentru abonați ----------
   În emailul către abonați trimiți un link de forma
     https://elensunglasses.ro/?acces=CODUL-TAU
   Codul se salvează în browser. Cu plata prin Stripe, codul e verificat pe server
   (variabila ACCES_ANTICIPAT_COD din Vercel); la ramburs apare în comandă și îl verifici tu. */
const ACCES_KEY = 'elen-acces';
const parametri = new URLSearchParams(window.location.search);

if (parametri.get('acces')) {
  scrieLocal(ACCES_KEY, parametri.get('acces').trim());
  arataMesaj('Acces anticipat activat. Bine ai venit!');
}
const codAcces = citesteLocal(ACCES_KEY) || '';
document.getElementById('early-banner').hidden = !codAcces;

// Poate fi cumpărat produsul acum? Întoarce { ok, motiv }
function disponibilitate(p) {
  const etapa = etapaLansare(p);
  if (etapa === 'curand') return { ok: false, motiv: 'Lansare ' + dataRo.format(new Date(p.lansare)) };
  if (etapa === 'abonati' && !codAcces) return { ok: false, motiv: 'Doar pentru abonați până pe ' + dataRo.format(new Date(p.lansare)) };
  if (p.stoc <= 0) return { ok: false, motiv: 'Stoc epuizat' };
  return { ok: true, motiv: '' };
}

// Eticheta mică de pe poză: „Acces anticipat”, „În curând”, „Epuizat”
function eticheta(p) {
  const etapa = etapaLansare(p);
  if (etapa === 'abonati') return codAcces ? 'Acces anticipat' : 'În curând';
  if (etapa === 'curand') return 'În curând';
  if (p.stoc <= 0) return 'Epuizat';
  return '';
}


/* ---------- 4. Lista de produse, filtre și sortare ---------- */
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
  if (sortSelect.value === 'pret-cresc') lista.sort((a, b) => a.pret - b.pret);
  if (sortSelect.value === 'pret-descr') lista.sort((a, b) => b.pret - a.pret);

  document.getElementById('no-results').hidden = lista.length > 0;

  grid.innerHTML = lista.map((p) => {
    const disp = disponibilitate(p);
    const tag = eticheta(p);
    const d = p.dimensiuni;
    // Buton: adaugă în coș, abonează-te (modele încă nelansate) sau epuizat
    let buton;
    if (disp.ok) {
      buton = `<button class="btn btn-outline btn-small" type="button" data-add="${p.id}">Adaugă în coș</button>`;
    } else if (etapaLansare(p) !== 'disponibil') {
      buton = `<a class="btn btn-outline btn-small" href="#abonare">Vreau acces anticipat</a>`;
    } else {
      buton = `<button class="btn btn-outline btn-small" type="button" disabled>Epuizat</button>`;
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
          <p class="product-price">${lei(p.pret)}</p>
        </div>
        <p class="product-meta">
          Mărime ${marimeRama(p)} · <span class="nowrap">${d.lentila}□${d.punte}-${d.brat}</span>
        </p>
        <p class="stock ${p.stoc > 0 && p.stoc <= 3 ? 'is-low' : ''}">${disp.ok || p.stoc <= 0 ? textStoc(p.stoc) : disp.motiv}</p>
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
  });
});
sortSelect.addEventListener('change', afiseazaProduse);
sizeSelect.addEventListener('change', afiseazaProduse);

// Un singur „ascultător” pentru toate cardurile
grid.addEventListener('click', (event) => {
  const vezi = event.target.closest('[data-view]');
  const adauga = event.target.closest('[data-add]');
  if (vezi) deschideProdus(vezi.dataset.view);
  if (adauga) adaugaInCos(adauga.dataset.add);
});


/* ---------- 5. Fereastra produsului ---------- */
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
  document.getElementById('qv-price').textContent = lei(p.pret) + ', TVA inclus';
  const stoc = document.getElementById('qv-stock');
  stoc.textContent = disp.ok || p.stoc <= 0 ? textStoc(p.stoc) : disp.motiv;
  stoc.classList.toggle('is-low', p.stoc > 0 && p.stoc <= 3);
  document.getElementById('qv-desc').textContent = p.descriere;

  document.getElementById('qv-size-code').textContent =
    'Mărime ' + marimeRama(p) + ' · pe braț scrie ' + d.lentila + '□' + d.punte + '-' + d.brat;
  document.getElementById('qv-size').innerHTML = [
    ['Lățime lentilă', d.lentila],
    ['Punte', d.punte],
    ['Lungime braț', d.brat],
    ['Înălțime lentilă', d.inaltime],
    ['Lățime totală', d.totala]
  ].map(([eticheta, mm]) => `<tr><th scope="row">${eticheta}</th><td>${mm} mm</td></tr>`).join('');

  document.getElementById('qv-details').innerHTML = p.detalii.map((x) => `<li>${x}</li>`).join('');

  qvAdd.disabled = !disp.ok;
  qvAdd.textContent = disp.ok ? 'Adaugă în coș' : disp.motiv;

  quickview.showModal();
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


/* ---------- 6. Coșul ----------
   Coșul e o listă de forma [{ id: 'sola', qty: 1 }], salvată în browser. */
const bagDialog = document.getElementById('bag');
const bagItems = document.getElementById('bag-items');
const bagMessage = document.getElementById('bag-message');
const BAG_KEY = 'elen-cos';
let cos = incarcaCos();

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
}

// Câte bucăți se pot comanda dintr-un produs
function limita(p) {
  return Math.min(MAX_BUCATI, p.stoc);
}

function adaugaInCos(id) {
  const p = gasesteProdus(id);
  const disp = disponibilitate(p);
  if (!disp.ok) { arataMesaj(disp.motiv); return; }

  const item = cos.find((i) => i.id === id);
  if (item && item.qty >= limita(p)) {
    arataMesaj(p.stoc <= MAX_BUCATI
      ? 'Mai avem doar ' + bucati(p.stoc) + ' din ' + p.nume + '.'
      : 'Online poți comanda cel mult ' + MAX_BUCATI + ' bucăți. Scrie-ne pentru mai multe.');
    return;
  }
  if (item) item.qty += 1;
  else cos.push({ id: id, qty: 1 });
  salveazaCos();
  afiseazaCos();
  arataMesaj(p.nume + ' a fost adăugat în coș');
}

function schimbaCantitate(id, schimbare) {
  const item = cos.find((i) => i.id === id);
  if (!item) return;
  item.qty = Math.min(item.qty + schimbare, limita(gasesteProdus(id)));
  if (item.qty <= 0) cos = cos.filter((i) => i.id !== id);
  salveazaCos();
  afiseazaCos();
}

function totalCos() {
  return cos.reduce((s, item) => s + gasesteProdus(item.id).pret * item.qty, 0);
}

function afiseazaCos() {
  const numar = cos.reduce((s, item) => s + item.qty, 0);

  document.getElementById('bag-count').textContent = numar;
  document.getElementById('bag-subtotal').textContent = lei(totalCos());
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
        <p class="bag-item-price">${lei(p.pret * item.qty)}</p>
      </li>`;
  }).join('');
}

bagItems.addEventListener('click', (event) => {
  const b = event.target.closest('[data-qty]');
  if (b) schimbaCantitate(b.dataset.id, Number(b.dataset.qty));
});

document.getElementById('bag-open').addEventListener('click', () => bagDialog.showModal());

// Butoanele de închidere și click-ul pe zona întunecată închid orice fereastră
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});

// Ascundem metodele de plată oprite din setări
const cardPornit = PLATA.card !== 'oprit';
const rambursPornit = PLATA.ramburs.activ;
document.getElementById('pay-card').hidden = !cardPornit;
document.getElementById('pay-ramburs').hidden = !rambursPornit;
if (!cardPornit && rambursPornit) document.querySelector('[name="plata"][value="ramburs"]').checked = true;
// Cu o singură metodă, alegerea nu mai are rost
document.getElementById('pay-methods').hidden = !(cardPornit && rambursPornit);

// Verificăm coșul chiar înainte de plată (stocul sau data lansării se pot schimba între timp)
function problemaCos() {
  for (const item of cos) {
    const p = gasesteProdus(item.id);
    const disp = disponibilitate(p);
    if (!disp.ok) return p.nume + ': ' + disp.motiv.toLowerCase() + '. Scoate-l din coș ca să continui.';
    if (item.qty > p.stoc) return 'Mai avem doar ' + bucati(p.stoc) + ' din ' + p.nume + '.';
  }
  return '';
}

const checkoutButton = document.getElementById('checkout-button');
checkoutButton.addEventListener('click', () => {
  if (cos.length === 0) return;
  const problema = problemaCos();
  if (problema) { bagMessage.textContent = problema; return; }

  const metoda = document.querySelector('[name="plata"]:checked').value;
  if (metoda === 'ramburs') deschideRamburs();
  else platesteCuCardul();
});

// Deschide coșul direct când se ajunge pe index.html#cos (de pe pagina „Cum le facem”)
if (window.location.hash === '#cos') bagDialog.showModal();


/* ---------- 7. Plata cu cardul ---------- */
async function platesteCuCardul() {
  if (PLATA.card === 'demo') {
    bagMessage.textContent = 'Plata cu cardul nu e conectată încă. Vezi README ca să conectezi Stripe sau Shopify.';
    return;
  }

  if (PLATA.card === 'shopify') {
    // Shopify „cart permalink”: magazin.myshopify.com/cart/VARIANTA:CANTITATE,...
    const lipsa = cos.find((item) => !gasesteProdus(item.id).shopifyVariantId);
    if (lipsa) {
      bagMessage.textContent = 'Lipsește shopifyVariantId pentru ' + gasesteProdus(lipsa.id).nume + ' în products.js.';
      return;
    }
    const parti = cos.map((item) => gasesteProdus(item.id).shopifyVariantId + ':' + item.qty);
    window.location.href = 'https://' + PLATA.shopifyDomain + '/cart/' + parti.join(',');
    return;
  }

  if (PLATA.card === 'stripe') {
    checkoutButton.disabled = true;
    checkoutButton.textContent = 'Un moment…';
    try {
      // Trimitem doar id-uri și cantități. Prețul și stocul sunt verificate pe server.
      const raspuns = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cos, acces: codAcces })
      });
      const date = await raspuns.json();
      if (!raspuns.ok || !date.url) throw new Error(date.error || 'Eroare la plată');
      window.location.href = date.url; // pagina de plată Stripe
    } catch (error) {
      bagMessage.textContent = error.message && error.message !== 'Failed to fetch'
        ? error.message
        : 'Plata nu s-a deschis. Încearcă din nou peste un minut.';
      checkoutButton.disabled = false;
      checkoutButton.textContent = 'Finalizează comanda';
    }
  }
}

// După plată, Stripe trimite clientul înapoi la /?plata=reusita
const rezultatPlata = parametri.get('plata');
if (rezultatPlata === 'reusita') {
  cos = [];
  salveazaCos();
  arataMesaj('Mulțumim! Comanda e confirmată, iar chitanța vine pe email.');
}
if (rezultatPlata || parametri.get('acces')) {
  // Curățăm adresa, ca un refresh să nu repete mesajul
  history.replaceState(null, '', window.location.pathname + window.location.hash);
}


/* ---------- 8. Comanda cu plata ramburs ---------- */
const codDialog = document.getElementById('cod');
const codForm = document.getElementById('cod-form');
const codError = document.getElementById('cod-error');

const JUDETE = ['Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud', 'Botoșani', 'Brașov', 'Brăila',
  'București', 'Buzău', 'Caraș-Severin', 'Călărași', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj',
  'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomița', 'Iași', 'Ilfov', 'Maramureș', 'Mehedinți',
  'Mureș', 'Neamț', 'Olt', 'Prahova', 'Satu Mare', 'Sălaj', 'Sibiu', 'Suceava', 'Teleorman', 'Timiș', 'Tulcea',
  'Vaslui', 'Vâlcea', 'Vrancea'];
document.getElementById('cod-judet').insertAdjacentHTML('beforeend',
  JUDETE.map((j) => `<option>${j}</option>`).join(''));

// Comanda, ca text simplu (ajunge așa în emailul tău)
function rezumatComanda() {
  return cos.map((item) => {
    const p = gasesteProdus(item.id);
    return item.qty + ' × ' + p.nume + ' (' + p.culoare + ') — ' + lei(p.pret * item.qty);
  }).join('\n');
}

function deschideRamburs() {
  bagDialog.close();
  document.getElementById('cod-summary').textContent =
    'Total de plată la curier: ' + lei(totalCos()) + '. Livrarea e gratuită.';
  codForm.hidden = false;
  document.getElementById('cod-success').hidden = true;
  codDialog.showModal();
}

// Telefon românesc: 07xx xxx xxx, 02xx/03xx, cu sau fără +40
function telefonValid(t) {
  return /^(\+40|0040|0)[237]\d{8}$/.test(t.replace(/[\s.\-()]/g, ''));
}

codForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const f = codForm.elements;

  // Verificăm câmpurile în ordine și ne oprim la prima problemă
  const greseli = [
    [!f.nume.value.trim(), f.nume, 'Scrie numele complet.'],
    [!telefonValid(f.telefon.value), f.telefon, 'Verifică numărul de telefon. Curierul te sună pe el.'],
    [!isValidEmail(f.email.value), f.email, 'Verifică adresa de email.'],
    [!f.judet.value, f.judet, 'Alege județul.'],
    [!f.localitate.value.trim(), f.localitate, 'Scrie localitatea.'],
    [!f.adresa.value.trim(), f.adresa, 'Scrie adresa de livrare.'],
    [!f.termeni.checked, f.termeni, 'Bifează că accepți termenii și condițiile.']
  ];
  codForm.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  const greseala = greseli.find(([areProblema]) => areProblema);
  if (greseala) {
    codError.textContent = greseala[2];
    greseala[1].setAttribute('aria-invalid', 'true');
    greseala[1].focus();
    return;
  }
  codError.textContent = '';

  const date = new FormData(codForm);
  date.append('comanda', rezumatComanda());
  date.append('total', lei(totalCos()));
  date.append('plata', 'Ramburs');
  if (codAcces) date.append('cod_acces_anticipat', codAcces);

  const submit = document.getElementById('cod-submit');
  if (PLATA.ramburs.formspreeUrl) {
    submit.disabled = true;
    submit.textContent = 'Se trimite…';
    try {
      const raspuns = await fetch(PLATA.ramburs.formspreeUrl, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: date
      });
      if (!raspuns.ok) throw new Error('Eroare');
    } catch (error) {
      codError.textContent = 'Comanda nu s-a trimis. Încearcă din nou sau scrie-ne la salut@example.com.';
      submit.disabled = false;
      submit.textContent = 'Trimite comanda';
      return;
    }
    submit.disabled = false;
    submit.textContent = 'Trimite comanda';
  } else {
    // Mod demo: nu se trimite nimic, și îi spunem asta clar
    document.getElementById('cod-success-text').textContent =
      'Mod demo: comanda nu a fost trimisă nicăieri. Vezi README ca să conectezi Formspree.';
  }

  cos = [];
  salveazaCos();
  afiseazaCos();
  codForm.reset();
  codForm.hidden = true;
  const succes = document.getElementById('cod-success');
  succes.hidden = false;
  succes.focus();
});


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
  */

  form.hidden = true;
  successBox.hidden = false;
  successBox.focus();
});


/* ---------- 10. Animații la scroll și anul din subsol ---------- */
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

document.getElementById('year').textContent = new Date().getFullYear();


/* ---------- Pornire ---------- */
afiseazaProduse();
afiseazaCos();
