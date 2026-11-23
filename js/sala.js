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
  // ---------- la llamada en grupo (js/grupo.js): con más personas, lo que se hace en la llamada y en el chat va a todas ----------
  const G = () => { const g = window.ElixireGrupo; return g && g.activo ? g : null; };
  const ef = (e) => { const g = G(); return g && e ? g.efectivo(e) : e; }; // lo que se ve: la principal o, si colgó, quien la sustituye
  const idAzar = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
  // en grupo, ✓✓ cuando ha llegado a todas y ✓✓ azul cuando lo han visto todas (como en WhatsApp)
  const grupoEnv = new Map();
  function recibo(ids, quien, leido) {
    for (const id of ids) {
      const li = lista.querySelector('li.mia[data-id="' + CSS.escape(id) + '"]'); if (!li) continue;
      const r = grupoEnv.get(id);
      if (!r) { li.classList.add('llego'); if (leido) li.classList.add('leido'); continue; }
      r.llego.add(quien); if (leido) r.leido.add(quien);
      if (r.llego.size >= r.total) li.classList.add('llego');
      if (r.leido.size >= r.total) li.classList.add('leido');
    }
  }
  const apunta = (id, porM, n) => { if (n) grupoEnv.set(id, { total: (porM ? 1 : 0) + n, porM, llego: new Set(), leido: new Set() }); };
  // quién lo escribió: en grupo, la persona de esta conversación o, si llegó reenviado por otro tramo, quien lo escribió de verdad
  function autor(m, quien, etiqueta) {
    const g = window.ElixireGrupo;
    if (m.origen && g && g.etiquetaId) { m.quien = 'g:' + m.origen; m.de = g.etiquetaId(m.origen); return; }
    m.quien = quien; if (etiqueta) m.de = etiqueta();
  }
  const enGrupoVisto = () => { const g = window.ElixireGrupo; return !!(g && (g.activo || g.enGrupo)); };
  function leidosDe(quien, ids) { if (!quien || quien === 'p') { if (M.leidos) M.leidos(ids); } else { const g = window.ElixireGrupo; if (g && g.leidos) g.leidos(quien, ids); } }
  // un texto mío, a la conversación y (en grupo) a cada persona, con el mismo identificador
  function enviaTexto(t) {
    const id = idAzar(12), g = G(); let m = M.envia(t, id); const porM = !!m, n = g ? g.envia(t, id) : 0;
    if (!m && n) m = { id, texto: String(t).trim().slice(0, 20000), t: Date.now(), dir: 'mia' };
    if (m) apunta(m.id, porM, n);
    return m;
  }

  // ---------- abrir y cerrar ----------
  function abre() {
    if (abierta) return; abierta = true;
    lista.textContent = ''; const v = document.createElement('li'); v.className = 'vacio'; v.dataset.t = 'vacio'; v.textContent = tr('vacio'); lista.append(v);
    $('#sala-palabras').hidden = true; $('#sala-palabras').classList.remove('hecho'); $('#palabras-botones').hidden = false; sala.classList.remove('por-comprobar');
    $('#sala-estado').classList.remove('con-palabras'); $('#sala-estado').setAttribute('aria-expanded', 'false');
    const a = $('#palabras-ayuda'); a.dataset.t = 'palabrasAyuda'; a.textContent = tr('palabrasAyuda');
    ponEstado('salaEstado', false); pintaLlamada({ estado: 'libre' }); $('#llamar').disabled = false; rotuloLlamar('videollamada');
    pintaPalabras(M.palabras);
    sala.hidden = false; document.body.classList.add('en-sala');
    setTimeout(() => { if (abierta && window.Sala3D && window.Sala3D.pausa) window.Sala3D.pausa(true); }, 900);
    if (!movil.matches) setTimeout(() => texto.focus({ preventScroll: true }), 300);
  }
  function cierra() {
    if (!abierta) return; abierta = false; marcaPasando(false);
    sala.hidden = true; document.body.classList.remove('en-sala');
    for (const a of lista.querySelectorAll('a[href^="blob:"]')) URL.revokeObjectURL(a.href);
    for (const im of lista.querySelectorAll('img[src^="blob:"]')) URL.revokeObjectURL(im.src);
    paraNota(false); descartaRevision(); cierraPrevia(false); cierraHoja(); cierraChat(); ponVistaLl(''); sueltaCompleta(); sinLeer = 0; pintaCuenta(); paraReproductor(); for (const n of notas.values()) if (n.mia && n.url) URL.revokeObjectURL(n.url); notas.clear();
    lista.textContent = ''; texto.value = ''; ajusta(); pintaVoz(); avisos.textContent = ''; menuEnviar.hidden = true; visor.hidden = true; $('#visor-img').removeAttribute('src'); archivosVivos.clear(); for (const u of previas.values()) URL.revokeObjectURL(u); previas.clear();
    const vs = $('#video-suyo'), vm = $('#video-mio'); vs.srcObject = null; vm.srcObject = null; $('#video-toca').hidden = true;
    for (const k of ['left', 'top', 'right', 'bottom']) vm.style.removeProperty(k);
    if (window.Sala3D && window.Sala3D.pausa) window.Sala3D.pausa(false);
    if (window.Elixire && window.Elixire.reinvitando) window.Elixire.reinvitando = false; else if (window.Elixire) window.Elixire.vuelve();
  }
  // (dueño, 23 nov 08:58: «como arriba ya dice encriptado poscuántico, no hace falta que digas imagen y sonido con capa poscuántica;
  // dilo todo arriba de una vez»): con la capa de la imagen y el sonido en marcha, la cabecera añade «· Imagen, sonido y chat»
  let conCapa = false;
  function ponEstado(k, mal) {
    const e = $('#sala-estado'); e.classList.toggle('mal', !!mal); const x = $('#sala-estado-texto'); x.dataset.t = k; x.textContent = tr(k);
    const mas = $('#sala-estado-mas'); if (mas) mas.hidden = !(conCapa && k === 'salaEstado');
  }

  // ---------- mensajes ----------
  function quitaVacio() { const v = lista.querySelector('.vacio'); if (v) v.remove(); }
  // (como WhatsApp) lo nuevo baja la conversación solo si ya estabas abajo: si estás leyendo más arriba no salta, y aparece un botón
  // para bajar con cuántos mensajes nuevos hay
  let pegado = true, nuevos = 0, bajarLi = null;
  function pintaBajar() {
    const ver = !pegado && lista.scrollHeight > lista.clientHeight + 40;
    if (!ver) { if (bajarLi && bajarLi.parentNode) bajarLi.remove(); nuevos = 0; return; }
    if (!bajarLi) {
      bajarLi = document.createElement('li'); bajarLi.className = 'bajar';
      const b = document.createElement('button'); b.type = 'button'; b.dataset.tAria = 'irAbajo'; b.setAttribute('aria-label', tr('irAbajo'));
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg><span class="n"></span>';
      b.addEventListener('click', () => { lista.scrollTo({ top: lista.scrollHeight, behavior: 'smooth' }); });
      bajarLi.append(b);
    }
    if (lista.lastElementChild !== bajarLi) lista.append(bajarLi);
    bajarLi.querySelector('.n').textContent = nuevos ? (nuevos > 99 ? '99+' : String(nuevos)) : '';
  }
  lista.addEventListener('scroll', () => { const p = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 120; if (p !== pegado) { pegado = p; pintaBajar(); } }, { passive: true });
  function abajo(fuerza, nuevo) {
    if (fuerza || pegado) { lista.scrollTop = lista.scrollHeight; pegado = true; nuevos = 0; } else if (nuevo) nuevos++;
    pintaBajar();
  }
  // el nombre de cada persona del grupo, siempre del mismo color (como en WhatsApp)
  const COLORES = ['#9CC3E4', '#F0C77F', '#5CC98A', '#C3A6F2', '#7ED3D6', '#F2A7C3'];
  const colorDe = (et) => { const n = parseInt((/(\d+)\s*$/.exec(et || '') || [])[1] || '0', 10); return COLORES[(Math.max(1, n) - 1) % COLORES.length]; };
  function nombreDe(texto) { const d = document.createElement('b'); d.className = 'de'; d.textContent = texto; d.style.color = colorDe(texto); return d; }
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
    if (m.dir !== 'mia') { li.dataset.de = m.quien || 'p'; if (m.de) li.append(nombreDe(m.de)); }
    li.append(contenido(m.texto)); toastMensaje(m);
    const h = document.createElement('span'); h.className = 'hora'; h.textContent = hora(m.t); li.append(h);
    lista.append(li); abajo(m.dir === 'mia', m.dir !== 'mia');
  }
  function cartelCifrado() {
    if (lista.querySelector('.cartel-cifrado')) return; quitaVacio();
    const li = document.createElement('li'); li.className = 'cartel-cifrado';
    li.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="10" rx="2.4"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg><span><b></b><small></small></span>';
    const k = ultimo && ultimo.sinCapa ? 'cifradaEstandar' : 'cifradaExtremo', b = li.querySelector('b'), sm = li.querySelector('small');
    b.dataset.t = k; b.textContent = tr(k); sm.dataset.t = 'cartelBorra'; sm.textContent = tr('cartelBorra'); lista.prepend(li);
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
    const m = enviaTexto(texto.value); if (!m) return;
    texto.value = ''; ajusta(); pintaVoz(); pintaMensaje(m);
  });
  texto.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#redactor').requestSubmit(); } });
  function ajusta() { texto.style.height = 'auto'; texto.style.height = Math.min(160, texto.scrollHeight + 2) + 'px'; }
  texto.addEventListener('input', () => { ajusta(); pintaVoz(); if (texto.value.trim()) { M.escribe(); const g = G(); if (g) g.escribe(); } });
  let escribeT = null;
  const alEscribe = () => { $('#escribiendo').hidden = false; clearTimeout(escribeT); escribeT = setTimeout(() => { $('#escribiendo').hidden = true; }, 3500); };
  M.on('escribe', alEscribe);
  M.on('mensaje', (m) => { $('#escribiendo').hidden = true; if (m.dir !== 'mia') autor(m, 'p', enGrupoVisto() ? () => window.ElixireGrupo.nombrePrincipal() : null); pintaMensaje(m); if (m.dir !== 'mia') noLeido(); });
  // ✓ enviado · ✓✓ entregado · ✓✓ azul leído (dueño, 23:20: «como otras apps»). Como en WhatsApp (dueño, 23 nov 08:59: «le envío un
  // audio y en cuanto se lo envío ya salen los dos checks como visto… una cosa es que llegue y otra cuando le da»): se da por leído
  // solo lo que llega con la conversación de verdad delante (página visible, ventana activa y, en el móvil, el chat abierto; en el
  // ordenador, sin ampliar el vídeo). Las notas de voz, en cambio, solo cuando se escuchan (al darle al play): hasta entonces, entregadas.
  let leeT = null;
  function marcaLeidos() {
    clearTimeout(leeT); leeT = setTimeout(() => {
      if (document.visibilityState !== 'visible' || !document.hasFocus() || !abierta || (movil.matches && !enChat) || amplia) return;
      const por = new Map();
      for (const li of lista.querySelectorAll('li.msg.suya[data-id]:not(.leida):not(.nota)')) { li.classList.add('leida'); const q = li.dataset.de || 'p'; if (!por.has(q)) por.set(q, []); por.get(q).push(li.dataset.id); }
      for (const [q, ids] of por) leidosDe(q, ids);
    }, 300);
  }
  new MutationObserver(marcaLeidos).observe(lista, { childList: true });
  document.addEventListener('visibilitychange', marcaLeidos);
  addEventListener('focus', marcaLeidos);
  M.on('leido', (ids) => recibo(ids, 'p', true));
  // salir a otra app sin colgar (dueño, 23:21): la imagen de la otra persona pasa sola a una ventana flotante (imagen en imagen) donde el
  // navegador lo permite (Safari en iPhone y, con el aviso de la sesión de medios, Chrome). Tu cámara la pausa el propio móvil mientras
  // estás fuera; al volver, todo sigue.
  (() => {
    const vs = $('#video-suyo'); if (!vs) return;
    try { vs.autoPictureInPicture = true; vs.setAttribute('autopictureinpicture', ''); } catch (_) {}
    try { if (navigator.mediaSession && document.pictureInPictureEnabled) navigator.mediaSession.setActionHandler('enterpictureinpicture', () => { if (vs.srcObject && !document.pictureInPictureElement) vs.requestPictureInPicture().catch(() => {}); }); } catch (_) {}
  })();
  M.on('acuse', (ids) => recibo(ids, 'p', false));

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
  // ---------- escudo durante la llamada (dueño, 23 nov 07:06: «más fuertes en cuanto a robo de datos y espías mientras sucede la llamada») ----------
  // 1) al salir de la app (otra app, el selector de apps, otra pestaña) la llamada se tapa: lo que hay en pantalla no queda a la vista
  //    ni en la miniatura del sistema, en la medida en que el sistema lo permite. 2) si una extensión del navegador se mete en la página
  //    (las que leen o corrigen lo que escribes, gestores de contraseñas, grabadores…), se avisa una vez: podría leer los mensajes y ver la llamada.
  const tapa = (si) => { if (si && sala.hidden) return; sala.classList.toggle('cubierta', !!si); }; // al volver se destapa siempre
  document.addEventListener('visibilitychange', () => tapa(document.visibilityState === 'hidden'));
  addEventListener('pagehide', () => tapa(true)); addEventListener('pageshow', () => tapa(false));
  const EXTENSIONES = [[/grammarly/i, 'Grammarly'], [/1password/i, '1Password'], [/lastpass/i, 'LastPass'], [/bitwarden|^bit-/i, 'Bitwarden'], [/dashlane/i, 'Dashlane'], [/loom/i, 'Loom'], [/deepl/i, 'DeepL'], [/honey/i, 'Honey'], [/languagetool|^lt-/i, 'LanguageTool'], [/keeper/i, 'Keeper'], [/nordpass/i, 'NordPass']];
  let espias = null, espiaVisto = false;
  function ajeno(n) {
    if (!n || n.nodeType !== 1) return null;
    const tag = n.tagName.toLowerCase(), src = n.getAttribute('src') || n.getAttribute('href') || '';
    if (!tag.includes('-') && tag !== 'iframe' && !/^(chrome|moz|safari-web|ms-browser|edge)-extension:/i.test(src)) return null;
    const k = tag + ' ' + src + ' ' + (n.id || '') + ' ' + (typeof n.className === 'string' ? n.className : '');
    const e = EXTENSIONES.find(([r]) => r.test(k)); return e ? e[1] : '';
  }
  function avisoEspia(nombre) {
    if (espiaVisto || sala.hidden) return; espiaVisto = true;
    const d = document.createElement('div'); d.className = 'escudo-aviso'; d.setAttribute('role', 'alert');
    d.innerHTML = '<span class="ea-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3.2 5 6v5.6c0 4.4 3 8.2 7 9.3 4-1.1 7-4.9 7-9.3V6l-7-2.8Z"/><path d="M12 8.2v4.6M12 15.9v.1"/></svg></span><span class="ea-txt"><b></b><small></small></span><button type="button" class="ea-cerrar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button>';
    d.querySelector('b').textContent = tr('espiaTitulo').replace('{n}', nombre ? ' (' + nombre + ')' : '');
    d.querySelector('small').textContent = tr('espiaTexto');
    d.querySelector('.ea-cerrar').setAttribute('aria-label', tr('vg_cerrar').split(' ')[0]);
    d.querySelector('.ea-cerrar').addEventListener('click', () => d.remove());
    sala.append(d);
  }
  function vigilaEspias(si) {
    if (espias) { espias.disconnect(); espias = null; }
    if (!si || typeof MutationObserver === 'undefined') return;
    const mira = (n) => { const r = ajeno(n); if (r != null) { avisoEspia(r); return true; } return false; };
    for (const n of document.querySelectorAll('iframe, [src^="chrome-extension:"], [src^="moz-extension:"], [src^="safari-web-extension:"]')) if (mira(n)) break;
    if (!espiaVisto) for (const n of document.documentElement.children) if (mira(n)) break;
    if (!espiaVisto && document.body) for (const n of document.body.children) if (mira(n)) break;
    espias = new MutationObserver((ms) => { if (espiaVisto) return; for (const m of ms) for (const n of m.addedNodes) if (mira(n)) return; });
    espias.observe(document.documentElement, { childList: true, subtree: true });
  }
  M.on('llamada', (e) => { if (!e) return; if (e.estado === 'hablando') { if (!espias) vigilaEspias(true); } else if (['fin', 'libre', 'rechazada', 'caida'].includes(e.estado)) { vigilaEspias(false); espiaVisto = false; for (const d of sala.querySelectorAll('.escudo-aviso')) d.remove(); } });

  function toast(id, o) {
    if ((!movil.matches && !amplia) || !abierta || enChat) return null; // (en el ordenador, solo con el vídeo ampliado)
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
  // el visor de fotos, como el de WhatsApp: a pantalla completa y en negro; arriba, quién la mandó y cuándo; abajo, «Guardar en
  // Fotos» (en el iPhone, el menú de compartir, con «Guardar imagen») o «Descargar» (en el ordenador). Un toque esconde o enseña las
  // barras; dos dedos o un doble toque acercan; deslizar hacia abajo la cierra.
  const IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || ''));
  let visorAct = null;
  function abreVisor(url, nombre, info) {
    info = info || {}; const img = $('#visor-img'); img.src = url; img.style.transform = ''; visor.style.removeProperty('--fondo');
    const t = $('#visor-t'); t.dataset.t = info.mia ? 'tu' : info.de ? '' : 'fotoRecibida'; t.textContent = info.mia ? tr('tu') : info.de || tr('fotoRecibida');
    // (como WhatsApp) las fotos de la conversación, en orden: se pasa a la anterior o a la siguiente deslizando o con las flechas
    const gal = info.desde ? galeria() : [], gi = gal.indexOf(info.desde);
    $('#visor-hora').textContent = (info.t ? hora(info.t) : '') + (gi >= 0 && gal.length > 1 ? '  ·  ' + (gi + 1) + '/' + gal.length : '');
    pasoAnt.hidden = !(gi > 0); pasoSig.hidden = !(gi >= 0 && gi < gal.length - 1);
    const g = $('#visor-guardar'); g.href = url; g.download = nombre || 'foto.jpg';
    visorAct = { url, nombre: nombre || 'foto.jpg', file: null, desde: info.desde || null };
    const v = visorAct; fetch(url).then((r) => r.blob()).then((bl) => { if (visorAct === v) v.file = new File([bl], v.nombre, { type: bl.type || 'image/jpeg' }); }).catch(() => {});
    $('#visor-compartir').hidden = !(IOS && navigator.share); g.hidden = !$('#visor-compartir').hidden;
    visor.classList.remove('limpio'); visor.hidden = false;
  }
  function cierraVisor() { visor.hidden = true; visorAct = null; $('#visor-img').removeAttribute('src'); }
  function galeria() { return [...lista.querySelectorAll('li.msg.foto .fw')].filter((c) => { const i = c.querySelector('img'); return i && i.getAttribute('src') && !i.classList.contains('borrosa'); }); }
  function pasaFoto(d) {
    const v = visorAct; if (!v || !v.desde) return false;
    const g = galeria(), i = g.indexOf(v.desde), j = i + d; if (i < 0 || j < 0 || j >= g.length) return false;
    const c = g[j], im = c.querySelector('img'); abreVisor(im.currentSrc || im.src, (c._info || {}).nombre, Object.assign({}, c._info || {}, { desde: c }));
    return true;
  }
  const botonPaso = (cls, d, k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'visor-paso ' + cls; b.hidden = true; b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>'; b.addEventListener('click', (e) => { e.stopPropagation(); pasaFoto(k); }); visor.append(b); return b; };
  const pasoAnt = botonPaso('ant', 'M14.5 6l-6 6 6 6', -1), pasoSig = botonPaso('sig', 'M9.5 6l6 6-6 6', 1);
  $('#visor-cerrar').addEventListener('click', cierraVisor);
  $('#visor-compartir').addEventListener('click', () => {
    const v = visorAct; if (!v) return;
    const f = v.file; if (f && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(() => {}); return; }
    $('#visor-guardar').click();
  });
  document.addEventListener('keydown', (e) => { if (visor.hidden) return; if (e.key === 'Escape') cierraVisor(); else if (e.key === 'ArrowLeft') pasaFoto(-1); else if (e.key === 'ArrowRight') pasaFoto(1); });
  {
    const cuerpo = visor.querySelector('.visor-cuerpo'), img = $('#visor-img'), pts = new Map();
    let z = 1, tx = 0, ty = 0, ini = null, dy = 0, dx = 0, ultToque = 0, toqueT = 0;
    const lim = (v, a, b) => Math.max(a, Math.min(b, v));
    const aplica = (anim) => { img.style.transition = anim ? 'transform .2s ease' : 'none'; img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + z + ')'; };
    const vuelve = () => { z = 1; tx = 0; ty = 0; aplica(true); };
    cuerpo.addEventListener('pointerdown', (e) => {
      try { cuerpo.setPointerCapture(e.pointerId); } catch (_) {} pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) ini = { x: e.clientX, y: e.clientY, tx, ty, mov: false };
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; ini = { pinza: true, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z, cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, tx, ty, mov: true }; }
    });
    cuerpo.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId) || !ini) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (ini.pinza && pts.size >= 2) {
        const [a, b] = [...pts.values()], nz = lim(ini.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / ini.d, 1, 5), r = cuerpo.getBoundingClientRect();
        const cx = ini.cx - r.left - r.width / 2, cy = ini.cy - r.top - r.height / 2;
        tx = cx - (cx - ini.tx) * nz / ini.z; ty = cy - (cy - ini.ty) * nz / ini.z; z = nz; aplica(false); return;
      }
      const ddx = e.clientX - ini.x, ddy = e.clientY - ini.y; if (Math.hypot(ddx, ddy) > 6) ini.mov = true;
      if (z > 1.02) { tx = ini.tx + ddx; ty = ini.ty + ddy; aplica(false); }
      else if (ini.mov && !dx && Math.abs(ddy) > Math.abs(ddx)) { dy = ddy; img.style.transition = 'none'; img.style.transform = 'translateY(' + dy + 'px) scale(' + (1 - Math.min(0.18, Math.abs(dy) / 1800)) + ')'; visor.style.setProperty('--fondo', String(Math.max(0.25, 1 - Math.abs(dy) / 420))); }
      else if (ini.mov && !dy) { dx = ddx; img.style.transition = 'none'; img.style.transform = 'translateX(' + dx + 'px)'; }
    });
    const suelta = (e) => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
      if (pts.size) { const [q] = [...pts.values()]; ini = { x: q[0], y: q[1], tx, ty, mov: true }; return; }
      const i = ini; ini = null; if (!i) return;
      if (z <= 1.02 && Math.abs(dy) > 110) { dy = 0; cierraVisor(); return; }
      if (dx) { const d0 = dx; dx = 0; if (Math.abs(d0) > 70 && pasaFoto(d0 < 0 ? 1 : -1)) return; vuelve(); return; }
      if (dy) { dy = 0; visor.style.removeProperty('--fondo'); vuelve(); return; }
      if (!i.mov) {
        const ahora = performance.now();
        if (ahora - ultToque < 300) {
          ultToque = 0; clearTimeout(toqueT);
          if (z > 1.02) vuelve(); else { const r = cuerpo.getBoundingClientRect(), cx = e.clientX - r.left - r.width / 2, cy = e.clientY - r.top - r.height / 2; z = 2.5; tx = -cx * 1.5; ty = -cy * 1.5; aplica(true); }
        } else { ultToque = ahora; toqueT = setTimeout(() => visor.classList.toggle('limpio'), 300); }
      } else if (z < 1.02) vuelve();
    };
    cuerpo.addEventListener('pointerup', suelta); cuerpo.addEventListener('pointercancel', suelta);
    cuerpo.addEventListener('wheel', (e) => { e.preventDefault(); z = lim(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 5); if (z <= 1.02) { z = 1; tx = 0; ty = 0; } aplica(true); }, { passive: false });
  }
  // la forma de la foto y una miniatura de 28 px (menos de 1 KB): viaja en el anuncio y la otra persona la ve al instante, borrosa
  function miniaturaDe(fuente, w, h) {
    try {
      const k = 28 / Math.max(w, h), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      c.getContext('2d').drawImage(fuente, 0, 0, c.width, c.height);
      const d = c.toDataURL('image/jpeg', 0.5); return d.length <= 4000 ? d : undefined;
    } catch (_) { return undefined; }
  }
  const mapaBits = async (f) => { try { return await createImageBitmap(f, { imageOrientation: 'from-image' }); } catch (_) { return createImageBitmap(f); } };
  async function vistaFoto(f) {
    if (f.__vista) return f.__vista;
    if (typeof createImageBitmap !== 'function') return null;
    try { const bmp = await mapaBits(f), v = { w: bmp.width, h: bmp.height, d: miniaturaDe(bmp, bmp.width, bmp.height) }; if (bmp.close) bmp.close(); return v; } catch (_) { return null; }
  }
  async function comprimeFoto(f) {
    if (!/^image\/(jpe?g|png|webp|heic|heif)$/i.test(f.type || '') || f.size < 700 * 1024 || typeof createImageBitmap !== 'function') return f;
    try {
      const bmp = await mapaBits(f);
      const k = Math.min(1, 2048 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const vista = { w: c.width, h: c.height, d: miniaturaDe(bmp, bmp.width, bmp.height) }; if (bmp.close) bmp.close();
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
      if (!blob || blob.size >= f.size) { f.__vista = vista; return f; }
      const out = new File([blob], String(f.name || 'foto').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }); out.__vista = vista;
      return out;
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
    if (enviar) enviaArchivos(p.files, p.urls);
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
      const m = enviaTexto('\u{1F4CD} ' + tr('miUbicacion') + '\nhttps://www.google.com/maps?q=' + p.coords.latitude.toFixed(6) + ',' + p.coords.longitude.toFixed(6));
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
      if (fase === 'hecho') { toast(id, { img: previas.get(a.id), ok: !previas.has(a.id), titulo: tr(foto ? 'fotoEnviada' : 'archivoEnviadoT'), sub: a.nombre && !foto ? a.nombre : '', ms: 2600 }); const u = previas.get(a.id); if (u && !foto) setTimeout(() => URL.revokeObjectURL(u), 4000); previas.delete(a.id); return; }
      toast(id, { img: previas.get(a.id), icono: foto ? 'foto' : 'doc', titulo: tr(foto ? 'enviandoFoto' : 'enviandoArchivo'), sub: foto ? '' : a.nombre, progreso: hecho || 0 });
      return;
    }
    if (fase === 'listo') {
      if (esFoto(a.mime)) toast(id, { img: a.url, titulo: tr('fotoRecibida'), sub: tr('tocaParaVer'), accion: { texto: tr('verFoto'), fn: () => abreVisor(a.url, a.nombre, { de: a.de || '', t: Date.now() }) }, ms: 30000 });
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
    if (a.dir !== 'mia') li.dataset.de = a.quien || 'p';
    const de = () => { if (a.dir !== 'mia' && a.de) li.prepend(nombreDe(a.de)); };
    if (esAudio(a.mime, a.nombre)) { li.className = 'msg nota ' + a.dir; pintaNota(li, a); de(); lista.append(li); abajo(a.dir === 'mia', a.dir !== 'mia'); return li; }
    // (dueño, 23 nov 13:42: «cuando recibo una foto está muy difícil… ponlo como WhatsApp exacto»): la foto sola en su burbuja,
    // con la hora y los ✓ encima; mientras sale o llega, un círculo con el avance; un toque la abre a pantalla completa
    if (esFoto(a.mime)) {
      const t0 = Date.now(), v = a.vista || {};
      li.className = 'msg archivo foto ' + a.dir + (a.dir === 'mia' ? ' enviado' : '');
      const caja = document.createElement('button'); caja.type = 'button'; caja.className = 'fw'; caja.setAttribute('aria-label', tr(a.dir === 'mia' ? 'fotoEnviada' : 'fotoRecibida'));
      caja._info = { nombre: a.nombre, mia: a.dir === 'mia', de: a.dir === 'mia' ? '' : a.de || '', t: t0 };
      // la forma exacta desde el primer momento (sin saltos al llegar) y, mientras llega, la miniatura borrosa
      if (v.w && v.h) caja.style.aspectRatio = v.w + ' / ' + v.h;
      const im = document.createElement('img'); im.alt = ''; im.decoding = 'async';
      im.addEventListener('load', () => { if (!v.w && im.naturalWidth && im.naturalHeight) caja.style.aspectRatio = im.naturalWidth + ' / ' + im.naturalHeight; li.classList.add('con-img'); abajo(); });
      const url = previas.get(a.id); if (url) im.src = url; else if (v.d) { im.src = v.d; im.classList.add('borrosa'); }
      const an = document.createElement('span'); an.className = 'fw-anillo'; an.innerHTML = '<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5"/><circle class="fw-avance" cx="18" cy="18" r="15.5"/></svg>';
      const h = document.createElement('span'); h.className = 'hora'; h.textContent = hora(t0);
      caja.append(im, an, h);
      caja.addEventListener('click', () => { if (im.classList.contains('borrosa')) return; const u = im.currentSrc || im.src; if (u) abreVisor(u, a.nombre, Object.assign({ desde: caja }, caja._info)); });
      const b = document.createElement('span'); b.className = 'barra'; b.append(document.createElement('i'));
      li.append(caja, b);
      // (como WhatsApp) varias fotos enviadas a la vez, juntas en un álbum: dos, una al lado de otra; tres, una arriba y dos debajo;
      // cuatro o más, en cuadro, y en la cuarta «+N»
      if (v.a && v.n > 1) {
        let al = lista.querySelector('li.album[data-alb="' + CSS.escape(v.a) + '"]');
        if (!al) {
          al = document.createElement('li'); al.className = 'msg album ' + a.dir + (a.dir === 'mia' ? ' enviado' : ''); al.dataset.alb = v.a;
          if (a.dir !== 'mia' && a.de) al.append(nombreDe(a.de));
          const ul = document.createElement('ul'); ul.className = 'alb-rejilla'; al.append(ul); lista.append(al);
        }
        li.dataset.i = String(v.i | 0);
        const ul = al.querySelector('.alb-rejilla'), sig = [...ul.children].find((x) => +x.dataset.i > (v.i | 0));
        ul.insertBefore(li, sig || null);
        pintaAlbum(al); marcaLeidos(); abajo(a.dir === 'mia', a.dir !== 'mia');
        return li;
      }
      de(); lista.append(li); abajo(a.dir === 'mia', a.dir !== 'mia');
      return li;
    }
    li.className = 'msg archivo ' + a.dir + (esFoto(a.mime) ? ' foto' : '');
    if (esFoto(a.mime) && previas.get(a.id)) li.append(miniatura(previas.get(a.id), a.nombre));
    const n = document.createElement('span'); n.className = 'nombre'; n.textContent = a.nombre;
    const t = document.createElement('span'); t.className = 'tam'; t.textContent = tam(a.tam);
    const b = document.createElement('span'); b.className = 'barra'; b.append(document.createElement('i'));
    li.append(n, t, b); de(); lista.append(li); abajo(a.dir === 'mia', a.dir !== 'mia');
    return li;
  }
  function pintaAlbum(al) {
    const fs = [...al.querySelectorAll('.alb-rejilla>li')], n = fs.length;
    al.dataset.n = String(Math.min(n, 4));
    fs.forEach((x, i) => { x.classList.toggle('extra', i > 3); x.classList.toggle('ultima', i === Math.min(n, 4) - 1); if (i === 3 && n > 4) x.dataset.mas = '+' + (n - 4); else delete x.dataset.mas; });
  }
  const fila = (id) => lista.querySelector('li.archivo[data-id="' + CSS.escape(id) + '"],li.nota[data-id="' + CSS.escape(id) + '"]');
  // (previas: una URL por archivo, o una sola para un archivo suelto, como las notas de voz)
  async function enviaArchivos(files, previas0, dur) {
    const urls = Array.isArray(previas0) ? previas0 : [previas0];
    const fotos = files.filter((f) => esFoto(f.type)).length, alb = files.length > 1 && fotos === files.length ? idAzar(6) : null;
    for (let i = 0; i < files.length; i++) {
      const f = files[i], previa = urls[i] || undefined;
      let vista = esFoto(f.type) ? await vistaFoto(f) : null;
      if (alb) vista = Object.assign({}, vista || {}, { a: alb, i, n: files.length });
      const idA = idAzar(8), g = G(); let r = M.enviaArchivo(f, idA, undefined, vista); const porM = !!(r && r.ok), n = g ? g.enviaArchivo(f, idA, vista) : 0;
      if (!porM && n) r = { ok: true, id: idA, nombre: String(f.name || 'archivo').slice(0, 200), tam: f.size };
      if (r.ok) apunta(r.id, porM, n);
      if (!r.ok) { sistema(r.por === 'grande' ? 'archivoGrande' : 'archivoNo', '(' + f.name + ')'); if (previa) URL.revokeObjectURL(previa); continue; }
      if (previa && esAudio(f.type, f.name)) notas.set(r.id, { url: previa, dur: dur || 0, mia: true }); else if (previa) previas.set(r.id, previa);
      filaArchivo({ id: r.id, dir: 'mia', nombre: r.nombre, tam: r.tam, mime: f.type, dur, vista });
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
  M.on('archivo', (a) => { if (a.dir !== 'mia') autor(a, 'p', enGrupoVisto() ? () => window.ElixireGrupo.nombrePrincipal() : null); filaArchivo(a); });
  const alProgreso = (p) => { const li = fila(p.id); if (li && p.dir === 'mia' && !li.classList.contains('mia')) return; if (li) { li.querySelector('.barra i').style.width = Math.round(p.hecho * 100) + '%'; if (li.classList.contains('foto')) li.style.setProperty('--p', String(Math.max(0.04, Math.min(1, p.hecho)))); } const a = archivosVivos.get(p.id); if (a) toastArchivo(a, 'avanza', p.hecho); };
  M.on('archivo-progreso', alProgreso);
  const alEnviado = (p) => { { const li0 = fila(p.id); if (li0 && !li0.classList.contains('mia')) return; } const a = archivosVivos.get(p.id); if (a) { toastArchivo(a, 'hecho'); archivosVivos.delete(p.id); } const li = fila(p.id); if (!li || li.dataset.enviado) return; li.dataset.enviado = '1'; li.querySelector('.barra i').style.width = '100%'; if (li.classList.contains('nota')) { li.classList.add('llego'); return; } if (li.classList.contains('foto')) { li.classList.add('subida', 'llego'); return; } const s = document.createElement('span'); s.className = 'tam'; s.dataset.t = 'archivoEnviado'; s.textContent = tr('archivoEnviado'); li.append(s); };
  M.on('archivo-enviado', alEnviado);
  const alListo = (a) => {
    { const v = archivosVivos.get(a.id) || {}; toastArchivo(Object.assign({ dir: 'suya' }, v, a), 'listo'); archivosVivos.delete(a.id); }
    const li = fila(a.id); if (!li) return;
    li.querySelector('.barra i').style.width = '100%';
    if (li.classList.contains('nota')) { notaLista(li, a); abajo(); return; }
    if (li.classList.contains('foto')) {
      const im = li.querySelector('.fw img');
      // la foto entera: se carga detrás y sustituye a la miniatura borrosa con un fundido
      if (im) { const n = new Image(); n.decoding = 'async'; n.onload = () => { im.src = a.url; im.classList.remove('borrosa'); li.classList.add('lista'); }; n.onerror = () => { im.src = a.url; im.classList.remove('borrosa'); li.classList.add('lista'); }; n.src = a.url; }
      else li.classList.add('lista');
      return;
    }
    if (esFoto(a.mime)) li.prepend(miniatura(a.url, a.nombre));
    const d = document.createElement('a'); d.className = 'cristal'; d.href = a.url; d.download = a.nombre;
    const s = document.createElement('span'); s.dataset.t = 'descargar'; s.textContent = tr('descargar'); d.append(s); li.append(d); abajo();
  };
  M.on('archivo-listo', alListo);
  const alCancelado = (p) => { const li = fila(p.id); if (li) li.remove(); sistema('archivoCancelado'); };
  M.on('archivo-cancelado', alCancelado);

  // ---------- en la llamada del móvil: pasar al chat y volver al vídeo (dueño, 16:57: «la videollamada se debe poder pasar a
  // chat y después a vídeo nuevamente») ----------
  // «Chat» abre la conversación a pantalla completa; la otra persona sigue en directo en una miniatura arriba a la derecha (la
  // llamada no se corta: se la sigue oyendo y ella te sigue viendo) y «Vídeo», o un toque en la miniatura, vuelve. Con el vídeo
  // delante, lo que llega sale en un aviso con «Responder», y el botón «Chat» cuenta lo que no se ha leído.
  let enChat = false, sinLeer = 0;
  const cuentaChat = $('#chat-cuenta'), escena = $('#escena-video'), vv = window.visualViewport;
  function pintaCuenta() { cuentaChat.hidden = !sinLeer; cuentaChat.textContent = sinLeer > 9 ? '9+' : String(sinLeer); const ca = $('#verchat-cuenta'); if (ca) { ca.hidden = !sinLeer || !amplia; ca.textContent = cuentaChat.textContent; } }
  function noLeido() { if (abierta && ((movil.matches && !enChat) || amplia)) { sinLeer++; pintaCuenta(); } }
  // ---------- la videollamada en grande o en pequeño, como en GUARDIANA (dueño, 23 nov 10:10: «cómo maximizaba, cómo minimizaba,
  // todo… tráelo todo aquí a Elixire», y 08:58: «no puedo ampliarlo, que se vea todo imagen») ----------
  // En el ordenador, la videollamada sale en grande, a toda la ventana: arriba, la barra (con «Ver el chat»), y abajo, los botones;
  // a los 3 s sin mover el ratón se esconden solos para ver la imagen entera y vuelven al moverlo o con el teclado. «Ver el chat» la
  // deja en pequeño: una tarjeta en una esquina con la imagen, el tiempo y sus botones (micro, cámara, colgar y «Ampliar»), que se
  // mueve con el ratón, y la conversación a todo el ancho. «Ampliar» la vuelve a poner en grande. «Pantalla completa» ocupa además
  // todo el monitor (Esc o el mismo botón la quitan; al colgar, se quita sola si la puso la llamada).
  let amplia = false, vistaLl = '', reposoT = null, completaPorLlamada = false; // amplia: la conversación no está a la vista
  function ponVistaLl(v) {
    if (movil.matches || !abierta) v = '';
    if (v === vistaLl) return;
    vistaLl = v; amplia = v === 'grande';
    sala.classList.toggle('grande', v === 'grande'); sala.classList.toggle('mini', v === 'mini');
    if (v === 'mini') { colocaMini(); avisos.textContent = ''; sinLeer = 0; marcaLeidos(); try { texto.focus({ preventScroll: true }); } catch (_) {} }
    else sala.classList.remove('mini-movida', 'mini-arrastrando');
    const bv = $('#b-verchat'); if (bv) bv.hidden = v !== 'grande';
    pintaCuenta(); despierta();
    requestAnimationFrame(() => { try { colocaMi(); } catch (_) {} });
  }
  function despierta() {
    sala.classList.remove('reposo'); clearTimeout(reposoT);
    if (vistaLl !== 'grande') return;
    reposoT = setTimeout(() => {
      const foco = document.activeElement && sala.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
      const abierto = !$('#sala-palabras').hidden || !$('#menu-enviar').hidden || sala.classList.contains('comprobando') || [...document.querySelectorAll('.vigia-panel')].some((x) => !x.hidden);
      if (vistaLl === 'grande' && ultimo.estado === 'hablando' && !foco && !abierto) sala.classList.add('reposo');
    }, 3000);
  }
  for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel']) sala.addEventListener(ev, despierta, { passive: true });
  function alternaCompleta() {
    try {
      if (document.fullscreenElement) { completaPorLlamada = false; document.exitFullscreen().catch(() => {}); }
      else { completaPorLlamada = true; document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => { completaPorLlamada = false; }); }
    } catch (_) {}
  }
  function sueltaCompleta() { if (completaPorLlamada && document.fullscreenElement) { try { document.exitFullscreen().catch(() => {}); } catch (_) {} } completaPorLlamada = false; }
  document.addEventListener('fullscreenchange', () => { const b = $('#b-ampliar'); if (b) b.setAttribute('aria-pressed', String(!!document.fullscreenElement)); if (!document.fullscreenElement) completaPorLlamada = false; });
  // la tarjeta pequeña: se mueve con el ratón (y se queda donde la dejas, en proporción a la ventana)
  function colocaMini() {
    let m = null; try { m = JSON.parse(localStorage.getItem('elixire-mini') || 'null'); } catch (_) {}
    if (!m || !Number.isFinite(m.x) || !Number.isFinite(m.y)) { sala.classList.remove('mini-movida'); return; }
    const W = escena.offsetWidth || 380, H = escena.offsetHeight || 260;
    sala.style.setProperty('--mini-x', Math.round(MARGEN + Math.max(0, Math.min(1, m.x)) * Math.max(0, innerWidth - W - 2 * MARGEN)) + 'px');
    sala.style.setProperty('--mini-y', Math.round(MARGEN + Math.max(0, Math.min(1, m.y)) * Math.max(0, innerHeight - H - 2 * MARGEN)) + 'px');
    sala.classList.add('mini-movida');
  }
  function ajustaVista() {
    if (!enChat) return;
    const h = vv ? vv.height : innerHeight, top = vv ? vv.offsetTop : 0;
    sala.style.setProperty('--vv-h', Math.round(h) + 'px'); sala.style.setProperty('--vv-top', Math.round(top) + 'px');
    sala.classList.toggle('teclado', innerHeight - h > 120);
  }
  if (vv) { vv.addEventListener('resize', () => { ajustaVista(); if (enChat) abajo(); }); vv.addEventListener('scroll', ajustaVista); }
  function abreChat() {
    if (!movil.matches) { if (vistaLl === 'grande') ponVistaLl('mini'); return; } // en el ordenador, «Responder» enseña la conversación
    if (enChat || !abierta) return;
    if (window.ElixireComprueba && window.ElixireComprueba.cierra) window.ElixireComprueba.cierra();
    if (window.ElixireVigia && window.ElixireVigia.cierra) window.ElixireVigia.cierra();
    enChat = true; sinLeer = 0; pintaCuenta(); marcaLeidos(); menuEnviar.hidden = true; avisos.textContent = '';
    { const g = G(); if (g) g.modoChat(true); else if (M.modoChat) M.modoChat(true); }
    $('#chat-tiempo').textContent = ultimo.t0 ? mmss(Date.now() - ultimo.t0) : '';
    { const vid = ultimo.video !== false, t = $('#chat-volver-txt'), k = vid ? 'volverVideo' : 'volverLlamada'; t.dataset.t = k; t.textContent = tr(k); $('#chat-pausa').hidden = !vid; }
    sala.classList.add('en-chat'); ajustaVista(); quitaVacio(); if (!lista.children.length) { const v = document.createElement('li'); v.className = 'vacio'; v.dataset.t = 'vacio'; v.textContent = tr('vacio'); lista.append(v); }
    requestAnimationFrame(abajo);
  }
  function cierraChat() {
    if (!enChat) return;
    enChat = false; paraNota(false); menuEnviar.hidden = true; if (enMarchaBotones) muestraBotones(); { const g = G(); if (g) g.modoChat(false); else if (M.modoChat) M.modoChat(false); }
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
    if (n.mia) { const mic = icono('mic'); mic.classList.add('nota-oida'); h.prepend(mic); }
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
    if (n.li && n.li.classList.contains('suya') && !n.li.classList.contains('leida')) { n.li.classList.add('leida'); leidosDe(n.li.dataset.de, [id]); }
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
    // (dueño, 23 nov 08:58 y 11:23: «quita las palabras de verificación, no hacen falta ya… cuando le damos a encriptado
    // poscuántico se abre lo de las palabras: eso quítalo»): ya no se enseñan en ningún sitio
  }
  const bEstado = $('#sala-estado'), cajaPal = $('#sala-palabras');
  function verPalabras(si) { if (si && !bEstado.classList.contains('con-palabras')) return; cajaPal.hidden = !si; bEstado.setAttribute('aria-expanded', String(!!si)); }
  bEstado.addEventListener('click', () => verPalabras(cajaPal.hidden));
  document.addEventListener('pointerdown', (e) => { if (!cajaPal.hidden && !cajaPal.contains(e.target) && !bEstado.contains(e.target)) verPalabras(false); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !cajaPal.hidden) verPalabras(false); });
  M.on('palabras', (w) => { if (abierta && !continuada) pintaPalabras(w); });
  $('#coinciden').addEventListener('click', () => {
    M.comprobadas(); $('#sala-palabras').classList.add('hecho'); $('#palabras-botones').hidden = true; sala.classList.remove('por-comprobar');
    const a = $('#palabras-ayuda'); a.dataset.t = 'palabrasHechas'; a.textContent = tr('palabrasHechas');
    setTimeout(() => verPalabras(false), 1800);
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
  let ultimo = { estado: 'libre' }, esperaLlamada = false, esperaT = null, finGrupoMio = true;
  // (dueño, 23 nov 13:56: «cuando paso la llamada del PC al móvil y del móvil al PC… no tiene que aparecer "Llamar" ni "Volver a
  // llamar"… puede decir "Pasando la llamada", pum, y ya»): mientras la llamada cambia de aparato, en los tres lados solo «Pasando la
  // llamada…», sin botones, sin tonos y sin avisos de fin; se quita en cuanto la llamada nueva habla (o a los 25 s, por si algo falla)
  let pasando = false, pasandoT = null, pasandoDesde = 0;
  function marcaPasando(si) {
    pasando = !!si; clearTimeout(pasandoT); pasandoT = null;
    if (pasando) { pasandoDesde = Date.now(); pasandoT = setTimeout(() => { pasando = false; if (abierta) pintaLlamada(ultimo); }, 25000); }
  }
  // La otra persona ha salido de Elixire (dueño, 18:17: «si uno le da a volver a llamar y el otro ha salido completamente de la web,
  // que lo detecte… para que la persona no pierda el tiempo»): en vez de «Volver a llamar», «Invitar de nuevo».
  let otroFuera = false;
  // Si el navegador no deja arrancar la imagen y el sonido sin un toque (dueño, 15:50: Android con Brave: «ni me escuchaba y veía toda
  // la pantalla negra»; en GUARDIANA pasó igual el 2 de noviembre): «Toca para ver y oír a la otra persona», y con el toque, arranca.
  // (dueño, 23 nov 10:36: «al volver al PC, que se abra de forma automática sin tener que presionar un botón ni nada»): si el navegador
  // aún no deja (la cámara propia tarda un instante en arrancar, y con ella el permiso de sonar), se reintenta solo durante unos
  // segundos y al volver a la pestaña; el «Toca para ver y oír» queda solo para cuando de verdad hace falta
  let verT = null, verN = 0;
  function intentaVer() {
    const vs = $('#video-suyo'); if (!vs.srcObject) return;
    try { const p = vs.play(); if (p && p.catch) p.catch((x) => { if (!(x && x.name === 'NotAllowedError' && abierta)) return; clearTimeout(verT); if (verN++ < 15) verT = setTimeout(intentaVer, 700); else $('#video-toca').hidden = false; }); } catch (_) {}
  }
  $('#video-suyo').addEventListener('playing', () => { $('#video-toca').hidden = true; verN = 0; clearTimeout(verT); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && abierta && ultimo.estado === 'hablando') { verN = 0; intentaVer(); } });
  $('#video-toca').addEventListener('click', () => {
    $('#video-toca').hidden = true;
    for (const v of [$('#video-suyo'), $('#video-mio')]) { try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
  });
  // la cámara propia, donde se quiera (dueño, 15:53: «que podamos mover la cámara donde queramos»): se arrastra con el dedo
  {
    // (dueño, 22 nov 17:56: «va como a tirones… que vaya más fluido»): durante el arrastre solo cambia un transform, una vez por
    // fotograma, y la vigilancia de la cara se para (comparte hilo con el dedo); al soltar, la posición queda fija
    const vm = $('#video-mio'); let d = null, raf = 0, px = 0, py = 0;
    const ponEn = (x, y) => { vm.style.setProperty('left', x + 'px', 'important'); vm.style.setProperty('top', y + 'px', 'important'); vm.style.setProperty('right', 'auto', 'important'); vm.style.setProperty('bottom', 'auto', 'important'); };
    const vigia = (si) => { try { if (window.ElixireVigia && window.ElixireVigia.pausa) window.ElixireVigia.pausa(si); } catch (_) {} };
    const pinta = () => { raf = 0; if (d) vm.style.setProperty('transform', 'translate3d(' + (px - d.x0) + 'px,' + (py - d.y0) + 'px,0)' + (vm.classList.contains('trasera') ? '' : ' scaleX(-1)'), 'important'); };
    vm.addEventListener('pointerdown', (e) => {
      if (!movil.matches || sala.classList.contains('en-grupo')) return;
      const r = vm.getBoundingClientRect(), x0 = Math.round(r.left), y0 = Math.round(r.top);
      ponEn(x0, y0); d = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height, x0, y0 }; px = x0; py = y0;
      try { vm.setPointerCapture(e.pointerId); } catch (_) {}
      vm.classList.add('moviendo'); vigia(true); e.preventDefault();
    });
    vm.addEventListener('pointermove', (e) => {
      if (!d || e.pointerId !== d.id) return;
      px = Math.round(Math.max(8, Math.min(innerWidth - d.w - 8, e.clientX - d.dx))); py = Math.round(Math.max(8, Math.min(innerHeight - d.h - 8, e.clientY - d.dy)));
      if (!raf) raf = requestAnimationFrame(pinta);
    });
    const suelta = (e) => { if (!d || e.pointerId !== d.id) return; cancelAnimationFrame(raf); raf = 0; ponEn(px, py); vm.style.removeProperty('transform'); d = null; vm.classList.remove('moviendo'); vigia(false); };
    vm.addEventListener('pointerup', suelta); vm.addEventListener('pointercancel', suelta); vm.addEventListener('lostpointercapture', suelta);
  }
  $('#salir-llamada').addEventListener('click', () => { const g = G(); if (g) g.sal(); M.termina('mio'); });
  // privacidad propia (dueño, 22 nov 21:03): cambiar la voz y ocultar la cara, dos botones; la otra persona ve un aviso
  const FILTROS = [['#b-cambiavoz', 'cambiaVoz', 'vozCambiada', 'cambiaVoz', 'vozCambiada'], ['#b-ocultacara', 'caraOculta', 'caraOcultaTxt', 'ocultaCara', 'caraOculta']];
  function pintaFiltro(b, si, kOn, kOff) { b.setAttribute('aria-pressed', si ? 'true' : 'false'); const sp = b.querySelector('span'); if (sp) { sp.dataset.t = si ? kOn : kOff; sp.textContent = tr(si ? kOn : kOff); } }
  for (const [sel, fn, kOn, kOff] of FILTROS) {
    const b = $(sel); if (!b || !M[fn]) continue;
    b.addEventListener('click', async () => {
      const si = b.getAttribute('aria-pressed') !== 'true'; b.disabled = true;
      let ok = false; try { ok = await (G() || M)[fn](si); } catch (_) {} b.disabled = false;
      if (ok) { pintaFiltro(b, si, kOn, kOff); if (sel === '#b-ocultacara') $('#video-mio').classList.toggle('oculta', si); }
    });
  }
  function filtrosDe(e) {
    for (const [sel, , kOn, kOff, campo] of FILTROS) { const b = $(sel); if (b) pintaFiltro(b, !!(e && e[campo]), kOn, kOff); }
    $('#video-mio').classList.toggle('oculta', !!(e && e.caraOculta));
    avisoOtro(e && e.estado === 'hablando' ? e.otroFiltro : null);
  }
  function avisoOtro(f) {
    let c = $('#otro-chat');
    if (f && f.chat && !c) { c = document.createElement('div'); c.id = 'otro-chat'; c.className = 'otro-chat'; c.setAttribute('role', 'status'); c.innerHTML = '<span class="otro-chat-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z"/><path d="M8 10h8M8 13h5"/></svg></span><b data-t="otroChatTit"></b><small data-t="otroChatTxt"></small>'; c.querySelector('b').textContent = tr('otroChatTit'); c.querySelector('small').textContent = tr('otroChatTxt'); $('#escena-video').append(c); }
    if (c) c.hidden = !(f && f.chat);
    sala.classList.toggle('otro-pantalla', !!(f && f.pantalla && !f.chat));
    let a = $('#filtro-otro'); const txt = [f && f.pantalla && !f.chat ? tr('otroPantalla') : '', f && f.voz ? tr('otroVoz') : '', f && f.cara && !f.chat && !f.pantalla ? tr('otroCara') : ''].filter(Boolean).join(' · ');
    if (!txt) { if (a) a.hidden = true; return; }
    if (!a) { a = document.createElement('p'); a.id = 'filtro-otro'; a.className = 'filtro-otro'; a.setAttribute('role', 'status'); $('#escena-video').append(a); }
    a.textContent = txt; a.hidden = false;
  }
  M.on('filtro', (f) => { if (!G()) avisoOtro(f); else filtrosDe(ef(M.estadoLlamada())); });
  M.on('llamada', (e) => filtrosDe(ef(e)));
  // compartir la pantalla (dueño, 23 nov 09:02: «añade el botón como en GUARDIANA, el de compartir pantalla»), en el ordenador
  const bPantalla = $('#b-pantalla');
  function pintaPantalla(e) {
    if (!bPantalla) return;
    bPantalla.hidden = !(M.puedePantalla && e && e.estado === 'hablando' && e.video !== false);
    const si = !!(e && e.pantalla), sp = bPantalla.querySelector('span'), k = si ? 'dejarPantalla' : 'compartirPantalla';
    bPantalla.setAttribute('aria-pressed', String(si)); if (sp.dataset.t !== k) { sp.dataset.t = k; sp.textContent = tr(k); }
    sala.classList.toggle('compartiendo', si);
  }
  if (bPantalla && M.pantalla) bPantalla.addEventListener('click', async () => {
    const si = bPantalla.getAttribute('aria-pressed') !== 'true'; bPantalla.disabled = true;
    try { await (G() || M).pantalla(si); } catch (_) {}
    bPantalla.disabled = false; pintaPantalla(ef(M.estadoLlamada ? M.estadoLlamada() : null));
  });
  M.on('llamada', (e) => pintaPantalla(ef(e)));
  // ---------- tu imagen y la pantalla partida, como en GUARDIANA (dueño, 23 nov 09:31 y 10:06: «que yo pueda mover por la pantalla
  // mi cámara… revísalo todo y hazlo como en GUARDIANA, ahí estaba perfecto») ----------
  // En el ordenador, la llamada empieza con la pantalla partida, mitad y mitad: la otra persona a la izquierda y tú a la derecha. La
  // raya del medio se arrastra para repartirla (te toca entre el 30 y el 70 %); tocarla no cambia nada. «Cambiar vista» (abajo) o
  // doble clic en tu imagen: partida ↔ tu imagen pequeña, que se mueve con el ratón a donde quieras. Todo se recuerda en este
  // navegador, en proporción a la pantalla.
  const raya = $('#raya-division'), vm = $('#video-mio'), bVista = $('#b-vista'), MARGEN = 10;
  const leeVista = () => { try { const x = JSON.parse(localStorage.getItem('elixire-vista') || '{}'); return x && typeof x === 'object' ? x : {}; } catch (_) { return {}; } };
  const guardaVista = (o) => { try { localStorage.setItem('elixire-vista', JSON.stringify(Object.assign(leeVista(), o))); } catch (_) {} };
  let dividida = false, parte = 0.5, vistaPuesta = false, arr = null;
  { const v = leeVista(); if (Number.isFinite(v.p)) parte = Math.max(0.3, Math.min(0.7, v.p)); }
  const enPC = () => !movil.matches;
  const conImagen = (e = ultimo) => e.estado === 'hablando' && e.video !== false && e.cam !== false;
  function ponParte(p) { parte = Math.max(0.3, Math.min(0.7, p)); sala.style.setProperty('--mi-p', parte.toFixed(4)); }
  const enGrupo = () => sala.classList.contains('en-grupo');
  function pintaVista(e = ultimo) { if (bVista) { bVista.hidden = !(enPC() && conImagen(e) && !enGrupo()); bVista.classList.toggle('partida', dividida); } }
  function colocaMi() {
    const v = leeVista();
    if (dividida || !enPC() || !Number.isFinite(v.x) || !Number.isFinite(v.y)) { sala.classList.remove('movida'); return; }
    const CW = escena.clientWidth, CH = escena.clientHeight, W = vm.offsetWidth, H = vm.offsetHeight; if (!CW || !W) return;
    sala.style.setProperty('--mi-x', Math.round(MARGEN + Math.max(0, Math.min(1, v.x)) * Math.max(0, CW - W - 2 * MARGEN)) + 'px');
    sala.style.setProperty('--mi-y', Math.round(MARGEN + Math.max(0, Math.min(1, v.y)) * Math.max(0, CH - H - 2 * MARGEN)) + 'px');
    sala.classList.add('movida');
  }
  function ponDividida(si, guardar) {
    si = !!si && enPC() && abierta && conImagen() && !enGrupo();
    dividida = si; sala.classList.toggle('dividida', si); raya.hidden = !si; ponParte(parte);
    if (guardar) guardaVista({ div: si });
    colocaMi(); pintaVista();
  }
  if (bVista) bVista.addEventListener('click', () => ponDividida(!dividida, true));
  // tu imagen pequeña: se mueve con el ratón (como en GUARDIANA); doble clic: pantalla partida ↔ pequeña
  vm.addEventListener('dblclick', (e) => { if (!enPC() || enGrupo() || sala.classList.contains('mini')) return; e.stopPropagation(); arr = null; ponDividida(!dividida, true); });
  vm.addEventListener('pointerdown', (e) => {
    if (!enPC() || dividida || enGrupo() || sala.classList.contains('mini') || e.button > 0 || !sala.classList.contains('en-llamada')) return;
    const r = vm.getBoundingClientRect(), c = escena.getBoundingClientRect();
    arr = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, movido: false, W: r.width, H: r.height, cl: c.left, ct: c.top, CW: c.width, CH: c.height };
    try { vm.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  vm.addEventListener('pointermove', (e) => {
    if (!arr || e.pointerId !== arr.id) return;
    if (!arr.movido && Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) < 4) return;
    arr.movido = true; sala.classList.add('moviendo-mi', 'movida');
    const x = Math.max(MARGEN, Math.min(arr.CW - arr.W - MARGEN, e.clientX - arr.cl - arr.dx)), y = Math.max(MARGEN, Math.min(arr.CH - arr.H - MARGEN, e.clientY - arr.ct - arr.dy));
    arr.x = x; arr.y = y; sala.style.setProperty('--mi-x', Math.round(x) + 'px'); sala.style.setProperty('--mi-y', Math.round(y) + 'px');
  });
  const sueltaMi = (e) => {
    if (!arr || e.pointerId !== arr.id) return; const a = arr; arr = null; sala.classList.remove('moviendo-mi');
    try { vm.releasePointerCapture(e.pointerId); } catch (_) {}
    if (!a.movido) return;
    const r5 = (v) => Math.round(v * 1e5) / 1e5;
    guardaVista({ x: r5((a.x - MARGEN) / Math.max(1, a.CW - a.W - 2 * MARGEN)), y: r5((a.y - MARGEN) / Math.max(1, a.CH - a.H - 2 * MARGEN)) });
  };
  vm.addEventListener('pointerup', sueltaMi); vm.addEventListener('pointercancel', sueltaMi);
  // la raya del medio: reparte la pantalla (entre el 30 y el 70 % para ti)
  raya.addEventListener('keydown', (e) => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); ponParte(parte + (e.key === 'ArrowLeft' ? 0.02 : -0.02)); guardaVista({ p: parte }); });
  raya.addEventListener('pointerdown', (e) => {
    if (!dividida || e.button > 0) return; e.preventDefault();
    const r = escena.getBoundingClientRect();
    try { raya.setPointerCapture(e.pointerId); } catch (_) {} raya.classList.add('moviendo'); sala.classList.add('moviendo-raya');
    const mueve = (ev) => ponParte(1 - (ev.clientX - r.left) / r.width);
    const suelta = () => {
      raya.removeEventListener('pointermove', mueve); raya.removeEventListener('pointerup', suelta); raya.removeEventListener('pointercancel', suelta);
      raya.classList.remove('moviendo'); sala.classList.remove('moviendo-raya'); guardaVista({ p: parte });
    };
    raya.addEventListener('pointermove', mueve); raya.addEventListener('pointerup', suelta); raya.addEventListener('pointercancel', suelta);
  });
  addEventListener('resize', () => { if (abierta) colocaMi(); }, { passive: true });
  vm.addEventListener('loadedmetadata', () => colocaMi());
  // al empezar la llamada, partida (o como la dejaste la última vez); sin imagen propia, nada que partir
  M.on('llamada', (e) => {
    e = ef(e);
    if (conImagen(e) && enPC() && !vistaPuesta && abierta) { vistaPuesta = true; ultimo = e; ponDividida(leeVista().div !== false); }
    else if (!conImagen(e) && dividida) { dividida = false; sala.classList.remove('dividida'); raya.hidden = true; }
    if (e.estado !== 'hablando' && e.estado !== 'reconectando') vistaPuesta = false;
    pintaVista(e);
  });
  // en el ordenador, la botonera siempre en una fila: si no cabe en el vídeo, se reduce un poco entera
  if (window.ResizeObserver) {
    const ctlB = $('#controles'), escB = $('#escena-video');
    const encaja = () => { if (movil.matches) { ctlB.style.removeProperty('--k'); return; } const w = ctlB.offsetWidth, a = escB.clientWidth - 32; ctlB.style.setProperty('--k', w && a > 0 && w > a ? Math.max(0.6, a / w).toFixed(3) : '1'); };
    new ResizeObserver(encaja).observe(escB); new ResizeObserver(encaja).observe(ctlB);
  }
  // «Ampliar» / «Ver chat», doble clic en el vídeo y Esc
  { const b = $('#b-ampliar'); if (b) b.addEventListener('click', alternaCompleta); }
  { const b = $('#b-verchat'); if (b) b.addEventListener('click', () => ponVistaLl('mini')); }
  { const b = $('#b-grande'); if (b) b.addEventListener('click', () => ponVistaLl('grande')); }
  // la tarjeta pequeña se arrastra por cualquier sitio que no sea un botón
  {
    let ar = null;
    escena.addEventListener('pointerdown', (e) => {
      if (vistaLl !== 'mini' || e.button > 0 || e.target.closest('button, a, input, .raya-division')) return;
      const r = escena.getBoundingClientRect(); ar = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, W: r.width, H: r.height, movido: false };
      try { escena.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault();
    });
    escena.addEventListener('pointermove', (e) => {
      if (!ar || e.pointerId !== ar.id) return;
      if (!ar.movido && Math.hypot(e.clientX - ar.x0, e.clientY - ar.y0) < 4) return;
      ar.movido = true; sala.classList.add('mini-movida', 'mini-arrastrando');
      ar.x = Math.max(MARGEN, Math.min(innerWidth - ar.W - MARGEN, e.clientX - ar.dx)); ar.y = Math.max(MARGEN, Math.min(innerHeight - ar.H - MARGEN, e.clientY - ar.dy));
      sala.style.setProperty('--mini-x', Math.round(ar.x) + 'px'); sala.style.setProperty('--mini-y', Math.round(ar.y) + 'px');
    });
    const suelta = (e) => {
      if (!ar || e.pointerId !== ar.id) return; const a = ar; ar = null; sala.classList.remove('mini-arrastrando');
      try { escena.releasePointerCapture(e.pointerId); } catch (_) {}
      if (!a.movido) return;
      try { localStorage.setItem('elixire-mini', JSON.stringify({ x: (a.x - MARGEN) / Math.max(1, innerWidth - a.W - 2 * MARGEN), y: (a.y - MARGEN) / Math.max(1, innerHeight - a.H - 2 * MARGEN) })); } catch (_) {}
    };
    escena.addEventListener('pointerup', suelta); escena.addEventListener('pointercancel', suelta);
    addEventListener('resize', () => { if (vistaLl === 'mini') colocaMini(); }, { passive: true });
  }
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
    d.hidden = !en || k === 'cifradaComprobando' || !e.sinCapa; if (e.sinCapa) d.textContent = textoEstandar(); sala.classList.toggle('con-detalle', !d.hidden);
    const cc = $('#chat-cifrado'), kc = e.sinCapa ? 'chatCifradoEstandar' : 'chatCifrado'; if (cc.dataset.t !== kc) { cc.dataset.t = kc; cc.textContent = tr(kc); }
    { const cb = lista.querySelector('.cartel-cifrado b'), kb = e.sinCapa ? 'cifradaEstandar' : 'cifradaExtremo'; if (cb && cb.dataset.t !== kb) { cb.dataset.t = kb; cb.textContent = tr(kb); } }
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
  // La botonería se esconde sola en la videollamada del móvil (dueño, 22 nov 17:00: «cuando llevamos hablando 2 o 3 segundos, quiero
  // que se minimice la botonería… cuando toques la pantalla, aparezcan los botones, y cuando toques otra vez, se minimicen solos o yo
  // los quite tocando… si no, estoy viendo todo el tiempo los botones y eso mete mucho ruido»). Un toque en el vídeo los saca (y se
  // vuelven a esconder a los 4 s); otro toque, fuera. Mientras se usan (un botón, el menú de enviar o el chat), no se esconden.
  let tBotones = 0, enMarchaBotones = false;
  const escondeBotones = () => { clearTimeout(tBotones); if (enMarchaBotones && movil.matches && !enChat && menuEnviar.hidden) sala.classList.add('sin-botones'); };
  const muestraBotones = (ms) => { sala.classList.remove('sin-botones'); clearTimeout(tBotones); if (enMarchaBotones) tBotones = setTimeout(escondeBotones, ms || 4000); };
  function botonesSolos(si) {
    if (si && !enMarchaBotones && !/[?&]botones=fijos\b/.test(location.search)) { enMarchaBotones = true; muestraBotones(3000); } // (fijos: solo en pruebas)
    else if (!si && enMarchaBotones) { enMarchaBotones = false; clearTimeout(tBotones); sala.classList.remove('sin-botones'); }
  }
  $('#escena-video').addEventListener('click', (e) => {
    if (!enMarchaBotones || !movil.matches) return;
    if (e.target.closest('#controles, #video-mio, .video-mio, .vigia-aviso, .avisos-llamada, #chat, #menu-enviar, .menu-enviar, #video-reto, button, a, input, textarea, label')) return;
    if (sala.classList.contains('sin-botones')) muestraBotones(); else escondeBotones();
  });
  $('#controles').addEventListener('pointerdown', () => { if (enMarchaBotones) muestraBotones(5000); });
  // ---- la llamada de voz (dueño, 23 nov 15:47–15:51): sin cámara, una tarjeta con la persona y un aro que late con su voz; el
  // botón de la cámara dice «Vídeo» y pasa a videollamada sin colgar (a la otra persona le llega tu imagen; si quiere, enciende la suya)
  let vozT = null, tarjetaVoz = null;
  function pintaLlamadaVoz(si, e) {
    const bc = $('#b-camara'), s0 = bc && bc.querySelector('span');
    if (bc) { const sinCam = !!(e && (e.estado === 'hablando' || e.estado === 'reconectando') && e.videoMio === false); bc.classList.toggle('a-video', sinCam); if (s0) { const k = sinCam ? 'pasarVideo' : 'camara'; if (s0.dataset.t !== k) { s0.dataset.t = k; s0.textContent = tr(k); } } if (sinCam) bc.setAttribute('aria-pressed', 'false'); }
    if (!si) { if (tarjetaVoz) tarjetaVoz.hidden = true; clearInterval(vozT); vozT = null; return; }
    if (!tarjetaVoz) {
      tarjetaVoz = document.createElement('div'); tarjetaVoz.className = 'tarjeta-voz'; tarjetaVoz.setAttribute('aria-hidden', 'true');
      tarjetaVoz.innerHTML = '<span class="tv-aro"><span class="tv-circulo"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.6" r="3.9"/><path d="M4.4 20.2c.7-4 3.9-6.7 7.6-6.7s6.9 2.7 7.6 6.7"/></svg></span></span><span class="tv-t"></span>';
      $('#escena-video').append(tarjetaVoz);
    }
    tarjetaVoz.hidden = false;
    const t = tarjetaVoz.querySelector('.tv-t'); if (t.dataset.t !== 'llamadaVozEnCurso') { t.dataset.t = 'llamadaVozEnCurso'; t.textContent = tr('llamadaVozEnCurso'); }
    if (!vozT) vozT = setInterval(() => { const x = M.nivelVoz ? M.nivelVoz() : 0; tarjetaVoz.style.setProperty('--nivel', String(Math.min(1, Math.max(0, (x || 0) * 3)).toFixed(2))); }, 120);
  }
  function pintaLlamada(e) {
    const velo = $('#video-velo'), boton = $('#llamar'), ent = $('#entrante'), txt = $('#video-texto'), ctl = $('#controles');
    const vs = $('#video-suyo'), vm = $('#video-mio');
    const pon = (k) => { txt.dataset.t = k; txt.textContent = tr(k); };
    clearInterval(tiempo); tiempo = null; $('#video-tiempo').hidden = true; if (e.estado !== 'hablando' && e.estado !== 'reconectando') calidadUlt = null;
    ultimo = e; if (e.estado !== 'libre') { esperaLlamada = false; clearTimeout(esperaT); }
    // la llamada nueva ya habla (o la de paso se cortó de verdad): se acaba el «Pasando la llamada…»
    if (pasando && ((e.estado === 'hablando' && (e.t0 || 0) >= pasandoDesde) || (e.estado === 'fin' && e.motivo && e.motivo !== 'fin'))) marcaPasando(false);
    const pas = pasando && !(e.estado === 'hablando' && (e.t0 || 0) >= pasandoDesde);
    pintaCifrado(e);
    // (dueño, 23 nov 14:31: «sin tono de llamada») volver a la llamada en grupo no suena en ningún lado: se entra directo
    const vuelve = !!(window.ElixireGrupo && window.ElixireGrupo.reentra);
    if (e.estado === 'llamando' && !pas && !vuelve) tono('saliente'); else if (e.estado === 'entrante' && !pas && !e.cruzada && !G() && !(window.Elixire && window.Elixire.contestaSola)) tono('entrante'); else paraTono();
    const m = movil.matches;
    if (e.estado !== 'hablando') $('#video-reto').hidden = true;
    if (e.local && vm.srcObject !== e.local) vm.srcObject = e.local;
    vm.classList.toggle('trasera', e.mira === 'environment');
    $('#b-girar').hidden = !(m && !pas && (e.estado === 'hablando' || e.estado === 'reconectando') && e.local && e.local.getVideoTracks().length && e.cam !== false);
    if (e.remoto && vs.srcObject !== e.remoto) { vs.srcObject = e.remoto; intentaVer(); }
    if (e.estado === 'hablando') intentaVer(); else if (e.estado !== 'reconectando') $('#video-toca').hidden = true;
    const hablando = !pas && (e.estado === 'hablando' || e.estado === 'reconectando');
    const activa = hablando || pas || ['preparando', 'llamando', 'conectando'].includes(e.estado);
    sala.classList.toggle('en-llamada', hablando); sala.classList.toggle('con-video', activa || e.estado === 'entrante');
    { const voz = hablando && e.video === false; sala.classList.toggle('solo-voz', voz); sala.classList.toggle('sin-cam-propia', !!((hablando || activa) && e.videoMio === false)); pintaLlamadaVoz(voz, e); }
    $('#video-reconecta').hidden = e.estado !== 'reconectando' || pas;
    if (hablando && !llamadaVista) { llamadaVista = true; ponGrande(movil.matches); } else if (!hablando && !pas) { llamadaVista = false; cierraChat(); }
    sala.classList.toggle('video-grande', grande && hablando);
    botonesSolos(e.estado === 'hablando' && !pas);
    const contestaYa = !!(window.Elixire && window.Elixire.contestaSola); // (se contesta sola: sin «Aceptar / Rechazar» entre medias)
    ent.hidden = e.estado !== 'entrante' || contestaYa || pas;
    const fuera = m && otroFuera && (e.estado === 'libre' || e.estado === 'fin');
    // (dueño, 23 nov 11:42: «quien invita ya está esperando y pone "Llamando"; cuando el otro entra, de golpe, sin nada entre medias»):
    // mientras la llamada está por llegar (quien invitó contesta solo; quien escribió el código llama solo), ni en el móvil ni en el
    // ordenador sale «Empezar videollamada»: solo «Llamando…», y en cuanto conecta, la videollamada
    boton.hidden = pas || (e.estado !== 'libre' && e.estado !== 'fin') || (e.estado === 'libre' && esperaLlamada && !fuera) || (m && e.estado === 'fin' && !!e.prueba);
    $('#salir-llamada').hidden = pas || !(e.estado === 'libre' || e.estado === 'fin');
    ctl.hidden = !activa;
    velo.hidden = hablando;
    $('#video-capa').hidden = true; // (todo arriba, en la cabecera)
    { const c = e.estado === 'hablando' && !!e.capa; if (c !== conCapa) { conCapa = c; const mas = $('#sala-estado-mas'), x = $('#sala-estado-texto'); if (mas) mas.hidden = !(conCapa && x.dataset.t === 'salaEstado'); } }
    if (!hablando) { if (!pas) { ponVistaLl(''); sueltaCompleta(); } } else if (enPC() && e.video !== false && !vistaLl) ponVistaLl('grande');
    if (e.estado === 'fin') { vs.srcObject = null; vm.srcObject = null; }
    if (pas) pon('pasandoLlamada');
    else if (e.estado === 'libre') { if (esperaLlamada && !fuera) pon('llLlamando'); else if (M.sinLimite) txt.textContent = ''; else pon('pruebaLimite'); if (m) rotuloLlamar('llamar'); }
    else if (e.estado === 'preparando') pon('llPreparando');
    else if (e.estado === 'llamando') pon('llLlamando');
    else if (e.estado === 'entrante') pon(contestaYa ? 'llConectando' : 'llEntrante');
    else if (e.estado === 'conectando') pon('llConectando');
    else if (hablando) {
      // sin límite (dueño, 16:11), el tiempo que lleva la llamada; con límite, el que queda de prueba
      const pinta = () => { const t = $('#video-tiempo'); t.hidden = false; t.textContent = ''; if (calidadUlt) { const q = document.createElement('span'); q.className = 'calidad ' + calidadUlt.nivel; q.title = tr('calidad_' + calidadUlt.nivel); const b = document.createElement('i'); for (let n = 0; n < 4; n++) b.append(document.createElement('i')); const qt = document.createElement('span'); qt.className = 'cal-t'; qt.textContent = tr('calidad_' + calidadUlt.nivel); q.append(b, qt); t.append(q); } if (enChat) $('#chat-tiempo').textContent = mmss(Date.now() - e.t0); if (M.sinLimite) { t.append(document.createTextNode(mmss(Date.now() - e.t0))); return; } const s = document.createElement('small'); s.textContent = tr('prueba'); t.append(s, document.createTextNode(mmss(e.limite - (Date.now() - e.t0)))); };
      pinta(); tiempo = setInterval(pinta, 250);
      $('#b-micro').setAttribute('aria-pressed', String(e.mic)); $('#b-camara').setAttribute('aria-pressed', String(e.cam));
    } else if (e.estado === 'fin') {
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
    if (fuera && !pas) { pon('otroSalio'); rotuloLlamar('invitarDeNuevo'); }
    // fuera de la llamada en grupo: «Volver a la llamada» (un toque, sin tono); al volver, «Volviendo a la llamada…»
    if (vuelve && !pas && !fuera && !e.prueba) {
      // (si se cortó sin que nadie colgara, vuelve sola: solo «Volviendo a la llamada…»)
      const sola = (e.estado === 'fin' && ['caida', 'fallo', 'sin-respuesta'].includes(e.motivo) && window.ElixireGrupo.vuelveSola) || (e.estado === 'libre' && window.ElixireGrupo.volviendo);
      if (sola) { pon('grupoVuelve'); boton.hidden = true; finGrupoMio = false; }
      else if (e.estado === 'libre' || e.estado === 'fin') { if (e.estado === 'fin') finGrupoMio = e.motivo === 'mio'; pon(finGrupoMio ? 'grupoFuera' : 'grupoCortada'); rotuloLlamar('volverGrupo'); boton.disabled = false; boton.hidden = false; }
      else if (['preparando', 'llamando', 'conectando'].includes(e.estado)) pon('grupoVuelve');
    }
  }
  M.on('llamada', (e) => {
    if (abierta) pintaLlamada(ef(e));
    const E = window.Elixire || {};
    // (con el grupo en marcha, si la persona de la conversación vuelve a llamar, entra sin más)
    if (abierta && e.estado === 'entrante' && (E.contestaSola || G())) { E.contestaSola = false; M.contestar(); }
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
  function alGestoSala(g) {
    if (!abierta || !g || g.q === 'inicio') return;
    const caja = $('#video-reto'), et = $('#reto-etiqueta'), tx = $('#reto-texto');
    clearTimeout(gestoT);
    if (g.q === 'fin') { caja.classList.remove('gesto'); caja.hidden = true; return; }
    caja.classList.add('gesto'); caja.dataset.q = g.q;
    // el destello de color: su luz se refleja en una cara de verdad (quien comprueba lo mide en el vídeo)
    if (g.q === 'luz') { let fl = document.querySelector('.gesto-luz'); if (!fl) { fl = document.createElement('div'); fl.className = 'gesto-luz'; caja.parentElement.append(fl); } fl.style.setProperty('--c', g.n ? '#00FFFF' : '#FF00FF'); fl.classList.add('on'); setTimeout(() => fl.classList.remove('on'), 800); }
    et.dataset.t = 'gestoEtiqueta'; et.textContent = tr('gestoEtiqueta') + (g.n && g.de ? ' · ' + g.n + '/' + g.de : '');
    const sinMic = (() => { try { const e = M.estadoLlamada(); return e && e.mic === false; } catch (_) { return false; } })();
    tx.textContent = (g.q === 'luz' && g.w ? tr('gesto_luzVoz') + ' «' + g.w + '»' : tr('gesto_' + g.q) + (g.q === 'voz' && g.w ? ' «' + g.w + '»' : '')) + ((g.q === 'voz' || (g.q === 'luz' && g.w)) && sinMic ? ' · ' + tr('gesto_activaMic') : ''); caja.hidden = false;
    try { if (!['frente', 'luz'].includes(g.q) && navigator.vibrate) navigator.vibrate(40); } catch (_) {}
    gestoT = setTimeout(() => { caja.hidden = true; caja.classList.remove('gesto'); }, g.q === 'voz' || g.q === 'clave' ? 20000 : 6000);
  }
  M.on('gesto', alGestoSala);
  // un solo toque: con una llamada ya en marcha (o llegando), «Volver a llamar» no hace nada (dueño, 16:30)
  $('#llamar').addEventListener('click', () => {
    if (ultimo.estado !== 'libre' && ultimo.estado !== 'fin') return; if (M.estadoLlamada().estado !== 'libre') return;
    if (movil.matches && (otroFuera || M.otroEsta === false)) { if (otroFuera && window.Elixire && window.Elixire.reinvita) { window.Elixire.reinvita(); return; } otroFuera = true; pintaLlamada(ultimo); return; }
    $('#llamar').hidden = true; M.llamar();
  });
  $('#aceptar').addEventListener('click', () => M.contestar());
  $('#rechazar').addEventListener('click', () => M.rechazar());
  $('#b-colgar').addEventListener('click', () => {
    const g = G(), enLaPrincipal = M.estadoLlamada().estado !== 'libre';
    if (g) g.sal(); M.colgar();
    // (si la persona de la conversación ya había colgado, la llamada que quedaba era la del grupo: se acaba aquí)
    if (g && !enLaPrincipal && abierta) { if (finPendiente || !M.activa) finSala(finPendiente || { motivo: 'mio' }); else pintaLlamada({ estado: 'fin', motivo: 'mio' }); }
  });
  $('#b-micro').addEventListener('click', (e) => (G() || M).micro(e.currentTarget.getAttribute('aria-pressed') !== 'true'));
  $('#b-camara').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    // en una llamada de voz (sin cámara todavía): pasar a vídeo, sin colgar
    if (b.classList.contains('a-video')) { b.disabled = true; try { await (G() || M).activaVideo(); } finally { b.disabled = false; } return; }
    (G() || M).camara(b.getAttribute('aria-pressed') !== 'true');
  });

  // ---------- el estado de la conversación ----------
  M.on('conectado', () => {
    continuada = false; otroFuera = false; abre(); cartelCifrado();
    // invitación a una llamada: quien entra con el enlace llama sin más; quien invitó contesta sola (ver puerta.js)
    const E = window.Elixire || {};
    esperaLlamada = !!(E.llamaAlEntrar || E.contestaSola); clearTimeout(esperaT);
    if (esperaLlamada) esperaT = setTimeout(() => { esperaLlamada = false; if (abierta && ultimo.estado === 'libre') pintaLlamada(ultimo); }, 15000);
    if (ultimo.estado === 'libre') pintaLlamada(ultimo);
    if (E.llamaAlEntrar) {
      E.llamaAlEntrar = false; const t0 = Date.now();
      const va = () => { if (!abierta) return; const g = window.ElixireGrupo, tp = g ? g.tipoPrincipal : null; if (!E.tipoEnlace && tp == null && Date.now() - t0 < 900) { setTimeout(va, 60); return; } if (tp === 'voz' && M.modoVoz) { M.modoVoz(true); E.tipo = 'voz'; } M.llamar(); };
      setTimeout(va, 150);
    }
  });

  // ---------- pasar la conversación al móvil con un QR (motor.js: pasaMovil) ----------
  const dm = $('#movil');
  function cierraMovil() { dm.hidden = true; $('#movil-qr').removeAttribute('src'); }
  // (dueño, 23 nov 09:37: «como en GUARDIANA»): sin palabras que comparar ni «Sí, es mi móvil»: en cuanto el móvil se conecta, la llamada pasa sola
  function pasoMovil(n) {
    $('#movil-paso1').hidden = n !== 1; $('#movil-paso2').hidden = n !== 2; $('#movil-si').hidden = true; $('#movil-palabras').hidden = true;
    const x = $('#movil-no-texto'); x.dataset.t = 'cancelar'; x.textContent = tr('cancelar');
    if (n === 2) { const t = $('#movil-paso2 p:not(.palabras)'); if (t) { t.dataset.t = 'movilConectadoPasando'; t.textContent = tr('movilConectadoPasando'); } }
  }
  const errorDm = (k) => { const e = $('#movil-error'); if (k) e.dataset.t = k; e.textContent = k ? tr(k) : ''; };
  $('#b-movil').addEventListener('click', async () => {
    // (una invitación de «Añadir» aún sin abrir se cancela: la llamada se va al móvil)
    { const g = window.ElixireGrupo; if (g && g.cancelaInvitaciones) g.cancelaInvitaciones(); }
    // el móvil ya espera (la llamada vino de él): pasa directa, sin QR
    if (M.puedeVolver) { const r0 = await M.devuelve(); if (r0.ok) { $('#movil-qr').removeAttribute('src'); errorDm(''); pasoMovil(2); dm.hidden = false; return; } }
    const r = await M.pasaMovil(); if (!r.ok || typeof window.qrSvg !== 'function') return;
    $('#movil-qr').src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(window.qrSvg(r.enlace + '&l=' + (window.ElixireIdioma ? window.ElixireIdioma.actual() : 'en')));
    errorDm(''); pasoMovil(1); dm.hidden = false; setTimeout(() => $('#movil-no').focus(), 50);
  });
  $('#movil-no').addEventListener('click', () => { M.cancelaMovil(); cierraMovil(); });
  $('#movil-si').addEventListener('click', () => { if (M.confirmaMovil()) { $('#movil-si').disabled = true; errorDm(''); const e = $('#movil-error'); e.dataset.t = 'movilPasando'; e.textContent = tr('movilPasando'); } });
  M.on('par-palabras', () => { if (!dm.hidden) pasoMovil(2); });
  M.on('par-fin', (f) => {
    if (f && f.motivo === 'no-espera') { if (!dm.hidden) { pasoMovil(1); errorDm('vueltaNoEspera'); } else if (abierta) sistema('vueltaNoEspera'); pintaVolver(); return; }
    if (!dm.hidden) { pasoMovil(1); $('#movil-qr').removeAttribute('src'); errorDm(f && f.motivo === 'caduca' ? 'movilCaducado' : 'movilCancelado'); }
  });
  // la llamada pasó al otro aparato. El ordenador se queda esperando, por si vuelve; el móvil, como en GUARDIANA, se borra y lo dice
  // (dueño, 23 nov 10:36: «en cuanto pase al PC, que se cierre en el móvil»): si el navegador lo deja, la pestaña se cierra sola
  M.on('traspasada', (x) => {
    cierraMovil(); cierra();
    if (x && x.aPc) { aviso('pcHechoEtiqueta', 'pcHechoTitulo', 'enPcTexto', false); setTimeout(() => { try { window.close(); } catch (_) {} }, 1500); }
    else aviso('movilHechoEtiqueta', 'movilHechoTitulo', x && x.vuelta ? 'movilHechoVuelta' : 'movilHechoTexto', false);
  });
  M.on('par-vuelve', () => { cierraMovil(); aviso('pcVuelveEtiqueta', 'pcVuelveTitulo', 'pcVuelveTexto', false); });
  // la otra persona pasa a otro aparato: esta sala sigue abierta y continúa con él, con claves nuevas
  M.on('traspaso', (x) => { if (abierta) { const k = x && x.dest === 'pc' ? 'traspasoEsperaPc' : 'traspasoEspera'; ponEstado(k, false); sistema(k); if (x && x.reanuda) { if (dividida) { dividida = false; sala.classList.remove('dividida'); raya.hidden = true; pintaVista(); } marcaPasando(true); pintaLlamada(ultimo); } } });
  M.on('continua', (e) => {
    continuada = true; $('#aviso').hidden = true;
    // la llamada llega a este aparato (por el QR o de vuelta): se contesta sola
    if (e && e.movil && e.reanuda && window.Elixire) window.Elixire.contestaSola = true;
    if (e && e.movil && document.hidden) {
      const t0 = document.title; document.title = '● ' + tr('llamadaAqui');
      const vuelve = () => { if (document.hidden) return; document.title = t0; document.removeEventListener('visibilitychange', vuelve); };
      document.addEventListener('visibilitychange', vuelve);
    }
    verN = 0;
    if (!abierta) abre();
    if (e && e.reanuda) marcaPasando(true);
    $('#sala-palabras').hidden = true; sala.classList.remove('por-comprobar'); ponEstado('salaEstado', false); pintaLlamada({ estado: 'libre' }); $('#llamar').disabled = false;
    sistema(e && e.movil ? (e.tel ? 'continuaAqui' : 'continuaAquiPc') : e && e.dest === 'pc' ? 'continuaSuPc' : 'continuaSuMovil');
    pintaVolver();
  });
  // en el móvil, «Volver al ordenador» (como «Volver al PC» de GUARDIANA): la llamada vuelve sola al ordenador que la dio
  const bVolver = $('#b-volver-pc');
  function pintaVolver() { if (bVolver) bVolver.hidden = !(movil.matches && M.puedeVolver && abierta); }
  if (bVolver) bVolver.addEventListener('click', async () => {
    bVolver.disabled = true; const r = await M.devuelve(); bVolver.disabled = false;
    if (r.ok) { bVolver.hidden = true; sistema('volviendoPc'); toast('vuelta', { icono: 'ok', titulo: tr('volviendoPc'), ms: 8000 }); } else pintaVolver();
  });
  M.on('llamada', () => pintaVolver());
  // (las claves se renuevan solas y sin avisos en la conversación: dueño, 22 nov 23:16, «desordenado»)
  M.on('se-va', () => { otroFuera = true; if (abierta) { ponEstado('seFue', true); sistema('seFue'); if (ultimo.estado === 'libre' || ultimo.estado === 'fin') pintaLlamada(ultimo); } });
  M.on('vuelve', () => { otroFuera = false; if (abierta) { ponEstado('salaEstado', false); sistema('vuelve'); if (ultimo.estado === 'libre' || ultimo.estado === 'fin') pintaLlamada(ultimo); } });
  M.on('intruso', () => { if (abierta) sistema('intruso'); });
  M.on('integridad', () => { if (abierta) sistema('integridad'); });
  M.on('red', (si) => { if (abierta) ponEstado(si ? 'salaEstado' : 'sinRed', !si); });
  $('#terminar').addEventListener('click', () => { const g = G(); if (g) g.sal(); M.termina('mio'); if (!M.activa && abierta) finSala({ motivo: 'mio' }); });
  let finPendiente = null;
  M.on('fin', (f) => {
    const g = G();
    if (g && g.quedan() && abierta && !/^alarma/.test(f.motivo || '') && f.motivo !== 'no-coinciden') { finPendiente = f; pintaLlamada(ef(M.estadoLlamada())); return; }
    finSala(f);
  });
  function finSala(f) {
    finPendiente = null;
    const enSala = abierta; cierraMovil(); cierra();
    const textos = {
      mio: ['finEtiqueta', 'finTitulo', 'finTexto', false], suyo: ['finEtiqueta', 'finSuyoTitulo', 'finTexto', false], // (con la lista de lo borrado)
      alarma: ['alarmaEtiqueta', 'alarmaTitulo', 'alarmaTexto', true], 'alarma-suya': ['alarmaEtiqueta', 'alarmaTitulo', 'alarmaTexto', true],
      'no-coinciden': ['alarmaEtiqueta', 'noCoincidenTitulo', 'noCoincidenTexto', true],
    }[f.motivo];
    if (textos && (enSala || f.motivo.startsWith('alarma'))) aviso(...textos, false, f.motivo === 'suyo' && !!(window.Elixire && window.Elixire.reinvita), f.motivo === 'mio' || f.motivo === 'suyo' ? ['finL1', 'finL2', 'finL3'] : null);
  }

  // ---------- mantener pulsado un mensaje, una foto o una nota: «Copiar», «Borrar para todos» (lo tuyo) y «Borrar para mí» (dueño,
  // 18:20: «una vez que la foto está enviada… dejar pulsada y te dé la opción de borrar para los dos o borrar solo para uno»). En el
  // ordenador, con el botón derecho. «Para todos» viaja por la sesión encriptada; solo se borra lo que envió quien lo pide. ----------
  const hoja = $('#hoja-msg'); let objetivo = null, pulsaT = 0, pulsaXY = null;
  const borrable = (li) => li && li.classList.contains('msg') && !li.classList.contains('sistema') && !li.classList.contains('borrado') && !li.classList.contains('vacio') && !li.classList.contains('album');
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
  $('#borra-todos').addEventListener('click', () => { const li = objetivo; cierraHoja(); if (!li || !li.classList.contains('mia')) return; const g = G(); const ok = M.borra(li.dataset.id); if (g) g.borra(li.dataset.id); quitaFila(li, ok || !!g); });
  const alBorrado = (id) => { const li = lista.querySelector('li.msg.suya[data-id="' + CSS.escape(id) + '"]'); if (li) quitaFila(li, true, true); quitaToast('a-' + id); quitaToast('m-' + id); };
  M.on('borrado', alBorrado);
  function quitaFila(li, paraTodos, suyo) {
    const id = li.dataset.id;
    for (const a of li.querySelectorAll('a[href^="blob:"]')) URL.revokeObjectURL(a.href);
    for (const im of li.querySelectorAll('img[src^="blob:"]')) URL.revokeObjectURL(im.src);
    const n = notas.get(id); if (n) { if (n.li && n.li.classList.contains('sonando')) paraReproductor(); if (n.url) URL.revokeObjectURL(n.url); notas.delete(id); }
    const u = previas.get(id); if (u) { URL.revokeObjectURL(u); previas.delete(id); }
    if (archivosVivos.has(id)) { archivosVivos.delete(id); if (M.cancelaArchivo) { try { M.cancelaArchivo(id); } catch (_) {} } { const g = G(); if (g) g.cancelaArchivo(id); } quitaToast('a-' + id); }
    const al = li.parentElement && li.parentElement.classList.contains('alb-rejilla') ? li.closest('li.album') : null;
    if (al) {
      li.remove();
      if (al.querySelector('.alb-rejilla>li')) { pintaAlbum(al); return; }
      if (!paraTodos) { al.remove(); return; }
      li = al; delete al.dataset.alb;
    }
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
  $('#b-girar').addEventListener('click', async () => { const b = $('#b-girar'); b.disabled = true; b.classList.add('girando'); try { await (G() || M).giraCamara(); } finally { b.disabled = false; setTimeout(() => b.classList.remove('girando'), 350); } });

  // ---------- avisos ----------
  function aviso(etiqueta, titulo, cuerpo, mal, enlace, invitar, lista) {
    const a = $('#aviso'); a.classList.toggle('mal', !!mal); $('#aviso-enlace').hidden = !enlace; $('#aviso-invitar').hidden = !invitar;
    for (const [id, k] of [['#aviso-etiqueta', etiqueta], ['#aviso-titulo', titulo], ['#aviso-texto', cuerpo]]) { const e = $(id); e.dataset.t = k; e.textContent = tr(k); }
    // al colgar: un sello y la lista de lo que se ha borrado, en tres líneas fáciles de leer
    const ul = $('#aviso-lista'); ul.textContent = ''; a.classList.toggle('fin', !!(lista && lista.length)); ul.hidden = !(lista && lista.length);
    for (const k of lista || []) { const li = document.createElement('li'); li.dataset.t = k; li.textContent = tr(k); ul.append(li); }
    a.hidden = false; setTimeout(() => $('#aviso-ok').focus(), 50);
  }
  $('#aviso-ok').addEventListener('click', () => { $('#aviso').hidden = true; });
  // (dueño, 18:17: «que lo detecte para decirle… tiene que volver a enviar o invitar tú… para que la persona no pierda el tiempo»)
  $('#aviso-invitar').addEventListener('click', () => { $('#aviso').hidden = true; if (window.Elixire && window.Elixire.reinvita) window.Elixire.reinvita(); });
  window.ElixireAviso = aviso;

  // ---------- para la llamada en grupo (grupo.js): cada persona más, con los mismos avisos y filas que la principal ----------
  function avisoBreve(t) {
    if (!abierta || !t) return;
    if (movil.matches && !enChat) { toast('g-' + Date.now(), { icono: 'msj', titulo: t, ms: 4200 }); return; }
    quitaVacio(); const li = document.createElement('li'); li.className = 'msg sistema'; li.textContent = t; lista.append(li); abajo();
    if (!movil.matches && amplia) toast('g-' + Date.now(), { icono: 'msj', titulo: t, ms: 4200 });
  }
  function engancha(x, etiqueta, quien) {
    x.on('escribe', alEscribe);
    x.on('mensaje', (m) => { if (m.dir !== 'mia') autor(m, quien, etiqueta); $('#escribiendo').hidden = true; pintaMensaje(m); if (m.dir !== 'mia') noLeido(); });
    x.on('acuse', (ids) => recibo(ids, quien, false));
    x.on('leido', (ids) => recibo(ids, quien, true));
    x.on('archivo', (a) => { if (a.dir !== 'mia') autor(a, quien, etiqueta); filaArchivo(a); });
    x.on('archivo-progreso', (p) => { const r = grupoEnv.get(p.id); if (p.dir !== 'mia' || !r || !r.porM) alProgreso(p); });
    x.on('archivo-enviado', alEnviado); x.on('archivo-listo', alListo); x.on('archivo-cancelado', alCancelado);
    x.on('borrado', alBorrado);
    // la calidad de arriba: la de la llamada principal; si ha colgado, la de las demás
    x.on('calidad', (q) => { if (M.estadoLlamada().estado === 'libre' || M.estadoLlamada().estado === 'fin') calidadUlt = q; });
  }
  // el grupo se ha quedado sin nadie: si la conversación principal ya no está, se cierra como siempre; si está, lo de colgar
  function finGrupo() {
    if (!abierta) return;
    if (finPendiente || !M.activa) { finSala(finPendiente || { motivo: 'suyo' }); return; }
    const e = M.estadoLlamada(); pintaLlamada(e.estado === 'libre' ? { estado: 'fin', motivo: 'suyo' } : e);
  }
  function repinta() { if (abierta) { const e = ef(M.estadoLlamada()); pintaLlamada(e); filtrosDe(e); pintaPantalla(e); } }
  function grupoCambia(si) {
    if (si) { if (dividida) { dividida = false; sala.classList.remove('dividida'); raya.hidden = true; } }
    else if (enPC() && abierta && conImagen() && leeVista().div !== false) ponDividida(true, false);
    colocaMi(); pintaVista();
  }
  window.ElixireSala = { engancha, aviso: avisoBreve, finGrupo, repinta, grupoCambia, gesto: alGestoSala };
  // «Verificar esta página»: el código es público y cada script lleva su huella SHA-384 (herramientas/huellas.py)
  for (const v of document.querySelectorAll('.verificar')) v.addEventListener('click', (e) => { e.preventDefault(); aviso('verificarEtiqueta', 'verificarTitulo', 'verificarTexto', false, true); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#aviso').hidden) $('#aviso').hidden = true; });
})();
