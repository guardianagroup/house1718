// Elixire · la llamada en grupo, hasta 4 personas (19 nov 2026).
// Dueño, 18:24: «haz la función de añadir participante a la llamada»; 18:33: «al añadir participante le damos al botón… el
// logotipo ese de una persona y el símbolo más… que cualquiera de los que ya están en la llamada tengan ese botón y lo puedan
// hacer cada uno. Y cuando le das, se abre el WhatsApp y lo invita con normalidad, como siempre».
// Agencia, ronda 98 (ChatGPT y Gemini, de acuerdo): malla completa, como mucho 4. Cada pareja tiene su propia sesión
// poscuántica y su propia llamada; nadie reenvía la imagen ni la voz de otro, y si alguien cuelga, los demás siguen.
// Cómo entra alguien: quien toca «Añadir» crea una semilla nueva (256 bits) y la manda por WhatsApp, como cualquier invitación;
// la persona invitada entra solo con quien la invitó. En cuanto están conectados, quien invitó presenta a la persona nueva a cada
// una de las demás con una semilla nueva por pareja, que viaja dentro de las sesiones encriptadas (el relé nunca la ve), y esas
// parejas se conectan y se llaman solas. Todos ven un aviso cuando entra o sale alguien.
'use strict';
(() => {
  const M = window.ElixireMotor, Nuevo = window.ElixireMotorNuevo;
  if (!M || !Nuevo || !window.crypto || !crypto.getRandomValues) return;
  const $ = (s) => document.querySelector(s);
  const tr = (k) => (window.ElixireIdioma ? window.ElixireIdioma.t(k) : k);
  const MAX = 4, CADUCA_MS = 10 * 60 * 1000;
  const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const b64u = (u) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const deB64u = (s) => { const b = atob(String(s).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
  const yo = hex(6);
  const principal = { m: M, id: null, n: 1, principal: true };
  const extras = new Map(); // clave → { m, id, rol, llama, n, video, rotulo, invitado, presentado, caduca }
  let numero = 1, principalFuera = false;

  const vivo = (p) => (p.principal ? M.conectada && !principalFuera : p.m.conectada && !p.m.terminada);
  const enLlamada = (p) => { const e = p.m.estadoLlamada(); return e.estado === 'hablando' || e.estado === 'reconectando'; };
  // cuántos somos: yo, la conversación principal si sigue, y cada otra persona (también las invitaciones aún sin abrir)
  const personas = () => 1 + (vivo(principal) ? 1 : 0) + [...extras.values()].filter((p) => !p.m.terminada).length;
  const etiqueta = (p) => tr('persona') + ' ' + p.n;

  // la cámara y el micrófono de cada llamada del grupo: copias de los de la llamada principal (no se abre otra vez la cámara;
  // en el iPhone solo puede haber una abierta)
  async function copias() {
    for (let i = 0; i < 40; i++) {
      const fuentes = [M.estadoLlamada().local, ...[...extras.values()].map((p) => p.m.estadoLlamada().local)].filter(Boolean);
      for (const st of fuentes) {
        const vivas = st.getTracks().filter((t) => t.readyState === 'live');
        if (vivas.length) return new MediaStream(vivas.map((t) => { const c = t.clone(); c.enabled = t.enabled; return c; }));
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  }

  function nuevoPar(o) {
    const m = Nuevo({ medios: copias }); if (!m) return null;
    const p = { m, id: o.id || null, rol: o.rol, llama: !!o.llama, n: ++numero, invitado: !!o.invitado, presentado: false };
    extras.set(hex(4), p);
    // (quien tiene el papel de llamar lo intenta hasta que la llamada arranca: la sesión puede tardar un instante en estar en línea)
    const llamaYa = (k) => { if (m.terminada || enLlamada(p) || m.estadoLlamada().estado !== 'libre') return; if (!m.puedeLlamar()) { m.llamar(); return; } if (k < 20) setTimeout(() => llamaYa(k + 1), 500); };
    m.on('conectado', () => { m.grupo({ que: 'hola', id: yo }); if (p.llama) setTimeout(() => llamaYa(0), 250); pinta(); });
    m.on('llamada', (e) => { if (e.estado === 'entrante') m.contestar(); if (e.estado === 'fin' && p.visto) { p.visto = false; } if (e.estado === 'hablando' && !p.visto) { p.visto = true; aviso('grupoEntra', etiqueta(p)); } pinta(); });
    m.on('grupo', (g) => recibe(p, g));
    m.on('fin', () => quita(p));
    if (window.ElixireSala && window.ElixireSala.engancha) window.ElixireSala.engancha(m, () => etiqueta(p));
    const r = o.rol === 'crea' ? m.invitaSemilla(o.semilla) : m.entraSemilla(o.semilla);
    Promise.resolve(r).then((x) => { if (!x || !x.ok) quita(p); }).catch(() => quita(p));
    if (p.invitado) p.caduca = setTimeout(() => { if (!m.conectada) { try { m.termina('caduca'); } catch (_) {} quita(p); } }, CADUCA_MS);
    pinta(); return p;
  }
  function quita(p) {
    let clave = null; for (const [k, q] of extras) if (q === p) clave = k;
    if (!clave) return;
    extras.delete(clave); clearTimeout(p.caduca);
    if (p.video) { p.video.srcObject = null; p.video.remove(); p.rotulo.remove(); }
    if (p.visto) aviso('grupoSale', etiqueta(p));
    try { if (!p.m.terminada) p.m.termina('mio'); } catch (_) {}
    if (principalFuera && !extras.size && window.ElixireSala && window.ElixireSala.finGrupo) window.ElixireSala.finGrupo();
    pinta();
  }
  // quien invitó presenta a la persona nueva a cada una de las demás: una semilla nueva por pareja, dentro de las sesiones
  function presenta(nuevo) {
    nuevo.presentado = true;
    for (const q of [principal, ...extras.values()]) {
      if (q === nuevo || !q.id || !vivo(q)) continue;
      const semilla = b64u(crypto.getRandomValues(new Uint8Array(32)));
      q.m.grupo({ que: 'conecta', semilla, con: nuevo.id, rol: 'crea' });
      nuevo.m.grupo({ que: 'conecta', semilla, con: q.id, rol: 'entra' });
    }
  }
  function recibe(p, g) {
    if (!g || !g.que) return;
    if (g.que === 'hola') { if (g.id && g.id !== yo) p.id = g.id; if (p.invitado && !p.presentado && p.id) presenta(p); pinta(); return; }
    if (g.que === 'conecta') {
      // solo de alguien que ya está en la llamada (las sesiones están verificadas), a alguien que aún no está, y sin pasar de 4
      if (!g.semilla || !g.con || g.con === yo || !vivo(p)) return;
      if ([principal, ...extras.values()].some((q) => q.id === g.con)) return;
      if (personas() >= MAX) return;
      nuevoPar({ semilla: deB64u(g.semilla), rol: g.rol === 'crea' ? 'crea' : 'entra', llama: g.rol === 'crea', id: g.con });
    }
  }

  // ---- añadir a alguien: una invitación nueva por WhatsApp, como siempre ----
  async function anade() {
    if (personas() >= MAX) { aviso('grupoLleno'); return; }
    const E = window.Elixire || {};
    const semilla = crypto.getRandomValues(new Uint8Array(32));
    nuevoPar({ semilla, rol: 'crea', llama: false, invitado: true });
    const texto = E.textoInvitacion ? E.textoInvitacion(b64u(semilla)) : location.origin + '/invitacion/#e=' + b64u(semilla);
    if (E.comparte) { const ok = await E.comparte(texto); if (ok !== false) aviso('grupoInvitado'); } else aviso('grupoInvitado');
  }

  // ---- la pantalla: una imagen por persona (la principal en #video-suyo; las demás, en su recuadro) ----
  function pinta() {
    const esc = $('#escena-video'), sala = $('#sala'); if (!esc || !sala) return;
    let i = 0;
    for (const p of extras.values()) {
      const e = p.m.estadoLlamada();
      if (enLlamada(p) && e.remoto && !p.enPrincipal) {
        if (!p.video) {
          const v = document.createElement('video'); v.className = 'video-par'; v.autoplay = true; v.playsInline = true; v.setAttribute('playsinline', '');
          const r = document.createElement('span'); r.className = 'par-nombre'; p.video = v; p.rotulo = r;
          const toca = $('#video-toca'); esc.insertBefore(r, toca); esc.insertBefore(v, r);
        }
        if (p.video.srcObject !== e.remoto) { p.video.srcObject = e.remoto; const x = p.video.play(); if (x && x.catch) x.catch(() => {}); }
        p.rotulo.textContent = etiqueta(p); i++;
        p.video.dataset.i = String(i); p.rotulo.dataset.i = String(i);
      } else if (p.video) { p.video.srcObject = null; p.video.remove(); p.rotulo.remove(); p.video = null; p.rotulo = null; }
    }
    const principalVe = !!(M.estadoLlamada().remoto || [...extras.values()].some((p) => p.enPrincipal));
    const n = i + (principalVe ? 1 : 0);
    sala.classList.toggle('en-grupo', n >= 2); sala.dataset.grupo = String(n);
    const r0 = $('#par-principal'); if (r0) { r0.hidden = n < 2; r0.textContent = principalFuera ? etiqueta([...extras.values()].find((p) => p.enPrincipal) || principal) : etiqueta(principal); }
    const movil = matchMedia('(max-width: 760px)').matches, b = $('#b-anadir'), hay = enLlamada(principal) || [...extras.values()].some(enLlamada);
    if (b) b.hidden = !(movil && hay && personas() < MAX);
    const bpc = $('#b-anadir-pc'); if (bpc) bpc.hidden = !(!movil && hay && personas() < MAX);
    // menos caudal por pareja cuantas más personas (3: 720p a 1,5 Mbps; 4: 540p a 0,9 Mbps y 24 imágenes por segundo)
    const tope = n >= 3 ? { bps: 900000, escala: 2, fps: 24 } : n === 2 ? { bps: 1500000, escala: 1.5, fps: 30 } : null;
    for (const q of [principal, ...extras.values()]) { try { q.m.limita(tope); } catch (_) {} }
    if (n >= 2) habla(); else { clearTimeout(hablaT); hablaT = null; for (const v of document.querySelectorAll('#escena-video .habla')) v.classList.remove('habla'); }
  }
  // quién habla: su recuadro se enciende (como en Meet o FaceTime), por el nivel de su voz en las estadísticas de su llamada
  let hablaT = null;
  function habla() {
    if (hablaT) return;
    const vuelta = async () => {
      hablaT = null; const sala = $('#sala'); if (!sala || !sala.classList.contains('en-grupo')) return;
      const lista = [[principalFuera ? null : $('#video-suyo'), principalFuera ? 0 : await M.nivelAudio()]];
      for (const p of extras.values()) { const v = p.enPrincipal ? $('#video-suyo') : p.video; if (v) lista.push([v, await p.m.nivelAudio()]); }
      let mejor = null, max = 0.035; for (const [v, n] of lista) if (v && n > max) { max = n; mejor = v; }
      for (const [v] of lista) if (v) v.classList.toggle('habla', v === mejor);
      hablaT = setTimeout(vuelta, 450);
    };
    hablaT = setTimeout(vuelta, 450);
  }
  function aviso(k, quien) {
    const t = tr(k).replace('{p}', quien || '');
    if (window.ElixireSala && window.ElixireSala.avisoBreve) window.ElixireSala.avisoBreve(t);
  }

  // ---- lo que hace la pantalla con todo el grupo ----
  const conSesion = () => [...extras.values()].filter((p) => p.m.conectada && !p.m.terminada);
  window.ElixireGrupo = {
    anade, pinta,
    get activo() { return extras.size > 0; },
    envia(texto, id) { let r = null; for (const p of conSesion()) { const x = p.m.envia(texto, id); if (x && !r) r = x; } return r; },
    enviaArchivo(f, id) { let r = null; for (const p of conSesion()) { const x = p.m.enviaArchivo(f, id); if (x && x.ok && !r) r = x; } return r; },
    borra(id) { for (const p of conSesion()) p.m.borra(id); },
    escribe() { for (const p of conSesion()) p.m.escribe(); },
    micro(si) { for (const p of extras.values()) p.m.micro(si); },
    camara(si) { for (const p of extras.values()) p.m.camara(si); },
    async reclona() { for (const p of extras.values()) { if (!enLlamada(p)) continue; const st = await copias(); if (st) await p.m.ponPistas(st); } },
    quedan() { return [...extras.values()].some(enLlamada); },
    // la persona de la conversación principal se ha ido: la imagen grande pasa a la siguiente y la llamada sigue
    principalSale() {
      principalFuera = true;
      const p = [...extras.values()].find(enLlamada); if (!p) return false;
      for (const q of extras.values()) q.enPrincipal = false;
      p.enPrincipal = true;
      const vs = $('#video-suyo'), e = p.m.estadoLlamada(); if (vs && e.remoto) { vs.srcObject = e.remoto; const x = vs.play(); if (x && x.catch) x.catch(() => {}); }
      pinta(); return true;
    },
    sal() { for (const p of [...extras.values()]) { try { p.m.colgar(); p.m.termina('mio'); } catch (_) {} quita(p); } principalFuera = false; pinta(); },
  };

  if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) window.ElixireGrupo._estado = () => ({ yo, principal: principal.id, fuera: principalFuera, extras: [...extras.values()].map((p) => ({ id: p.id, rol: p.rol, llama: p.llama, conectada: p.m.conectada, estado: p.m.estadoLlamada().estado })) });
  M.on('conectado', () => { principalFuera = false; M.grupo({ que: 'hola', id: yo }); });
  M.on('grupo', (g) => recibe(principal, g));
  M.on('llamada', () => pinta());
  M.on('fin', () => { principal.id = null; });
  $('#b-anadir') && $('#b-anadir').addEventListener('click', anade);
  $('#b-anadir-pc') && $('#b-anadir-pc').addEventListener('click', anade);
  addEventListener('pagehide', () => { for (const p of extras.values()) { try { p.m.termina('cierra'); } catch (_) {} } });
})();
