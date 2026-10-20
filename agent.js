/* =========================================================
   Elen — Agentul de clienți (pagina agent.html)
   Cere agentului (api/agent-clienti.js) prospecți noi și ține tabelul:
   nume, link, notă, mesajul propus și stadiul la care ați ajuns.

   Nimic nu pleacă singur. Un mesaj poate fi copiat doar după ce l-ai aprobat,
   iar trimiterea o faci tu, din Instagram, TikTok sau email.
   Lista e salvată în browser (localStorage). Folosește „Salvează o copie”.
   ========================================================= */

const CHEIE_LISTA = 'elen-agent-prospecti';
const CHEIE_PAROLA = 'elen-agent-parola';

const STADII = {
  de_aprobat: 'De aprobat',
  aprobat: 'Aprobat, de trimis',
  trimis: 'Trimis',
  raspuns: 'A răspuns',
  colaborare: 'Colaborăm',
  refuzat: 'Nu e interesat',
  respins: 'Respins de tine'
};

const CATEGORII = {
  'creatori-moda': 'Creatori · modă',
  'creatori-lifestyle': 'Creatori · lifestyle',
  'creatori-travel': 'Creatori · travel',
  buticuri: 'Buticuri',
  saloane: 'Saloane',
  hoteluri: 'Hoteluri boutique'
};

const TIPURI_MESAJ = {
  colaborare: 'Colaborare',
  cadou: 'Produs cadou',
  cod_reducere: 'Cod de reducere',
  revanzare: 'Să-i vândă în locație'
};

const $ = (id) => document.getElementById(id);

/* ---------- Salvare în browser ---------- */
function citesteLista() {
  try {
    const date = JSON.parse(localStorage.getItem(CHEIE_LISTA) || '[]');
    return Array.isArray(date) ? date : [];
  } catch (e) {
    return [];
  }
}

function salveazaLista() {
  try {
    localStorage.setItem(CHEIE_LISTA, JSON.stringify(prospecti));
  } catch (e) {
    alert('Nu am putut salva lista în browser. Descarcă o copie ca să nu o pierzi.');
  }
}

let prospecti = citesteLista();

function parola() {
  try { return sessionStorage.getItem(CHEIE_PAROLA) || ''; } catch (e) { return ''; }
}

/* ---------- Ajutoare ---------- */
function esc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function idNou() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function azi() {
  return new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

function urmaritori(n) {
  if (n == null) return '';
  return n >= 1000 ? (Math.round(n / 100) / 10).toString().replace('.', ',') + 'k urmăritori' : n + ' urmăritori';
}

function cheieLink(link) {
  return String(link).toLowerCase().replace(/\/+$/, '');
}

function gaseste(id) {
  return prospecti.find((p) => p.id === id);
}

function schimbaStadiu(p, stadiu) {
  p.stadiu = stadiu;
  p.istoric = (p.istoric || []).concat({ stadiu, data: new Date().toISOString() });
}

/* Cererea către agent. Parola merge în antet, nu în link. */
async function intreabaAgentul(date) {
  const raspuns = await fetch('/api/agent-clienti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-parola': parola() },
    body: JSON.stringify(date)
  });
  let json = {};
  try { json = await raspuns.json(); } catch (e) { /* răspuns gol */ }
  if (raspuns.status === 401) {
    iesi();
    throw new Error('Parolă greșită.');
  }
  if (!raspuns.ok) throw new Error(json.error || 'Agentul nu răspunde. Pe calculator, agentul merge doar pe Vercel.');
  return json;
}

