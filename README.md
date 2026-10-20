# Elen Sunglasses — magazin online

Magazin de o pagină pentru ochelarii Elen, plus pagina „Cum le facem”. HTML, CSS și JavaScript simplu, fără build, gata de pus pe Vercel.

```
index.html          pagina principală (texte, ghid de mărimi, formulare)
cum-le-facem.html   pagina despre producție
products.js         LISTA DE PRODUSE: prețuri, stoc, dimensiuni, poze, lansări
script.js           magazinul, coșul, plata (sus: SETĂRI PLATĂ)
style.css           culori, fonturi, aranjare
api/checkout.js     plata cu cardul prin Stripe (doar dacă o pornești)
images/             pozele tale + desenele folosite până le urci
```

## Înainte de prima comandă reală

- [ ] Pozele tale urcate (vezi mai jos). Până atunci se văd desene.
- [ ] Prețuri, stocuri, dimensiuni și specificații reale în `products.js`. Cele de acum sunt exemple.
- [ ] Textele din `cum-le-facem.html` rescrise după procesul real al producătorului tău.
- [ ] Livrarea (24–48 h), returul (30 de zile) și garanția confirmate. Apar în banda de sub prima poză, în coș și pe „Cum le facem”.
- [ ] Paginile legale făcute și legate în subsol: termeni și condiții (cu dreptul de retragere de 14 zile și formularul de retragere), livrare și retur, politica de confidențialitate.
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

## Produse, prețuri și stoc

Totul e în `products.js`, un bloc `{ ... }` pentru fiecare model.

- **Prețul** e în lei, cu TVA, număr întreg: `pret: 1690`.
- **Stocul** (`stoc: 7`) e afișat pe site: „7 bucăți în stoc”, „Ultimele 2 bucăți”, „Stoc epuizat”. Nu scade singur. **Actualizează-l după fiecare vânzare** (editezi numărul, faci commit și push). Un stoc afișat greșit e o practică înșelătoare față de client. Dacă vinzi des, trece pe Shopify, care ține stocul automat.
- **Dimensiunile** (`dimensiuni`) se măsoară pe rama reală, în milimetri. Din `totala` se calculează automat mărimea: mică (sub 137 mm), medie (137–145) sau mare (peste 145). Limitele se schimbă în funcția `marimeRama`.

## Lansări și acces anticipat pentru abonați

Un produs nou primește două date în `products.js` (vezi Nora ca exemplu):

```js
accesAbonati: '2026-11-18T10:00:00+02:00',  // de când pot cumpăra abonații
lansare:      '2026-11-20T10:00:00+02:00',  // de când poate cumpăra oricine
```

- Înainte de `accesAbonati`: toată lumea vede „În curând”.
- Între cele două date: abonații cu link pot cumpăra, ceilalți văd „Doar pentru abonați”.
- După `lansare`: e disponibil pentru toți.

Abonaților le trimiți pe email linkul `https://domeniul-tau.ro/?acces=CODUL-TAU`. Alege un cod greu de ghicit și schimbă-l la fiecare lansare.

- **La plata cu cardul (Stripe)**, codul e verificat pe server: pune-l în Vercel ca variabila `ACCES_ANTICIPAT_COD`. Cine nu are codul corect nu poate plăti.
- **La ramburs**, codul apare în emailul comenzii și îl verifici tu.

## Plata

Sus în `script.js`, secțiunea `PLATA`. Implicit totul e în **mod demo**: nimeni nu poate plăti, iar site-ul spune asta clar.

### Card prin Stripe

1. Fă cont pe [stripe.com](https://stripe.com) cu firma din România și copiază **cheia secretă** din Developers → API keys. Începe cu cea de test (`sk_test_...`).
2. În Vercel: proiect → Settings → Environment Variables → adaugă `STRIPE_SECRET_KEY`. Redeploy.
3. În `script.js`: `card: 'stripe'`. Commit și push.
4. Testează cu cardul `4242 4242 4242 4242`, orice dată din viitor, orice CVC. Apoi pune cheia live (`sk_live_...`).

Plata e în lei (RON), livrarea doar în România, iar Stripe cere telefonul pentru curier. Prețul și stocul sunt citite pe server din `products.js`, deci nu pot fi modificate din browser.

### Ramburs

Clientul completează adresa, iar comanda îți vine pe email.

1. Fă un formular gratuit pe [formspree.io](https://formspree.io) și copiază adresa lui (`https://formspree.io/f/...`).
2. În `script.js`: `ramburs: { activ: true, formspreeUrl: 'https://formspree.io/f/...' }`.
3. Pentru fiecare comandă primești un email cu produsele, totalul, adresa și telefonul. Suni clientul ca să confirmi (la 1.700 lei merită, scade mult refuzurile la livrare), apoi generezi AWB-ul la curier (Fan Courier, Sameday, Cargus etc.).

Cât timp `formspreeUrl` e gol, comanda nu se trimite nicăieri, iar clientul vede „Mod demo”.

### În rate

Nu se poate conecta fără un contract cu un furnizor. Variantele obișnuite în România:
- **Rate fără dobândă pe cardul de credit** (Banca Transilvania Star, ING, BCR etc.), prin procesatori ca Netopia sau BT iPay.
- **Cumpără acum, plătește mai târziu**: TBI Bank (tbi pay), Mokka, PayPo.

Fiecare îți dă un plugin sau un link de plată după ce semnezi. Când ai unul, se adaugă ca a treia opțiune lângă card și ramburs. Dacă alegi Shopify, majoritatea au aplicații gata făcute.

### Shopify (alternativa „totul într-un loc”)

Dacă vrei stoc care scade singur, ramburs, card și rate fără să administrezi nimic din cod, mută produsele în Shopify. Pune `shopifyVariantId` la fiecare produs în `products.js`, apoi în `script.js` setează `card: 'shopify'` și `shopifyDomain`. Checkout-ul Shopify preia de acolo.

## Formularul de abonare

Arată mesajul de mulțumire, dar nu salvează încă adresele. În `script.js`, caută **AICI CONECTEZI SERVICIUL DE EMAIL** (Formspree sau Mailchimp).

## Texte, culori, fonturi

- **Texte:** în `index.html` și `cum-le-facem.html`. Fiecare secțiune începe cu un comentariu de forma `<!-- ===== 5. DESPRE ===== -->`. Povestea brandului e marcată cu `[EDIT ME]`.
- **Culori și fonturi:** blocul `:root` din începutul `style.css`. Culoarea de accent e `--color-accent`.
- **Domeniul:** înlocuiește `https://elensunglasses.ro` din etichetele `og:` ale ambelor pagini cu domeniul tău real.
