# Elen Sunglasses — shop

A one-page shop for Elen's luxury sunglasses. Plain HTML, CSS and JavaScript, no build step, ready for Vercel.

```
index.html        page layout and text
products.js       THE PRODUCT LIST: names, prices, photos, descriptions
style.css         colours, fonts, layout
script.js         shop grid, filters, quick view, bag, checkout, newsletter form
api/checkout.js   Stripe checkout (only used if you switch checkout to Stripe)
images/           favicon, share image, and fallback placeholders
```

## Before you take real orders

- **The photos are stand-ins.** They are free stock photos from [Unsplash](https://unsplash.com) (free for commercial use), but they show other people's sunglasses, not Elen frames. Selling a product with a photo of a different product misleads customers, so replace every photo with your own before switching checkout on.
- **Check every claim against your real products and policies:** prices, materials ("Italian acetate", "titanium"), lens specs, "free EU shipping", "30-day returns" and "2-year warranty".
- **Add the legal pages** linked in the footer (shipping & returns, terms of sale, privacy policy, legal notice). EU online shops are required to have them, including information about the 14-day right of withdrawal.

## Preview it

Double-click `index.html`. Everything works locally except Stripe checkout, which only runs once the site is on Vercel.

## Deploy to Vercel

1. On [vercel.com/new](https://vercel.com/new), import this GitHub repository.
2. Framework preset: **Other**. Leave the build command empty. Click **Deploy**.

Every push to GitHub redeploys automatically.

## Add, remove or edit products

Open `products.js`. Each product is one `{ ... }` block. Copy a block to add a product, delete one to remove it. Prices are in euros including VAT, as whole numbers (`price: 340`).

The filter buttons use the `material` field: `"acetate"`, `"metal"` or `"mixed"` (shown as "Browline").

## Replace the photos

1. Put your photos in `images/`. JPG or WebP, about 1200px wide, portrait (4:5) works best, under 300 KB each ([squoosh.app](https://squoosh.app) shrinks them).
2. In `products.js`, change `image` to the file, e.g. `image: 'images/sola.jpg'`, and update `imageAlt` to describe the photo. Delete the `credit` line.
3. The hero and About photos are in `index.html`: search for `unsplash.com` and replace those links the same way.
4. When no Unsplash photos are left, remove the "Placeholder photos from Unsplash" line in the footer.

If a photo ever fails to load, the site automatically shows the matching drawing from `images/` (`model-sola.svg` and so on) instead of a broken image.

## Turn on checkout

Open `script.js`. At the top, `CHECKOUT.mode` is `'demo'`, which means nobody can pay yet. Pick one:

### Stripe (recommended if you don't have a shop platform)

1. Create a [Stripe](https://stripe.com) account and copy your **secret key** from Developers → API keys. Start with the test key (`sk_test_...`).
2. In Vercel: your project → Settings → Environment Variables → add `STRIPE_SECRET_KEY` with that key. Redeploy.
3. In `script.js`, set `mode: 'stripe'`, commit and push.
4. Test with card number `4242 4242 4242 4242`, any future date, any CVC. When it works, swap in your live key (`sk_live_...`).

Prices are read from `products.js` on the server, so nobody can change them in their browser. To change which countries you ship to, edit `SHIP_TO` in `api/checkout.js`. For VAT and tax settings, see Stripe Tax in your Stripe dashboard.

### Shopify

Use this if your products, stock and payments live in Shopify.

1. Find each product's **variant ID** in Shopify admin (open the product, click the variant; the number at the end of the URL).
2. Put it in `products.js` as `shopifyVariantId: '1234567890'`.
3. In `script.js`, set `mode: 'shopify'` and `shopifyDomain: 'your-store.myshopify.com'`.

Checkout then opens Shopify's own checkout with the bag already filled in.

## Connect the newsletter form

The form shows a thank-you message but doesn't save anything yet. In `script.js`, look for **CONNECT YOUR EMAIL SERVICE HERE** for Formspree and Mailchimp steps.

## Change text, colours and fonts

- **Text:** all in `index.html`; each section starts with a comment like `<!-- ===== 4. ABOUT ===== -->`. The brand story is marked `[EDIT ME]`.
- **Colours and fonts:** the `:root` block at the top of `style.css`. The accent colour is `--color-accent`.
- **Share preview:** the `og:` tags at the top of `index.html`. Replace `https://elensunglasses.com` with your real domain.
