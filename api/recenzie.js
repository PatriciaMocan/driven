/* =========================================================
   /api/recenzie?t=...   folosit de recenzie.html
   Linkul vine din emailul de recenzie trimis de agent și e semnat,
   deci doar clientul care a cumpărat poate scrie recenzia comenzii lui.
     GET   ce a cumpărat clientul (pentru formular)
     POST  { t, produs, nota, text, nume, poza, acord } salvează recenzia
           ca „în așteptare”. Apare pe site doar după ce o aprobi în admin.html.
   Poza e micșorată în browser (cel mult 1400 px) și salvată în baza de date.
   ========================================================= */

const crypto = require('crypto');
const { PRODUCTS } = require('../products.js');
const { db, areBaza } = require('./_db.js');
const { verifica, poateTrimite, trimite, esc, siteUrl } = require('./_email.js');

const MAX_POZA = 700 * 1024; // după micșorare, o poză are de obicei 150–400 KB

function idRecenzie(sesiune, produs) {
  return crypto.createHash('sha256').update(sesiune + ':' + produs).digest('hex').slice(0, 16);
}

// „Ana Popescu” -> „Ana P.”
function numeAfisat(nume) {
  const parti = String(nume || '').trim().split(/\s+/).filter(Boolean);
  if (parti.length === 0) return '';
  return parti.length === 1 ? parti[0] : parti[0] + ' ' + parti[parti.length - 1][0].toUpperCase() + '.';
}

async function comandaDinToken(token) {
  const date = verifica(token, 'r');
  if (!date) return null;
  const client = await db.get('client:' + date.e);
  const comanda = client && (client.comenzi || []).find((c) => c.sesiune === date.s);
  if (!comanda) return null;
  const produse = Object.keys(comanda.produse || {}).map((id) => PRODUCTS.find((p) => p.id === id)).filter(Boolean);
  return { client, comanda, produse };
}

async function anuntaAdmin(recenzie, produs) {
  if (!process.env.EMAIL_ADMIN || !poateTrimite()) return;
  const link = siteUrl() + '/admin.html';
  await trimite([{
    catre: process.env.EMAIL_ADMIN,
    subiect: `Recenzie nouă: ${produs.nume}, ${recenzie.nota}/5${recenzie.poza ? ', cu poză' : ''}`,
    html: `<p>${esc(recenzie.nume)} a scris despre ${esc(produs.nume)} (${recenzie.nota}/5):</p>
           <blockquote>${esc(recenzie.text)}</blockquote>
           <p><a href="${esc(link)}">Aprob-o sau respinge-o în admin</a>. Nu apare pe site până nu o aprobi.</p>`,
    text: `${recenzie.nume} a scris despre ${produs.nume} (${recenzie.nota}/5):\n\n${recenzie.text}\n\nAprobă în admin: ${link}`,
    tip: 'admin-recenzie',
    cheie: 'admin-recenzie:' + recenzie.id + ':' + recenzie.data,
    faraDezabonare: true
  }]);
}

module.exports = async (req, res) => {
  if (!areBaza()) return res.status(503).json({ error: 'Recenziile nu sunt pornite încă.' });
  const token = req.method === 'POST' ? (req.body || {}).t : req.query.t;

  try {
    const gasit = await comandaDinToken(token);
    if (!gasit) return res.status(404).json({ error: 'Linkul nu mai merge. Scrie-ne și îți trimitem altul.' });
    const { client, comanda, produse } = gasit;

    if (req.method === 'GET') {
      const deja = await db.mget(produse.map((p) => 'recenzie:' + idRecenzie(comanda.sesiune, p.id)));
      return res.status(200).json({
        prenume: String(client.nume || '').split(/\s+/)[0],
        nume: numeAfisat(client.nume),
        produse: produse.map((p, i) => ({ id: p.id, nume: p.nume, culoare: p.culoare, poza: p.poze[0], scrisa: Boolean(deja[i]) }))
      });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Folosește GET sau POST' });

    const b = req.body || {};
    const produs = produse.find((p) => p.id === b.produs);
    const nota = Math.floor(Number(b.nota));
    const text = String(b.text || '').trim().slice(0, 1500);
    const nume = String(b.nume || '').trim().slice(0, 40);
    if (!produs) return res.status(400).json({ error: 'Alege rama.' });
    if (!(nota >= 1 && nota <= 5)) return res.status(400).json({ error: 'Alege o notă de la 1 la 5.' });
    if (text.length < 3) return res.status(400).json({ error: 'Scrie câteva cuvinte.' });
    if (!nume) return res.status(400).json({ error: 'Scrie numele care să apară lângă recenzie.' });
    if (b.acord !== true) return res.status(400).json({ error: 'Bifează acordul ca să putem publica recenzia.' });

    let poza = null;
    if (b.poza) {
      poza = String(b.poza).replace(/^data:image\/jpeg;base64,/, '');
      const bytes = Buffer.from(poza, 'base64');
      if (bytes.length > MAX_POZA) return res.status(413).json({ error: 'Poza e prea mare.' });
      if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return res.status(400).json({ error: 'Poza trebuie să fie JPG.' });
    }

    const id = idRecenzie(comanda.sesiune, produs.id);
    const recenzie = {
      id, sesiune: comanda.sesiune, email: client.email, produs: produs.id,
      nota, text, nume, poza: Boolean(poza), stare: 'asteptare', data: Date.now()
    };
    const cmd = [
      ['SET', 'recenzie:' + id, JSON.stringify(recenzie)],
      ['SADD', 'recenzii:asteptare', id],
      ['ZREM', 'recenzii:aprobate', id] // dacă o rescrie, o mai verifici o dată
    ];
    cmd.push(poza ? ['SET', 'poza:' + id, poza] : ['DEL', 'poza:' + id]);
    await db.comenzi(cmd);

    try { await anuntaAdmin(recenzie, produs); } catch (e) { console.error('Email admin:', e.message); }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Eroare recenzie:', error.message);
    return res.status(500).json({ error: 'Nu am putut salva recenzia. Încearcă din nou.' });
  }
};
