/* =========================================================
   Elen Sunglasses — shop logic
   1. Checkout settings  <-- the part you are most likely to edit
   2. Helpers
   3. Product grid, filters and sorting
   4. Product quick view
   5. Shopping bag
   6. Checkout
   7. Newsletter form
   8. Fade-in on scroll and footer year
   ========================================================= */


/* ---------- 1. CHECKOUT SETTINGS ----------
   mode can be:
     'demo'    nothing is charged; the bag just shows a message (safe default)
     'stripe'  sends the bag to Stripe Checkout through api/checkout.js
               (needs STRIPE_SECRET_KEY set in Vercel, see README)
     'shopify' sends the bag to your Shopify store's checkout
               (needs shopifyDomain below and shopifyVariantId on each product) */
const CHECKOUT = {
  mode: 'demo',
  shopifyDomain: 'your-store.myshopify.com'
};


/* ---------- 2. Helpers ---------- */

// Formats 340 as "€340"
const euro = new Intl.NumberFormat('en-IE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0
});

function findProduct(id) {
  return PRODUCTS.find((product) => product.id === id);
}

// Local placeholder used if a product photo fails to load
function fallbackImage(product) {
  return 'images/model-' + product.id + '.svg';
}

// Shows a short message at the bottom of the screen
const toast = document.getElementById('toast');
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2500);
}


/* ---------- 3. Product grid, filters and sorting ---------- */
const grid = document.getElementById('product-grid');
const sortSelect = document.getElementById('sort');
const filterButtons = document.querySelectorAll('.filter');
let currentFilter = 'all';

function renderProducts() {
  // Filter
  let list = PRODUCTS.filter((p) => currentFilter === 'all' || p.material === currentFilter);

  // Sort (copy first so the original order in products.js stays "Featured")
  list = list.slice();
  if (sortSelect.value === 'price-asc') list.sort((a, b) => a.price - b.price);
  if (sortSelect.value === 'price-desc') list.sort((a, b) => b.price - a.price);

  // Build the HTML for each card
  grid.innerHTML = list.map((p) => `
    <li class="product-card">
      <button class="product-media" type="button" data-view="${p.id}" aria-label="View details: ${p.name}">
        <img src="${p.image}" alt="${p.imageAlt}" width="800" height="1000"
             loading="lazy" decoding="async"
             onerror="this.onerror=null;this.src='${fallbackImage(p)}'">
      </button>
      <div class="product-info">
        <div>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-colour">${p.colour}</p>
        </div>
        <p class="product-price">${euro.format(p.price)}</p>
      </div>
      <p class="product-short">${p.short}</p>
      <button class="btn btn-outline btn-small" type="button" data-add="${p.id}">Add to bag</button>
    </li>
  `).join('');
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((b) => {
      b.classList.toggle('is-active', b === button);
      b.setAttribute('aria-pressed', b === button ? 'true' : 'false');
    });
    renderProducts();
  });
});

sortSelect.addEventListener('change', renderProducts);

// One click handler for all cards (works for cards added later too)
grid.addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-view]');
  const addButton = event.target.closest('[data-add]');
  if (viewButton) openQuickView(viewButton.dataset.view);
  if (addButton) addToBag(addButton.dataset.add);
});


/* ---------- 4. Product quick view ---------- */
const quickview = document.getElementById('quickview');
const qvImg = document.getElementById('qv-img');
let quickviewId = null;

function openQuickView(id) {
  const p = findProduct(id);
  quickviewId = id;

  qvImg.onerror = () => { qvImg.onerror = null; qvImg.src = fallbackImage(p); };
  qvImg.src = p.image;
  qvImg.alt = p.imageAlt;
  document.getElementById('qv-colour').textContent = p.colour;
  document.getElementById('qv-name').textContent = p.name;
  document.getElementById('qv-price').textContent = euro.format(p.price) + ' incl. VAT';
  document.getElementById('qv-desc').textContent = p.description;
  document.getElementById('qv-details').innerHTML = p.details.map((d) => `<li>${d}</li>`).join('');

  quickview.showModal();
}

