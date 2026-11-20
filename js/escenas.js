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
    // los 68 puntos de una cara real (generada con IA, de dominio público), calculados con el mismo detector que usa «Comprobar»
    const P = [[104.1,294.2],[106.7,348.3],[114.1,398.5],[122.4,442.6],[138.9,491.3],[168.4,528.1],[206.1,553],[253.1,576.2],[316.2,591],[375.6,577],[408.7,555.7],[435.1,534],[458.7,496],[475.4,449.1],[483.1,404.9],[490.8,358.7],[493.1,309],[168.5,254.5],[194.8,238.2],[226.8,233.8],[254.7,236.4],[279.4,245.5],[375.9,247.6],[398.4,240.4],[422.4,237.4],[451,242.7],[468.1,258.3],[326.9,300.8],[328.9,332.9],[331.4,363.1],[330.6,391.1],[292.5,410.5],[307.8,415.5],[325.4,419],[343,414.5],[355.9,412.6],[206.3,293.8],[226.4,289],[250.1,289.1],[269.5,299.8],[252.1,307.4],[226.5,304.8],[370.1,301.5],[392.6,291.3],[417.8,291.6],[430.5,300.8],[414.2,309.8],[390.4,307.7],[247.2,473.7],[276.6,462.3],[309.8,454.1],[324.9,457.3],[339.5,453.7],[368.9,464.4],[391.4,475.3],[366.5,488.8],[346.4,496.6],[322.9,499.1],[301.2,496.8],[277.1,489.3],[251.2,474],[300.7,471],[323.5,471.4],[344.1,471.9],[385.6,473.9],[344.9,474.8],[323.8,476],[302.5,475.3]];
    const T = window.ElixireComprueba.delaunay(P), NS = 'http://www.w3.org/2000/svg';
    const g1 = document.createElementNS(NS, 'g'); g1.setAttribute('class', 'malla-lineas');
    let d = ''; for (const [a, b, c] of T) d += 'M' + P[a] + 'L' + P[b] + 'L' + P[c] + 'Z';
    const camino = document.createElementNS(NS, 'path'); camino.setAttribute('d', d); g1.append(camino);
    const g2 = document.createElementNS(NS, 'g'); g2.setAttribute('class', 'malla-puntos');
    P.forEach(([x, y], i) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 3.4); c.style.setProperty('--i', i); g2.append(c); });
    const g3 = document.createElementNS(NS, 'path'); g3.setAttribute('class', 'esquinas'); g3.setAttribute('d', 'M58,172V124H106 M491,124H539V172 M539,573V621H491 M106,621H58V573');
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
