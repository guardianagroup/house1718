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
  let abierta = false;
  const hora = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const tam = (n) => (n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(2) + ' GB');

  // ---------- abrir y cerrar ----------
  function abre() {
    if (abierta) return; abierta = true;
    lista.textContent = ''; const v = document.createElement('li'); v.className = 'vacio'; v.dataset.t = 'vacio'; v.textContent = tr('vacio'); lista.append(v);
    $('#sala-palabras').hidden = true; $('#sala-palabras').classList.remove('hecho'); $('#palabras-botones').hidden = false;
    const a = $('#palabras-ayuda'); a.dataset.t = 'palabrasAyuda'; a.textContent = tr('palabrasAyuda');
    ponEstado('salaEstado', false); pintaLlamada({ estado: 'libre' }); $('#llamar').disabled = false;
    pintaPalabras(M.palabras);
    sala.hidden = false; document.body.classList.add('en-sala');
    setTimeout(() => { if (abierta && window.Sala3D && window.Sala3D.pausa) window.Sala3D.pausa(true); }, 900);
    setTimeout(() => texto.focus({ preventScroll: true }), 300);
  }
  function cierra() {
    if (!abierta) return; abierta = false;
    sala.hidden = true; document.body.classList.remove('en-sala');
    for (const a of lista.querySelectorAll('a[href^="blob:"]')) URL.revokeObjectURL(a.href);
    lista.textContent = ''; texto.value = '';
    const vs = $('#video-suyo'), vm = $('#video-mio'); vs.srcObject = null; vm.srcObject = null;
    if (window.Sala3D && window.Sala3D.pausa) window.Sala3D.pausa(false);
    if (window.Elixire) window.Elixire.vuelve();
  }
  function ponEstado(k, mal) { const e = $('#sala-estado'); e.classList.toggle('mal', !!mal); const x = $('#sala-estado-texto'); x.dataset.t = k; x.textContent = tr(k); }

  // ---------- mensajes ----------
  function quitaVacio() { const v = lista.querySelector('.vacio'); if (v) v.remove(); }
  function abajo() { lista.scrollTop = lista.scrollHeight; }
  function pintaMensaje(m) {
    quitaVacio();
    const li = document.createElement('li'); li.className = 'msg ' + m.dir; li.dataset.id = m.id;
    li.append(document.createTextNode(m.texto));
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
  M.on('mensaje', (m) => { $('#escribiendo').hidden = true; pintaMensaje(m); });
  M.on('acuse', (ids) => { for (const id of ids) { const li = lista.querySelector('li.mia[data-id="' + CSS.escape(id) + '"]'); if (li) li.classList.add('llego'); } });

  // ---------- archivos ----------
  function filaArchivo(a) {
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
  M.on('archivo-progreso', (p) => { const li = fila(p.id); if (li) li.querySelector('.barra i').style.width = Math.round(p.hecho * 100) + '%'; });
  M.on('archivo-enviado', (p) => { const li = fila(p.id); if (!li) return; li.querySelector('.barra i').style.width = '100%'; const s = document.createElement('span'); s.className = 'tam'; s.dataset.t = 'archivoEnviado'; s.textContent = tr('archivoEnviado'); li.append(s); });
  M.on('archivo-listo', (a) => {
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
    $('#sala-palabras').hidden = false;
  }
  M.on('palabras', (w) => { if (abierta) pintaPalabras(w); });
  $('#coinciden').addEventListener('click', () => {
    M.comprobadas(); $('#sala-palabras').classList.add('hecho'); $('#palabras-botones').hidden = true;
    const a = $('#palabras-ayuda'); a.dataset.t = 'palabrasHechas'; a.textContent = tr('palabrasHechas');
  });
  $('#no-coinciden').addEventListener('click', () => M.termina('no-coinciden'));
  M.on('su-comprobacion', () => sistema('suComprobacion'));

  // ---------- la videollamada ----------
  let tiempo = null;
  function pintaLlamada(e) {
    const velo = $('#video-velo'), boton = $('#llamar'), ent = $('#entrante'), txt = $('#video-texto'), ctl = $('#controles');
    const vs = $('#video-suyo'), vm = $('#video-mio');
    const pon = (k) => { txt.dataset.t = k; txt.textContent = tr(k); };
    clearInterval(tiempo); tiempo = null; $('#video-tiempo').hidden = true;
    if (e.estado !== 'hablando') $('#video-reto').hidden = true;
    if (e.local && vm.srcObject !== e.local) vm.srcObject = e.local;
    if (e.remoto && vs.srcObject !== e.remoto) vs.srcObject = e.remoto;
    const activa = ['preparando', 'llamando', 'conectando', 'hablando'].includes(e.estado);
    sala.classList.toggle('en-llamada', e.estado === 'hablando');
    ent.hidden = e.estado !== 'entrante';
    boton.hidden = e.estado !== 'libre' && e.estado !== 'fin';
    ctl.hidden = !activa;
    velo.hidden = e.estado === 'hablando';
    $('#video-capa').hidden = !(e.estado === 'hablando' && e.capa);
    if (e.estado === 'libre') pon('pruebaLimite');
    else if (e.estado === 'preparando') pon('llPreparando');
    else if (e.estado === 'llamando') pon('llLlamando');
    else if (e.estado === 'entrante') pon('llEntrante');
    else if (e.estado === 'conectando') pon('llConectando');
    else if (e.estado === 'hablando') {
      const pinta = () => { const q = Math.max(0, Math.ceil((e.limite - (Date.now() - e.t0)) / 1000)); const t = $('#video-tiempo'); t.hidden = false; t.textContent = ''; const s = document.createElement('small'); s.textContent = tr('prueba'); t.append(s, document.createTextNode(Math.floor(q / 60) + ':' + String(q % 60).padStart(2, '0'))); };
      pinta(); tiempo = setInterval(pinta, 250);
      $('#b-micro').setAttribute('aria-pressed', String(e.mic)); $('#b-camara').setAttribute('aria-pressed', String(e.cam));
    } else if (e.estado === 'fin') {
      vs.srcObject = null; vm.srcObject = null;
      if (e.prueba) { pon('pruebaFin'); boton.disabled = true; }
      else pon('pruebaLimite');
      const k = { prueba: 'llFinPrueba', rechazada: 'llRechazada', rechaza: 'llRechazada', suyo: 'llColgo', ocupado: 'llOcupado', 'sin-respuesta': 'llSinRespuesta', fallo: 'llFallo', 'sin-turn': 'llSinTurn', 'sin-permiso': 'llSinPermiso', 'sin-capa': 'llSinCapaSuya', 'se-fue': 'seFue', mio: 'llTerminada' }[e.motivo];
      if (k && abierta) sistema(k);
    }
  }
  M.on('llamada', (e) => { if (abierta) pintaLlamada(e); });
  M.on('llamada-aviso', (por) => { if (abierta) sistema({ 'sin-capa': 'llSinCapa', 'sin-medios': 'llSinMedios', 'sin-sesion': 'llSinSesion', 'sin-turn': 'llSinTurn', 'prueba-usada': 'llFinPrueba', descifra: 'llDescifra' }[por] || 'llFallo'); });
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
  M.on('conectado', () => { abre(); sistema('mConectado'); });
  M.on('claves', (c) => { if (abierta && c.renovada) sistema('clavesRenovadas'); });
  M.on('se-va', () => { if (abierta) { ponEstado('seFue', true); sistema('seFue'); } });
  M.on('vuelve', () => { if (abierta) { ponEstado('salaEstado', false); sistema('vuelve'); } });
  M.on('intruso', () => { if (abierta) sistema('intruso'); });
  M.on('integridad', () => { if (abierta) sistema('integridad'); });
  M.on('red', (si) => { if (abierta) ponEstado(si ? 'salaEstado' : 'sinRed', !si); });
  $('#terminar').addEventListener('click', () => M.termina('mio'));
  M.on('fin', (f) => {
    const enSala = abierta; cierra();
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
