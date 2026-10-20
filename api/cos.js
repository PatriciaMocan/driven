/* =========================================================
   POST /api/cos
   Salvează coșul clientului care și-a lăsat emailul și a bifat
   „Păstrează-mi coșul”, ca agentul să-i poată scrie dacă nu termină.
   Trimite { email, items: [{ id, qty }], prenume? }.
   Un coș gol oprește emailurile (de exemplu după plată).
   ========================================================= */

const { PRODUCTS } = require('../products.js');
const { db, areBaza, limita } = require('./_db.js');
const { emailValid, normalizeaza } = require('./_email.js');
const { TTL_COS } = require('./_agent.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Folosește POST' });
  if (!areBaza()) return res.status(503).json({ error: 'Neconfigurat' });

  const body = req.body || {};
  if (!emailValid(body.email)) return res.status(400).json({ error: 'Adresa de email nu pare corectă.' });
  const email = normalizeaza(body.email);

  const items = (Array.isArray(body.items) ? body.items : [])
    .map((i) => ({ id: String(i.id), qty: Math.floor(Number(i.qty)) }))
    .filter((i) => PRODUCTS.some((p) => p.id === i.id) && i.qty >= 1 && i.qty <= 10)
    .slice(0, 20);

  try {
    if (!(await limita(req, 'cos', 60, 3600))) return res.status(429).json({ error: 'Prea multe cereri' });

    const vechi = await db.get('cos:' + email);
    const acum = Date.now();

    if (items.length === 0) {
      if (vechi && !vechi.terminat) await db.set('cos:' + email, { ...vechi, items: [], terminat: 'gol' }, TTL_COS);
      await db.zrem('cosuri', email);
      return res.status(200).json({ ok: true });
    }

    // Un coș nou după ce agentul a terminat cu cel vechi: îl luăm de la capăt doar după 14 zile,
    // ca nimeni să nu primească aceleași 3 emailuri de mai multe ori pe săptămână.
    const reia = vechi && vechi.terminat && vechi.terminat !== 'cumparat' && vechi.terminat !== 'gol' &&
      acum - (vechi.ultimulEmail || vechi.actualizat) < 14 * 24 * 3600 * 1000;
    if (reia) return res.status(200).json({ ok: true });

    const neschimbat = vechi && !vechi.terminat && JSON.stringify(vechi.items) === JSON.stringify(items);
    const cos = {
      email,
      prenume: String(body.prenume || (vechi && vechi.prenume) || '').slice(0, 60),
      items,
      creat: (vechi && !vechi.terminat && vechi.creat) || acum,
      // Ceasul pornește de la ultima schimbare din coș
      actualizat: neschimbat ? vechi.actualizat : acum,
      trimise: (vechi && !vechi.terminat && vechi.trimise) || 0,
      ultimulEmail: (vechi && !vechi.terminat && vechi.ultimulEmail) || 0,
      terminat: false
    };
    await db.comenzi([
      ['SET', 'cos:' + email, JSON.stringify(cos), 'EX', TTL_COS],
      ['ZADD', 'cosuri', cos.actualizat, email]
    ]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Eroare coș:', error.message);
    return res.status(500).json({ error: 'Nu am putut salva coșul.' });
  }
};
