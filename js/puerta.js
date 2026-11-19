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

  // ---- abrir y cerrar el monolito ----
  let abierta = null, ocupado = false;
  // Dueño, 13:07: en la página no se selecciona, no se copia, no se pega ni sale el menú del botón derecho; solo responden
  // los botones. Se escribe (y se pega) únicamente en la casilla del código y en la del mensaje.
  const escribible = (t) => !!(t && t.closest && t.closest('input, textarea'));
  for (const tipo of ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart']) {
    document.addEventListener(tipo, (e) => { if (!escribible(e.target)) e.preventDefault(); }, true);
  }
  // copiar lo escrito en el chat tampoco: solo pegar y escribir
  for (const tipo of ['copy', 'cut']) document.addEventListener(tipo, (e) => { if (escribible(e.target) && e.target.id === 'texto') e.preventDefault(); }, true);
  const paneles = () => [...document.querySelectorAll('.panel')];
  function muestra(cual, focoEn) {
    for (const p of paneles()) {
      if (p.id === 'panel-' + cual) { p.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('visible'))); }
      else { p.classList.remove('visible'); p.hidden = true; }
    }
    abierta = cual;
    const foco = focoEn || (cual === 'tengo' ? $('#campo-codigo') : cual === 'elige' ? $('#crear') : cual === 'movil' ? $('#movil-continuar') : $('#copiar'));
    setTimeout(() => foco && foco.focus({ preventScroll: true }), quieto ? 0 : 450);
  }
  function ocultaPaneles() { for (const p of paneles()) { p.classList.remove('visible'); p.hidden = true; } }
  // Pantalla completa (dueño, 12:30: «cuando entro a la página web, quiero que salga ya en pantalla completa»). Los navegadores no
  // dejan que una página se ponga a pantalla completa sola al cargar: hace falta un gesto. Se pide con «Empezar prueba»,
  // antes de cualquier espera, para que cuente como gesto de la persona. Esc la quita.
  function pantallaCompleta() {
    const r = document.documentElement;
    if (document.fullscreenElement || !r.requestFullscreen || matchMedia('(display-mode: fullscreen)').matches) return;
    try { const p = r.requestFullscreen({ navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (_) {}
  }
  // el botón de la cabecera (dueño, 12:31: «una en pantalla que sea maximizar la pantalla»): entra y sale de la pantalla completa
  const bPantalla = $('#pantalla');
  const ICONO = { entrar: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', salir: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' };
  function pintaPantalla() {
    const dentro = !!document.fullscreenElement;
    $('#pantalla-icono').setAttribute('d', dentro ? ICONO.salir : ICONO.entrar);
    bPantalla.setAttribute('aria-label', tr(dentro ? 'salirPantalla' : 'pantallaCompleta')); bPantalla.title = bPantalla.getAttribute('aria-label');
  }
  if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
    bPantalla.hidden = false;
    bPantalla.addEventListener('click', () => { if (document.fullscreenElement) { const p = document.exitFullscreen(); if (p && p.catch) p.catch(() => {}); } else pantallaCompleta(); });
    document.addEventListener('fullscreenchange', pintaPantalla);
    document.addEventListener('elixire-idioma', pintaPantalla);
    pintaPantalla();
  }
  async function abre() {
    if (ocupado || abierta) return; ocupado = true;
    pantallaCompleta();
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
  // en el móvil, el botón de la portada es «Invitar a una llamada» (abajo, invitaMovil); en el ordenador, «Empezar prueba»
  const empieza = () => (enMovil() ? invitaMovil() : abre());
  $('#empezar').addEventListener('click', empieza);
  for (const b of document.querySelectorAll('[data-empezar]')) b.addEventListener('click', empieza);
  for (const b of document.querySelectorAll('[data-cerrar-camara]')) b.addEventListener('click', () => { olvidaInvitacion(); cierra(); });
  // «Cancelar» y «Volver»: en el móvil, a la portada (no hay más pasos); en el ordenador, a elegir
  for (const b of document.querySelectorAll('[data-volver-elige]')) b.addEventListener('click', () => {
    if (M && M.activa) M.termina('cancela'); paraReloj(); olvidaInvitacion();
    if (enMovil()) { cierra(); return; }
    ponError('elige', ''); muestra('elige');
  });

  const ERRORES = { formato: 'faltan', 'no-vale': 'eNoVale', 'sin-rele': 'eSinRele', 'sin relé': 'eSinRele', 'sin respuesta': 'eSinRele', 'sin-pq': 'eSinPq', 'demasiados intentos': 'eDemasiados', 'sin-codigo': 'eSinCodigo' };
  function ponError(donde, por) { const e = $(donde === 'tengo' ? '#error-codigo' : '#error-elige'); e.textContent = por ? tr(ERRORES[por] || 'eSinRele') : ''; }

  // ---- crear un código ----
  let reloj = null;
  function paraReloj() { clearInterval(reloj); reloj = null; }
  // En el móvil (dueño, 14:35–14:39): «Invitar a una llamada» manda el enlace y espera; cuando la otra persona lo abre y toca
  // «Entrar a la llamada», la videollamada arranca sola en los dos lados, sin códigos. Las cuatro palabras salen sobre el vídeo.
  const enMovil = () => matchMedia('(max-width: 760px)').matches;
  let invitoLlamada = false;
  $('#crear').addEventListener('click', async () => {
    if (!M) return;
    if (enMovil()) return invitaMovil();
    invitoLlamada = false; olvidaInvitacion(); window.Elixire.contestaSola = false; window.Elixire.llamaAlEntrar = false;
    const e = $('#codigo'); e.textContent = '···· ···· ···· ····'; delete e.dataset.codigo;
    $('#copiar').disabled = false; ponWhatsApp(null); $('#panel-crear').classList.remove('enviada');
    $('#estado-crear').dataset.t = 'creando'; $('#estado-crear').textContent = tr('creando');
    muestra('crear');
    const r = await M.crea();
    if (abierta !== 'crear') return;
    if (!r.ok) { if (r.por !== 'fin') { ponError('elige', r.por); muestra('elige'); } return; }
    e.dataset.codigo = r.codigo; e.textContent = r.codigo.replace(/(.{4})(?=.)/g, '$1 ');
    ponWhatsApp(r.codigo);
    ponEstado('esperando');
    paraReloj();
    reloj = setInterval(() => { if (abierta !== 'crear') return paraReloj(); if (Date.now() > r.caduca && !(M.conectada)) { paraReloj(); ponEstado('caducado'); } }, 1000);
  });
  function ponEstado(k) { const x = $('#estado-crear'); x.dataset.t = k; x.textContent = tr(k); }
  // «Enviar por WhatsApp» (dueño, 14:07: «para enviar el código… que se envíe por WhatsApp»). El mensaje lleva un enlace con el
  // código en el fragmento («#c=»: el navegador no lo manda a ningún servidor; al abrirlo, el código queda puesto) y el código escrito.
  // Sirve una sola vez y caduca a los 10 minutos; al entrar, los dos ven las cuatro palabras.
  function ponWhatsApp(codigo) {
    const a = $('#whatsapp');
    if (!codigo) { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); delete a.dataset.codigo; delete a.dataset.texto; return; }
    const lengua = window.ElixireIdioma ? window.ElixireIdioma.actual() : 'en';
    const enlace = location.origin + '/#c=' + codigo + '&l=' + lengua;
    const texto = tr('mensajeWa').replace('{enlace}', enlace).replace('{codigo}', codigo.replace(/(.{4})(?=.)/g, '$1 '));
    a.href = 'https://wa.me/?text=' + encodeURIComponent(texto); a.removeAttribute('aria-disabled'); a.dataset.codigo = codigo; a.dataset.texto = texto;
  }

  // ---- invitar desde el móvil: un solo toque ----
  // Dueño, 15:15: «simplifícalo… con los mínimos clics posibles y súper fácil y entendible para cualquier persona de cualquier
  // edad»; «en la versión de móvil no hará falta meter el código, porque ya irá encriptado en la forma de enviarlo por WhatsApp».
  // «Invitar a una llamada» abre en el acto el menú «Compartir» del teléfono con la invitación (se elige WhatsApp y la persona);
  // detrás, la roca se abre y la página se queda esperando. La semilla (256 bits) nace aquí y va entera en el enlace, en el
  // fragmento (#e=…), que el navegador no manda a ningún servidor: no hay código. Si el teléfono cierra la página mientras se está
  // en WhatsApp (15:13: «cuando vuelve a la web ya le vuelve a decir otra vez lo mismo»), al volver se retoma la misma invitación:
  // se guarda solo en esta pestaña, 10 minutos como mucho, y se borra en cuanto empieza la llamada, se cancela o caduca.
  const GUARDA = 'elixire-invitacion', INVITACION_MS = 10 * 60 * 1000;
  const b64u = (x) => btoa(String.fromCharCode.apply(null, x)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const deB64u = (t) => { let b = t.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return Uint8Array.from(atob(b), (q) => q.charCodeAt(0)); };
  let invitacion = null; // { s: la semilla en base64url, t0 }
  function guardaInvitacion() { try { if (invitacion) sessionStorage.setItem(GUARDA, JSON.stringify(invitacion)); else sessionStorage.removeItem(GUARDA); } catch (_) {} }
  function olvidaInvitacion() { if (!invitacion) return; invitacion = null; guardaInvitacion(); }
  function textoInvitacion(sem) {
    const lengua = window.ElixireIdioma ? window.ElixireIdioma.actual() : 'en';
    // la tarjeta de WhatsApp (imagen y texto propios) está en /invitacion/ y /invitation/; al tocarla, esta página con el fragmento
    const enlace = location.origin + (lengua === 'es' ? '/invitacion/' : '/invitation/') + '#e=' + sem + '&l=' + lengua + '&ll=1';
    return tr('mensajeLlamada').replace('{enlace}', enlace);
  }
  function abreWhatsApp(texto) { try { const w = window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank'); if (w) { try { w.opener = null; } catch (_) {} } return !!w; } catch (_) { return false; } }
  // el menú «Compartir» tiene que abrirse en el mismo toque (el teléfono lo exige); sin él, WhatsApp directamente
  function comparte(texto) {
    if (navigator.share) { try { return navigator.share({ text: texto }).then(() => true, (x) => (x && x.name === 'AbortError' ? false : abreWhatsApp(texto))); } catch (_) {} }
    return Promise.resolve(abreWhatsApp(texto));
  }
  function ponEnlaceWa(texto) { const a = $('#whatsapp'); a.href = 'https://wa.me/?text=' + encodeURIComponent(texto); a.removeAttribute('aria-disabled'); a.dataset.texto = texto; delete a.dataset.codigo; }
  async function invitaMovil() {
    if (!M || ocupado || (abierta && abierta !== 'elige')) return;
    const semilla = crypto.getRandomValues(new Uint8Array(32));
    invitacion = { s: b64u(semilla), t0: Date.now() }; guardaInvitacion();
    const texto = textoInvitacion(invitacion.s);
    const compartida = comparte(texto);
    M.prepara();
    await abreInvitacion(semilla, texto, false);
    const ok = await compartida;
    if (abierta === 'crear' && invitacion) ponEnviada(ok);
  }
  async function abreInvitacion(semilla, texto, retomada) {
    if (!M || ocupado || (abierta && abierta !== 'elige')) return;
    ocupado = true;
    try {
      const yaAbierta = abierta === 'elige';
      if (scrollY > 4) scrollTo({ top: 0, behavior: 'auto' });
      document.body.classList.add('cerrado');
      M.prepara();
      invitoLlamada = true; window.Elixire.contestaSola = true; window.Elixire.llamaAlEntrar = false;
      ponEnlaceWa(texto);
      const panel = $('#panel-crear'); panel.classList.toggle('enviada', !!retomada); panel.classList.remove('caducada');
      ponEstado(retomada ? 'esperandoInicio' : 'esperandoLlamada');
      const r = M.invitaSemilla(semilla); // la sala, mientras se abre la roca
      if (!yaAbierta) { $('#consola').classList.add('fuera'); if (window.Sala3D) await window.Sala3D.abre(); else { $('#monolito-css').classList.add('abierto'); await espera(quieto ? 0 : 1400); } }
      const x = await r;
      if (!x.ok) { olvidaInvitacion(); ponError('elige', x.por); muestra('elige'); return; }
      if (!invitacion) return;
      muestra('crear', $('#cancelar-invitacion'));
      vigilaInvitacion();
    } finally { ocupado = false; }
  }
  function ponEnviada(ok) {
    if (abierta !== 'crear') return;
    $('#panel-crear').classList.toggle('enviada', !!ok);
    if (!/llega|alguien|caducad/.test($('#estado-crear').dataset.t || '')) ponEstado(ok ? 'esperandoInicio' : 'esperandoLlamada');
  }
  function vigilaInvitacion() {
    paraReloj();
    reloj = setInterval(() => {
      if (abierta !== 'crear' || !invitacion) return paraReloj();
      if (Date.now() - invitacion.t0 > INVITACION_MS && !M.conectada) {
        paraReloj(); M.termina('caduca'); olvidaInvitacion();
        $('#panel-crear').classList.add('enviada', 'caducada'); ponEstado('invitacionCaducada');
      }
    }, 1000);
  }
  // En el móvil se usa el menú «Compartir» del teléfono (se elige WhatsApp ahí): al enviar, el propio teléfono devuelve a esta página,
  // que se queda esperando (dueño, 14:39). Si el navegador no lo trae, el enlace directo a WhatsApp.
  // Enviada la invitación, la pantalla pasa a la espera (dueño, 15:05: «la pantalla tiene que poner esperando para iniciar la
  // llamada con la otra persona»): «Invitación enviada», un pulso tranquilo y «Cancelar». En cuanto la otra persona entra, la sala.
  function enviada() { ponEnviada(true); }
  $('#whatsapp').addEventListener('click', (e) => {
    const a = e.currentTarget;
    if (!a.dataset.texto) return;
    if (!navigator.share || !matchMedia('(pointer: coarse)').matches) { setTimeout(enviada, 600); return; }
    e.preventDefault();
    navigator.share({ text: a.dataset.texto }).then(enviada).catch((x) => { if (!x || x.name !== 'AbortError') { try { window.open(a.href, '_blank', 'noopener'); } catch (_) {} setTimeout(enviada, 600); } });
  });
  document.addEventListener('elixire-idioma', () => { const a = $('#whatsapp'); if (a.dataset.codigo) ponWhatsApp(a.dataset.codigo); else if (invitacion && abierta === 'crear') ponEnlaceWa(textoInvitacion(invitacion.s)); });
  $('#copiar').addEventListener('click', async () => {
    const c = $('#codigo').dataset.codigo; if (!c) return;
    const s = $('#copiar span');
    try { await navigator.clipboard.writeText(c); s.dataset.t = 'copiado'; s.textContent = tr('copiado'); setTimeout(() => { s.dataset.t = 'copiar'; s.textContent = tr('copiar'); }, 1800); } catch (_) {}
  });

  // ---- la invitación de WhatsApp: se abre «Tengo un código» con el código ya puesto; basta con tocar «Entrar» ----
  let codigoEnlace = null, enlaceLlamada = false, semillaEnlace = null;
  {
    const e = /^#e=([A-Za-z0-9_-]{43})(?:&l=(?:es|en))?(&ll=1)?$/.exec(location.hash || '');
    if (e) {
      try { let b = e[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; const x = Uint8Array.from(atob(b), (q) => q.charCodeAt(0)); if (x.length === 32) { semillaEnlace = x; enlaceLlamada = true; codigoEnlace = 'semilla'; } } catch (_) {}
      try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    }
    const m = /^#c=([0-9A-HJKMNP-TV-Z]{16})(?:&l=(?:es|en))?(&ll=1)?$/.exec(location.hash || '');
    if (m) { codigoEnlace = m[1]; enlaceLlamada = !!m[2]; try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {} }
  }
  async function abreConCodigo() {
    if (ocupado || abierta || !codigoEnlace) return; ocupado = true;
    try {
      document.body.classList.add('cerrado');
      if (M) M.prepara();
      $('#consola').classList.add('fuera');
      if (window.Sala3D) await window.Sala3D.abre(); else { $('#monolito-css').classList.add('abierto'); await espera(quieto ? 0 : 1400); }
      if (enlaceLlamada) { $('#error-invitado').textContent = ''; $('#entrar-llamada').disabled = false; $('#panel-invitado').classList.remove('esperando'); muestra('invitado', $('#entrar-llamada')); return; }
      campo.value = codigoEnlace.replace(/(.{4})(?=.)/g, '$1 '); codigoEnlace = null;
      ponError('tengo', ''); botonEntrar(false); muestra('tengo', $('#entrar'));
    } finally { ocupado = false; }
  }

  // ---- pasar la conversación a este móvil: lo que trae el QR del ordenador («#m=», 256 bits que no llegan a ningún servidor) ----
  let semillaMovil = null;
  {
    const m = /^#m=([A-Za-z0-9_-]{43})(?:&l=(?:es|en))?$/.exec(location.hash || '');
    if (m) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
      try { let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; const x = Uint8Array.from(atob(b), (c) => c.charCodeAt(0)); if (x.length === 32) semillaMovil = x; } catch (_) {}
    }
  }
  const textoMovil = (k) => { const e = $('#movil-aqui-texto'); e.dataset.t = k; e.textContent = tr(k); };
  const errorMovil = (k) => { const e = $('#error-movil'); if (k) e.dataset.t = k; e.textContent = k ? tr(k) : ''; };
  async function abreMovil() {
    if (ocupado || abierta || !semillaMovil) return; ocupado = true;
    try {
      document.body.classList.add('cerrado');
      if (M) M.prepara();
      $('#consola').classList.add('fuera');
      if (window.Sala3D) await window.Sala3D.abre(); else { $('#monolito-css').classList.add('abierto'); await espera(quieto ? 0 : 1400); }
      textoMovil('movilAquiTexto'); errorMovil(''); $('#movil-aqui-palabras').hidden = true; $('#movil-continuar').hidden = false; $('#movil-continuar').disabled = false;
      muestra('movil', $('#movil-continuar'));
    } finally { ocupado = false; }
  }
  $('#movil-continuar').addEventListener('click', async () => {
    if (!M || !semillaMovil) return;
    pantallaCompleta();
    $('#movil-continuar').disabled = true; errorMovil(''); textoMovil('movilConectando');
    const r = await M.entraMovil(semillaMovil.slice());
    if (!r.ok) { $('#movil-continuar').disabled = false; textoMovil('movilAquiTexto'); errorMovil(ERRORES[r.por] || 'eSinRele'); return; }
    semillaMovil.fill(0); semillaMovil = null;
  });
  if (M) {
    M.on('par-palabras', (w) => {
      if (abierta !== 'movil') return;
      const p = $('#movil-aqui-palabras'); p.textContent = ''; for (const x of w) { const s = document.createElement('span'); s.textContent = x; p.append(s); }
      p.hidden = false; $('#movil-continuar').hidden = true; textoMovil('movilCompruebaPc');
    });
    M.on('par-ocupada', () => { if (abierta === 'movil') { errorMovil('movilUsado'); textoMovil('movilAquiTexto'); } });
    M.on('par-fin', () => { if (abierta === 'movil') { $('#movil-aqui-palabras').hidden = true; errorMovil('movilCancelado'); textoMovil('movilAquiTexto'); } });
    M.on('par-hecho', () => { if (abierta === 'movil') { $('#movil-aqui-palabras').hidden = true; textoMovil('movilPasando'); } });
    M.on('continua', () => { paraReloj(); ocultaPaneles(); abierta = 'sala'; });
  }

  // la invitación a una llamada: un solo toque (el navegador lo exige para encender la cámara) y la llamada arranca sola.
  // Dueño, 15:12: «yo entro en la llamada, pero se queda ahí, no hace más nada»: ahora se ve que se espera (el pulso, «Esperando a
  // la otra persona…»), y se espera de verdad: si quien invita aún está en WhatsApp o su página se recargó, en cuanto vuelve a la
  // web, la llamada empieza sola.
  let tardaT = null;
  const estadoInvitado = (k) => { const x = $('#estado-invitado'); x.dataset.t = k; x.textContent = tr(k); };
  $('#entrar-llamada').addEventListener('click', async () => {
    if (!M || !codigoEnlace) return;
    pantallaCompleta();
    const p = $('#panel-invitado'), b = $('#entrar-llamada'), e = $('#error-invitado'); b.disabled = true; e.textContent = '';
    p.classList.add('esperando'); estadoInvitado('conectando');
    const r = semillaEnlace ? await M.entraSemilla(semillaEnlace.slice()) : await M.entra(codigoEnlace);
    if (abierta !== 'invitado') return;
    if (!r.ok) { p.classList.remove('esperando'); b.disabled = false; e.textContent = tr(ERRORES[r.por] || 'eSinRele'); return; }
    codigoEnlace = null; if (semillaEnlace) { semillaEnlace.fill(0); semillaEnlace = null; } window.Elixire.llamaAlEntrar = true; window.Elixire.contestaSola = false;
    estadoInvitado('esperandoVuelva');
    clearTimeout(tardaT); tardaT = setTimeout(() => { if (abierta === 'invitado' && M.activa && !M.conectada) estadoInvitado('tardaVuelva'); }, 45000);
  });
  if (M) M.on('ocupada', () => { if (abierta === 'invitado') { $('#panel-invitado').classList.remove('esperando'); $('#entrar-llamada').disabled = false; $('#error-invitado').textContent = tr('eNoVale'); } });

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
    pantallaCompleta();
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
    M.on('llega', () => { if (abierta === 'crear') ponEstado('llegaOtra'); else if (abierta === 'invitado' && $('#panel-invitado').classList.contains('esperando')) estadoInvitado('llegaOtra'); });
    M.on('ocupada', () => { if (abierta === 'tengo') { botonEntrar(false); ponError('tengo', 'no-vale'); } });
    M.on('conectado', () => { paraReloj(); clearTimeout(tardaT); olvidaInvitacion(); ocultaPaneles(); abierta = 'sala'; });
    // sin conexión con el servidor mientras se espera: se dice (y se reintenta solo); al volver, se sigue esperando
    let sinRed = null;
    M.on('red', (ok) => {
      clearTimeout(sinRed);
      const crea = abierta === 'crear' && invitacion, entra = abierta === 'invitado' && $('#panel-invitado').classList.contains('esperando') && !codigoEnlace;
      if (!crea && !entra) return;
      if (ok) { if (crea && $('#estado-crear').dataset.t === 'reintentando') ponEstado($('#panel-crear').classList.contains('enviada') ? 'esperandoInicio' : 'esperandoLlamada'); if (entra && $('#estado-invitado').dataset.t === 'reintentando') estadoInvitado('esperandoVuelva'); return; }
      sinRed = setTimeout(() => { if (crea && abierta === 'crear') ponEstado('reintentando'); if (entra && abierta === 'invitado') estadoInvitado('reintentando'); }, 6000);
    });
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
  if (semillaMovil) { const va = () => setTimeout(abreMovil, 400); if (document.readyState === 'complete') va(); else addEventListener('load', va); }
  if (codigoEnlace) { const va = () => setTimeout(abreConCodigo, 400); if (document.readyState === 'complete') va(); else addEventListener('load', va); }
  // la invitación que se estaba esperando, si el teléfono recargó la página (al volver de WhatsApp): se retoma sola
  if (M && !codigoEnlace && !semillaMovil) {
    let g = null; try { g = JSON.parse(sessionStorage.getItem(GUARDA) || 'null'); } catch (_) {}
    if (g && typeof g.s === 'string' && /^[A-Za-z0-9_-]{43}$/.test(g.s) && Date.now() - (+g.t0 || 0) < INVITACION_MS) {
      invitacion = { s: g.s, t0: +g.t0 };
      const va = () => setTimeout(() => { if (invitacion) abreInvitacion(deB64u(invitacion.s), textoInvitacion(invitacion.s), true); }, 300);
      if (document.readyState === 'complete') va(); else addEventListener('load', va);
    } else if (g) { try { sessionStorage.removeItem(GUARDA); } catch (_) {} }
  }

  for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, (e) => e.preventDefault());
  // en el móvil, con el teclado abierto, lo de abajo (la hoja del panel, el redactor del chat) sube con él (iPhone: visualViewport)
  if (window.visualViewport) {
    const vv = window.visualViewport;
    const teclado = () => raiz.style.setProperty('--teclado', Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) + 'px');
    vv.addEventListener('resize', teclado); vv.addEventListener('scroll', teclado); teclado();
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierta && abierta !== 'sala') cierra(); });
  // con una conversación abierta, el navegador pregunta antes de salir (al salir, se borra)
  addEventListener('beforeunload', (e) => { if (M && M.activa) { e.preventDefault(); e.returnValue = ''; } });
})();
