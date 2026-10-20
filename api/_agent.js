/* =========================================================
   Motorul agentului de vânzări. Rulează din api/agent.js (programat)
   sau din admin.html (butonul „Rulează acum”).

   La fiecare rulare:
     1. Citește din Stripe plățile noi și le salvează ca clienți.
        Cine a plătit nu mai primește emailuri despre coșul abandonat.
     2. Coșuri abandonate: emailul 1, 2 sau 3, după orele din agent.js.
     3. Recenzii: la câteva zile după livrare.
     4. Lansări: modelele noi din products.js, către clienți și abonați.
     5. Recomandări: o a doua pereche, la o lună și ceva după livrare.
   Fiecare om primește cel mult un email pe rulare, iar cine s-a dezabonat, niciunul.
   Textele și orele se schimbă în agent.js, nu aici.
   ========================================================= */

const { AGENT, TEXTE, recomanda, poateFiPrecomandat, lista, PRODUCTS, PRECOMANDA } = require('../agent.js');
const { locuriLibere, etapaLansare, marimeRama } = require('../products.js');
const { stripe, numaraRezervari } = require('./_stripe.js');
const { db } = require('./_db.js');
const { siteUrl, poateTrimite, normalizeaza, semneaza, randeaza, trimite, lei } = require('./_email.js');

const ORA = 3600 * 1000;
const ZI = 24 * ORA;
const TTL_COS = 14 * 24 * 3600; // secunde: un coș uitat se șterge singur după 14 zile

const dataRo = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long', timeZone: 'Europe/Bucharest' });

function gaseste(id) {
  return PRODUCTS.find((p) => p.id === id);
}

function bucati(n) {
  if (n === 1) return '1 bucată';
  const rest = n % 100;
  return n + (rest === 0 || rest >= 20 ? ' de bucăți' : ' bucăți');
}

function prenume(nume) {
  return String(nume || '').trim().split(/\s+/)[0] || '';
}

// „o pereche Sola, havana închis” sau „Sola și 2 perechi Lido”
function descrie(produse) {
  if (produse.length === 1 && produse[0].qty === 1) {
    const p = produse[0].produs;
    return `o pereche ${p.nume}, ${p.culoare.toLowerCase()}`;
  }
  return lista(produse.map(({ produs, qty }) => (qty > 1 ? `${qty} perechi ` : '') + produs.nume));
}

function link(cale, campanie) {
  const [inainte, ancora] = cale.split('#');
  const sep = inainte.includes('?') ? '&' : '?';
  return siteUrl() + inainte + sep + 'utm_source=email&utm_medium=agent&utm_campaign=' + campanie + (ancora ? '#' + ancora : '');
}

// Ce au toate textele la dispoziție, indiferent de email
function contextComun(rezervate) {
  return {
    lei,
    bucati,
    livrare: PRECOMANDA.livrare,
    avans: PRECOMANDA.avans,
    libere: (p) => locuriLibere(p, rezervate[p.id] || 0),
    rezervate: (p) => rezervate[p.id] || 0,
    linkMagazin: link('/#magazin', 'recomandari'),
    recomandari: []
  };
}

/* Când a primit clientul ochelarii. Până completezi PRECOMANDA.livrataPe
   în products.js, nimeni nu are ochelarii, deci nu cerem recenzii.
   Comenzile de după data aceea le socotim livrate la 3 zile după plată. */
function dataLivrare(comanda) {
  const serie = Date.parse(PRECOMANDA.livrataPe || '');
  if (isNaN(serie)) return null;
  return Math.max(serie, comanda.data + 3 * ZI);
}

function produseComanda(comanda) {
  return Object.entries(comanda.produse || {})
    .map(([id, qty]) => ({ produs: gaseste(id), qty }))
    .filter((x) => x.produs);
}

function produseCumparate(client) {
  const ids = [];
  (client.comenzi || []).forEach((c) => Object.keys(c.produse || {}).forEach((id) => {
    if (gaseste(id) && !ids.includes(id)) ids.push(id);
  }));
  return ids;
}

async function marcheaza(email, tip, cheie) {
  const client = await db.get('client:' + email);
  if (!client) return;
  client.trimise = client.trimise || {};
  client.trimise[tip] = client.trimise[tip] || {};
  client.trimise[tip][cheie] = Date.now();
  await db.set('client:' + email, client);
}


