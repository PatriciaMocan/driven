# Elen Sunglasses — landing page

A one-page "coming soon" site. Plain HTML, CSS and JavaScript: no frameworks, no build step.

```
index.html   page content (all the text lives here)
style.css    colours, fonts, layout
script.js    scroll fade-ins, gallery lightbox, signup form
images/      all pictures, the favicon and the social share image
```

## Preview it

Double-click `index.html` to open it in your browser. That's all you need.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. On [vercel.com](https://vercel.com), click **Add New → Project** and import the repo.
3. Leave every setting as it is (Framework preset: **Other**, no build command) and click **Deploy**.

Every new push to GitHub redeploys the site automatically.

## Replace the images

The images in `images/` are drawn placeholders. To use real photos:

1. Put your photo in the `images/` folder. JPG or WebP, about **1600px wide** and under **300 KB** is a good target (use [squoosh.app](https://squoosh.app) to shrink them).
2. In `index.html`, find the `<img>` tag and change `src`. Also update `alt` so it describes the photo (screen readers and Google use it).

| Image | Where it's used | Shape |
|---|---|---|
| `hero.svg` | Top of the page | Landscape, roughly 4:3 or 16:10 |
| `about.svg` | Next to the brand story | Portrait, 4:5 |
| `model-*.svg` | The six gallery cards | Portrait, 4:5 |
| `og-image.png` | Preview card when the link is shared | Exactly 1200 × 630 |
| `favicon.svg` | Browser tab icon | Square |

Photos are cropped automatically to fill their box, so they don't need the exact shape. Just keep the sunglasses near the centre.

Example: to swap the first gallery model for `marea.jpg`:

```html
<img src="images/marea.jpg" alt="Marea, round black sunglasses on a stone wall"
     width="800" height="1000" loading="lazy" decoding="async">
```

`width` and `height` only tell the browser the shape so the page doesn't jump while loading. Set them to your photo's real size if you like.

## Replace the text

All text is in `index.html`. Each section starts with a comment like `<!-- ===== 2. ABOUT ===== -->` so you can find it.

- **Brand story:** the two paragraphs marked `[EDIT ME]`. Remove the `[EDIT ME]` tag when you're done.
- **Gallery:** each model is one `<li class="gallery-item">` block. Change the name (`<h3>`) and description (`<p>`). To add or remove a model, copy or delete a whole `<li>...</li>` block; the lightbox picks it up automatically.
- **Footer:** replace the Instagram link and `hello@example.com`.
- **Launch date:** search for "spring 2027".
- **Search & sharing text:** the `<title>`, `description` and `og:` tags at the top of `index.html`. Replace `https://elensunglasses.com` with your real domain, or the share preview image won't load.

## Change colours and fonts

Open `style.css`. The first block (`:root`) holds every colour and both font names. Change a value there and it updates everywhere. The accent colour is `--color-accent`.

To use different fonts, pick them on [Google Fonts](https://fonts.google.com), replace the `<link href="https://fonts.googleapis.com/...">` line in `index.html`, then update `--font-serif` and `--font-sans`.

## Connect the signup form

Right now the form only shows a thank-you message and doesn't save anything. Open `script.js` and look for **CONNECT YOUR EMAIL SERVICE HERE**. There are step-by-step notes for Formspree (easiest, free tier available) and Mailchimp.

GDPR reminder: whichever service you use, keep the consent checkbox, and make sure the unsubscribe and deletion promise in the footer is true for that service.