document.getElementById('qv-add').addEventListener('click', () => {
  addToBag(quickviewId);
  quickview.close();
});


/* ---------- 5. Shopping bag ----------
   The bag is a list like [{ id: 'sola', qty: 1 }]. It's saved in the
   browser (localStorage) so it survives a page reload. */
const bagDialog = document.getElementById('bag');
const bagItems = document.getElementById('bag-items');
const bagMessage = document.getElementById('bag-message');
const BAG_KEY = 'elen-bag';
const MAX_QTY = 10; // keep in sync with the limit in api/checkout.js
let bag = loadBag();

function loadBag() {
  try {
    const saved = JSON.parse(localStorage.getItem(BAG_KEY)) || [];
    // Drop anything that's no longer in products.js
    return saved.filter((item) => findProduct(item.id) && item.qty > 0);
  } catch (error) {
    return []; // private mode or storage blocked: start with an empty bag
  }
}

function saveBag() {
  try { localStorage.setItem(BAG_KEY, JSON.stringify(bag)); } catch (error) { /* ignore */ }
}

function addToBag(id) {
  const item = bag.find((i) => i.id === id);
  if (item && item.qty >= MAX_QTY) {
    showToast('You can order up to ' + MAX_QTY + ' of each frame online. Email us for more.');
    return;
  }
  if (item) item.qty += 1;
  else bag.push({ id: id, qty: 1 });
  saveBag();
  renderBag();
  showToast(findProduct(id).name + ' added to your bag');
}

function changeQty(id, change) {
  const item = bag.find((i) => i.id === id);
  if (!item) return;
  item.qty = Math.min(item.qty + change, MAX_QTY);
  if (item.qty <= 0) bag = bag.filter((i) => i.id !== id);
  saveBag();
  renderBag();
}

function renderBag() {
  const count = bag.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = bag.reduce((sum, item) => sum + findProduct(item.id).price * item.qty, 0);

  document.getElementById('bag-count').textContent = count;
  document.getElementById('bag-subtotal').textContent = euro.format(subtotal);
  document.getElementById('bag-empty').hidden = count > 0;
  document.getElementById('bag-foot').hidden = count === 0;
  bagMessage.textContent = '';

  bagItems.innerHTML = bag.map((item) => {
    const p = findProduct(item.id);
    return `
      <li class="bag-item">
        <img src="${p.image}" alt="" width="80" height="100"
             onerror="this.onerror=null;this.src='${fallbackImage(p)}'">
        <div class="bag-item-text">
          <p class="bag-item-name">${p.name}</p>
          <p class="bag-item-colour">${p.colour}</p>
          <div class="qty">
            <button type="button" data-qty="-1" data-id="${p.id}" aria-label="One less ${p.name}">&minus;</button>
            <span aria-label="Quantity">${item.qty}</span>
            <button type="button" data-qty="1" data-id="${p.id}" aria-label="One more ${p.name}">+</button>
          </div>
        </div>
        <p class="bag-item-price">${euro.format(p.price * item.qty)}</p>
      </li>`;
  }).join('');
}

bagItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-qty]');
  if (button) changeQty(button.dataset.id, Number(button.dataset.qty));
});

document.getElementById('bag-open').addEventListener('click', () => bagDialog.showModal());

// Close buttons and clicking the dark area outside close any dialog
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});


/* ---------- 6. Checkout ---------- */
const checkoutButton = document.getElementById('checkout-button');

