/* =========================================================
   POST /api/agent-clienti
   Agentul care caută clienți. Folosit doar de pagina privată agent.html.

   Caută pe internet (cu Claude și căutare web) creatori de conținut din România
   de pe Instagram și TikTok și locuri care ar putea vinde ochelarii (buticuri,
   saloane, hoteluri boutique), le dă note și scrie pentru fiecare un mesaj.
   NU TRIMITE NIMIC. Mesajele ajung în tabelul din agent.html, unde le aprobi tu.

   Browserul trimite una dintre:
     { actiune: 'cauta', categorie, platforma, oras, cati, exclude: [linkuri deja găsite] }
     { actiune: 'rescrie', prospect: {...}, tipMesaj, indicatie }

   Setare (o singură dată), în Vercel > proiectul tău > Settings > Environment Variables:
     ANTHROPIC_API_KEY   cheia de la https://console.anthropic.com (Settings > API keys)
     AGENT_PAROLA        parola cu care intri în agent.html. Alege una lungă.
   ========================================================= */

const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { PRODUCTS, PRECOMANDA } = require('../products.js');

/* ---------- SETĂRI AGENT ----------
   [EDIT ME] Datele de mai jos apar în mesajele scrise de agent. */
const BRAND = {
  nume: 'Elen Sunglasses',
  site: 'https://elensunglasses.ro',          // domeniul tău real
  instagram: '@elensunglasses',               // contul tău de Instagram
  semnatura: 'Echipa Elen',                   // cum se semnează mesajele (ex. „Ana, fondatoare Elen”)
  codReducere: '15% reducere cu un cod personal', // ce oferi la „cod de reducere”
  comisionRevanzare: 'prețuri de revânzare discutate direct' // ce oferi buticurilor și hotelurilor
};

const MODEL = 'claude-opus-5-5';

// Ce caută agentul la fiecare categorie din pagină
const CATEGORII = {
  'creatori-moda':      { tip: 'creator',  text: 'creatori de conținut din România pe modă și stil (outfituri, styling, accesorii)' },
  'creatori-lifestyle': { tip: 'creator',  text: 'creatori de conținut din România pe lifestyle (viață de zi cu zi, casă, beauty, „slow living”)' },
  'creatori-travel':    { tip: 'creator',  text: 'creatori de conținut din România pe travel (călătorii, vacanțe la mare, city breaks)' },
  'buticuri':           { tip: 'business', text: 'buticuri și concept store-uri din România cu haine sau accesorii de designer, care ar putea vinde ochelari de soare de lux' },
  'saloane':            { tip: 'business', text: 'saloane premium din România (beauty, hair, nail, spa) cu clientelă cu bani și un colț de retail' },
  'hoteluri':           { tip: 'business', text: 'hoteluri boutique și resorturi mici de lux din România (mai ales la mare, la munte și în orașele mari) cu magazin sau recepție unde se pot vinde accesorii' }
};

const TIPURI_MESAJ = {
  colaborare: 'propunere de colaborare (conținut plătit sau ambasador)',
  cadou: 'o pereche trimisă cadou, fără obligații, cu speranța că o vor purta și arăta',
  cod_reducere: `un cod de reducere personal pentru urmăritorii lor (${BRAND.codReducere}), cu comision pentru ei din vânzări`,
  revanzare: `propunere să vândă ochelarii la ei în locație (${BRAND.comisionRevanzare})`
};

/* ---------- Ce știe agentul despre brand ----------
   Se construiește din products.js, ca prețurile să fie mereu cele reale. */
function descriereBrand() {
  const preturi = PRODUCTS.map((p) => p.pret);
  const modele = PRODUCTS.map((p) => `${p.nume} (${p.material}, ${p.culoare})`).join(', ');
  return [
    `${BRAND.nume}: ochelari de soare de lux, din acetat italian și titan, făcuți în serii mici, fără logo pe brațe. Lentile polarizate.`,
    `Prețuri între ${Math.min(...preturi)} și ${Math.max(...preturi)} lei. Acum e precomanda pentru prima serie, cu livrare în ${PRECOMANDA.livrare}.`,
    `Modele: ${modele}.`,
    `Site: ${BRAND.site}. Instagram: ${BRAND.instagram}. Semnătura mesajelor: ${BRAND.semnatura}.`
  ].join('\n');
}

