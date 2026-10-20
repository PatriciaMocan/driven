/* =========================================================
   Baza de date a agentului de vânzări: Upstash Redis, prin API-ul REST
   (fără npm install). În Vercel: Storage → Upstash for Redis → Connect.
   Vercel adaugă singur KV_REST_API_URL și KV_REST_API_TOKEN.

   Ce ține agentul aici:
     cos:<email>        coșul lăsat de client și câte emailuri a primit
     cosuri             (sorted set) coșurile care așteaptă, după ora ultimei modificări
     client:<email>     clientul, cu comenzile lui din Stripe și ce emailuri a primit
     clienti, abonati, dezabonati   (seturi de emailuri)
     abonat:<email>     abonatul din formularul „Lista Elen”
     recenzie:<id>, poza:<id>, recenzii:asteptare, recenzii:aprobate
   ========================================================= */

const crypto = require('crypto');

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

function areBaza() {
  return Boolean(config());
}

// Mai multe comenzi Redis într-o singură cerere, de forma [['GET', 'x'], ['SET', 'y', '1']]
async function comenzi(lista) {
  if (lista.length === 0) return [];
  const c = config();
  if (!c) throw new Error('Baza de date nu e configurată (KV_REST_API_URL, KV_REST_API_TOKEN).');
  const raspuns = await fetch(c.url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(lista.map((cmd) => cmd.map(String)))
  });
  const date = await raspuns.json();
  if (!raspuns.ok) throw new Error(date.error || 'Eroare la baza de date');
  return date.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

async function comanda(...args) {
  return (await comenzi([args]))[0];
}

function json(valoare) {
  if (valoare == null) return null;
  try { return JSON.parse(valoare); } catch (e) { return null; }
}

const db = {
  comenzi,
  async get(cheie) { return json(await comanda('GET', cheie)); },
  async mget(chei) {
    const rezultat = [];
    for (let i = 0; i < chei.length; i += 100) {
      const bucata = await comanda('MGET', ...chei.slice(i, i + 100));
      bucata.forEach((v) => rezultat.push(json(v)));
    }
    return rezultat;
  },
  set(cheie, valoare, secunde) {
    return secunde
      ? comanda('SET', cheie, JSON.stringify(valoare), 'EX', secunde)
      : comanda('SET', cheie, JSON.stringify(valoare));
  },
  // Text simplu, fără JSON (pentru poze)
  setText(cheie, text) { return comanda('SET', cheie, text); },
  getText(cheie) { return comanda('GET', cheie); },
  del(...chei) { return comanda('DEL', ...chei); },
  sadd(cheie, ...membri) { return comanda('SADD', cheie, ...membri); },
  srem(cheie, ...membri) { return comanda('SREM', cheie, ...membri); },
  smembers(cheie) { return comanda('SMEMBERS', cheie); },
  async sismember(cheie, membru) { return (await comanda('SISMEMBER', cheie, membru)) === 1; },
  scard(cheie) { return comanda('SCARD', cheie); },
  zadd(cheie, scor, membru) { return comanda('ZADD', cheie, scor, membru); },
  zrem(cheie, ...membri) { return comanda('ZREM', cheie, ...membri); },
  zcard(cheie) { return comanda('ZCARD', cheie); },
  zrangeByScore(cheie, min, max) { return comanda('ZRANGE', cheie, min, max, 'BYSCORE'); },
  zrevrange(cheie, start, stop) { return comanda('ZRANGE', cheie, start, stop, 'REV'); }
};

/* Cel mult `max` cereri în `secunde` de la aceeași adresă IP.
   Întoarce true dacă cererea poate trece. */
async function limita(req, nume, max, secunde) {
  const cheie = `limita:${nume}:${ipul(req)}`;
  const [numar] = await comenzi([['INCR', cheie], ['EXPIRE', cheie, secunde, 'NX']]);
  return numar <= max;
}

function ipul(req) {
  return String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'necunoscut').split(',')[0].trim();
}

/* Parola din admin.html (variabila ADMIN_PAROLA din Vercel), trimisă în antetul x-admin */
function esteAdmin(req) {
  const parola = process.env.ADMIN_PAROLA;
  let primita = String(req.headers['x-admin'] || '');
  try { primita = decodeURIComponent(primita); } catch (e) { /* o lăsăm cum e */ } // admin.html o codează, pentru diacritice
  if (!parola || parola.length < 8) return false;
  const a = crypto.createHash('sha256').update(primita).digest();
  const b = crypto.createHash('sha256').update(parola).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { db, areBaza, limita, ipul, esteAdmin };