/* ---------- 1. Plățile din Stripe devin clienți ---------- */
// Întoarce coșul așa cum era înainte să-l oprim
async function opresteCos(email, motiv) {
  const cos = await db.get('cos:' + email);
  if (cos && !cos.terminat) {
    await db.set('cos:' + email, { ...cos, terminat: motiv }, TTL_COS);
  }
  await db.zrem('cosuri', email);
  return cos;
}

async function inregistreazaComanda(s) {
  const email = normalizeaza(s.customer_details.email);
  const produse = {};
  String((s.metadata && s.metadata.elen_produse) || '').split(',').filter(Boolean).forEach((bucata) => {
    const [id, qty] = bucata.split(':');
    produse[id] = (produse[id] || 0) + (Number(qty) || 0);
  });

  const client = (await db.get('client:' + email)) || { email, nume: '', comenzi: [], trimise: {} };
  client.nume = s.customer_details.name || client.nume;
  client.comenzi.push({ sesiune: s.id, data: s.created * 1000, produse, tip: (s.metadata && s.metadata.tip) || '' });
  await db.comenzi([
    ['SET', 'client:' + email, JSON.stringify(client)],
    ['SADD', 'clienti', email],
    ['SADD', 'sesiuni', s.id]
  ]);

  // Coșul nu mai e abandonat. Dacă primise deja emailuri de la agent, e o vânzare recuperată.
  const emailCos = normalizeaza(s.metadata && s.metadata.cos_email);
  for (const e of new Set([email, emailCos].filter(Boolean))) {
    const cos = await opresteCos(e, 'cumparat');
    if (cos && cos.trimise > 0 && cos.terminat !== 'cumparat' && Date.now() - cos.actualizat < 10 * ZI) {
      const suma = Math.round((s.amount_total || 0) / 100);
      await db.comenzi([
        ['INCR', 'stat:recuperate'],
        ['INCRBY', 'stat:recuperate:lei', suma],
        ['LPUSH', 'recuperate', JSON.stringify({ email, data: Date.now(), suma, produse, dupaEmailul: cos.trimise })],
        ['LTRIM', 'recuperate', 0, 49]
      ]);
      break;
    }
  }
}

async function sincronizeazaComenzi() {
  if (!process.env.STRIPE_SECRET_KEY) return 0;
  const inceput = Math.floor(Date.now() / 1000);
  const ultima = await db.get('agent:sincronizare');
  // Cu o zi de rezervă, ca să nu scape nimic. Ce e deja salvat nu se salvează de două ori.
  const filtru = ultima ? '&created%5Bgte%5D=' + (ultima - 86400) : '';

  const sesiuni = [];
  let dupa = '';
  for (let pagina = 0; pagina < 50; pagina += 1) {
    const raspuns = await stripe('checkout/sessions?status=complete&limit=100' + filtru + (dupa ? '&starting_after=' + dupa : ''), { method: 'GET' });
    sesiuni.push(...raspuns.data);
    if (!raspuns.has_more || raspuns.data.length === 0) break;
    dupa = raspuns.data[raspuns.data.length - 1].id;
  }

  const platite = sesiuni.filter((s) => s.payment_status === 'paid' && s.customer_details && s.customer_details.email);
  const deja = await db.comenzi(platite.map((s) => ['SISMEMBER', 'sesiuni', s.id]));
  let noi = 0;
  // Cele mai vechi primele, ca ordinea comenzilor clientului să fie corectă
  for (let i = platite.length - 1; i >= 0; i -= 1) {
    if (deja[i]) continue;
    await inregistreazaComanda(platite[i]);
    noi += 1;
  }
  await db.set('agent:sincronizare', inceput);
  return noi;
}


/* ---------- Coada de emailuri a unei rulări ---------- */
class Coada {
  constructor(dezabonati) {
    this.dezabonati = dezabonati;
    this.atinsi = new Set();
    this.mesaje = [];
  }

  // Întoarce false dacă omul s-a dezabonat, a primit deja ceva acum sau s-a atins limita
  async adauga(m) {
    if (this.mesaje.length >= AGENT.maxEmailuriPeRulare) return false;
    if (this.dezabonati.has(m.catre) || this.atinsi.has(m.catre)) return false;
    this.atinsi.add(m.catre);
    const { html, text } = await randeaza(m.continut, { email: m.catre, motiv: m.motiv });
    this.mesaje.push({ ...m, subiect: m.continut.subiect, html, text });
    return true;
  }
}


