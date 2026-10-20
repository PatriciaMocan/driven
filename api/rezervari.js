/* =========================================================
   GET /api/rezervari
   Spune paginii câte bucăți s-au rezervat din fiecare model,
   pentru contorul „34 din 100 rezervate”.
   Răspunsul e păstrat 30 de secunde, ca să nu întrebăm Stripe la fiecare vizitator.
   ========================================================= */

const { numaraRezervari } = require('./_stripe.js');

module.exports = async (req, res) => {
  try {
    const rezervate = await numaraRezervari();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    return res.status(200).json({ rezervate });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Nu am putut citi rezervările.' });
  }
};
