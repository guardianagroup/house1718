// Elixire · la portada y el monolito (19 nov 2026).
// Dueño, 11:36: «debajo del monolito, solo un botón: Empezar prueba… y una vez que empiezas la prueba, ya te dice tengo un código».
// «Empezar prueba» parte el monolito (sala3d.js) y dentro aparecen «Crear un código» y «Tengo un código»; con el código, la sala
// (sala.js). Al bajar, la misma sala se oscurece y debajo van cómo se escuchan las llamadas, la solución, la tecnología, la comparación y el acceso.
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
      p.classList.remove('sin-tiempo');
      if (p.id === 'panel-' + cual) { p.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => { if (!p.hidden) p.classList.add('visible'); })); }
      else { p.classList.remove('visible'); p.hidden = true; }
    }
    abierta = cual;
    const foco = focoEn || (cual === 'tengo' ? $('#campo-codigo') : cual === 'elige' ? $('#crear') : cual === 'movil' ? $('#movil-continuar') : $('#copiar'));
    setTimeout(() => foco && foco.focus({ preventScroll: true }), quieto ? 0 : 450);
  }
  function ocultaPaneles() { for (const p of paneles()) { p.classList.remove('visible', 'sin-tiempo'); p.hidden = true; } }
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
  // abre la roca y, dentro, lo que se pidió desde la portada (boton: «#crear», el código en pantalla; «#tengo», escribir el código)
  async function abre(boton) {
    if (ocupado || abierta) return; ocupado = true;
    pantallaCompleta();
    let hecho = false;
    try {
      if (scrollY > 4) { scrollTo({ top: 0, behavior: quieto ? 'auto' : 'smooth' }); await espera(quieto ? 0 : 800); }
      document.body.classList.add('cerrado');
      if (M) M.prepara(); // el relé, solo desde ahora
      $('#consola').classList.add('fuera');
      if (window.Sala3D) await window.Sala3D.abre(); else { $('#monolito-css').classList.add('abierto'); await espera(quieto ? 0 : 1400); }
      ponError('elige', '');
      if (!boton) muestra('elige');
      hecho = true;
    } finally { ocupado = false; }
    if (hecho && boton && $(boton)) $(boton).click();
  }
  async function cierra() {
    if (ocupado || !abierta) return; ocupado = true; suena(false);
    try {
      if (M && M.activa) M.termina('cancela');
      ocultaPaneles(); abierta = null; $('#panel-crear').classList.remove('invita');
      await espera(quieto ? 0 : 300);
      if (window.Sala3D) { const fin = window.Sala3D.cierra(); setTimeout(() => $('#consola').classList.remove('fuera'), quieto ? 0 : 1300); await fin; }
      else { $('#monolito-css').classList.remove('abierto'); await espera(quieto ? 0 : 900); $('#consola').classList.remove('fuera'); }
      document.body.classList.remove('cerrado');
      $('#empezar').focus({ preventScroll: true });
    } finally { ocupado = false; }
  }
  // «Invitar a una llamada» en el móvil (invitaMovil: el menú «Compartir») y en el ordenador (invitaPC: WhatsApp, correo o copiar el
  // enlace). Dueño, 22 nov: «en la versión del PC… pon también invitar a una llamada… como lo tenemos en la versión móvil»
  // (dueño, 23 nov 08:38: «desde el PC… mejor "Invitar a videollamada" o "Tengo un código", como teníamos antes, y sale el código en
  // pantalla; que sea fácil») en el ordenador, el botón abre las dos opciones; en el móvil sigue igual (la invitación por WhatsApp)
  // (dueño, 23 nov 08:50: «lo de "Tengo un código" también tiene que salir en la pantalla principal, para que mi amigo no tenga que
  // entrar a invitar una llamada; así es más fácil»): en la portada, las dos entradas. «Invitar a videollamada» (en el ordenador, el
  // código sale ya en pantalla; en el móvil, la invitación por WhatsApp) y «Tengo un código» (directamente a escribirlo).
  // (dueño, 23 nov 15:47–15:51: «llamada de voz y videollamada… tres botones al empezar… en la versión PC también… y las llamadas
  // en grupo»): «Llamada de voz» (sin cámara; se puede pasar a vídeo sin colgar) o «Videollamada»
  const ponTipo = (t) => { window.Elixire.tipo = t === 'voz' ? 'voz' : 'video'; if (M && M.modoVoz) M.modoVoz(t === 'voz'); };
  // (dueño, 25 nov 12:15–12:16: «cuando una persona agota los 2 minutos de prueba, que no pueda volver a generar código, porque no
  // dejará entrar… en pc y móvil… 2 minutos gratis por dispositivo y después de pago»): sin tiempo comprado y sin minutos gratis hoy
  // en este aparato, no se crea la invitación: sale la compra. El relé lo dice en cuanto se conecta (abajo, al cargar la página), así
  // que se sabe en el mismo toque (en el móvil, «Compartir» tiene que abrirse en ese toque)
  const sinTiempoParaInvitar = () => {
    const s = M && M.saldo; if (!s || typeof s.gratis !== 'number') return false; // (sin respuesta del relé, no se bloquea)
    if (s.minutos > 0 || s.gratis >= 1) return false;
    return !Object.values(s.estados || {}).some((v) => v === '?' || v === 'espera'); // (códigos aún por comprobar: no se bloquea)
  };
  const empieza = (t) => {
    if (!M || ocupado || abierta) return;
    if (sinTiempoParaInvitar()) { const c = window.ElixireCompra; if (c) c.abre('invitar'); return; }
    ponTipo(t); if (enMovil()) invitaMovil(); else abre('#crear');
  };
  // el relé, al poco de cargar: así se sabe ya cuánto tiempo hay (y la llamada empieza antes)
  addEventListener('load', () => setTimeout(() => { try { if (M && !document.hidden) M.prepara(); } catch (_) {} }, 1200));
  $('#empezar').addEventListener('click', () => empieza('video'));
  { const v = $('#empezar-voz'); if (v) v.addEventListener('click', () => empieza('voz')); }
  for (const b of document.querySelectorAll('[data-empezar]')) b.addEventListener('click', () => empieza('video'));
  $('#empezar-codigo').addEventListener('click', () => { if (!M || ocupado || abierta) return; abre('#tengo'); });
  for (const b of document.querySelectorAll('[data-cerrar-camara]')) b.addEventListener('click', () => { olvidaInvitacion(); cierra(); });
  // «Cancelar» y «Volver»: a la portada, donde están las dos entradas
  for (const b of document.querySelectorAll('[data-volver-elige]')) b.addEventListener('click', () => {
    if (M && M.activa) M.termina('cancela'); paraReloj(); olvidaInvitacion();
    cierra();
  });

  const ERRORES = { formato: 'faltan', 'no-vale': 'eNoVale', 'sin-rele': 'eSinRele', 'sin relé': 'eSinRele', 'sin respuesta': 'eSinRele', 'sin-pq': 'eSinPq', 'demasiados intentos': 'eDemasiados', 'sin-codigo': 'eSinCodigo' };
  function ponError(donde, por) { const e = $(donde === 'tengo' ? '#error-codigo' : '#error-elige'); delete e.dataset.t; e.textContent = por ? tr(ERRORES[por] || 'eSinRele') : ''; }

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
    $('#panel-crear').classList.remove('invita');
    invitoLlamada = false; olvidaInvitacion(); window.Elixire.contestaSola = true; window.Elixire.llamaAlEntrar = false; // «Invitar a videollamada»: al escribir el código, la llamada empieza sola
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
    const lengua = window.ElixireIdioma ? window.ElixireIdioma.actual() : 'en', voz = window.Elixire.tipo === 'voz';
    const enlace = location.origin + '/#c=' + codigo + '&l=' + lengua + (voz ? '&voz=1' : '');
    const texto = tr(voz ? 'mensajeWaVoz' : 'mensajeWa').replace('{enlace}', enlace).replace('{codigo}', codigo.replace(/(.{4})(?=.)/g, '$1 '));
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
  function textoInvitacion(sem, voz) {
    const lengua = window.ElixireIdioma ? window.ElixireIdioma.actual() : 'en';
    if (voz == null) voz = window.Elixire.tipo === 'voz';
    // la tarjeta de WhatsApp (imagen y texto propios) está en /invitacion/ y /invitation/; al tocarla, esta página con el fragmento.
    // La de voz tiene su propia tarjeta (/invitacion/voz/, /invitation/voice/), para que WhatsApp no diga «videollamada» (25 nov)
    const ruta = lengua === 'es' ? (voz ? '/invitacion/voz/' : '/invitacion/') : (voz ? '/invitation/voice/' : '/invitation/');
    const enlace = location.origin + ruta + '#e=' + sem + (voz ? '&voz=1' : '');
    return tr(voz ? 'mensajeLlamadaVoz' : 'mensajeLlamada').replace('{enlace}', enlace);
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
    if (window.ElixireTonos) window.ElixireTonos.prepara(); // el sonido se desbloquea con este toque (para el tono de «Llamando…»)
    const semilla = crypto.getRandomValues(new Uint8Array(32));
    invitacion = { s: b64u(semilla), t0: Date.now() }; guardaInvitacion();
    const texto = textoInvitacion(invitacion.s);
    const compartida = comparte(texto);
    M.prepara();
    await abreInvitacion(semilla, texto, false, true);
    const ok = await compartida;
    if (abierta === 'crear' && invitacion) ponEnviada(ok);
  }
  // En el ordenador, la invitación sale ya lista, sin códigos: WhatsApp (web o escritorio), el correo o copiar el enlace para pegarlo
  // donde se quiera. Al usar cualquiera, «Invitación enviada» y a esperar; cuando la otra persona la abre, la llamada empieza sola.
  function enlaceDe(texto) { const m = /https?:\/\/\S+/.exec(texto || ''); return m ? m[0] : ''; }
  function ponEnlacesPC(texto) {
    const enlace = enlaceDe(texto), limpio = String(texto || '').replace(/\*/g, '');
    $('#enviar-wa').href = 'https://wa.me/?text=' + encodeURIComponent(texto);
    const voz = window.Elixire.tipo === 'voz';
    $('#enviar-correo').href = 'mailto:?subject=' + encodeURIComponent(tr(voz ? 'correoAsuntoVoz' : 'correoAsunto')) + '&body=' + encodeURIComponent(tr(voz ? 'correoCuerpoVoz' : 'correoCuerpo').replace('{enlace}', enlace).replace('{texto}', limpio));
    $('#copiar-enlace').dataset.enlace = enlace;
  }
  async function invitaPC() {
    if (!M || ocupado || (abierta && abierta !== 'elige')) return;
    if (window.ElixireTonos) window.ElixireTonos.prepara();
    const semilla = crypto.getRandomValues(new Uint8Array(32));
    invitacion = { s: b64u(semilla), t0: Date.now() }; guardaInvitacion();
    const texto = textoInvitacion(invitacion.s);
    const p = $('#panel-crear'); p.classList.add('invita'); p.classList.remove('enviada');
    const c = $('#copiar-enlace span'); c.dataset.t = 'cpCopiar'; c.textContent = tr('cpCopiar');
    ponEnlacesPC(texto);
    await abreInvitacion(semilla, texto, false, false);
  }
  const enviadaPC = (ms) => setTimeout(() => { if (abierta === 'crear' && invitacion && $('#panel-crear').classList.contains('invita')) ponEnviada(true); }, ms);
  $('#enviar-wa').addEventListener('click', () => enviadaPC(700));
  $('#enviar-correo').addEventListener('click', () => enviadaPC(700));
  $('#copiar-enlace').addEventListener('click', async (e) => {
    const b = e.currentTarget, s = b.querySelector('span'), enlace = b.dataset.enlace; if (!enlace) return;
    let ok = false; try { await navigator.clipboard.writeText(enlace); ok = true; } catch (_) {}
    if (!ok) { try { const t = document.createElement('textarea'); t.value = enlace; t.setAttribute('readonly', ''); t.className = 'fuera-de-vista'; document.body.append(t); t.select(); ok = document.execCommand('copy'); t.remove(); } catch (_) {} }
    if (!ok) return;
    s.dataset.t = 'enlaceCopiado'; s.textContent = tr('enlaceCopiado'); b.classList.add('hecho');
    setTimeout(() => { s.dataset.t = 'cpCopiar'; s.textContent = tr('cpCopiar'); b.classList.remove('hecho'); }, 2200);
    enviadaPC(1400);
  });
  // «¿Te han dado un código?»: se deja la invitación y se va a escribir el código
  $('#tengo-pc').addEventListener('click', () => {
    if (M && M.activa) M.termina('cancela'); paraReloj(); olvidaInvitacion(); suena(false);
    $('#panel-crear').classList.remove('invita', 'enviada'); $('#tengo').click();
  });
  async function abreInvitacion(semilla, texto, retomada, sinPanel) {
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
      if (sinPanel) abierta = 'crear'; else muestra('crear', $('#cancelar-invitacion'));
      vigilaInvitacion();
    } finally { ocupado = false; }
  }
  function ponEnviada(ok) {
    if (abierta !== 'crear') return;
    // sin enviar (se cerró «Compartir»), en el móvil no hay pantalla intermedia: de vuelta a la portada (dueño, 19:22: «eso bórralo, es
    // innecesario, es mejor volver a la página principal»)
    if (!ok && enMovil()) { paraReloj(); olvidaInvitacion(); suena(false); cierra(); return; }
    if ($('#panel-crear').hidden) muestra('crear', $('#cancelar-invitacion'));
    $('#panel-crear').classList.toggle('enviada', !!ok);
    if (!/llega|alguien|caducad/.test($('#estado-crear').dataset.t || '')) { ponEstado(ok ? 'esperandoInicio' : 'esperandoLlamada'); titulo('#panel-crear', 'llamandoT'); if (ok && !(M && M.conectada)) suena(true); }
  }
  function vigilaInvitacion() {
    paraReloj();
    reloj = setInterval(() => {
      if (abierta !== 'crear' || !invitacion) return paraReloj();
      if (Date.now() - invitacion.t0 > INVITACION_MS && !M.conectada) {
        paraReloj(); M.termina('caduca'); olvidaInvitacion();
        $('#panel-crear').classList.add('enviada', 'caducada'); ponEstado('invitacionCaducada'); suena(false);
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
  document.addEventListener('elixire-idioma', () => { const a = $('#whatsapp'); if (a.dataset.codigo) ponWhatsApp(a.dataset.codigo); else if (invitacion && abierta === 'crear') { ponEnlaceWa(textoInvitacion(invitacion.s)); ponEnlacesPC(textoInvitacion(invitacion.s)); } });
  $('#copiar').addEventListener('click', async () => {
    const c = $('#codigo').dataset.codigo; if (!c) return;
    const s = $('#copiar span');
    try { await navigator.clipboard.writeText(c); s.dataset.t = 'copiado'; s.textContent = tr('copiado'); setTimeout(() => { s.dataset.t = 'copiar'; s.textContent = tr('copiar'); }, 1800); } catch (_) {}
  });

  // ---- la invitación de WhatsApp: se abre «Tengo un código» con el código ya puesto; basta con tocar «Entrar» ----
  let codigoEnlace = null, enlaceLlamada = false, semillaEnlace = null;
  {
    // (la invitación a una llamada de voz lleva «&voz=1»: quien la abre entra sin cámara)
    window.Elixire = window.Elixire || {};
    const partes = String(location.hash || '').split('&'), extra = new Set(partes.slice(1));
    if (extra.has('voz=1')) {
      window.Elixire.tipo = 'voz'; window.Elixire.tipoEnlace = true; if (M && M.modoVoz) M.modoVoz(true);
      // la pantalla de quien recibe la invitación dice «llamada de voz» y que se enciende solo el micrófono (25 nov)
      const et = $('#t-invitado'), tx = document.querySelector('#panel-invitado [data-t="teInvitanTexto"]');
      if (et) { et.dataset.t = 'teInvitanVoz'; et.textContent = tr('teInvitanVoz'); }
      if (tx) { tx.dataset.t = 'teInvitanVozTexto'; tx.textContent = tr('teInvitanVozTexto'); }
    }
    else if (/^#[ec]=/.test(partes[0] || '')) window.Elixire.tipoEnlace = true;
    const limpio = partes[0] + [...extra].filter((x) => /^(l=(es|en)|ll=1)$/.test(x)).sort((a, b) => (a < b ? -1 : 1)).map((x) => '&' + x).join('');
    const e = /^#e=([A-Za-z0-9_-]{43})(?:&l=(?:es|en))?(&ll=1)?$/.exec(limpio);
    if (e) {
      try { let b = e[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; const x = Uint8Array.from(atob(b), (q) => q.charCodeAt(0)); if (x.length === 32) { semillaEnlace = x; enlaceLlamada = true; codigoEnlace = 'semilla'; } } catch (_) {}
      try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    }
    const m = /^#c=([0-9A-HJKMNP-TV-Z]{16})(?:&l=(?:es|en))?(&ll=1)?$/.exec(limpio);
    if (m) { codigoEnlace = m[1]; enlaceLlamada = !!m[2]; try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {} }
  }
  async function abreConCodigo() {
    if (ocupado || abierta || !codigoEnlace) return; ocupado = true;
    try {
      document.body.classList.add('cerrado');
      if (M) M.prepara();
      if (enlaceLlamada) uneLlamada(); // ya, mientras se abre la roca: es lo más rápido
      $('#consola').classList.add('fuera');
      if (window.Sala3D) await window.Sala3D.abre(); else { $('#monolito-css').classList.add('abierto'); await espera(quieto ? 0 : 1400); }
      if (enlaceLlamada) { if (abierta === 'sala' || (M && M.conectada)) return; $('#error-invitado').textContent = ''; muestra('invitado', $('#cancelar-invitado')); entraLlamada(); return; }
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
      // (dueño, 23 nov 10:36: «sin que haya que tocar pantalla ni aprobar nada»): como en GUARDIANA, empieza sola; la cámara y el
      // micrófono se piden ya (el navegador puede preguntar la primera vez); «Continuar aquí» queda solo si algo falla
      if (M && M.preparaMedios) M.preparaMedios();
      setTimeout(() => { const b = $('#movil-continuar'); if (abierta === 'movil' && b && !b.disabled && semillaMovil) b.click(); }, 350);
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
    // (dueño, 23 nov 09:37: «como en GUARDIANA»): sin palabras que comparar; en cuanto se conecta, la llamada pasa sola
    M.on('par-palabras', () => {
      if (abierta !== 'movil') return;
      $('#movil-aqui-palabras').hidden = true; $('#movil-continuar').hidden = true; textoMovil('movilPasando');
    });
    M.on('par-ocupada', () => { if (abierta === 'movil') { errorMovil('movilUsado'); textoMovil('movilAquiTexto'); } });
    M.on('par-fin', () => { if (abierta === 'movil') { $('#movil-aqui-palabras').hidden = true; errorMovil('movilCancelado'); textoMovil('movilAquiTexto'); } });
    M.on('par-hecho', (x) => { if (abierta === 'movil') { $('#movil-aqui-palabras').hidden = true; textoMovil(x && x.reanuda ? 'pasandoLlamada' : 'movilPasando'); } });
    M.on('continua', () => { paraReloj(); ocultaPaneles(); abierta = 'sala'; });
  }

  // la invitación a una llamada: un solo toque (el navegador lo exige para encender la cámara) y la llamada arranca sola.
  // Dueño, 15:12: «yo entro en la llamada, pero se queda ahí, no hace más nada»: ahora se ve que se espera (el pulso, «Esperando a
  // la otra persona…»), y se espera de verdad: si quien invita aún está en WhatsApp o su página se recargó, en cuanto vuelve a la
  // web, la llamada empieza sola.
  // Dueño, 17:32–17:34: «la persona que recibe, en los mínimos pasos posibles… que cuando toca el enlace en WhatsApp ya entre la
  // llamada directa». Sin «Entrar»: al abrir el enlace se piden ya la cámara y el micrófono (la primera vez el navegador pregunta;
  // eso no lo puede saltar ninguna web) y la sesión se abre mientras se abre la roca. En cuanto quien invitó está en Elixire, la
  // llamada empieza sola. Mientras, «Llamando…», como un teléfono. Si algo falla, vuelve el botón «Entrar a la llamada».
  let tardaT = null, uniendo = null;
  const estadoInvitado = (k) => { const x = $('#estado-invitado'); x.dataset.t = k; x.textContent = tr(k); };
  function uneLlamada() {
    if (uniendo || !M || !codigoEnlace) return uniendo;
    window.Elixire.llamaAlEntrar = true; window.Elixire.contestaSola = false;
    if (M.preparaMedios) M.preparaMedios(); // la cámara y el micrófono, ya (más rapidez: dueño, 16:18)
    uniendo = semillaEnlace ? M.entraSemilla(semillaEnlace.slice()) : M.entra(codigoEnlace);
    return uniendo;
  }
  async function entraLlamada() {
    if (!M || !codigoEnlace) return;
    const p = $('#panel-invitado'), b = $('#entrar-llamada'), e = $('#error-invitado'); b.disabled = true; e.textContent = '';
    p.classList.add('esperando'); estadoInvitado('conectando'); titulo('#panel-invitado', 'llamandoT');
    let r; try { r = await uneLlamada(); } catch (_) { r = { ok: false }; } uniendo = null;
    if (abierta !== 'invitado') return;
    if (!r || !r.ok) { window.Elixire.llamaAlEntrar = false; p.classList.remove('esperando'); b.disabled = false; e.textContent = tr(ERRORES[r && r.por] || 'eSinRele'); suena(false); return; }
    codigoEnlace = null; if (semillaEnlace) { semillaEnlace.fill(0); semillaEnlace = null; }
    if (!M.conectada) { estadoInvitado('esperandoVuelva'); suena(true); }
    clearTimeout(tardaT); tardaT = setTimeout(() => { if (abierta === 'invitado' && M.activa && !M.conectada && !$('#panel-invitado').classList.contains('sin-tiempo')) estadoInvitado('tardaVuelva'); }, 45000);
  }
  $('#entrar-llamada').addEventListener('click', () => { pantallaCompleta(); entraLlamada(); });
  // «Llamando…» se oye además de verse (dueño, 17:32: «la persona que invita tiene que sentir… que se está llamando»): el tono de
  // llamada, como un teléfono, hasta que la otra persona entra (como mucho un minuto; luego sigue la espera en silencio)
  let sonandoT = null;
  function suena(si) {
    const T = window.ElixireTonos; clearTimeout(sonandoT);
    if (!T) return;
    if (si) { T.saliente(); sonandoT = setTimeout(() => T.para(), 60000); } else T.para();
  }
  function titulo(panel, k) { const x = $(panel + ' .llamando span'); if (x && x.dataset.t !== k) { x.dataset.t = k; x.textContent = tr(k); } }
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
    window.Elixire.llamaAlEntrar = true; window.Elixire.contestaSola = false;
    const r = await M.entra(c);
    if (abierta !== 'tengo') { window.Elixire.llamaAlEntrar = false; return; }
    if (!r.ok) { window.Elixire.llamaAlEntrar = false; botonEntrar(false); ponError('tengo', r.por); return; }
    // dentro: en cuanto las claves estén acordadas, la sala (sala.js); si la otra persona ya no está, se dice
    setTimeout(() => { if (abierta === 'tengo' && M.activa && !M.conectada && !$('#panel-tengo').classList.contains('sin-tiempo')) { botonEntrar(false); ponError('tengo', 'sin-rele'); } }, 30000);
  });

  // lo que dice el motor mientras se espera
  if (M) {
    M.on('codigo-usado', () => { if (abierta === 'crear') ponEstado('alguienEntra'); });
    M.on('llega', () => { if (abierta === 'crear') { ponEstado('llegaOtra'); titulo('#panel-crear', 'conectandoT'); if (invitoLlamada && M.preparaMedios) M.preparaMedios(); } else if (abierta === 'invitado' && $('#panel-invitado').classList.contains('esperando')) { estadoInvitado('llegaOtra'); titulo('#panel-invitado', 'conectandoT'); } });
    M.on('ocupada', () => { if (abierta === 'tengo') { botonEntrar(false); ponError('tengo', 'no-vale'); } });
    M.on('conectado', () => { paraReloj(); clearTimeout(tardaT); clearTimeout(sonandoT); olvidaInvitacion(); ocultaPaneles(); abierta = 'sala'; });
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
    // sin tiempo antes de empezar (dueño, 25 nov 12:22: «le llega la invitación pero no se establece la llamada»): si quien invita
    // no tiene minutos, el relé no deja pasar nada y los dos se quedaban «Llamando» sin saber por qué. Ahora se dice en los dos
    // lados: quien invita ve la compra (si compra y pone el código mientras la otra persona espera, se sigue) y quien está
    // invitado, que paga quien invita. Si llega tiempo, se sigue como antes
    M.on('tiempo', (x) => {
      if (!x) return;
      const crea = abierta === 'crear', inv = abierta === 'invitado', tengo = abierta === 'tengo';
      if (!crea && !inv && !tengo) return;
      const p = $('#panel-' + abierta), c = window.ElixireCompra, quien = x.paga === false ? 'invitado' : 'paga';
      if (!x.agotado) {
        if (!p.classList.contains('sin-tiempo')) return;
        p.classList.remove('sin-tiempo'); if (c && c.abierta) c.cierra();
        if (crea) { titulo('#panel-crear', 'conectandoT'); ponEstado('llegaOtra'); } else if (inv) { titulo('#panel-invitado', 'conectandoT'); estadoInvitado('llegaOtra'); } else ponError('tengo', '');
        return;
      }
      if (p.classList.contains('sin-tiempo')) return;
      p.classList.add('sin-tiempo'); suena(false); clearTimeout(tardaT);
      const k = quien === 'invitado' ? 'llSinTiempoInvitado' : 'esperaSinTiempo';
      if (crea) { titulo('#panel-crear', 'sinTiempoT'); ponEstado(k); }
      else if (inv) { titulo('#panel-invitado', 'sinTiempoT'); estadoInvitado(k); }
      else { const e = $('#error-codigo'); e.dataset.t = k; e.textContent = tr(k); }
      if (c) c.abre(quien === 'invitado' ? 'invitado' : x.de === 'codigo' ? 'tiempo' : 'invitar');
    });
  }
  // la sala terminó: el monolito se cierra y vuelve la portada
  async function vuelve() {
    abierta = 'sala'; ocupado = false;
    if (window.Sala3D) { const fin = window.Sala3D.cierra(); setTimeout(() => $('#consola').classList.remove('fuera'), quieto ? 0 : 1300); await fin; }
    else { $('#monolito-css').classList.remove('abierto'); $('#consola').classList.remove('fuera'); }
    abierta = null; document.body.classList.remove('cerrado');
  }
  // «Invitar de nuevo» (dueño, 18:17): la otra persona ha salido de Elixire. En el mismo toque, el menú Compartir con una invitación
  // nueva (el teléfono lo exige en el toque); la sala vieja se cierra sin aviso y la roca sigue abierta con «Llamando…».
  function reinvita() {
    if (!M) return;
    const semilla = crypto.getRandomValues(new Uint8Array(32));
    invitacion = { s: b64u(semilla), t0: Date.now() }; guardaInvitacion();
    const texto = textoInvitacion(invitacion.s), compartida = comparte(texto);
    if (window.ElixireTonos) window.ElixireTonos.prepara();
    if (M.activa) { window.Elixire.reinvitando = true; M.termina('reinvita'); }
    abierta = 'elige'; ocupado = false; document.body.classList.add('cerrado');
    abreInvitacion(semilla, texto, false, true).then(() => compartida).then((ok) => { if (abierta === 'crear' && invitacion) ponEnviada(ok); });
  }
  window.Elixire = Object.assign(window.Elixire || {}, { abre, cierra, vuelve, reinvita, ocultaPaneles, abierta: () => abierta, textoInvitacion, comparte });
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

  // ---- siempre la última versión (dueño, 23 nov 08:49: «a mi amigo… está recargando la página, refrescando y nada») ----
  // Al cargar, al volver a la pestaña y cada 5 minutos se mira /version.txt (sin caché). Si hay una versión nueva y la página está
  // tranquila en la portada (sin llamada, sin invitación, sin panel abierto), se carga la nueva con una dirección que ninguna caché
  // tiene. Una sola vez por versión y pestaña: nunca en bucle. Nada que ver con la llamada: en ella no se mira.
  {
    const s = document.querySelector('script[src*="js/puerta.js"]');
    const VERSION = ((s && /[?&]v=([\w-]+)/.exec(s.getAttribute('src') || '')) || [])[1];
    try { const q = new URLSearchParams(location.search); if (q.has('v')) { q.delete('v'); const t = q.toString(); history.replaceState(history.state, '', location.pathname + (t ? '?' + t : '') + location.hash); } } catch (_) {}
    let mirada = 0;
    const tranquila = () => !abierta && !ocupado && !(M && (M.activa || M.esperando)) && !invitacion && !codigoEnlace && !semillaMovil && !document.body.classList.contains('cerrado') && scrollY < innerHeight * 0.5;
    const miraVersion = async () => {
      if (!VERSION || document.hidden || Date.now() - mirada < 30000 || !tranquila()) return;
      mirada = Date.now();
      let v = '';
      try { const r = await fetch('/version.txt?t=' + Date.now(), { cache: 'no-store', credentials: 'omit' }); if (r.ok) v = (await r.text()).trim(); } catch (_) { return; }
      // (25 nov 11:30): antes pedía dos cifras tras el guion («-12») y las versiones «-1» a «-9» no llegaban a las pestañas abiertas;
      // por eso las versiones van ahora con dos cifras («20261125-10») y aquí vale cualquiera
      if (!/^\d{8}-\d{1,3}$/.test(v) || v === VERSION || !tranquila()) return;
      try { if (sessionStorage.getItem('elixire-version') === v) return; sessionStorage.setItem('elixire-version', v); } catch (_) { return; }
      const q = new URLSearchParams(location.search); q.set('v', v);
      location.replace(location.pathname + '?' + q.toString());
    };
    addEventListener('load', () => setTimeout(miraVersion, 2500));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) miraVersion(); });
    addEventListener('pageshow', (e) => { if (e.persisted) miraVersion(); });
    setInterval(miraVersion, 5 * 60 * 1000);
  }

  for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, (e) => e.preventDefault());
  // en el móvil, con el teclado abierto, lo de abajo (la hoja del panel, el redactor del chat) sube con él (iPhone: visualViewport)
  if (window.visualViewport) {
    const vv = window.visualViewport;
    // (dueño, 22 nov 17:56: «el cuadro de llamando se ve como muy arriba»): al volver de WhatsApp, Safari puede dejar un desfase sin
    // teclado; ahora solo cuenta si hay un campo de texto con el foco y el hueco es de teclado (más de 100 px)
    const campo = () => { const a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); };
    const teclado = () => { const k = Math.round(innerHeight - vv.height - vv.offsetTop); raiz.style.setProperty('--teclado', (campo() && k > 100 ? k : 0) + 'px'); };
    vv.addEventListener('resize', teclado); vv.addEventListener('scroll', teclado);
    document.addEventListener('focusin', teclado); document.addEventListener('focusout', () => setTimeout(teclado, 80)); document.addEventListener('visibilitychange', teclado); teclado();
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && abierta && abierta !== 'sala') cierra(); });
  // con una conversación abierta, el navegador pregunta antes de salir (al salir, se borra)
  addEventListener('beforeunload', (e) => { if (M && M.activa) { e.preventDefault(); e.returnValue = ''; } });
})();
