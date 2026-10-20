/* =========================================================
   /api/admin   folosit de admin.html, cu parola ADMIN_PAROLA în antetul x-admin
     GET                        starea agentului, statistici, recenzii
     GET ?previzualizare=cos1   cum arată un email (cos1, cos2, cos3, recenzie, lansare, recomandare)
     POST { actiune: 'aproba' | 'respinge' | 'sterge', id }      recenzii
     POST { actiune: 'ruleaza', simulare: true | false }          pornește agentul acum
     POST { actiune: 'dezaboneaza', email }                       oprește toate emailurile către cineva
   ========================================================= */

const { PRODUCTS, PRECOMANDA } = require('../products.js');
const { db, areBaza, esteAdmin, ipul } = require('./_db.js');
const { poateTrimite, siteUrl, emailValid, normalizeaza } = require('./_email.js');
const { ruleaza, previzualizeaza, opresteCos } = require('./_agent.js');

const TIPURI = ['cos1', 'cos2', 'cos3', 'recenzie', 'lansare', 'recomandare'];

async function stare() {
  const [cosuri, clienti, abonati, dezabonati, recuperate, recuperateLei, ultimaRulare, listaRecuperate, ...trimise] = await db.comenzi([
    ['ZCARD', 'cosuri'], ['SCARD', 'clienti'], ['SCARD', 'abonati'], ['SCARD', 'dezabonati'],
    ['GET', 'stat:recuperate'], ['GET', 'stat:recuperate:lei'], ['GET', 'agent:ultimaRulare'],
    ['LRANGE', 'recuperate', 0, 9],
    ...TIPURI.map((t) => ['GET', 'stat:trimise:' + t])
  ]);

  const idsAsteptare = await db.smembers('recenzii:asteptare');
  const idsAprobate = await db.zrevrange('recenzii:aprobate', 0, 23);
  const toate = await db.mget([...idsAsteptare, ...idsAprobate].map((id) => 'recenzie:' + id));
  const forma = (r) => r && ({
    id: r.id, nume: r.nume, email: r.email, nota: r.nota, text: r.text, data: r.data, poza: r.poza, stare: r.stare,
    produs: (PRODUCTS.find((p) => p.id === r.produs) || {}).nume || r.produs
  });

  return {
    configurare: {
      baza: true,
      email: poateTrimite(),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY),
      cron: Boolean(process.env.CRON_SECRET),
      accesAnticipat: Boolean(process.env.ACCES_ANTICIPAT_COD),
      emailAdmin: Boolean(process.env.EMAIL_ADMIN),
      livrataPe: PRECOMANDA.livrataPe || '',
      site: siteUrl()
    },
    numere: { cosuri, clienti, abonati, dezabonati },
    recuperate: { numar: Number(recuperate) || 0, lei: Number(recuperateLei) || 0, ultimele: listaRecuperate.map((x) => JSON.parse(x)) },
    trimise: Object.fromEntries(TIPURI.map((t, i) => [t, Number(trimise[i]) || 0])),
    ultimaRulare: ultimaRulare ? JSON.parse(ultimaRulare) : null,
    recenzii: {
      asteptare: toate.slice(0, idsAsteptare.length).map(forma).filter(Boolean).sort((a, b) => b.data - a.data),
      aprobate: toate.slice(idsAsteptare.length).map(forma).filter(Boolean)
    }
  };
}

async function schimbaRecenzie(actiune, id) {
  const recenzie = await db.get('recenzie:' + id);
  if (!recenzie) throw new Error('Recenzia nu mai există.');
  if (actiune === 'sterge') {
    await db.comenzi([['DEL', 'recenzie:' + id, 'poza:' + id], ['SREM', 'recenzii:asteptare', id], ['ZREM', 'recenzii:aprobate', id]]);
    return;
  }
  recenzie.stare = actiune === 'aproba' ? 'aprobata' : 'respinsa';
  await db.comenzi([
    ['SET', 'recenzie:' + id, JSON.stringify(recenzie)],
    ['SREM', 'recenzii:asteptare', id],
    actiune === 'aproba' ? ['ZADD', 'recenzii:aprobate', recenzie.data, id] : ['ZREM', 'recenzii:aprobate', id]
  ]);
}

module.exports = async (req, res) => {
  if (!process.env.ADMIN_PAROLA) return res.status(503).json({ error: 'Pune ADMIN_PAROLA (minim 8 caractere) în Vercel și fă Redeploy.' });
  if (!areBaza()) return res.status(503).json({ error: 'Baza de date nu e configurată. Vezi README, „Agentul de vânzări”.' });

  // După 20 de parole greșite într-o oră, adresa IP e blocată o oră
  const cheieGresite = 'limita:admin:' + ipul(req);
  if (Number(await db.getText(cheieGresite)) >= 20) return res.status(429).json({ error: 'Prea multe încercări. Mai încearcă peste o oră.' });
  if (!esteAdmin(req)) {
    await db.comenzi([['INCR', cheieGresite], ['EXPIRE', cheieGresite, 3600, 'NX']]);
    return res.status(401).json({ error: 'Parolă greșită.' });
  }
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET' && req.query.previzualizare) {
      const tip = String(req.query.previzualizare);
      if (!TIPURI.includes(tip)) return res.status(400).json({ error: 'Email necunoscut' });
      return res.status(200).json(await previzualizeaza(tip));
    }
    if (req.method === 'GET') return res.status(200).json(await stare());
    if (req.method !== 'POST') return res.status(405).json({ error: 'Folosește GET sau POST' });

    const b = req.body || {};
    if (['aproba', 'respinge', 'sterge'].includes(b.actiune)) {
      await schimbaRecenzie(b.actiune, String(b.id || '').replace(/[^a-f0-9]/g, ''));
      return res.status(200).json({ ok: true });
    }
    if (b.actiune === 'ruleaza') {
      return res.status(200).json(await ruleaza({ simulare: b.simulare !== false }));
    }
    if (b.actiune === 'dezaboneaza') {
      if (!emailValid(b.email)) return res.status(400).json({ error: 'Adresa nu pare corectă.' });
      const email = normalizeaza(b.email);
      await db.sadd('dezabonati', email);
      await opresteCos(email, 'dezabonat');
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'Acțiune necunoscută' });
  } catch (error) {
    console.error('Eroare admin:', error);
    return res.status(500).json({ error: error.message });
  }
};
