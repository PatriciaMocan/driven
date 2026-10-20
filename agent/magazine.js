/* =========================================================
   Elen Sunglasses — AGENTUL CARE CAUTĂ MAGAZINE
   Pornește de la clienții ideali din icp.js și caută pe internet
   magazinele unde ți-ai putea lista ochelarii: concept store-uri,
   optici independente, menswear, magazine de hotel, site-uri curatoriate.

   Pentru fiecare ICP, Claude:
     1. caută pe web și citește site-urile magazinelor (cercetare)
     2. scoate din cercetare o listă curată, cu scor și contact
   La final, magazinele găsite pentru mai multe ICP-uri se unesc
   și se scriu în rezultate/ ca JSON, CSV (pentru Excel) și Markdown.

   Rulare (din folderul agent/):
     npm install
     export ANTHROPIC_API_KEY=sk-ant-...
     node magazine.js                      toate ICP-urile
     node magazine.js --icp optica         doar un ICP
     node magazine.js --oras Cluj-Napoca   doar un oraș
     node magazine.js --max 10             câte magazine pe ICP (implicit 15)
   ========================================================= */

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ICP, EXCLUSE } from './icp.js';

const aici = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { PRODUCTS, PRECOMANDA } = require('../products.js');

const MODEL = 'claude-opus-5-5';
const BETAS = ['server-side-fallback-2026-07-01'];
const client = new Anthropic();

// ---------- Argumente din linia de comandă ----------

function argument(nume) {
  const i = process.argv.indexOf('--' + nume);
  return i === -1 ? undefined : process.argv[i + 1];
}

const doarIcp = argument('icp');
const doarOras = argument('oras');
const maxPeIcp = Number(argument('max')) || 15;

// ---------- Ce vindem, ca agentul să știe ce caută ----------

function despreElen() {
  const preturi = PRODUCTS.map((p) => p.pret);
  const modele = PRODUCTS.map((p) => `${p.nume} (${p.material}, ${p.culoare}, ${p.pret} lei)`).join('; ');
  return [
    'Elen Sunglasses este un brand românesc nou de ochelari de soare de lux.',
    'Rame din acetat italian lustruit manual și titan, lentile polarizate categoria 3, UV400, husă din piele.',
    `Prețuri de vânzare: ${Math.min(...preturi)}–${Math.max(...preturi)} lei cu TVA.`,
    `Modele: ${modele}.`,
    `Prima serie e mică (zeci de bucăți pe model), livrare ${PRECOMANDA.livrare}.`,
    'Brandul e la început, deci caută și magazine care lucrează în consignație sau iau mărci noi românești.'
  ].join('\n');
}

// ---------- Pasul 1: cercetare pe web ----------

const SISTEM = `Ești un consultant de distribuție pentru mărci de accesorii de lux din România.
Găsești magazine reale, care există și funcționează azi, unde un brand nou își poate lista produsele.
Verifici fiecare magazin pe site-ul sau pe Instagramul lui: ce mărci vinde, la ce prețuri, unde e, cum îl contactezi.
Nu inventa magazine, adrese, emailuri sau mărci. Dacă nu găsești o informație, spune că lipsește.
Scrie în română.`;

function cerereCercetare(icp) {
  const orase = doarOras ? [doarOras] : icp.unde;
  const excluse = EXCLUSE.length ? `\nNu propune aceste magazine, le știm deja: ${EXCLUSE.join(', ')}.` : '';
  return `${despreElen()}

Clientul ideal pentru care cauți magazine:
- Cine: ${icp.cine}
- Unde: ${orase.join(', ')}
- Ce cumpără și de unde: ${icp.cumpara}
- Buget: ${icp.buget}
- Cum recunoști un magazin potrivit: ${icp.semnale}

Găsește cel puțin ${maxPeIcp} magazine (fizice sau online, din România) unde acest client cumpără deja și unde Elen s-ar putea vinde.
Gândește-te și la locuri mai puțin evidente pe care acest client le frecventează.${excluse}

Pentru fiecare magazin verifică și notează:
- numele, tipul (concept store, optică, menswear, magazin de hotel, online etc.), orașul și adresa
- site-ul, Instagramul, emailul și telefonul de contact, dacă apar public
- mărcile similare pe care le vinde deja și intervalul de prețuri
- dacă vinde deja ochelari de soare
- dacă lucrează cu mărci românești sau noi, în consignație, en-gros sau ca marketplace
- de ce se potrivește cu acest client și ce ar putea să nu meargă
- linkul unde ai verificat informațiile`;
}

