/* =========================================================
   Elen Sunglasses — AGENTUL CARE RECUPEREAZĂ VÂNZĂRI
   Setările și textele emailurilor. Restul (trimiterea, baza de date)
   e în api/_agent.js și nu trebuie atins.

   Ce face agentul, singur, de câteva ori pe oră (vezi README):
     1. Coș abandonat: cine și-a lăsat emailul în coș și n-a plătit primește
        3 emailuri, la 1 oră, 24 de ore și 3 zile. Se opresc imediat ce plătește.
     2. După cumpărare: la câteva zile după livrare cere o recenzie și o poză
        cu ochelarii purtați. Tu aprobi ce apare pe site, în admin.html.
     3. Clienți vechi: îi anunță când lansezi un model nou (datele din products.js)
        și, la o lună și ceva după livrare, le recomandă rame potrivite cu ce au.

   Fiecare email are link de dezabonare. Cine se dezabonează nu mai primește nimic.
   ========================================================= */

const { PRODUCTS, PRECOMANDA, locuriLibere, marimeRama, etapaLansare } = require('./products.js');

/* ---------- 1. SETĂRI ---------- */
const AGENT = {
  brand: 'Elen Sunglasses',
  semnatura: 'Echipa Elen',          // [EDIT ME] de ex. „Ana, fondatoarea Elen”. Un nume de om e citit mai des.
  firma: 'Elen Sunglasses SRL · CUI [EDIT ME] · [EDIT ME] adresă',

  cosAbandonat: {
    activ: true,
    ore: [1, 24, 72],                 // după câte ore de la ultima modificare a coșului pleacă fiecare email
    locuriPutine: 20                  // sub atâtea locuri libere, emailul 2 spune câte au mai rămas
  },
  recenzie: {
    activ: true,
    zileDupaLivrare: 10               // cât lași clientul să poarte ochelarii înainte să-i ceri părerea
  },
  lansari: {
    activ: true,
    zileDupaLansare: 14               // după atâtea zile de la lansare nu mai anunțăm (ca să nu scriem despre ceva vechi)
  },
  recomandari: {
    activ: true,
    zileDupaLivrare: 45,              // când îi scrii unui client despre o a doua pereche
    cate: 2                           // câte rame recomanzi într-un email
  },

  maxEmailuriPeRulare: 300            // siguranță: nu trimite mai mult de atât deodată
};


/* ---------- 2. Recomandări potrivite cu ce a cumpărat clientul ----------
   Punctează fiecare ramă pe care clientul n-o are încă:
     +3 același material, +2 aceeași mărime, +1 culoare din aceeași familie,
     +1 preț apropiat. Doar ramele care se pot precomanda acum. */
const MATERIAL = { acetat: 'acetat', metal: 'metal', mixt: 'browline, acetat și metal' };
const CUVINTE_CULOARE_IGNORATE = ['și', 'inchis', 'închis', 'deschis'];

function familieCuloare(p) {
  return p.culoare.toLowerCase().split(/\s+/).filter((c) => !CUVINTE_CULOARE_IGNORATE.includes(c));
}

function poateFiPrecomandat(p, rezervate, acum) {
  return etapaLansare(p, acum) !== 'curand' && locuriLibere(p, (rezervate && rezervate[p.id]) || 0) > 0;
}

