/* =========================================================
   Trimiterea emailurilor prin Resend (https://resend.com), fără npm install.
   Variabile în Vercel:
     RESEND_API_KEY   cheia din Resend → API Keys
     EMAIL_FROM       expeditorul, de ex. "Elen Sunglasses <salut@elensunglasses.ro>"
                      (domeniul trebuie verificat în Resend → Domains)
     EMAIL_REPLY_TO   (opțional) unde ajung răspunsurile clienților
     SITE_URL         (opțional) de ex. https://elensunglasses.ro. Fără el, folosim domeniul din Vercel.
   Fără RESEND_API_KEY sau EMAIL_FROM, agentul doar simulează: spune ce ar trimite, dar nu trimite nimic.
   ========================================================= */

const crypto = require('crypto');
const { AGENT } = require('../agent.js');

function siteUrl() {
  const url = process.env.SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'https://elensunglasses.ro');
  return url.replace(/\/$/, '');
}

function poateTrimite() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function emailValid(email) {
  return typeof email === 'string' && email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function normalizeaza(email) {
  return String(email || '').trim().toLowerCase();
}

/* ---------- Linkuri semnate (dezabonare, recenzie) ----------
   Linkul conține datele și o semnătură făcută cu CRON_SECRET, ca nimeni
   să nu poată dezabona sau scrie recenzii în numele altcuiva. */
function semnatura(text) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('Lipsește CRON_SECRET');
  return crypto.createHmac('sha256', secret).update(text).digest('base64url').slice(0, 22);
}

function semneaza(tip, date) {
  const corp = Buffer.from(JSON.stringify([tip, date])).toString('base64url');
  return corp + '.' + semnatura(corp);
}

function verifica(token, tip) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [corp, sem] = token.split('.');
  let asteptat;
  try { asteptat = semnatura(corp); } catch (e) { return null; }
  if (!sem || sem.length !== asteptat.length || !crypto.timingSafeEqual(Buffer.from(sem), Buffer.from(asteptat))) return null;
  try {
    const [t, date] = JSON.parse(Buffer.from(corp, 'base64url').toString());
    return t === tip ? date : null;
  } catch (e) {
    return null;
  }
}

function linkDezabonare(email) {
  return siteUrl() + '/api/dezabonare?t=' + semneaza('d', normalizeaza(email));
}

/* ---------- Pozele produselor în email ----------
   Programele de email nu afișează SVG, așa că punem poza doar dacă
   ai urcat-o deja (images/produse/sola-1.jpg). Altfel cardul apare fără poză. */
const pozeVerificate = {};
async function pozaEmail(produs) {
  const url = siteUrl() + '/' + produs.poze[0];
  if (!(url in pozeVerificate)) {
    try {
      const r = await fetch(url, { method: 'HEAD' });
      pozeVerificate[url] = r.ok && /image\/(jpe?g|png|webp|gif)/.test(r.headers.get('content-type') || '');
    } catch (e) {
      pozeVerificate[url] = false;
    }
  }
  return pozeVerificate[url] ? url : null;
}

/* ---------- Aspectul emailului ----------
   HTML simplu, cu stiluri scrise direct pe elemente (singurul fel în care
   arată la fel în Gmail, Outlook și pe telefon). Culorile sunt cele din style.css. */
const CULORI = { fundal: '#F7F4EE', bej: '#E9DFD0', text: '#1D1B19', gri: '#6F675E', linie: '#DDD3C5', accent: '#B5532E' };
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const numarRo = new Intl.NumberFormat('ro-RO');
function lei(suma) { return numarRo.format(suma) + ' lei'; }