const REGULI_MESAJ = `Reguli pentru mesaje:
- În română, cu diacritice, pe „tu” pentru creatori și pe „dumneavoastră” pentru afaceri.
- Scurt: 60–110 cuvinte. E un DM sau un email, nu o scrisoare.
- Prima frază arată că ai văzut ce fac ei de fapt: o postare, un loc, un stil concret pe care l-ai găsit în căutare. Fără laude generice („conținutul tău e minunat”).
- Spune clar ce propui și ce primesc ei. Un singur pas următor, ușor („îți pot trimite o pereche?”, „pot să vă trimit catalogul?”).
- Ton calm, elegant, fără emoji-uri înșirate, fără majuscule, fără „ofertă unică”, fără presiune.
- Nu inventa lucruri despre ei sau despre brand. Nu promite bani, sume sau termene care nu sunt scrise mai sus.
- Semnează cu semnătura brandului.`;

function sistem() {
  return `Ești agentul care găsește clienți și parteneri pentru un brand românesc de ochelari de soare de lux.

Despre brand:
${descriereBrand()}

Cum dai notele (0–10 fiecare):
- estetica: cât de bine se potrivește stilul vizual al contului sau locului cu un brand minimalist și scump (lumină naturală, culori calde, compoziții curate = notă mare; meme-uri, haul-uri ieftine, filtre stridente = notă mică).
- public: cât de probabil e ca publicul lor să cumpere o pereche de 1.500–2.000 de lei: femei și bărbați 25–45 de ani, cu venituri bune, din orașele mari din România. Pentru afaceri: clientela locului.
- lux: dacă au mai promovat sau vândut branduri premium sau de lux (spune care, dacă le-ai găsit). Fără dovezi, nota e cel mult 4.

${REGULI_MESAJ}

Foarte important:
- Pune DOAR conturi și locuri pe care le-ai găsit cu adevărat în rezultatele căutării, cu linkul real (profil de Instagram sau TikTok, ori site / Instagram pentru afaceri). Nu ghici niciodată un link sau un nume de utilizator.
- Numărul de urmăritori îl pui doar dacă l-ai văzut într-o sursă. Altfel pune null. Nu-l estima.
- Dacă nu găsești destui, întoarce mai puțini. Mai bine 3 buni decât 8 inventați.
- Când ai terminat, apelezi o singură dată unealta propune_prospecti cu toată lista.`;
}

const UNEALTA_PROSPECTI = {
  name: 'propune_prospecti',
  description: 'Salvează lista finală de prospecți găsiți, cu note și mesajul propus pentru fiecare. Se apelează o singură dată, la final.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['prospecti'],
    properties: {
      prospecti: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['nume', 'cont', 'link', 'platforma', 'oras', 'urmaritori', 'estetica', 'public', 'lux', 'branduri_lux', 'de_ce', 'tip_mesaj', 'mesaj', 'surse'],
          properties: {
            nume: { type: 'string', description: 'Numele persoanei sau al locului' },
            cont: { type: 'string', description: 'Numele de utilizator (@...) sau gol dacă nu are' },
            link: { type: 'string', description: 'Linkul real al profilului sau al site-ului' },
            platforma: { type: 'string', enum: ['instagram', 'tiktok', 'site'] },
            oras: { type: 'string', description: 'Orașul, sau gol dacă nu se știe' },
            urmaritori: { type: ['integer', 'null'], description: 'Doar dacă l-ai văzut într-o sursă' },
            estetica: { type: 'integer' },
            public: { type: 'integer' },
            lux: { type: 'integer' },
            branduri_lux: { type: 'string', description: 'Branduri premium promovate sau vândute, sau gol' },
            de_ce: { type: 'string', description: 'O frază: de ce se potrivește, cu ce ai găsit concret' },
            tip_mesaj: { type: 'string', enum: Object.keys(TIPURI_MESAJ) },
            mesaj: { type: 'string', description: 'Mesajul propus, gata de trimis după aprobare' },
            surse: { type: 'array', items: { type: 'string' }, description: 'Linkurile unde ai găsit informațiile' }
          }
        }
      }
    }
  }
};