// cumparate: listă de id-uri. Întoarce [{ produs, motiv }], cele mai potrivite primele.
function recomanda(cumparate, optiuni) {
  const o = optiuni || {};
  const avute = PRODUCTS.filter((p) => cumparate.includes(p.id));
  if (avute.length === 0) return [];
  const exclude = (o.exclude || []).concat(cumparate);

  return PRODUCTS
    .filter((p) => !exclude.includes(p.id) && poateFiPrecomandat(p, o.rezervate, o.acum))
    .map((p, ordine) => {
      // Comparăm cu rama pe care o are și care seamănă cel mai mult
      let best = null;
      avute.forEach((a) => {
        const acelasiMaterial = a.material === p.material;
        const aceeasiMarime = marimeRama(a) === marimeRama(p);
        const culoareApropiata = familieCuloare(a).some((c) => familieCuloare(p).includes(c));
        const pretApropiat = Math.abs(a.pret - p.pret) / a.pret <= 0.15;
        const scor = 3 * acelasiMaterial + 2 * aceeasiMarime + culoareApropiata + pretApropiat;
        if (!best || scor > best.scor) best = { a, scor, acelasiMaterial, aceeasiMarime };
      });

      const parti = [];
      if (best.aceeasiMarime) parti.push('aceeași mărime ca ' + best.a.nume);
      if (best.acelasiMaterial) parti.push('tot din ' + MATERIAL[p.material]);
      parti.push(best.a.culoare === p.culoare ? 'aceeași culoare' : 'în ' + p.culoare.toLowerCase());
      const motiv = parti.join(', ').replace(/^./, (c) => c.toUpperCase()) + '.';

      return { produs: p, motiv, scor: best.scor - ordine / 100 }; // la egalitate, ordinea din products.js
    })
    .sort((x, y) => y.scor - x.scor)
    .slice(0, o.cate || AGENT.recomandari.cate)
    .map(({ produs, motiv }) => ({ produs, motiv }));
}


/* ---------- 3. TEXTELE EMAILURILOR ----------
   Fiecare funcție primește `c` (ce știm despre client și coș) și întoarce:
     subiect, preheader (rândul gri de după subiect în inbox),
     paragrafe, produse (cardurile cu poză), buton, dupaButon, recomandari.
   Scrie ca un om, nu ca un magazin. Și nu promite nimic ce nu scrie și pe site. */

// „Sola”, „Sola și Lido”, „Sola, Lido și Vela”
function lista(nume) {
  return nume.length <= 1 ? nume.join('') : nume.slice(0, -1).join(', ') + ' și ' + nume[nume.length - 1];
}
function salut(c) {
  return c.prenume ? 'Bună, ' + c.prenume + ',' : 'Bună,';
}

