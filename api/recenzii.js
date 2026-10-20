/* =========================================================
   GET /api/recenzii             recenziile aprobate, pentru secțiunea „Purtați de voi”
   GET /api/recenzii?poza=ID     poza unei recenzii aprobate
                                 (sau a oricărei recenzii, pentru admin.html, cu antetul x-admin)
   ========================================================= */

const { PRODUCTS } = require('../products.js');
const { db, areBaza, esteAdmin } = require('./_db.js');

module.exports = async (req, res) => {
  if (!areBaza()) return res.status(200).json({ recenzii: [] });

  try {
    if (req.query.poza) {
      const id = String(req.query.poza).replace(/[^a-f0-9]/g, '');
      const recenzie = await db.get('recenzie:' + id);
      const admin = esteAdmin(req);
      if (!recenzie || (recenzie.stare !== 'aprobata' && !admin)) return res.status(404).end();
      const poza = await db.getText('poza:' + id);
      if (!poza) return res.status(404).end();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', admin ? 'private, no-store' : 'public, max-age=86400, s-maxage=86400');
      return res.status(200).send(Buffer.from(poza, 'base64'));
    }

    const ids = await db.zrevrange('recenzii:aprobate', 0, 23);
    const recenzii = (await db.mget(ids.map((id) => 'recenzie:' + id)))
      .filter((r) => r && r.stare === 'aprobata')
      .map((r) => {
        const p = PRODUCTS.find((x) => x.id === r.produs);
        return {
          id: r.id, nume: r.nume, nota: r.nota, text: r.text, data: r.data,
          produs: r.produs, numeProdus: p ? p.nume : '',
          poza: r.poza ? '/api/recenzii?poza=' + r.id + '&v=' + r.data : null
        };
      });
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({ recenzii });
  } catch (error) {
    console.error('Eroare recenzii:', error.message);
    return res.status(200).json({ recenzii: [] });
  }
};
