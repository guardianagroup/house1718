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
      // (dueño, 22 nov 18:06: «tarda mucho en salir… que aparezca todo en el momento perfecto y exacto»): el titular sale mientras la
      // escena entra por abajo; el texto y la imagen, justo cuando se queda fija; los demás pasos, en los primeros tres cuartos del
      // recorrido (el último queda a la vista el resto)
      const paso = r.top > alto * 0.72 ? -1 : r.top > alto * 0.2 ? 0 : Math.min(n - 1, 1 + Math.floor(Math.min(0.999, p / 0.75) * (n - 1)));
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
    // los 68 puntos de una cara real (generada con IA, de dominio público), calculados con el mismo detector que usa «Comprobar»
    const P = [[97.3,203],[99,232.8],[104,261.8],[109.2,287.5],[117.8,317.4],[131.7,341.1],[147.8,359.2],[169.9,380.4],[206.8,392.4],[245.2,381],[271.7,361.4],[292.6,344.5],[309.2,319.3],[320.5,289.3],[325.9,261.1],[330.3,232.3],[332.6,201],[113.4,171.7],[124.7,160.2],[141.9,156.4],[158.3,157.6],[173.4,163.5],[235.1,162.2],[250.9,156.3],[268.4,153.3],[288.7,156.8],[304,168.5],[203.2,199.9],[201.7,221.2],[200.1,239.9],[199.1,257.3],[181.4,266.7],[189.8,270.7],[202.4,272.6],[214.7,269.5],[225.3,267.3],[135.3,197],[144.3,192.4],[159.8,192.4],[173.7,199.9],[161.5,204.6],[145.6,203],[238.6,199],[252.1,190.7],[268.3,190.4],[279.7,196.7],[268.1,202.7],[251.5,202],[151.4,300.6],[166.8,292.4],[189.9,288.8],[202.3,290.6],[214.7,287.8],[241.9,293.4],[263.4,301],[240.7,326.1],[222.1,337.1],[202.6,341],[185.8,338.2],[168.5,327.7],[154,301.3],[185.3,297.8],[203.1,298.4],[220.7,299.1],[259.3,300.9],[220.9,323.2],[203.2,325.9],[186.7,324.1]];
    const T = window.ElixireComprueba.delaunay(P), NS = 'http://www.w3.org/2000/svg';
    const g1 = document.createElementNS(NS, 'g'); g1.setAttribute('class', 'malla-lineas');
    let d = ''; for (const [a, b, c] of T) d += 'M' + P[a] + 'L' + P[b] + 'L' + P[c] + 'Z';
    const camino = document.createElementNS(NS, 'path'); camino.setAttribute('d', d); g1.append(camino);
    const g2 = document.createElementNS(NS, 'g'); g2.setAttribute('class', 'malla-puntos');
    P.forEach(([x, y], i) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 2.3); c.style.setProperty('--i', i); g2.append(c); });
    const g3 = document.createElementNS(NS, 'path'); g3.setAttribute('class', 'esquinas'); g3.setAttribute('d', 'M67,113V81H99 M331,81H363V113 M363,380V412H331 M99,412H67V380');
    malla.append(g1, g2, g3);
  }
})();

// ---- al bajar: el botón de la portada se va y la cabecera gana fondo (dueño, 23:10: el botón se montaba sobre «ELIXIRE») ----
(() => {
  const raiz = document.documentElement; let pend = false;
  // la roca se despide al bajar (dueño, 23:14: «que no se vea de fondo la piedra… transición profesional»): entre el 10 % y el 75 % de la
  // primera pantalla se funde con el negro y se aleja un poco; al subir, vuelve
  const mira = () => {
    pend = false; const t = scrollY / innerHeight; raiz.classList.toggle('bajado', t > 0.22);
    let x = Math.max(0, Math.min(1, (t - 0.1) / 0.65)); x = x * x * (3 - 2 * x);
    raiz.style.setProperty('--salida', x.toFixed(3)); raiz.classList.toggle('sin-roca', x >= 0.999);
  };
  addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(mira); } }, { passive: true });
  mira();
})();