/* ---------- 2. Coșuri abandonate ---------- */
async function cosuriAbandonate(coada, ctx, rezervate, acum, clienti) {
  const ore = AGENT.cosAbandonat.ore;
  const emailuri = await db.zrangeByScore('cosuri', 0, acum - ore[0] * ORA);
  if (emailuri.length === 0) return;
  const cosuri = await db.mget(emailuri.map((e) => 'cos:' + e));

  for (let i = 0; i < emailuri.length; i += 1) {
    const email = emailuri[i];
    const cos = cosuri[i];
    if (!cos || cos.terminat) { await db.zrem('cosuri', email); continue; }
    if (coada.dezabonati.has(email)) { await opresteCos(email, 'dezabonat'); continue; }

    const pas = cos.trimise || 0;
    if (pas >= ore.length) { await opresteCos(email, 'complet'); continue; }
    if (acum < cos.actualizat + ore[pas] * ORA) continue;
    // Dacă agentul n-a rulat o vreme, nu trimitem două emailuri unul după altul
    if (cos.ultimulEmail && acum - cos.ultimulEmail < 12 * ORA) continue;

    const produse = (cos.items || [])
      .map((it) => ({ produs: gaseste(it.id), qty: it.qty }))
      .filter((x) => x.produs && poateFiPrecomandat(x.produs, rezervate, new Date(acum)));
    if (produse.length === 0) { await opresteCos(email, 'indisponibil'); continue; }

    const tip = 'cos' + (pas + 1);
    const ids = produse.map((x) => x.produs.id);
    const client = clienti.get(email);
    const c = {
      ...ctx,
      prenume: prenume((client && client.nume) || cos.prenume),
      produse,
      principal: produse[0].produs,
      descriereCos: descrie(produse),
      linkCos: link('/?cos=' + produse.map((x) => `${x.produs.id}:${x.qty}`).join(',') + '#cos', 'cos-abandonat-' + (pas + 1)),
      recomandari: recomanda(ids, { rezervate, acum: new Date(acum), cate: 2 })
    };

    await coada.adauga({
      tip, catre: email, motiv: 'cos', continut: TEXTE[tip](c),
      cheie: `${tip}:${email}:${cos.actualizat}`,
      dupa: async () => {
        const actual = await db.get('cos:' + email);
        if (!actual || actual.terminat) return;
        actual.trimise = pas + 1;
        actual.ultimulEmail = Date.now();
        if (actual.trimise >= ore.length) {
          actual.terminat = 'complet';
          await db.zrem('cosuri', email);
        }
        await db.set('cos:' + email, actual, TTL_COS);
      }
    });
  }
}


/* ---------- 3. Recenzii după livrare ---------- */
async function recenzii(coada, ctx, acum, clienti) {
  const zile = AGENT.recenzie.zileDupaLivrare;
  for (const client of clienti.values()) {
    const trimise = (client.trimise && client.trimise.recenzie) || {};
    for (const comanda of client.comenzi || []) {
      if (trimise[comanda.sesiune]) continue;
      const livrata = dataLivrare(comanda);
      if (!livrata) continue;
      const cand = livrata + zile * ZI;
      if (acum < cand || acum > cand + 60 * ZI) continue; // comenzile foarte vechi nu le mai deranjăm
      const produse = produseComanda(comanda);
      if (produse.length === 0) continue;

      const c = {
        ...ctx,
        prenume: prenume(client.nume),
        produse,
        principal: produse[0].produs,
        descriereComanda: descrie(produse),
        linkRecenzie: siteUrl() + '/recenzie.html?t=' + semneaza('r', { s: comanda.sesiune, e: client.email })
      };
      await coada.adauga({
        tip: 'recenzie', catre: client.email, motiv: 'client', continut: TEXTE.recenzie(c),
        cheie: `recenzie:${comanda.sesiune}`,
        dupa: () => marcheaza(client.email, 'recenzie', comanda.sesiune)
      });
      break; // o comandă pe rulare; următoarea, data viitoare
    }
  }
}