const client = new Anthropic(); // citește ANTHROPIC_API_KEY din Vercel

// Un apel către Claude, cu fallback automat dacă modelul refuză cererea
async function intreaba(params) {
  const raspuns = await client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 32000,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: sistem(),
      ...params
    })
    .finalMessage();
  if (raspuns.stop_reason === 'refusal') throw new Error('Cererea a fost refuzată. Încearcă altă categorie sau alt oraș.');
  return raspuns;
}

function textCautare({ categorie, platforma, oras, cati, exclude }) {
  const cat = CATEGORII[categorie];
  const unde = cat.tip === 'creator'
    ? (platforma === 'ambele' ? 'pe Instagram și TikTok' : `pe ${platforma === 'tiktok' ? 'TikTok' : 'Instagram'}`)
    : '(site, Instagram sau Google Maps)';
  const cerinte = cat.tip === 'creator'
    ? 'Doar conturi cu aproximativ 5.000–50.000 de urmăritori: destul de mari ca să conteze, destul de mici ca să răspundă și să fie credibili. Fără vedete și fără conturi de agenții.'
    : 'Doar locuri care există și sunt deschise acum, cu o imagine premium.';
  const tipuri = cat.tip === 'creator'
    ? 'Alege pentru fiecare tipul de mesaj potrivit: colaborare, cadou sau cod_reducere.'
    : 'Pentru afaceri tipul de mesaj e de obicei revanzare (sau colaborare, de ex. o vitrină comună ori un pachet pentru oaspeți la hotel).';
  const deja = exclude.length
    ? `\nAi găsit deja (NU le mai pune): ${exclude.slice(0, 300).join(', ')}`
    : '';
  return `Găsește până la ${cati} ${cat.text}, ${unde}${oras ? `, din ${oras}` : ''}.
${cerinte}
${tipuri}
Tipurile de mesaj: ${Object.entries(TIPURI_MESAJ).map(([k, v]) => `${k} = ${v}`).join('; ')}.${deja}`;
}

// Agentul caută până termină și apelează propune_prospecti
async function cauta(cerere) {
  const tools = [
    { type: 'web_search_20260209', name: 'web_search', max_uses: 20, user_location: { type: 'approximate', country: 'RO' } },
    UNEALTA_PROSPECTI
  ];
  const messages = [{ role: 'user', content: textCautare(cerere) }];

  for (let pas = 0; pas < 6; pas += 1) {
    const raspuns = await intreaba({ tools, messages });
    const apel = raspuns.content.find((b) => b.type === 'tool_use' && b.name === 'propune_prospecti');
    if (apel) return (apel.input && apel.input.prospecti) || [];

    messages.push({ role: 'assistant', content: raspuns.content });
    // pause_turn: căutarea web a făcut o pauză; serverul continuă singur la următorul apel
    if (raspuns.stop_reason !== 'pause_turn') {
      messages.push({ role: 'user', content: 'Apelează acum propune_prospecti cu ce ai găsit până aici.' });
    }
  }
  throw new Error('Agentul nu a terminat căutarea. Încearcă din nou.');
}

async function rescrie({ prospect, tipMesaj, indicatie }) {
  const tip = TIPURI_MESAJ[tipMesaj] ? tipMesaj : prospect.tipMesaj;
  const raspuns = await intreaba({
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `Rescrie mesajul pentru acest prospect.
Nume: ${prospect.nume} ${prospect.cont || ''}
Link: ${prospect.link}
Ce știm: ${prospect.deCe || ''}
Branduri premium: ${prospect.branduriLux || 'nu știm'}
Tip de mesaj: ${TIPURI_MESAJ[tip]}
Mesajul de acum:
${prospect.mesaj || '(niciunul)'}
${indicatie ? `\nCe vrea fondatoarea să schimbi: ${indicatie}` : ''}

Răspunde doar cu textul noului mesaj, fără nimic înainte sau după.`
    }]
  });
  const text = raspuns.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!text) throw new Error('Nu am primit un mesaj nou. Încearcă din nou.');
  return { mesaj: text, tipMesaj: tip };
}