checkoutButton.addEventListener('click', async () => {
  if (bag.length === 0) return;

  if (CHECKOUT.mode === 'demo') {
    bagMessage.textContent = 'Checkout isn\'t connected yet. See the README to connect Stripe or Shopify.';
    return;
  }

  if (CHECKOUT.mode === 'shopify') {
    // Shopify "cart permalink": your-store.myshopify.com/cart/VARIANT:QTY,VARIANT:QTY
    const missing = bag.find((item) => !findProduct(item.id).shopifyVariantId);
    if (missing) {
      bagMessage.textContent = 'Missing shopifyVariantId for ' + findProduct(missing.id).name + ' in products.js.';
      return;
    }
    const parts = bag.map((item) => findProduct(item.id).shopifyVariantId + ':' + item.qty);
    window.location.href = 'https://' + CHECKOUT.shopifyDomain + '/cart/' + parts.join(',');
    return;
  }

  if (CHECKOUT.mode === 'stripe') {
    checkoutButton.disabled = true;
    checkoutButton.textContent = 'One moment…';
    try {
      // Only ids and quantities are sent. Prices are looked up on the server.
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: bag })
      });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url; // go to Stripe's payment page
    } catch (error) {
      bagMessage.textContent = 'Sorry, checkout didn\'t open. Please try again in a minute.';
      checkoutButton.disabled = false;
      checkoutButton.textContent = 'Checkout';
    }
  }
});

// After paying, Stripe sends people back to /?checkout=success
const checkoutResult = new URLSearchParams(window.location.search).get('checkout');
if (checkoutResult === 'success') {
  bag = [];
  saveBag();
  showToast('Thank you! Your order is confirmed. A receipt is on its way by email.');
}
if (checkoutResult) {
  // Clean the address bar so a reload doesn't repeat the message
  history.replaceState(null, '', window.location.pathname);
}


/* ---------- 7. Newsletter form ---------- */
const form = document.getElementById('notify-form');
const emailInput = document.getElementById('email');
const consentInput = document.getElementById('consent');
const emailError = document.getElementById('email-error');
const consentError = document.getElementById('consent-error');
const successBox = document.getElementById('form-success');

// Simple, sensible email check: something@something.something
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function setError(input, errorEl, message) {
  errorEl.textContent = message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

emailInput.addEventListener('input', () => {
  if (isValidEmail(emailInput.value)) setError(emailInput, emailError, '');
});
consentInput.addEventListener('change', () => {
  if (consentInput.checked) setError(consentInput, consentError, '');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  let valid = true;
  if (!emailInput.value.trim()) {
    setError(emailInput, emailError, 'Please add your email address.');
    valid = false;
  } else if (!isValidEmail(emailInput.value)) {
    setError(emailInput, emailError, "That email doesn't look quite right. Mind checking it?");
    valid = false;
  } else {
    setError(emailInput, emailError, '');
  }

  if (!consentInput.checked) {
    setError(consentInput, consentError, 'Please tick the box so we are allowed to email you.');
    valid = false;
  } else {
    setError(consentInput, consentError, '');
  }

  if (!valid) {
    form.querySelector('[aria-invalid="true"]').focus();
    return;
  }

  /* ===== CONNECT YOUR EMAIL SERVICE HERE =====
     Right now nothing is sent anywhere: the thank-you message just appears.

     --- Option A: Formspree (easiest) ---
     Create a form at https://formspree.io, then uncomment this and replace YOUR_FORM_ID:

     try {
       const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
         method: 'POST',
         headers: { 'Accept': 'application/json' },
         body: new FormData(form),
       });
       if (!response.ok) throw new Error('Request failed');
     } catch (error) {
       setError(emailInput, emailError, 'Something went wrong. Please try again in a minute.');
       return;
     }

     --- Option B: Mailchimp ---
     In Mailchimp: Audience > Signup forms > Embedded forms, copy the form "action" URL,
     put it in <form action="..."> in index.html, rename the inputs to EMAIL and FNAME,
     and delete the event.preventDefault() line above so the browser posts to Mailchimp.
  */

  form.hidden = true;
  successBox.hidden = false;
  successBox.focus();
});


/* ---------- 8. Fade-in on scroll and footer year ---------- */
const fadeEls = document.querySelectorAll('.fade-in');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  fadeEls.forEach((el) => observer.observe(el));
} else {
  fadeEls.forEach((el) => el.classList.add('is-visible'));
}

document.getElementById('year').textContent = new Date().getFullYear();


/* ---------- Start ---------- */
renderProducts();
renderBag();
