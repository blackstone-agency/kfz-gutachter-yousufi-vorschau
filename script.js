/* ==========================================================================
   KFZ-Sachverständigenbüro Yousufi — Interactions
   Nav shrink, mobile menu morph, scroll reveal, counters, accordion,
   magnetic buttons. Vanilla JS, no dependencies.
   ========================================================================== */

/* Progressive Enhancement: Scroll-Reveal-Styles greifen nur mit JS.
   (Klassisches Script am Body-Ende → läuft vor dem ersten Paint.) */
document.documentElement.classList.add('js');

/* Gespeichertes Theme vor dem ersten Paint anwenden (kein Flackern) */
try { if (localStorage.getItem('yousufi-theme') === 'light') document.documentElement.classList.add('theme-light'); } catch (e) { /* ok */ }

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
  /* ---- Year in footer -------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  /* ---- Nav: glass on scroll ------------------------------------------- */
  const nav = document.getElementById('nav-pill');
  const onScroll = () => {
    if (!nav) return;
    nav.classList.toggle('nav-scrolled', window.scrollY > 40);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Mobile menu ---------------------------------------------------- */
  const burger = document.getElementById('burger');
  const overlay = document.getElementById('menu-overlay');
  const toggleMenu = (open) => {
    if (!burger || !overlay) return;
    burger.classList.toggle('active', open);
    burger.setAttribute('aria-expanded', String(open));
    overlay.classList.toggle('menu-open', open);
    overlay.classList.toggle('opacity-0', !open);
    overlay.classList.toggle('invisible', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  if (burger) burger.addEventListener('click', () => toggleMenu(!burger.classList.contains('active')));
  overlay?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));

  /* ---- Scroll reveal via IntersectionObserver ------------------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => {
    // Bereits über dem Viewport (Anker-Sprung, Scroll-Restore): sofort zeigen
    if (el.getBoundingClientRect().bottom < 0) { el.classList.add('in'); return; }
    io.observe(el);
  });

  /* ---- Animated counters ----------------------------------------------
     Im HTML steht der Endwert (ohne JS korrekt lesbar); mit JS wird vor dem
     ersten Paint auf 0 gesetzt und beim Einscrollen hochgezählt. */
  const counters = document.querySelectorAll('[data-count]');
  if (!REDUCED_MOTION) {
    counters.forEach(el => { el.textContent = '0'; });
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const dur = 1600;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = target % 1 === 0 ? Math.round(target * eased) : (target * eased).toFixed(1);
          el.textContent = val + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        cio.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(c => cio.observe(c));
  }

  /* ---- Accordion ------------------------------------------------------ */
  document.querySelectorAll('.acc-item').forEach(item => {
    const head = item.querySelector('.acc-head');
    head?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.acc-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.acc-head')?.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        head.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---- Magnetic buttons (desktop only) -------------------------------- */
  if (window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.3}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });

    /* ---- Cursor-Spotlight auf allen Karten ------------------------------ */
    document.querySelectorAll('.bezel').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  /* ---- Scroll-Effekte: Parallax-Variable, Velocity-Marquee, Smart-Nav --- */
  const header = document.querySelector('body > header');
  let lastY = window.scrollY;
  let mqsReset = 0;
  const onScrollFx = () => {
    const y = window.scrollY;

    if (!REDUCED_MOTION) {
      // Parallax-Basiswert für CSS (Blueprint, Watermarks, Scroll-Cue)
      document.documentElement.style.setProperty('--scy', y.toFixed(0));

      // Marquee kippt mit der Scroll-Geschwindigkeit, federt danach zurück
      const vel = Math.max(-8, Math.min(8, (y - lastY) * 0.28));
      document.documentElement.style.setProperty('--mqs', vel.toFixed(2));
      clearTimeout(mqsReset);
      mqsReset = setTimeout(() => document.documentElement.style.setProperty('--mqs', '0'), 140);
    }

    // Smart-Nav: beim Runterscrollen abtauchen, beim Hochscrollen auftauchen
    if (header && !document.getElementById('burger')?.classList.contains('active')) {
      if (y > 160 && y > lastY + 4) header.classList.add('nav-hidden');
      else if (y < lastY - 4 || y <= 160) header.classList.remove('nav-hidden');
    }

    lastY = y;
  };
  window.addEventListener('scroll', onScrollFx, { passive: true });
  onScrollFx();

  /* ---- Ablauf-Seite: Scrollspy auf der Timeline ------------------------- */
  const tlLine = document.querySelector('.tl-draw');
  if (tlLine) {
    const steps = document.querySelectorAll('.tl-draw ~ div');
    steps.forEach(s => s.classList.add('tl-step'));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => e.target.classList.toggle('tl-active', e.isIntersecting));
    }, { rootMargin: '-38% 0px -38% 0px' });
    steps.forEach(s => spy.observe(s));
  }

  /* ---- Skip-Link + Main-Landmark (site-wide, a11y) --------------------- */
  if (!document.querySelector('.skip-link')) {
    let target = document.querySelector('main') || document.querySelector('section');
    if (target) {
      if (!target.id) target.id = 'main';
      const skip = document.createElement('a');
      skip.href = '#' + target.id;
      skip.className = 'skip-link';
      skip.textContent = 'Zum Inhalt springen';
      document.body.prepend(skip);
    }
  }

  /* ---- Sticky Action-Bar auf Mobile (site-wide) ------------------------ */
  const WA_NUMBER = '4917684718552';
  if (!document.querySelector('.action-bar')) {
    const bar = document.createElement('nav');
    bar.className = 'action-bar';
    bar.setAttribute('aria-label', 'Schnellkontakt');
    bar.innerHTML =
      '<a class="ab-call" href="tel:+4917684718552">' +
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.6a2 2 0 01-.5 2.1L8 9.6a16 16 0 006 6l1.2-1.2a2 2 0 012.1-.5c.8.3 1.7.5 2.6.6a2 2 0 011.7 2z"/></svg>Anrufen</a>' +
      '<a class="ab-wa" href="https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('Hallo, ich möchte ein KFZ-Gutachten anfragen.') + '" target="_blank" rel="noopener">' +
      '<svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>WhatsApp</a>';
    document.body.appendChild(bar);
  }

  // Solange die großen Anruf-/WhatsApp-Buttons im Einstieg sichtbar sind, tritt die
  // Leiste zurück (keine doppelten Buttons im ersten Bildschirm); danach übernimmt sie.
  const heroCta = document.querySelector('[data-hero-cta]');
  const actionBar = document.querySelector('.action-bar');
  if (heroCta && actionBar && 'IntersectionObserver' in window) {
    actionBar.classList.add('ab-away');
    actionBar.inert = true;
    new IntersectionObserver(([entry]) => {
      actionBar.classList.toggle('ab-away', entry.isIntersecting);
      actionBar.inert = entry.isIntersecting;
    }).observe(heroCta);
  }

  /* ---- Floating WhatsApp button (site-wide) --------------------------- */
  if (!document.querySelector('.wa-float')) {
    const wa = document.createElement('a');
    wa.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent('Hallo, ich möchte ein KFZ-Gutachten anfragen.');
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.className = 'wa-float';
    wa.setAttribute('aria-label', 'Per WhatsApp kontaktieren');
    wa.innerHTML = '<svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/></svg>';
    document.body.appendChild(wa);
  }

  /* ---- Contact form → WhatsApp (no backend needed) -------------------- */
  const waForm = document.querySelector('form[data-wa]');
  if (waForm) {
    waForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const g = (n) => (waForm.querySelector('[name="' + n + '"]')?.value || '').trim();
      const lines = [
        'Neue Gutachten-Anfrage',
        '',
        'Name: ' + g('name'),
        'Telefon: ' + g('telefon'),
        'E-Mail: ' + g('email'),
        'Art des Schadens: ' + g('art'),
        '',
        'Nachricht: ' + g('nachricht'),
      ];
      window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n')), '_blank');

      // Sichtbares Feedback am Absende-Button
      const submitBtn = waForm.querySelector('[type="submit"]');
      if (submitBtn && !submitBtn.dataset.sent) {
        submitBtn.dataset.sent = '1';
        const original = submitBtn.firstChild.textContent;
        submitBtn.firstChild.textContent = T('WhatsApp geöffnet ✓') + ' ';
        submitBtn.classList.add('btn-sent');
        setTimeout(() => {
          submitBtn.firstChild.textContent = original;
          submitBtn.classList.remove('btn-sent');
          delete submitBtn.dataset.sent;
        }, 2600);
      }
    });
  }

  /* ---- Schadenakte: klickbare Schadenspunkte im Hero (nur Startseite) --- */
  const dmgPanel = document.getElementById('dmg-panel');
  if (dmgPanel) {
    const title = document.getElementById('dmg-title');
    const sub = document.getElementById('dmg-sub');
    const cost = document.getElementById('dmg-cost');
    const act = document.getElementById('dmg-act');
    const doc = document.getElementById('dmg-doc');
    const fmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let activeBtn = null;
    let costRaf = 0;

    const close = () => {
      if (!activeBtn) return;
      activeBtn.classList.remove('active');
      activeBtn.setAttribute('aria-expanded', 'false');
      activeBtn = null;
      dmgPanel.classList.remove('open');
      setTimeout(() => { if (!dmgPanel.classList.contains('open')) dmgPanel.hidden = true; }, 480);
    };

    const open = (btn) => {
      if (activeBtn) { activeBtn.classList.remove('active'); activeBtn.setAttribute('aria-expanded', 'false'); }
      activeBtn = btn;
      btn.classList.add('active');
      btn.setAttribute('aria-expanded', 'true');
      title.textContent = T(btn.dataset.title);
      sub.textContent = T(btn.dataset.sub);
      act.textContent = T(btn.dataset.act);
      doc.textContent = T(btn.dataset.doc);
      dmgPanel.hidden = false;
      void dmgPanel.offsetHeight; // Reflow erzwingen, damit die Transition greift
      dmgPanel.classList.add('open');
      cancelAnimationFrame(costRaf);
      const target = parseFloat(btn.dataset.costNum);
      if (REDUCED_MOTION) {
        cost.textContent = fmt.format(target) + ' €';
      } else {
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / 650, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          cost.textContent = fmt.format(target * eased) + ' €';
          if (p < 1) costRaf = requestAnimationFrame(tick);
        };
        costRaf = requestAnimationFrame(tick);
        // Fallback: Endwert garantiert setzen (falls rAF gedrosselt wird)
        setTimeout(() => { cost.textContent = fmt.format(target) + ' €'; }, 750);
      }
    };

    document.querySelectorAll('.dmg').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (activeBtn === btn) { close(); } else { open(btn); }
      });
    });
    document.getElementById('dmg-close')?.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    document.addEventListener('click', (e) => { if (activeBtn && !e.target.closest('.dmg-panel')) close(); });
  }

  /* ---- 3D-Tilt auf Karten (nur Geräte mit Maus) ------------------------- */
  if (window.matchMedia('(pointer:fine)').matches && !REDUCED_MOTION) {
    document.querySelectorAll('.tilt-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (px * 5).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-py * 4).toFixed(2) + 'deg');
      });
      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---- Scroll-Progress + Nach-oben-Button (site-wide, Desktop) ---------- */
  if (!document.querySelector('.to-top')) {
    const top = document.createElement('button');
    top.type = 'button';
    top.className = 'to-top';
    top.setAttribute('aria-label', 'Nach oben scrollen');
    top.innerHTML =
      '<svg class="ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="prog" cx="22" cy="22" r="19" pathLength="100"/></svg>' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(top);
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      top.style.setProperty('--p', max > 0 ? Math.min(100, (window.scrollY / max) * 100).toFixed(1) : 0);
      top.classList.toggle('show', window.scrollY > 600);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    top.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
      top.blur();
    });
  }

  /* ---- Theme-Umschalter hell/dunkel (site-wide) ------------------------- */
  const applyThemeMeta = () => {
    const light = document.documentElement.classList.contains('theme-light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#eef2f8' : '#0a1830');
  };
  applyThemeMeta();
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const light = document.documentElement.classList.toggle('theme-light');
      try { localStorage.setItem('yousufi-theme', light ? 'light' : 'dark'); } catch (e) { /* ok */ }
      applyThemeMeta();
      window.dispatchEvent(new Event('yousufi:theme'));
    });
  });

  /* ---- Cookie-/Consent-Hinweis (site-wide, localStorage) ---------------- */
  const CONSENT_KEY = 'yousufi-consent';
  let consentStored = null;
  try { consentStored = localStorage.getItem(CONSENT_KEY); } catch (e) { /* Storage blockiert → Hinweis einfach zeigen */ }
  if (!consentStored && !document.querySelector('.cookie-bar')) {
    const bar = document.createElement('div');
    bar.className = 'cookie-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Cookie-Hinweis');
    bar.innerHTML =
      '<div class="cookie-core">' +
      '<strong>Keine Tracking-Cookies.</strong> Diese Website kommt ohne Werbe- und Analyse-Cookies aus. ' +
      'Gespeichert wird nur technisch Notwendiges — etwa diese Auswahl. Details in der ' +
      '<a href="datenschutz.html">Datenschutzerklärung</a>.' +
      '<div class="cookie-actions">' +
      '<button type="button" class="cookie-accept">Alles klar</button>' +
      '<button type="button" class="cookie-essential">Nur notwendige</button>' +
      '</div></div>';
    document.body.appendChild(bar);
    bar.inert = true;
    const showBar = () => { bar.inert = false; bar.classList.add('show'); };
    // Startseite: Der Hinweis darf die Anruf-/WhatsApp-Buttons im Einstieg nicht verdecken.
    // Er erscheint erst, wenn diese aus dem Bild gescrollt sind (reiner Info-Hinweis, keine Einwilligung nötig).
    const ctaForCookie = document.querySelector('[data-hero-cta]');
    if (ctaForCookie && 'IntersectionObserver' in window) {
      const cookieIo = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) { showBar(); cookieIo.disconnect(); }
      });
      cookieIo.observe(ctaForCookie);
    } else {
      setTimeout(showBar, 900);
    }
    const decide = (value) => {
      try { localStorage.setItem(CONSENT_KEY, value); } catch (e) { /* ok */ }
      bar.classList.remove('show');
      setTimeout(() => bar.remove(), 600);
    };
    bar.querySelector('.cookie-accept').addEventListener('click', () => decide('all'));
    bar.querySelector('.cookie-essential').addEventListener('click', () => decide('essential'));
  }

  /* ---- Anspruchs-Check: Live-Summe (nur Startseite) --------------------- */
  const calcTotal = document.getElementById('calc-total');
  if (calcTotal) {
    const BASE = 4862.40; // Reparaturkosten, immer enthalten
    const fmtCalc = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const boxes = document.querySelectorAll('#anspruch input[type="checkbox"][data-val]');
    let shown = BASE;
    boxes.forEach(b => { if (b.checked) shown += parseFloat(b.dataset.val); });
    let calcRaf = 0;
    const setTotal = () => {
      let target = BASE;
      boxes.forEach(b => { if (b.checked) target += parseFloat(b.dataset.val); });
      cancelAnimationFrame(calcRaf);
      if (REDUCED_MOTION) {
        shown = target;
        calcTotal.textContent = fmtCalc.format(target) + ' €';
        return;
      }
      const from = shown;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / 450, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        shown = from + (target - from) * eased;
        calcTotal.textContent = fmtCalc.format(shown) + ' €';
        if (p < 1) calcRaf = requestAnimationFrame(tick);
      };
      calcRaf = requestAnimationFrame(tick);
      // Fallback: Endwert garantiert setzen (falls rAF gedrosselt wird)
      setTimeout(() => { if (Math.abs(shown - target) > 0.01) { shown = target; calcTotal.textContent = fmtCalc.format(target) + ' €'; } }, 550);
    };
    boxes.forEach(b => b.addEventListener('change', setTotal));
  }

  /* ---- Punkt-Navigation mit Scrollspy (nur Startseite, Desktop) --------- */
  if (document.getElementById('anspruch') && !document.querySelector('.dot-nav')) {
    const targets = [
      ['#kontakt-heading', 'Kontakt'],
      ['#profil-heading', 'Ihr Gutachter'],
      ['#leistungen-heading', 'Leistungen'],
      ['#ablauf-heading', 'Ablauf'],
      ['#warum-heading', 'Warum Yousufi'],
      ['#anspruch-heading', 'Anspruchs-Check'],
      ['#vergleich-heading', 'Der Unterschied'],
      ['#check-heading', 'Soforthilfe'],
      ['#faq-heading', 'FAQ'],
      ['#marke-heading', 'Unser Zeichen'],
    ].map(([sel, label]) => {
      const el = document.querySelector(sel);
      return el ? { section: el.closest('section'), anchor: el, label } : null;
    }).filter(Boolean);

    if (targets.length > 2) {
      const dotNav = document.createElement('nav');
      dotNav.className = 'dot-nav';
      dotNav.setAttribute('aria-label', 'Abschnitte');
      targets.forEach((t, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.dataset.label = t.label;
        dot.setAttribute('aria-label', 'Zum Abschnitt: ' + t.label);
        dot.addEventListener('click', () => t.anchor.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth' }));
        dotNav.appendChild(dot);
        t.dot = dot;
      });
      document.body.appendChild(dotNav);

      const spyNav = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          const t = targets.find(x => x.section === e.target);
          if (t && e.isIntersecting) {
            targets.forEach(x => x.dot.classList.remove('active'));
            t.dot.classList.add('active');
          }
        });
      }, { rootMargin: '-40% 0px -40% 0px' });
      targets.forEach(t => spyNav.observe(t.section));
    }
  }

  /* ---- Vergleich: Balken wachsen + Zahlen zählen beim Einscrollen ------- */
  const diff = document.getElementById('diff');
  if (diff) {
    const fmtDiff = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const vals = diff.querySelectorAll('[data-diff-to]');
    const runCount = () => {
      vals.forEach(el => {
        const target = parseFloat(el.dataset.diffTo);
        const plus = el.hasAttribute('data-diff-plus') ? '+' : '';
        if (REDUCED_MOTION) { el.textContent = plus + fmtDiff.format(target) + ' €'; return; }
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / 1400, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = plus + fmtDiff.format(target * eased) + ' €';
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        setTimeout(() => { el.textContent = plus + fmtDiff.format(target) + ' €'; }, 1500);
      });
    };
    const dio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { diff.classList.add('in'); runCount(); dio.disconnect(); }
      });
    }, { threshold: 0.4 });
    dio.observe(diff);
    // Hover auf eine Zusatzposition hebt den „Extra-Bereich“ des roten Balkens hervor
    diff.querySelectorAll('[data-diff-part]').forEach(chip => {
      chip.addEventListener('mouseenter', () => diff.classList.add('gap-on'));
      chip.addEventListener('mouseleave', () => diff.classList.remove('gap-on'));
    });
  }

  /* ---- Unfall-Checkliste: Fortschritt (nur Startseite) ------------------ */
  const chkList = document.getElementById('chk-list');
  if (chkList) {
    const boxes = chkList.querySelectorAll('input[type="checkbox"]');
    const count = document.getElementById('chk-count');
    const status = document.getElementById('chk-status');
    const card = document.getElementById('chk-card');
    const texts = [
      'Gehen Sie die Punkte durch — oder rufen Sie direkt an.',
      'Guter Anfang — weiter geht\'s.',
      'Sie machen das richtig.',
      'Halbzeit — dranbleiben.',
      'Fast geschafft.',
      'Nur noch ein Schritt.',
      'Alles erledigt — jetzt Schritt 6: der Anruf.',
    ];
    const update = () => {
      const n = [...boxes].filter(b => b.checked).length;
      count.textContent = n + '/6';
      status.textContent = T(texts[n]);
      card.style.setProperty('--p', ((n / 6) * 100).toFixed(1));
      card.classList.toggle('done', n === 6);
    };
    boxes.forEach(b => b.addEventListener('change', update));
    update();
  }

  /* ---- Logo-Partikel: Canvas-Bühne (nur Startseite, Desktop) ------------ */
  const stage = document.querySelector('[data-logo-particles]');
  if (stage && window.matchMedia('(pointer:fine)').matches && !REDUCED_MOTION) {
    const canvas = stage.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = 'assets/logo.svg?v=7';
    let parts = [];
    let rafId = 0;
    let running = false;
    let mx = -9999, my = -9999;
    let W = 0, H = 0;

    const build = () => {
      W = stage.clientWidth; H = stage.clientHeight;
      const DPR = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const lw = Math.min(W * 0.86, 620);
      const lh = lw * (315.1 / 616.3);
      const lx = (W - lw) / 2, ly = (H - lh) / 2;
      const lightTheme = document.documentElement.classList.contains('theme-light');
      const bodyColor = lightTheme ? 'rgba(18,37,74,0.9)' : 'rgba(255,255,255,0.92)';
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const octx = off.getContext('2d');
      octx.drawImage(img, lx, ly, lw, lh);
      const data = octx.getImageData(0, 0, W, H).data; // wirft bei file:// → catch
      parts = [];
      const STEP = 4;
      for (let y = 0; y < H; y += STEP) {
        for (let x = 0; x < W; x += STEP) {
          if (data[(y * W + x) * 4 + 3] > 140) {
            // Crash-Stern (oberer Mittelbereich) wird rot eingefärbt
            const star = x > lx + lw * 0.42 && x < lx + lw * 0.80 && y < ly + lh * 0.40;
            parts.push({
              hx: x, hy: y,
              x: W / 2 + (Math.random() - 0.5) * W * 1.3,
              y: H / 2 + (Math.random() - 0.5) * H * 1.8,
              vx: 0, vy: 0,
              c: star ? '#e63946' : bodyColor,
            });
          }
        }
      }
      stage.classList.add('active');
    };

    const frame = () => {
      ctx.clearRect(0, 0, W, H);
      const R = 80;
      for (const p of parts) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const f = ((R - d) / R) * 2.4;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        p.vx += (p.hx - p.x) * 0.06;
        p.vy += (p.hy - p.y) * 0.06;
        p.vx *= 0.84; p.vy *= 0.84;
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
      rafId = requestAnimationFrame(frame);
    };

    img.onload = () => {
      try { build(); } catch (e) { return; /* z. B. file://-Canvas-Taint → Fallback-Bild bleibt */ }
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
      });
      stage.addEventListener('pointerleave', () => { mx = my = -9999; });
      stage.addEventListener('click', () => {
        parts.forEach(p => { p.vx += (Math.random() - 0.5) * 28; p.vy += (Math.random() - 0.5) * 28; });
      });
      window.addEventListener('yousufi:theme', () => { try { build(); } catch (e) { /* ok */ } });
      const vis = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting && !running) { running = true; frame(); }
          else if (!en.isIntersecting && running) { running = false; cancelAnimationFrame(rafId); }
        });
      }, { threshold: 0.1 });
      vis.observe(stage);
      let rsT = 0;
      window.addEventListener('resize', () => {
        clearTimeout(rsT);
        rsT = setTimeout(() => { try { build(); } catch (e) { /* ok */ } }, 250);
      });
    };
  }
});