/* ---------- Tabelul ---------- */
function randHtml(p) {
  const detalii = [p.cont, p.platforma, p.oras, urmaritori(p.urmaritori)].filter(Boolean).map(esc).join(' · ');
  const surse = (p.surse || []).map((s, i) => `<a href="${esc(s)}" target="_blank" rel="noopener">sursa ${i + 1}</a>`).join(' ');
  const tipuri = Object.entries(TIPURI_MESAJ)
    .map(([k, v]) => `<option value="${k}"${k === p.tipMesaj ? ' selected' : ''}>${v}</option>`).join('');
  const stadii = Object.entries(STADII)
    .map(([k, v]) => `<option value="${k}"${k === p.stadiu ? ' selected' : ''}>${v}</option>`).join('');
  const istoric = p.istoric || [];
  const ultim = istoric[istoric.length - 1];
  const cand = ultim ? new Date(ultim.data).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) : '';

  let actiuni;
  if (p.stadiu === 'de_aprobat') {
    actiuni = `<button type="button" class="btn btn-primary btn-small" data-actiune="aproba">Aprobă mesajul</button>`;
  } else if (p.stadiu === 'aprobat') {
    actiuni = `<button type="button" class="btn btn-primary btn-small" data-actiune="copiaza">Copiază și deschide profilul</button>
               <button type="button" class="btn btn-outline btn-small" data-actiune="trimis">L-am trimis</button>`;
  } else {
    actiuni = `<button type="button" class="btn btn-outline btn-small" data-actiune="copiaza-doar">Copiază mesajul</button>`;
  }

  return `<tr data-id="${esc(p.id)}" class="stadiu-${esc(p.stadiu)}">
    <td class="col-nume" data-eticheta="Nume">
      <a class="agent-nume" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.nume)}</a>
      <span class="agent-mic">${detalii}</span>
      <span class="agent-mic">${esc(CATEGORII[p.categorie] || p.categorie)}</span>
      ${p.deCe ? `<p class="agent-dece">${esc(p.deCe)}</p>` : ''}
      <span class="agent-mic">${surse}</span>
      <button type="button" class="agent-link agent-sterge" data-actiune="sterge">Șterge</button>
    </td>
    <td class="col-nota" data-eticheta="Notă">
      <span class="agent-nota nota-${p.nota >= 75 ? 'mare' : p.nota >= 55 ? 'medie' : 'mica'}">${esc(p.nota)}</span>
      <span class="agent-mic">Estetică ${esc(p.note.estetica)} · Public ${esc(p.note.public)} · Lux ${esc(p.note.lux)}</span>
      ${p.branduriLux ? `<span class="agent-mic">A promovat: ${esc(p.branduriLux)}</span>` : ''}
    </td>
    <td class="col-mesaj" data-eticheta="Mesajul propus">
      <label class="visually-hidden" for="tip-${esc(p.id)}">Tipul mesajului</label>
      <select id="tip-${esc(p.id)}" data-camp="tipMesaj">${tipuri}</select>
      <label class="visually-hidden" for="mesaj-${esc(p.id)}">Mesajul</label>
      <textarea id="mesaj-${esc(p.id)}" data-camp="mesaj" rows="7">${esc(p.mesaj)}</textarea>
      <div class="agent-rescrie">
        <label class="visually-hidden" for="indicatie-${esc(p.id)}">Ce să schimbe agentul</label>
        <input type="text" id="indicatie-${esc(p.id)}" placeholder="Ce să schimbe? (ex. mai scurt, mai cald)">
        <button type="button" class="agent-link" data-actiune="rescrie">Rescrie cu agentul</button>
      </div>
      <div class="agent-actiuni">${actiuni}</div>
    </td>
    <td class="col-stadiu" data-eticheta="Stadiu">
      <label class="visually-hidden" for="stadiu-${esc(p.id)}">Stadiu</label>
      <select id="stadiu-${esc(p.id)}" data-camp="stadiu">${stadii}</select>
      ${cand ? `<span class="agent-mic">din ${esc(cand)}</span>` : ''}
    </td>
  </tr>`;
}

function umpleFiltre() {
  const fs = $('filtru-stadiu');
  const fc = $('filtru-categorie');
  const alesS = fs.value;
  const alesC = fc.value;
  const numar = (cheie, val) => prospecti.filter((p) => p[cheie] === val).length;
  fs.innerHTML = `<option value="">Toate stadiile (${prospecti.length})</option>` +
    Object.entries(STADII).map(([k, v]) => `<option value="${k}">${v} (${numar('stadiu', k)})</option>`).join('');
  fc.innerHTML = '<option value="">Toate categoriile</option>' +
    Object.entries(CATEGORII).map(([k, v]) => `<option value="${k}">${v} (${numar('categorie', k)})</option>`).join('');
  fs.value = alesS;
  fc.value = alesC;
}

