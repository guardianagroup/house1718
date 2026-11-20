// Elixire · las escenas al bajar (19 nov 2026).
// Dueño, 17:38–17:39: «cuando bajo… no está hecho como en GUARDIANA… hazlo como en GUARDIANA, mucho más profesional… convincente…
// la tecnología, cómo nos diferenciamos, por qué elegirnos». Como en la portada de GUARDIANA: cada escena se queda fija a pantalla
// completa mientras se baja, y lo que cuenta avanza paso a paso con el dedo (un titular, una imagen que cambia, un dato que cuenta).
// Cada escena dice cuántos pasos tiene (data-pasos) y cada pieza desde qué paso se ve (data-desde) y, si se va, hasta cuál
// (data-hasta). Aquí solo se calcula en qué paso está cada escena y su avance (--p, de 0 a 1); el resto es CSS. Las cifras
// cuentan al llegar (data-cuenta). Con «reducir movimiento» no se fija nada: se ve todo, quieto.
'use strict';
(() => {
  const escenas = [...document.querySelectorAll('.escena')];
  if (!escenas.length) return;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (quieto) { document.documentElement.classList.add('escenas-quietas'); for (const el of document.querySelectorAll('.escena [data-desde]')) el.classList.add('ya'); return; }
  document.documentElement.classList.add('escenas-vivas');

  // ---- las cifras que cuentan (16.600, 25,6, 450,7…) con su formato español o inglés ----
  const ingles = () => document.documentElement.lang === 'en';
  function formatea(v, dec) { return v.toLocaleString(ingles() ? 'en-US' : 'es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always' }); }
  function cuenta(el) {
    if (el._contada) return; el._contada = true;
    const fin = parseFloat(el.dataset.cuenta), dec = (el.dataset.cuenta.split('.')[1] || '').length, t0 = performance.now(), dur = 1400;
    const paso = (t) => { const u = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - u, 3); el.textContent = formatea(fin * e, dec); if (u < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }
  document.addEventListener('elixire-idioma', () => { for (const el of document.querySelectorAll('[data-cuenta]')) if (el._contada) el.textContent = formatea(parseFloat(el.dataset.cuenta), (el.dataset.cuenta.split('.')[1] || '').length); });

  // las cifras fuera de las escenas fijas cuentan al entrar en pantalla
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { for (const x of es) if (x.isIntersecting) { cuenta(x.target); io.unobserve(x.target); } }, { rootMargin: '0px 0px -12% 0px' });
    for (const el of document.querySelectorAll('[data-cuenta]')) if (!el.closest('.escena')) { el.textContent = formatea(0, (el.dataset.cuenta.split('.')[1] || '').length); io.observe(el); }
  }

  // ---- el paso de cada escena ----
  function pinta() {
    pendiente = false;
    const alto = innerHeight;
    for (const e of escenas) {
      const r = e.getBoundingClientRect();
      if (r.bottom < -alto || r.top > alto * 1.5) continue;
      const total = Math.max(1, r.height - alto), p = Math.max(0, Math.min(1, -r.top / total)), n = +e.dataset.pasos || 1;
      e.style.setProperty('--p', p.toFixed(4));
      // el primer paso ya se ve al llegar la escena; los demás, repartidos a lo largo del recorrido
      const paso = r.top > alto * 0.35 ? -1 : Math.min(n - 1, Math.floor(p * n * 0.999 + 0.0001));
      if (e._paso === paso) continue;
      e._paso = paso; e.dataset.paso = String(paso);
      for (const el of e.querySelectorAll('[data-desde]')) {
        const ya = +el.dataset.desde <= paso && (el.dataset.hasta == null || paso <= +el.dataset.hasta);
        el.classList.toggle('ya', ya);
        if (ya) for (const c of (el.matches('[data-cuenta]') ? [el] : el.querySelectorAll('[data-cuenta]'))) cuenta(c);
      }
    }
  }
  let pendiente = false;
  const pide = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(pinta); } };
  addEventListener('scroll', pide, { passive: true });
  addEventListener('resize', pide);
  pinta();

  // ---- la escena de «Comprobar»: una malla de 68 puntos que se dibuja sola (la misma que se ve en la llamada) ----
  const malla = document.getElementById('malla-escena');
  if (malla && window.ElixireComprueba && window.ElixireComprueba.delaunay) {
    const P = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); P.push([100 - Math.cos(a) * 62, 96 + Math.sin(a) * 78]); }
    for (let i = 0; i < 5; i++) P.push([53 + i * 9, 62 - 4 * Math.sin(Math.PI * i / 4)]);
    for (let i = 0; i < 5; i++) P.push([111 + i * 9, 58 + 4 * Math.sin(Math.PI * i / 4)]);
    for (let i = 0; i < 4; i++) P.push([100, 73 + i * 10]);
    for (let i = 0; i < 5; i++) P.push([88 + i * 6, 113 + (i === 2 ? 2 : 0)]);
    const ojo = (cx) => [[cx - 11, 80], [cx - 6, 76], [cx + 1, 76], [cx + 6, 80], [cx + 1, 83], [cx - 6, 83]];
    P.push(...ojo(78), ...ojo(122));
    for (let i = 0; i < 12; i++) { const a = 2 * Math.PI * i / 12; P.push([100 - 20 * Math.cos(a), 134 + 8 * Math.sin(a)]); }
    for (let i = 0; i < 8; i++) { const a = 2 * Math.PI * i / 8; P.push([100 - 12 * Math.cos(a), 134 + 3 * Math.sin(a)]); }
    const T = window.ElixireComprueba.delaunay(P), NS = 'http://www.w3.org/2000/svg';
    const g1 = document.createElementNS(NS, 'g'); g1.setAttribute('class', 'malla-lineas');
    let d = ''; for (const [a, b, c] of T) d += 'M' + P[a] + 'L' + P[b] + 'L' + P[c] + 'Z';
    const camino = document.createElementNS(NS, 'path'); camino.setAttribute('d', d); g1.append(camino);
    const g2 = document.createElementNS(NS, 'g'); g2.setAttribute('class', 'malla-puntos');
    P.forEach(([x, y], i) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 1.6); c.style.setProperty('--i', i); g2.append(c); });
    malla.append(g1, g2);
  }
})();

// ---- al bajar: el botón de la portada se va y la cabecera gana fondo (dueño, 23:10: el botón se montaba sobre «ELIXIRE») ----
(() => {
  const raiz = document.documentElement; let pend = false;
  const mira = () => { pend = false; raiz.classList.toggle('bajado', scrollY > innerHeight * 0.22); };
  addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(mira); } }, { passive: true });
  mira();
})();