/* ==========================================================================
   i18n — Deutsch/Englisch
   Übersetzt per Text-Knoten-Wörterbuch (kein Markup nötig). Nicht erfasste
   Strings bleiben Deutsch. Rechtsseiten bleiben bewusst Deutsch.
   ========================================================================== */

const I18N_DICT = {
  // Chrome / Navigation
  'Start': 'Home', 'Leistungen': 'Services', 'Ablauf': 'Process', 'Über uns': 'About us', 'Kontakt': 'Contact',
  'Gutachten anfragen': 'Request an appraisal', 'Zum Inhalt springen': 'Skip to content', 'Anrufen': 'Call',
  'Navigation': 'Navigation', 'Impressum': 'Legal notice', 'Datenschutz': 'Privacy',
  'Ihr unabhängiges KFZ-Sachverständigenbüro für Unfallgutachten nach unverschuldetem Unfall.': 'Your independent vehicle assessment office for accident reports after not-at-fault accidents.',
  'KFZ-Sachverständigenbüro Yousufi. Alle Rechte vorbehalten.': 'KFZ-Sachverständigenbüro Yousufi. All rights reserved.',
  'WhatsApp: 0176 84718552': 'WhatsApp: 0176 84718552',
  'Vor-Ort-Service · Raum Nord': 'On-site service · Northern Germany',
  // Cookie
  'Keine Tracking-Cookies.': 'No tracking cookies.',
  'Diese Website kommt ohne Werbe- und Analyse-Cookies aus. Gespeichert wird nur technisch Notwendiges — etwa diese Auswahl. Details in der': 'This website works without advertising or analytics cookies. Only technically necessary data is stored — such as this choice. Details in the',
  'Datenschutzerklärung': 'privacy policy',
  'Alles klar': 'Got it', 'Nur notwendige': 'Essential only',
  // Einstieg (Unfall-Kontakt, ganz oben)
  'Kfz-Gutachter · 24/7 erreichbar': 'Vehicle assessor · available 24/7',
  'Keine Schuld?': 'Not your fault?',
  'Jetzt direkt Kontakt aufnehmen und Ihr unabhängiges Unfallgutachten erstellen lassen — die Kosten trägt die gegnerische Versicherung.': 'Get in touch now and have your independent accident report prepared — the opposing insurer covers the costs.',
  'Jetzt anrufen': 'Call now', 'Fotos direkt mitschicken': 'Send photos right away',
  'Kostenlos bei unverschuldetem Unfall': 'Free after a not-at-fault accident', 'Termin meist binnen 24 h': 'Appointment usually within 24 h',
  // Profil (ehemaliger Hero)
  'Spezialisiert auf Unfallgutachten nach unverschuldeten Verkehrsunfällen — neutral bewertet, gerichtsfest dokumentiert und so aufbereitet, dass Sie bekommen, was Ihnen zusteht. Termin in der Regel innerhalb von 24 Stunden.': 'Specialised in accident reports after not-at-fault collisions — assessed neutrally, documented court-proof and prepared so you get what you are entitled to. Appointments usually within 24 hours.',
  'Unabhängig · Neutral · Gerichtsfest': 'Independent · Neutral · Court-proof',
  'Ihr unabhängiger': 'Your independent', 'Kfz-Sachverständiger.': 'vehicle assessor.',
  'Unfallgutachten, Wertermittlung und Beweissicherung — neutral bewertet, gerichtsfest dokumentiert, Termin in der Regel innerhalb von 24 Stunden. Bei unverschuldetem Unfall trägt die gegnerische Versicherung die Kosten.': 'Accident reports, vehicle valuation and evidence documentation — assessed neutrally, documented court-proof, appointments usually within 24 hours. After a not-at-fault accident, the opposing insurer covers the costs.',
  'Kostenlose Erstberatung': 'Free initial consultation',
  'Kostenlos bei Haftpflichtschaden': 'Free with a liability claim', '24/7 erreichbar': 'Available 24/7', 'Vor-Ort-Service': 'On-site service',
  'Ihr Gesamtanspruch · Beispiel': 'Your total claim · example',
  'für Sie — bei': 'for you — with a', 'Haftpflichtschaden': 'liability claim',
  'Seitenwand': 'Side panel', 'Schadenspunkte antippen — Details ansehen': 'Tap the damage points — view details',
  // Schadenakte
  'Schadenakte': 'Damage file', 'Frontschaden': 'Front-end damage', 'Stoßfänger & Scheinwerfer rechts': 'Bumper & right headlight',
  'Reparaturkosten': 'Repair costs', 'Maßnahme': 'Measure', 'Dokumentation': 'Documentation',
  'Beispielwerte · Muster-Gutachten': 'Example values · sample report',
  'Austausch erforderlich': 'Replacement required', '14 Fotos · Spaltmaß vermessen': '14 photos · gaps measured',
  'Seitenwand / Tür': 'Side panel / door', 'Beifahrerseite, hintere Tür': 'Passenger side, rear door',
  'Instandsetzung + Lackierung': 'Repair + repaint', '9 Fotos · Lackschichtmessung': '9 photos · paint depth measured',
  // Marquee
  'Unfallgutachten': 'Accident reports', 'Wertgutachten': 'Valuations', 'Beweissicherung': 'Evidence reports',
  'Oldtimer': 'Classic cars', 'Leasingrückgabe': 'Lease returns', 'Kaskoschaden': 'Comprehensive claims',
  // Stats
  'Erstkontakt & Terminvergabe': 'First contact & appointment', 'Neutral & unabhängig': 'Neutral & independent',
  'Erreichbar — auch am Wochenende': 'Available — weekends included', 'bei unverschuldetem Unfall*': 'for not-at-fault accidents*',
  '*Bei einem Haftpflichtschaden trägt die eintrittspflichtige gegnerische Versicherung die Gutachterkosten.': '*In a third-party liability claim, the opposing insurer is required to cover the assessor’s fees.',
  // Sektionslabels
  'Warum Yousufi': 'Why Yousufi', 'Anspruchs-Check': 'Claim check', 'Der Unterschied': 'The difference',
  'Unfall-Soforthilfe': 'Accident first aid', 'Häufige Fragen': 'Common questions', 'Unser Zeichen': 'Our mark',
  // 01 Leistungen (Schwerpunkt Unfallgutachten)
  'Spezialisiert auf Ihren Unfallschaden.': 'Specialised in your accident damage.',
  'Mein Schwerpunkt sind Unfallgutachten nach unverschuldeten Verkehrsunfällen — lückenlos dokumentiert, jede Anspruchsposition beziffert.': 'My focus is accident reports after not-at-fault collisions — fully documented, every claim item quantified.',
  'Alle Leistungen': 'All services', 'Schwerpunkt': 'Main focus',
  'Unfallgutachten nach unverschuldetem Unfall': 'Accident report after a not-at-fault accident',
  'Vollständige Schadenaufnahme direkt nach dem Unfall — die Grundlage dafür, dass die gegnerische Versicherung Ihren Schaden voll ersetzt.': 'Complete damage assessment right after the accident — the basis for the opposing insurer covering your damage in full.',
  'Mehr zum Unfallgutachten →': 'More about accident reports →',
  'Ihre Kosten bei unverschuldetem Unfall': 'Your cost after a not-at-fault accident',
  'Die Gutachterkosten trägt die gegnerische Versicherung.': 'The assessor’s fee is paid by the opposing insurer.',
  'Weitere Gutachten': 'Other reports',
  'Wertminderung': 'Diminished value', 'Nutzungsausfall': 'Loss of use', 'Wiederbeschaffungswert': 'Replacement value',
  'Bei Haftpflichtschaden: Kosten trägt die Gegenseite →': 'Liability claim: the other side pays →',
  'Marktgerechte Fahrzeugbewertung für Kauf, Verkauf, Versicherung oder Nachlass.': 'Market-accurate vehicle valuation for purchase, sale, insurance or inheritance.',
  'Mehr erfahren →': 'Learn more →',
  'Transparente Schadenermittlung für Ihre eigene Versicherung — wirkt Kürzungen entgegen.': 'Transparent damage assessment for your own insurer — counters deductions.',
  'Oldtimer & Youngtimer': 'Classic & modern classics',
  'Zustands- und Wertgutachten für Klassiker — für H-Kennzeichen, Versicherung oder Verkauf.': 'Condition and value reports for classics — for historic plates, insurance or sale.',
  'Neutrale Zustandsdokumentation vor der Rückgabe — schützt vor überzogenen Nachforderungen.': 'Neutral condition documentation before return — protects against inflated claims.',
  'Kurzgutachten & KV': 'Short reports & estimates',
  'Für Bagatellschäden bis ca. 750 € — schnelle, kostengünstige Bewertung.': 'For minor damage up to approx. €750 — fast, affordable assessment.',
  'Nicht sicher, was Sie brauchen?': 'Not sure what you need?',
  'Schildern Sie mir kurz Ihren Fall — ich sage Ihnen ehrlich, welches Gutachten sinnvoll ist.': 'Describe your case briefly — I will tell you honestly which report makes sense.',
  'Fall schildern': 'Describe your case',
  // 02 Ablauf
  'In vier Schritten zum Gutachten.': 'Your report in four steps.',
  'Sie melden den Schaden — den Rest übernehme ich. Ohne Papierkram, ohne Wartezeiten.': 'You report the damage — I handle the rest. No paperwork, no waiting.',
  'Sie schildern kurz den Schaden — per Telefon, WhatsApp oder Formular.': 'Briefly describe the damage — by phone, WhatsApp or form.',
  'Antwort binnen 24 h': 'Reply within 24 h', 'Begutachtung': 'Inspection',
  'Ich komme zu Ihnen — nach Hause, zur Werkstatt oder an den Unfallort — und dokumentiere alles.': 'I come to you — home, workshop or accident scene — and document everything.',
  'Ca. 30–60 Minuten': 'Approx. 30–60 minutes', 'Gutachten': 'Report',
  'Präzise Ausarbeitung aller Schäden, Werte und Ansprüche — gerichtsfest und nachvollziehbar.': 'Precise preparation of all damage, values and claims — court-proof and transparent.',
  'In wenigen Werktagen': 'Within a few working days', 'Abwicklung': 'Settlement',
  'Versand an Versicherung und ggf. Anwalt — auf Wunsch übernehme ich die Kommunikation.': 'Sent to the insurer and lawyer if needed — on request I handle all communication.',
  'Sie erhalten Ihr Geld': 'You receive your money', 'Den Ablauf im Detail ansehen →': 'View the process in detail →',
  // 03 Warum
  'Die Versicherung hat ihre Gutachter.': 'The insurer has its assessors.', 'Sie haben mich.': 'You have me.',
  'Als unabhängiger Sachverständiger vertrete ich ausschließlich Ihre Interessen. Kein Interessenkonflikt, keine gekürzten Beträge — nur eine ehrliche, belastbare Bewertung Ihres Schadens.': 'As an independent assessor I represent your interests only. No conflicts of interest, no reduced payouts — just an honest, robust assessment of your damage.',
  'Keine Bindung': 'No ties', 'an Versicherungen, Werkstätten oder Autohäuser': 'to insurers, workshops or dealerships',
  'Gerichtsfeste Dokumentation': 'Court-proof documentation', 'mit lückenloser Foto- und Messaufnahme': 'with complete photo and measurement records',
  'Kalkulation mit aktuellen Systemen': 'Calculation with current systems', 'und Herstellervorgaben — nachvollziehbar bis zur letzten Position': 'and manufacturer specifications — transparent to the last item',
  'Starkes Partnernetzwerk': 'Strong partner network', '— auf Wunsch Vermittlung an erfahrene Verkehrsrechts-Anwälte': '— referral to experienced traffic-law attorneys on request',
  'Ich bewerte den Schaden — nicht die Interessen der Versicherung.': 'I assess the damage — not the insurer’s interests.',
  'Schnell vor Ort': 'Quickly on site', 'Begutachtung an Ihrem Wunschort, in der Regel binnen 24 Stunden.': 'Inspection wherever suits you, usually within 24 hours.',
  'Gerichtsfest': 'Court-proof', 'Dokumentation, die vor Gericht und gegenüber Versicherern Bestand hat.': 'Documentation that holds up in court and against insurers.',
  'Ein Unfall passiert nicht nach Termin — ich bin auch abends und am Wochenende da.': 'Accidents don’t keep office hours — I’m there evenings and weekends too.',
  'Volle Abwicklung': 'Full settlement', 'Auf Wunsch übernehme ich die komplette Kommunikation mit der Versicherung.': 'On request I handle all communication with the insurer.',
  'Über das Büro': 'About the office',
  // 04 Anspruchs-Check
  'Was steht Ihnen eigentlich zu?': 'What are you actually entitled to?',
  'Nach einem unverschuldeten Unfall besteht Ihr Anspruch aus deutlich mehr als der reinen Reparatur. Schalten Sie die Positionen durch, die auf Ihren Fall zutreffen — und sehen Sie, was schnell zusammenkommt.': 'After a not-at-fault accident your claim covers far more than just the repair. Toggle the items that apply to your case — and see how quickly it adds up.',
  'Beispielwerte aus einem Muster-Gutachten': 'Example values from a sample report',
  'Ihr konkreter Fall kann abweichen — genau das klärt das Gutachten': 'Your actual case may differ — that is exactly what the report clarifies',
  'Ihre Anspruchspositionen': 'Your claim items', 'Beispiel': 'Example',
  'Reparaturkosten (netto)': 'Repair costs (net)', 'immer enthalten': 'always included',
  'Merkantile Wertminderung': 'Diminished market value', 'Ihr Auto ist nach dem Unfall weniger wert': 'Your car is worth less after the accident',
  '8 Tage ohne Fahrzeug à 59 €': '8 days without a car at €59',
  'Abschleppkosten': 'Towing costs', 'vom Unfallort zur Werkstatt': 'from the scene to the workshop',
  'Unkostenpauschale': 'Expense allowance', 'Telefon, Porto, Wege': 'phone, postage, travel',
  'Ihr Beispiel-Anspruch': 'Your example claim',
  'Gutachterkosten: 0 € für Sie — trägt die gegnerische Versicherung': 'Assessor’s fee: €0 for you — paid by the opposing insurer',
  'Anspruch prüfen lassen': 'Have your claim checked',
  // 05 Vergleich
  'Was die Versicherung zahlt.': 'What the insurer pays.', 'Und was Ihnen zusteht.': 'And what you are entitled to.',
  'Beide Zahlen betreffen': 'Both figures relate to', 'denselben Schaden': 'the same damage',
  '. Der Unterschied ist genau das, was ohne unabhängiges Gutachten unter den Tisch fällt.': '. The difference is exactly what gets lost without an independent report.',
  'Mit dem Gutachter der Versicherung': 'With the insurer’s assessor',
  'nur Reparaturkosten — Wertminderung und Nutzungsausfall fehlen': 'repair costs only — diminished value and loss of use are missing',
  'Mit Ihrem unabhängigen Gutachten': 'With your independent report',
  'Reparatur': 'Repair', '+ Wertminderung + Nutzungsausfall': '+ diminished value + loss of use',
  'Ihr Plus mit Gutachten': 'Your gain with a report',
  'Beispielwerte aus einem Muster-Gutachten — ohne Abschlepp- und Nebenkosten. Ihr konkreter Fall kann höher ausfallen.': 'Example values from a sample report — excluding towing and incidentals. Your actual case may be higher.',
  // 06 Checkliste
  'Nach dem Unfall: alles richtig machen.': 'After the accident: get everything right.',
  'Sechs Schritte, die bares Geld wert sind. Haken Sie ab —': 'Six steps worth real money. Tick them off —',
  'Schritt 6 übernehme ich.': 'step 6 is on me.',
  'Unfallstelle absichern': 'Secure the scene', 'Warnblinker an, Warnweste anziehen, Warndreieck aufstellen.': 'Hazard lights on, hi-vis vest on, warning triangle out.',
  'Bei Verletzten: 112': 'If anyone is injured: 112', 'Erste Hilfe leisten — bei Personenschaden immer die Polizei rufen.': 'Give first aid — always call the police if anyone is hurt.',
  'Fotos machen': 'Take photos', 'Fahrzeuge, Schäden, Umfeld, Kennzeichen — lieber zu viele als zu wenige.': 'Vehicles, damage, surroundings, plates — better too many than too few.',
  'Daten austauschen': 'Exchange details', 'Name, Kennzeichen und Versicherung der Gegenseite notieren.': 'Note the other party’s name, plate and insurer.',
  'Nichts unterschreiben': 'Sign nothing', 'Kein Schuldanerkenntnis, keine Abtretung an die gegnerische Versicherung.': 'No admission of fault, no assignment to the opposing insurer.',
  'Unabhängigen Gutachter anrufen': 'Call an independent assessor', 'Vor dem Anruf bei der gegnerischen Versicherung — Ihr gutes Recht.': 'Before you call the opposing insurer — it’s your right.',
  'Gehen Sie die Punkte durch — oder rufen Sie direkt an.': 'Work through the steps — or call right away.',
  'Guter Anfang — weiter geht\'s.': 'Good start — keep going.', 'Sie machen das richtig.': 'You’re doing it right.',
  'Halbzeit — dranbleiben.': 'Halfway — keep at it.', 'Fast geschafft.': 'Almost there.', 'Nur noch ein Schritt.': 'Just one step left.',
  'Alles erledigt — jetzt Schritt 6: der Anruf.': 'All done — now step 6: the call.',
  'Schritt 6: Jetzt anrufen': 'Step 6: call now', '24/7 erreichbar — auch am Unfallort': 'Available 24/7 — even at the scene',
  // 08 FAQ
  'Gut zu wissen.': 'Good to know.',
  'Wer zahlt das Gutachten nach einem Unfall?': 'Who pays for the report after an accident?',
  'Bei einem unverschuldeten Unfall (Haftpflichtschaden) trägt die gegnerische Versicherung die Kosten des Gutachtens vollständig. Für Sie entstehen keine Kosten.': 'After a not-at-fault accident (liability claim) the opposing insurer covers the full cost of the report. You pay nothing.',
  'Muss ich den Gutachter der Versicherung akzeptieren?': 'Do I have to accept the insurer’s assessor?',
  'Nein. Als Geschädigter haben Sie das Recht, einen unabhängigen Sachverständigen Ihrer Wahl zu beauftragen. Der Gutachter der gegnerischen Versicherung arbeitet in deren Interesse — nicht in Ihrem.': 'No. As the injured party you have the right to appoint an independent assessor of your choice. The opposing insurer’s assessor works in their interest — not yours.',
  'Wie schnell bekomme ich einen Termin?': 'How quickly can I get an appointment?',
  'In der Regel innerhalb von 24 Stunden. Die Begutachtung findet an Ihrem Wunschort statt — zu Hause, in der Werkstatt oder am Unfallort. Das fertige Gutachten erhalten Sie meist innerhalb weniger Werktage.': 'Usually within 24 hours. The inspection takes place wherever suits you — at home, at the workshop or at the scene. The finished report is typically ready within a few working days.',
  'Reicht nicht der Kostenvoranschlag der Werkstatt?': 'Isn’t the workshop’s estimate enough?',
  'Ein Kostenvoranschlag erfasst nur die Reparaturkosten. Wertminderung, Nutzungsausfall und Wiederbeschaffungswert bleiben unberücksichtigt — Positionen, die schnell mehrere hundert Euro ausmachen. Nur bei Bagatellschäden bis ca. 750 € ist ein Kurzgutachten oder Kostenvoranschlag sinnvoll.': 'An estimate only covers repair costs. Diminished value, loss of use and replacement value are ignored — items quickly worth several hundred euros. Only for minor damage up to about €750 is a short report or estimate the right choice.',
  'Was kostet ein Gutachten bei selbst verschuldetem Unfall?': 'What does a report cost if the accident was my fault?',
  'Bei Kaskoschäden oder selbst verschuldeten Unfällen richtet sich das Honorar nach der Schadenhöhe. Die Kosten bespreche ich transparent mit Ihnen, bevor Sie beauftragen — ohne versteckte Positionen.': 'For comprehensive claims or at-fault accidents the fee depends on the damage amount. I discuss the costs transparently with you before you commission — no hidden items.',
  'Weitere Fragen?': 'More questions?', 'Schreiben Sie mir': 'Write to me',
  '— ich antworte in der Regel innerhalb von 24 Stunden.': '— I usually reply within 24 hours.',
  // 09 Marke
  'Zwei Autos. Ein Moment.': 'Two cars. One moment.', 'Danach: Klarheit.': 'Then: clarity.',
  'Unser Logo zeigt den Moment, in dem Sie uns brauchen. Ab da übernehmen wir: dokumentieren, beziffern, durchsetzen.': 'Our logo shows the moment you need us. From then on we take over: document, quantify, enforce.',
  'Maus durchs Logo bewegen — Klick für den Crash': 'Move your mouse through the logo — click for the crash',
  // 10 Kontakt-CTA
  'Unfall gehabt?': 'Been in an accident?', 'Sichern Sie Ihre Ansprüche.': 'Secure your claims.',
  'Warten Sie nicht auf die Versicherung. Je früher der Schaden dokumentiert ist, desto besser stehen Ihre Chancen auf volle Entschädigung.': 'Don’t wait for the insurer. The sooner the damage is documented, the better your chances of full compensation.',
  'Per WhatsApp': 'Via WhatsApp', 'Telefon / WhatsApp': 'Phone / WhatsApp', 'E-Mail': 'Email',
  'Erreichbarkeit': 'Availability', 'Rund um die Uhr — 24/7': 'Around the clock — 24/7',
  // Unterseiten (Hero/Kern)
  'LEISTUNGEN': 'SERVICES', 'ABLAUF': 'PROCESS', 'ÜBER UNS': 'ABOUT US', 'KONTAKT': 'CONTACT',
  'Ihr Unfallgutachten — vollständig und unabhängig.': 'Your accident report — complete and independent.',
  'Schwerpunkt: Unfallgutachten nach unverschuldeten Verkehrsunfällen — neutral erstellt, klar dokumentiert und rechtssicher.': 'Focus: accident reports after not-at-fault collisions — neutral, clearly documented, legally sound.',
  'Rund um Ihren Unfallschaden.': 'Everything around your accident damage.',
  'Alles, was nach einem Unfall zählt — aus einer Hand.': 'Everything that matters after an accident — from a single source.',
  'Auch außerhalb eines Unfallschadens bin ich für Sie da.': 'I’m also there for you beyond accident damage.',
  'Einfach. Transparent. Ohne Stress.': 'Simple. Transparent. Stress-free.',
  'Sie kümmern sich um sich — den Rest übernehme ich. So läuft Ihr Gutachten in vier Schritten ab.': 'You look after yourself — I handle the rest. Your report in four steps.',
  'Kompetenz, der Sie vertrauen können.': 'Expertise you can trust.',
  'Das KFZ-Sachverständigenbüro Yousufi steht für unabhängige, präzise Begutachtung. Wir arbeiten ausschließlich in Ihrem Interesse — objektiv, fundiert und verständlich.': 'The Yousufi assessment office stands for independent, precise appraisals. We work exclusively in your interest — objective, well-founded, clear.',
  'Sprechen wir über Ihren Fall.': 'Let’s talk about your case.',
  'Schildern Sie uns Ihren Schaden — wir melden uns in der Regel innerhalb von 24 Stunden.': 'Tell us about your damage — we usually reply within 24 hours.',
  'Starten wir mit Schritt 1.': 'Let’s start with step 1.',
  'Melden Sie Ihren Schaden — der Rest ist unkompliziert.': 'Report your damage — the rest is easy.',
  'Jetzt Kontakt aufnehmen': 'Get in touch now', 'Lernen wir uns kennen.': 'Let’s get to know each other.',
  'Haben Sie Fragen zu Ihrem Fall? Wir beraten Sie gern.': 'Questions about your case? We’re happy to advise.',
  'Kontakt aufnehmen': 'Get in touch',
  '„Sie sollen bekommen, was Ihnen zusteht —': '“You should get what you are entitled to —', 'nicht weniger.': 'nothing less.',
  'Unabhängigkeit': 'Independence', 'Keine Bindung an Versicherer oder Werkstätten. Unser Urteil gehört Ihnen.': 'No ties to insurers or workshops. Our judgement belongs to you.',
  'Schnelligkeit': 'Speed', 'Kurzfristige Termine und zügige Bearbeitung — damit Sie schnell handeln können.': 'Short-notice appointments and swift processing — so you can act fast.',
  'Präzision': 'Precision', 'Sorgfältige Dokumentation bis ins Detail — für ein Gutachten, das überzeugt.': 'Meticulous documentation down to the detail — for a report that convinces.',
  // Ablauf-Seite Timeline
  'Kontakt & Terminvereinbarung': 'Contact & appointment',
  'Sie melden Ihren Schaden telefonisch oder über das Kontaktformular. Ich melde mich in der Regel innerhalb von 24 Stunden und vereinbare einen Begutachtungstermin an Ihrem Wunschort.': 'Report your damage by phone or via the contact form. I usually reply within 24 hours and arrange an inspection wherever suits you.',
  'Begutachtung vor Ort': 'On-site inspection',
  'Ich untersuche das Fahrzeug gründlich, dokumentiere alle Schäden mit Fotos und erfasse alle relevanten Daten — sichtbare wie auch versteckte Schäden.': 'I examine the vehicle thoroughly, document all damage with photos and record all relevant data — visible and hidden damage alike.',
  'Erstellung des Gutachtens': 'Preparing the report',
  'Aus den Daten erstelle ich ein präzises, nachvollziehbares und gerichtsfestes Gutachten — mit Reparaturkosten, Wertminderung, Wiederbeschaffungs- und Restwert.': 'From the data I prepare a precise, transparent, court-proof report — with repair costs, diminished value, replacement and residual value.',
  'Abwicklung & Auszahlung': 'Settlement & payout',
  'Sie erhalten Ihr Gutachten und reichen es bei der Versicherung ein. Auf Wunsch unterstütze ich Sie bei der Kommunikation, damit Sie schnell zu Ihrem Recht kommen.': 'You receive your report and submit it to the insurer. On request I support you with all communication so you get your due quickly.',
  'Dauer: ca. 30–60 Minuten': 'Duration: approx. 30–60 minutes', 'Fertig in wenigen Werktagen': 'Ready within a few working days',
  // Leistungen-Seite Karten
  'Unfallgutachten (Haftpflicht)': 'Accident report (liability)',
  'Umfassendes Gutachten nach unverschuldetem Unfall: Reparaturkosten, Wertminderung, Nutzungsausfall, Wiederbeschaffungswert.': 'Comprehensive report after a not-at-fault accident: repair costs, diminished value, loss of use, replacement value.',
  'Kosten trägt die Gegenseite.': 'The other side pays.',
  'Kaskoschaden-Gutachten': 'Comprehensive-claim report',
  'Schadenermittlung für Ihre eigene Kaskoversicherung — transparente Bewertung, die Kürzungen entgegenwirkt.': 'Damage assessment for your own comprehensive insurer — a transparent valuation that counters deductions.',
  'Marktgerechte Fahrzeugbewertung für Kauf, Verkauf, Finanzierung, Versicherung oder Nachlassregelung.': 'Market-accurate valuation for purchase, sale, financing, insurance or estate settlement.',
  'Leasingrückgabe-Gutachten': 'Lease-return report',
  'Neutrale Zustandsdokumentation vor der Rückgabe — schützt vor überzogenen Nachforderungen des Leasinggebers.': 'Neutral condition documentation before return — protects against inflated lessor claims.',
  'Lückenlose Foto- und Schadendokumentation zur Sicherung von Beweisen für spätere Auseinandersetzungen.': 'Complete photo and damage documentation to secure evidence for later disputes.',
  'Kostenvoranschlag oder Kurzgutachten für Bagatellschäden bis ca. 750 € — schnell und günstig.': 'Estimate or short report for minor damage up to approx. €750 — fast and affordable.',
  'Ermittlung der merkantilen Wertminderung — auch reparierte Fahrzeuge verlieren an Wert. Wir beziffern ihn.': 'Determining diminished market value — even repaired cars lose value. We quantify it.',
  'Anwaltliche Begleitung': 'Legal support',
  'Auf Wunsch vermitteln wir Sie an starke Partner-Rechtsanwälte, die Ihre Ansprüche konsequent durchsetzen.': 'On request we refer you to strong partner attorneys who enforce your claims rigorously.',
  '24/7 Notfall-Service': '24/7 emergency service',
  'Rund um die Uhr erreichbar — auch am Wochenende und nach Feierabend. Ein Unfall wartet nicht.': 'Reachable around the clock — weekends and evenings included. An accident doesn’t wait.',
  'Wir kommen zu Ihnen — nach Hause, zur Werkstatt oder an den Unfallort. Ganz ohne Umstände für Sie.': 'We come to you — home, workshop or accident scene. No hassle for you.',
  'Schildern Sie mir Ihren Fall — ich empfehle Ihnen das passende Gutachten.': 'Describe your case — I’ll recommend the right report.',
  'Darf ich den Gutachter frei wählen?': 'May I choose the assessor freely?',
  'Ja. Als Geschädigter haben Sie das Recht, einen unabhängigen Sachverständigen Ihrer Wahl zu beauftragen — Sie sind nicht an den Gutachter der Versicherung gebunden.': 'Yes. As the injured party you may appoint an independent assessor of your choice — you are not bound to the insurer’s assessor.',
  'Wie schnell ist mein Gutachten fertig?': 'How fast is my report ready?',
  'In der Regel erhalten Sie innerhalb weniger Werktage nach der Begutachtung Ihr fertiges Gutachten. Die Terminvergabe erfolgt meist innerhalb von 24 Stunden.': 'You usually receive the finished report within a few working days after the inspection. Appointments are typically scheduled within 24 hours.',
  'Kommen Sie auch zu mir?': 'Do you come to me?',
  'Ja, die Begutachtung erfolgt an Ihrem Wunschort — zu Hause, in der Werkstatt oder am Unfallort. Ganz nach Absprache.': 'Yes — the inspection happens wherever suits you: at home, at the workshop or at the scene.',
  // Kontakt-Formular
  'Name': 'Name', 'Ihr Name': 'Your name', 'Telefon': 'Phone', 'Rückrufnummer': 'Callback number',
  'ihre@email.de': 'you@email.com', 'Art des Schadens': 'Type of damage',
  'Oldtimer / Youngtimer': 'Classic / modern classic', 'Sonstiges': 'Other',
  'Ihre Nachricht': 'Your message', 'Beschreiben Sie kurz, was passiert ist.': 'Briefly describe what happened.',
  'Ich habe die': 'I have read the', 'gelesen und stimme der Verarbeitung meiner Daten zu.': 'and agree to the processing of my data.',
  'Per WhatsApp senden': 'Send via WhatsApp', 'WhatsApp geöffnet ✓': 'WhatsApp opened ✓',
  'Öffnet WhatsApp mit Ihrer vorausgefüllten Anfrage — schnellste Antwort. Alternativ direkt per': 'Opens WhatsApp with your pre-filled request — fastest reply. Alternatively directly via',
  'Adresse': 'Address', 'Vor-Ort-Service — wir kommen zu Ihnen': 'On-site service — we come to you',
  'Öffnungszeiten': 'Hours', 'Rund um die Uhr · 24/7 erreichbar': 'Around the clock · available 24/7',
};

