// Elixire · la sala: la conversación y la videollamada (19 nov 2026).
// Dueño, 11:31: «la videollamada, el chat, todo eso… no puede ser con el formato de diseño que teníamos en Guardiana… tiene que ser
// todo acorde al nuevo proyecto de Elixir». Una sola pantalla dentro del monolito abierto: arriba, las cuatro palabras; a la izquierda,
// la videollamada (la prueba: hasta 3 minutos); a la derecha, el chat y los archivos. Todo vive en esta pestaña: al terminar, se borra.
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const M = window.ElixireMotor; if (!M) return;
  const tr = (k) => (window.ElixireIdioma ? window.ElixireIdioma.t(k) : k);
  const sala = $('#sala'), lista = $('#mensajes'), texto = $('#texto');
  let abierta = false, continuada = false;
  const hora = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const tam = (n) => (n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(2) + ' GB');

  // ---------- abrir y cerrar ----------
  function abre() {
    if (abierta) return; abierta = true;
    lista.textContent = ''; const v = document.createElement('li'); v.className = 'vacio'; v.dataset.t = 'vacio'; v.textContent = tr('vacio'); lista.append(v);
    $('#sala-palabras').hidden = true; $('#sala-palabras').classList.remove('hecho'); $('#palabras-botones').hidden = false; sala.classList.remove('por-comprobar');
    const a = $('#palabras-ayuda'); a.dataset.t = 'palabrasAyuda'; a.textContent = tr('palabrasAyuda');
    ponEstado('salaEstado', false); pintaLlamada({ estado: 'libre' }); $('#llamar').disabled = false; rotuloLlamar('videollamada');
    pintaPalabras(M.palabras);
    sala.hidden = false; document.body.classList.add('en-sala');
    setTimeout(() => { if (abierta && window.Sala3D && window.Sala3D.pausa) window.Sala3D.pausa(true); }, 900);
    if (!movil.matches) setTimeout(() => texto.focus({ preventScroll: true }), 300);
  }
  function cierra() {
    if (!abierta) return; abierta = false;
    sala.hidden = true; document.body.classList.remove('en-sala');
    for (const a of lista.querySelectorAll('a[href^="blob:"]')) URL.revokeObjectURL(a.href);
    lista.textContent = ''; texto.value = ''; avisos.textContent = ''; menuEnviar.hidden = true;
    const vs = $('#video-suyo'), vm = $('#video-mio'); vs.srcObject = null; vm.srcObject = null; $('#video-toca').hidden = true;
    for (const k of ['left', 'top', 'right', 'bottom']) vm.style.removeProperty(k);
    if (window.Sala3D && window.Sala3D.pausa) window.Sala3D.pausa(false);
    if (window.Elixire) window.Elixire.vuelve();
  }
  function ponEstado(k, mal) { const e = $('#sala-estado'); e.classList.toggle('mal', !!mal); const x = $('#sala-estado-texto'); x.dataset.t = k; x.textContent = tr(k); }

  // ---------- mensajes ----------
  function quitaVacio() { const v = lista.querySelector('.vacio'); if (v) v.remove(); }
  function abajo() { lista.scrollTop = lista.scrollHeight; }
  // una ubicación enviada desde la llamada: «📍 …» y el enlace del mapa (solo este formato exacto se convierte en enlace)
  const UBICACION = /^\u{1F4CD} ([^\n]{0,40})\nhttps:\/\/www\.google\.com\/maps\?q=(-?\d{1,2}\.\d{1,7}),(-?\d{1,3}\.\d{1,7})$/u;
  function contenido(texto) {
    const f = document.createDocumentFragment(), u = UBICACION.exec(texto || '');
    if (!u) { f.append(document.createTextNode(texto)); return f; }
    const b = document.createElement('b'); b.textContent = '\u{1F4CD} ' + tr('ubicacion');
    const a = document.createElement('a'); a.className = 'cristal mapa'; a.href = 'https://www.google.com/maps?q=' + u[2] + ',' + u[3]; a.target = '_blank'; a.rel = 'noopener noreferrer';
    const s = document.createElement('span'); s.dataset.t = 'abrirMapa'; s.textContent = tr('abrirMapa'); a.append(s);
    f.append(b, a); return f;
  }
  function pintaMensaje(m) {
    quitaVacio();
    const li = document.createElement('li'); li.className = 'msg ' + m.dir; li.dataset.id = m.id;
    li.append(contenido(m.texto)); tarjeta(m.id, contenido(m.texto), m.dir, 20000);
    const h = document.createElement('span'); h.className = 'hora'; h.textContent = hora(m.t); li.append(h);
    lista.append(li); abajo();
  }
  function sistema(k, extra) {
    quitaVacio();
    const li = document.createElement('li'); li.className = 'msg sistema'; li.textContent = tr(k) + (extra ? ' ' + extra : '');
    lista.append(li); abajo();
  }
  $('#redactor').addEventListener('submit', (e) => {
    e.preventDefault();
    const m = M.envia(texto.value); if (!m) return;
    texto.value = ''; ajusta(); pintaMensaje(m);
  });
  texto.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#redactor').requestSubmit(); } });
  function ajusta() { texto.style.height = 'auto'; texto.style.height = Math.min(160, texto.scrollHeight + 2) + 'px'; }
  texto.addEventListener('input', () => { ajusta(); if (texto.value.trim()) M.escribe(); });
  let escribeT = null;
  M.on('escribe', () => { $('#escribiendo').hidden = false; clearTimeout(escribeT); escribeT = setTimeout(() => { $('#escribiendo').hidden = true; }, 3500); });
  M.on('mensaje', (m) => { $('#escribiendo').hidden = true; pintaMensaje(m); if (sala.classList.contains('video-grande')) $('#b-chat').classList.add('nuevo'); });
  M.on('acuse', (ids) => { for (const id of ids) { const li = lista.querySelector('li.mia[data-id="' + CSS.escape(id) + '"]'); if (li) li.classList.add('llego'); } });

  // ---------- archivos ----------
  // ---------- en la llamada del móvil: lo que se envía y llega, en tarjetas arriba (el chat no se ve) ----------
  // Dueño, 15:54: «y podamos adjuntar fotos, ubicación, etc.», como en GUARDIANA: «Enviar» junto a «Colgar» abre foto, ubicación o
  // archivo; lo que llega sale arriba en una tarjeta (la foto, con su imagen) y se puede guardar.
  const avisos = $('#avisos-llamada');
  function tarjeta(id, nodo, dir, ms) {
    if (!movil.matches || !abierta) return null;
    let li = id ? avisos.querySelector('li[data-id="' + CSS.escape(id) + '"]') : null;
    if (!li) { li = document.createElement('li'); if (id) li.dataset.id = id; avisos.append(li); }
    li.className = 'tarjeta ' + (dir || 'sistema'); li.textContent = '';
    const x = document.createElement('button'); x.type = 'button'; x.className = 'quita'; x.setAttribute('aria-label', '×'); x.textContent = '×'; x.addEventListener('click', () => li.remove());
    li.append(nodo, x);
    while (avisos.children.length > 3) avisos.firstElementChild.remove();
    clearTimeout(li._t); if (ms) li._t = setTimeout(() => li.remove(), ms);
    return li;
  }
  function textoTarjeta(k) { const s = document.createElement('span'); s.dataset.t = k; s.textContent = tr(k); return s; }
  const menuEnviar = $('#menu-enviar');
  $('#b-enviar').addEventListener('click', () => { menuEnviar.hidden = !menuEnviar.hidden; $('#b-enviar').setAttribute('aria-expanded', String(!menuEnviar.hidden)); });
  document.addEventListener('pointerdown', (e) => { if (!menuEnviar.hidden && !menuEnviar.contains(e.target) && !e.target.closest('#b-enviar')) { menuEnviar.hidden = true; $('#b-enviar').setAttribute('aria-expanded', 'false'); } }, true);
  $('#enviar-foto').addEventListener('click', () => { menuEnviar.hidden = true; $('#foto-llamada').click(); });
  $('#enviar-archivo').addEventListener('click', () => { menuEnviar.hidden = true; $('#archivo').click(); });
  $('#foto-llamada').addEventListener('change', (e) => { enviaArchivos([...e.target.files]); e.target.value = ''; });
  $('#enviar-ubicacion').addEventListener('click', () => {
    menuEnviar.hidden = true;
    if (!navigator.geolocation) { tarjeta('ubi', textoTarjeta('sinUbicacion'), 'sistema', 6000); return; }
    tarjeta('ubi', textoTarjeta('buscandoUbicacion'), 'sistema', 20000);
    navigator.geolocation.getCurrentPosition((p) => {
      const q = avisos.querySelector('li[data-id="ubi"]'); if (q) q.remove();
      const m = M.envia('\u{1F4CD} ' + tr('miUbicacion') + '\nhttps://www.google.com/maps?q=' + p.coords.latitude.toFixed(6) + ',' + p.coords.longitude.toFixed(6));
      if (m) pintaMensaje(m);
    }, () => tarjeta('ubi', textoTarjeta('sinUbicacion'), 'sistema', 6000), { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  });
  function tarjetaArchivo(a, estado) {
    const f = document.createDocumentFragment();
    const n = document.createElement('span'); n.className = 'nombre'; n.textContent = a.nombre;
    const t = document.createElement('span'); t.className = 'tam'; t.textContent = estado ? tr(estado) : tam(a.tam);
    f.append(n, t);
    if (a.url) {
      if (/^image\/(png|jpe?g|gif|webp|heic|heif|avif)$/i.test(a.mime || '')) { const i = document.createElement('img'); i.src = a.url; i.alt = ''; f.prepend(i); }
      const d = document.createElement('a'); d.className = 'cristal'; d.href = a.url; d.download = a.nombre; d.append(textoTarjeta('guardar')); f.append(d);
    } else { const b = document.createElement('span'); b.className = 'barra'; b.append(document.createElement('i')); f.append(b); }
    return tarjeta('a-' + a.id, f, a.dir || 'suya', a.url ? 90000 : 0);
  }
  function filaArchivo(a) {
    tarjetaArchivo(a);
    quitaVacio();
    const li = document.createElement('li'); li.className = 'msg archivo ' + a.dir; li.dataset.id = a.id;
    const n = document.createElement('span'); n.className = 'nombre'; n.textContent = a.nombre;
    const t = document.createElement('span'); t.className = 'tam'; t.textContent = tam(a.tam);
    const b = document.createElement('span'); b.className = 'barra'; b.append(document.createElement('i'));
    li.append(n, t, b); lista.append(li); abajo();
    return li;
  }
  const fila = (id) => lista.querySelector('li.archivo[data-id="' + CSS.escape(id) + '"]');
  function enviaArchivos(files) {
    for (const f of files) {
      const r = M.enviaArchivo(f);
      if (!r.ok) { sistema(r.por === 'grande' ? 'archivoGrande' : 'archivoNo', '(' + f.name + ')'); continue; }
      filaArchivo({ id: r.id, dir: 'mia', nombre: r.nombre, tam: r.tam });
    }
  }
  $('#archivo').addEventListener('change', (e) => { enviaArchivos([...e.target.files]); e.target.value = ''; });
  sala.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); sala.classList.add('arrastra'); } });
  sala.addEventListener('dragleave', (e) => { if (e.target === sala || !sala.contains(e.relatedTarget)) sala.classList.remove('arrastra'); });
  sala.addEventListener('drop', (e) => { e.preventDefault(); sala.classList.remove('arrastra'); if (e.dataTransfer && e.dataTransfer.files.length) enviaArchivos([...e.dataTransfer.files]); });
  M.on('archivo', (a) => filaArchivo(a));
  M.on('archivo-progreso', (p) => { const li = fila(p.id); if (li) li.querySelector('.barra i').style.width = Math.round(p.hecho * 100) + '%'; const c = avisos.querySelector('li[data-id="a-' + CSS.escape(p.id) + '"] .barra i'); if (c) c.style.width = Math.round(p.hecho * 100) + '%'; });
  M.on('archivo-enviado', (p) => { const c = avisos.querySelector('li[data-id="a-' + CSS.escape(p.id) + '"]'); if (c) { const t = c.querySelector('.tam'); if (t) { t.dataset.t = 'archivoEnviado'; t.textContent = tr('archivoEnviado'); } const b = c.querySelector('.barra'); if (b) b.remove(); clearTimeout(c._t); c._t = setTimeout(() => c.remove(), 5000); } const li = fila(p.id); if (!li) return; li.querySelector('.barra i').style.width = '100%'; const s = document.createElement('span'); s.className = 'tam'; s.dataset.t = 'archivoEnviado'; s.textContent = tr('archivoEnviado'); li.append(s); });
  M.on('archivo-listo', (a) => {
    tarjetaArchivo(Object.assign({ dir: 'suya' }, a));
    const li = fila(a.id); if (!li) return;
    li.querySelector('.barra i').style.width = '100%';
    const d = document.createElement('a'); d.className = 'cristal'; d.href = a.url; d.download = a.nombre;
    const s = document.createElement('span'); s.dataset.t = 'descargar'; s.textContent = tr('descargar'); d.append(s); li.append(d); abajo();
  });
  M.on('archivo-cancelado', (p) => { const li = fila(p.id); if (li) li.remove(); sistema('archivoCancelado'); });

  // ---------- las cuatro palabras ----------
  // (pueden llegar antes de abrir la sala: quien inicia las saca en cuanto tiene la respuesta)
  function pintaPalabras(w) {
    if (!w) return;
    const p = $('#palabras'); p.textContent = '';
    for (const x of w) { const s = document.createElement('span'); s.textContent = x; p.append(s); }
    $('#sala-palabras').hidden = false; sala.classList.add('por-comprobar');
  }
  M.on('palabras', (w) => { if (abierta && !continuada) pintaPalabras(w); });
  $('#coinciden').addEventListener('click', () => {
    M.comprobadas(); $('#sala-palabras').classList.add('hecho'); $('#palabras-botones').hidden = true; sala.classList.remove('por-comprobar');
    const a = $('#palabras-ayuda'); a.dataset.t = 'palabrasHechas'; a.textContent = tr('palabrasHechas');
  });
  $('#no-coinciden').addEventListener('click', () => M.termina('no-coinciden'));
  M.on('su-comprobacion', () => sistema('suComprobacion'));

  // ---------- la videollamada ----------
  let tiempo = null;
  // En el móvil, la videollamada se ve en grande, a pantalla completa (dueño, 14:29: «en cuanto se pasa al móvil… que se vea en
  // grande, pantalla completa en el móvil»); «Chat» la encoge para escribir y «Ampliar» la vuelve a poner grande.
  const movil = matchMedia('(max-width: 760px)');
  let grande = false, llamadaVista = false;
  // En el móvil (dueño, 15:49–15:53: «simplificado al máximo… como tenemos en GUARDIANA el modo móvil»): la llamada a pantalla
  // completa y abajo, botones redondos: rojo para colgar; al colgar o si se corta, verde para volver a llamar (css/elixir.css). Sin
  // palabras ni chat. Mientras la llamada de la invitación está por llegar, «Conectando la llamada…» (sin botón, para no cruzarse).
  let ultimo = { estado: 'libre' }, esperaLlamada = false, esperaT = null;
  // Si el navegador no deja arrancar la imagen y el sonido sin un toque (dueño, 15:50: Android con Brave: «ni me escuchaba y veía toda
  // la pantalla negra»; en GUARDIANA pasó igual el 2 de noviembre): «Toca para ver y oír a la otra persona», y con el toque, arranca.
  function intentaVer() {
    const vs = $('#video-suyo'); if (!vs.srcObject) return;
    try { const p = vs.play(); if (p && p.catch) p.catch((x) => { if (x && x.name === 'NotAllowedError' && abierta) $('#video-toca').hidden = false; }); } catch (_) {}
  }
  $('#video-suyo').addEventListener('playing', () => { $('#video-toca').hidden = true; });
  $('#video-toca').addEventListener('click', () => {
    $('#video-toca').hidden = true;
    for (const v of [$('#video-suyo'), $('#video-mio')]) { try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
  });
  // la cámara propia, donde se quiera (dueño, 15:53: «que podamos mover la cámara donde queramos»): se arrastra con el dedo
  {
    const vm = $('#video-mio'); let d = null;
    const ponEn = (x, y) => { vm.style.setProperty('left', x + 'px', 'important'); vm.style.setProperty('top', y + 'px', 'important'); vm.style.setProperty('right', 'auto', 'important'); vm.style.setProperty('bottom', 'auto', 'important'); };
    vm.addEventListener('pointerdown', (e) => { if (!movil.matches) return; const r = vm.getBoundingClientRect(); d = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height }; try { vm.setPointerCapture(e.pointerId); } catch (_) {} vm.classList.add('moviendo'); e.preventDefault(); });
    vm.addEventListener('pointermove', (e) => { if (!d || e.pointerId !== d.id) return; ponEn(Math.round(Math.max(8, Math.min(innerWidth - d.w - 8, e.clientX - d.dx))), Math.round(Math.max(8, Math.min(innerHeight - d.h - 8, e.clientY - d.dy)))); });
    const suelta = (e) => { if (!d || e.pointerId !== d.id) return; d = null; vm.classList.remove('moviendo'); };
    vm.addEventListener('pointerup', suelta); vm.addEventListener('pointercancel', suelta);
  }
  $('#salir-llamada').addEventListener('click', () => M.termina('mio'));
  // Los tonos, como en GUARDIANA (dueño, 16:09: al volver a llamar no sonaba nada): quien llama oye el tono de llamada; a quien le
  // llaman le suena el timbre (y en Android vibra). Con el audio del navegador, que se desbloquea con el primer toque en la página.
  let ctxT = null, tonoT = null, tonoYa = '';
  const nodosT = new Set();
  function ctxTonos() {
    if (!ctxT) { try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctxT = new AC({ latencyHint: 'interactive' }); } catch (_) { return null; } }
    if (ctxT.state === 'suspended') ctxT.resume().catch(() => {});
    return ctxT;
  }
  for (const g of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(g, () => { if (document.body.classList.contains('cerrado') || abierta) { const c = ctxTonos(); if (c && !tonoT) c.suspend().catch(() => {}); } }, { capture: true, passive: true });
  const vibra = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (_) {} };
  function paraTono() { clearInterval(tonoT); tonoT = null; tonoYa = ''; for (const n of nodosT) { try { n.stop(); } catch (_) {} } nodosT.clear(); vibra(0); if (ctxT && ctxT.state === 'running') ctxT.suspend().catch(() => {}); }
  function tono(tipo) {
    if (tonoYa === tipo) return;
    paraTono(); const ctx = ctxTonos(); if (!ctx) return; tonoYa = tipo;
    const suena = (f, ini, dur, vol, cola) => {
      for (const [k, w, caida] of cola ? [[1, 1, 4.2], [2, 0.35, 7], [3.01, 0.12, 11]] : [[1, 1, 0], [2, 0.12, 0]]) {
        const os = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + ini;
        os.type = 'sine'; os.frequency.value = f * k;
        if (cola) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol * w, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4 / caida); dur = 4 / caida; }
        else { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol * w, t0 + 0.015); g.gain.setValueAtTime(vol * w, t0 + dur - 0.04); g.gain.linearRampToValueAtTime(0, t0 + dur); }
        os.connect(g).connect(ctx.destination); os.start(t0); os.stop(t0 + dur + 0.05); nodosT.add(os); os.onended = () => nodosT.delete(os);
      }
    };
    const ciclo = tipo === 'saliente' ? () => suena(425, 0, 1.2, 0.16, false)
      : () => { suena(740, 0, 0, 0.26, true); suena(587, 0.42, 0, 0.26, true); suena(740, 1.1, 0, 0.24, true); suena(587, 1.52, 0, 0.24, true); vibra([350, 150, 350]); };
    ciclo(); tonoT = setInterval(() => { if (ctx.state !== 'running') ctx.resume().catch(() => {}); ciclo(); }, tipo === 'saliente' ? 4000 : 2600);
  }
  function ponGrande(si) { grande = !!si; sala.classList.toggle('video-grande', grande && sala.classList.contains('en-llamada')); const x = $('#b-chat-texto'); x.dataset.t = grande ? 'chat' : 'ampliar'; x.textContent = tr(x.dataset.t); if (grande) $('#b-chat').classList.remove('nuevo'); }
  $('#b-chat').addEventListener('click', () => ponGrande(!grande));
  const mmss = (ms) => { const q = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(q / 60) + ':' + String(q % 60).padStart(2, '0'); };
  function rotuloLlamar(k) { const s = $('#llamar span'); s.dataset.t = k; s.textContent = tr(k); }
  function pintaLlamada(e) {
    const velo = $('#video-velo'), boton = $('#llamar'), ent = $('#entrante'), txt = $('#video-texto'), ctl = $('#controles');
    const vs = $('#video-suyo'), vm = $('#video-mio');
    const pon = (k) => { txt.dataset.t = k; txt.textContent = tr(k); };
    clearInterval(tiempo); tiempo = null; $('#video-tiempo').hidden = true;
    ultimo = e; if (e.estado !== 'libre') { esperaLlamada = false; clearTimeout(esperaT); }
    { const c = $('#video-cifrado span'), k = e.sinCapa ? 'cifradaEstandar' : 'cifradaExtremo'; if (c && c.dataset.t !== k) { c.dataset.t = k; c.textContent = tr(k); } }
    if (e.estado === 'llamando') tono('saliente'); else if (e.estado === 'entrante' && !(window.Elixire && window.Elixire.contestaSola)) tono('entrante'); else paraTono();
    const m = movil.matches;
    if (e.estado !== 'hablando') $('#video-reto').hidden = true;
    if (e.local && vm.srcObject !== e.local) vm.srcObject = e.local;
    if (e.remoto && vs.srcObject !== e.remoto) { vs.srcObject = e.remoto; intentaVer(); }
    if (e.estado === 'hablando') intentaVer(); else if (e.estado !== 'reconectando') $('#video-toca').hidden = true;
    const hablando = e.estado === 'hablando' || e.estado === 'reconectando';
    const activa = hablando || ['preparando', 'llamando', 'conectando'].includes(e.estado);
    sala.classList.toggle('en-llamada', hablando); sala.classList.toggle('con-video', activa || e.estado === 'entrante');
    $('#video-reconecta').hidden = e.estado !== 'reconectando';
    if (hablando && !llamadaVista) { llamadaVista = true; ponGrande(movil.matches); } else if (!hablando) { llamadaVista = false; }
    sala.classList.toggle('video-grande', grande && hablando);
    ent.hidden = e.estado !== 'entrante';
    boton.hidden = (e.estado !== 'libre' && e.estado !== 'fin') || (m && e.estado === 'libre' && esperaLlamada) || (m && e.estado === 'fin' && (!!e.prueba || e.motivo === 'se-fue'));
    $('#salir-llamada').hidden = !(e.estado === 'libre' || e.estado === 'fin');
    ctl.hidden = !activa;
    velo.hidden = hablando;
    $('#video-capa').hidden = !(e.estado === 'hablando' && e.capa);
    if (e.estado === 'libre') { if (m) { if (esperaLlamada) pon('conectandoLlamada'); else if (M.sinLimite) txt.textContent = ''; else pon('pruebaLimite'); rotuloLlamar('llamar'); } else if (M.sinLimite) txt.textContent = ''; else pon('pruebaLimite'); }
    else if (e.estado === 'preparando') pon('llPreparando');
    else if (e.estado === 'llamando') pon('llLlamando');
    else if (e.estado === 'entrante') pon('llEntrante');
    else if (e.estado === 'conectando') pon('llConectando');
    else if (hablando) {
      // sin límite (dueño, 16:11), el tiempo que lleva la llamada; con límite, el que queda de prueba
      const pinta = () => { const t = $('#video-tiempo'); t.hidden = false; t.textContent = ''; if (M.sinLimite) { t.append(document.createTextNode(mmss(Date.now() - e.t0))); return; } const s = document.createElement('small'); s.textContent = tr('prueba'); t.append(s, document.createTextNode(mmss(e.limite - (Date.now() - e.t0)))); };
      pinta(); tiempo = setInterval(pinta, 250);
      $('#b-micro').setAttribute('aria-pressed', String(e.mic)); $('#b-camara').setAttribute('aria-pressed', String(e.cam));
    } else if (e.estado === 'fin') {
      vs.srcObject = null; vm.srcObject = null;
      // se cortó (o falló) y queda tiempo de prueba: «Volver a llamar»
      const cortada = e.motivo === 'caida' || e.motivo === 'fallo';
      if (e.prueba) { pon('pruebaFin'); boton.disabled = true; rotuloLlamar('videollamada'); }
      else if (M.sinLimite) { txt.textContent = ''; rotuloLlamar(cortada ? 'volverLlamar' : 'videollamada'); }
      else { if (e.resto && e.resto < M.PRUEBA_MS) { txt.dataset.t = 'pruebaQueda'; txt.textContent = tr('pruebaQueda').replace('{t}', mmss(e.resto)); } else pon('pruebaLimite'); rotuloLlamar(cortada ? 'volverLlamar' : 'videollamada'); }
      const k = { prueba: 'llFinPrueba', rechazada: 'llRechazada', rechaza: 'llRechazada', suyo: 'llColgo', ocupado: 'llOcupado', 'sin-respuesta': 'llSinRespuesta', fallo: 'llFallo', caida: 'llCaida', 'sin-turn': 'llSinTurn', 'sin-permiso': 'llSinPermiso', 'sin-capa': 'llSinCapaSuya', 'se-fue': 'seFue', mio: 'llTerminada' }[e.motivo];
      if (k && abierta) sistema(k);
      // en el móvil, lo que ha pasado, en el centro; y el verde: «Volver a llamar»
      if (m) { if (k) pon(k); if (!e.prueba) rotuloLlamar('volverLlamar'); }
    }
  }
  M.on('llamada', (e) => {
    if (abierta) pintaLlamada(e);
    const E = window.Elixire || {};
    if (abierta && e.estado === 'entrante' && E.contestaSola) { E.contestaSola = false; M.contestar(); }
  });
  M.on('llamada-aviso', (por) => { if (por === 'sin-capa-mia' || por === 'sin-capa-suya') { if (abierta) { const k = por === 'sin-capa-mia' ? 'llSinCapaMiaNormal' : 'llSinCapaSuyaNormal'; if (movil.matches) tarjeta('capa', textoTarjeta(k), 'sistema', 12000); else sistema(k); } return; } if (abierta && movil.matches && ultimo.estado !== 'hablando') { const k = { 'sin-capa': 'llSinCapa', 'sin-medios': 'llSinMedios', 'sin-sesion': 'llSinSesion', 'sin-turn': 'llSinTurn', 'prueba-usada': 'llFinPrueba', descifra: 'llDescifra' }[por] || 'llFallo'; const t = $('#video-texto'); t.dataset.t = k; t.textContent = tr(k); } if (abierta) sistema({ 'sin-capa': 'llSinCapa', 'sin-medios': 'llSinMedios', 'sin-sesion': 'llSinSesion', 'sin-turn': 'llSinTurn', 'prueba-usada': 'llFinPrueba', descifra: 'llDescifra' }[por] || 'llFallo'); });
  // la prueba de vida: el reto, grande en el centro durante 12 segundos (en los dos lados)
  const RETOS = ['reto0', 'reto1', 'reto2', 'reto3', 'reto4', 'reto5', 'reto6'];
  let retoT = null;
  M.on('reto', (r) => {
    if (!abierta) return;
    const caja = $('#video-reto'), et = $('#reto-etiqueta'), tx = $('#reto-texto');
    et.dataset.t = r.mio ? 'retoPedido' : 'retoParaTi'; et.textContent = tr(et.dataset.t);
    tx.textContent = tr(RETOS[r.i] || 'reto0').replace('{w}', r.w || '');
    caja.hidden = false; clearTimeout(retoT); retoT = setTimeout(() => { caja.hidden = true; }, 12000);
    sistema(r.mio ? 'retoSistemaMio' : 'retoSistemaSuyo', '«' + tx.textContent + '»');
  });
  $('#b-reto').addEventListener('click', () => M.reto());
  $('#llamar').addEventListener('click', () => M.llamar());
  $('#aceptar').addEventListener('click', () => M.contestar());
  $('#rechazar').addEventListener('click', () => M.rechazar());
  $('#b-colgar').addEventListener('click', () => M.colgar());
  $('#b-micro').addEventListener('click', (e) => M.micro(e.currentTarget.getAttribute('aria-pressed') !== 'true'));
  $('#b-camara').addEventListener('click', (e) => M.camara(e.currentTarget.getAttribute('aria-pressed') !== 'true'));

  // ---------- el estado de la conversación ----------
  M.on('conectado', () => {
    continuada = false; abre(); sistema('mConectado');
    // invitación a una llamada: quien entra con el enlace llama sin más; quien invitó contesta sola (ver puerta.js)
    const E = window.Elixire || {};
    esperaLlamada = !!(E.llamaAlEntrar || E.contestaSola); clearTimeout(esperaT);
    if (esperaLlamada) esperaT = setTimeout(() => { esperaLlamada = false; if (abierta && ultimo.estado === 'libre') pintaLlamada(ultimo); }, 15000);
    if (ultimo.estado === 'libre') pintaLlamada(ultimo);
    if (E.llamaAlEntrar) { E.llamaAlEntrar = false; setTimeout(() => { if (abierta) M.llamar(); }, 150); }
  });

  // ---------- pasar la conversación al móvil con un QR (motor.js: pasaMovil) ----------
  const dm = $('#movil');
  function cierraMovil() { dm.hidden = true; $('#movil-qr').removeAttribute('src'); }
  function pasoMovil(n) { $('#movil-paso1').hidden = n !== 1; $('#movil-paso2').hidden = n !== 2; $('#movil-si').hidden = n !== 2; $('#movil-si').disabled = false; const x = $('#movil-no-texto'); x.dataset.t = n === 2 ? 'movilNo' : 'cancelar'; x.textContent = tr(x.dataset.t); }
  const errorDm = (k) => { const e = $('#movil-error'); if (k) e.dataset.t = k; e.textContent = k ? tr(k) : ''; };
  $('#b-movil').addEventListener('click', async () => {
    const r = await M.pasaMovil(); if (!r.ok || typeof window.qrSvg !== 'function') return;
    $('#movil-qr').src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(window.qrSvg(r.enlace + '&l=' + (window.ElixireIdioma ? window.ElixireIdioma.actual() : 'en')));
    errorDm(''); pasoMovil(1); dm.hidden = false; setTimeout(() => $('#movil-no').focus(), 50);
  });
  $('#movil-no').addEventListener('click', () => { M.cancelaMovil(); cierraMovil(); });
  $('#movil-si').addEventListener('click', () => { if (M.confirmaMovil()) { $('#movil-si').disabled = true; errorDm(''); const e = $('#movil-error'); e.dataset.t = 'movilPasando'; e.textContent = tr('movilPasando'); } });
  M.on('par-palabras', (w) => {
    if (dm.hidden) return;
    const p = $('#movil-palabras'); p.textContent = ''; for (const x of w) { const s = document.createElement('span'); s.textContent = x; p.append(s); }
    pasoMovil(2);
  });
  M.on('par-fin', (f) => { if (!dm.hidden) { pasoMovil(1); $('#movil-qr').removeAttribute('src'); errorDm(f && f.motivo === 'caduca' ? 'movilCaducado' : 'movilCancelado'); } });
  M.on('traspasada', () => { cierraMovil(); cierra(); aviso('movilHechoEtiqueta', 'movilHechoTitulo', 'movilHechoTexto', false); });
  // la otra persona pasa al móvil: esta sala sigue abierta y continúa con su móvil, con claves nuevas
  M.on('traspaso', () => { if (abierta) { ponEstado('traspasoEspera', false); sistema('traspasoEspera'); } });
  M.on('continua', (e) => {
    continuada = true;
    if (!abierta) abre();
    $('#sala-palabras').hidden = true; sala.classList.remove('por-comprobar'); ponEstado('salaEstado', false); pintaLlamada({ estado: 'libre' }); $('#llamar').disabled = false;
    sistema(e && e.movil ? 'continuaAqui' : 'continuaSuMovil');
  });
  M.on('claves', (c) => { if (abierta && c.renovada) sistema('clavesRenovadas'); });
  M.on('se-va', () => { if (abierta) { ponEstado('seFue', true); sistema('seFue'); } });
  M.on('vuelve', () => { if (abierta) { ponEstado('salaEstado', false); sistema('vuelve'); } });
  M.on('intruso', () => { if (abierta) sistema('intruso'); });
  M.on('integridad', () => { if (abierta) sistema('integridad'); });
  M.on('red', (si) => { if (abierta) ponEstado(si ? 'salaEstado' : 'sinRed', !si); });
  $('#terminar').addEventListener('click', () => M.termina('mio'));
  M.on('fin', (f) => {
    const enSala = abierta; cierraMovil(); cierra();
    const textos = {
      mio: ['finEtiqueta', 'finTitulo', 'finTexto', false], suyo: ['finEtiqueta', 'finSuyoTitulo', 'finTexto', false],
      alarma: ['alarmaEtiqueta', 'alarmaTitulo', 'alarmaTexto', true], 'alarma-suya': ['alarmaEtiqueta', 'alarmaTitulo', 'alarmaTexto', true],
      'no-coinciden': ['alarmaEtiqueta', 'noCoincidenTitulo', 'noCoincidenTexto', true],
    }[f.motivo];
    if (textos && (enSala || f.motivo.startsWith('alarma'))) aviso(...textos);
  });

  // ---------- avisos ----------
  function aviso(etiqueta, titulo, cuerpo, mal, enlace) {
    const a = $('#aviso'); a.classList.toggle('mal', !!mal); $('#aviso-enlace').hidden = !enlace;
    for (const [id, k] of [['#aviso-etiqueta', etiqueta], ['#aviso-titulo', titulo], ['#aviso-texto', cuerpo]]) { const e = $(id); e.dataset.t = k; e.textContent = tr(k); }
    a.hidden = false; setTimeout(() => $('#aviso-ok').focus(), 50);
  }
  $('#aviso-ok').addEventListener('click', () => { $('#aviso').hidden = true; });
  window.ElixireAviso = aviso;
  // «Verificar esta página»: el código es público y cada script lleva su huella SHA-384 (herramientas/huellas.py)
  for (const v of document.querySelectorAll('.verificar')) v.addEventListener('click', (e) => { e.preventDefault(); aviso('verificarEtiqueta', 'verificarTitulo', 'verificarTexto', false, true); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#aviso').hidden) $('#aviso').hidden = true; });
})();
