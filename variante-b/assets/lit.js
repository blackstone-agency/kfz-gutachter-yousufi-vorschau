/* ==========================================================================
   Das Objekt im Licht — Canvas 2D (kein WebGL nötig, läuft auch auf iOS)
   Die Unfall-Silhouette aus dem Logo steht schwarz im Raum, farbiges Licht
   liegt HINTER ihr und legt sich an die Kante:
   - zwei Abfälle: enger, harter Kernsaum + weiter, schwacher Halo
   - Farbe nach Winkel (links Blaulicht, rechts Warnrot, oben Gelblicht),
     direkt an der Kante wird jedes Licht weiß
   - ein Gewichtungsvektor zieht die Energie weich auf eine Seite
   - Bodenreflex, damit das Objekt nicht schwebt
   Erstes Bild wird SOFORT gezeichnet (nicht erst per rAF) — sonst bliebe der
   Hero in Hintergrund-Tabs leer.
   ========================================================================== */

const LOGO_AR = 315.1 / 616.3; // Seitenverhältnis von assets/logo.svg (viewBox)

// Rundum-Palette (Canvas-Winkel: 0 = rechts, im Uhrzeigersinn)
const PALETTE = [
  [0.0, '#ff3b47'],  // rechts: Warnrot
  [0.16, '#c1121f'], // rechts unten: Markenrot
  [0.34, '#3a4dff'], // links unten: Indigo
  [0.5, '#3f86ff'],  // links: Blaulicht
  [0.66, '#7fb2ff'], // links oben: kaltes Blau
  [0.78, '#ffb238'], // oben: Gelblicht
  [0.9, '#ff6a3d'],  // rechts oben: Orange
  [1.0, '#ff3b47'],
];

/** Dreifacher Box-Blur auf einem Alpha-Kanal (≈ Gauß), Werte 0..1 */
function blurAlpha(src, w, h, radius) {
  const r = Math.max(1, Math.round(radius));
  const span = 2 * r + 1;
  let a = src;
  const b = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc / span;
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / span;
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
    a = out.slice();
  }
  return a;
}

function alphaCanvas(values, w, h, gain) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < values.length; i++) {
    const p = i * 4;
    img.data[p] = img.data[p + 1] = img.data[p + 2] = 255;
    img.data[p + 3] = Math.min(255, values[i] * gain * 255);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function offscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ src: string, reduced?: boolean, onFirstFrame?: () => void }} opts
 * @returns {{ setTarget: (v: {x:number,y:number}|null) => void, destroy: () => void }}
 */
