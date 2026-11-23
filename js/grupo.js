// Elixire · la llamada en grupo, hasta 4 personas (23 nov 2026).
// Dueño, 23 nov 11:50: «tienes que añadir lo de añadir participante, que cualquiera de los dos pueda añadir un participante en
// Elixir»; 11:55: «la otra persona puede estar en un PC o puede estar en un móvil o una tablet, lo que ella quiera».
// Dueño, 23 nov 13:56: «copia lo que ya estaba en GUARDIANA. En GUARDIANA funcionaba la llamada grupal… copia el sistema aquel y
// tráelo aquí y ya luego lo vamos puliendo aquí». Como en GUARDIANA (orbita/comunicaciones/llamada.js, «Llamada en grupo»): quien
// añade a alguien lo une con una llamada nueva (un «tramo»), así que la llamada es un árbol de tramos. Por cada tramo, cada equipo
// manda su voz mezclada con la que le llega por los demás tramos (nunca la del propio tramo) y, además de su imagen, las imágenes
// que le llegan por los demás. Cada tramo es una llamada normal, con su propia sesión poscuántica y su capa poscuántica de imagen y
// sonido; nadie tiene que conectarse con quien no conoce. Si alguien cuelga, siguen los demás; quien estaba unido solo a través de
// esa persona se queda fuera. El chat va igual: lo que llega por un tramo sale por los demás, con quién lo escribió.
// Cómo entra alguien: quien toca «Añadir» crea una invitación nueva (en el ordenador, un código como el de siempre, con su enlace;
// en el móvil, el enlace por WhatsApp). La persona invitada entra con quien la invitó, y desde ese momento ve y oye a todas.
// Lo propio (micro, cámara, cambiar la voz, ocultar la cara, compartir pantalla) va igual a todos los tramos: cada uno usa copias de
// la misma cámara y el mismo micrófono, y cada uno aplica sus filtros antes de encriptar.
'use strict';
(() => {
  const M = window.ElixireMotor, Nuevo = window.ElixireMotorNuevo;
  if (!M || !Nuevo || !window.crypto || !crypto.getRandomValues) return;
  const $ = (s) => document.querySelector(s);
  const tr = (k) => (window.ElixireIdioma ? window.ElixireIdioma.t(k) : k);
  const SALA = () => window.ElixireSala || {};
  const MAX = 4, CADUCA_MS = 10 * 60 * 1000, FUERA_MS = 10 * 60 * 1000;
  const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const b64u = (u) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const movil = matchMedia('(max-width: 760px)');
  // (dueño, 23 nov 13:24: «sí, para todos»): «Añadir» sale a cualquiera en la videollamada, sin enlace especial
  const PRUEBA = true;
  const sala = $('#sala'), esc = $('#escena-video');
  const yo = hex(6);
  const esId = (x) => typeof x === 'string' && /^[0-9a-f]{12}$/.test(x);
  // la versión de esta web (la de los scripts): va en el saludo, para saber si alguien del grupo tiene la web sin actualizar
  const VERSION = ((((document.querySelector('script[src*="js/grupo.js"]') || {}).src || '').split('?v=')[1]) || '').replace(/[^\d-]/g, '');
  const principal = { m: M, id: null, n: 1, principal: true, clave: 'p', gente: null, arbol: false, enviado: '' };
  const extras = new Map(); // clave → { m, id, n, invitado, visto, caduca, codigo, gente, arbol, enviado, motivo, reintentos }
  let numero = 1, promovido = null, t0Grupo = 0, pantallaG = null;
  const propio = { mic: true, cam: true, voz: false, cara: false, chat: false }; // lo que tengo puesto en el grupo

  const enLlamada = (p) => { const e = p.m.estadoLlamada(); return e.estado === 'hablando' || e.estado === 'reconectando'; };
  const pares = () => [...extras.values()];
  const enCurso = () => pares().filter(enLlamada);
  // los tramos en marcha: la llamada principal (si sigue) y las de las personas que añadí yo
  const tramos = () => [...(enLlamada(principal) ? [principal] : []), ...enCurso()];
  const motores = () => tramos().map((p) => p.m);
  const conSesion = () => [principal, ...pares()].filter((p) => p.m.conectada && !p.m.terminada);
  const aviso = (t) => { const S = SALA(); if (S.aviso) S.aviso(t); };

  // ---- los nombres: «Persona N», por orden de llegada (en cada equipo); quien está detrás de otro tramo, también ----
  const nums = new Map();
  function numDe(id) { if (!esId(id)) return 0; if (!nums.has(id)) nums.set(id, ++numero); return nums.get(id); }
  const etiquetaId = (id) => tr('persona') + ' ' + (numDe(id) || '');
  const etiqueta = (p) => (p.id ? etiquetaId(p.id) : tr('persona') + ' ' + p.n);
  function ponId(p, id) { if (!esId(id) || id === yo) return; p.id = id; if (!nums.has(id)) nums.set(id, p.n); }

  // ---- quién hay detrás de cada tramo (lo dice la otra persona: «gente»); sin eso, solo ella ----
  const filtros = (f) => { f = f || {}; return { mic: f.mic !== false, cam: f.cam !== false, voz: !!f.voz, cara: !!f.cara, pantalla: !!f.pantalla, chat: !!f.chat }; };
  function genteDe(K) {
    const suya = { id: K.id || 't' + K.clave, mid: 'p', f: filtros(K.m.estadoLlamada().otroFiltro) };
    if (!K.arbol || !Array.isArray(K.gente) || !K.gente.length) return [suya];
    const out = [], vistos = new Set([yo]);
    for (const x of K.gente) { if (vistos.has(x.id)) continue; vistos.add(x.id); out.push(x.mid === 'p' ? { id: x.id, mid: 'p', f: suya.f } : x); }
    return out.length ? out : [suya];
  }
  // la imagen de una persona que llega por un tramo: la principal del tramo o la reenviada en su hueco
  function pistaDe(K, P) {
    if (P.mid === 'p') { const r = K.m.estadoLlamada().remoto, v = r && r.getVideoTracks()[0]; return v && v.readyState === 'live' ? v : null; }
    if (P.mid == null) return null;
    const t = K.m.llegan && K.m.llegan.get(String(P.mid)); return t && t.readyState === 'live' ? t : null;
  }
  const misFiltros = () => ({ mic: propio.mic !== false, cam: propio.cam !== false, voz: !!propio.voz, cara: !!propio.cara, pantalla: !!(pantallaG || M.estadoLlamada().pantalla), chat: !!propio.chat });
  const personas = () => 1 + tramos().reduce((s, K) => s + genteDe(K).length, 0) + pares().filter((p) => !enLlamada(p) && !p.m.terminada).length;

  // ---- la cámara y el micrófono de cada tramo nuevo: copias de los que ya están abiertos (no se abre otra vez la cámara; en el
  // iPhone solo puede haber una abierta). Se espera a que la llamada principal tenga los suyos, como mucho 15 s. ----
  const copia = (st) => new MediaStream(st.getTracks().filter((t) => t.readyState === 'live').map((t) => { const c = t.clone(); c.enabled = t.enabled; return c; }));
  async function copias() {
    for (let i = 0; i < 150; i++) {
      for (const m of [M, ...pares().map((p) => p.m)]) {
        const st = m.propias; if (st && st.getTracks().some((t) => t.readyState === 'live')) return copia(st);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  }

  // ---- cada persona que añado: su propio tramo (su sesión y su llamada) ----
  function nuevoPar(o) {
    const m = Nuevo({ medios: copias }); if (!m) return null;
    const p = { m, id: null, n: ++numero, invitado: !!o.invitado, visto: false, clave: hex(4), reintentos: 0, gente: null, arbol: false, enviado: '' };
    extras.set(p.clave, p);
    m.on('conectado', () => {
      if (p.invitado) clearTimeout(p.caduca); m.grupo({ que: 'hola', id: yo, v: VERSION, arbol: 1 });
      if (invitaPC === p) pintaTarjeta('anadirEntra');
      pinta();
    });
    m.on('llamada', (e) => {
      // una llamada nueva con esta persona (volvió a entrar, o la suya sustituyó a la que se cortó): todo se le manda otra vez
      // (lo que la otra persona ya dijo de su lado se guarda: puede llegar un instante antes de que aquí conste la llamada)
      if ((e.estado === 'hablando' || e.estado === 'reconectando') && e.t0 && e.t0 !== p.t0) { p.t0 = e.t0; p.enviado = ''; p.mezclada = false; p.propioPuesto = false; }
      if (e.estado === 'entrante') m.contestar();
      if (e.estado === 'hablando') {
        clearTimeout(p.esperaT); clearTimeout(p.caduca);
        if (!p.visto) { p.visto = true; if (invitaPC === p) cierraTarjeta(); }
        if (!p.propioPuesto) { p.propioPuesto = true; ponPropio(m); }
      }
      if (e.estado === 'fin') {
        p.motivo = (e.motivo || '') + (e.diag ? ' ' + e.diag : ''); p.gente = null; p.enviado = ''; p.mezclada = false; p.propioPuesto = false;
        // (dueño, 23 nov 14:31: «si alguien sale de la llamada… que pueda volver a entrar… que entre automático… y sin tono de
        // llamada»): quien sale (o se le corta) sigue con su conversación abierta y puede volver a entrar cuando quiera durante 10
        // minutos: su llamada se contesta sola, sin sonar y sin que nadie tenga que aceptar
        if (!p.visto || m.terminada || !m.conectada) setTimeout(() => quita(p), 0);
        else { clearTimeout(p.esperaT); p.esperaT = setTimeout(() => { if (extras.has(p.clave) && !enLlamada(p)) quita(p); }, FUERA_MS); }
      }
      pinta();
      // la cabecera (el candado, la calidad, el tiempo) cuenta con todas las llamadas del grupo
      const S = SALA(); if (S.repinta && extras.has(p.clave)) S.repinta();
    });
    m.on('grupo', (g) => recibe(p, g));
    m.on('fin', (f) => { if (!p.motivo && f && f.motivo) p.motivo = f.motivo; quita(p); });
    m.on('filtro', () => pinta());
    m.on('llegan', programa); m.on('reneg', programa);
    chatDe(p);
    if (SALA().engancha) SALA().engancha(m, () => etiqueta(p), p.clave);
    if (o.semilla) {
      const r = m.invitaSemilla(o.semilla);
      Promise.resolve(r).then((x) => { if (!x || !x.ok) quita(p); }).catch(() => quita(p));
    }
    // una invitación sin abrir caduca a los 10 minutos
    p.caduca = setTimeout(() => { if (!m.conectada || !p.visto) { if (invitaPC === p) pintaTarjeta('anadirCaduca'); if (!p.motivo) p.motivo = m.conectada ? 'sin-llamada' : 'sin-sesion'; quita(p); } }, CADUCA_MS);
    pinta(); return p;
  }
  function quita(p) {
    if (!extras.has(p.clave)) return;
    extras.delete(p.clave); clearTimeout(p.caduca); clearTimeout(p.esperaT);
    if (promovido === p) promovido = null;
    if (invitaPC === p) { invitaPC = null; }
    if (!p.visto && p.m.conectada && !saliendo) aviso(tr('grupoNoConecta').replace('{p}', etiqueta(p)) + (p.motivo ? ' (' + p.motivo + ')' : ''));
    try { if (p.m.estadoLlamada().estado !== 'libre') p.m.colgar(); } catch (_) {}
    try { if (!p.m.terminada) p.m.termina('mio'); } catch (_) {}
    pinta();
    if (!enCurso().length && !enLlamada(principal)) acaba();
  }
  // el grupo se ha quedado sin nadie en la llamada
  function acaba() {
    t0Grupo = 0; promovido = null;
    if (pantallaG) { try { pantallaG.stop(); } catch (_) {} pantallaG = null; }
    paraNivel();
    const S = SALA(); if (S.finGrupo) S.finGrupo();
  }
  // quien tiene la web sin actualizar no recibe las imágenes de los demás (solo la voz de todos): se avisa una vez por persona
  const viejoAvisado = new Set();
  function avisaViejo(q) { const k = q.principal ? 'p:' + (q.id || 'x') : q.clave; if (viejoAvisado.has(k)) return; viejoAvisado.add(k); aviso(tr('grupoViejo').replace('{p}', etiqueta(q))); }
  function recibe(p, g) {
    if (!g || !g.que) return;
    if (g.que === 'hola') { ponId(p, g.id); p.arbol = g.arbol === 1; p.viejo = !p.arbol; pinta(); return; }
    if (g.que === 'gente') {
      p.gente = Array.isArray(g.gente) && g.gente.length ? g.gente : null;
      if (p.gente && p.gente[0].mid === 'p' && !p.id) ponId(p, p.gente[0].id);
      if (p.gente) for (const x of p.gente) numDe(x.id);
      p.arbol = true; pinta(); return;
    }
    if (g.que === 'habla') { p.hablaId = g.habla || null; return; }
  }
  // lo que tengo puesto (micro, cámara, voz, cara, pantalla, chat), también en cada tramo nuevo
  async function ponPropio(m) {
    try {
      const e = m.estadoLlamada();
      if ((e.mic !== false) !== (propio.mic !== false)) m.micro(propio.mic);
      if ((e.cam !== false) !== (propio.cam !== false)) m.camara(propio.cam);
      if (!!e.vozCambiada !== !!propio.voz) await m.cambiaVoz(!!propio.voz);
      if (!!e.caraOculta !== !!propio.cara) await m.caraOculta(!!propio.cara);
      if (!pantallaG && M.pistaPantalla && M.pistaPantalla.readyState === 'live') { pantallaG = M.pistaPantalla; pantallaG.addEventListener('ended', () => { if (pantallaG) pantalla(false); }); }
      if (pantallaG && pantallaG.readyState === 'live' && !m.estadoLlamada().pantalla) { const c = pantallaG.clone(); try { c.contentHint = 'detail'; } catch (_) {} await m.pantalla(true, c); }
      if (propio.chat) m.modoChat(true);
    } catch (e) { console.warn('grupo', e); }
    sincroniza();
  }

  // ---- por cada tramo: la voz mezclada, las imágenes reenviadas y quién hay detrás (como en GUARDIANA) ----
  let sincT = 0, sincEnCurso = false, sincOtra = false;
  function sincroniza() { if (!sincT) sincT = setTimeout(() => { sincT = 0; sincronizaYa(); }, 60); }
  async function sincronizaYa() {
    if (sincEnCurso) { sincOtra = true; return; }
    sincEnCurso = true;
    // (cada tramo a la vez: cada uno es una llamada aparte)
    try { const ts = tramos(); await Promise.all(ts.map((L) => sincTramo(L, ts))); }
    catch (e) { console.warn('grupo', e); }
    finally { sincEnCurso = false; }
    if (sincOtra) { sincOtra = false; sincroniza(); }
  }
  async function sincTramo(L, ts) {
    const otros = ts.filter((K) => K !== L);
    // la voz: la mía y la de los demás tramos (nunca la de este)
    if (otros.length || L.mezclada) {
      const voces = otros.map((K) => { const r = K.m.estadoLlamada().remoto; return r && r.getAudioTracks()[0]; }).filter(Boolean);
      try { L.m.mezcla(voces); } catch (_) {}
      L.mezclada = voces.length > 0;
    }
    if (!L.arbol) { if (otros.length && L.viejo) avisaViejo(L); return; }
    if (!otros.length && !L.enviado) return;
    // las imágenes de los demás tramos (la de cada persona, por su hueco) y la lista de quién hay de este lado
    const lista = [], gente = [{ id: yo, mid: 'p', f: misFiltros() }], vistos = new Set([yo, L.id]);
    for (const K of otros) for (const P of genteDe(K)) {
      if (!esId(P.id) || vistos.has(P.id)) continue; vistos.add(P.id);
      const pista = pistaDe(K, P);
      if (pista) { try { const h = P.f && P.f.pantalla ? 'detail' : 'motion'; if (pista.contentHint !== h) pista.contentHint = h; } catch (_) {} lista.push({ clave: P.id, pista }); }
      gente.push({ id: P.id, mid: null, f: P.f });
    }
    let mids = {}; try { mids = (await L.m.reenvia(lista)) || {}; } catch (e) { console.warn('grupo', e); }
    for (const g of gente) if (g.id !== yo && mids[g.id] != null) g.mid = String(mids[g.id]);
    const txt = JSON.stringify(gente);
    if (txt !== L.enviado && L.m.estadoLlamada().estado !== 'libre') { L.enviado = txt; L.m.grupo({ que: 'gente', g: gente }); }
  }

  // ---- el chat del grupo: lo que llega por un tramo sale por los demás, con quién lo escribió («de») ----
  const yaReenviado = new Set(), llegoPor = new Map(), borrados = new Set();
  const destinos = (K) => conSesion().filter((L) => L !== K);
  function chatDe(K) {
    const m = K.m;
    m.on('mensaje', (x) => {
      if (!x || x.dir === 'mia' || !x.id) return;
      llegoPor.set(x.id, K.clave);
      if (yaReenviado.has(x.id)) return; yaReenviado.add(x.id);
      const de = x.origen || K.id; if (!esId(de)) return;
      for (const L of destinos(K)) { try { L.m.envia(x.texto, x.id, de, x.t); } catch (_) {} }
    });
    m.on('archivo', (a) => { if (a && a.dir !== 'mia' && a.id) llegoPor.set(a.id, K.clave); });
    m.on('archivo-listo', (a) => {
      if (!a || !a.id || !a.blob || yaReenviado.has(a.id)) return; yaReenviado.add(a.id);
      const de = a.origen || K.id; if (!esId(de)) return;
      const ds = destinos(K); if (!ds.length) return;
      let f; try { f = new File([a.blob], a.nombre || 'archivo', { type: a.mime || '' }); } catch (_) { f = a.blob; try { f.name = a.nombre; } catch (_) {} }
      for (const L of ds) { try { L.m.enviaArchivo(f, a.id, de, a.vista); } catch (_) {} }
    });
    m.on('borrado', (id) => { if (!id || borrados.has(id)) return; borrados.add(id); for (const L of destinos(K)) { try { L.m.borra(id); } catch (_) {} } });
    m.on('escribe', () => { for (const L of destinos(K)) { try { L.m.escribe(); } catch (_) {} } });
    // los «leído» de lo que reenvié vuelven por donde llegó el mensaje
    m.on('leido', (ids) => devuelve(K, ids));
  }
  function devuelve(K, ids) {
    const por = new Map();
    for (const id of ids || []) { const c = llegoPor.get(id); if (c && c !== K.clave) { if (!por.has(c)) por.set(c, []); por.get(c).push(id); } }
    for (const [c, l] of por) { const q = c === 'p' ? principal : extras.get(c); if (q && q.m.conectada) { try { q.m.leidos(l); } catch (_) {} } }
  }

  // ---- añadir a alguien ----
  async function anade() {
    if (personas() >= MAX) { aviso(tr('grupoLleno')); return; }
    if (movil.matches) return anadeMovil();
    return anadePC();
  }
  // en el móvil, como siempre: el menú «Compartir» con el enlace (WhatsApp); la semilla va entera en el enlace
  async function anadeMovil() {
    const E = window.Elixire || {};
    const semilla = crypto.getRandomValues(new Uint8Array(32)), s64 = b64u(semilla);
    const texto = E.textoInvitacion ? E.textoInvitacion(s64) : location.origin + '/invitacion/#e=' + s64;
    const compartida = E.comparte ? E.comparte(texto) : Promise.resolve(false); // (el menú tiene que abrirse en el mismo toque)
    const p = nuevoPar({ semilla, invitado: true }); if (!p) return;
    const ok = await compartida;
    if (ok === false && !p.m.conectada) { quita(p); return; }
    aviso(tr('grupoInvitado'));
  }
  // en el ordenador: la tarjeta con el código (16 símbolos) y su enlace, para WhatsApp, el correo o copiarlo
  const tarjeta = $('#grupo-invita');
  let invitaPC = null;
  async function anadePC() {
    if (!tarjeta) return;
    if (invitaPC && extras.has(invitaPC.clave) && !invitaPC.m.conectada && invitaPC.codigo) { abreTarjeta(); pintaTarjeta('anadirEsperando'); return; }
    const p = nuevoPar({ invitado: true }); if (!p) return;
    invitaPC = p; p.codigo = null; abreTarjeta(); pintaTarjeta('creando');
    const r = await p.m.crea();
    if (!extras.has(p.clave)) return;
    if (!r || !r.ok) { pintaTarjeta('anadirError'); quita(p); return; }
    p.codigo = r.codigo; pintaTarjeta('anadirEsperando');
  }
  function abreTarjeta() { tarjeta.hidden = false; requestAnimationFrame(() => tarjeta.classList.add('visible')); }
  function cierraTarjeta() { if (!tarjeta || tarjeta.hidden) return; tarjeta.classList.remove('visible'); setTimeout(() => { if (!tarjeta.classList.contains('visible')) tarjeta.hidden = true; }, 220); }
  function pintaTarjeta(k) {
    if (!tarjeta) return;
    const p = invitaPC, c = p && p.codigo, lengua = window.ElixireIdioma ? window.ElixireIdioma.actual() : 'en';
    $('#gi-codigo').textContent = c ? c.replace(/(.{4})(?=.)/g, '$1 ') : '···· ···· ···· ····';
    const enlace = c ? location.origin + '/#c=' + c + '&l=' + lengua + '&ll=1' : '';
    const wa = $('#gi-wa'), co = $('#gi-correo');
    if (c) {
      wa.href = 'https://wa.me/?text=' + encodeURIComponent(tr('mensajeGrupo').replace('{enlace}', enlace).replace('{codigo}', c.replace(/(.{4})(?=.)/g, '$1 ')));
      co.href = 'mailto:?subject=' + encodeURIComponent(tr('correoAsunto')) + '&body=' + encodeURIComponent(tr('correoCuerpo').replace('{enlace}', enlace));
      wa.removeAttribute('aria-disabled'); co.removeAttribute('aria-disabled'); $('#gi-copiar').disabled = false; $('#gi-enlace').disabled = false;
    } else { for (const a of [wa, co]) { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); } $('#gi-copiar').disabled = true; $('#gi-enlace').disabled = true; }
    tarjeta.dataset.enlace = enlace;
    const e = $('#gi-estado'); e.dataset.t = k; e.textContent = tr(k);
    tarjeta.classList.toggle('lista', k === 'anadirEntra');
    tarjeta.classList.toggle('mal', k === 'anadirError' || k === 'anadirCaduca');
  }
  if (tarjeta) {
    $('#gi-cerrar').addEventListener('click', cierraTarjeta);
    const copiaTxt = async (txt, boton, k) => { if (!txt) return; try { await navigator.clipboard.writeText(txt); const s = boton.querySelector('span'), antes = s.dataset.t; s.dataset.t = k; s.textContent = tr(k); setTimeout(() => { s.dataset.t = antes; s.textContent = tr(antes); }, 1600); } catch (_) {} };
    $('#gi-copiar').addEventListener('click', (e) => copiaTxt(invitaPC && invitaPC.codigo, e.currentTarget, 'copiado'));
    $('#gi-enlace').addEventListener('click', (e) => copiaTxt(tarjeta.dataset.enlace, e.currentTarget, 'enlaceCopiado'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !tarjeta.hidden) cierraTarjeta(); });
    document.addEventListener('elixire-idioma', () => { if (!tarjeta.hidden) pintaTarjeta($('#gi-estado').dataset.t || 'anadirEsperando'); });
  }

  // ---- la pantalla: un recuadro por persona, también el tuyo (como Meet, FaceTime o WhatsApp). La persona del tramo principal (o
  // quien la sustituya si cuelga) va en #video-suyo; cada una de las demás, en su recuadro: las de mis tramos, con su imagen y su
  // voz; las que están detrás de otro tramo, con la imagen reenviada (su voz llega mezclada en la de su tramo). En el ordenador,
  // recuadros 16:9 con aire entre ellos; en el móvil, a sangre, la pantalla entera repartida. ----
  const MUDO = '<svg class="tn-mudo" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 10V6a3 3 0 0 0-5.6-1.5"/><path d="M5.5 11a6.5 6.5 0 0 0 10.4 5.2M18.5 11c0 .9-.2 1.8-.5 2.6M12 17.5V21"/><path d="M4 4l16 16"/></svg><span class="tn-t"></span>';
  const nuevoRotulo = () => { const r = document.createElement('span'); r.className = 'tesela-nombre'; r.innerHTML = MUDO; return r; };
  const teselas = new Map(); // id → { video, rotulo, pista }
  function teselaDe(id) {
    let t = teselas.get(id); if (t) return t;
    const v = document.createElement('video'); v.className = 'video-par'; v.autoplay = true; v.playsInline = true; v.setAttribute('playsinline', '');
    const r = nuevoRotulo(), ref = $('#raya-division'); esc.insertBefore(v, ref); esc.insertBefore(r, ref);
    v.addEventListener('resize', programa); v.addEventListener('loadedmetadata', programa);
    t = { video: v, rotulo: r, pista: null }; teselas.set(id, t); return t;
  }
  function quitaTesela(id) { const t = teselas.get(id); if (!t) return; try { t.video.srcObject = null; } catch (_) {} if (t.video._placa) t.video._placa.remove(); t.video.remove(); t.rotulo.remove(); teselas.delete(id); }
  const reproduce = (v) => { const x = v.play(); if (x && x.catch) x.catch(() => {}); };
  const rotulo = (id) => { let r = document.getElementById(id); if (!r) { r = nuevoRotulo(); r.id = id; esc.insertBefore(r, $('#raya-division')); } return r; };
  // sin cámara (o en el chat): en su recuadro, un círculo con la silueta y «Cámara apagada», como en Meet, Zoom o FaceTime
  function placa(el, r, si, k) {
    let pl = el._placa;
    if (!si) { if (pl) pl.hidden = true; return; }
    if (!pl) {
      pl = document.createElement('div'); pl.className = 'tesela-sin'; pl.setAttribute('aria-hidden', 'true');
      pl.innerHTML = '<span class="ts-circulo"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.6" r="3.9"/><path d="M4.4 20.2c.7-4 3.9-6.7 7.6-6.7s6.9 2.7 7.6 6.7"/></svg></span><span class="ts-texto"></span>';
      esc.insertBefore(pl, $('#raya-division')); el._placa = pl;
    }
    pl.hidden = false; pl.style.left = r.x + 'px'; pl.style.top = r.y + 'px'; pl.style.width = r.w + 'px'; pl.style.height = r.h + 'px';
    pl.style.setProperty('--ts', Math.round(Math.max(34, Math.min(96, Math.min(r.w, r.h) * 0.3))) + 'px');
    const t = pl.querySelector('.ts-texto'); if (t.dataset.t !== k) { t.dataset.t = k; t.textContent = tr(k); }
    pl.classList.toggle('pequena', r.h < 150);
  }
  let programaT = 0;
  function programa() { if (!programaT) programaT = requestAnimationFrame(() => { programaT = 0; pinta(); }); }
  let presentes = new Set(), enGrupoAhora = false, fuera = null;
  const saleT = new Map(); // quien acaba de salir: el aviso espera 3 s, por si vuelve en el acto
  // quien salió de la llamada en grupo (o se le cortó) y aún puede volver a entrar
  const reentra = () => !extras.size && M.conectada && !M.terminada && (enGrupoAhora || !!(fuera && Date.now() < fuera.hasta));
  function pinta() {
    if (!sala || !esc) return;
    const pEn = enLlamada(principal), ts = tramos();
    if (!ts.length) t0Grupo = 0;
    // quién va en la imagen principal: la persona del tramo principal; si ha colgado, la primera de las demás que siga
    if (pEn) promovido = null;
    else if (!promovido || !extras.has(promovido.clave) || !enLlamada(promovido)) promovido = enCurso().find((p) => p.m.estadoLlamada().remoto) || null;
    const vs = $('#video-suyo');
    if (promovido) { const r = promovido.m.estadoLlamada().remoto; if (r && vs.srcObject !== r) { vs.srcObject = r; reproduce(vs); } }
    const lista = [], usados = new Set();
    for (const K of ts) {
      for (const P of genteDe(K)) {
        if (P.id === yo || usados.has(P.id)) continue; usados.add(P.id);
        const etq = esId(P.id) ? etiquetaId(P.id) : etiqueta(K);
        if (P.mid === 'p' && (K === principal || K === promovido)) { lista.push({ el: vs, id: P.id, f: P.f, etq, r: rotulo('par-principal'), K }); continue; }
        const t = teselaDe(P.id);
        if (P.mid === 'p') {
          // una persona de mi tramo: su imagen y su voz (la de todos los que están detrás de ella)
          const r = K.m.estadoLlamada().remoto; t.pista = null;
          if (t.video.srcObject !== (r || null)) { t.video.srcObject = r || null; if (r) reproduce(t.video); }
          t.video.muted = false;
        } else {
          // alguien detrás de un tramo: su imagen reenviada, sin sonido (su voz llega mezclada en la de su tramo)
          const pista = pistaDe(K, P);
          if (t.pista !== pista || (!pista && t.video.srcObject)) { t.pista = pista; t.video.srcObject = pista ? new MediaStream([pista]) : null; if (pista) reproduce(t.video); }
          t.video.muted = true;
        }
        lista.push({ el: t.video, id: P.id, f: P.f, etq, r: t.rotulo, K, sinImagen: P.mid !== 'p' && !t.pista });
      }
    }
    // la persona invitada que ya está entrando: su recuadro, con «Conectando…»
    for (const p of pares()) {
      if (!p.invitado || !p.m.conectada || p.m.terminada || enLlamada(p) || !ts.length) continue;
      const id = 'c:' + p.clave; usados.add(id); const t = teselaDe(id); if (t.video.srcObject) t.video.srcObject = null;
      lista.push({ el: t.video, id, f: null, etq: etiqueta(p), r: t.rotulo, conectando: true });
    }
    for (const id of [...teselas.keys()]) if (!usados.has(id)) quitaTesela(id);
    // los avisos: quién entra y quién sale (también quien está detrás de otro tramo)
    const ahora = new Set([...usados].filter(esId));
    if (presentes.size) {
      for (const id of ahora) if (!presentes.has(id)) { if (saleT.has(id)) { clearTimeout(saleT.get(id)); saleT.delete(id); } else aviso(tr('grupoEntra').replace('{p}', etiquetaId(id))); }
      if (ahora.size) for (const id of presentes) if (!ahora.has(id) && !saleT.has(id)) saleT.set(id, setTimeout(() => { saleT.delete(id); if (!presentes.has(id) && presentes.size) aviso(tr('grupoSale').replace('{p}', etiquetaId(id))); }, 3000));
    }
    presentes = ahora;
    const n = lista.length, grupo = n >= 2 || (n >= 1 && lista.some((x) => x.conectando));
    const antes = sala.classList.contains('en-grupo'); enGrupoAhora = grupo;
    sala.classList.toggle('en-grupo', grupo); if (grupo) sala.dataset.grupo = String(n + 1); else delete sala.dataset.grupo;
    if (grupo) lista.push({ el: $('#video-mio'), yo: true, f: misFiltros(), etq: tr('tu'), r: rotulo('par-yo') });
    coloca(grupo ? lista : []);
    { const t = $('#video-tiempo'); if (t) { if (grupo) t.dataset.gente = tr('personasN').replace('{n}', String(lista.filter((x) => !x.conectando).length)); else delete t.dataset.gente; } }
    if (grupo !== antes) { const S = SALA(); if (S.grupoCambia) S.grupoCambia(grupo); }
    // «Añadir»: con la llamada en marcha y sitio para alguien más
    const b = $('#b-anadir'); if (b) b.hidden = !(PRUEBA && ts.length && personas() < MAX);
    // menos caudal por tramo cuantas más personas (3: 720p a 1,5 Mb/s; 4: 540p a 0,9 Mb/s y 24 imágenes por segundo)
    const total = personas(), tope = total >= 4 ? { bps: 900000, escala: 2, fps: 24 } : total === 3 ? { bps: 1500000, escala: 1.5, fps: 30 } : null;
    for (const q of [principal, ...pares()]) { try { q.m.limita(tope); } catch (_) {} }
    habla(grupo);
    const S = SALA(); if (S.repinta && grupo !== antes) S.repinta();
    sincroniza();
  }
  // los recuadros, en su sitio (posición y tamaño en variables: el CSS los coloca encima de todo lo demás)
  const PROPS = ['left', 'top', 'width', 'height', 'right', 'bottom', 'object-fit', 'transform'];
  function coloca(lista) {
    for (const el of esc.querySelectorAll('.en-tesela')) if (!lista.some((x) => x.el === el)) { el.classList.remove('en-tesela', 'habla'); for (const k of PROPS) el.style.removeProperty(k); }
    for (const r of esc.querySelectorAll('.tesela-nombre')) if (!lista.some((x) => x.r === r)) r.hidden = true;
    for (const pl of esc.querySelectorAll('.tesela-sin')) if (!lista.some((x) => x.el._placa === pl) || sala.classList.contains('en-chat')) pl.hidden = true;
    if (!lista.length || sala.classList.contains('en-chat')) { if (lista.length) for (const x of lista) { x.el.classList.remove('en-tesela', 'habla'); for (const k of PROPS) x.el.style.removeProperty(k); } return; }
    const W = esc.clientWidth, H = esc.clientHeight; if (!W || !H) return;
    const m = movil.matches, mini = sala.classList.contains('mini');
    // si alguien comparte su pantalla, su recuadro pasa a ser el grande (como en Meet): las demás personas, al lado (o debajo, en
    // el móvil)
    const foco = mini ? -1 : lista.findIndex((x) => !x.yo && x.f && x.f.pantalla && !x.f.chat);
    const rs = foco >= 0 ? rejillaFoco(lista.length, W, H, foco, m) : m ? rejillaMovil(lista.length, W, H) : rejillaPC(lista.length, W, H, mini);
    lista.forEach((x, i) => {
      const r = rs[i], el = x.el; if (!r) return;
      el.classList.add('en-tesela'); el.dataset.quien = x.id || '';
      const pon = (k, v) => el.style.setProperty(k, v, 'important');
      pon('left', r.x + 'px'); pon('top', r.y + 'px'); pon('width', r.w + 'px'); pon('height', r.h + 'px'); pon('right', 'auto'); pon('bottom', 'auto');
      if (x.yo) { if (el.classList.contains('trasera')) el.style.removeProperty('transform'); else pon('transform', 'scaleX(-1)'); }
      // la imagen entera si es una pantalla compartida o si su forma no se parece a la del recuadro (un móvil en vertical en el
      // ordenador); si se parece, llena el recuadro
      const f = x.f || {};
      const vw = el.videoWidth, vh = el.videoHeight, ar = vw && vh ? vw / vh : 16 / 9;
      const entera = (!x.yo && !!f.pantalla) || (!m && Math.abs(Math.log(ar / (r.w / r.h))) > 0.45);
      pon('object-fit', entera ? 'contain' : 'cover');
      { const sinCam = x.conectando || x.sinImagen || f.cam === false || !!f.chat; placa(el, r, sinCam, x.conectando || (x.sinImagen && f.cam !== false && !f.chat) ? 'grupoConectando' : f.chat ? 'etChatLargo' : 'camaraApagada'); if (el._placa) el._placa.classList.toggle('conecta', !!(x.conectando || (x.sinImagen && f.cam !== false && !f.chat))); }
      if (x.r) {
        // el nombre y, si hace falta, lo que tiene puesto (voz cambiada, cara oculta, pantalla, en el chat): se ve en su recuadro
        const mas = [f.pantalla ? tr('etPantalla') : '', f.voz ? tr('etVoz') : '', f.cara && !f.pantalla ? tr('etCara') : '', f.chat ? tr('etChat') : ''].filter(Boolean);
        x.r.querySelector('.tn-t').textContent = x.etq + (mas.length ? ' · ' + mas.join(' · ') : ''); x.r.hidden = mini;
        x.r.classList.toggle('mudo', f.mic === false);
        const arriba = m && r.y > 4; // en el móvil, las de abajo llevan el nombre arriba (abajo están los botones)
        x.r.style.left = r.x + 10 + 'px'; x.r.style.top = (arriba ? r.y + 10 : r.y + r.h - 36) + 'px'; x.r.style.maxWidth = Math.max(60, r.w - 20) + 'px';
      }
    });
  }
  function rejillaPC(n, W, H, mini) {
    const arriba = mini ? 6 : 84, abajo = mini ? 6 : 124, lado = mini ? 6 : 24, hueco = mini ? 4 : 10;
    const aw = Math.max(60, W - 2 * lado), ah = Math.max(60, H - arriba - abajo);
    let mejor = null;
    for (let cols = 1; cols <= n; cols++) {
      const filas = Math.ceil(n / cols), w = Math.min((aw - hueco * (cols - 1)) / cols, ((ah - hueco * (filas - 1)) / filas) * 16 / 9);
      if (!mejor || w > mejor.w + 0.5) mejor = { cols, filas, w, h: (w * 9) / 16 };
    }
    const { cols, filas, w, h } = mejor, alto = filas * h + (filas - 1) * hueco, y0 = arriba + (ah - alto) / 2, out = [];
    for (let i = 0; i < n; i++) {
      const f = Math.floor(i / cols), enFila = f === filas - 1 ? n - cols * (filas - 1) : cols, c = i - f * cols;
      const ancho = enFila * w + (enFila - 1) * hueco, x0 = lado + (aw - ancho) / 2;
      out.push({ x: Math.round(x0 + c * (w + hueco)), y: Math.round(y0 + f * (h + hueco)), w: Math.round(w), h: Math.round(h) });
    }
    return out;
  }
  // con una pantalla compartida: la pantalla, grande; las demás, en una columna a la derecha (en el móvil, en una fila abajo)
  function rejillaFoco(n, W, H, foco, m) {
    const out = new Array(n), resto = [...Array(n).keys()].filter((i) => i !== foco), k = resto.length;
    if (m) {
      const g = 2, hf = Math.round(H * 0.62), w = Math.round((W - g * (k - 1)) / k);
      out[foco] = { x: 0, y: 0, w: W, h: hf };
      resto.forEach((i, j) => { out[i] = { x: j * (w + g), y: hf + g, w: j === k - 1 ? W - j * (w + g) : w, h: H - hf - g }; });
      return out;
    }
    const arriba = 84, abajo = 124, lado = 24, hueco = 10, aw = Math.max(60, W - 2 * lado), ah = Math.max(60, H - arriba - abajo);
    const cw = Math.round(Math.min(aw * 0.24, 360)), fw = aw - cw - hueco;
    out[foco] = { x: lado, y: arriba, w: Math.round(fw), h: Math.round(ah) };
    const th = Math.min((ah - hueco * (k - 1)) / k, (cw * 9) / 16), alto = k * th + (k - 1) * hueco, y0 = arriba + (ah - alto) / 2;
    resto.forEach((i, j) => { out[i] = { x: Math.round(lado + fw + hueco), y: Math.round(y0 + j * (th + hueco)), w: cw, h: Math.round(th) }; });
    return out;
  }
  function rejillaMovil(n, W, H) {
    const g = 2, h2 = Math.round((H - g) / 2), w2 = Math.round((W - g) / 2), r = (x, y, w, h) => ({ x, y, w, h });
    if (n <= 2) return [r(0, 0, W, h2), r(0, h2 + g, W, H - h2 - g)];
    if (n === 3) return [r(0, 0, W, h2), r(0, h2 + g, w2, H - h2 - g), r(w2 + g, h2 + g, W - w2 - g, H - h2 - g)];
    return [r(0, 0, w2, h2), r(w2 + g, 0, W - w2 - g, h2), r(0, h2 + g, w2, H - h2 - g), r(w2 + g, h2 + g, W - w2 - g, H - h2 - g)];
  }
  if (window.ResizeObserver && esc) new ResizeObserver(programa).observe(esc);
  addEventListener('resize', programa, { passive: true });
  movil.addEventListener('change', programa);
  { const vs = $('#video-suyo'); if (vs) { vs.addEventListener('resize', programa); vs.addEventListener('loadedmetadata', programa); } }

  // ---- quién habla: su recuadro se enciende (como en Meet o FaceTime). Por cada tramo se sabe el nivel de su voz; si detrás hay
  // varias personas, quién de ellas habla lo dice la otra persona («habla»). Y cada equipo dice, por cada tramo, quién habla de su
  // lado (él mismo o alguien de otro tramo). ----
  let hablaT = null, ultimoId = null, ultimoT = 0, nv = null;
  function paraNivel() { if (nv) { try { nv.src.disconnect(); } catch (_) {} nv = null; } }
  function nivelMio() {
    if (propio.mic === false) return 0;
    const st = M.propias || (enCurso()[0] && enCurso()[0].m.propias), t = st && st.getAudioTracks()[0];
    if (!t || t.readyState !== 'live' || !t.enabled) return 0;
    try {
      if (!nv) { const ctx = window.ElixireAudio && window.ElixireAudio(); if (!ctx) return 0; nv = { ctx, pista: null }; }
      if (nv.ctx.state === 'suspended') nv.ctx.resume().catch(() => {});
      if (nv.pista !== t) { if (nv.src) { try { nv.src.disconnect(); } catch (_) {} } nv.src = nv.ctx.createMediaStreamSource(new MediaStream([t])); nv.an = nv.ctx.createAnalyser(); nv.an.fftSize = 512; nv.src.connect(nv.an); nv.buf = new Float32Array(nv.an.fftSize); nv.pista = t; }
      nv.an.getFloatTimeDomainData(nv.buf); let s = 0; for (const v of nv.buf) s += v * v; return Math.sqrt(s / nv.buf.length) * 3;
    } catch (_) { return 0; }
  }
  const UMBRAL = 0.04;
  function habla(si) {
    if (!si) { clearInterval(hablaT); hablaT = null; ultimoId = null; paraNivel(); for (const v of esc.querySelectorAll('.habla')) v.classList.remove('habla'); return; }
    if (hablaT) return;
    hablaT = setInterval(() => {
      if (!sala.classList.contains('en-grupo') || document.hidden) return;
      const ts = tramos(), niveles = new Map();
      for (const K of ts) { const g = genteDe(K), x = K.m.nivelVoz(); niveles.set(K, { x: x || 0, id: g.length === 1 ? g[0].id : K.hablaId || null }); }
      // quién habla de los que veo
      let mejor = null, max = UMBRAL; for (const v of niveles.values()) if (v.id && v.x > max) { max = v.x; mejor = v.id; }
      const t = performance.now();
      if (mejor) { ultimoId = mejor; ultimoT = t; } else if (t - ultimoT < 900) mejor = ultimoId;
      for (const el of esc.querySelectorAll('.en-tesela')) el.classList.toggle('habla', !!mejor && el.dataset.quien === mejor);
      // y, por cada tramo, quién habla de mi lado
      if (ts.length < 2) return;
      const mio = nivelMio();
      for (const L of ts) {
        if (!L.arbol) continue;
        let id = mio > UMBRAL ? yo : '', m2 = mio > UMBRAL ? mio : UMBRAL;
        for (const [K, v] of niveles) if (K !== L && v.id && v.x > m2) { m2 = v.x; id = v.id; }
        if (!id && L.hablaEnviado && t - (L.hablaHace || 0) < 900) continue;
        if (id) L.hablaHace = t;
        if (id !== (L.hablaEnviado || '')) { L.hablaEnviado = id; L.m.grupo({ que: 'habla', habla: id }); }
      }
    }, 300);
  }

  // ---- lo que ve la pantalla de la llamada: el estado de la principal y, si ha colgado, el de quien la sustituye. El candado de
  // arriba dice «poscuántico» solo si lo son todas las llamadas del grupo; el tiempo cuenta desde que empezaste a hablar. ----
  function efectivo(e) {
    const cur = enCurso(); if (!cur.length) return e;
    const todas = [...(enLlamada(principal) ? [M.estadoLlamada()] : []), ...cur.map((p) => p.m.estadoLlamada())];
    const capa = todas.every((x) => x.capa), sinCapa = todas.some((x) => x.sinCapa);
    const t0s = todas.map((x) => x.t0).filter(Boolean); if (t0s.length) t0Grupo = t0Grupo ? Math.min(t0Grupo, ...t0s) : Math.min(...t0s);
    if (e && (e.estado === 'hablando' || e.estado === 'reconectando')) return Object.assign({}, e, { capa, sinCapa, t0: t0Grupo || e.t0, grupo: true });
    const p = promovido && enLlamada(promovido) ? promovido : cur[0], x = p.m.estadoLlamada();
    return Object.assign({}, x, { capa, sinCapa, t0: t0Grupo || x.t0, grupo: true });
  }

  // ---- lo propio, a todos los tramos ----
  async function todas(f) { let ok = false; for (const m of motores()) { try { if (await f(m)) ok = true; } catch (e) { console.warn('grupo', e); } } sincroniza(); return ok; }
  async function pantalla(si) {
    if (si) {
      if (pantallaG) return true;
      let st = null; try { st = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15, max: 30 } }, audio: false }); } catch (_) { return false; }
      const pista = st && st.getVideoTracks()[0]; if (!pista) return false;
      try { pista.contentHint = 'detail'; } catch (_) {}
      pantallaG = pista; pista.addEventListener('ended', () => { if (pantallaG === pista) pantalla(false); });
      const ok = await todas((m) => { const c = pista.clone(); try { c.contentHint = 'detail'; } catch (_) {} return m.pantalla(true, c); });
      if (!ok) { pantallaG = null; pista.stop(); }
      return ok;
    }
    const p = pantallaG; pantallaG = null;
    await todas((m) => m.pantalla(false));
    if (p) { try { p.stop(); } catch (_) {} }
    return true;
  }
  // girar la cámara (móvil): la abre la llamada principal (o la que la sustituya) y las demás reciben copias nuevas. En el iPhone
  // solo puede haber una cámara abierta: antes se sueltan las copias de la cámara de antes.
  async function giraCamara() {
    const fuente = enLlamada(principal) ? M : (enCurso()[0] || {}).m; if (!fuente) return false;
    const otros = motores().filter((m) => m !== fuente);
    for (const m of otros) { const st = m.propias; if (st) for (const t of st.getVideoTracks()) { try { t.stop(); } catch (_) {} } }
    const ok = await fuente.giraCamara();
    const st0 = fuente.propias;
    if (st0) for (const m of otros) await m.ponPistas(copia(st0));
    sincroniza();
    return ok;
  }
  // colgar: el grupo se acaba para mí (cada tramo y cada sesión del grupo); la conversación principal la cuelga la pantalla
  let saliendo = false;
  function sal() {
    saliendo = true; setTimeout(() => { saliendo = false; }, 0);
    if (pantallaG) { try { pantallaG.stop(); } catch (_) {} pantallaG = null; }
    for (const p of pares()) { try { if (p.m.estadoLlamada().estado !== 'libre') p.m.colgar(); } catch (_) {} try { p.m.termina('mio'); } catch (_) {} }
    for (const p of pares()) { extras.delete(p.clave); clearTimeout(p.caduca); }
    invitaPC = null; cierraTarjeta(); promovido = null; t0Grupo = 0;
    pinta();
  }

  window.ElixireGrupo = {
    anade, pinta, efectivo, etiquetaId,
    get activo() { return extras.size > 0; },
    get enGrupo() { return enGrupoAhora; },
    get reentra() { return reentra(); },
    get vuelveSola() { return reentra() && (!fuera || fuera.intentos < 3); },
    get volviendo() { return !!(fuera && fuera.volviendo && reentra()); },
    quedan: () => enCurso().length > 0,
    nombrePrincipal: () => etiqueta(principal),
    // el chat: el mismo mensaje (con el mismo identificador) a cada tramo; devuelve a cuántos ha salido
    envia(texto, id) { let n = 0; for (const p of pares().filter((x) => x.m.conectada && !x.m.terminada)) if (p.m.envia(texto, id)) n++; return n; },
    enviaArchivo(f, id, vista) { let n = 0; for (const p of pares().filter((x) => x.m.conectada && !x.m.terminada)) { const r = p.m.enviaArchivo(f, id, undefined, vista); if (r && r.ok) n++; } return n; },
    borra(id) { borrados.add(id); for (const p of pares().filter((x) => x.m.conectada)) p.m.borra(id); },
    escribe() { for (const p of pares().filter((x) => x.m.conectada)) p.m.escribe(); },
    // «leído»: a quien lo mandó; si llegó reenviado («g:»), por el tramo por el que llegó
    leidos(clave, ids) {
      if (typeof clave === 'string' && clave.startsWith('g:')) { devuelve({ clave: '' }, ids); return; }
      const p = extras.get(clave); if (p && p.m.conectada) p.m.leidos(ids);
    },
    cancelaArchivo(id) { for (const p of pares().filter((x) => x.m.conectada)) { try { p.m.cancelaArchivo(id); } catch (_) {} } },
    // lo propio
    micro(si) { propio.mic = !!si; for (const m of motores()) m.micro(si); sincroniza(); },
    camara(si) { propio.cam = !!si; for (const m of motores()) m.camara(si); sincroniza(); },
    async cambiaVoz(si) { const ok = await todas((m) => m.cambiaVoz(si)); if (ok) propio.voz = !!si; sincroniza(); return ok; },
    async caraOculta(si) { const ok = await todas((m) => m.caraOculta(si)); if (ok) propio.cara = !!si; sincroniza(); return ok; },
    pantalla, giraCamara, sal,
    modoChat(si) { propio.chat = !!si; for (const m of motores()) m.modoChat(si); sincroniza(); },
    colgar() { sal(); },
    // las invitaciones de «Añadir» que nadie ha abierto todavía
    cancelaInvitaciones() { for (const p of pares()) if (p.invitado && !p.m.conectada) quita(p); cierraTarjeta(); },
  };
  if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) window.ElixireGrupo._estado = () => ({ yo, principal: principal.id, enLlamada: enLlamada(principal), arbol: principal.arbol, gente: tramos().map((K) => genteDe(K).map((P) => P.id + '@' + P.mid + (pistaDe(K, P) ? '+' : '-'))), promovido: promovido && promovido.n, extras: pares().map((p) => ({ n: p.n, id: p.id, arbol: p.arbol, conectada: p.m.conectada, estado: p.m.estadoLlamada().estado, capa: p.m.estadoLlamada().capa, salen: p.m.salen })), principalSalen: M.salen, llegan: [...M.llegan.keys()] });

  M.on('conectado', () => { M.grupo({ que: 'hola', id: yo, v: VERSION, arbol: 1 }); });
  M.on('grupo', (g) => recibe(principal, g));
  M.on('llamada', (e) => {
    // lo propio que tenía puesto la llamada principal pasa a ser lo del grupo (al formarse el grupo, los demás tramos lo copian)
    if (e && e.estado === 'hablando' && !extras.size) { propio.mic = e.mic !== false; propio.cam = e.cam !== false; propio.voz = !!e.vozCambiada; propio.cara = !!e.caraOculta; }
    if (e && (e.estado === 'hablando' || e.estado === 'reconectando') && e.t0 && e.t0 !== principal.t0) { principal.t0 = e.t0; principal.enviado = ''; principal.mezclada = false; principal.propioPuesto = false; }
    if (e && e.estado === 'hablando') { fuera = null; if (extras.size && !principal.propioPuesto) { principal.propioPuesto = true; ponPropio(M); } }
    if (e && e.estado === 'fin') {
      principal.gente = null; principal.enviado = ''; principal.mezclada = false; principal.propioPuesto = false;
      // (dueño, 23 nov 14:31) salí de la llamada en grupo (o se me cortó): puedo volver a entrar con un toque, sin tono; si se cortó
      // sin que nadie colgara, vuelvo sola
      if (enGrupoAhora && !extras.size) fuera = { hasta: Date.now() + FUERA_MS, intentos: 0 };
      if (fuera && ['caida', 'fallo', 'sin-respuesta'].includes(e.motivo) && fuera.intentos < 3) {
        fuera.intentos++; fuera.volviendo = true; const f0 = fuera;
        setTimeout(() => { f0.volviendo = false; const x = M.estadoLlamada().estado; if (reentra() && (x === 'libre' || x === 'fin')) M.llamar(); else { const S = SALA(); if (S.repinta) S.repinta(); } }, 1500);
      } else if (fuera) setTimeout(() => { const S = SALA(); if (S.repinta) S.repinta(); }, 0);
    }
    pinta();
  });
  M.on('filtro', () => pinta());
  M.on('llegan', programa); M.on('reneg', programa);
  M.on('fin', () => { principal.id = null; principal.gente = null; principal.enviado = ''; principal.arbol = false; fuera = null; pinta(); });
  chatDe(principal);
  { const b = $('#b-anadir'); if (b) b.addEventListener('click', anade); }
  addEventListener('pagehide', () => { for (const p of pares()) { try { p.m.termina('cierra'); } catch (_) {} } });
  document.addEventListener('elixire-idioma', programa);
})();
