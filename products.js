/* =========================================================
   Elen Sunglasses — PRODUCT LIST
   This is the only file you need to edit to add, remove or
   change products. The shop on the page is built from it.

   Each product has:
     id        short unique name, lowercase, no spaces (used by the cart)
     name      shown on the page
     price     in euros, including VAT (whole number, e.g. 340)
     material  "acetate", "metal" or "mixed" (used by the filter buttons)
     colour    shown under the name
     short     one line on the product card
     description  a few sentences in the quick view
     details   bullet points in the quick view
     image     photo URL or local file, e.g. "images/marea.jpg"
     imageAlt  describes the photo for screen readers and Google
     credit    link to the photo's Unsplash page (delete when you use your own photos)
     shopifyVariantId  only needed if you check out through Shopify (see README)

   IMPORTANT: the photos below are free Unsplash stock photos used as
   stand-ins. They are NOT Elen products. Replace them with photos of
   your own frames before you take real orders.
   ========================================================= */

const PRODUCTS = [
  {
    id: 'sola',
    name: 'Sola',
    price: 360,
    material: 'acetate',
    colour: 'Dark tortoise',
    short: 'Our heaviest acetate, polished by hand for three days.',
    description: 'Sola is the frame we started with. Thick Italian acetate in a dark, warm tortoise, with a soft curve at the top so it reads feminine without going full cat-eye.',
    details: ['Italian acetate, hand-polished', 'Polarised category 3 lenses, 100% UV400', 'Five-barrel hinges', 'Leather case and cotton cloth included'],
    image: 'https://unsplash.com/photos/QsBTYwxjzUU/download?w=1200',
    imageAlt: 'Tortoiseshell sunglasses',
    credit: 'https://unsplash.com/photos/QsBTYwxjzUU',
    shopifyVariantId: ''
  },
  {
    id: 'lido',
    name: 'Lido',
    price: 310,
    material: 'metal',
    colour: 'Gold',
    short: 'A fine gold-tone round frame. Weighs almost nothing.',
    description: 'Lido is all metal, with thin round rims and adjustable nose pads. It suits smaller faces and sits close to the eyes, which is exactly what you want on a bright day.',
    details: ['Gold-plated titanium', 'Polarised category 3 lenses, 100% UV400', 'Adjustable nose pads', 'Leather case and cotton cloth included'],
    image: 'https://unsplash.com/photos/1-nx1QR5dTE/download?w=1200',
    imageAlt: 'Gold-coloured round sunglasses on a white marble surface',
    credit: 'https://unsplash.com/photos/1-nx1QR5dTE',
    shopifyVariantId: ''
  },
  {
    id: 'marea',
    name: 'Marea',
    price: 340,
    material: 'acetate',
    colour: 'Black',
    short: 'Plain black, slightly oversized. The one you wear every day.',
    description: 'If you only own one pair, make it this one. Marea is a clean black frame, a little wider than average, with dark grey lenses that keep colours true.',
    details: ['Italian acetate', 'Polarised grey lenses, category 3, 100% UV400', 'Spring hinges', 'Leather case and cotton cloth included'],
    image: 'https://unsplash.com/photos/egqZNnzjXng/download?w=1200',
    imageAlt: 'Black-framed sunglasses on a white surface',
    credit: 'https://unsplash.com/photos/egqZNnzjXng',
    shopifyVariantId: ''
  },
  {
    id: 'corso',
    name: 'Corso',
    price: 380,
    material: 'mixed',
    colour: 'Black and silver',
    short: 'Browline frame: acetate on top, metal underneath.',
    description: 'Corso borrows the browline shape from the fifties and makes it a touch slimmer. Acetate brows, a metal lower rim, and a bridge that sits well on most noses.',
    details: ['Acetate brow with stainless steel rim', 'Polarised category 3 lenses, 100% UV400', 'Adjustable nose pads', 'Leather case and cotton cloth included'],
    image: 'https://unsplash.com/photos/5cQWlneqrOM/download?w=1200',
    imageAlt: 'Browline sunglasses on a white surface in the sun',
    credit: 'https://unsplash.com/photos/5cQWlneqrOM',
    shopifyVariantId: ''
  },
  {
    id: 'vela',
    name: 'Vela',
    price: 320,
    material: 'acetate',
    colour: 'Light tortoise',
    short: 'A lighter, honey-coloured tortoise. Good with a tan.',
    description: 'Vela is a medium-sized frame in a light tortoise that turns almost amber in the sun. Brown lenses add a bit of contrast, which helps when driving.',
    details: ['Italian acetate', 'Polarised brown lenses, category 3, 100% UV400', 'Five-barrel hinges', 'Leather case and cotton cloth included'],
    image: 'https://unsplash.com/photos/tThXg95SZOM/download?w=1200',
    imageAlt: 'Tortoiseshell sunglasses lying on a magazine',
    credit: 'https://unsplash.com/photos/tThXg95SZOM',
    shopifyVariantId: ''
  },
  {
    id: 'riva',
    name: 'Riva',
    price: 395,
    material: 'mixed',
    colour: 'Tortoise and gold',
    short: 'Tortoise browline with gold-tone metal. A little more dressed up.',
    description: 'Riva is Corso\'s warmer sibling. Same browline idea, but in tortoise with gold-tone metal, so it works as well with a linen shirt as with a jacket.',
    details: ['Acetate brow with gold-plated steel rim', 'Polarised category 3 lenses, 100% UV400', 'Adjustable nose pads', 'Leather case and cotton cloth included'],
    image: 'https://unsplash.com/photos/aXJdmnxauwY/download?w=1200',
    imageAlt: 'Tortoiseshell browline sunglasses next to a brown beaded necklace',
    credit: 'https://unsplash.com/photos/aXJdmnxauwY',
    shopifyVariantId: ''
  },
  {
    id: 'ines',
    name: 'Ines',
    price: 290,
    material: 'acetate',
    colour: 'Ivory',
    short: 'Ivory acetate. Bold on purpose.',
    description: 'Ines is the one people ask about. A chunky ivory frame with dark lenses, made for summer and not much else. We think that\'s fine.',
    details: ['Italian acetate', 'Polarised category 3 lenses, 100% UV400', 'Five-barrel hinges', 'Leather case and cotton cloth included'],
    image: 'https://unsplash.com/photos/eFd132P8Qik/download?w=1200',
    imageAlt: 'Woman wearing white-framed sunglasses',
    credit: 'https://unsplash.com/photos/eFd132P8Qik',
    shopifyVariantId: ''
  },
  {
    id: 'alba',
    name: 'Alba',
    price: 330,
    material: 'acetate',
    colour: 'Smoke',
    short: 'Slim and quiet. For people who don\'t like being noticed.',
    description: 'Alba is the most understated frame in the collection: slim, translucent smoke acetate with grey lenses. It disappears on the face in a good way.',
    details: ['Italian acetate, translucent', 'Polarised grey lenses, category 3, 100% UV400', 'Spring hinges', 'Leather case and cotton cloth included'],
    image: 'https://unsplash.com/photos/uxzWfwOIyT8/download?w=1200',
    imageAlt: 'A pair of glasses on a white surface',
    credit: 'https://unsplash.com/photos/uxzWfwOIyT8',
    shopifyVariantId: ''
  }
];

/* Lets the Stripe checkout function (api/checkout.js) read the same list,
   so prices can't be changed by someone editing the page in their browser.
   Leave this line as it is. */
if (typeof module !== 'undefined') module.exports = PRODUCTS;