const TEXTE = {
  // Coș abandonat, după 1 oră
  cos1(c) {
    const p = c.principal;
    return {
      subiect: c.produse.length === 1
        ? `Modelul ${p.nume} încă te așteaptă`
        : `Modelele ${lista(c.produse.map((x) => x.produs.nume))} încă te așteaptă`,
      preheader: 'Ți-am păstrat coșul exact cum l-ai lăsat.',
      paragrafe: [
        salut(c),
        `ai lăsat în coș ${c.descriereCos}. Ți l-am păstrat exact cum l-ai lăsat.`,
        `Dacă te-a oprit mărimea, răspunde la emailul ăsta cu cele trei numere de pe interiorul brațului perechii pe care o porți acum (de exemplu 52□20-145). Îți spunem noi dacă ${p.nume} ți se potrivește.`
      ],
      produse: c.produse,
      buton: { text: 'Înapoi la coș', url: c.linkCos }
    };
  },

  // Coș abandonat, după 24 de ore
  cos2(c) {
    const p = c.principal;
    const libere = c.libere(p);
    const putine = libere <= AGENT.cosAbandonat.locuriPutine;
    return {
      subiect: putine
        ? `${p.nume}: mai ${libere === 1 ? 'e un singur loc' : 'sunt ' + c.bucati(libere)} în prima serie`
        : `Încă te gândești la ${p.nume}?`,
      preheader: `Avans de ${c.lei(c.avans)} acum, restul la livrare.`,
      paragrafe: [
        salut(c),
        'pe scurt, cum merge precomanda, ca să nu rămână nimic neclar:',
        `Plătești acum doar un avans de ${c.lei(c.avans)} pe pereche. Restul îl dai la livrare, în ${c.livrare}, cu cardul sau ramburs.`,
        `Prețul de precomandă, ${c.lei(p.pretPrecomanda)} în loc de ${c.lei(p.pret)}, e doar pentru prima serie.` +
          (putine
            ? ` Din prima serie ${p.nume} s-au rezervat deja ${c.rezervate(p)} din ${c.bucati(p.serie)}.`
            : ` Prima serie ${p.nume} are ${c.bucati(p.serie)}. După ce se rezervă, rama costă prețul întreg.`)
      ],
      produse: c.produse,
      buton: { text: 'Rezervă-ți perechea', url: c.linkCos }
    };
  },

  // Coș abandonat, după 3 zile. Ultimul.
  cos3(c) {
    const p = c.principal;
    return {
      subiect: `Ultimul mesaj despre ${p.nume}`,
      preheader: 'Poți anula oricând până pleacă coletul.',
      paragrafe: [
        salut(c),
        'nu vrem să-ți umplem inboxul, așa că ăsta e ultimul email despre coșul tău.',
        // [EDIT ME] Aceleași promisiuni ca în „Cum funcționează” din index.html. Dacă le schimbi acolo, schimbă-le și aici.
        `Dacă ezitarea vine din faptul că plătești acum pentru ceva ce primești în ${c.livrare}: poți anula precomanda oricând până pleacă coletul și îți dăm înapoi tot, inclusiv avansul. Iar după ce îi primești, ai 30 de zile să-i returnezi gratuit.`
      ],
      produse: c.produse,
      buton: { text: 'Finalizează precomanda', url: c.linkCos },
      recomandari: c.recomandari.length
        ? { titlu: `Dacă ${p.nume} nu e chiar ce cauți`, lista: c.recomandari }
        : null
    };
  },

  // După livrare: recenzie și poză
  recenzie(c) {
    const p = c.principal;
    return {
      subiect: c.prenume ? `${c.prenume}, cum îți stă ${p.nume}?` : `Cum îți stă ${p.nume}?`,
      preheader: 'Un minut, și o poză dacă ai una.',
      paragrafe: [
        salut(c),
        `au trecut câteva zile de când ai primit ${c.descriereComanda}. Ne-ar ajuta mult să ne spui cum ți se pare: cum stă pe nas, cum e lentila în soare, dacă ai lua-o din nou.`,
        `Și dacă ai o poză în care îi porți, ne-ar plăcea s-o vedem. Cu acordul tău, o punem pe site, lângă ${p.nume}. Pozele cu oameni reali îi ajută pe ceilalți să-și aleagă rama mai mult decât orice poză de studio.`
      ],
      produse: c.produse,
      buton: { text: 'Scrie recenzia', url: c.linkRecenzie },
      dupaButon: ['Durează un minut. Poza e opțională.']
    };
  },

  // Lansare nouă, către clienți și abonați
  lansare(c) {
    const n = c.nou;
    const paragrafe = [salut(c), n.descriere];
    if (c.comparatie) paragrafe.push(c.comparatie);
    paragrafe.push(c.etapa === 'abonati'
      ? `Până pe ${c.dataLansare}, doar clienții și abonații o pot precomanda, cu linkul de mai jos. Prima serie are ${c.bucati(n.serie)}.`
      : `Prima serie are ${c.bucati(n.serie)}, la preț de precomandă: ${c.lei(n.pretPrecomanda)} în loc de ${c.lei(n.pret)}.`);
    return {
      subiect: c.etapa === 'abonati'
        ? `${n.nume}: model nou, îl poți precomanda înaintea tuturor`
        : `${n.nume} e aici`,
      preheader: n.scurt,
      paragrafe,
      produse: [{ produs: n, qty: 1 }],
      buton: { text: c.etapa === 'abonati' ? 'Precomandă înaintea tuturor' : 'Vezi ' + n.nume, url: c.linkLansare },
      recomandari: c.recomandari.length ? { titlu: 'Și din colecție, potrivite cu ce ai deja', lista: c.recomandari } : null
    };
  },

  // La o lună și ceva după livrare: o a doua pereche
  recomandare(c) {
    const p = c.principal;
    return {
      subiect: `Ce s-ar potrivi lângă ${p.nume}`,
      preheader: 'Două rame alese după ce ai deja.',
      paragrafe: [
        salut(c),
        `sperăm că porți ${p.nume} des. Dacă te gândești la o a doua pereche, am ales din colecție ${c.recomandari.length === 1 ? 'o ramă care merge' : c.recomandari.length + ' rame care merg'} bine cu ce ai deja.`
      ],
      recomandari: { titlu: 'Alese pentru tine', lista: c.recomandari },
      buton: { text: 'Vezi colecția', url: c.linkMagazin }
    };
  }
};

module.exports = { AGENT, TEXTE, recomanda, poateFiPrecomandat, lista, PRODUCTS, PRECOMANDA };
