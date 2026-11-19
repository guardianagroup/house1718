// Elixire · la portada y el monolito (19 nov 2026).
// Dueño, 11:36: «debajo del monolito, solo un botón: Empezar prueba… y una vez que empiezas la prueba, ya te dice tengo un código».
// «Empezar prueba» parte el monolito (sala3d.js) y dentro aparecen «Crear un código» y «Tengo un código»; con el código, la sala
// (sala.js). Al bajar, la misma sala se oscurece y debajo van el riesgo, la solución, la comparación, la tecnología y el acceso.
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const M = window.ElixireMotor;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tr = (k) => (window.ElixireIdioma ? window.ElixireIdioma.t(k) : k);
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  // dentro de un marco de otra web, no se enseña nada (nadie puede poner botones encima)
  if (/(^|\.)house1718\.com$/.test(location.hostname) && window.top !== window.self) { document.documentElement.textContent = ''; return; }

  // sin WebGL, el monolito en CSS
  addEventListener('load', () => setTimeout(() => { if (!window.Sala3D) document.body.classList.add('sin-3d'); }, 1500));

  // al bajar, la sala se oscurece poco a poco (la cabecera también)
  const raiz = document.documentElement;
  const ponBajada = () => raiz.style.setProperty('--bajada', Math.min(1, scrollY / (innerHeight * 0.75)).toFixed(3));
  addEventListener('scroll', ponBajada, { passive: true }); ponBajada();

  // ---- las cifras del fraude, de una en una, encima del botón ----
  const CIFRAS = [['c1v', 'c1t', 'c1f'], ['c2v', 'c2t', 'c2f'], ['c3v', 'c3t', 'c3f'], ['c4v', 'c4t', 'c4f']];
  const cifra = $('#cifra'); let ci = 0;
  function pintaCifra() {
    const [v, t, f] = CIFRAS[ci], partes = [['.valor', v], ['.texto', t], ['.fuente', f]];
    for (const [sel, k] of partes) { const e = cifra.querySelector(sel); e.dataset.t = k; e.textContent = tr(k); }
  }
  if (!quieto) setInterval(() => {
    if (document.hidden || abierta || scrollY > innerHeight * 0.5) return;
    cifra.classList.add('cambia');
    setTimeout(() => { ci = (ci + 1) % CIFRAS.length; pintaCifra(); cifra.classList.remove('cambia'); }, 700);
  }, 6500);

  // ---- abrir y cerrar el monolito ----
  let abierta = null, ocupado = false;
  const paneles = () => [...document.querySelectorAll('.panel')];
  function muestra(cual) {
    for (const p of paneles()) {
      if (p.id === 'panel-' + cual) { p.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('visible'))); }
      else { p.classList.remove('visible'); p.hidden = true; }
    }
    abierta = cual;
    const foco = cual === 'tengo' ? $('#campo-codigo') : cual === 'elige' ? $('#crear') : $('#copiar');
    setTimeout(() => foco && foco.focus({ preventScroll: true }), quieto ? 0 : 450);
  }
  function ocultaPaneles() { for (const p of paneles()) { p.classList.remove('visible'); p.hidden = true; } }
  async function abre() {
    if (ocupado || abierta) return; ocupado = true;
    try {
      if (scrollY > 4) { scrollTo({ top: 0, behavior: quieto ? 'auto' : 'smooth' }); await espera(quieto ? 0 : 800); }
      document.body.classList.add('cerrado');
      if (M) M.prepara(); // el relé, solo desde ahora
      $('#consola').classList.add('fuera');
      if (window.Sala3D) await window.Sala3D.abre(); else { $('#monolito-css').classList.add('abierto'); await espera(quieto ? 0 : 1400); }
      ponError('elige', '');
      muestra('elige');
    } finally { ocupado = false; }
  }
  async function cierra() {
    if (ocupado || !abierta) return; ocupado = true;
    try {
      if (M && M.activa) M.termina('cancela');
      ocultaPaneles(); abierta = null;
      await espera(quieto ? 0 : 300);
      if (window.Sala3D) { const fin = window.Sala3D.cierra(); setTimeout(() => $('#consola').classList.remove('fuera'), quieto ? 0 : 1300); await fin; }
      else { $('#monolito-css').classList.remove('abierto'); await espera(quieto ? 0 : 900); $('#consola').classList.remove('fuera'); }
      document.body.classList.remove('cerrado');
      $('#empezar').focus({ preventScroll: true });
    } finally { ocupado = false; }
  }
  $('#empezar').addEventListener('click', abre);
  for (const b of document.querySelectorAll('[data-empezar]')) b.addEventListener('click', abre);
  for (const b of document.querySelectorAll('[data-cerrar-camara]')) b.addEventListener('click', cierra);
  for (const b of document.querySelectorAll('[data-volver-elige]')) b.addEventListener('click', () => { if (M && M.activa) M.termina('cancela'); paraReloj(); ponError('elige', ''); muestra('elige'); });

  const ERRORES = { formato: 'faltan', 'no-vale': 'eNoVale', 'sin-rele': 'eSinRele', 'sin relé': 'eSinRele', 'sin respuesta': 'eSinRele', 'sin-pq': 'eSinPq', 'demasiados intentos': 'eDemasiados', 'sin-codigo': 'eSinCodigo' };
  function ponError(donde, por) { const e = $(donde === 'tengo' ? '#error-codigo' : '#error-elige'); e.textContent = por ? tr(ERRORES[por] || 'eSinRele') : ''; }

  // ---- crear un código ----
  let reloj = null;
  function paraReloj() { clearInterval(reloj); reloj = null; }
  $('#crear').addEventListener('click', async () => {
    if (!M) return;
    const e = $('#codigo'); e.textContent = '···· ···· ···· ····'; delete e.dataset.codigo;
    $('#estado-crear').dataset.t = 'creando'; $('#estado-crear').textContent = tr('creando');
    muestra('crear');
    const r = await M.crea();
    if (abierta !== 'crear') return;
    if (!r.ok) { if (r.por !== 'fin') { ponError('elige', r.por); muestra('elige'); } return; }
    e.dataset.codigo = r.codigo; e.textContent = r.codigo.replace(/(.{4})(?=.)/g, '$1 ');
    ponEstado('esperando');
    paraReloj();
    reloj = setInterval(() => { if (abierta !== 'crear') return paraReloj(); if (Date.now() > r.caduca && !(M.conectada)) { paraReloj(); ponEstado('caducado'); } }, 1000);
  });
  function ponEstado(k) { const x = $('#estado-crear'); x.dataset.t = k; x.textContent = tr(k); }
  $('#copiar').addEventListener('click', async () => {
    const c = $('#codigo').dataset.codigo; if (!c) return;
    const s = $('#copiar span');
    try { await navigator.clipboard.writeText(c); s.dataset.t = 'copiado'; s.textContent = tr('copiado'); setTimeout(() => { s.dataset.t = 'copiar'; s.textContent = tr('copiar'); }, 1800); } catch (_) {}
  });

  // ---- tengo un código ----
  const normaliza = (t) => String(t || '').normalize('NFKC').toUpperCase().replace(/[\s\-‐-―−.·]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  const campo = $('#campo-codigo');
  $('#tengo').addEventListener('click', () => { campo.value = ''; ponError('tengo', ''); botonEntrar(false); muestra('tengo'); });
  campo.addEventListener('input', () => {
    const limpio = normaliza(campo.value).replace(/[^0-9A-HJKMNP-TV-Z]/g, '').slice(0, 16);
    const nuevo = limpio.replace(/(.{4})(?=.)/g, '$1 ');
    if (campo.value !== nuevo) campo.value = nuevo;
    ponError('tengo', '');
  });
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#entrar').click(); });
  function botonEntrar(conectando) { const b = $('#entrar'), s = b.querySelector('span'); b.disabled = conectando; s.dataset.t = conectando ? 'conectando' : 'entrar'; s.textContent = tr(s.dataset.t); }
  $('#entrar').addEventListener('click', async () => {
    if (!M) return;
    const c = normaliza(campo.value);
    if (!/^[0-9A-HJKMNP-TV-Z]{16}$/.test(c)) { ponError('tengo', 'formato'); campo.focus(); return; }
    botonEntrar(true);
    const r = await M.entra(c);
    if (abierta !== 'tengo') return;
    if (!r.ok) { botonEntrar(false); ponError('tengo', r.por); return; }
    // dentro: en cuanto las claves estén acordadas, la sala (sala.js); si la otra persona ya no está, se dice
    setTimeout(() => { if (abierta === 'tengo' && M.activa && !M.conectada) { botonEntrar(false); ponError('tengo', 'sin-rele'); } }, 30000);
  });

  // lo que dice el motor mientras se espera
  if (M) {
    M.on('codigo-usado', () => { if (abierta === 'crear') ponEstado('alguienEntra'); });
    M.on('llega', () => { if (abierta === 'crear') ponEstado('llegaOtra'); });
    M.on('ocupada', () => { if (abierta === 'tengo') { botonEntrar(false); ponError('tengo', 'no-vale'); } });
    M.on('conectado', () => { paraReloj(); ocultaPaneles(); abierta = 'sala'; });
    M.on('fin', () => { paraReloj(); if (abierta === 'crear' || abierta === 'tengo') { botonEntrar(false); } });
  }
  // la sala terminó: el monolito se cierra y vuelve la portada
  async function vuelve() {
    abierta = 'sala'; ocupado = false;
    if (window.Sala3D) { const fin = window.Sala3D.cierra(); setTimeout(() => $('#consola').classList.remove('fuera'), quieto ? 0 : 1300); await fin; }
    else { $('#monolito-css').classList.remove('abierto'); $('#consola').classList.remove('fuera'); }
    abierta = null; document.body.classList.remove('cerrado');
  }
  window.Elixire = Object.assign(window.Elixire || {}, { abre, cierra, vuelve, ocultaPaneles, abierta: () => abierta });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierta && abierta !== 'sala') cierra(); });
  // con una conversación abierta, el navegador pregunta antes de salir (al salir, se borra)
  addEventListener('beforeunload', (e) => { if (M && M.activa) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('elixire-idioma', () => pintaCifra());
})();