export function litEmblem(canvas, { src, reduced = false, onFirstFrame } = {}) {
  const ctx = canvas.getContext('2d');
  const state = { cur: { x: 0.55, y: -0.1 }, target: null, raf: 0, visible: true, t0: performance.now() };
  let W = 0, H = 0, L = null, glow = null, core = null, refl = null, ready = false;

  const img = new Image();
  img.decoding = 'async';

  function build() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || !img.naturalWidth) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    W = canvas.width = Math.round(rect.width * dpr);
    H = canvas.height = Math.round(rect.height * dpr);

    // Logo einpassen: Platz für Halo rundum + Boden darunter
    let lw = W * 0.7;
    let lh = lw * LOGO_AR;
    if (lh > H * 0.5) { lh = H * 0.5; lw = lh / LOGO_AR; }
    const lx = (W - lw) / 2;
    const ly = H * 0.47 - lh / 2;
    const floorY = ly + lh * 0.985;

    // Silhouette (Alpha) in voller Größe
    const sil = offscreen(W, H);
    const sctx = sil.getContext('2d');
    sctx.drawImage(img, lx, ly, lw, lh);

    // Masken in halber Auflösung weichzeichnen (einmalig)
    const s = 2;
    const w2 = Math.ceil(W / s), h2 = Math.ceil(H / s);
    const small = offscreen(w2, h2);
    const smctx = small.getContext('2d');
    smctx.drawImage(sil, 0, 0, w2, h2);
    const data = smctx.getImageData(0, 0, w2, h2).data;
    const alpha = new Float32Array(w2 * h2);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3] / 255;
    const unit = lw / s;
    const coreMask = alphaCanvas(blurAlpha(alpha, w2, h2, unit * 0.01), w2, h2, 1.6);
    const haloMask = alphaCanvas(blurAlpha(alpha, w2, h2, unit * 0.07), w2, h2, 1.5);

    // Körper: fast schwarzes Metall (kommt NACH dem Licht obendrauf)
    const body = offscreen(W, H);
    const bctx = body.getContext('2d');
    bctx.drawImage(sil, 0, 0);
    bctx.globalCompositeOperation = 'source-in';
    bctx.fillStyle = '#070a12';
    bctx.fillRect(0, 0, W, H);

    glow = offscreen(W, H);
    core = offscreen(W, H);
    refl = offscreen(W, H);
    L = { lx, ly, lw, lh, floorY, cx: lx + lw / 2, cy: ly + lh * 0.55, coreMask, haloMask, body };
    return true;
  }

  function conic(g, rot) {
    if (typeof g.createConicGradient !== 'function') {
      // Ältere Browser: Blaulicht links → Warnrot rechts
      const lin = g.createLinearGradient(L.lx, 0, L.lx + L.lw, 0);
      lin.addColorStop(0, '#3f86ff');
      lin.addColorStop(0.5, '#ffb238');
      lin.addColorStop(1, '#ff3b47');
      return lin;
    }
    const grad = g.createConicGradient(rot, L.cx, L.cy);
    for (const [stop, color] of PALETTE) grad.addColorStop(stop, color);
    return grad;
  }

  function biasGradient(g, b) {
    const len = Math.hypot(b.x, b.y);
    const dx = len > 1e-4 ? b.x / len : 1;
    const dy = len > 1e-4 ? b.y / len : 0;
    const reach = Math.max(W, H) * 0.6;
    const grad = g.createLinearGradient(L.cx - dx * reach, L.cy - dy * reach, L.cx + dx * reach, L.cy + dy * reach);
    const far = 1 - Math.min(1, len) * 0.86; // abgewandte Seite: deutlich dunkler
    grad.addColorStop(0, `rgba(0,0,0,${far.toFixed(3)})`);
    grad.addColorStop(0.5, `rgba(0,0,0,${(0.55 + far * 0.45).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    return grad;
  }

  function draw(b, t) {
    if (!L) return;
    const rot = -Math.PI / 2 + Math.sin(t * 0.11) * 0.35; // Palette atmet minimal

    // Halo + Kernsaum einfärben
    for (const [layer, mask, whiten] of [[glow, L.haloMask, 0], [core, L.coreMask, 0.42]]) {
      const g = layer.getContext('2d');
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.clearRect(0, 0, W, H);
      g.drawImage(mask, 0, 0, W, H);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = conic(g, rot);
      g.fillRect(0, 0, W, H);
      if (whiten) {
        // An der Kante wird jedes Licht weiß
        g.globalCompositeOperation = 'source-atop';
        g.globalAlpha = whiten;
        g.fillStyle = '#fff4ee';
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }
      // Gewichtung: Energie auf eine Seite ziehen
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = biasGradient(g, b);
      g.fillRect(0, 0, W, H);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);

    // Bodenlicht: farbiger Lichtfleck auf dem Boden, Seite folgt dem Gewicht
    ctx.save();
    ctx.translate(L.cx + b.x * L.lw * 0.12, L.floorY + L.lh * 0.02);
    ctx.scale(1, 0.16);
    const fr = L.lw * 0.62;
    const floor = ctx.createRadialGradient(0, 0, 0, 0, 0, fr);
    floor.addColorStop(0, b.x >= 0 ? 'rgba(255,70,80,0.30)' : 'rgba(70,130,255,0.30)');
    floor.addColorStop(0.55, 'rgba(120,90,160,0.08)');
    floor.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floor;
    ctx.fillRect(-fr, -fr, fr * 2, fr * 2);
    ctx.restore();

    // Licht additiv in den dunklen Raum
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.62;
    ctx.drawImage(glow, 0, 0);
    ctx.globalAlpha = 1.0;
    ctx.drawImage(core, 0, 0);

    // Bodenreflex: gespiegeltes, nach unten auslaufendes Licht
    const r = refl.getContext('2d');
    r.globalCompositeOperation = 'source-over';
    r.clearRect(0, 0, W, H);
    r.globalAlpha = 0.5;
    r.drawImage(glow, 0, 0);
    r.globalAlpha = 1;
    r.drawImage(core, 0, 0);
    r.globalCompositeOperation = 'destination-in';
    const fade = r.createLinearGradient(0, L.floorY - L.lh * 0.45, 0, L.floorY);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,0.55)');
    r.fillStyle = fade;
    r.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.32;
    ctx.save();
    ctx.translate(0, L.floorY * 2);
    ctx.scale(1, -1);
    ctx.drawImage(refl, 0, 0);
    ctx.restore();

    // Körper zuletzt: ein Okkluder strahlt nichts ab
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(L.body, 0, 0);

    // Kontaktschatten direkt unter den Rädern
    ctx.save();
    ctx.translate(L.cx, L.floorY + L.lh * 0.01);
    ctx.scale(1, 0.06);
    const sr = L.lw * 0.46;
    const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, sr);
    shadow.addColorStop(0, 'rgba(0,0,0,0.75)');
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadow;
    ctx.fillRect(-sr, -sr, sr * 2, sr * 2);
    ctx.restore();
  }

  function idleBias(t) {
    // Ruhe: Licht wandert langsam zwischen Blaulicht (links) und Warnrot (rechts),
    // weich wie eine Drehleuchte — kein Blinken.
    return { x: Math.sin(t * 0.6) * 0.78, y: -0.12 + Math.cos(t * 0.41) * 0.18 };
  }

  function tick(now) {
    state.raf = 0;
    if (!state.visible || document.hidden) return;
    const t = (now - state.t0) / 1000;
    const tgt = state.target || idleBias(t);
    state.cur.x += (tgt.x - state.cur.x) * 0.045;
    state.cur.y += (tgt.y - state.cur.y) * 0.045;
    draw(state.cur, t);
    state.raf = requestAnimationFrame(tick);
  }

  function start() {
    if (reduced || state.raf || !ready) return;
    state.raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  function firstFrame() {
    if (!build()) return;
    ready = true;
    draw(state.cur, 0); // synchron — auch ohne laufendes rAF sichtbar
    if (!canvas.dataset.lit) { canvas.dataset.lit = '1'; onFirstFrame?.(); }
    start();
  }

  img.onload = firstFrame;
  img.src = src;

  let resizeTimer = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (ready && build()) draw(state.cur, (performance.now() - state.t0) / 1000); }, 120);
  });
  ro.observe(canvas);

  const io = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting;
    if (state.visible) start(); else stop();
  });
  io.observe(canvas);

  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);

  return {
    setTarget(v) {
      state.target = v;
      if (reduced && ready) { state.cur = v || { x: 0.55, y: -0.1 }; draw(state.cur, 0); }
    },
    destroy() {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}
