/* =========================================================
   Elen Sunglasses — LISTA DE PRODUSE
   Singurul fișier pe care îl editezi ca să adaugi, ștergi sau
   modifici produse. Magazinul de pe pagină se construiește din el.

   Câmpurile fiecărui produs:
     id          nume scurt, unic, fără spații și diacritice (folosit de coș)
     nume        afișat pe pagină
     pret        în lei, cu TVA inclus, număr întreg (ex. 1690)
     material    "acetat", "metal" sau "mixt" (pentru butoanele de filtrare)
     culoare     afișată sub nume
     scurt       o frază pe cardul produsului
     descriere   câteva fraze în fereastra produsului
     detalii     listă cu specificații
     poze        pozele tale, prima e cea principală (vezi README pentru nume și mărimi)
     alt         descrierea pozei pentru cititoare de ecran și Google
     pretPrecomanda  prețul plătit de cine precomandă acum (mai mic decât pret)
     serie       câte bucăți are prima serie. Când se rezervă toate, precomanda se închide.
     rezervateManual  rezervări făcute în afara site-ului (telefon, Instagram).
                 Rezervările plătite pe site cu cardul se numără singure din Stripe.
                 Poate fi negativ, ca să scazi o precomandă anulată și rambursată.
     dimensiuni  în milimetri, măsurate pe rama reală:
                   lentila  = lățimea unei lentile
                   punte    = distanța dintre lentile
                   brat     = lungimea brațului
                   inaltime = înălțimea lentilei
                   totala   = lățimea totală a ramei, din față
     accesAbonati  (opțional) de când pot precomanda abonații cu link de acces anticipat
     lansare       (opțional) de când poate precomanda oricine
     shopifyVariantId  doar dacă folosești Shopify (vezi README)

   [DE VERIFICAT] Prețurile, seriile, dimensiunile și specificațiile de mai jos
   sunt exemple. Înlocuiește-le cu datele reale înainte să primești comenzi.
   ========================================================= */

