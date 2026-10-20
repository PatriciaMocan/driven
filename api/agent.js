/* =========================================================
   GET /api/agent
   Pornește agentul de vânzări (vezi api/_agent.js și agent.js).
   Îl apelează singur Vercel Cron (vercel.json) și GitHub Actions
   (.github/workflows/agent-vanzari.yml), cu antetul
     Authorization: Bearer <CRON_SECRET>
   Fără CRON_SECRET corect nu rulează, ca nimeni din afară să nu poată trimite emailuri.
   ?simulare=1  spune ce ar trimite, fără să trimită.
   ========================================================= */

const crypto = require('crypto');
const { areBaza } = require('./_db.js');
const { ruleaza } = require('./_agent.js');

function autorizat(req) {
  const secret = process.env.CRON_SECRET;
  const primit = String(req.headers.authorization || '');
  const asteptat = 'Bearer ' + secret;
  return Boolean(secret) && primit.length === asteptat.length &&
    crypto.timingSafeEqual(Buffer.from(primit), Buffer.from(asteptat));
}

module.exports = async (req, res) => {
  if (!autorizat(req)) return res.status(401).json({ error: 'Neautorizat' });
  if (!areBaza()) return res.status(503).json({ error: 'Baza de date nu e configurată. Vezi README, „Agentul de vânzări”.' });

  try {
    const raport = await ruleaza({ simulare: req.query.simulare === '1' });
    return res.status(200).json(raport);
  } catch (error) {
    console.error('Eroare agent:', error);
    return res.status(500).json({ error: error.message });
  }
};
