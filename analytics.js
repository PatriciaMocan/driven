/* =========================================================
   Elen Sunglasses — ANALYTICS
   Google Analytics 4, PostHog, Hotjar și Microsoft Clarity,
   pornite DOAR după ce vizitatorul apasă „Accept” în bannerul de cookie-uri.

   1. SETĂRI  <-- aici pui ID-urile (un câmp gol = serviciul e oprit)
   2. Consimțământ (salvat în browser, banner, link „Setări cookie”)
   3. Încărcarea serviciilor
   4. Elen.track(): un singur apel trimite evenimentul la toate serviciile

   Fără niciun ID completat, nu se încarcă nimic și nu apare niciun banner.
   Evenimentele trimise de script.js sunt descrise în README („Analytics”).
   ========================================================= */


/* ---------- 1. SETĂRI ---------- */
const ANALYTICS = {
  // Google Analytics 4: Admin → Data streams → Measurement ID (G-XXXXXXXXXX)
  ga4: '',

  // PostHog: Project settings → Project API key (phc_...). Proiect în UE: lasă host-ul de mai jos.
  posthog: { key: '', host: 'https://eu.i.posthog.com' },

  // Hotjar: Sites & Organizations → Site ID (un număr, ex. 5123456)
  hotjar: '',

  // Microsoft Clarity: Settings → Overview → Project ID (ex. abcd1234ef)
  clarity: '',

  // Schimbă versiunea când adaugi un serviciu nou, ca toată lumea să fie întrebată din nou
  versiuneConsimtamant: 1
};


/* ---------- 2. Consimțământ ---------- */
(function () {
  const CHEIE = 'elen-consimtamant';
  const activ = Boolean(ANALYTICS.ga4 || ANALYTICS.posthog.key || ANALYTICS.hotjar || ANALYTICS.clarity);
  let pornit = false;

  function citeste() {
    try {
      const salvat = JSON.parse(localStorage.getItem(CHEIE));
      return salvat && salvat.v === ANALYTICS.versiuneConsimtamant ? salvat.analytics : null;
    } catch (e) { return null; }
  }

  function scrie(accept) {
    try {
      localStorage.setItem(CHEIE, JSON.stringify({ v: ANALYTICS.versiuneConsimtamant, analytics: accept, data: new Date().toISOString() }));
    } catch (e) { /* modul privat: întrebăm din nou la următoarea vizită */ }
  }

  // Cookie-urile lăsate de servicii, șterse când cineva își retrage acordul
  function stergeCookieuri() {
    const prefixe = ['_ga', '_gid', '_hj', '_clck', '_clsk', 'ph_'];
    const domenii = ['', location.hostname, '.' + location.hostname.replace(/^www\./, '')];
    document.cookie.split(';').forEach((c) => {
      const nume = c.split('=')[0].trim();
      if (!prefixe.some((p) => nume.startsWith(p))) return;
      domenii.forEach((d) => {
        document.cookie = nume + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
    try {
      Object.keys(localStorage).forEach((k) => { if (k.startsWith('ph_') || k.startsWith('_hj')) localStorage.removeItem(k); });
    } catch (e) { /* ignorăm */ }
  }

  // Google Consent Mode v2: totul refuzat până la „Accept”
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  /* ---------- 3. Încărcarea serviciilor ---------- */
  function adaugaScript(src) {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function pornesteServicii() {
    if (pornit) return;
    pornit = true;

    if (ANALYTICS.ga4) {
      // Doar statistici; nu folosim reclame, deci ad_* rămân refuzate
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
      window.gtag('js', new Date());
      window.gtag('config', ANALYTICS.ga4);
      adaugaScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ANALYTICS.ga4));
    }

    if (ANALYTICS.posthog.key) {
      // Fragmentul oficial PostHog: pune apelurile în coadă până se încarcă biblioteca
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      window.posthog.init(ANALYTICS.posthog.key, {
        api_host: ANALYTICS.posthog.host,
        person_profiles: 'identified_only',
        session_recording: { maskAllInputs: true }
      });
    }

    if (ANALYTICS.hotjar) {
      window.hj = window.hj || function () { (window.hj.q = window.hj.q || []).push(arguments); };
      window._hjSettings = { hjid: Number(ANALYTICS.hotjar), hjsv: 6 };
      adaugaScript('https://static.hotjar.com/c/hotjar-' + window._hjSettings.hjid + '.js?sv=' + window._hjSettings.hjsv);
    }

    if (ANALYTICS.clarity) {
      window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
      adaugaScript('https://www.clarity.ms/tag/' + encodeURIComponent(ANALYTICS.clarity));
      window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    }
  }

  /* ---------- Bannerul ---------- */
  let banner;

  function ascundeBanner() {
    if (banner) banner.hidden = true;
  }

  function alege(accept) {
    const aveaAcord = citeste() === true;
    scrie(accept);
    ascundeBanner();
    if (accept) {
      pornesteServicii();
    } else if (aveaAcord || pornit) {
      // Serviciile deja pornite nu se pot opri din pagină: ștergem urmele și reîncărcăm
      stergeCookieuri();
      location.reload();
    }
  }

  function arataBanner() {
    if (!banner) {
      banner = document.createElement('section');
      banner.className = 'cookie-banner';
      banner.setAttribute('aria-label', 'Cookie-uri');
      banner.innerHTML = `
        <p>Folosim cookie-uri de analiză (Google Analytics, PostHog, Hotjar, Clarity) ca să vedem cum e folosit site-ul și să-l facem mai bun.
          Le pornim doar dacă ești de acord. Câmpurile din formulare nu sunt înregistrate.</p>
        <div class="cookie-actions">
          <button type="button" class="btn btn-outline btn-small" data-cookie="refuz">Refuz</button>
          <button type="button" class="btn btn-primary btn-small" data-cookie="accept">Accept</button>
        </div>`;
      banner.addEventListener('click', (event) => {
        const b = event.target.closest('[data-cookie]');
        if (b) alege(b.dataset.cookie === 'accept');
      });
      document.body.appendChild(banner);
    }
    banner.hidden = false;
    banner.querySelector('[data-cookie="accept"]').focus({ preventScroll: true });
  }

  function initializeaza() {
    // Linkul „Setări cookie” din subsol redeschide bannerul
    document.querySelectorAll('[data-cookie-settings]').forEach((el) => {
      (el.closest('li') || el).hidden = !activ;
      el.addEventListener('click', (event) => { event.preventDefault(); arataBanner(); });
    });
    if (activ && citeste() === null) arataBanner();
  }

  if (activ && citeste() === true) pornesteServicii();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeaza);
  else initializeaza();


  /* ---------- 4. Elen.track() ----------
     Elen.track('add_to_cart', { currency: 'RON', value: 1520, items: [...] })
     Numele evenimentelor urmează standardul GA4 (view_item, add_to_cart, purchase...).
     Hotjar și Clarity primesc doar numele, pentru filtrarea înregistrărilor. */
  window.Elen = window.Elen || {};
  window.Elen.track = function (eveniment, date) {
    if (!pornit) return;
    date = date || {};
    try {
      if (ANALYTICS.ga4) window.gtag('event', eveniment, date);
      if (ANALYTICS.posthog.key) window.posthog.capture(eveniment, date);
      if (ANALYTICS.hotjar) window.hj('event', eveniment);
      if (ANALYTICS.clarity) window.clarity('event', eveniment);
    } catch (e) { /* analytics nu are voie să strice magazinul */ }
  };
})();