function deseneaza() {
  umpleFiltre();
  const stadiu = $('filtru-stadiu').value;
  const categorie = $('filtru-categorie').value;
  const vizibili = prospecti
    .filter((p) => (!stadiu || p.stadiu === stadiu) && (!categorie || p.categorie === categorie))
    .sort((a, b) => b.nota - a.nota);
  $('randuri').innerHTML = vizibili.map(randHtml).join('');
  $('numar').textContent = vizibili.length ? `(${vizibili.length})` : '';
  $('gol').hidden = vizibili.length > 0;
  $('gol').textContent = prospecti.length
    ? 'Niciun prospect la filtrele alese.'
    : 'Încă nu ai prospecți. Alege o categorie și apasă „Caută”.';
}

/* ---------- Ce faci în tabel ---------- */
$('randuri').addEventListener('input', (e) => {
  const rand = e.target.closest('tr');
  const p = rand && gaseste(rand.dataset.id);
  if (!p || e.target.dataset.camp !== 'mesaj') return;
  p.mesaj = e.target.value;
  salveazaLista();
});

$('randuri').addEventListener('change', (e) => {
  const rand = e.target.closest('tr');
  const p = rand && gaseste(rand.dataset.id);
  const camp = e.target.dataset.camp;
  if (!p || !camp) return;

  if (camp === 'stadiu') {
    schimbaStadiu(p, e.target.value);
  } else if (camp === 'tipMesaj') {
    p.tipMesaj = e.target.value;
  } else if (camp === 'mesaj' && p.stadiu === 'aprobat') {
    // Ai schimbat un mesaj deja aprobat: trebuie aprobat din nou
    schimbaStadiu(p, 'de_aprobat');
  }
  salveazaLista();
  deseneaza();
});

$('randuri').addEventListener('click', async (e) => {
  const buton = e.target.closest('[data-actiune]');
  const rand = buton && buton.closest('tr');
  const p = rand && gaseste(rand.dataset.id);
  if (!p) return;
  const actiune = buton.dataset.actiune;

  if (actiune === 'aproba') {
    if (!p.mesaj.trim()) return alert('Mesajul e gol.');
    schimbaStadiu(p, 'aprobat');
  } else if (actiune === 'copiaza' || actiune === 'copiaza-doar') {
    try {
      await navigator.clipboard.writeText(p.mesaj);
    } catch (err) {
      rand.querySelector('textarea').select();
      alert('Nu am putut copia automat. Mesajul e selectat: copiază-l cu Ctrl+C / Cmd+C.');
    }
    if (actiune === 'copiaza') window.open(p.link, '_blank', 'noopener');
    return;
  } else if (actiune === 'trimis') {
    schimbaStadiu(p, 'trimis');
  } else if (actiune === 'sterge') {
    if (!confirm(`Ștergi ${p.nume} din listă?`)) return;
    prospecti = prospecti.filter((x) => x !== p);
  } else if (actiune === 'rescrie') {
    const indicatie = rand.querySelector('input[type="text"]').value.trim();
    buton.disabled = true;
    buton.textContent = 'Scrie…';
    try {
      const nou = await intreabaAgentul({ actiune: 'rescrie', prospect: p, tipMesaj: p.tipMesaj, indicatie });
      p.mesaj = nou.mesaj;
      p.tipMesaj = nou.tipMesaj;
      if (p.stadiu === 'aprobat') schimbaStadiu(p, 'de_aprobat');
    } catch (err) {
      alert(err.message);
    }
  }
  salveazaLista();
  deseneaza();
});

$('filtru-stadiu').addEventListener('change', deseneaza);
$('filtru-categorie').addEventListener('change', deseneaza);

/* ---------- Căutarea ---------- */
function arataPlatforma() {
  $('camp-platforma').hidden = !$('categorie').value.startsWith('creatori');
}
$('categorie').addEventListener('change', arataPlatforma);