const i18nNorm = (s) => s.replace(/­/g, '').replace(/‑/g, '-').replace(/ /g, ' ').trim().replace(/\s+/g, ' ');
function T(s) {
  if (document.documentElement.lang !== 'en') return s;
  return I18N_DICT[i18nNorm(s)] || s;
}

document.addEventListener('DOMContentLoaded', () => {
  // Läuft NACH dem Haupt-Handler → erfasst auch injizierte Elemente (Cookie, Action-Bar …)
  const registry = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    const key = i18nNorm(n.data);
    if (key && I18N_DICT[key]) {
      const ws = n.data.match(/^(\s*)[\s\S]*?(\s*)$/);
      registry.push({ n, de: n.data, en: ws[1] + I18N_DICT[key] + ws[2] });
    }
  }
  // Übersetzbare Attribute (Platzhalter im Kontaktformular)
  const attrRegistry = [];
  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
    const de = el.getAttribute('placeholder');
    if (I18N_DICT[i18nNorm(de)]) attrRegistry.push({ el, de, en: I18N_DICT[i18nNorm(de)] });
  });

  const setLang = (lang) => {
    document.documentElement.lang = lang;
    registry.forEach(r => { r.n.data = lang === 'en' ? r.en : r.de; });
    attrRegistry.forEach(r => r.el.setAttribute('placeholder', lang === 'en' ? r.en : r.de));
    document.querySelectorAll('.lang-label').forEach(l => { l.textContent = lang === 'en' ? 'DE' : 'EN'; });
    try { localStorage.setItem('yousufi-lang', lang); } catch (e) { /* ok */ }
  };

  let lang = 'de';
  try { lang = localStorage.getItem('yousufi-lang') === 'en' ? 'en' : 'de'; } catch (e) { /* ok */ }
  if (lang === 'en') setLang('en');

  document.querySelectorAll('.lang-toggle').forEach(btn => {
    btn.addEventListener('click', () => setLang(document.documentElement.lang === 'en' ? 'de' : 'en'));
  });
});
