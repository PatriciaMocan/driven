# Elen Sunglasses — precomenzi pentru prima serie

Site-ul are un singur obiectiv: **precomenzi plătite pentru prima serie**, ca să finanțezi producția și să știi exact câte bucăți să faci din fiecare model. Are o pagină principală cu magazinul de precomenzi, plus pagina „Cum le facem”. HTML, CSS și JavaScript simplu, fără build, gata de pus pe Vercel.

```
index.html          pagina principală (texte, ghid de mărimi, formulare)
cum-le-facem.html   pagina despre producție
products.js         PRODUSELE și SETĂRILE DE PRECOMANDĂ (data livrării, avans)
script.js           magazinul, coșul, plata (sus: SETĂRI PLATĂ)
analytics.js        Google Analytics, PostHog, Hotjar, Clarity și bannerul de cookie-uri
style.css           culori, fonturi, aranjare
api/checkout.js     plata prin Stripe (integral sau avans)
api/rezervari.js    contorul de rezervări, numărat din plățile Stripe
api/_stripe.js      cod comun pentru cele două de mai sus
agent.html          AGENTUL DE CLIENȚI: pagină privată, cu parolă (vezi mai jos)
agent.js, agent.css tabelul agentului
api/agent-clienti.js căutarea, notele și mesajele (sus: SETĂRI AGENT)
images/             pozele tale + desenele folosite până le urci

agent-vanzari.js    AGENTUL DE VÂNZĂRI: setări și textele emailurilor
api/_agent.js       ce face agentul la fiecare rulare (nu trebuie atins)
api/agent.js        pornirea agentului (o apelează Vercel Cron și GitHub Actions)
api/cos.js          coșul lăsat pe email
api/abonare.js      formularul „Lista Elen”
api/recenzie.js     formularul de recenzie
api/recenzii.js     recenziile aprobate și pozele lor, pentru site
api/admin.js        pagina de admin
api/dezabonare.js   linkul de dezabonare din emailuri
api/_db.js, api/_email.js   baza de date și trimiterea emailurilor
recenzie.html       pagina unde clientul scrie recenzia și urcă poza
admin.html          aprobi recenzii, vezi vânzările recuperate, previzualizezi emailurile
vercel.json         pornirea zilnică a agentului
.github/workflows/agent-vanzari.yml   pornirea agentului la fiecare 30 de minute
```

## Înainte de prima comandă reală

- [ ] Pozele tale urcate (vezi mai jos). Până atunci se văd desene.
- [ ] Prețuri, prețuri de precomandă, mărimea seriilor, dimensiuni și specificații reale în `products.js`. Cele de acum sunt exemple.
- [ ] **Data livrării** (`PRECOMANDA.livrare`) pe care o poți ține sigur. Pune o lună de rezervă.
- [ ] Textele din `cum-le-facem.html` rescrise după procesul real al producătorului tău.
- [ ] Răspunsurile din secțiunea „Cum funcționează” (banii înapoi la întârziere, anulare oricând, retur 30 de zile) sunt promisiuni. Păstrează doar ce poți respecta.
- [ ] Paginile legale făcute și legate în subsol: termeni și condiții (cu condițiile precomenzii, data livrării, dreptul de retragere de 14 zile de la primirea coletului și formularul de retragere), livrare și retur, politica de confidențialitate.
- [ ] Datele firmei în subsol (denumire, CUI, Nr. Reg. Com., adresă). Ambele pagini au `[EDIT ME]` acolo.
- [ ] Verifică totul cu un avocat sau consultant. Linkurile ANPC/SAL din subsol sunt un punct de plecare, nu o garanție că ești în regulă.

## Vezi site-ul local

Dublu-click pe `index.html`. Merge tot, mai puțin plata cu cardul prin Stripe, care funcționează doar pe Vercel.

## Pune-l pe Vercel