$('form-cauta').addEventListener('submit', async (e) => {
  e.preventDefault();
  const buton = $('buton-cauta');
  const status = $('cauta-status');
  buton.disabled = true;
  buton.textContent = 'Caută…';
  status.textContent = 'Agentul caută pe internet și citește profilurile. Durează de obicei 1–4 minute; lasă pagina deschisă.';

  try {
    const categorie = $('categorie').value;
    const raspuns = await intreabaAgentul({
      actiune: 'cauta',
      categorie,
      platforma: $('platforma').value,
      oras: $('oras').value,
      cati: Number($('cati').value),
      exclude: prospecti.map((p) => p.link)
    });
    const existente = new Set(prospecti.map((p) => cheieLink(p.link)));
    const noi = (raspuns.prospecti || []).filter((p) => !existente.has(cheieLink(p.link)));
    noi.forEach((p) => {
      p.id = idNou();
      p.adaugat = new Date().toISOString();
      p.istoric = [];
      schimbaStadiu(p, 'de_aprobat');
    });
    prospecti = prospecti.concat(noi);
    salveazaLista();
    $('filtru-stadiu').value = '';
    $('filtru-categorie').value = '';
    deseneaza();
    status.textContent = noi.length
      ? `Am găsit ${noi.length} ${noi.length === 1 ? 'prospect nou' : 'prospecți noi'} (${azi()}). Citește mesajele și aprobă-le pe cele bune.`
      : 'Nu am găsit pe nimeni nou de data asta. Încearcă alt oraș sau altă categorie.';
  } catch (err) {
    status.textContent = err.message;
  } finally {
    buton.disabled = false;
    buton.textContent = 'Caută';
  }
});

/* ---------- Copii ale listei ---------- */
function descarca(nume, continut, tip) {
  const url = URL.createObjectURL(new Blob([continut], { type: tip }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nume;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const dataFisier = () => new Date().toISOString().slice(0, 10);

$('export-csv').addEventListener('click', () => {
  const coloane = ['Nume', 'Cont', 'Link', 'Platformă', 'Categorie', 'Oraș', 'Urmăritori', 'Notă', 'Estetică', 'Public', 'Lux', 'Branduri promovate', 'De ce', 'Tip mesaj', 'Mesaj propus', 'Stadiu'];
  const celula = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const randuri = prospecti.map((p) => [
    p.nume, p.cont, p.link, p.platforma, CATEGORII[p.categorie] || p.categorie, p.oras, p.urmaritori,
    p.nota, p.note.estetica, p.note.public, p.note.lux, p.branduriLux, p.deCe,
    TIPURI_MESAJ[p.tipMesaj] || p.tipMesaj, p.mesaj, STADII[p.stadiu] || p.stadiu
  ].map(celula).join(','));
  // ﻿ face ca Excel să citească bine diacriticele
  descarca(`prospecti-elen-${dataFisier()}.csv`, '﻿' + [coloane.map(celula).join(',')].concat(randuri).join('\r\n'), 'text/csv;charset=utf-8');
});

$('export-copie').addEventListener('click', () => {
  descarca(`prospecti-elen-${dataFisier()}.json`, JSON.stringify(prospecti, null, 2), 'application/json');
});

$('import-copie').addEventListener('change', async (e) => {
  const fisier = e.target.files[0];
  e.target.value = '';
  if (!fisier) return;
  try {
    const date = JSON.parse(await fisier.text());
    if (!Array.isArray(date) || date.some((p) => !p || !p.id || !p.link || !p.note)) throw new Error();
    const existente = new Set(prospecti.map((p) => p.id));
    const noi = date.filter((p) => !existente.has(p.id));
    if (!confirm(`Adaug ${noi.length} prospecți din copie? Cei pe care îi ai deja rămân cum sunt.`)) return;
    prospecti = prospecti.concat(noi);
    salveazaLista();
    deseneaza();
  } catch (err) {
    alert('Fișierul nu e o copie salvată din agent.');
  }
});

/* ---------- Intrare și ieșire ---------- */
function arata() {
  const intrat = Boolean(parola());
  $('ecran-parola').hidden = intrat;
  $('ecran-agent').hidden = !intrat;
  $('iesire').hidden = !intrat;
  if (intrat) deseneaza();
}

function iesi() {
  try { sessionStorage.removeItem(CHEIE_PAROLA); } catch (e) { /* nimic */ }
  arata();
}

$('form-parola').addEventListener('submit', (e) => {
  e.preventDefault();
  try {
    sessionStorage.setItem(CHEIE_PAROLA, $('parola').value);
  } catch (err) {
    $('parola-eroare').textContent = 'Browserul nu permite salvarea parolei pentru această sesiune.';
    return;
  }
  $('parola').value = '';
  arata();
});

$('iesire').addEventListener('click', iesi);

arataPlatforma();
arata();
