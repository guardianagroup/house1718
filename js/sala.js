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
  // solo en vertical (dueño, 17:09): donde el navegador deja fijar la orientación, se fija; si no, en horizontal sale «Gira el móvil»
  try { if (screen.orientation && screen.orientation.lock && matchMedia('(pointer: coarse)').matches) screen.orientation.lock('portrait').catch(() => {}); } catch (_) {}
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
    paraNota(false); descartaRevision(); cierraPrevia(false); cierraHoja(); cierraChat(); sinLeer = 0; pintaCuenta(); paraReproductor(); for (const n of notas.values()) if (n.mia && n.url) URL.revokeObjectURL(n.url); notas.clear();
    lista.textContent = ''; texto.value = ''; ajusta(); pintaVoz(); avisos.textContent = ''; menuEnviar.hidden = true; visor.hidden = true; $('#visor-img').removeAttribute('src'); archivosVivos.clear(); for (const u of previas.values()) URL.revokeObjectURL(u); previas.clear();
    const vs = $('#video-suyo'), vm = $('#video-mio'); vs.srcObject = null; vm.srcObject = null; $('#video-toca').hidden = true;
    for (const k of ['left', 'top', 'right', 'bottom']) vm.style.removeProperty(k);
    if (window.Sala3D && window.Sala3D.pausa) window.Sala3D.pausa(false);
    if (window.Elixire && window.Elixire.reinvitando) window.Elixire.reinvitando = false; else if (window.Elixire) window.Elixire.vuelve();
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
    const b = document.createElement('b'); b.className = 'ubic'; b.textContent = '\u{1F4CD} ' + tr('ubicacion');
    const a = document.createElement('a'); a.className = 'cristal mapa'; a.href = 'https://www.google.com/maps?q=' + u[2] + ',' + u[3]; a.target = '_blank'; a.rel = 'noopener noreferrer';
    const s = document.createElement('span'); s.dataset.t = 'abrirMapa'; s.textContent = tr('abrirMapa'); a.append(s);
    f.append(b, a); return f;
  }
  function pintaMensaje(m) {
    quitaVacio();
    const li = document.createElement('li'); li.className = 'msg ' + m.dir + (m.dir === 'mia' ? ' enviado' : ''); li.dataset.id = m.id;
    li.append(contenido(m.texto)); toastMensaje(m);
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
    if (grab) { paraNota('enviar'); return; }
    if (revision) { enviaRevision(); return; }
    const m = M.envia(texto.value); if (!m) return;
    texto.value = ''; ajusta(); pintaVoz(); pintaMensaje(m);
  });
  texto.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#redactor').requestSubmit(); } });
  function ajusta() { texto.style.height = 'auto'; texto.style.height = Math.min(160, texto.scrollHeight + 2) + 'px'; }
  texto.addEventListener('input', () => { ajusta(); pintaVoz(); if (texto.value.trim()) M.escribe(); });
  let escribeT = null;
  M.on('escribe', () => { $('#escribiendo').hidden = false; clearTimeout(escribeT); escribeT = setTimeout(() => { $('#escribiendo').hidden = true; }, 3500); });
  M.on('mensaje', (m) => { $('#escribiendo').hidden = true; pintaMensaje(m); if (m.dir !== 'mia') noLeido(); });
  // ✓ enviado · ✓✓ entregado · ✓✓ azul leído (dueño, 23:20: «como otras apps»). Se da por leído lo que llega con el chat delante
  // (en el móvil, con el chat abierto; en el ordenador el chat siempre está a la vista) y la página visible.
  let leeT = null;
  function marcaLeidos() {
    clearTimeout(leeT); leeT = setTimeout(() => {
      if (document.visibilityState !== 'visible' || !abierta || (movil.matches && !enChat)) return;
      const ids = [...lista.querySelectorAll('li.msg.suya[data-id]:not(.leida)')].map((li) => { li.classList.add('leida'); return li.dataset.id; });
      if (ids.length && M.leidos) M.leidos(ids);
    }, 300);
  }
  new MutationObserver(marcaLeidos).observe(lista, { childList: true });
  document.addEventListener('visibilitychange', marcaLeidos);
  M.on('leido', (ids) => { for (const id of ids) { const li = lista.querySelector('li.mia[data-id="' + CSS.escape(id) + '"]'); if (li) li.classList.add('llego', 'leido'); } });
  // salir a otra app sin colgar (dueño, 23:21): la imagen de la otra persona pasa sola a una ventana flotante (imagen en imagen) donde el
  // navegador lo permite (Safari en iPhone y, con el aviso de la sesión de medios, Chrome). Tu cámara la pausa el propio móvil mientras
  // estás fuera; al volver, todo sigue.
  (() => {
    const vs = $('#video-suyo'); if (!vs) return;
    try { vs.autoPictureInPicture = true; vs.setAttribute('autopictureinpicture', ''); } catch (_) {}
    try { if (navigator.mediaSession && document.pictureInPictureEnabled) navigator.mediaSession.setActionHandler('enterpictureinpicture', () => { if (vs.srcObject && !document.pictureInPictureElement) vs.requestPictureInPicture().catch(() => {}); }); } catch (_) {}
  })();
  M.on('acuse', (ids) => { for (const id of ids) { const li = lista.querySelector('li.mia[data-id="' + CSS.escape(id) + '"]'); if (li) li.classList.add('llego'); } });

  // ---------- archivos ----------
  // ---------- en la llamada del móvil: avisos breves arriba y la foto a pantalla completa ----------
  // Dueño, 15:54: «y podamos adjuntar fotos, ubicación, etc.», como en GUARDIANA; 16:43: «la forma de aparecer en pantalla… me parece
  // algo rara; a ver si puedes profesionalizar eso». Cada envío y cada llegada, en un aviso compacto arriba (icono o miniatura, qué es
  // y su botón), que se va solo; la foto recibida se abre a pantalla completa con «Guardar». Las fotos salen ya reducidas (2048 px,
  // JPEG): con la llamada en marcha, una foto del móvil de 8 MB tardaba en llegar; reducida, son segundos.
  const avisos = $('#avisos-llamada'), previas = new Map();
  const NS = 'http://www.w3.org/2000/svg';
  const ICONOS = { pin: ['M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z', 'M12 7.6a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8z'], doc: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5'], foto: ['M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z', 'M12 8.6a3.4 3.4 0 1 0 0 6.8a3.4 3.4 0 1 0 0-6.8z'], ok: ['M5 12.5l4.2 4.2L19 7'], msj: ['M20 12.2c0 4.1-3.6 7.3-8 7.3-1.2 0-2.3-.2-3.3-.6L4.5 20l1.2-3.4C4.6 15.4 4 13.9 4 12.2 4 8.1 7.6 4.8 12 4.8s8 3.3 8 7.4z'], mic: ['M9 6a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0z', 'M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21'], play: ['M8 5.5v13l10.5-6.5z'], pausa: ['M8 5.5v13M16 5.5v13'], candado: ['M5.5 11h13v9.5h-13z', 'M8 11V7.5a4 4 0 0 1 8 0V11'] };
  const icono = (k) => { const v = document.createElementNS(NS, 'svg'); v.setAttribute('viewBox', '0 0 24 24'); v.setAttribute('aria-hidden', 'true'); for (const d of ICONOS[k] || ICONOS.doc) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); v.append(p); } return v; };
  const esFoto = (m) => /^image\/(png|jpe?g|gif|webp|heic|heif|avif)$/i.test(m || '');
  const esAudio = (m, n) => /^audio\//i.test(m || '') || /^nota-de-voz/i.test(n || '');
  function toast(id, o) {
    if (!movil.matches || !abierta || enChat) return null;
    let li = avisos.querySelector('li[data-id="' + CSS.escape(id) + '"]');
    if (!li) { li = document.createElement('li'); li.dataset.id = id; avisos.append(li); }
    li.className = 'toast' + (o.ok ? ' hecho' : ''); li.textContent = '';
    const ico = document.createElement('span'); ico.className = 't-ico';
    if (o.img) { const i = document.createElement('img'); i.src = o.img; i.alt = ''; ico.append(i); } else ico.append(icono(o.ok ? 'ok' : o.icono));
    const tx = document.createElement('span'); tx.className = 't-txt';
    const b = document.createElement('b'); b.textContent = o.titulo || ''; tx.append(b);
    if (o.sub) { const sm = document.createElement('small'); sm.textContent = o.sub; tx.append(sm); }
    if (o.progreso != null) { const ba = document.createElement('i'); ba.className = 't-barra'; const r = document.createElement('i'); r.style.width = Math.round(o.progreso * 100) + '%'; ba.append(r); tx.append(ba); }
    li.append(ico, tx);
    if (o.accion) {
      const a = document.createElement(o.accion.href ? 'a' : 'button'); a.className = 't-accion'; a.textContent = o.accion.texto;
      if (o.accion.href) { a.href = o.accion.href; if (o.accion.descarga) a.download = o.accion.descarga; else { a.target = '_blank'; a.rel = 'noopener noreferrer'; } }
      else { a.type = 'button'; a.addEventListener('click', (e) => { e.stopPropagation(); o.accion.fn(); }); }
      li.append(a);
    }
    li.onclick = (e) => { if (!e.target.closest('.t-accion')) { if (o.accion && o.accion.fn) o.accion.fn(); else li.remove(); } };
    while (avisos.children.length > 2) avisos.firstElementChild.remove();
    clearTimeout(li._t); if (o.ms) li._t = setTimeout(() => { li.classList.add('se-va'); setTimeout(() => li.remove(), 300); }, o.ms);
    return li;
  }
  const quitaToast = (id) => { const li = avisos.querySelector('li[data-id="' + CSS.escape(id) + '"]'); if (li) li.remove(); };
  // la foto recibida, a pantalla completa
  const visor = $('#visor-foto');
  function abreVisor(url, nombre) { $('#visor-img').src = url; const g = $('#visor-guardar'); g.href = url; g.download = nombre || 'foto.jpg'; visor.hidden = false; }
  $('#visor-cerrar').addEventListener('click', () => { visor.hidden = true; $('#visor-img').removeAttribute('src'); });
  async function comprimeFoto(f) {
    if (!/^image\/(jpe?g|png|webp|heic|heif)$/i.test(f.type || '') || f.size < 700 * 1024 || typeof createImageBitmap !== 'function') return f;
    try {
      let bmp; try { bmp = await createImageBitmap(f, { imageOrientation: 'from-image' }); } catch (_) { bmp = await createImageBitmap(f); }
      const k = Math.min(1, 2048 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); if (bmp.close) bmp.close();
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
      if (!blob || blob.size >= f.size) return f;
      return new File([blob], String(f.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch (_) { return f; }
  }
  const menuEnviar = $('#menu-enviar');
  $('#b-enviar').addEventListener('click', () => { menuEnviar.hidden = !menuEnviar.hidden; $('#b-enviar').setAttribute('aria-expanded', String(!menuEnviar.hidden)); });
  document.addEventListener('pointerdown', (e) => { if (!menuEnviar.hidden && !menuEnviar.contains(e.target) && !e.target.closest('#b-enviar')) { menuEnviar.hidden = true; $('#b-enviar').setAttribute('aria-expanded', 'false'); } }, true);
  $('#enviar-foto').addEventListener('click', () => { menuEnviar.hidden = true; $('#foto-llamada').click(); });
  $('#enviar-archivo').addEventListener('click', () => { menuEnviar.hidden = true; $('#archivo').click(); });
  $('#foto-llamada').addEventListener('change', async (e) => {
    const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return;
    const gs = []; for (const f of fs) gs.push(await comprimeFoto(f));
    abrePrevia(gs, true);
  });
  // ---------- antes de enviar: la foto o el archivo, con «Quitar» y «Enviar» (dueño, 18:20: «cuando una persona añade una foto y ya
  // la tiene seleccionada… no la puede deseleccionar… que se pueda deseleccionar. Y el audio igual») ----------
  const previa = $('#previa'); let pendientes = null;
  function abrePrevia(files, foto) {
    cierraPrevia(false); if (!files.length) return;
    const cuerpo = $('#previa-cuerpo'), urls = []; cuerpo.textContent = '';
    for (const f of files) {
      if (esFoto(f.type)) { const u = URL.createObjectURL(f); urls.push(u); const im = document.createElement('img'); im.src = u; im.alt = ''; cuerpo.append(im); }
      else { urls.push(null); const d = document.createElement('div'); d.className = 'previa-archivo'; const n = document.createElement('b'); n.textContent = f.name; const t = document.createElement('small'); t.textContent = tam(f.size); d.append(icono('doc'), n, t); cuerpo.append(d); }
    }
    cuerpo.classList.toggle('varias', files.length > 1);
    const todasFotos = files.every((f) => esFoto(f.type)), k = todasFotos ? (files.length > 1 ? 'previaFotos' : 'previaFoto') : (files.length > 1 ? 'previaArchivos' : 'previaArchivo');
    const tt = $('#previa-t'); tt.dataset.t = k; tt.textContent = tr(k);
    pendientes = { files, urls }; menuEnviar.hidden = true; previa.hidden = false; setTimeout(() => $('#previa-enviar').focus({ preventScroll: true }), 60);
  }
  function cierraPrevia(enviar) {
    const p = pendientes; pendientes = null; previa.hidden = true; $('#previa-cuerpo').textContent = '';
    if (!p) return;
    if (enviar) p.files.forEach((f, i) => enviaArchivos([f], p.urls[i] || undefined));
    else for (const u of p.urls) if (u) URL.revokeObjectURL(u);
  }
  $('#previa-enviar').addEventListener('click', () => cierraPrevia(true));
  $('#previa-quitar').addEventListener('click', () => cierraPrevia(false));
  $('#previa-cerrar').addEventListener('click', () => cierraPrevia(false));
  $('#enviar-ubicacion').addEventListener('click', () => {
    menuEnviar.hidden = true;
    if (!navigator.geolocation) { toast('ubi', { icono: 'pin', titulo: tr('sinUbicacion'), ms: 5000 }); return; }
    toast('ubi', { icono: 'pin', titulo: tr('buscandoUbicacion'), ms: 20000 });
    navigator.geolocation.getCurrentPosition((p) => {
      quitaToast('ubi');
      const m = M.envia('\u{1F4CD} ' + tr('miUbicacion') + '\nhttps://www.google.com/maps?q=' + p.coords.latitude.toFixed(6) + ',' + p.coords.longitude.toFixed(6));
      if (m) pintaMensaje(m);
    }, () => toast('ubi', { icono: 'pin', titulo: tr('sinUbicacion'), ms: 5000 }), { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
  });
  // los mensajes (la ubicación, o lo que escriba alguien desde el ordenador)
  function toastMensaje(m) {
    const u = UBICACION.exec(m.texto || '');
    if (u) {
      if (m.dir === 'mia') toast('m-' + m.id, { ok: true, titulo: tr('ubicacionEnviada'), ms: 2600 });
      else toast('m-' + m.id, { icono: 'pin', titulo: tr('ubicacionRecibida'), accion: { texto: tr('abrirMapa'), href: 'https://www.google.com/maps?q=' + u[2] + ',' + u[3] }, ms: 25000 });
      return;
    }
    if (m.dir !== 'mia') toast('m-' + m.id, { icono: 'msj', titulo: tr('mensajeNuevo'), sub: String(m.texto || '').slice(0, 140), accion: { texto: tr('responder'), fn: () => { quitaToast('m-' + m.id); abreChat(); } }, ms: 12000 });
  }
  // los archivos: enviando (con su avance) → enviado; recibiendo → la foto con «Ver», el archivo con «Guardar»
  function toastArchivo(a, fase, hecho) {
    const id = 'a-' + a.id;
    if (esAudio(a.mime, a.nombre)) {
      if (a.dir === 'mia') { if (fase === 'hecho') toast(id, { ok: true, titulo: tr('notaEnviada'), ms: 2600 }); else toast(id, { icono: 'mic', titulo: tr('enviandoNota'), progreso: hecho || 0 }); return; }
      if (fase === 'listo') toast(id, { icono: 'mic', titulo: tr('notaRecibida'), accion: { texto: tr('escuchar'), fn: () => { quitaToast(id); abreChat(); tocaNota(a.id); } }, ms: 30000 });
      else toast(id, { icono: 'mic', titulo: tr('recibiendoNota'), progreso: hecho || 0 });
      return;
    }
    const foto = esFoto(a.mime) || previas.has(a.id);
    if (a.dir === 'mia') {
      if (fase === 'hecho') { toast(id, { img: previas.get(a.id), ok: !previas.has(a.id), titulo: tr(foto ? 'fotoEnviada' : 'archivoEnviadoT'), sub: a.nombre && !foto ? a.nombre : '', ms: 2600 }); const u = previas.get(a.id); if (u) setTimeout(() => URL.revokeObjectURL(u), 4000); previas.delete(a.id); return; }
      toast(id, { img: previas.get(a.id), icono: foto ? 'foto' : 'doc', titulo: tr(foto ? 'enviandoFoto' : 'enviandoArchivo'), sub: foto ? '' : a.nombre, progreso: hecho || 0 });
      return;
    }
    if (fase === 'listo') {
      if (esFoto(a.mime)) toast(id, { img: a.url, titulo: tr('fotoRecibida'), sub: tr('tocaParaVer'), accion: { texto: tr('verFoto'), fn: () => abreVisor(a.url, a.nombre) }, ms: 30000 });
      else toast(id, { icono: 'doc', titulo: tr('archivoRecibido'), sub: a.nombre + ' · ' + tam(a.tam), accion: { texto: tr('guardar'), href: a.url, descarga: a.nombre }, ms: 40000 });
      return;
    }
    toast(id, { icono: esFoto(a.mime) ? 'foto' : 'doc', titulo: tr(esFoto(a.mime) ? 'recibiendoFoto' : 'recibiendoArchivo'), sub: esFoto(a.mime) ? '' : a.nombre, progreso: hecho || 0 });
  }
  const archivosVivos = new Map(); // id → { dir, nombre, tam, mime }
  function filaArchivo(a) {
    archivosVivos.set(a.id, a); toastArchivo(a, 'empieza', 0);
    if (a.dir !== 'mia') noLeido();
    quitaVacio();
    const li = document.createElement('li'); li.dataset.id = a.id;
    if (esAudio(a.mime, a.nombre)) { li.className = 'msg nota ' + a.dir; pintaNota(li, a); lista.append(li); abajo(); return li; }
    li.className = 'msg archivo ' + a.dir + (esFoto(a.mime) ? ' foto' : '');
    if (esFoto(a.mime) && previas.get(a.id)) li.append(miniatura(previas.get(a.id), a.nombre));
    const n = document.createElement('span'); n.className = 'nombre'; n.textContent = a.nombre;
    const t = document.createElement('span'); t.className = 'tam'; t.textContent = tam(a.tam);
    const b = document.createElement('span'); b.className = 'barra'; b.append(document.createElement('i'));
    li.append(n, t, b); lista.append(li); abajo();
    return li;
  }
  const fila = (id) => lista.querySelector('li.archivo[data-id="' + CSS.escape(id) + '"],li.nota[data-id="' + CSS.escape(id) + '"]');
  function enviaArchivos(files, previa, dur) {
    for (const f of files) {
      const r = M.enviaArchivo(f);
      if (!r.ok) { sistema(r.por === 'grande' ? 'archivoGrande' : 'archivoNo', '(' + f.name + ')'); if (previa) URL.revokeObjectURL(previa); continue; }
      if (previa && esAudio(f.type, f.name)) notas.set(r.id, { url: previa, dur: dur || 0, mia: true }); else if (previa) previas.set(r.id, previa);
      filaArchivo({ id: r.id, dir: 'mia', nombre: r.nombre, tam: r.tam, mime: f.type, dur });
    }
  }
  // la miniatura de una foto en la conversación: se toca y se abre a pantalla completa
  function miniatura(url, nombre) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'miniatura';
    const i = document.createElement('img'); i.src = url; i.alt = ''; b.append(i);
    b.addEventListener('click', () => abreVisor(url, nombre)); return b;
  }
  $('#archivo').addEventListener('change', (e) => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) abrePrevia(fs, false); });
  sala.addEventListener('dragover', (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); sala.classList.add('arrastra'); } });
  sala.addEventListener('dragleave', (e) => { if (e.target === sala || !sala.contains(e.relatedTarget)) sala.classList.remove('arrastra'); });
  sala.addEventListener('drop', (e) => { e.preventDefault(); sala.classList.remove('arrastra'); if (e.dataTransfer && e.dataTransfer.files.length) abrePrevia([...e.dataTransfer.files], false); });
  M.on('archivo', (a) => filaArchivo(a));
  M.on('archivo-progreso', (p) => { const li = fila(p.id); if (li) li.querySelector('.barra i').style.width = Math.round(p.hecho * 100) + '%'; const a = archivosVivos.get(p.id); if (a) toastArchivo(a, 'avanza', p.hecho); });
  M.on('archivo-enviado', (p) => { const a = archivosVivos.get(p.id); if (a) { toastArchivo(a, 'hecho'); archivosVivos.delete(p.id); } const li = fila(p.id); if (!li) return; li.querySelector('.barra i').style.width = '100%'; if (li.classList.contains('nota')) { li.classList.add('llego'); return; } const s = document.createElement('span'); s.className = 'tam'; s.dataset.t = 'archivoEnviado'; s.textContent = tr('archivoEnviado'); li.append(s); });
  M.on('archivo-listo', (a) => {
    { const v = archivosVivos.get(a.id) || {}; toastArchivo(Object.assign({ dir: 'suya' }, v, a), 'listo'); archivosVivos.delete(a.id); }
    const li = fila(a.id); if (!li) return;
    li.querySelector('.barra i').style.width = '100%';
    if (li.classList.contains('nota')) { notaLista(li, a); abajo(); return; }
    if (esFoto(a.mime)) li.prepend(miniatura(a.url, a.nombre));
    const d = document.createElement('a'); d.className = 'cristal'; d.href = a.url; d.download = a.nombre;
    const s = document.createElement('span'); s.dataset.t = 'descargar'; s.textContent = tr('descargar'); d.append(s); li.append(d); abajo();
  });
  M.on('archivo-cancelado', (p) => { const li = fila(p.id); if (li) li.remove(); sistema('archivoCancelado'); });

  // ---------- en la llamada del móvil: pasar al chat y volver al vídeo (dueño, 16:57: «la videollamada se debe poder pasar a
  // chat y después a vídeo nuevamente») ----------
  // «Chat» abre la conversación a pantalla completa; la otra persona sigue en directo en una miniatura arriba a la derecha (la
  // llamada no se corta: se la sigue oyendo y ella te sigue viendo) y «Vídeo», o un toque en la miniatura, vuelve. Con el vídeo
  // delante, lo que llega sale en un aviso con «Responder», y el botón «Chat» cuenta lo que no se ha leído.
  let enChat = false, sinLeer = 0;
  const cuentaChat = $('#chat-cuenta'), escena = $('#escena-video'), vv = window.visualViewport;
  function pintaCuenta() { cuentaChat.hidden = !sinLeer; cuentaChat.textContent = sinLeer > 9 ? '9+' : String(sinLeer); }
  function noLeido() { if (movil.matches && !enChat && abierta) { sinLeer++; pintaCuenta(); } }
  function ajustaVista() {
    if (!enChat) return;
    const h = vv ? vv.height : innerHeight, top = vv ? vv.offsetTop : 0;
    sala.style.setProperty('--vv-h', Math.round(h) + 'px'); sala.style.setProperty('--vv-top', Math.round(top) + 'px');
    sala.classList.toggle('teclado', innerHeight - h > 120);
  }
  if (vv) { vv.addEventListener('resize', () => { ajustaVista(); if (enChat) abajo(); }); vv.addEventListener('scroll', ajustaVista); }
  function abreChat() {
    if (!movil.matches || enChat || !abierta) return;
    if (window.ElixireComprueba && window.ElixireComprueba.cierra) window.ElixireComprueba.cierra();
    enChat = true; sinLeer = 0; pintaCuenta(); marcaLeidos(); menuEnviar.hidden = true; avisos.textContent = '';
    sala.classList.add('en-chat'); ajustaVista(); quitaVacio(); if (!lista.children.length) { const v = document.createElement('li'); v.className = 'vacio'; v.dataset.t = 'vacio'; v.textContent = tr('vacio'); lista.append(v); }
    $('#chat-tiempo').textContent = ultimo.t0 ? mmss(Date.now() - ultimo.t0) : '';
    requestAnimationFrame(abajo);
  }
  function cierraChat() {
    if (!enChat) return;
    enChat = false; paraNota(false); menuEnviar.hidden = true;
    if (document.activeElement === texto) texto.blur();
    sala.classList.remove('en-chat', 'teclado'); sala.style.removeProperty('--vv-h'); sala.style.removeProperty('--vv-top');
  }
  $('#chat-volver').addEventListener('click', cierraChat);
  escena.addEventListener('click', (e) => { if (enChat) { e.preventDefault(); e.stopPropagation(); if (!recienArrastrada) cierraChat(); } }, true);
  // «+» en el chat del móvil: lo mismo que «Enviar» en el vídeo (foto, ubicación o archivo)
  $('#redactor .adjuntar').addEventListener('click', (e) => { if (!enChat) return; e.preventDefault(); texto.blur(); menuEnviar.hidden = !menuEnviar.hidden; });
  document.addEventListener('pointerdown', (e) => { if (enChat && !menuEnviar.hidden && !menuEnviar.contains(e.target) && !e.target.closest('.adjuntar')) menuEnviar.hidden = true; }, true);

  // ---------- las notas de voz (dueño, 17:09: «el chat con audios y el botón fácil, como GUARDIANA») ----------
  // Como en GUARDIANA: con el campo vacío, el micrófono; un toque y graba (el punto rojo, el tiempo y el nivel de la voz); «Enviar»
  // la manda y la papelera la descarta. En una llamada se graba del mismo micrófono de la llamada (una copia de su pista: en el
  // iPhone, pedir el micrófono otra vez cortaría la voz de la llamada). MP4 (AAC) primero: lo abren todos los móviles.
  const FORMATOS_VOZ = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  const puedeVoz = !!(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  let grab = null;
  const nivel = $('#grabando-nivel'); for (let i = 0; i < 22; i++) nivel.append(document.createElement('i'));
  // (dueño, 18:20: «el audio igual»: se para con ■, se escucha, y se quita con la papelera o se envía)
  let revision = null; const oirNota = new Audio(); oirNota.preload = 'auto';
  function pintaVoz() {
    const hay = !!texto.value.trim(), ocupado = !!grab || !!revision;
    $('#b-voz').hidden = !puedeVoz || hay || ocupado;
    $('#enviar').hidden = puedeVoz && !hay && !ocupado;
    $('#grabando').hidden = !ocupado; texto.hidden = ocupado; $('#redactor .adjuntar').hidden = ocupado;
    $('#nv-parar').hidden = !grab; $('#nv-oir').hidden = !revision;
    $('#grabando').classList.toggle('revision', !!revision);
    $('#redactor').classList.toggle('grabando-ya', ocupado);
    if (grab) $('#grabando-t').textContent = mmss(Date.now() - grab.desde).replace(/^(\d+):/, '$1:');
    else if (revision) $('#grabando-t').textContent = mmss(revision.dur);
  }
  function descartaRevision() {
    const r = revision; revision = null; try { oirNota.pause(); } catch (_) {} oirNota.removeAttribute('src'); $('#grabando').classList.remove('sonando');
    if (r) URL.revokeObjectURL(r.url); pintaVoz();
  }
  function enviaRevision() {
    const r = revision; revision = null; try { oirNota.pause(); } catch (_) {} oirNota.removeAttribute('src'); $('#grabando').classList.remove('sonando');
    pintaVoz(); if (r) enviaArchivos([r.f], r.url, r.dur);
  }
  $('#nv-oir').addEventListener('click', () => {
    if (!revision) return;
    if (!oirNota.paused) { oirNota.pause(); return; }
    if (oirNota.getAttribute('src') !== revision.url) oirNota.src = revision.url;
    const p = oirNota.play(); if (p && p.catch) p.catch(() => {});
  });
  oirNota.addEventListener('play', () => $('#grabando').classList.add('sonando'));
  for (const ev of ['pause', 'ended']) oirNota.addEventListener(ev, () => $('#grabando').classList.remove('sonando'));
  $('#nv-parar').addEventListener('click', () => paraNota('revisar'));
  async function empiezaNota() {
    if (grab || !puedeVoz) return;
    const e = M.estadoLlamada ? M.estadoLlamada() : null;
    const viva = e && e.local ? e.local.getAudioTracks().find((t) => t.readyState === 'live') : null;
    let s;
    if (viva) { const c = viva.clone(); c.enabled = true; s = new MediaStream([c]); }
    else { try { s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); } catch (_) { sistema('notaSinMicro'); return; } }
    const ok = (x) => { try { return MediaRecorder.isTypeSupported(x); } catch (_) { return false; } };
    const tipo = FORMATOS_VOZ.find(ok) || '';
    let r; try { r = new MediaRecorder(s, tipo ? { mimeType: tipo, audioBitsPerSecond: 48000 } : undefined); } catch (_) { s.getTracks().forEach((t) => t.stop()); sistema('notaNo'); return; }
    const n = { s, r, trozos: [], desde: Date.now(), tipo: r.mimeType || tipo, enviar: false, reloj: null, ctx: null, raf: 0 };
    grab = n;
    r.ondataavailable = (ev) => { if (ev.data && ev.data.size) n.trozos.push(ev.data); };
    r.onstop = () => terminaNota(n);
    r.start(250);
    n.reloj = setInterval(() => { if (grab !== n) return; pintaVoz(); if (Date.now() - n.desde > 300000) paraNota('revisar'); }, 200);
    // el nivel de la voz mientras se graba (solo se mide aquí; no sale de este equipo)
    try {
      const AC = window.AudioContext || window.webkitAudioContext; n.ctx = new AC(); if (n.ctx.state === 'suspended') n.ctx.resume().catch(() => {});
      const an = n.ctx.createAnalyser(); an.fftSize = 512; n.ctx.createMediaStreamSource(s).connect(an);
      const b = new Uint8Array(an.fftSize), barras = [...nivel.children], hist = new Array(barras.length).fill(0.08); let ult = 0;
      const anima = (t) => {
        if (grab !== n) return;
        if (t - ult > 70) { ult = t; an.getByteTimeDomainData(b); let q = 0; for (const v of b) q += (v - 128) * (v - 128); hist.shift(); hist.push(Math.max(0.08, Math.min(1, Math.sqrt(q / b.length) / 40))); barras.forEach((x, i) => x.style.setProperty('--h', Math.round(hist[i] * 100) + '%')); }
        n.raf = requestAnimationFrame(anima);
      };
      n.raf = requestAnimationFrame(anima);
    } catch (_) {}
    vibra(18); pintaVoz();
  }
  function paraNota(modo) { const n = grab; if (!n) return; n.modo = modo || ''; try { if (n.r.state !== 'inactive') n.r.stop(); else terminaNota(n); } catch (_) { terminaNota(n); } }
  function terminaNota(n) {
    if (n.hecha) return; n.hecha = true;
    if (grab === n) grab = null;
    clearInterval(n.reloj); cancelAnimationFrame(n.raf); if (n.ctx) n.ctx.close().catch(() => {});
    n.s.getTracks().forEach((t) => t.stop());
    for (const x of nivel.children) x.style.removeProperty('--h');
    pintaVoz();
    const dur = Date.now() - n.desde;
    if (!n.modo || !n.trozos.length || dur < 700) return;
    const tipo = (n.tipo || 'audio/webm').split(';')[0], d = new Date(), p = (x) => String(x).padStart(2, '0');
    const nombre = 'nota-de-voz-' + Math.round(dur / 1000) + 's-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + (tipo === 'audio/mp4' ? '.m4a' : '.webm');
    const f = new File([new Blob(n.trozos, { type: tipo })], nombre, { type: tipo });
    if (n.modo === 'revisar') { revision = { f, url: URL.createObjectURL(f), dur }; pintaVoz(); return; }
    enviaArchivos([f], URL.createObjectURL(f), dur);
  }
  $('#b-voz').addEventListener('click', empiezaNota);
  $('#nv-cancelar').addEventListener('click', () => { if (grab) paraNota(''); else descartaRevision(); });
  pintaVoz();

  // ---------- las notas de voz en la conversación: su propio reproductor (reproducir, la onda y el tiempo) ----------
  const notas = new Map(); // id → { url, dur, mia, li, picos }
  const reproductor = new Audio(); reproductor.preload = 'metadata';
  let sonando = null;
  const durDeNombre = (n) => { const m = /^nota-de-voz-(\d{1,4})s-/.exec(n || ''); return m ? +m[1] * 1000 : 0; };
  function pintaNota(li, a) {
    const n = notas.get(a.id) || { url: null, dur: 0, mia: a.dir === 'mia' };
    n.li = li; n.dur = n.dur || a.dur || durDeNombre(a.nombre); notas.set(a.id, n);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'nota-play'; b.setAttribute('aria-label', tr('escuchar')); b.append(icono('play'), icono('pausa'));
    const onda = document.createElement('span'); onda.className = 'nota-onda'; for (let i = 0; i < 30; i++) onda.append(document.createElement('i'));
    const t = document.createElement('span'); t.className = 'nota-t'; t.textContent = n.dur ? mmss(n.dur) : '0:00';
    const ba = document.createElement('span'); ba.className = 'barra'; ba.append(document.createElement('i'));
    const h = document.createElement('span'); h.className = 'hora'; h.textContent = hora(Date.now());
    li.append(b, onda, t, h, ba);
    b.addEventListener('click', () => tocaNota(a.id));
    onda.addEventListener('click', (e) => { const r = onda.getBoundingClientRect(); tocaNota(a.id, Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); });
    if (n.url) notaLista(li, { id: a.id, url: n.url });
    else li.classList.add('esperando');
  }
  async function notaLista(li, a) {
    const n = notas.get(a.id); if (!n) return;
    n.url = a.url; li.classList.remove('esperando');
    const o = await ondaDe(a.url);
    if (o) { n.dur = o.dur; n.picos = o.picos; [...li.querySelectorAll('.nota-onda i')].forEach((x, i) => x.style.setProperty('--h', Math.round(o.picos[i] * 100) + '%')); li.querySelector('.nota-t').textContent = mmss(n.dur); }
    else li.classList.add('sin-onda');
  }
  async function ondaDe(url) {
    try {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return null;
      const datos = await (await fetch(url)).arrayBuffer();
      const ctx = new OAC(1, 1, 44100);
      const buf = await new Promise((ok, mal) => { const p = ctx.decodeAudioData(datos, ok, mal); if (p && p.then) p.then(ok, mal); });
      const c = buf.getChannelData(0), N = 30, paso = Math.max(1, Math.floor(c.length / N)), picos = [];
      for (let i = 0; i < N; i++) { let m = 0; for (let k = i * paso, f = Math.min(c.length, (i + 1) * paso); k < f; k += 8) { const v = Math.abs(c[k]); if (v > m) m = v; } picos.push(m); }
      const max = Math.max(0.02, ...picos);
      return { dur: buf.duration * 1000, picos: picos.map((x) => Math.max(0.14, Math.min(1, Math.sqrt(x / max)))) };
    } catch (_) { return null; }
  }
  function tocaNota(id, donde) {
    const n = notas.get(id); if (!n || !n.url) return;
    if (sonando !== id) { reproductor.src = n.url; sonando = id; }
    else if (donde == null && !reproductor.paused) { reproductor.pause(); return; }
    if (donde != null && n.dur) { try { reproductor.currentTime = donde * n.dur / 1000; } catch (_) {} }
    const p = reproductor.play(); if (p && p.catch) p.catch(() => {});
    pintaReproductor();
  }
  function pintaReproductor() {
    for (const [id, n] of notas) {
      if (!n.li) continue;
      const activo = sonando === id, dur = n.dur || (isFinite(reproductor.duration) ? reproductor.duration * 1000 : 0);
      const av = activo && dur ? Math.min(1, reproductor.currentTime * 1000 / dur) : 0;
      n.li.classList.toggle('sonando', activo && !reproductor.paused);
      const bs = n.li.querySelectorAll('.nota-onda i'), k = Math.round(av * bs.length);
      bs.forEach((x, i) => x.classList.toggle('oida', activo && i < k));
      const t = n.li.querySelector('.nota-t'); if (t) t.textContent = activo && reproductor.currentTime > 0 ? mmss(reproductor.currentTime * 1000) : dur ? mmss(dur) : '0:00';
    }
  }
  for (const ev of ['play', 'pause', 'timeupdate', 'loadedmetadata']) reproductor.addEventListener(ev, pintaReproductor);
  reproductor.addEventListener('ended', () => { sonando = null; pintaReproductor(); });
  function paraReproductor() { try { reproductor.pause(); reproductor.removeAttribute('src'); reproductor.load(); } catch (_) {} sonando = null; }

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
  // La otra persona ha salido de Elixire (dueño, 18:17: «si uno le da a volver a llamar y el otro ha salido completamente de la web,
  // que lo detecte… para que la persona no pierda el tiempo»): en vez de «Volver a llamar», «Invitar de nuevo».
  let otroFuera = false;
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
  // Arriba, cómo va la llamada (dueño, 16:44): «Encriptado poscuántico de extremo a extremo» solo cuando la capa ya está descifrando
  // lo que llega (antes, «Comprobando…»); si no hay capa, «Encriptado estándar» y lo que se ha negociado de verdad (DTLS y SRTP, de
  // las estadísticas del navegador); y la calidad de la conexión, junto al tiempo.
  let calidadUlt = null;
  const SRTP = { AES_CM_128_HMAC_SHA1_80: 'SRTP AES-128', AES_CM_128_HMAC_SHA1_32: 'SRTP AES-128', AEAD_AES_128_GCM: 'SRTP AES-128-GCM', AEAD_AES_256_GCM: 'SRTP AES-256-GCM' };
  const TLS = { FEFD: 'DTLS 1.2', FEFC: 'DTLS 1.3' };
  function textoEstandar() {
    const c = calidadUlt || {}, t = TLS[String(c.tls || '').toUpperCase()] || (c.tls ? 'DTLS' : ''), s = SRTP[String(c.srtp || '').toUpperCase()] || (c.srtp ? 'SRTP ' + c.srtp : '');
    return t || s ? [t, s].filter(Boolean).join(' · ') : 'DTLS-SRTP';
  }
  function pintaCifrado(e) {
    const c = $('#video-cifrado span'), d = $('#video-detalle'), en = e.estado === 'hablando' || e.estado === 'reconectando';
    const k = e.sinCapa ? 'cifradaEstandar' : e.capa || !en ? 'cifradaExtremo' : 'cifradaComprobando';
    if (c && c.dataset.t !== k) { c.dataset.t = k; c.textContent = tr(k); }
    $('#video-cifrado').classList.toggle('estandar', !!e.sinCapa); $('#video-cifrado').classList.toggle('comprobando', k === 'cifradaComprobando');
    d.hidden = !en || k === 'cifradaComprobando'; d.textContent = e.sinCapa ? textoEstandar() : 'ML-KEM-1024 · ECDH P-384 · AES-256-GCM';
    const cc = $('#chat-cifrado'), kc = e.sinCapa ? 'chatCifradoEstandar' : 'chatCifrado'; if (cc.dataset.t !== kc) { cc.dataset.t = kc; cc.textContent = tr(kc); }
  }
  M.on('calidad', (q) => { calidadUlt = q; if (ultimo.sinCapa) pintaCifrado(ultimo); });
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
  // Los tonos (dueño, 17:40: «que no se vea falso… el más profesional… sobrio, serio»): los de un teléfono de verdad.
  //  · Llamando (lo que oye quien llama): 425 Hz, un segundo sí y cuatro no: el tono de llamada de la UIT, el que se oye en los
  //    teléfonos de Colombia, España y casi toda Europa y Latinoamérica.
  //  · El timbre (a quien llaman): el «riiing» de un teléfono electrónico clásico, un trino de 20 Hz entre dos notas cercanas, en
  //    doble timbre (0,8 s, pausa, 0,8 s) cada 3,6 segundos; y en Android, la vibración al mismo ritmo.
  function tono(tipo) {
    if (tonoYa === tipo) return;
    paraTono(); const ctx = ctxTonos(); if (!ctx) return; tonoYa = tipo;
    const guarda = (o) => { nodosT.add(o); o.onended = () => nodosT.delete(o); };
    const pulso = (ini, dur, vol, fuente) => {
      const t0 = ctx.currentTime + ini, g = ctx.createGain();
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.setValueAtTime(vol, t0 + dur - 0.03); g.gain.linearRampToValueAtTime(0, t0 + dur);
      g.connect(ctx.destination); fuente(g, t0, dur);
    };
    const seno = (f) => (g, t0, dur) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(t0); o.stop(t0 + dur + 0.02); guarda(o); };
    const trino = (g, t0, dur) => {
      const o = ctx.createOscillator(), lfo = ctx.createOscillator(), prof = ctx.createGain(), suave = ctx.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = 1060; lfo.type = 'square'; lfo.frequency.value = 20; prof.gain.value = 115;
      suave.type = 'lowpass'; suave.frequency.value = 2800; suave.Q.value = 0.5;
      lfo.connect(prof).connect(o.frequency); o.connect(suave).connect(g);
      o.start(t0); lfo.start(t0); o.stop(t0 + dur + 0.02); lfo.stop(t0 + dur + 0.02); guarda(o); guarda(lfo);
    };
    const ciclo = tipo === 'saliente' ? () => pulso(0, 1.0, 0.15, seno(425))
      : () => { pulso(0, 0.8, 0.13, trino); pulso(1.2, 0.8, 0.13, trino); vibra([800, 400, 800]); };
    ciclo(); tonoT = setInterval(() => { if (ctx.state !== 'running') ctx.resume().catch(() => {}); ciclo(); }, tipo === 'saliente' ? 5000 : 3600);
  }

  // para «Llamando…» antes de la sala (js/puerta.js): el mismo tono de llamada
  window.ElixireTonos = { prepara: () => { ctxTonos(); }, saliente: () => tono('saliente'), para: () => paraTono() };
  function ponGrande(si) { grande = !!si; sala.classList.toggle('video-grande', grande && sala.classList.contains('en-llamada')); }
  $('#b-chat').addEventListener('click', () => abreChat());
  const mmss = (ms) => { const q = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(q / 60) + ':' + String(q % 60).padStart(2, '0'); };
  function rotuloLlamar(k) { const s = $('#llamar span'); s.dataset.t = k; s.textContent = tr(k); }
  function pintaLlamada(e) {
    const velo = $('#video-velo'), boton = $('#llamar'), ent = $('#entrante'), txt = $('#video-texto'), ctl = $('#controles');
    const vs = $('#video-suyo'), vm = $('#video-mio');
    const pon = (k) => { txt.dataset.t = k; txt.textContent = tr(k); };
    clearInterval(tiempo); tiempo = null; $('#video-tiempo').hidden = true; if (e.estado !== 'hablando' && e.estado !== 'reconectando') calidadUlt = null;
    ultimo = e; if (e.estado !== 'libre') { esperaLlamada = false; clearTimeout(esperaT); }
    pintaCifrado(e);
    if (e.estado === 'llamando') tono('saliente'); else if (e.estado === 'entrante' && !e.cruzada && !(window.Elixire && window.Elixire.contestaSola)) tono('entrante'); else paraTono();
    const m = movil.matches;
    if (e.estado !== 'hablando') $('#video-reto').hidden = true;
    if (e.local && vm.srcObject !== e.local) vm.srcObject = e.local;
    vm.classList.toggle('trasera', e.mira === 'environment');
    $('#b-girar').hidden = !(m && (e.estado === 'hablando' || e.estado === 'reconectando') && e.local && e.local.getVideoTracks().length && e.cam !== false);
    if (e.remoto && vs.srcObject !== e.remoto) { vs.srcObject = e.remoto; intentaVer(); }
    if (e.estado === 'hablando') intentaVer(); else if (e.estado !== 'reconectando') $('#video-toca').hidden = true;
    const hablando = e.estado === 'hablando' || e.estado === 'reconectando';
    const activa = hablando || ['preparando', 'llamando', 'conectando'].includes(e.estado);
    sala.classList.toggle('en-llamada', hablando); sala.classList.toggle('con-video', activa || e.estado === 'entrante');
    $('#video-reconecta').hidden = e.estado !== 'reconectando';
    if (hablando && !llamadaVista) { llamadaVista = true; ponGrande(movil.matches); } else if (!hablando) { llamadaVista = false; cierraChat(); }
    sala.classList.toggle('video-grande', grande && hablando);
    ent.hidden = e.estado !== 'entrante';
    const fuera = m && otroFuera && (e.estado === 'libre' || e.estado === 'fin');
    boton.hidden = (e.estado !== 'libre' && e.estado !== 'fin') || (m && e.estado === 'libre' && esperaLlamada && !fuera) || (m && e.estado === 'fin' && !!e.prueba);
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
      const pinta = () => { const t = $('#video-tiempo'); t.hidden = false; t.textContent = ''; if (calidadUlt && movil.matches) { const q = document.createElement('span'); q.className = 'calidad ' + calidadUlt.nivel; const b = document.createElement('i'); for (let n = 0; n < 4; n++) b.append(document.createElement('i')); q.append(b, document.createTextNode(tr('calidad_' + calidadUlt.nivel))); t.append(q); } if (enChat) $('#chat-tiempo').textContent = mmss(Date.now() - e.t0); if (M.sinLimite) { t.append(document.createTextNode(mmss(Date.now() - e.t0))); return; } const s = document.createElement('small'); s.textContent = tr('prueba'); t.append(s, document.createTextNode(mmss(e.limite - (Date.now() - e.t0)))); };
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
      // el código técnico del fallo, pequeño, para saber la causa (red, servidor de llamadas o teléfono)
      if (e.motivo === 'fallo' && e.diag && txt.dataset.t === 'llFallo') txt.textContent = tr('llFallo') + ' (' + e.diag + ')';
    }
    if (fuera) { pon('otroSalio'); rotuloLlamar('invitarDeNuevo'); }
  }
  M.on('llamada', (e) => {
    if (abierta) pintaLlamada(e);
    const E = window.Elixire || {};
    if (abierta && e.estado === 'entrante' && E.contestaSola) { E.contestaSola = false; M.contestar(); }
  });
  M.on('llamada-aviso', (por) => { if (por === 'sin-capa-mia' || por === 'sin-capa-suya') { if (abierta) { const k = por === 'sin-capa-mia' ? 'llSinCapaMiaNormal' : 'llSinCapaSuyaNormal'; if (movil.matches) toast('capa', { icono: 'candado', titulo: tr('encriptadoEstandarT'), sub: tr(k), ms: 12000 }); else sistema(k); } return; } if (abierta && movil.matches && ultimo.estado !== 'hablando') { const k = { 'sin-capa': 'llSinCapa', 'sin-medios': 'llSinMedios', 'sin-sesion': 'llSinSesion', 'sin-turn': 'llSinTurn', 'prueba-usada': 'llFinPrueba', descifra: 'llDescifra' }[por] || 'llFallo'; const t = $('#video-texto'); t.dataset.t = k; t.textContent = tr(k); } if (abierta) sistema({ 'sin-capa': 'llSinCapa', 'sin-medios': 'llSinMedios', 'sin-sesion': 'llSinSesion', 'sin-turn': 'llSinTurn', 'prueba-usada': 'llFinPrueba', descifra: 'llDescifra' }[por] || 'llFallo'); });
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
  // poca luz (dueño, 21:05): si mi imagen se ve muy oscura, me aviso en mi pantalla para que la otra persona me vea bien (y para que
  // «Comprobar» funcione). Cada 2 s, una versión diminuta de mi cámara; dos veces seguidas muy oscura: el aviso (como mucho uno por minuto).
  const luzL = document.createElement('canvas'); luzL.width = 24; luzL.height = 18; const luzG = luzL.getContext('2d', { willReadFrequently: true });
  let luzN = 0, luzUlt = 0;
  setInterval(() => {
    if (!abierta || document.hidden) return;
    const e = M.estadoLlamada ? M.estadoLlamada() : null; if (!e || e.estado !== 'hablando' || e.cam === false) { luzN = 0; return; }
    const v = $('#video-mio'); if (!v || !v.videoWidth || v.readyState < 2) return;
    let d; try { luzG.drawImage(v, 0, 0, 24, 18); d = luzG.getImageData(0, 0, 24, 18).data; } catch (_) { return; }
    let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    luzN = s / (d.length / 4) < 42 ? luzN + 1 : 0;
    if (luzN >= 2 && Date.now() - luzUlt > 60000) { luzUlt = Date.now(); if (movil.matches) toast('luz', { icono: 'foto', titulo: tr('pocaLuzT'), sub: tr('pocaLuz'), ms: 8000 }); else sistema('pocaLuz'); }
  }, 2000);
  $('#b-reto').addEventListener('click', () => M.reto());
  // la prueba del gesto: la orden llega de quien comprueba y se ve grande en el centro (sin mensajes en el chat)
  let gestoT = null;
  M.on('gesto', (g) => {
    if (!abierta || g.q === 'inicio') return;
    const caja = $('#video-reto'), et = $('#reto-etiqueta'), tx = $('#reto-texto');
    clearTimeout(gestoT);
    if (g.q === 'fin') { caja.classList.remove('gesto'); caja.hidden = true; return; }
    caja.classList.add('gesto'); caja.dataset.q = g.q;
    // el destello de color: su luz se refleja en una cara de verdad (quien comprueba lo mide en el vídeo)
    if (g.q === 'luz') { let fl = document.querySelector('.gesto-luz'); if (!fl) { fl = document.createElement('div'); fl.className = 'gesto-luz'; caja.parentElement.append(fl); } fl.style.setProperty('--c', g.n ? '#00FFFF' : '#FF00FF'); fl.classList.add('on'); setTimeout(() => fl.classList.remove('on'), 800); }
    et.dataset.t = 'gestoEtiqueta'; et.textContent = tr('gestoEtiqueta') + (g.n && g.de ? ' · ' + g.n + '/' + g.de : '');
    tx.textContent = tr('gesto_' + g.q) + (g.q === 'voz' && g.w ? ' «' + g.w + '»' : ''); caja.hidden = false;
    try { if (!['frente', 'luz'].includes(g.q) && navigator.vibrate) navigator.vibrate(40); } catch (_) {}
    gestoT = setTimeout(() => { caja.hidden = true; caja.classList.remove('gesto'); }, g.q === 'voz' || g.q === 'clave' ? 20000 : 6000);
  });
  // un solo toque: con una llamada ya en marcha (o llegando), «Volver a llamar» no hace nada (dueño, 16:30)
  $('#llamar').addEventListener('click', () => {
    if (ultimo.estado !== 'libre' && ultimo.estado !== 'fin') return; if (M.estadoLlamada().estado !== 'libre') return;
    if (movil.matches && (otroFuera || M.otroEsta === false)) { if (otroFuera && window.Elixire && window.Elixire.reinvita) { window.Elixire.reinvita(); return; } otroFuera = true; pintaLlamada(ultimo); return; }
    $('#llamar').hidden = true; M.llamar();
  });
  $('#aceptar').addEventListener('click', () => M.contestar());
  $('#rechazar').addEventListener('click', () => M.rechazar());
  $('#b-colgar').addEventListener('click', () => M.colgar());
  $('#b-micro').addEventListener('click', (e) => M.micro(e.currentTarget.getAttribute('aria-pressed') !== 'true'));
  $('#b-camara').addEventListener('click', (e) => M.camara(e.currentTarget.getAttribute('aria-pressed') !== 'true'));

  // ---------- el estado de la conversación ----------
  M.on('conectado', () => {
    continuada = false; otroFuera = false; abre(); sistema('mConectado');
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
  M.on('se-va', () => { otroFuera = true; if (abierta) { ponEstado('seFue', true); sistema('seFue'); if (ultimo.estado === 'libre' || ultimo.estado === 'fin') pintaLlamada(ultimo); } });
  M.on('vuelve', () => { otroFuera = false; if (abierta) { ponEstado('salaEstado', false); sistema('vuelve'); if (ultimo.estado === 'libre' || ultimo.estado === 'fin') pintaLlamada(ultimo); } });
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
    if (textos && (enSala || f.motivo.startsWith('alarma'))) aviso(...textos, false, f.motivo === 'suyo' && !!(window.Elixire && window.Elixire.reinvita));
  });

  // ---------- mantener pulsado un mensaje, una foto o una nota: «Copiar», «Borrar para todos» (lo tuyo) y «Borrar para mí» (dueño,
  // 18:20: «una vez que la foto está enviada… dejar pulsada y te dé la opción de borrar para los dos o borrar solo para uno»). En el
  // ordenador, con el botón derecho. «Para todos» viaja por la sesión encriptada; solo se borra lo que envió quien lo pide. ----------
  const hoja = $('#hoja-msg'); let objetivo = null, pulsaT = 0, pulsaXY = null;
  const borrable = (li) => li && li.classList.contains('msg') && !li.classList.contains('sistema') && !li.classList.contains('borrado') && !li.classList.contains('vacio');
  lista.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('li.msg'); if (!borrable(li) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    pulsaXY = [e.clientX, e.clientY]; clearTimeout(pulsaT); pulsaT = setTimeout(() => { pulsaT = 0; abreHoja(li); }, 480);
  });
  const cancelaPulsa = () => { clearTimeout(pulsaT); pulsaT = 0; pulsaXY = null; };
  lista.addEventListener('pointermove', (e) => { if (pulsaXY && Math.hypot(e.clientX - pulsaXY[0], e.clientY - pulsaXY[1]) > 10) cancelaPulsa(); });
  for (const ev of ['pointerup', 'pointercancel', 'scroll']) lista.addEventListener(ev, cancelaPulsa, { passive: true });
  lista.addEventListener('contextmenu', (e) => { const li = e.target.closest('li.msg'); if (borrable(li)) { e.preventDefault(); cancelaPulsa(); abreHoja(li); } });
  function abreHoja(li) {
    cierraHoja(); objetivo = li; li.classList.add('elegido');
    $('#borra-todos').hidden = !li.classList.contains('mia');
    $('#hoja-copiar').hidden = li.classList.contains('archivo') || li.classList.contains('nota') || !navigator.clipboard;
    hoja.hidden = false; vibra(12);
  }
  function cierraHoja() { if (objetivo) objetivo.classList.remove('elegido'); objetivo = null; hoja.hidden = true; }
  hoja.addEventListener('click', (e) => { if (e.target === hoja) cierraHoja(); });
  $('#borra-no').addEventListener('click', cierraHoja);
  $('#hoja-copiar').addEventListener('click', () => {
    const li = objetivo; cierraHoja(); if (!li) return;
    const c = li.cloneNode(true); for (const h of c.querySelectorAll('.hora')) h.remove();
    navigator.clipboard.writeText(c.textContent.trim()).then(() => toast('copiado', { ok: true, titulo: tr('copiadoMsg'), ms: 1600 })).catch(() => {});
  });
  $('#borra-mi').addEventListener('click', () => { const li = objetivo; cierraHoja(); if (li) quitaFila(li, false); });
  $('#borra-todos').addEventListener('click', () => { const li = objetivo; cierraHoja(); if (!li || !li.classList.contains('mia')) return; if (M.borra(li.dataset.id)) quitaFila(li, true); else quitaFila(li, false); });
  M.on('borrado', (id) => { const li = lista.querySelector('li.msg.suya[data-id="' + CSS.escape(id) + '"]'); if (li) quitaFila(li, true, true); quitaToast('a-' + id); quitaToast('m-' + id); });
  function quitaFila(li, paraTodos, suyo) {
    const id = li.dataset.id;
    for (const a of li.querySelectorAll('a[href^="blob:"]')) URL.revokeObjectURL(a.href);
    for (const im of li.querySelectorAll('img[src^="blob:"]')) URL.revokeObjectURL(im.src);
    const n = notas.get(id); if (n) { if (n.li && n.li.classList.contains('sonando')) paraReproductor(); if (n.url) URL.revokeObjectURL(n.url); notas.delete(id); }
    const u = previas.get(id); if (u) { URL.revokeObjectURL(u); previas.delete(id); }
    if (archivosVivos.has(id)) { archivosVivos.delete(id); if (M.cancelaArchivo) { try { M.cancelaArchivo(id); } catch (_) {} } quitaToast('a-' + id); }
    if (!paraTodos) { li.remove(); return; }
    li.className = 'msg borrado ' + (suyo ? 'suya' : 'mia'); li.textContent = '';
    const b = document.createElement('span'); b.textContent = tr(suyo ? 'mensajeBorradoSuyo' : 'mensajeBorrado'); li.append(b);
  }

  // ---------- en el chat del móvil, la miniatura del vídeo se arrastra a cualquier sitio y se queda en el borde más cercano (dueño,
  // 18:51: «la quiero cambiar de sitio como yo quiera»); un toque, sin arrastrar, vuelve al vídeo ----------
  let arrastre = null, recienArrastrada = false;
  escena.addEventListener('pointerdown', (e) => {
    if (!enChat) return;
    const r = escena.getBoundingClientRect();
    arrastre = { id: e.pointerId, x0: e.clientX, y0: e.clientY, l: r.left, t: r.top, w: r.width, h: r.height, mov: false };
    try { escena.setPointerCapture(e.pointerId); } catch (_) {}
  }, true);
  escena.addEventListener('pointermove', (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const dx = e.clientX - arrastre.x0, dy = e.clientY - arrastre.y0;
    if (!arrastre.mov && Math.hypot(dx, dy) < 7) return;
    arrastre.mov = true; escena.classList.add('movida', 'arrastrando');
    const W = innerWidth, H = vv ? vv.height : innerHeight;
    escena.style.setProperty('--mini-x', Math.round(Math.max(8, Math.min(W - arrastre.w - 8, arrastre.l + dx))) + 'px');
    escena.style.setProperty('--mini-y', Math.round(Math.max(8, Math.min(H - arrastre.h - 8, arrastre.t + dy))) + 'px');
  }, true);
  const sueltaMini = (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const movida = arrastre.mov; arrastre = null; escena.classList.remove('arrastrando');
    if (!movida) return;
    recienArrastrada = true; setTimeout(() => { recienArrastrada = false; }, 80);
    const r = escena.getBoundingClientRect(); escena.style.setProperty('--mini-x', (r.left + r.width / 2 < innerWidth / 2 ? 10 : Math.round(innerWidth - r.width - 10)) + 'px');
  };
  escena.addEventListener('pointerup', sueltaMini, true); escena.addEventListener('pointercancel', sueltaMini, true);

  // ---------- girar la cámara (dueño, 18:51) ----------
  $('#b-girar').addEventListener('click', async () => { const b = $('#b-girar'); b.disabled = true; b.classList.add('girando'); try { await M.giraCamara(); } finally { b.disabled = false; setTimeout(() => b.classList.remove('girando'), 350); } });

  // ---------- avisos ----------
  function aviso(etiqueta, titulo, cuerpo, mal, enlace, invitar) {
    const a = $('#aviso'); a.classList.toggle('mal', !!mal); $('#aviso-enlace').hidden = !enlace; $('#aviso-invitar').hidden = !invitar;
    for (const [id, k] of [['#aviso-etiqueta', etiqueta], ['#aviso-titulo', titulo], ['#aviso-texto', cuerpo]]) { const e = $(id); e.dataset.t = k; e.textContent = tr(k); }
    a.hidden = false; setTimeout(() => $('#aviso-ok').focus(), 50);
  }
  $('#aviso-ok').addEventListener('click', () => { $('#aviso').hidden = true; });
  // (dueño, 18:17: «que lo detecte para decirle… tiene que volver a enviar o invitar tú… para que la persona no pierda el tiempo»)
  $('#aviso-invitar').addEventListener('click', () => { $('#aviso').hidden = true; if (window.Elixire && window.Elixire.reinvita) window.Elixire.reinvita(); });
  window.ElixireAviso = aviso;
  // «Verificar esta página»: el código es público y cada script lleva su huella SHA-384 (herramientas/huellas.py)
  for (const v of document.querySelectorAll('.verificar')) v.addEventListener('click', (e) => { e.preventDefault(); aviso('verificarEtiqueta', 'verificarTitulo', 'verificarTexto', false, true); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#aviso').hidden) $('#aviso').hidden = true; });
})();