/* ---------- 4. Lansări noi ---------- */
function comparatie(nou, cumparate) {
  const avuta = gaseste(cumparate[0]);
  if (!avuta) return '';
  const mNou = marimeRama(nou);
  if (mNou === marimeRama(avuta)) {
    return `Are aceeași mărime ca perechea ta ${avuta.nume} (${mNou}), deci ar trebui să-ți stea la fel de bine.`;
  }
  return `E o ramă de mărime ${mNou}, cu ${nou.dimensiuni.totala} mm lățime totală. Perechea ta ${avuta.nume} are ${avuta.dimensiuni.totala} mm, ca să știi la ce să te aștepți.`;
}

async function lansari(coada, ctx, rezervate, acum, clienti, abonati) {
  const cod = process.env.ACCES_ANTICIPAT_COD;
  for (const nou of PRODUCTS) {
    if (!nou.lansare) continue;
    const lansare = Date.parse(nou.lansare);
    // Cu cod de acces anticipat, clienții află de la accesAbonati. Fără cod, de la lansare.
    const start = nou.accesAbonati && cod ? Date.parse(nou.accesAbonati) : lansare;
    if (acum < start || acum > lansare + AGENT.lansari.zileDupaLansare * ZI) continue;
    const etapa = etapaLansare(nou, new Date(acum));
    if (etapa === 'curand' || (etapa === 'abonati' && !cod)) continue;
    if (locuriLibere(nou, rezervate[nou.id] || 0) <= 0) continue;

    const anuntati = new Set(await db.smembers('anuntat:' + nou.id));
    const destinatari = new Map();
    abonati.forEach((a) => destinatari.set(a.email, { email: a.email, prenume: a.prenume, motiv: 'abonat', cumparate: [] }));
    clienti.forEach((cl) => destinatari.set(cl.email, { email: cl.email, prenume: prenume(cl.nume), motiv: 'client', cumparate: produseCumparate(cl) }));

    for (const d of destinatari.values()) {
      if (anuntati.has(d.email) || d.cumparate.includes(nou.id)) continue;
      const c = {
        ...ctx,
        prenume: d.prenume,
        nou,
        etapa,
        dataLansare: dataRo.format(new Date(lansare)),
        comparatie: d.cumparate.length ? comparatie(nou, d.cumparate) : '',
        linkLansare: link('/' + (etapa === 'abonati' ? '?acces=' + encodeURIComponent(cod) : '') + '#magazin', 'lansare-' + nou.id),
        recomandari: d.cumparate.length ? recomanda(d.cumparate, { exclude: [nou.id], rezervate, acum: new Date(acum), cate: 2 }) : []
      };
      await coada.adauga({
        tip: 'lansare', catre: d.email, motiv: d.motiv, continut: TEXTE.lansare(c),
        cheie: `lansare:${nou.id}:${d.email}`,
        dupa: () => db.sadd('anuntat:' + nou.id, d.email)
      });
    }
  }
}


/* ---------- 5. Recomandări: a doua pereche ---------- */
async function recomandari(coada, ctx, rezervate, acum, clienti) {
  for (const client of clienti.values()) {
    const livrate = (client.comenzi || []).filter((c) => dataLivrare(c));
    const ultima = livrate[livrate.length - 1];
    if (!ultima) continue;
    const cand = dataLivrare(ultima) + AGENT.recomandari.zileDupaLivrare * ZI;
    if (acum < cand || acum > cand + 30 * ZI) continue;
    if (client.trimise && client.trimise.recomandare && client.trimise.recomandare[ultima.sesiune]) continue;

    const reco = recomanda(produseCumparate(client), { rezervate, acum: new Date(acum) });
    const principal = produseComanda(ultima)[0];
    if (reco.length === 0 || !principal) continue;

    const c = { ...ctx, prenume: prenume(client.nume), principal: principal.produs, recomandari: reco };
    await coada.adauga({
      tip: 'recomandare', catre: client.email, motiv: 'client', continut: TEXTE.recomandare(c),
      cheie: `recomandare:${ultima.sesiune}`,
      dupa: () => marcheaza(client.email, 'recomandare', ultima.sesiune)
    });
  }
}


/* ---------- Rularea ---------- */
async function incarca(set, prefix) {
  const emailuri = await db.smembers(set);
  const inregistrari = await db.mget(emailuri.map((e) => prefix + e));
  return inregistrari.filter(Boolean);
}

