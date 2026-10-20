/* =========================================================
   POST /api/abonare
   Formularul „Lista Elen” din index.html. Abonații primesc de la agent
   emailurile despre lansări, cu linkul de acces anticipat.
   Trimite { email, prenume?, consent: true }.
   ========================================================= */

const { db, areBaza, limita } = require('./_db.js');
const { emailValid, normalizeaza } = require('./_email.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Folosește POST' });
  if (!areBaza()) return res.status(503).json({ error: 'Neconfigurat' });

  const body = req.body || {};
  if (!emailValid(body.email)) return res.status(400).json({ error: 'Adresa de email nu pare corectă.' });
  if (body.consent !== true) return res.status(400).json({ error: 'Lipsește acordul.' });
  const email = normalizeaza(body.email);

  try {
    if (!(await limita(req, 'abonare', 10, 3600))) return res.status(429).json({ error: 'Prea multe cereri' });
    const abonat = { email, prenume: String(body.prenume || '').trim().slice(0, 60), data: Date.now() };
    await db.comenzi([
      ['SET', 'abonat:' + email, JSON.stringify(abonat)],
      ['SADD', 'abonati', email],
      ['SREM', 'dezabonati', email] // s-a abonat din nou, deci vrea emailuri
    ]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Eroare abonare:', error.message);
    return res.status(500).json({ error: 'Nu am putut salva adresa.' });
  }
};
