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

  // ---- las cifras que cuentan, con su formato español o inglés (3.100 / 3,100) ----
  const ingles = () => document.documentElement.lang === 'en';
  function formatea(v, dec) { return v.toLocaleString(ingles() ? 'en-US' : 'es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always' }); }
  if (quieto) {
    document.documentElement.classList.add('escenas-quietas'); for (const el of document.querySelectorAll('.escena [data-desde]')) el.classList.add('ya');
    // quietas, pero con el formato de cada idioma
    const fija = () => { for (const el of document.querySelectorAll('[data-cuenta]')) el.textContent = formatea(parseFloat(el.dataset.cuenta), (el.dataset.cuenta.split('.')[1] || '').length); };
    fija(); document.addEventListener('elixire-idioma', fija);
    return;
  }
  document.documentElement.classList.add('escenas-vivas');
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