1. Pe [vercel.com/new](https://vercel.com/new), importă acest repository de pe GitHub.
2. Framework preset: **Other**. Lasă build command gol. Apasă **Deploy**.

Fiecare push pe GitHub republică site-ul automat.

## Pozele tale

Pune fișierele în folderele de mai jos, **cu exact aceste nume**, și apar singure. Dacă o poză lipsește, se vede desenul în locul ei, nu o imagine stricată.

| Unde | Fișier | Format |
|---|---|---|
| Prima poză, pagina principală | `images/hero.jpg` | orizontală, minim 2000 px lățime |
| Secțiunea „Despre” | `images/despre.jpg` | verticală 4:5, ~1200 px |
| Produse | `images/produse/sola-1.jpg`, `sola-2.jpg`, `sola-3.jpg` (la fel pentru fiecare model) | verticală 4:5, ~1200 px |
| „Cum le facem”, sus | `images/atelier-hero.jpg` | orizontală, minim 2000 px |
| „Cum le facem”, pașii 1–6 | `images/atelier-1.jpg` … `atelier-6.jpg` | orizontală 4:3, ~1200 px |
| Previzualizare la share | `images/og-image.png` | exact 1200 × 630 |

Pentru fiecare model, trei poze care vând o pereche de 1.700 lei:
1. **Din față**, pe fundal neutru (bej sau alb cald), ochelarii deschiși. Asta apare pe card.
2. **Din trei sferturi**, ca să se vadă grosimea acetatului și balamaua.
3. **Purtați**, pe o persoană, la lumină naturală.

Poți pune oricâte poze: adaugă-le în lista `poze` din `products.js`. Prima e cea principală. Fă pozele mai mici de 300 KB fiecare cu [squoosh.app](https://squoosh.app), ca site-ul să se încarce repede pe mobil.

## Produse și prețuri

Totul e în `products.js`, un bloc `{ ... }` pentru fiecare model.

- **`pret`**: prețul întreg, după lansare, în lei cu TVA.
- **`pretPrecomanda`**: ce plătește cine precomandă acum. Pe site apare „1.520 lei, 1.790 lei după lansare”.
- **`serie`**: câte bucăți are prima serie. Când se rezervă toate, butonul devine „Anunță-mă la seria 2”.
- **`dimensiuni`**: se măsoară pe rama reală, în milimetri. Din `totala` se calculează automat mărimea: mică (sub 137 mm), medie (137–145) sau mare (peste 145).

Sus, în `PRECOMANDA`, sunt **data livrării** și **avansul pe pereche** (implicit 300 lei). Apar peste tot pe site din acest singur loc.

## Contorul „34 din 100 rezervate”

Cu Stripe pornit, contorul se numără singur din plățile reușite, se actualizează cam la 30 de secunde și e mereu adevărat. Serverul nu lasă pe nimeni să plătească peste mărimea seriei.

Rezervările făcute în afara site-ului (telefon, Instagram) le adaugi în `rezervateManual`. O precomandă anulată și rambursată o scazi tot de acolo, cu un număr negativ (de exemplu `-1`).

Fără nicio rezervare, site-ul scrie „Prima serie: 100 de bucăți”, nu „0 din 100”.

## Lansări și acces anticipat pentru abonați

Un produs nou primește două date în `products.js` (vezi Nora ca exemplu):

```js
accesAbonati: '2026-11-18T10:00:00+02:00',  // de când pot cumpăra abonații
lansare:      '2026-11-20T10:00:00+02:00',  // de când poate cumpăra oricine
```

- Înainte de `accesAbonati`: toată lumea vede „În curând”.
- Între cele două date: abonații cu link pot precomanda, ceilalți văd „Doar pentru abonați”.
- După `lansare`: oricine poate precomanda.

Abonaților le trimiți pe email linkul `https://domeniul-tau.ro/?acces=CODUL-TAU`. Alege un cod greu de ghicit și schimbă-l la fiecare lansare.

Codul e verificat pe server: pune-l în Vercel ca variabila `ACCES_ANTICIPAT_COD`. Cine nu are codul corect nu poate plăti.

## Plata

Sus în `script.js`, `PLATA.card` e `'demo'`: nimeni nu poate plăti, iar site-ul spune asta clar. Clientul alege în coș între:

- **Avans acum** (300 lei pe pereche), restul la livrare.
- **Tot acum**, la prețul de precomandă.

### Pornește Stripe

1. Fă cont pe [stripe.com](https://stripe.com) cu firma din România și copiază **cheia secretă** din Developers → API keys. Începe cu cea de test (`sk_test_...`).
2. În Vercel: proiect → Settings → Environment Variables → adaugă `STRIPE_SECRET_KEY` (și `ACCES_ANTICIPAT_COD`, dacă folosești acces anticipat). Redeploy.
3. În `script.js`: `card: 'stripe'`. Commit și push.
4. Testează cu cardul `4242 4242 4242 4242`, orice dată din viitor, orice CVC. Contorul de pe site trebuie să crească. Apoi pune cheia live (`sk_live_...`).

Plata e în lei, livrarea doar în România, iar Stripe cere adresa și telefonul. Prețul și locurile din serie sunt verificate pe server.

### Unde vezi precomenzile și cum încasezi restul

În Stripe → Payments, fiecare plată are la **Metadata**:
- `elen_produse`: ce a comandat (`sola:1,lido:2`)
- `tip`: `avans` sau `integral`
- `rest_de_plata_lei`: cât mai are de plătit
- `livrare`: luna promisă

Exportă lista în CSV înainte să comanzi producția: ai acolo exact câte bucăți din fiecare model.

La livrare, restul se încasează ramburs (treci suma pe AWB la curier) sau cu un Payment Link din Stripe trimis pe email. Pentru o precomandă anulată, dai Refund din Stripe și scazi 1 din `rezervateManual`.

### Mai târziu: vânzare directă

După ce livrezi prima serie, site-ul poate redeveni magazin obișnuit, cu stoc, card, ramburs și rate. Versiunea aceea e în istoricul git (commit-ul „Adapt shop for Romania”).

## Formularul de abonare

Cu agentul de vânzări pornit (mai jos), adresele se salvează singure și abonații primesc emailurile despre lansări. Altfel formularul doar arată mesajul de mulțumire; în `script.js`, caută **AICI CONECTEZI SERVICIUL DE EMAIL** (Formspree sau Mailchimp).

## Agentul de vânzări

Lucrează singur, după ce clientul a plecat de pe site sau a cumpărat deja:

| Când | Cui | Ce primește |
|---|---|---|
| La 1 oră, 24 de ore și 3 zile după ce a lăsat coșul | cine și-a lăsat emailul în coș și a bifat „Păstrează-mi coșul” | „Modelul Sola încă te așteaptă”, apoi cum merge avansul și câte locuri mai sunt, apoi garanțiile (anulare, retur). Butonul pune coșul înapoi exact cum era, chiar și pe alt telefon. |
| La 10 zile după livrare | clienții | cerere de recenzie și o poză cu ochelarii purtați. Tu aprobi ce apare pe site. |
| Când lansezi un model (datele `accesAbonati` / `lansare` din `products.js`) | clienții și abonații | anunțul, cu linkul de acces anticipat. Clienții află și cum se compară mărimea cu rama pe care o au, plus două rame potrivite cu ce au cumpărat. |
| La 45 de zile după livrare | clienții | două rame alese după ce au deja: același material, aceeași mărime, culori apropiate. |

Reguli pe care agentul le respectă singur:
- **Se oprește imediat ce clientul plătește.** Află din Stripe, la fiecare rulare, înainte să trimită ceva.
- **Un singur email pe rulare** de om și cel mult 3 despre același coș. Un coș nou de la aceeași adresă pornește emailurile din nou abia după 14 zile.
- **Nu scrie despre ce nu se mai poate cumpăra**: modelele cu seria rezervată complet sunt scoase din emailuri și din recomandări.
- **Fiecare email are link de dezabonare** (și butonul „Dezabonează-te” din Gmail). Cine se dezabonează nu mai primește nimic.
- **Nu cere recenzii înainte de livrare.** Când trimiți prima serie, completează `PRECOMANDA.livrataPe` în `products.js` (de exemplu `'2027-03-10'`).

Orele, zilele și textele emailurilor se schimbă în `agent-vanzari.js`. În `admin.html` vezi cum arată fiecare email înainte să-l trimită cineva.

### Pornește agentul

1. **Baza de date.** În Vercel: proiect → Storage → Create → **Upstash for Redis** (planul gratuit ajunge) → Connect. Vercel adaugă singur `KV_REST_API_URL` și `KV_REST_API_TOKEN`.
2. **Emailurile.** Fă cont pe [resend.com](https://resend.com), adaugă domeniul la Domains și pune înregistrările DNS pe care ți le arată (fără asta emailurile ajung în spam). Apoi API Keys → creează o cheie.
3. **Variabilele din Vercel** (Settings → Environment Variables):

   | Variabilă | Ce pui |
   |---|---|
   | `RESEND_API_KEY` | cheia din Resend |
   | `EMAIL_FROM` | `Elen Sunglasses <salut@domeniul-tau.ro>` |
   | `EMAIL_REPLY_TO` | (opțional) adresa unde vrei răspunsurile clienților |
   | `EMAIL_ADMIN` | (opțional) adresa ta, ca să afli de fiecare recenzie nouă |
   | `CRON_SECRET` | un text lung și întâmplător, de exemplu din [1password.com/password-generator](https://1password.com/password-generator). Nu-l schimba după ce pornești: semnează linkurile din emailuri. |
   | `ADMIN_PAROLA` | parola pentru `admin.html`, minim 8 caractere |
   | `SITE_URL` | `https://domeniul-tau.ro` |

   Agentul are nevoie și de `STRIPE_SECRET_KEY` (ca să știe cine a cumpărat) și, pentru acces anticipat la lansări, de `ACCES_ANTICIPAT_COD`. Le ai deja dacă ai pornit plata.
4. În `script.js`, sus: `EMAILURI.activ: true`. Commit, push.
5. Deschide `https://domeniul-tau.ro/admin.html`, intră cu parola și apasă **Simulează**: vezi ce emailuri ar pleca acum, fără să plece nimic. Dacă e totul bifat cu verde, agentul e gata.

Fără `RESEND_API_KEY` și `EMAIL_FROM` agentul doar simulează, deci poți face pașii 1, 3 și 4 și te uiți în admin înainte să trimită ceva cuiva.

### Cât de des rulează

Vercel Cron îl pornește o dată pe zi (`vercel.json`); pe planul gratuit Vercel nu se poate mai des. Ca emailul de „1 oră” să plece la timp, îl pornește și GitHub, la fiecare 30 de minute:

1. Pe GitHub, în repository: Settings → Secrets and variables → Actions.
2. La **Secrets**: `CRON_SECRET`, cu aceeași valoare ca în Vercel.
3. La **Variables**: `SITE_URL`, de exemplu `https://domeniul-tau.ro`.

Gata. În tabul Actions vezi fiecare rulare. Dacă repository-ul e privat, cele 30 de minute încap în minutele gratuite GitHub. GitHub oprește acțiunile programate dacă repository-ul nu are niciun commit 60 de zile; atunci apasă „Enable workflow” în Actions. Pe Vercel Pro poți pune în schimb în `vercel.json` `"schedule": "*/15 * * * *"`.

### Recenziile și pozele

Clientul primește linkul pe email, scrie recenzia și urcă poza din telefon (o micșorăm în browser și ștergem din ea locul unde a fost făcută). Recenzia apare în `admin.html` la „Recenzii de aprobat”. Când o aprobi, intră pe site în secțiunea „Purtați de voi”, sub magazin. Secțiunea apare singură de la prima recenzie aprobată.

Pozele aprobate le poți folosi și pe Instagram sau ca poza a treia a produsului: clientul și-a dat acordul pentru site și paginile Elen. Le descarci din admin (click dreapta → Salvează imaginea).

### Ce urmărești

În `admin.html`: câte vânzări au venit după emailurile despre coș și câți lei s-au încasat din ele, câte emailuri a trimis fiecare pas, câte coșuri așteaptă, clienți, abonați, dezabonați. Tot acolo oprești emailurile pentru o anumită adresă, de exemplu după o precomandă anulată.

### Înainte să-l pornești

- [ ] Textul despre anulare și retur din emailul 3 (în `agent-vanzari.js`) e același cu cel din „Cum funcționează” pe site.
- [ ] `semnatura` și `firma` din `agent-vanzari.js` completate (un nume de om la semnătură e citit mai des).
- [ ] În politica de confidențialitate: coșul păstrat pe email (cel mult 14 zile), emailurile despre modele noi către clienți și abonați, recenziile și pozele publicate cu acord, Resend și Upstash ca furnizori.
- [ ] Emailurile către clienții vechi se bazează pe faptul că au cumpărat de la tine și au fost anunțați la plată (pe pagina Stripe scrie „Îți putem scrie despre modelele noi Elen; te poți dezabona din orice email”). Verifică cu avocatul că așa e în regulă pentru tine.

## Analytics: Google Analytics, PostHog, Hotjar, Clarity

Toate patru sunt în `analytics.js`. Pornesc **doar după ce vizitatorul apasă „Accept”** în bannerul de cookie-uri (obligatoriu în UE). Cine refuză nu e urmărit deloc, iar din subsol, la „Setări cookie”, oricine se poate răzgândi.

Ca să pornești un serviciu, pune ID-ul lui sus în `ANALYTICS`, apoi commit și push. Câmpurile goale rămân oprite; dacă toate sunt goale, nu apare niciun banner.

| Serviciu | Unde găsești ID-ul | Câmp |
|---|---|---|
| Google Analytics 4 | [analytics.google.com](https://analytics.google.com) → Admin → Data streams → Web → **Measurement ID** (`G-...`) | `ga4` |
| PostHog | [eu.posthog.com](https://eu.posthog.com) (alege regiunea UE) → Project settings → **Project API key** (`phc_...`) | `posthog.key` |
| Hotjar | [hotjar.com](https://www.hotjar.com) → Sites & Organizations → **Site ID** (număr) | `hotjar` |
| Microsoft Clarity | [clarity.microsoft.com](https://clarity.microsoft.com) → Settings → Overview → **Project ID** | `clarity` |

Ce se măsoară, pe lângă vizitele de pagini:

- `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `purchase`: drumul până la precomandă, cu produsele și valoarea în lei. `purchase` vine cu `tip_plata` (avans sau integral) și `platit_acum`. În GA4 apar la Reports → Monetization.
- `plata_anulata`: cineva a ajuns la Stripe și s-a întors fără să plătească.
- `sign_up`: abonare la noutăți (fără adresa de email).
- `filtru_produse`: ce material, mărime și ordine aleg oamenii.
- `acces_anticipat`: s-a folosit linkul trimis abonaților.

Nu se trimit niciodată emailul, numele, telefonul sau adresa. Hotjar, Clarity și PostHog maschează câmpurile din formulare în înregistrări.

Înainte să pornești analytics:
- [ ] Scrie în **Politica de confidențialitate** ce servicii folosești, ce colectează și cât timp păstrează datele.
- [ ] În GA4: Admin → Data settings → Data retention, alege perioada. În Hotjar și Clarity, verifică dacă mascarea textului e pornită.
- [ ] Verifică: GA4 → Admin → **DebugView**, PostHog → **Activity**, Hotjar și Clarity → **Recordings** (apar după cel mult două ore).

Pentru evenimente noi, rapoarte sau un serviciu nou, proiectul are un agent Claude Code dedicat: `.claude/agents/analytics.md`. Cere-i direct, de exemplu: „folosește agentul analytics să adauge un eveniment când cineva deschide ghidul de mărimi”.

## Texte, culori, fonturi

- **Texte:** în `index.html` și `cum-le-facem.html`. Fiecare secțiune începe cu un comentariu de forma `<!-- ===== 5. DESPRE ===== -->`. Povestea brandului e marcată cu `[EDIT ME]`.
- **Culori și fonturi:** blocul `:root` din începutul `style.css`. Culoarea de accent e `--color-accent`.
- **Domeniul:** înlocuiește `https://elensunglasses.ro` din etichetele `og:` ale ambelor pagini cu domeniul tău real.

## Agentul de clienți

O pagină privată, `domeniul-tau.ro/agent.html`, care caută oameni care ar putea cumpăra sau vinde ochelarii și îți pregătește mesajele. **Nu trimite nimic.** Tu citești, aprobi și trimiți.

- **Caută** pe Instagram și TikTok creatori din România pe modă, lifestyle și travel, cu 5–50 de mii de urmăritori, plus buticuri, saloane premium și hoteluri boutique. Poți alege orașul.
- **Dă note** de la 0 la 10 pentru estetică, public și branduri de lux promovate, și o notă finală din 100 (estetica 40%, publicul 35%, luxul 25%).
- **Scrie un mesaj** pentru fiecare: colaborare, produs cadou, cod de reducere sau, pentru afaceri, să vândă ochelarii la ei. Îl poți edita sau îi poți cere agentului să-l rescrie („mai scurt”, „mai cald”).
- **Tabelul** are numele, linkul, nota, mesajul și stadiul: De aprobat → Aprobat → Trimis → A răspuns → Colaborăm / Nu e interesat. Îl descarci ca CSV pentru Excel.

Cum lucrezi cu el:
1. Alegi categoria și apeși **Caută**. Durează 1–4 minute.
2. Deschizi profilul, verifici că se potrivește, citești mesajul și apeși **Aprobă mesajul**. Dacă schimbi un mesaj aprobat, trebuie aprobat din nou.
3. **Copiază și deschide profilul** copiază mesajul și deschide Instagramul sau TikTok-ul persoanei. Îl trimiți tu, din contul tău, apoi apeși **L-am trimis**.
4. Când îți răspund, schimbi stadiul din listă.

### Pornește agentul

1. Fă cont pe [console.anthropic.com](https://console.anthropic.com), pune bani în cont (Billing) și creează o cheie în Settings → API keys.
2. În Vercel → Settings → Environment Variables adaugă:
   - `ANTHROPIC_API_KEY`: cheia de mai sus
   - `AGENT_PAROLA`: parola cu care intri în `agent.html`. Alege una lungă.
3. Redeploy. Vercel instalează singur ce trebuie (din `package.json`).
4. Sus în `api/agent-clienti.js`, la **SETĂRI AGENT**, pune Instagramul tău, semnătura și ce reducere oferi. Agentul le folosește în mesaje.

### De știut

- **Costul:** o căutare de 6 prospecți costă de obicei câțiva lei (căutări web + scris). O rescriere de mesaj, câțiva bani. Vezi consumul în console.anthropic.com → Usage și pune o limită lunară acolo.
- **Verifică înainte să aprobi.** Agentul pune doar conturi găsite în căutare și lasă gol numărul de urmăritori când nu l-a văzut, dar Instagram și TikTok nu arată tot în căutări: deschide profilul și uită-te singură.
- **Lista stă în browser.** Dacă ștergi datele browserului sau schimbi calculatorul, o pierzi. Apasă din când în când **Salvează o copie** și, pe alt calculator, **Încarcă o copie**.
- Pagina nu apare în Google și nu e legată de pe site. Fără parolă, agentul nu pornește.
- Instagram și TikTok limitează mesajele trimise unor conturi noi. Trimite câteva pe zi, nu zeci deodată.