const PRODUCTS = [
  {
    id: 'sola',
    nume: 'Sola',
    pret: 1790,
    material: 'acetat',
    culoare: 'Havana închis',
    scurt: 'Cel mai gros acetat din colecție, lustruit manual.',
    descriere: 'Cu Sola am început. Acetat gros, într-un havana cald și închis, cu o curbă ușoară sus. Are ceva din cat-eye, dar fără să exagereze.',
    detalii: ['Acetat italian, lustruit manual', 'Lentile polarizate, categoria 3, protecție UV400', 'Balamale cu cinci inele', 'Husă din piele și lavetă incluse'],
    poze: ['images/produse/sola-1.jpg', 'images/produse/sola-2.jpg', 'images/produse/sola-3.jpg'],
    alt: 'Ochelari de soare Sola, ramă havana închis',
    pretPrecomanda: 1520,
    serie: 100,
    rezervateManual: 0,
    dimensiuni: { lentila: 53, punte: 19, brat: 145, inaltime: 46, totala: 142 },
    shopifyVariantId: ''
  },
  {
    id: 'lido',
    nume: 'Lido',
    pret: 1550,
    material: 'metal',
    culoare: 'Auriu',
    scurt: 'Ramă rotundă din metal fin. Aproape nu o simți.',
    descriere: 'Lido e numai metal: rame rotunde și subțiri, plăcuțe nazale reglabile. Se potrivește fețelor mai mici și stă aproape de ochi, exact ce vrei într-o zi cu soare puternic.',
    detalii: ['Titan placat cu aur', 'Lentile polarizate, categoria 3, protecție UV400', 'Plăcuțe nazale reglabile', 'Husă din piele și lavetă incluse'],
    poze: ['images/produse/lido-1.jpg', 'images/produse/lido-2.jpg', 'images/produse/lido-3.jpg'],
    alt: 'Ochelari de soare Lido, ramă rotundă aurie',
    pretPrecomanda: 1320,
    serie: 60,
    rezervateManual: 0,
    dimensiuni: { lentila: 49, punte: 21, brat: 145, inaltime: 47, totala: 135 },
    shopifyVariantId: ''
  },
  {
    id: 'marea',
    nume: 'Marea',
    pret: 1690,
    material: 'acetat',
    culoare: 'Negru',
    scurt: 'Negru simplu, puțin supradimensionat. Perechea de zi cu zi.',
    descriere: 'Dacă ai o singură pereche, alege-o pe asta. Marea are o ramă neagră, curată, puțin mai lată decât media, și lentile gri închis care nu schimbă culorile.',
    detalii: ['Acetat italian', 'Lentile polarizate gri, categoria 3, protecție UV400', 'Balamale cu arc', 'Husă din piele și lavetă incluse'],
    poze: ['images/produse/marea-1.jpg', 'images/produse/marea-2.jpg', 'images/produse/marea-3.jpg'],
    alt: 'Ochelari de soare Marea, ramă neagră',
    pretPrecomanda: 1440,
    serie: 150,
    rezervateManual: 0,
    dimensiuni: { lentila: 55, punte: 18, brat: 150, inaltime: 48, totala: 148 },
    shopifyVariantId: ''
  },
  {
    id: 'corso',
    nume: 'Corso',
    pret: 1890,
    material: 'mixt',
    culoare: 'Negru și argintiu',
    scurt: 'Model browline: acetat sus, metal jos.',
    descriere: 'Corso ia forma browline din anii ’50 și o face puțin mai subțire. Sprâncene din acetat, ramă inferioară din metal și o punte care stă bine pe aproape orice nas.',
    detalii: ['Acetat și oțel inoxidabil', 'Lentile polarizate, categoria 3, protecție UV400', 'Plăcuțe nazale reglabile', 'Husă din piele și lavetă incluse'],
    poze: ['images/produse/corso-1.jpg', 'images/produse/corso-2.jpg', 'images/produse/corso-3.jpg'],
    alt: 'Ochelari de soare Corso, model browline negru cu argintiu',
    pretPrecomanda: 1610,
    serie: 80,
    rezervateManual: 0,
    dimensiuni: { lentila: 51, punte: 21, brat: 145, inaltime: 42, totala: 140 },
    shopifyVariantId: ''
  },
  {
    id: 'vela',
    nume: 'Vela',
    pret: 1590,
    material: 'acetat',
    culoare: 'Havana deschis',
    scurt: 'Un havana deschis, aproape de miere. Arată bine pe piele bronzată.',
    descriere: 'Vela e o ramă de mărime medie, într-un havana deschis care devine aproape chihlimbar în soare. Lentilele maro dau puțin contrast în plus, util la volan.',
    detalii: ['Acetat italian', 'Lentile polarizate maro, categoria 3, protecție UV400', 'Balamale cu cinci inele', 'Husă din piele și lavetă incluse'],
    poze: ['images/produse/vela-1.jpg', 'images/produse/vela-2.jpg', 'images/produse/vela-3.jpg'],
    alt: 'Ochelari de soare Vela, ramă havana deschis',
    pretPrecomanda: 1350,
    serie: 80,
    rezervateManual: 0,
    dimensiuni: { lentila: 52, punte: 20, brat: 145, inaltime: 45, totala: 140 },
    shopifyVariantId: ''
  },
  {
    id: 'riva',
    nume: 'Riva',
    pret: 1950,
    material: 'mixt',
    culoare: 'Havana și auriu',
    scurt: 'Browline havana cu metal auriu. Puțin mai elegant.',
    descriere: 'Riva e varianta mai caldă a lui Corso. Aceeași idee browline, dar în havana cu metal auriu, așa că merge la fel de bine cu o cămașă de in ca și cu un sacou.',
    detalii: ['Acetat și oțel placat cu aur', 'Lentile polarizate, categoria 3, protecție UV400', 'Plăcuțe nazale reglabile', 'Husă din piele și lavetă incluse'],
    poze: ['images/produse/riva-1.jpg', 'images/produse/riva-2.jpg', 'images/produse/riva-3.jpg'],
    alt: 'Ochelari de soare Riva, model browline havana cu auriu',
    pretPrecomanda: 1660,
    serie: 50,
    rezervateManual: 0,
    dimensiuni: { lentila: 53, punte: 20, brat: 145, inaltime: 43, totala: 143 },
    shopifyVariantId: ''
  },
  {
    id: 'ines',
    nume: 'Ines',
    pret: 1450,
    material: 'acetat',
    culoare: 'Ivoire',
    scurt: 'Acetat ivoire. Îndrăzneț, intenționat.',
    descriere: 'Despre Ines ne întreabă lumea cel mai des. Ramă groasă ivoire și lentile închise, făcută pentru vară și cam atât. Ni se pare în regulă.',
    detalii: ['Acetat italian', 'Lentile polarizate, categoria 3, protecție UV400', 'Balamale cu cinci inele', 'Husă din piele și lavetă incluse'],
    poze: ['images/produse/ines-1.jpg', 'images/produse/ines-2.jpg', 'images/produse/ines-3.jpg'],
    alt: 'Ochelari de soare Ines, ramă ivoire',
    pretPrecomanda: 1230,
    serie: 80,
    rezervateManual: 0,
    dimensiuni: { lentila: 54, punte: 18, brat: 145, inaltime: 50, totala: 146 },
    shopifyVariantId: ''
  },
  {
    id: 'alba',
    nume: 'Alba',
    pret: 1650,
    material: 'acetat',
    culoare: 'Fumuriu',
    scurt: 'Subțire și discretă. Pentru cine nu vrea să iasă în evidență.',
    descriere: 'Alba e cea mai discretă ramă din colecție: subțire, din acetat fumuriu translucid, cu lentile gri. Pe față aproape dispare, în sensul bun.',
    detalii: ['Acetat italian translucid', 'Lentile polarizate gri, categoria 3, protecție UV400', 'Balamale cu arc', 'Husă din piele și lavetă incluse'],
    poze: ['images/produse/alba-1.jpg', 'images/produse/alba-2.jpg', 'images/produse/alba-3.jpg'],
    alt: 'Ochelari de soare Alba, ramă fumurie translucidă',
    pretPrecomanda: 1400,
    serie: 60,
    rezervateManual: 0,
    dimensiuni: { lentila: 50, punte: 20, brat: 140, inaltime: 42, totala: 134 },
    shopifyVariantId: ''
  },
  {
    // Exemplu de acces anticipat: abonații cu link pot precomanda de la accesAbonati,
    // toată lumea de la lansare. Șterge cele două date ca să fie disponibil pentru toți.
    id: 'nora',
    nume: 'Nora',
    pret: 1850,
    material: 'acetat',
    culoare: 'Verde sticlă',
    scurt: 'Model nou, mare și pătrat, în verde închis translucid.',
    descriere: 'Nora e prima ramă nouă de după colecția de vară. Pătrată, lată și într-un verde închis, ca sticla veche. O facem într-o singură serie.',
    detalii: ['Acetat italian translucid', 'Lentile polarizate verzi, categoria 3, protecție UV400', 'Balamale cu cinci inele', 'Husă din piele și lavetă incluse'],
    poze: ['images/produse/nora-1.jpg', 'images/produse/nora-2.jpg', 'images/produse/nora-3.jpg'],
    alt: 'Ochelari de soare Nora, ramă pătrată verde translucid',
    pretPrecomanda: 1570,
    serie: 100,
    rezervateManual: 0,
    dimensiuni: { lentila: 56, punte: 17, brat: 145, inaltime: 52, totala: 150 },
    accesAbonati: '2026-10-15T10:00:00+03:00',
    lansare: '2026-11-20T10:00:00+02:00',
    shopifyVariantId: ''
  }
];

