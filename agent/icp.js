/* =========================================================
   Elen Sunglasses — CLIENȚII IDEALI (ICP)
   De aici pornește agentul care caută magazine (magazine.js).
   Pentru fiecare ICP, agentul caută pe internet locurile unde
   oamenii ăștia cumpără deja lucruri de prețul și calitatea Elen.

   Câmpurile fiecărui ICP:
     id          nume scurt, fără spații (îl folosești cu --icp)
     nume        cum îi spui tu
     cine        cine e, în două-trei fraze
     unde        orașe sau zone unde îi găsești
     cumpara     ce mărci și ce fel de magazine folosește deja
     buget       cât dă de obicei pe un accesoriu
     semnale     după ce recunoști un magazin potrivit pentru el

   [DE VERIFICAT] ICP-urile de mai jos sunt un punct de plecare, scrise
   după site (ochelari din acetat italian, 1.300–1.800 lei, prima serie
   mică). Înlocuiește-le cu ce ai aflat tu din discuțiile cu clienții.
   ========================================================= */

export const ICP = [
  {
    id: 'urbana',
    nume: 'Profesionista urbană',
    cine: 'Femeie de 30–45 de ani, lucrează în corporație, avocatură, medicină sau are propria firmă. Cumpără mai puțin, dar mai bun, și îi place să poarte mărci pe care nu le are toată lumea.',
    unde: ['București', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Brașov'],
    cumpara: 'Designeri români (Lana Dumitru, Maressa, Ioana Ciolacu), mărci nișate europene, accesorii de 800–3.000 lei. Concept store-uri și buticuri multibrand, mai puțin mall-uri.',
    buget: '1.000–3.000 lei pe un accesoriu',
    semnale: 'Magazin multibrand cu designeri români sau europeni independenți, selecție mică și atentă, prețuri peste 500 lei pe produs, Instagram îngrijit.'
  },
  {
    id: 'gentleman',
    nume: 'Bărbatul care apreciază lucrul bine făcut',
    cine: 'Bărbat de 30–55 de ani, citește despre ceasuri, pantofi, haine făcute ca lumea. Vrea să știe din ce e făcut obiectul și cine l-a făcut.',
    unde: ['București', 'Cluj-Napoca', 'Timișoara', 'Brașov', 'Sibiu'],
    cumpara: 'Magazine de menswear, croitorii, pantofi Goodyear, ceasuri independente, articole din piele. Mărci ca Oliver Peoples, Moscot, Persol.',
    buget: '1.000–4.000 lei pe un accesoriu',
    semnale: 'Menswear, barbershop de lux, magazin de ceasuri sau pantofi care vinde și accesorii, accent pe meșteșug și materiale.'
  },
  {
    id: 'optica',
    nume: 'Clientul de optică premium',
    cine: 'Poartă ochelari de vedere sau de soare de designer și merge la o optică independentă pentru sfaturi și selecție, nu la lanțuri.',
    unde: ['București', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța', 'Oradea'],
    cumpara: 'Optici independente cu rame de nișă: Jacques Marie Mage, Moscot, Mykita, Lindberg, Oliver Peoples, Garrett Leight, Ahlem.',
    buget: '1.200–4.000 lei pe o ramă',
    semnale: 'Optică independentă (nu lanț) care vinde rame de designer independente, nu doar Ray-Ban și Police.'
  },
  {
    id: 'vacanta',
    nume: 'Clientul de vacanță premium',
    cine: 'Cupluri și familii cu venituri mari, în concediu la mare sau la munte, în hoteluri boutique și resorturi. Cumpără din impuls ceva frumos și util pe loc.',
    unde: ['Mamaia', 'Vama Veche', '2 Mai', 'Constanța', 'Poiana Brașov', 'Sinaia', 'Delta Dunării', 'Transilvania (pensiuni și conace de lux)'],
    cumpara: 'Magazinul hotelului, buticuri de stațiune, beach club-uri cu shop, concept store-uri de vară.',
    buget: '500–2.000 lei pe un accesoriu',
    semnale: 'Hotel boutique, resort sau beach club cu magazin propriu, buticuri de stațiune care vând mărci premium.'
  }
];

/* Magazine pe care le știi deja sau le-ai contactat. Agentul nu le mai propune.
   Scrie numele sau site-ul, de exemplu: 'Exemplu Concept Store', 'exemplu.ro' */
export const EXCLUSE = [];