// Rulează cererea până la capăt: căutările lungi pot face pauză (pause_turn) și trebuie reluate.
async function cerceteaza(icp) {
  const messages = [{ role: 'user', content: cerereCercetare(icp) }];
  const text = [];
  const surse = new Set();

  for (let pas = 0; pas < 8; pas++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      betas: BETAS,
      fallbacks: 'default',
      system: SISTEM,
      output_config: { effort: 'high' },
      tools: [
        {
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: 25,
          user_location: { type: 'approximate', country: 'RO', timezone: 'Europe/Bucharest' }
        },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 20 }
      ],
      messages
    });
    const raspuns = await stream.finalMessage();

    if (raspuns.stop_reason === 'refusal') {
      throw new Error(`Claude a refuzat cererea pentru ${icp.id}.`);
    }

    for (const bloc of raspuns.content) {
      if (bloc.type === 'text') text.push(bloc.text);
      // Rezultatele căutărilor: o listă dacă au reușit, un obiect cu eroare dacă nu.
      if (bloc.type === 'web_search_tool_result' && Array.isArray(bloc.content)) {
        for (const r of bloc.content) surse.add(r.url);
      }
    }

    if (raspuns.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: raspuns.content });
    process.stdout.write('.');
  }

  return { text: text.join('\n'), surse: [...surse] };
}

// ---------- Pasul 2: lista curată ----------

const Magazin = z.object({
  nume: z.string(),
  tip: z.enum(['concept store', 'optica', 'menswear', 'boutique moda', 'magazin hotel/resort', 'online', 'altul']),
  oras: z.string().describe('orașul, sau "online"'),
  adresa: z.string().describe('gol dacă nu se știe'),
  website: z.string().describe('gol dacă nu are'),
  instagram: z.string().describe('gol dacă nu se știe'),
  email: z.string().describe('doar dacă apare public, altfel gol'),
  telefon: z.string().describe('doar dacă apare public, altfel gol'),
  marci_similare: z.array(z.string()),
  pret_mediu: z.string().describe('intervalul de prețuri al produselor, ex. "800–2.500 lei"'),
  vinde_ochelari: z.boolean(),
  model_colaborare: z.enum(['consignatie', 'en-gros', 'marketplace', 'pop-up', 'necunoscut']),
  de_ce: z.string().describe('de ce se potrivește, într-o frază'),
  riscuri: z.string().describe('ce ar putea să nu meargă, într-o frază'),
  scor: z.number().int().describe('1–10, cât de bine se potrivește cu Elen și cu clientul ideal'),
  primul_pas: z.string().describe('ce faci concret ca să intri, ex. „email la buyer cu lookbook”'),
  sursa: z.string().describe('linkul unde au fost verificate informațiile')
});

const Lista = z.object({ magazine: z.array(Magazin) });

async function extrage(icp, cercetare) {
  const raspuns = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: BETAS,
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(Lista) },
    messages: [{
      role: 'user',
      content: `Mai jos e o cercetare despre magazinele unde se poate vinde Elen Sunglasses pentru clientul ideal „${icp.nume}”.
Scoate din ea lista de magazine. Păstrează doar magazinele care există și pentru care ai cel puțin un link.
Nu adăuga informații care nu sunt în cercetare. Câmpurile necunoscute rămân goale.

<cercetare>
${cercetare.text}
</cercetare>

<linkuri_gasite>
${cercetare.surse.join('\n')}
</linkuri_gasite>`
    }]
  });

  if (raspuns.stop_reason === 'refusal' || !raspuns.parsed_output) {
    throw new Error(`Nu am putut face lista pentru ${icp.id} (${raspuns.stop_reason}).`);
  }
  return raspuns.parsed_output.magazine.map((m) => ({ ...m, scor: Math.min(10, Math.max(1, m.scor)) }));
}

// ---------- Unire, sortare, salvare ----------