/* =========================================================
   SETĂRI PRECOMANDĂ
   Folosite și de pagină, și de plata cu cardul (api/checkout.js).
   ========================================================= */
const PRECOMANDA = {
  livrare: 'martie 2027', // [EDIT ME] când primesc clienții ochelarii. Trebuie să fie o dată pe care o poți ține.
  avans: 300              // lei per pereche, dacă clientul alege să plătească doar avansul
};

// Câte bucăți mai sunt libere în prima serie, știind câte s-au rezervat
function locuriLibere(produs, rezervate) {
  return Math.max(0, produs.serie - rezervate);
}

/* Mărimea (mică / medie / mare) se calculează din lățimea totală a ramei.
   Schimbă limitele aici dacă vrei. */
function marimeRama(produs) {
  const t = produs.dimensiuni.totala;
  if (t < 137) return 'mică';
  if (t <= 145) return 'medie';
  return 'mare';
}

/* Unde e produsul în calendarul de lansare, la momentul `acum`:
     'curand'    nimeni nu poate cumpăra încă
     'abonati'   pot precomanda doar abonații cu cod de acces anticipat
     'disponibil' oricine poate precomanda */
function etapaLansare(produs, acum) {
  const t = (acum || new Date()).getTime();
  if (produs.lansare && t < new Date(produs.lansare).getTime()) {
    if (produs.accesAbonati && t >= new Date(produs.accesAbonati).getTime()) return 'abonati';
    return 'curand';
  }
  return 'disponibil';
}

/* Permite funcției de plată cu cardul (api/checkout.js) să citească aceeași listă,
   ca prețurile și locurile din serie să nu poată fi modificate din browser. Nu modifica linia asta. */
if (typeof module !== 'undefined') module.exports = { PRODUCTS, PRECOMANDA, locuriLibere, marimeRama, etapaLansare };