function esc(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function cardProdus(produs, nota, qty) {
  const poza = await pozaEmail(produs);
  const cantitate = qty > 1 ? ` · ${qty} bucăți` : '';
  return `
    <tr><td style="padding:0 0 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CULORI.bej}">
        <tr>
          ${poza ? `<td width="120" style="width:120px;vertical-align:top"><img src="${esc(poza)}" width="120" height="150" alt="${esc(produs.alt)}" style="display:block;width:120px;height:150px;object-fit:cover;border:0"></td>` : ''}
          <td style="padding:16px 18px;vertical-align:middle;font-family:${SANS};color:${CULORI.text}">
            <div style="font-family:${SERIF};font-size:24px;line-height:1.1">${esc(produs.nume)}</div>
            <div style="font-size:13px;color:${CULORI.gri};margin-top:2px">${esc(produs.culoare)}${cantitate}</div>
            <div style="font-size:14px;margin-top:8px"><strong>${lei(produs.pretPrecomanda)}</strong> <span style="color:${CULORI.gri}">la precomandă · ${lei(produs.pret)} după lansare</span></div>
            ${nota ? `<div style="font-size:13px;color:${CULORI.gri};margin-top:6px">${esc(nota)}</div>` : ''}
          </td>
        </tr>
      </table>
    </td></tr>`;
}

function paragraf(text) {
  return `<tr><td style="padding:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${CULORI.text}">${esc(text)}</td></tr>`;
}

function buton(b) {
  return `
    <tr><td style="padding:8px 0 24px">
      <a href="${esc(b.url)}" style="display:inline-block;background:${CULORI.text};color:${CULORI.fundal};font-family:${SANS};font-size:15px;font-weight:500;text-decoration:none;padding:15px 28px;border-radius:2px">${esc(b.text)}</a>
    </td></tr>`;
}

const MOTIVE = {
  cos: 'Primești emailul pentru că ți-ai lăsat adresa în coșul de pe site.',
  client: 'Primești emailul pentru că ai comandat de la noi.',
  abonat: 'Primești emailul pentru că te-ai abonat la Lista Elen.'
};

/* continut: ce întoarce o funcție din TEXTE (agent.js)
   destinatar: { email, motiv: 'cos' | 'client' | 'abonat' } */
async function randeaza(continut, destinatar) {
  const site = siteUrl();
  const dezabonare = linkDezabonare(destinatar.email);
  const randuri = [];
  const text = [];

  continut.paragrafe.forEach((p) => { randuri.push(paragraf(p)); text.push(p); });

  for (const { produs, qty, nota } of continut.produse || []) {
    randuri.push(await cardProdus(produs, nota, qty));
    text.push(`${produs.nume}, ${produs.culoare}: ${lei(produs.pretPrecomanda)} la precomandă`);
  }

  const adaugaButon = () => {
    if (continut.buton) {
      randuri.push(buton(continut.buton));
      text.push(`${continut.buton.text}: ${continut.buton.url}`);
    }
    (continut.dupaButon || []).forEach((p) => { randuri.push(paragraf(p)); text.push(p); });
  };
  // De obicei butonul vine după coș, iar recomandările la final. Fără coș, butonul trece după recomandări.
  const butonLaFinal = !(continut.produse && continut.produse.length);
  if (!butonLaFinal) adaugaButon();

  if (continut.recomandari && continut.recomandari.lista.length) {
    randuri.push(`<tr><td style="padding:16px 0 12px;font-family:${SERIF};font-size:22px;color:${CULORI.text};border-top:1px solid ${CULORI.linie}">${esc(continut.recomandari.titlu)}</td></tr>`);
    text.push(continut.recomandari.titlu);
    for (const { produs, motiv } of continut.recomandari.lista) {
      randuri.push(await cardProdus(produs, motiv, 1));
      text.push(`${produs.nume}, ${produs.culoare}: ${motiv}`);
    }
  }
  if (butonLaFinal) adaugaButon();

  randuri.push(paragraf(AGENT.semnatura));
  text.push(AGENT.semnatura, '', MOTIVE[destinatar.motiv], 'Dezabonare: ' + dezabonare);

  const html = `<!DOCTYPE html>
<html lang="ro"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(continut.subiect)}</title></head>
<body style="margin:0;padding:0;background:${CULORI.fundal}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(continut.preheader || '')}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CULORI.fundal}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="padding:0 0 28px"><a href="${esc(site)}" style="font-family:${SERIF};font-size:30px;font-weight:600;letter-spacing:1px;color:${CULORI.text};text-decoration:none">Elen</a></td></tr>
      ${randuri.join('')}
      <tr><td style="padding:24px 0 0;border-top:1px solid ${CULORI.linie};font-family:${SANS};font-size:12px;line-height:1.6;color:${CULORI.gri}">
        ${esc(MOTIVE[destinatar.motiv])} <a href="${esc(dezabonare)}" style="color:${CULORI.gri}">Nu mai vreau emailuri</a>.<br>
        ${esc(AGENT.firma)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  return { html, text: text.join('\n\n') };
}

/* ---------- Trimiterea ----------
   mesaje: [{ catre, subiect, html, text, tip, cheie }]
   Trimite câte 100 deodată (API-ul batch din Resend). Cheia de idempotență
   face ca, dacă o rulare se repetă, Resend să nu trimită de două ori. */
async function trimite(mesaje) {
  const ids = [];
  for (let i = 0; i < mesaje.length; i += 100) {
    const bucata = mesaje.slice(i, i + 100);
    const raspuns = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.createHash('sha256').update(bucata.map((m) => m.cheie).join('|')).digest('hex').slice(0, 64)
      },
      body: JSON.stringify(bucata.map((m) => ({
        from: process.env.EMAIL_FROM,
        to: [m.catre],
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: m.subiect,
        html: m.html,
        text: m.text,
        tags: [{ name: 'tip', value: m.tip }],
        headers: m.faraDezabonare ? undefined : {
          // Butonul „Dezabonează-te” din Gmail și Apple Mail
          'List-Unsubscribe': `<${linkDezabonare(m.catre)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      })))
    });
    const date = await raspuns.json().catch(() => ({}));
    if (!raspuns.ok) throw new Error('Resend: ' + (date.message || raspuns.status));
    (date.data || []).forEach((d) => ids.push(d.id));
  }
  return ids;
}

module.exports = {
  siteUrl, poateTrimite, emailValid, normalizeaza, semneaza, verifica,
  linkDezabonare, randeaza, trimite, lei, esc
};
