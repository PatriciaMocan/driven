# Checkout: ce nu se poate verifica public

Testele automate (`npm test`) acoperă CTA-urile, coșul, validarea cantităților și răspunsurile de succes și eroare ale checkout-ului. Toate folosesc un **Stripe simulat**. Nu se face nicio cerere către Stripe și nu se folosește nicio cheie reală. Pe scurt: testele dovedesc că *codul nostru* trimite și primește ce trebuie, nu că plata funcționează cap-coadă.

La data testelor, în Vercel nu era setată nicio cheie Stripe, iar `PLATA.card` din `script.js` era `'demo'`.

## 1. Ce rămâne de verificat manual, cu o cheie de test

Doar după ce pui `STRIPE_SECRET_KEY = sk_test_...` în Vercel (Settings → Environment Variables) și `PLATA.card = 'stripe'`, **pe un deploy de preview**:

| De verificat | Cum |
|---|---|
| Se deschide pagina reală Stripe Checkout, în lei și în română | Adaugă un produs, apasă „Precomandă”. |
| Plata de test reușește și te întoarce pe site cu coșul golit | Card `4242 4242 4242 4242`, orice dată din viitor, orice CVC. |
| Plata cu autentificare (3-D Secure) | Card `4000 0025 0000 3155`. |
| Plata refuzată afișează eroarea Stripe, iar coșul rămâne | Card `4000 0000 0000 0002`. |
| „Înapoi” din Stripe păstrează coșul | Link-ul de anulare din pagina Stripe. |
| Avansul și restul apar corect | Stripe → Payments → plata → Metadata (`tip`, `rest_de_plata_lei`). |
| Contorul „X din Y rezervate” crește după plată | Reîncarcă pagina după o plată de test (contorul e păstrat ~30 s). |
| Apple Pay / Google Pay | Doar pe un telefon cu portofel configurat și pe domeniul tău, verificat în Stripe. |

## 2. Limite cunoscute, care nu se pot reproduce în teste

- **Ultimele locuri, cumpărate în același timp.** Locurile libere se verifică atunci când se deschide pagina de plată, nu când se plătește. Doi clienți care deschid plata în același minut pentru ultimul loc pot plăti amândoi. Ca să nu se întâmple, ar fi nevoie de rezervarea locului în momentul plății (webhook Stripe și o bază de date). Nu e implementat.
- **Plățile neterminate nu țin locul ocupat.** O sesiune deschisă și abandonată nu scade contorul, iar Stripe o expiră singur după 24 h.
- **Rambursările nu scad contorul automat.** O precomandă rambursată rămâne numărată până o scazi din `rezervateManual` (vezi README).
- **Contorul a fost testat doar cu răspunsuri simulate.** Paginarea peste 100 de plăți n-a fost verificată pe date reale.
- **Restul de plată la livrare** (card sau ramburs la curier) se face în afara site-ului. Nu există cod de testat.

## 3. Ce depinde de mediu și nu e testat

- **Funcțiile Vercel** sunt testate apelate direct, nu pe un deploy real. Cum citește Vercel corpul cererii și ce adresă (`host`) apare în linkurile de întoarcere de la Stripe se vede doar pe deploy.
- **Browsere:** testele rulează în Chromium. Safari (iPhone) și Firefox n-au fost testate. Mesajele de eroare de rețea diferă între browsere, iar site-ul le înlocuiește pe toate cu același mesaj simplu.
- **Emailuri:** chitanțele Stripe și emailurile agentului de vânzări (Resend) nu sunt configurate.
- **Evenimentul `purchase` din analytics** nu e verificat: nu e setat niciun ID de analytics.
- **Site-ul public:** nu e testat pe domeniul real, care nu e confirmat încă.

## 4. Ce nu verific niciodată de aici

- Plăți reale sau cu cheia live (`sk_live_`).
- Cheile în sine: nu le cer și nu apar în cod, teste sau loguri. Testele folosesc doar o cheie inventată, `sk_test_simulat_pentru_teste`.