async function ruleaza(optiuni) {
  const simulare = Boolean(optiuni && optiuni.simulare) || !poateTrimite();
  const acum = Date.now();
  const raport = { data: new Date(acum).toISOString(), simulare, comenziNoi: 0, emailuri: [], erori: [] };

  let rezervate = {};
  try {
    rezervate = await numaraRezervari();
  } catch (e) {
    raport.erori.push('Stripe (rezervări): ' + e.message);
    PRODUCTS.forEach((p) => { rezervate[p.id] = p.rezervateManual || 0; });
  }
  try {
    raport.comenziNoi = await sincronizeazaComenzi();
  } catch (e) {
    raport.erori.push('Stripe (comenzi): ' + e.message);
  }

  const dezabonati = new Set(await db.smembers('dezabonati'));
  const clienti = new Map((await incarca('clienti', 'client:')).map((c) => [c.email, c]));
  const abonati = await incarca('abonati', 'abonat:');
  const coada = new Coada(dezabonati);
  const ctx = contextComun(rezervate);

  // Ordinea contează: cine primește un email despre coș nu mai primește altceva în aceeași rulare
  if (AGENT.cosAbandonat.activ) await cosuriAbandonate(coada, ctx, rezervate, acum, clienti);
  if (AGENT.recenzie.activ) await recenzii(coada, ctx, acum, clienti);
  if (AGENT.lansari.activ) await lansari(coada, ctx, rezervate, acum, clienti, abonati);
  if (AGENT.recomandari.activ) await recomandari(coada, ctx, rezervate, acum, clienti);

  const trimise = [];
  if (!simulare) {
    for (let i = 0; i < coada.mesaje.length; i += 100) {
      const bucata = coada.mesaje.slice(i, i + 100);
      try {
        await trimite(bucata);
      } catch (e) {
        raport.erori.push(e.message);
        break; // restul pleacă la rularea următoare
      }
      for (const m of bucata) {
        try { await m.dupa(); } catch (e) { raport.erori.push(`Salvare după ${m.tip} (${m.catre}): ${e.message}`); }
        trimise.push(m);
      }
    }
    if (trimise.length) {
      const pe = {};
      trimise.forEach((m) => { pe[m.tip] = (pe[m.tip] || 0) + 1; });
      await db.comenzi(Object.entries(pe).map(([tip, n]) => ['INCRBY', 'stat:trimise:' + tip, n]));
    }
  }

  raport.emailuri = (simulare ? coada.mesaje : trimise).map((m) => ({ tip: m.tip, catre: m.catre, subiect: m.subiect }));
  await db.set('agent:ultimaRulare', { ...raport, emailuri: raport.emailuri.slice(0, 50), numarEmailuri: raport.emailuri.length });
  return raport;
}


/* ---------- Previzualizare pentru admin.html ----------
   Arată fiecare email cu date de exemplu, fără să trimită nimic. */
async function previzualizeaza(tip) {
  const rezervate = {};
  PRODUCTS.forEach((p) => { rezervate[p.id] = p.rezervateManual || 0; });
  const ctx = contextComun(rezervate);
  const [a, b] = PRODUCTS;
  const nou = PRODUCTS.find((p) => p.lansare) || PRODUCTS[PRODUCTS.length - 1];
  const produse = [{ produs: a, qty: 1 }];
  const c = {
    ...ctx,
    prenume: 'Ana',
    produse,
    principal: a,
    descriereCos: descrie(produse),
    descriereComanda: descrie(produse),
    linkCos: link(`/?cos=${a.id}:1#cos`, 'previzualizare'),
    linkRecenzie: siteUrl() + '/recenzie.html',
    nou,
    etapa: etapaLansare(nou) === 'disponibil' ? 'disponibil' : 'abonati',
    dataLansare: nou.lansare ? dataRo.format(new Date(nou.lansare)) : '',
    comparatie: comparatie(nou, [a.id]),
    linkLansare: link('/#magazin', 'previzualizare'),
    recomandari: recomanda([a.id], { rezervate, exclude: [nou.id] })
  };
  if (!TEXTE[tip]) throw new Error('Nu există emailul ' + tip);
  if (tip === 'recomandare' && c.recomandari.length === 0) c.recomandari = [{ produs: b, motiv: 'Exemplu.' }];
  const continut = TEXTE[tip](c);
  const { html } = await randeaza(continut, { email: 'ana@exemplu.ro', motiv: tip.startsWith('cos') ? 'cos' : 'client' });
  return { subiect: continut.subiect, html };
}

module.exports = { ruleaza, previzualizeaza, opresteCos, TTL_COS };