// Același magazin găsit pentru două ICP-uri: după domeniu, Instagram sau nume.
function cheie(m) {
  const domeniu = m.website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  const insta = m.instagram.toLowerCase().replace(/^.*instagram\.com\//, '').replace(/[@/]/g, '');
  const nume = m.nume.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  return domeniu || insta || nume;
}

function uneste(rezultate) {
  const toate = new Map();
  for (const { icp, magazine } of rezultate) {
    for (const m of magazine) {
      const k = cheie(m);
      const existent = toate.get(k);
      if (existent) {
        existent.icp.push(icp.id);
        existent.scor = Math.max(existent.scor, m.scor);
      } else {
        toate.set(k, { ...m, icp: [icp.id] });
      }
    }
  }
  // Primele: cele mai potrivite, apoi cele care servesc mai multe ICP-uri.
  return [...toate.values()].sort((a, b) => b.scor - a.scor || b.icp.length - a.icp.length);
}

function csv(magazine) {
  const coloane = ['scor', 'nume', 'tip', 'oras', 'icp', 'model_colaborare', 'vinde_ochelari', 'pret_mediu', 'marci_similare',
    'website', 'instagram', 'email', 'telefon', 'adresa', 'de_ce', 'riscuri', 'primul_pas', 'sursa'];
  const celula = (v) => {
    const s = Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'da' : 'nu') : String(v ?? '');
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const randuri = magazine.map((m) => coloane.map((c) => celula(m[c])).join(';'));
  // BOM și punct și virgulă, ca Excel-ul românesc să deschidă corect diacriticele și coloanele.
  return '\uFEFF' + [coloane.join(';'), ...randuri].join('\n');
}

function markdown(magazine, data) {
  const linii = [`# Magazine pentru Elen Sunglasses — ${data}`, '', `${magazine.length} magazine, de la cel mai potrivit.`, ''];
  for (const m of magazine) {
    linii.push(`## ${m.scor}/10 · ${m.nume} (${m.tip}, ${m.oras})`);
    linii.push('');
    linii.push(`- **ICP:** ${m.icp.join(', ')}`);
    linii.push(`- **De ce:** ${m.de_ce}`);
    linii.push(`- **Riscuri:** ${m.riscuri}`);
    linii.push(`- **Mărci similare:** ${m.marci_similare.join(', ') || '—'} · **prețuri:** ${m.pret_mediu || '—'}`);
    linii.push(`- **Colaborare:** ${m.model_colaborare} · **vinde ochelari:** ${m.vinde_ochelari ? 'da' : 'nu'}`);
    const contact = [m.website, m.instagram, m.email, m.telefon, m.adresa].filter(Boolean).join(' · ');
    linii.push(`- **Contact:** ${contact || '—'}`);
    linii.push(`- **Primul pas:** ${m.primul_pas}`);
    linii.push(`- **Sursă:** ${m.sursa}`);
    linii.push('');
  }
  return linii.join('\n');
}

// ---------- Pornire ----------

async function main() {
  const icpuri = doarIcp ? ICP.filter((i) => i.id === doarIcp) : ICP;
  if (!icpuri.length) {
    console.error(`Nu există ICP-ul „${doarIcp}”. Ai: ${ICP.map((i) => i.id).join(', ')}`);
    process.exit(1);
  }

  const rezultate = [];
  for (const icp of icpuri) {
    process.stdout.write(`Caut magazine pentru „${icp.nume}”`);
    try {
      const cercetare = await cerceteaza(icp);
      const magazine = await extrage(icp, cercetare);
      rezultate.push({ icp, magazine });
      console.log(` ${magazine.length} găsite`);
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw err;
      // Un ICP care eșuează nu le oprește pe celelalte.
      console.log(` eroare: ${err.message}`);
    }
  }

  const magazine = uneste(rezultate);
  if (!magazine.length) {
    console.error('Nu am găsit niciun magazin.');
    process.exit(1);
  }

  const data = new Date().toISOString().slice(0, 10);
  const folder = path.join(aici, 'rezultate');
  fs.mkdirSync(folder, { recursive: true });
  const baza = path.join(folder, `magazine-${data}${doarIcp ? '-' + doarIcp : ''}`);
  fs.writeFileSync(baza + '.json', JSON.stringify(magazine, null, 2));
  fs.writeFileSync(baza + '.csv', csv(magazine));
  fs.writeFileSync(baza + '.md', markdown(magazine, data));

  console.log(`\n${magazine.length} magazine salvate în:\n  ${baza}.csv (Excel)\n  ${baza}.md\n  ${baza}.json`);
  console.log('\nPrimele 5:');
  for (const m of magazine.slice(0, 5)) console.log(`  ${m.scor}/10  ${m.nume} (${m.oras}) — ${m.de_ce}`);
}

main().catch((err) => {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error('Cheia Anthropic lipsește sau e greșită. Rulează: export ANTHROPIC_API_KEY=sk-ant-...');
  } else if (err instanceof Anthropic.RateLimitError) {
    console.error('Prea multe cereri deodată. Așteaptă un minut și încearcă din nou.');
  } else if (err instanceof Anthropic.APIError) {
    console.error(`Eroare de la API (${err.status}): ${err.message}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