/* ---------- Curățenie: ce ajunge în tabel ---------- */
const nota = (n) => Math.max(0, Math.min(10, Math.round(Number(n) || 0)));

function linkBun(link) {
  try {
    const u = new URL(String(link).trim());
    return /^https?:$/.test(u.protocol) ? u.href : '';
  } catch (e) {
    return '';
  }
}

function curata(lista, categorie, exclude) {
  const vazute = new Set(exclude.map((l) => l.toLowerCase().replace(/\/+$/, '')));
  const rezultat = [];
  for (const p of lista) {
    const link = linkBun(p.link);
    const cheie = link.toLowerCase().replace(/\/+$/, '');
    if (!link || vazute.has(cheie)) continue;
    vazute.add(cheie);
    const estetica = nota(p.estetica);
    const pub = nota(p.public);
    const lux = nota(p.lux);
    rezultat.push({
      nume: String(p.nume || '').trim() || link,
      cont: String(p.cont || '').trim(),
      link,
      platforma: p.platforma,
      categorie,
      oras: String(p.oras || '').trim(),
      urmaritori: Number.isInteger(p.urmaritori) ? p.urmaritori : null,
      note: { estetica, public: pub, lux },
      // Nota finală din 100: estetica contează cel mai mult, apoi publicul, apoi luxul
      nota: Math.round((estetica * 0.4 + pub * 0.35 + lux * 0.25) * 10),
      branduriLux: String(p.branduri_lux || '').trim(),
      deCe: String(p.de_ce || '').trim(),
      tipMesaj: TIPURI_MESAJ[p.tip_mesaj] ? p.tip_mesaj : 'colaborare',
      mesaj: String(p.mesaj || '').trim(),
      surse: (Array.isArray(p.surse) ? p.surse : []).map(linkBun).filter(Boolean).slice(0, 5)
    });
  }
  return rezultat;
}

// Compară parola fără să dezvăluie prin timp cât de aproape a fost
function parolaCorecta(primita) {
  const a = crypto.createHash('sha256').update(String(primita || '')).digest();
  const b = crypto.createHash('sha256').update(String(process.env.AGENT_PAROLA)).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Folosește POST' });
  }
  if (!process.env.AGENT_PAROLA || !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Agentul nu e configurat încă: lipsesc AGENT_PAROLA sau ANTHROPIC_API_KEY în Vercel.' });
  }
  if (!parolaCorecta(req.headers['x-agent-parola'])) {
    return res.status(401).json({ error: 'Parolă greșită.' });
  }

  const body = req.body || {};
  try {
    if (body.actiune === 'rescrie') {
      if (!body.prospect || !body.prospect.link) return res.status(400).json({ error: 'Lipsește prospectul.' });
      return res.status(200).json(await rescrie(body));
    }

    if (!CATEGORII[body.categorie]) return res.status(400).json({ error: 'Alege o categorie.' });
    const exclude = (Array.isArray(body.exclude) ? body.exclude : []).map(String);
    const cerere = {
      categorie: body.categorie,
      platforma: ['instagram', 'tiktok', 'ambele'].includes(body.platforma) ? body.platforma : 'ambele',
      oras: String(body.oras || '').slice(0, 60).trim(),
      cati: Math.max(1, Math.min(10, Number(body.cati) || 6)),
      exclude
    };
    const gasiti = await cauta(cerere);
    return res.status(200).json({ prospecti: curata(gasiti, cerere.categorie, exclude) });
  } catch (error) {
    console.error(error);
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Prea multe cereri deodată. Mai încearcă peste un minut.' });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: 'Cheia ANTHROPIC_API_KEY din Vercel nu e bună.' });
    }
    return res.status(500).json({ error: error.message || 'Agentul s-a oprit cu o eroare.' });
  }
};
