# Date de completat înainte de lansare

Fișier de lucru: completează coloana **„Valoarea reală”** (aici pe GitHub sau în chat). Nimic din ce scrie aici nu apare pe site până nu e trecut în pagini. Tot ce rămâne necompletat va avea pe site un marcaj clar de informație lipsă.

Inventar făcut pe `index.html` și `cum-le-facem.html`, împreună cu textele care vin din `products.js`. Paginile legale nu există încă.

## A. Firmă și contact

| Câmp | Unde apare | Acum | Valoarea reală |
|---|---|---|---|
| Denumirea firmei | subsol, ambele pagini | „Elen Sunglasses SRL” (presupus) | |
| CUI | subsol, ambele pagini | `[EDIT ME]` | |
| Nr. Reg. Com. | subsol, ambele pagini | `[EDIT ME]` | |
| Adresa sediului | subsol, ambele pagini | `[EDIT ME]` | |
| Email de contact | subsol (2 pagini), ghidul de mărimi | `salut@example.com` | |
| Link Instagram | subsol, ambele pagini | `https://instagram.com/` (fără cont) | |
| Domeniul site-ului | etichetele de share, ambele pagini | `elensunglasses.ro` (presupus) | |

## B. Pagini legale

Paginile există (`termeni.html`, `livrare-retur.html`, `confidentialitate.html`), iar linkurile din subsol duc la ele. Deocamdată au doar structura: fiecare secțiune e marcată vizibil `[DE COMPLETAT]`, cu o indicație despre ce trebuie să conțină. Au și `noindex`, ca să nu apară în Google până au text. Textul juridic trebuie scris sau verificat de un avocat. Când îl ai, trimite-l și îl pun în pagini.

| Pagină | Ai textul? (da / nu) | Cine l-a scris (avocat, generator etc.) |
|---|---|---|
| Termeni și condiții (`termeni.html`, inclusiv dreptul de retragere și formularul de retragere) | | |
| Livrare și retur (`livrare-retur.html`) | | |
| Politica de confidențialitate (`confidentialitate.html`) | | |

Pentru livrare, retur și confidențialitate e nevoie și de:

| Câmp | Valoarea reală |
|---|---|
| Curierul folosit | |
| Adresa la care se trimit retururile | |
| Cine plătește returul | |
| Metoda și termenul de rambursare | |
| Email sau persoană pentru cereri GDPR (ștergere, acces la date) | |
| Servicii care primesc date: Stripe, email (Resend / Formspree / Mailchimp), analytics | |

## C. Promisiuni afișate clientului

Pentru fiecare: **păstrez** (cu cifrele reale), **modific** (cum) sau **scot**.

| # | Text afișat acum | Unde | Decizia ta |
|---|---|---|---|
| 1 | Livrare în **martie 2027** | hero, bandă, pași, coș, „Cum le facem” | |
| 2 | Avans de **300 lei**, restul la livrare **„cu cardul sau ramburs”** | bandă, pași, coș | |
| 3 | „Banii înapoi dacă nu livrăm la timp” / integral, „fără nicio explicație”, după sfârșitul lunii promise | bandă, întrebări frecvente | |
| 4 | „Livrare gratuită în toată România”, prin curier | bandă, pași, coș | |
| 5 | Anulare „oricând până pleacă coletul”, rambursare totală „în cel mult 14 zile” | întrebări frecvente | |
| 6 | Retur în **30 de zile**, „Returul e gratuit” | întrebări frecvente, „Cum le facem” | |
| 7 | „Comandăm producția exact pe câte precomenzi avem. Îți scriem pe email cum avansează.” | pași | |
| 8 | Prețul de precomandă e doar pentru prima serie; după livrare se aplică prețul întreg | întrebări frecvente, sub produse | |
| 9 | „Abonații primesc un link de acces anticipat” | abonare | |
| 10 | „Nu vindem și nu dăm datele mai departe”, „păstrăm emailul din coș cel mult 14 zile”, „Scrie-ne oricând și le ștergem” | subsol | |

## D. Produs și brand

| Text | Unde | Valoarea reală / decizia ta |
|---|---|---|
| „acetat italian și titan, făcuți în serii mici. Fără logo pe brațe.” | hero | |
| „gândiți în Europa” | subsol | |
| Povestea brandului (2 paragrafe `[EDIT ME]`) | secțiunea „Despre” | |
| Cei 6 pași de producție (`[EDIT ME]` în cod) | „Cum le facem” | |
| Prețuri, prețuri de precomandă, mărimea seriilor | `products.js`, 9 modele | **nu le schimb fără confirmarea ta** |
| Dimensiuni (mm), culori, descrieri, specificații (titan placat cu aur, categoria 3 UV400, balamale cu cinci inele, husă din piele) | `products.js` | |
| Datele de acces anticipat pentru Nora (15 oct / 20 nov 2026, deja trecute) | `products.js` | |

## E. Linkuri externe, de verificat după completare

| Link | Stare |
|---|---|
| `https://anpc.ro/` | neverificat: rețeaua sesiunii blochează `anpc.ro` |
| `https://anpc.ro/ce-este-sal/` | neverificat: la fel |
| Instagram | de completat (A) |

## Cum verific după completare

- `npm test` verifică linkurile interne și paginile legale. Testul „nicio pagină publică nu mai are placeholdere” e marcat TODO și listează ce mai lipsește: `[EDIT ME]`, `[DE COMPLETAT]`, emailul de exemplu, Instagram fără cont și `noindex`. După completare, scot marcajul TODO și testul devine obligatoriu.
- Promisiunile din secțiunile C și D nu au un marcaj vizibil (așa ai ales), deci testele nu le pot detecta automat. Le verific manual, pe baza deciziilor tale din tabel.
- Linkurile externe: `VERIFICA_EXTERN=1 npm test`, dintr-un mediu cu acces la internet.

