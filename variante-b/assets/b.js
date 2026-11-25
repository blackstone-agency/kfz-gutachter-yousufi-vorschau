/* ==========================================================================
   KFZ-Gutachter Yousufi — Variante B: Interaktionen
   Progressive Enhancement: Ohne JS ist alles sichtbar und bedienbar.
   ========================================================================== */
const root = document.documentElement;
root.classList.add('js', 'js-ok');
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const euro = (v) => `${fmt.format(v)} €`;

/* ---- Einblenden beim Scrollen ------------------------------------------ */
const revealIo = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('in'); revealIo.unobserve(e.target); }
  }
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('.rv, [data-reveal]').forEach((el) => {
  if (el.getBoundingClientRect().bottom < 0) el.classList.add('in');
  else revealIo.observe(el);
});

/* ---- Navigation: Glas ab Scroll, beim Runterscrollen ausblenden -------- */
const nav = document.querySelector('.nav');
let lastY = window.scrollY;
let navTick = false;
const onScrollNav = () => {
  navTick = false;
  const y = window.scrollY;
  nav?.classList.toggle('is-solid', y > 24);
  if (y > 240 && y > lastY + 4) nav?.classList.add('is-hidden');
  else if (y < lastY - 4 || y <= 240) nav?.classList.remove('is-hidden');
  lastY = y;
};
window.addEventListener('scroll', () => { if (!navTick) { navTick = true; requestAnimationFrame(onScrollNav); } }, { passive: true });
onScrollNav();
nav?.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

/* ---- Mobile Anruf-Leiste: erst, wenn die großen Buttons weg sind ------- */
const heroCta = document.querySelector('[data-hero-cta]');
const abar = document.querySelector('.abar');
if (abar) {
  abar.inert = true;
  if (heroCta && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      abar.classList.toggle('is-on', show);
      abar.inert = !show;
    }).observe(heroCta);
  } else {
    abar.classList.add('is-on');
    abar.inert = false;
  }
}

/* ---- Objekt im Licht (lazy, nur wenn der Canvas existiert) ------------- */
const emblem = document.querySelector('.emblem');
const canvas = emblem?.querySelector('canvas');
if (canvas && typeof canvas.getContext === 'function') {
  import('./lit.js').then(({ litEmblem }) => {
    const light = litEmblem(canvas, {
      src: canvas.dataset.src,
      reduced: RM,
      onFirstFrame: () => emblem.classList.add('is-lit'),
    });
    // Buttons ziehen das Licht auf „ihre“ Seite: Anruf → Warnrot, WhatsApp → Blau
    const bind = (el, target) => {
      el.addEventListener('pointerenter', () => light.setTarget(target));
      el.addEventListener('focus', () => light.setTarget(target));
      el.addEventListener('pointerleave', () => light.setTarget(null));
      el.addEventListener('blur', () => light.setTarget(null));
    };
    document.querySelectorAll('.hero .cta--call').forEach((el) => bind(el, { x: 0.95, y: -0.15 }));
    document.querySelectorAll('.hero .cta--wa').forEach((el) => bind(el, { x: -0.95, y: -0.15 }));
  }).catch(() => { /* Fallback-Bild bleibt stehen */ });
}

/* ---- 01: Aussage leuchtet Wort für Wort auf ---------------------------- */
const statement = document.querySelector('[data-statement]');
if (statement) {
  const words = [...statement.querySelectorAll('.w')];
  if (RM) {
    words.forEach((w) => w.classList.add('on'));
  } else {
    let pending = false;
    const update = () => {
      pending = false;
      const r = statement.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.3)));
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
    };
    window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
    update();
    setTimeout(update, 400);
  }
}

/* ---- 02: Schaden-Scan — Schritte, Hotspots, laufende Summe ------------- */
const scan = document.querySelector('[data-scan]');
if (scan) {
  const steps = [...scan.querySelectorAll('.scan-step')];
  const spots = [...scan.querySelectorAll('.hs')];
  const out = scan.querySelector('[data-total]');
  let shown = 0;
  let anim = 0;
  const totals = [];
  let sum = 0;
  steps.forEach((s) => { sum += parseFloat(s.dataset.add || '0'); totals.push(sum); });

  const setTotal = (value) => {
    cancelAnimationFrame(anim);
    const from = shown;
    if (RM || !out) { shown = value; if (out) out.textContent = euro(value); return; }
    const t0 = performance.now();
    const run = (now) => {
      const k = Math.min(1, (now - t0) / 700);
      const e = 1 - Math.pow(1 - k, 3);
      out.textContent = euro(from + (value - from) * e);
      if (k < 1) anim = requestAnimationFrame(run);
    };
    anim = requestAnimationFrame(run);
    shown = value;
    setTimeout(() => { if (shown === value) out.textContent = euro(value); }, 760);
  };

  const activate = (idx) => {
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i === idx);
      s.classList.toggle('is-done', i < idx);
    });
    spots.forEach((h) => h.classList.toggle('on', parseInt(h.dataset.step, 10) <= idx + 1));
    setTotal(totals[idx]);
  };

  const stepIo = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) activate(steps.indexOf(e.target));
    }
  }, { rootMargin: '-42% 0px -42% 0px' });
  steps.forEach((s) => stepIo.observe(s));
  if (out) out.textContent = euro(0);
}

/* ---- 03: Ablauf — Linie wächst mit den sichtbaren Schritten ------------ */
const stepsWrap = document.querySelector('[data-steps]');
if (stepsWrap) {
  const items = [...stepsWrap.querySelectorAll('.step')];
  const seen = new Set();
  const lineIo = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) seen.add(e.target);
    stepsWrap.style.setProperty('--p', (seen.size / items.length).toFixed(3));
  }, { threshold: 0.5 });
  items.forEach((i) => lineIo.observe(i));
}

/* ---- 05: Checkliste — Fortschritt, Anrufen ist immer möglich ----------- */
const chkList = document.querySelector('[data-checklist]');
if (chkList) {
  const boxes = [...chkList.querySelectorAll('input[type="checkbox"]')];
  const card = document.querySelector('[data-chk-card]');
  const num = card?.querySelector('[data-chk-num]');
  const status = card?.querySelector('[data-chk-status]');
  const texts = [
    'Gehen Sie die Punkte durch — oder rufen Sie direkt an.',
    'Guter Anfang — weiter geht’s.',
    'Sie machen das richtig.',
    'Halbzeit — dranbleiben.',
    'Fast geschafft.',
    'Nur noch ein Schritt.',
    'Alles erledigt — jetzt der Anruf.',
  ];
  const update = () => {
    const n = boxes.filter((b) => b.checked).length;
    if (num) num.textContent = `${n}/${boxes.length}`;
    if (status) status.textContent = texts[n];
    card?.style.setProperty('--p', ((n / boxes.length) * 100).toFixed(1));
    card?.classList.toggle('done', n === boxes.length);
  };
  boxes.forEach((b) => b.addEventListener('change', update));
  update();
}

/* ---- Jahr im Footer ----------------------------------------------------- */
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
