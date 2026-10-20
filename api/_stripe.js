/* =========================================================
   Cod comun pentru funcțiile care vorbesc cu Stripe.
   Fișierele din api/ care încep cu _ nu devin pagini pe Vercel.
   ========================================================= */

const { PRODUCTS } = require('../products.js');

// Cerere către API-ul Stripe, cu cheia secretă din Vercel
async function stripe(cale, optiuni) {
  const raspuns = await fetch('https://api.stripe.com/v1/' + cale, {
    ...optiuni,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  const date = await raspuns.json();
  if (!raspuns.ok) throw new Error((date.error && date.error.message) || 'Eroare Stripe');
  return date;
}

/* Câte bucăți din fiecare model au fost precomandate și plătite pe site.
   Citește plățile reușite din Stripe; fiecare are în metadata lista de produse,
   de forma "sola:2,lido:1" (o scrie api/checkout.js).
   Adaugă și rezervateManual din products.js.
   Întoarce { sola: 34, lido: 12, ... } */
async function numaraRezervari() {
  const total = {};
  PRODUCTS.forEach((p) => { total[p.id] = p.rezervateManual || 0; });

  if (!process.env.STRIPE_SECRET_KEY) return total;

  let dupa = '';
  for (let pagina = 0; pagina < 50; pagina += 1) { // cel mult 5.000 de plăți
    const lista = await stripe('checkout/sessions?status=complete&limit=100' + (dupa ? '&starting_after=' + dupa : ''), { method: 'GET' });
    for (const sesiune of lista.data) {
      const produse = (sesiune.metadata && sesiune.metadata.elen_produse) || '';
      produse.split(',').filter(Boolean).forEach((bucata) => {
        const [id, qty] = bucata.split(':');
        if (id in total) total[id] += Number(qty) || 0;
      });
    }
    if (!lista.has_more || lista.data.length === 0) break;
    dupa = lista.data[lista.data.length - 1].id;
  }
  return total;
}

module.exports = { stripe, numaraRezervari };
