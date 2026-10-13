/* =========================================================
   Elen Sunglasses — small bits of interactivity
   1. Fade-in on scroll
   2. Gallery lightbox
   3. Notify-me form (validation + thank-you message)
   4. Current year in the footer
   ========================================================= */

/* ---------- 1. Fade-in on scroll ----------
   Any element with class="fade-in" fades in when it scrolls into view. */
const fadeEls = document.querySelectorAll('.fade-in');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // animate only once
      }
    });
  }, { threshold: 0.15 });

  fadeEls.forEach((el) => observer.observe(el));
} else {
  // Very old browsers: just show everything
  fadeEls.forEach((el) => el.classList.add('is-visible'));
}


/* ---------- 2. Gallery lightbox ---------- */
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
let currentIndex = 0;

// Show the model at position `index` inside the lightbox
function showInLightbox(index) {
  // Wrap around: after the last model comes the first again
  currentIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[currentIndex];
  const img = item.querySelector('img');

  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  lightboxCaption.textContent = item.querySelector('.model-name').textContent;
}

galleryItems.forEach((item, index) => {
  item.querySelector('.gallery-button').addEventListener('click', () => {
    showInLightbox(index);
    lightbox.showModal();
  });
});

lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.querySelector('.lightbox-prev').addEventListener('click', () => showInLightbox(currentIndex - 1));
lightbox.querySelector('.lightbox-next').addEventListener('click', () => showInLightbox(currentIndex + 1));

// Close when clicking the empty area around the image
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.close();
});

// Arrow keys switch models (Escape closes the dialog automatically)
lightbox.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') showInLightbox(currentIndex - 1);
  if (event.key === 'ArrowRight') showInLightbox(currentIndex + 1);
});


/* ---------- 3. Notify-me form ---------- */
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

// Show or clear an error message under a field
function setError(input, errorEl, message) {
  errorEl.textContent = message;
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

// Clear an error as soon as the person fixes it
emailInput.addEventListener('input', () => {
  if (isValidEmail(emailInput.value)) setError(emailInput, emailError, '');
});
consentInput.addEventListener('change', () => {
  if (consentInput.checked) setError(consentInput, consentError, '');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault(); // stop the page from reloading

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
    // Put the cursor in the first field that needs fixing
    form.querySelector('[aria-invalid="true"]').focus();
    return;
  }

  /* ===== CONNECT YOUR EMAIL SERVICE HERE =====
     Right now nothing is sent anywhere: the thank-you message just appears.
     To actually collect emails, uncomment ONE of the options below.

     --- Option A: Formspree (easiest) ---
     1. Create a free form at https://formspree.io and copy its ID.
     2. Uncomment this block and replace YOUR_FORM_ID.

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
     In Mailchimp go to Audience > Signup forms > Embedded forms and copy the
     "action" URL. The simplest route is to put that URL in the <form action="...">
     attribute in index.html, rename the inputs to EMAIL and FNAME, and remove
     the event.preventDefault() line above, so the browser posts to Mailchimp.
     (Mailchimp doesn't allow fetch() from the browser.)
  */

  // Hide the form and show the thank-you message
  form.hidden = true;
  successBox.hidden = false;
  successBox.focus(); // so screen readers announce it
});


/* ---------- 4. Footer year ---------- */
document.getElementById('year').textContent = new Date().getFullYear();
