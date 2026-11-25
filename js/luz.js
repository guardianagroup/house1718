// Elixire · los textos aparecen y se iluminan al bajar (19 nov 2026).
// Dueño, 15:40: «al bajar y leer los textos los quiero como GUARDIANA, que van apareciendo a medida que bajas y se ilumina… y
// algunos a color». Como en GUARDIANA (portada/luz.js; agencia, ronda 13): los titulares y las frases grandes se iluminan palabra a
// palabra al subir por la pantalla; lo demás entra con un fundido corto la primera vez que llega; algunas palabras quedan en su
// color (están en el propio texto: <em class="c-…">). El texto nunca se parte ni se mueve: la luz colorea rangos (CSS Custom
// Highlight API), así que el traductor y los lectores de pantalla siguen igual. Lo que ya está a la vista no se esconde; con
// «reducir movimiento», nada se anima. Al cambiar de idioma, el texto es otro: se vuelve a preparar.
'use strict';
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  // (dueño, 19:37: de la mitad de la web hacia abajo también se encienden las palabras, como arriba)
  const LUZ = '.seccion h2, .seccion .intro, .escena h2, .escena-entradilla, .dato-texto, .parada p, .escena-nota, .ficha dd, .pasos p';
  const APARECE = '.seccion > .etiqueta, .libro > li, .seccion .cadena, .riesgos > p, .seccion .recuadro, .pasos > li, .seccion .tabla, .tecnica > article, .nota-final, .pie-tabla, .seccion > .cristal, .ficha > div';

  // ---- la entrada: un fundido corto (en las listas, uno detrás de otro) ----
  const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }, { rootMargin: '0px 0px -7% 0px' });
  const cuantos = new Map();
  for (const el of document.querySelectorAll(APARECE)) {
    if (el.getBoundingClientRect().top < innerHeight) continue;
    const i = cuantos.get(el.parentElement) || 0; cuantos.set(el.parentElement, i + 1);
    el.style.setProperty('--retraso', Math.min(i, 6) * 80 + 'ms');
    el.classList.add('luz-b'); io.observe(el);
  }

  // ---- la luz, palabra a palabra ----
  if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
  const H0 = new Highlight(), H1 = new Highlight(); CSS.highlights.set('luz-0', H0); CSS.highlights.set('luz-1', H1);
  const palabras = (el) => {
    const out = [], tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const r = new Range(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); out.push(r); } }
    return out;
  };
  // cada palabra: 2 esperando (tenue), 1 la luz pasando, 0 encendida (su color)
  const pon = (b, i, e) => { const r = b.w[i]; H0.delete(r); H1.delete(r); if (e === 2) H0.add(r); else if (e === 1) H1.add(r); };
  const estado = (i, k) => (i < k - 2 ? 0 : i < k ? 1 : 2);
  const objetivo = (b) => {
    const r = b.el.getBoundingClientRect(), n = b.w.length, linea = innerHeight * 0.84;
    if (r.bottom < 0) return n + 2; if (r.top > innerHeight) return 0;
    let c = 0; for (let i = 0; i < n; i++) { const q = b.w[i].getBoundingClientRect(); if (q.top + q.height / 2 < linea) c = i + 1; }
    return c >= n ? n + 2 : c;
  };
  let bloques = [], andando = false, t0 = 0;
  const cuadro = (t) => {
    const dt = Math.min(200, t - t0); t0 = t; let falta = false;
    for (const b of bloques) {
      if (b.k === b.kt) continue;
      const cada = Math.max(18, 70 - Math.abs(b.kt - b.k) * 6); b.acc += dt;
      while (b.acc >= cada && b.k !== b.kt) {
        b.acc -= cada; const k = b.k + Math.sign(b.kt - b.k), lo = Math.max(0, Math.min(k, b.k) - 3), hi = Math.min(b.w.length, Math.max(k, b.k) + 3);
        for (let i = lo; i < hi; i++) { const e = estado(i, k); if (e !== estado(i, b.k)) pon(b, i, e); }
        b.k = k;
      }
      if (b.k !== b.kt) falta = true; else b.acc = 0;
    }
    if (falta) requestAnimationFrame(cuadro); else andando = false;
  };
  const mide = () => { for (const b of bloques) if (!b.fijo) b.kt = objetivo(b); if (!andando) { andando = true; t0 = performance.now(); requestAnimationFrame(cuadro); } };
  let pend = false; const pide = () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; mide(); }); } };
  function prepara(cambio) {
    const leidos = new Set(bloques.filter((b) => b.k >= b.w.length).map((b) => b.el));
    H0.clear(); H1.clear();
    bloques = [...document.querySelectorAll(LUZ)].map((el) => ({ el, w: palabras(el), k: 0, kt: 0, acc: 0, fijo: false })).filter((b) => b.w.length > 1);
    for (const b of bloques) {
      const r = b.el.getBoundingClientRect(), n = b.w.length;
      if (leidos.has(b.el) || r.bottom < 0) { b.k = b.kt = n + 2; b.fijo = true; continue; } // ya leído (o por encima): encendido
      // al cambiar de idioma, lo que está a la vista sigue encendido, sin volver a apagarse y encenderse (dueño, 23 nov 12:15)
      if (cambio === true && r.top < innerHeight && r.bottom > 0) { b.k = b.kt = n + 2; b.fijo = true; continue; }
      b.w.forEach((_, i) => pon(b, i, 2));
      if (r.top < innerHeight && r.bottom > 0) { b.fijo = true; b.kt = n + 2; } // a la vista al llegar: se enciende entero
    }
    setTimeout(mide, 180);
  }
  addEventListener('scroll', pide, { passive: true }); addEventListener('resize', pide);
  document.addEventListener('elixire-idioma', () => requestAnimationFrame(() => prepara(true)));
  prepara();
})();
