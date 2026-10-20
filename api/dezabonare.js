/* =========================================================
   /api/dezabonare?t=...
   Linkul din subsolul fiecărui email trimis de agent.
     GET   arată o pagină cu un buton de confirmare (ca programele care
           verifică linkurile din emailuri să nu dezaboneze pe nimeni din greșeală)
     POST  dezabonează (butonul de pe pagină sau „Dezabonează-te” din Gmail)
   ========================================================= */

const { db, areBaza } = require('./_db.js');
const { verifica, esc, siteUrl } = require('./_email.js');
const { opresteCos } = require('./_agent.js');

function pagina(titlu, continut) {
  return `<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(titlu)} — Elen Sunglasses</title><link rel="stylesheet" href="/style.css"></head>
<body><main class="section"><div class="container notify-inner">
<p class="eyebrow"><a href="${esc(siteUrl())}" class="logo">Elen</a></p>
<h1 class="section-title">${esc(titlu)}</h1>${continut}</div></main></body></html>`;
}

module.exports = async (req, res) => {
  const email = verifica(req.query.t, 'd');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!email || !areBaza()) {
    return res.status(400).send(pagina('Linkul nu mai merge', '<p>Scrie-ne și te scoatem noi din listă.</p>'));
  }

  if (req.method === 'POST') {
    await db.sadd('dezabonati', email);
    await opresteCos(email, 'dezabonat');
    return res.status(200).send(pagina('Gata, nu-ți mai scriem',
      `<p class="section-intro">Am scos adresa ${esc(email)} din toate emailurile noastre. Dacă te-ai răzgândit, te poți abona din nou de pe site.</p>`));
  }

  return res.status(200).send(pagina('Nu mai vrei emailuri de la noi?',
    `<p class="section-intro">Nu mai trimitem nimic la ${esc(email)}: nici despre coș, nici despre modele noi.</p>
     <form method="post"><button class="btn btn-primary" type="submit">Da, dezabonează-mă</button></form>`));
};
