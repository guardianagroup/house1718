// Elixire · la llamada en grupo, hasta 4 personas (23 nov 2026).
// Dueño, 23 nov 11:50: «tienes que añadir lo de añadir participante, que cualquiera de los dos pueda añadir un participante en
// Elixir»; 11:55: «la otra persona puede estar en un PC o puede estar en un móvil o una tablet, lo que ella quiera». Decidido con
// él: hasta 4 y «cada uno con cada uno» (malla completa). Cada pareja tiene su propia sesión poscuántica y su propia llamada; nadie
// reenvía la imagen ni la voz de otro, y si alguien cuelga, los demás siguen.
// Cómo entra alguien: quien toca «Añadir» crea una invitación nueva (en el ordenador, un código como el de siempre, con su enlace;
// en el móvil, el enlace por WhatsApp). La persona invitada entra con quien la invitó y, en cuanto están conectadas, quien invitó la
// presenta a cada una de las demás con una semilla nueva por pareja (256 bits), que viaja dentro de las sesiones encriptadas: el
// relé nunca la ve. Esas parejas se conectan y se llaman solas. Todos ven un aviso cuando entra o sale alguien.
// Lo propio (micro, cámara, cambiar la voz, ocultar la cara, compartir pantalla) va igual a todas las llamadas del grupo: cada una
// usa copias de la misma cámara y el mismo micrófono, y cada una aplica sus filtros antes de encriptar.
'use strict';
(() => {
  const M = window.ElixireMotor, Nuevo = window.ElixireMotorNuevo;
  if (!M || !Nuevo || !window.crypto || !crypto.getRandomValues) return;
  const $ = (s) => document.querySelector(s);
  const tr = (k) => (window.ElixireIdioma ? window.ElixireIdioma.t(k) : k);
  const SALA = () => window.ElixireSala || {};
  const MAX = 4, CADUCA_MS = 10 * 60 * 1000, ESPERA_PAR_MS = 90 * 1000;
  const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const b64u = (u) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const deB64u = (s) => { let b = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; return Uint8Array.from(atob(b), (c) => c.charCodeAt(0)); };
  const movil = matchMedia('(max-width: 760px)');
  // (dueño, 23 nov 13:24: «sí, para todos»): «Añadir» sale a cualquiera en la videollamada, sin enlace especial
  const PRUEBA = true;
  const sala = $('#sala'), esc = $('#escena-video');
  const yo = hex(6);
  const principal = { m: M, id: null, n: 1, principal: true, clave: 'p' };
  const extras = new Map(); // clave → { m, id, rol, llama, n, video, rotulo, invitado, presentado, caduca, visto }
  let numero = 1, promovido = null, t0Grupo = 0, principalEnLlamada = false, principalVisto = false, pantallaG = null;
  const propio = { mic: true, cam: true, voz: false, cara: false, chat: false }; // lo que tengo puesto en el grupo

  const enLlamada = (p) => { const e = p.m.estadoLlamada(); return e.estado === 'hablando' || e.estado === 'reconectando'; };
  const pares = () => [...extras.values()];
  const enCurso = () => pares().filter(enLlamada);
  // las llamadas en marcha (la principal, si sigue, y las demás)
  const motores = () => [...(enLlamada(principal) ? [M] : []), ...enCurso().map((p) => p.m)];
  // cuántas personas: yo, la principal si está en la llamada, y cada otra (también las invitaciones aún sin abrir)
  const personas = () => 1 + (enLlamada(principal) ? 1 : 0) + pares().filter((p) => !p.m.terminada).length;
  const etiqueta = (p) => tr('persona') + ' ' + p.n;
  const aviso = (t) => { const S = SALA(); if (S.aviso) S.aviso(t); };

  // ---- la cámara y el micrófono de cada llamada del grupo: copias de los que ya están abiertos (no se abre otra vez la cámara;
  // en el iPhone solo puede haber una abierta). Se espera a que la llamada principal tenga los suyos, como mucho 15 s. ----
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

  // ---- cada otra persona: su propio motor (su sesión y su llamada) ----
  function nuevoPar(o) {
    const m = Nuevo({ medios: copias }); if (!m) return null;
    const p = { m, id: o.id || null, rol: o.rol, llama: !!o.llama, n: ++numero, invitado: !!o.invitado, presentado: false, clave: hex(4), visto: false, reintentos: 0 };
    extras.set(p.clave, p);
    // quien tiene que llamar lo intenta hasta que la llamada arranca (la sesión puede tardar un instante en estar en línea)
    const llamaYa = (k) => { if (!extras.has(p.clave) || m.terminada || m.estadoLlamada().estado !== 'libre') return; if (!m.puedeLlamar()) { m.llamar(); return; } if (k < 40) setTimeout(() => llamaYa(k + 1), 500); };
    m.on('conectado', () => {
      clearTimeout(p.caduca); m.grupo({ que: 'hola', id: yo });
      if (p.llama) setTimeout(() => llamaYa(0), 250);
      if (invitaPC === p) pintaTarjeta('anadirEntra');
      pinta();
    });
    m.on('llamada', (e) => {
      if (e.estado === 'entrante') m.contestar();
      if (e.estado === 'hablando') {
        clearTimeout(p.esperaT);
        if (!p.visto) { p.visto = true; ponPropio(m); aviso(tr('grupoEntra').replace('{p}', etiqueta(p))); if (invitaPC === p) cierraTarjeta(); }
        if (p.invitado && !p.presentado && p.id) presenta(p); // (ya en la llamada: ahora, a las demás)
      }
      if (e.estado === 'fin') {
        // la llamada con esta persona se ha cortado sin colgar nadie: quien llama vuelve a llamar (dos veces como mucho) y la otra
        // la espera; si colgó, se va del grupo
        const cortada = ['fallo', 'caida', 'sin-respuesta'].includes(e.motivo) && !m.terminada && m.conectada && p.reintentos < 2;
        if (cortada) {
          p.reintentos++;
          if (p.llama) setTimeout(() => llamaYa(0), 800);
          else { clearTimeout(p.esperaT); p.esperaT = setTimeout(() => { if (extras.has(p.clave) && !enLlamada(p)) quita(p); }, 25000); }
        } else setTimeout(() => quita(p), 0);
      }
      pinta();
      // la cabecera (el candado, la calidad, el tiempo) cuenta con todas las llamadas del grupo
      const S = SALA(); if (S.repinta && extras.has(p.clave)) S.repinta();
    });
    m.on('grupo', (g) => recibe(p, g));
    m.on('fin', () => quita(p));
    m.on('filtro', () => pinta());
    if (SALA().engancha) SALA().engancha(m, () => etiqueta(p), p.clave);
    if (o.semilla) {
      const r = o.rol === 'crea' ? m.invitaSemilla(o.semilla) : m.entraSemilla(o.semilla);
      Promise.resolve(r).then((x) => { if (!x || !x.ok) quita(p); }).catch(() => quita(p));
    }
    // una invitación sin abrir caduca a los 10 minutos; una pareja presentada que no conecta, a los 90 s
    p.caduca = setTimeout(() => { if (!m.conectada) { if (invitaPC === p) pintaTarjeta('anadirCaduca'); quita(p); } }, p.invitado ? CADUCA_MS : ESPERA_PAR_MS);
    pinta(); return p;
  }
  function quita(p) {
    if (!extras.has(p.clave)) return;
    extras.delete(p.clave); clearTimeout(p.caduca); clearTimeout(p.esperaT);
    if (promovido === p) promovido = null;
    if (invitaPC === p) { invitaPC = null; }
    quitaTesela(p);
    if (p.visto) aviso(tr('grupoSale').replace('{p}', etiqueta(p)));
    try { if (p.m.estadoLlamada().estado !== 'libre') p.m.colgar(); } catch (_) {}
    try { if (!p.m.terminada) p.m.termina('mio'); } catch (_) {}
    pinta();
    if (!enCurso().length && !enLlamada(principal)) acaba();
  }
  // el grupo se ha quedado sin nadie en la llamada
  function acaba() {
    t0Grupo = 0; promovido = null;
    if (pantallaG) { try { pantallaG.stop(); } catch (_) {} pantallaG = null; }
    const S = SALA(); if (S.finGrupo) S.finGrupo();
  }
  // quien invitó presenta a la persona nueva a cada una de las demás: una semilla nueva por pareja, dentro de las sesiones
  function presenta(nuevo) {
    if (!nuevo || !nuevo.id) return;
    nuevo.presentado = true;
    for (const q of [principal, ...pares()]) {
      if (q === nuevo || !q.id || q.id === nuevo.id || !enLlamada(q)) continue;
      const semilla = b64u(crypto.getRandomValues(new Uint8Array(32)));
      q.m.grupo({ que: 'conecta', semilla, con: nuevo.id, rol: 'crea' });
      nuevo.m.grupo({ que: 'conecta', semilla, con: q.id, rol: 'entra' });
    }
  }
  function recibe(p, g) {
    if (!g || !g.que) return;
    if (g.que === 'hola') {
      if (g.id && g.id !== yo) p.id = g.id;
      if (p.invitado && !p.presentado && p.id && enLlamada(p)) presenta(p);
      pinta(); return;
    }
    if (g.que === 'conecta') {
      // solo de alguien con quien hay una llamada en marcha o empezando (su sesión está verificada), para conectar con quien aún
      // no está, sin pasar de 4
      const est = p.m.estadoLlamada().estado;
      if (!g.semilla || !g.con || g.con === yo || !['hablando', 'reconectando', 'preparando', 'llamando', 'conectando', 'entrante'].includes(est)) return;
      if ([principal, ...pares()].some((q) => q.id === g.con && (q.principal ? enLlamada(q) : !q.m.terminada))) return;
      if (personas() >= MAX) return;
      nuevoPar({ semilla: deB64u(g.semilla), rol: g.rol === 'crea' ? 'crea' : 'entra', llama: g.rol === 'crea', id: g.con });
    }
  }
  // lo que tengo puesto (micro, cámara, voz, cara, pantalla, chat), también en cada llamada nueva del grupo
  async function ponPropio(m) {
    try {
      m.micro(propio.mic); m.camara(propio.cam);
      if (propio.voz) await m.cambiaVoz(true);
      if (propio.cara) await m.caraOculta(true);
      if (!pantallaG && M.pistaPantalla && M.pistaPantalla.readyState === 'live') { pantallaG = M.pistaPantalla; pantallaG.addEventListener('ended', () => { if (pantallaG) pantalla(false); }); }
      if (pantallaG && pantallaG.readyState === 'live') { const c = pantallaG.clone(); try { c.contentHint = 'detail'; } catch (_) {} await m.pantalla(true, c); }
      if (propio.chat) m.modoChat(true);
    } catch (e) { console.warn('grupo', e); }
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
    const p = nuevoPar({ semilla, rol: 'crea', invitado: true }); if (!p) return;
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
    const p = nuevoPar({ rol: 'crea', invitado: true }); if (!p) return;
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
    const copia = async (txt, boton, k) => { if (!txt) return; try { await navigator.clipboard.writeText(txt); const s = boton.querySelector('span'), antes = s.dataset.t; s.dataset.t = k; s.textContent = tr(k); setTimeout(() => { s.dataset.t = antes; s.textContent = tr(antes); }, 1600); } catch (_) {} };
    $('#gi-copiar').addEventListener('click', (e) => copia(invitaPC && invitaPC.codigo, e.currentTarget, 'copiado'));
    $('#gi-enlace').addEventListener('click', (e) => copia(tarjeta.dataset.enlace, e.currentTarget, 'enlaceCopiado'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !tarjeta.hidden) cierraTarjeta(); });
    document.addEventListener('elixire-idioma', () => { if (!tarjeta.hidden) pintaTarjeta($('#gi-estado').dataset.t || 'anadirEsperando'); });
  }

  // ---- la pantalla: un recuadro por persona, también el tuyo (como Meet, FaceTime o WhatsApp). La persona de la conversación (o
  // quien la sustituya si cuelga) va en #video-suyo; cada una de las demás, en su recuadro. En el ordenador, recuadros 16:9 con aire
  // entre ellos; en el móvil, a sangre, la pantalla entera repartida. ----
  const MUDO = '<svg class="tn-mudo" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9v2a3 3 0 0 0 5.1 2.1M15 10V6a3 3 0 0 0-5.6-1.5"/><path d="M5.5 11a6.5 6.5 0 0 0 10.4 5.2M18.5 11c0 .9-.2 1.8-.5 2.6M12 17.5V21"/><path d="M4 4l16 16"/></svg><span class="tn-t"></span>';
  const nuevoRotulo = () => { const r = document.createElement('span'); r.className = 'tesela-nombre'; r.innerHTML = MUDO; return r; };
  function tesela(p) {
    if (p.video) return;
    const v = document.createElement('video'); v.className = 'video-par'; v.autoplay = true; v.playsInline = true; v.setAttribute('playsinline', '');
    const r = nuevoRotulo();
    const ref = $('#raya-division'); esc.insertBefore(v, ref); esc.insertBefore(r, ref);
    v.addEventListener('resize', programa); v.addEventListener('loadedmetadata', programa);
    p.video = v; p.rotulo = r;
  }
  function quitaTesela(p) { if (!p.video) return; try { p.video.srcObject = null; } catch (_) {} if (p.video._placa) p.video._placa.remove(); p.video.remove(); p.rotulo.remove(); p.video = null; p.rotulo = null; }
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
  function pinta() {
    if (!sala || !esc) return;
    const pEn = enLlamada(principal);
    // la persona de la conversación vuelve a la llamada (volvió a llamar) con el grupo en marcha: se la presenta a las demás
    if (pEn !== principalEnLlamada) {
      principalEnLlamada = pEn;
      if (pEn && enCurso().length) { if (principal.id) presenta(principal); principalVisto = true; aviso(tr('grupoEntra').replace('{p}', etiqueta(principal))); }
      else if (!pEn && principalVisto && enCurso().length) aviso(tr('grupoSale').replace('{p}', etiqueta(principal)));
    }
    if (pEn && enCurso().length) principalVisto = true;
    if (!pEn && !enCurso().length) principalVisto = false;
    if (!enCurso().length) t0Grupo = 0;
    // quién va en la imagen principal: la persona de la conversación; si ha colgado, la primera de las demás que siga
    if (pEn) promovido = null;
    else if (!promovido || !extras.has(promovido.clave) || !enLlamada(promovido)) promovido = enCurso().find((p) => p.m.estadoLlamada().remoto) || null;
    const vs = $('#video-suyo');
    if (promovido) { const r = promovido.m.estadoLlamada().remoto; if (r && vs.srcObject !== r) { vs.srcObject = r; const x = vs.play(); if (x && x.catch) x.catch(() => {}); } }
    const lista = [];
    if (pEn || promovido) lista.push({ el: vs, p: pEn ? principal : promovido, r: rotulo('par-principal') });
    for (const p of pares()) {
      const e = p.m.estadoLlamada();
      if (p !== promovido && enLlamada(p) && e.remoto) {
        tesela(p);
        if (p.video.srcObject !== e.remoto) { p.video.srcObject = e.remoto; const x = p.video.play(); if (x && x.catch) x.catch(() => {}); }
        lista.push({ el: p.video, p, r: p.rotulo });
      } else quitaTesela(p);
    }
    const n = lista.length, grupo = n >= 2;
    const antes = sala.classList.contains('en-grupo');
    sala.classList.toggle('en-grupo', grupo); if (grupo) sala.dataset.grupo = String(n + 1); else delete sala.dataset.grupo;
    if (grupo) lista.push({ el: $('#video-mio'), yo: true, r: rotulo('par-yo') });
    coloca(grupo ? lista : []);
    { const t = $('#video-tiempo'); if (t) { if (grupo) t.dataset.gente = tr('personasN').replace('{n}', String(n + 1)); else delete t.dataset.gente; } }
    if (grupo !== antes) { const S = SALA(); if (S.grupoCambia) S.grupoCambia(grupo); }
    // «Añadir»: con la llamada en marcha y sitio para alguien más
    const b = $('#b-anadir'); if (b) b.hidden = !(PRUEBA && (pEn || enCurso().length) && personas() < MAX);
    // menos caudal por pareja cuantas más personas (3: 720p a 1,5 Mb/s; 4: 540p a 0,9 Mb/s y 24 imágenes por segundo)
    const total = 1 + n, tope = total >= 4 ? { bps: 900000, escala: 2, fps: 24 } : total === 3 ? { bps: 1500000, escala: 1.5, fps: 30 } : null;
    for (const q of [principal, ...pares()]) { try { q.m.limita(tope); } catch (_) {} }
    habla(grupo);
    const S = SALA(); if (S.repinta && grupo !== antes) S.repinta();
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
    for (const x of lista) x.comp = x.p ? (x.p.principal ? M.estadoLlamada() : x.p.m.estadoLlamada()).otroFiltro : null;
    // si alguien comparte su pantalla, su recuadro pasa a ser el grande (como en Meet): las demás personas, al lado (o debajo, en
    // el móvil)
    const foco = mini ? -1 : lista.findIndex((x) => x.comp && x.comp.pantalla && !x.comp.chat);
    const rs = foco >= 0 ? rejillaFoco(lista.length, W, H, foco, m) : m ? rejillaMovil(lista.length, W, H) : rejillaPC(lista.length, W, H, mini);
    lista.forEach((x, i) => {
      const r = rs[i], el = x.el; if (!r) return;
      el.classList.add('en-tesela');
      const pon = (k, v) => el.style.setProperty(k, v, 'important');
      pon('left', r.x + 'px'); pon('top', r.y + 'px'); pon('width', r.w + 'px'); pon('height', r.h + 'px'); pon('right', 'auto'); pon('bottom', 'auto');
      if (x.yo) { if (el.classList.contains('trasera')) el.style.removeProperty('transform'); else pon('transform', 'scaleX(-1)'); }
      // la imagen entera si es una pantalla compartida o si su forma no se parece a la del recuadro (un móvil en vertical en el
      // ordenador); si se parece, llena el recuadro
      const comp = x.comp;
      const vw = el.videoWidth, vh = el.videoHeight, ar = vw && vh ? vw / vh : 16 / 9;
      const entera = !!(comp && comp.pantalla) || (!m && Math.abs(Math.log(ar / (r.w / r.h))) > 0.45);
      pon('object-fit', entera ? 'contain' : 'cover');
      { const sinCam = x.yo ? (propio.cam === false || propio.chat) : !!(comp && (comp.cam === false || comp.chat)); placa(el, r, sinCam, (x.yo ? propio.chat : comp && comp.chat) ? 'etChatLargo' : 'camaraApagada'); }
      if (x.r) {
        // el nombre y, si hace falta, lo que tiene puesto (voz cambiada, cara oculta, pantalla, en el chat): se ve en su recuadro
        const f = x.yo ? { voz: propio.voz, cara: propio.cara, pantalla: !!pantallaG, chat: propio.chat } : comp || {};
        const mas = [f.pantalla ? tr('etPantalla') : '', f.voz ? tr('etVoz') : '', f.cara && !f.pantalla ? tr('etCara') : '', f.chat ? tr('etChat') : ''].filter(Boolean);
        x.r.querySelector('.tn-t').textContent = (x.yo ? tr('tu') : etiqueta(x.p)) + (mas.length ? ' · ' + mas.join(' · ') : ''); x.r.hidden = mini;
        x.r.classList.toggle('mudo', x.yo ? propio.mic === false : !!(comp && comp.mic === false));
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
  // quién habla: su recuadro se enciende (como en Meet o FaceTime), por el nivel de su voz en su propia llamada
  let hablaT = null, ultimoV = null, ultimoT = 0;
  function habla(si) {
    if (!si) { clearInterval(hablaT); hablaT = null; ultimoV = null; for (const v of esc.querySelectorAll('.habla')) v.classList.remove('habla'); return; }
    if (hablaT) return;
    hablaT = setInterval(() => {
      if (!sala.classList.contains('en-grupo') || document.hidden) return;
      const vs = $('#video-suyo'), l = [];
      if (enLlamada(principal)) l.push([vs, M.nivelVoz()]); else if (promovido) l.push([vs, promovido.m.nivelVoz()]);
      for (const p of pares()) if (p.video) l.push([p.video, p.m.nivelVoz()]);
      let mejor = null, max = 0.04; for (const [v, x] of l) if (v && x != null && x > max) { max = x; mejor = v; }
      const t = performance.now();
      if (mejor) { ultimoV = mejor; ultimoT = t; } else if (t - ultimoT < 900) mejor = ultimoV;
      for (const [v] of l) if (v) v.classList.toggle('habla', v === mejor);
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

  // ---- lo propio, a todas las llamadas del grupo ----
  async function todas(f) { let ok = false; for (const m of motores()) { try { if (await f(m)) ok = true; } catch (e) { console.warn('grupo', e); } } return ok; }
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
    return ok;
  }
  // colgar: el grupo se acaba para mí (cada llamada y cada sesión del grupo); la conversación principal la cuelga la pantalla
  function sal() {
    if (pantallaG) { try { pantallaG.stop(); } catch (_) {} pantallaG = null; }
    for (const p of pares()) { try { if (p.m.estadoLlamada().estado !== 'libre') p.m.colgar(); } catch (_) {} try { p.m.termina('mio'); } catch (_) {} }
    for (const p of pares()) { extras.delete(p.clave); clearTimeout(p.caduca); quitaTesela(p); }
    invitaPC = null; cierraTarjeta(); promovido = null; t0Grupo = 0; principalVisto = false;
    pinta();
  }

  const conSesion = () => pares().filter((p) => p.m.conectada && !p.m.terminada);
  window.ElixireGrupo = {
    anade, pinta, efectivo,
    get activo() { return extras.size > 0; },
    quedan: () => enCurso().length > 0,
    nombrePrincipal: () => etiqueta(principal),
    // el chat: el mismo mensaje (con el mismo identificador) a cada persona; devuelve a cuántas ha salido
    envia(texto, id) { let n = 0; for (const p of conSesion()) if (p.m.envia(texto, id)) n++; return n; },
    enviaArchivo(f, id) { let n = 0; for (const p of conSesion()) { const r = p.m.enviaArchivo(f, id); if (r && r.ok) n++; } return n; },
    borra(id) { for (const p of conSesion()) p.m.borra(id); },
    escribe() { for (const p of conSesion()) p.m.escribe(); },
    leidos(clave, ids) { const p = extras.get(clave); if (p && p.m.conectada) p.m.leidos(ids); },
    cancelaArchivo(id) { for (const p of conSesion()) { try { p.m.cancelaArchivo(id); } catch (_) {} } },
    // lo propio
    micro(si) { propio.mic = !!si; for (const m of motores()) m.micro(si); },
    camara(si) { propio.cam = !!si; for (const m of motores()) m.camara(si); },
    async cambiaVoz(si) { const ok = await todas((m) => m.cambiaVoz(si)); if (ok) propio.voz = !!si; return ok; },
    async caraOculta(si) { const ok = await todas((m) => m.caraOculta(si)); if (ok) propio.cara = !!si; return ok; },
    pantalla, giraCamara, sal,
    modoChat(si) { propio.chat = !!si; for (const m of motores()) m.modoChat(si); },
    colgar() { sal(); },
    // las invitaciones de «Añadir» que nadie ha abierto todavía
    cancelaInvitaciones() { for (const p of pares()) if (p.invitado && !p.m.conectada) quita(p); cierraTarjeta(); },
  };
  if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) window.ElixireGrupo._estado = () => ({ yo, principal: principal.id, enLlamada: enLlamada(principal), promovido: promovido && promovido.n, extras: pares().map((p) => ({ n: p.n, id: p.id, rol: p.rol, llama: p.llama, conectada: p.m.conectada, estado: p.m.estadoLlamada().estado, capa: p.m.estadoLlamada().capa })) });

  M.on('conectado', () => { M.grupo({ que: 'hola', id: yo }); });
  M.on('grupo', (g) => recibe(principal, g));
  M.on('llamada', (e) => {
    // lo propio que tenía puesto la llamada principal pasa a ser lo del grupo (al formarse el grupo, las demás lo copian)
    if (e && (e.estado === 'hablando') && !extras.size) { propio.mic = e.mic !== false; propio.cam = e.cam !== false; propio.voz = !!e.vozCambiada; propio.cara = !!e.caraOculta; }
    pinta();
  });
  M.on('filtro', () => pinta());
  M.on('fin', () => { principal.id = null; pinta(); });
  { const b = $('#b-anadir'); if (b) b.addEventListener('click', anade); }
  addEventListener('pagehide', () => { for (const p of pares()) { try { p.m.termina('cierra'); } catch (_) {} } });
  document.addEventListener('elixire-idioma', programa);
})();
