// Elixire · la puerta acorazada y la pantalla (19 nov 2026).
// Al pulsar «Crear un código» o «Tengo un código»: gira el volante, se retiran los cerrojos, la puerta se separa del marco y se
// abre en 3D sobre sus bisagras; dentro de la cámara aparece el panel. Todo en la misma pantalla, sin bajar. Las hojas («Por qué
// nace Elixire», «Cómo te escuchan»…) se abren encima, sobre cristal. Sin dependencias.
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const boveda = $('#boveda'), consola = $('#consola');
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = { volante: quieto ? 0 : 1150, puerta: quieto ? 0 : 1900, cierre: quieto ? 0 : 1500 };

  // ---- piezas repetidas de la puerta (tornillos del anillo y cerrojos) ----
  const tornillos = boveda.querySelector('.tornillos'), cerrojos = boveda.querySelector('.cerrojos');
  for (let i = 0; i < 24; i++) { const t = document.createElement('span'); t.className = 'tornillo'; t.style.setProperty('--a', (i * 15 + 7.5) + 'deg'); tornillos.appendChild(t); }
  for (let i = 0; i < 12; i++) {
    const a = i * 30 + 15; if (a === 75 || a === 105) continue; // abajo va la placa grabada
    const c = document.createElement('span'); c.className = 'cerrojo'; c.style.setProperty('--a', a + 'deg');
    const g = document.createElement('span'); g.className = 'guia'; const b = document.createElement('span'); b.className = 'barra';
    c.append(g, b); cerrojos.appendChild(c);
  }

  // ---- la puerta sigue un poco la mirada (solo cerrada y sin «menos movimiento») ----
  const inclina = $('#inclina');
  if (!quieto && matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      if (abierta || ocupado) return;
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      inclina.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg'); inclina.style.setProperty('--rx', (-y * 5).toFixed(2) + 'deg');
    });
    document.addEventListener('pointerleave', () => { inclina.style.setProperty('--ry', '0deg'); inclina.style.setProperty('--rx', '0deg'); });
  }

  // ---- abrir y cerrar la cámara ----
  let ocupado = false, abierta = null;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  async function abre(cual) {
    if (ocupado || abierta) return; ocupado = true;
    inclina.style.setProperty('--ry', '0deg'); inclina.style.setProperty('--rx', '0deg');
    consola.classList.add('fuera');
    if (window.Sala3D) await window.Sala3D.abre();
    else {
      boveda.classList.remove('cierra');
      boveda.classList.add('desbloquea');
      await espera(T.volante);
      boveda.classList.add('abre');
      await espera(T.puerta);
      boveda.classList.add('abierta'); boveda.classList.remove('abre');
    }
    const p = $('#panel-' + cual); p.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('visible')));
    abierta = cual; ocupado = false;
    document.dispatchEvent(new CustomEvent('elixire-camara', { detail: { cual } }));
    const foco = cual === 'tengo' ? $('#campo-codigo') : $('#copiar'); setTimeout(() => foco && foco.focus(), quieto ? 0 : 500);
  }
  async function cierra() {
    if (ocupado || !abierta) return; ocupado = true;
    const p = $('#panel-' + abierta); p.classList.remove('visible');
    document.dispatchEvent(new CustomEvent('elixire-cierra', { detail: { cual: abierta } }));
    await espera(quieto ? 0 : 450); p.hidden = true;
    if (window.Sala3D) { const fin = window.Sala3D.cierra(); setTimeout(() => consola.classList.remove('fuera'), quieto ? 0 : 1300); await fin; }
    else {
      boveda.classList.remove('abierta'); boveda.classList.add('cierra');
      await espera(T.cierre);
      boveda.classList.remove('desbloquea');
      await espera(T.volante * 0.8);
      boveda.classList.remove('cierra'); consola.classList.remove('fuera');
    }
    abierta = null; ocupado = false;
    $('#crear').focus();
  }
  window.Elixire = Object.assign(window.Elixire || {}, { abre, cierra, abierta: () => abierta });
  $('#crear').addEventListener('click', () => abre('crear'));
  $('#tengo').addEventListener('click', () => abre('tengo'));
  for (const b of document.querySelectorAll('[data-cerrar-camara]')) b.addEventListener('click', cierra);

  // ---- el código: 16 símbolos del alfabeto Crockford, en cuatro grupos ----
  const ALFA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const normaliza = (t) => String(t || '').normalize('NFKC').toUpperCase().replace(/[\s\-‐-―−.·]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  const bonito = (s) => s.replace(/(.{4})(?=.)/g, '$1 ');
  const campo = $('#campo-codigo'), error = $('#error-codigo');
  campo.addEventListener('input', () => {
    const limpio = normaliza(campo.value).replace(/[^0-9A-HJKMNP-TV-Z]/g, '').slice(0, 16);
    const nuevo = bonito(limpio);
    if (campo.value !== nuevo) campo.value = nuevo;
    error.textContent = '';
  });
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#entrar').click(); });
  const tr = (k) => (window.ElixireIdioma ? window.ElixireIdioma.t(k) : k);
  $('#entrar').addEventListener('click', () => {
    const c = normaliza(campo.value);
    if (!/^[0-9A-HJKMNP-TV-Z]{16}$/.test(c)) { error.textContent = tr('faltan'); campo.focus(); return; }
    document.dispatchEvent(new CustomEvent('elixire-entrar', { detail: { codigo: c } }));
  });
  $('#copiar').addEventListener('click', async () => {
    const c = $('#codigo').dataset.codigo; if (!c) return;
    const e = $('#copiar span');
    try { await navigator.clipboard.writeText(c); e.textContent = tr('copiado'); setTimeout(() => { e.textContent = tr('copiar'); }, 1800); } catch (_) {}
  });
  // el código que se enseña lo pone el motor de la conversación (Elixire.ponCodigo); sin motor, la vista previa enseña uno al azar
  window.Elixire.ponCodigo = (c) => { const e = $('#codigo'); e.dataset.codigo = c; e.textContent = bonito(c); };
  window.Elixire.ponEstado = (t) => { $('#estado-crear').textContent = t; };
  window.Elixire.ponError = (t) => { error.textContent = t; };
  document.addEventListener('elixire-camara', (e) => {
    if (e.detail.cual !== 'crear' || window.Elixire.motor) return;
    const b = crypto.getRandomValues(new Uint8Array(16)); let s = ''; for (const x of b) s += ALFA[x & 31];
    window.Elixire.ponCodigo(s);
  });

  // ---- hojas ----
  const velo = $('#velo'); let hojaAbierta = null, volverA = null;
  function abreHoja(id) {
    cierraHoja();
    const h = $('#hoja-' + id); if (!h) return;
    volverA = document.activeElement; velo.hidden = false; h.hidden = false; hojaAbierta = h;
    const b = h.querySelector('[role="tab"][aria-selected="true"]') || h.querySelector('[data-cerrar]'); if (b) b.focus();
  }
  function cierraHoja() {
    if (!hojaAbierta) return;
    hojaAbierta.hidden = true; velo.hidden = true; hojaAbierta = null;
    if (volverA && volverA.focus) volverA.focus();
  }
  for (const b of document.querySelectorAll('[data-hoja]')) b.addEventListener('click', () => abreHoja(b.dataset.hoja));
  // pestañas de «Elixire»: una sola hoja con las cuatro partes
  const tabs = [...document.querySelectorAll('.pestanas [role="tab"]')];
  function eligeTab(b) {
    for (const x of tabs) { const sel = x === b; x.setAttribute('aria-selected', String(sel)); x.tabIndex = sel ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !sel; }
  }
  for (const b of tabs) {
    b.addEventListener('click', () => eligeTab(b));
    b.addEventListener('keydown', (e) => { const i = tabs.indexOf(b); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; eligeTab(n); n.focus(); e.preventDefault(); } });
  }
  for (const b of document.querySelectorAll('[data-cerrar]')) b.addEventListener('click', cierraHoja);
  velo.addEventListener('click', cierraHoja);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (hojaAbierta) cierraHoja(); else if (abierta) cierra(); } });
})();
