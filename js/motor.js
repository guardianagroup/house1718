// Elixire · el motor de la conversación (19 nov 2026).
// El protocolo Ultra de GUARDIANA Comunicaciones (orbita/comunicaciones/app.js: presentaB, recibePresentacionB, derivaSesionB, las
// cuatro palabras con compromiso previo, tramas de 1 KB a ritmo fijo), solo para dos personas, solo en la memoria de esta pestaña y
// con su propia separación de dominio («ELIXIRE …» en cripto.js). Sin cuentas, sin contactos, sin buzón: al cerrar, desaparece.
//   · Quien crea: semilla de 32 bytes al azar → sala, clave de presentación y psk (cripto.js, deSemillaB) y un código de 16 símbolos
//     (80 bits) que el relé no conoce: el relé guarda 10 minutos, y entrega una sola vez, la semilla cerrada con una clave del código.
//   · Quien entra: del código salen el buzón y la clave del sobre; con la semilla, la misma sala.
//   · En la sala: presentaciones firmadas con ECDSA P-384 y ML-DSA-87; acuerdo ECDH P-384 + ML-KEM-1024; sesión con HKDF-SHA-384;
//     una clave distinta por mensaje (cadena HMAC-SHA-384); claves nuevas cada 5 minutos; las cuatro palabras.
//   · Archivos: cada uno con su llave AES-256-GCM al azar, que viaja dentro de la sesión; trozos de tamaño fijo.
//   · Videollamada: WebRTC solo por el servidor de llamadas del relé (ninguno ve la dirección del otro), la negociación dentro de la
//     sesión, y encima la capa poscuántica de la imagen y el sonido (medios-pq.js), sin rebaja: sin ella, no hay llamada.
'use strict';
(() => {
  const C = window.GuardianaCripto, B = C && C.B;
  if (!C || !B || !window.GuardianaRele) return;
  const LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  const q = new URLSearchParams(location.search);
  const TIC_MS = (LOCAL && +q.get('latido')) || 500;
  const RENUEVA_MS = (LOCAL && +q.get('renueva') * 1000) || 5 * 60 * 1000;
  const PRUEBA_MS = (LOCAL && +q.get('prueba') * 1000) || 3 * 60 * 1000;
  const PLAZO_PALABRAS_MS = 15000;
  const CODIGO_MS = 10 * 60 * 1000;

  // ---------- avisos para la pantalla ----------
  const esc = {};
  const on = (t, f) => { (esc[t] = esc[t] || []).push(f); };
  const emite = (t, x) => { for (const f of esc[t] || []) { try { f(x); } catch (e) { console.error(e); } } };

  // ---------- el relé: solo al empezar una prueba (la portada no se conecta a nada) ----------
  let R = null;
  function rele() {
    if (R) return R;
    R = window.GuardianaRele.crea({});
    R.on('abierto', () => emite('red', true));
    R.on('cerrado', () => emite('red', false));
    R.on('sala', alSala); R.on('llega', alLlega); R.on('sale', alSale);
    R.on('trama', alTrama);
    R.on('codigo-usado', (b) => { if (S && S.ucod && S.ucod.buzon === b) { S.ucod.usado = true; emite('codigo-usado'); } });
    return R;
  }
  const conectado = (ms) => new Promise((res) => {
    const r = rele(); if (r.abierto) return res(true);
    const t0 = Date.now(); const i = setInterval(() => { if (r.abierto) { clearInterval(i); res(true); } else if (Date.now() - t0 > (ms || 12000)) { clearInterval(i); res(false); } }, 120);
  });
  function prepara() { rele(); }

  // ---------- la conversación (una sola por pestaña) ----------
  let S = null;
  async function nuevaSesion(semilla, rol) {
    const d = await B.deSemilla(semilla);
    const reposo = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const n = await B.creaIdentidad(reposo);
    const s = {
      id: d.sala, presentacion: d.presentacion, psk: d.psk, semilla, rol, idB: n.guardar, dsaSec: n.dsaSec,
      miHuella: await B.huella(n.guardar.firmaPub, n.guardar.acuerdoPub, n.guardar.dsaPub),
      yo: C.hex(C.azar(8)), miembros: new Set(), suId: null, huella: null, sesiones: new Map(), sesion: null, efs: new Map(),
      epocasVistas: new Set(), tic: [], partes: new Map(), envios: new Map(), recibos: new Map(), conectado: false, fin: false, creado: Date.now(),
    };
    S = s;
    rele().entra(s.id, s.yo, { b: 1 });
    return s;
  }
  const soyInicio = (s) => !s.huella || C.hex(s.miHuella) < C.hex(s.huella);
  const enLinea = (s) => !!(s && s.suId && s.miembros.has(s.suId) && s.sesion && R && R.abierto);
  const enCola = (s, f) => { if (!s || s.fin) return Promise.resolve(); s.proc = (s.proc || Promise.resolve()).then(() => (s.fin ? null : f())).catch((e) => console.warn(e)); return s.proc; };
  const reintenta = (s, ms) => { clearTimeout(s.reintento); s.reintento = setTimeout(() => { if (!s.fin && !s.sesion && s.suId && s.miembros.has(s.suId) && R.abierto) enCola(s, () => presenta(s, null, true)); }, ms); };

  // Crear: el código, el sobre en el relé y a esperar en la sala
  async function crea() {
    if (!B.hayBlindada()) return { ok: false, por: 'sin-pq' };
    if (!(await conectado())) return { ok: false, por: 'sin-rele' };
    if (S) termina('nueva');
    const semilla = C.nuevaSemilla();
    const s = await nuevaSesion(semilla, 'crea');
    for (let i = 0; i < 3; i++) {
      const codigo = C.nuevoCodigoU(), t0 = Date.now();
      const x = await C.cierraSobreU(codigo, semilla);
      const r = await R.invita(x.buzon, x.sobre, x.sal);
      if (s.fin) { if (r && r.ok) R.retira(x.buzon); return { ok: false, por: 'fin' }; }
      if (r && r.ok) { s.ucod = { codigo, buzon: x.buzon, caduca: t0 + CODIGO_MS, usado: false }; return { ok: true, codigo, caduca: s.ucod.caduca }; }
      if (!r || r.por !== 'repetido') break;
    }
    termina('sin-codigo');
    return { ok: false, por: 'sin-codigo' };
  }
  // Entrar con un código
  async function entra(texto) {
    const u = C.normalizaCodigoU(texto);
    if (!u) return { ok: false, por: 'formato' };
    if (!B.hayBlindada()) return { ok: false, por: 'sin-pq' };
    if (!(await conectado())) return { ok: false, por: 'sin-rele' };
    const d = await C.preparaCodigoU(u);
    try {
      const r = await R.busca(d.buzon);
      if (!r || !r.ok) return { ok: false, por: r && /^(demasiados intentos|sin relé|sin respuesta)$/.test(r.por || '') ? r.por : 'no-vale' };
      const semilla = await d.abre(r.sobre, r.sal);
      if (!semilla) return { ok: false, por: 'no-vale' };
      if (S) termina('nueva');
      await nuevaSesion(semilla, 'entra');
      return { ok: true };
    } finally { d.olvida(); }
  }

  // ---------- presentaciones (Ultra v5: P-384 + ML-KEM-1024, firmas ECDSA P-384 y ML-DSA-87) ----------
  async function compromisoMio(s) { if (!s.cwMio) { s.nIMio = C.azar(32); s.cwMio = await B.compromisoPalabras(s.miHuella, s.nIMio); } return s.cwMio; }
  async function presenta(s, resp, forzar) {
    if (s.fin || !R.abierto) return null;
    if (!resp && !forzar && s.presentadoEn && Date.now() - s.presentadoEn < 1200) { reintenta(s, 1400); return null; }
    if (resp && !resp.ek) return null;
    s.ef = await B.efimera(); s.epoca = C.azar(16);
    if (!resp && soyInicio(s)) s.ef.kem = B.kemPar();
    const cw = !resp && s.ef.kem ? await compromisoMio(s) : null;
    if (resp && !s.nRMio) s.nRMio = C.azar(32);
    let pq = null;
    if (resp) { const k = B.kemEncapsula(resp.ek); pq = { ss: k.ss, ek: resp.ek, ct: k.ct }; }
    s.efs.set(C.hex(s.epoca), s.ef);
    for (const k of [...s.efs.keys()].slice(0, -4)) { const v = s.efs.get(k); if (v && v.kem) { v.kem.dk.fill(0); v.kem = null; } s.efs.delete(k); }
    const id = s.idB;
    const datos = resp
      ? await B.datosResponde(s.id, id.firmaPub, id.acuerdoPub, id.dsaPub, s.ef.pub, s.epoca, resp.epoca, s.huella, resp.ef, pq.ek, pq.ct, s.nRMio)
      : await B.datosInicia(s.id, id.firmaPub, id.acuerdoPub, id.dsaPub, s.ef.pub, s.epoca, s.ef.kem ? s.ef.kem.ek : new Uint8Array(0), cw);
    const sig = await B.firma(id, datos), sigpq = B.firmaPQ(s.dsaSec, datos);
    const j = { v: 5, b: 1, firmaPub: C.b64u(id.firmaPub), acuerdoPub: C.b64u(id.acuerdoPub), dsaPub: C.b64u(id.dsaPub), ef: C.b64u(s.ef.pub), epoca: C.b64u(s.epoca), resp: resp ? C.b64u(resp.epoca) : '', sig: C.b64u(sig), sigpq: C.b64u(sigpq) };
    if (s.ef.kem) j.kem = C.b64u(s.ef.kem.ek);
    if (pq) j.kemct = C.b64u(pq.ct);
    if (cw) j.cw = C.b64u(cw);
    if (resp) j.nr = C.b64u(s.nRMio);
    const iv = C.azar(12);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new Uint8Array([1]) }, s.presentacion, B.rellena(C.te.encode(JSON.stringify(j)))));
    R.manda(s.id, s.suId || null, C.cat(new Uint8Array([1]), iv, ct));
    s.presentadoEn = Date.now();
    if (!resp) reintenta(s, 4000 + Math.random() * 1500);
    return pq;
  }
  async function recibePresentacion(s, de, b) {
    if (b.length < 30) return;
    let j;
    try { j = JSON.parse(C.td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(1, 13), additionalData: new Uint8Array([1]) }, s.presentacion, b.subarray(13)))); } catch (_) { return; }
    if (!j || j.v !== 5 || j.b !== 1) return;
    let firmaPub, acuerdoPub, dsaPub, ef, epoca, sig, sigpq, resp, kemEk, kemCt, cw, nr;
    try {
      firmaPub = C.deB64u(j.firmaPub); acuerdoPub = C.deB64u(j.acuerdoPub); dsaPub = C.deB64u(j.dsaPub); ef = C.deB64u(j.ef); epoca = C.deB64u(j.epoca);
      sig = C.deB64u(j.sig); sigpq = C.deB64u(j.sigpq); resp = j.resp ? C.deB64u(j.resp) : null;
      kemEk = j.kem ? C.deB64u(j.kem) : null; kemCt = j.kemct ? C.deB64u(j.kemct) : null; cw = j.cw ? C.deB64u(j.cw) : null; nr = j.nr ? C.deB64u(j.nr) : null;
    } catch (_) { return; }
    if ((cw && cw.length !== 48) || (nr && nr.length !== 32)) return;
    if (firmaPub.length !== B.EC || acuerdoPub.length !== B.EC || ef.length !== B.EC || dsaPub.length !== B.DSA_PUB || epoca.length !== 16 || (resp && resp.length !== 16) || sigpq.length !== B.DSA_FIRMA) return;
    if ((kemEk && (resp || kemEk.length !== B.EK)) || (kemCt && kemCt.length !== B.CT) || (!!resp !== !!kemCt)) return;
    const huella = await B.huella(firmaPub, acuerdoPub, dsaPub);
    if (C.hex(huella) === C.hex(s.miHuella)) return; // yo mismo
    // la conversación ya es de otra persona: nadie más entra (se rechaza y se avisa)
    if (s.huella && C.hex(s.huella) !== C.hex(huella)) { R.manda(s.id, de, new Uint8Array([5])); s.intrusos = (s.intrusos || 0) + 1; emite('intruso', s.intrusos); return; }
    const eh = C.hex(epoca); if (s.epocasVistas.has(eh)) return; s.epocasVistas.add(eh); if (s.epocasVistas.size > 64) s.epocasVistas.delete(s.epocasVistas.values().next().value);
    const efMia = resp ? s.efs.get(C.hex(resp)) : null;
    if (resp && (!efMia || !efMia.kem)) return;
    const datos = resp
      ? await B.datosResponde(s.id, firmaPub, acuerdoPub, dsaPub, ef, epoca, resp, s.miHuella, efMia.pub, efMia.kem.ek, kemCt, nr)
      : await B.datosInicia(s.id, firmaPub, acuerdoPub, dsaPub, ef, epoca, kemEk || new Uint8Array(0), cw);
    if (!(await B.verifica(firmaPub, sig, datos)) || !B.verificaPQ(dsaPub, sigpq, datos)) return; // las dos firmas, o nada
    const nueva = !s.huella;
    if (nueva) { s.firmaPub = firmaPub; s.acuerdoPub = acuerdoPub; s.dsaPub = dsaPub; s.huella = huella; }
    s.suId = de; s.miembros.add(de);
    if (nueva) { quitaCodigo(s); emite('llega'); }
    if ((!resp && kemEk && !cw) || (resp && !nr)) { await alarma(s, 'sin-palabras'); return; }
    const otro = (a, x) => C.hex(a) !== C.hex(x);
    if (!resp && kemEk && !soyInicio(s)) { if (!s.cwSuyo) s.cwSuyo = cw; else if (otro(cw, s.cwSuyo)) { await alarma(s, 'palabras'); return; } }
    if (resp && soyInicio(s)) { if (!s.nRSuyo) s.nRSuyo = nr; else if (otro(nr, s.nRSuyo)) { await alarma(s, 'palabras'); return; } }
    if (!soyInicio(s)) { if (kemEk && !resp) { const pq = await presenta(s, { epoca, ef, ek: kemEk }); await derivaSesion(s, ef, s.ef, pq); } }
    else if (resp) {
      const pq = { ss: B.kemAbre(kemCt, efMia.kem.dk), ek: efMia.kem.ek, ct: kemCt }; efMia.kem.dk.fill(0); efMia.kem = null;
      await derivaSesion(s, ef, efMia, pq);
      if (!s.palabrasN && !s.revela && s.nIMio && s.nRSuyo) { s.revela = { n: C.b64u(s.nIMio), nI: s.nIMio, nR: s.nRSuyo }; revelaPalabras(s); }
    }
    else await presenta(s, null);
  }
  async function derivaSesion(s, suEf, efMia, pq) {
    if (!efMia || !suEf || !s.acuerdoPub || !pq || !pq.ss) { if (pq && pq.ss) pq.ss.fill(0); return; }
    const r = await B.sesion(s.idB, efMia, { ef: suEf, acuerdoPub: s.acuerdoPub }, s.id, soyInicio(s), s.psk, s.miHuella, s.huella, pq);
    pq.ss.fill(0);
    const sid = C.hex(r.hash.subarray(0, 8)), renovada = s.sesiones.size > 0;
    const ses = { sid, hash: r.hash, envio: B.cadena(r.envio), recibo: B.cadena(r.recibo), medios: r.medios, desde: Date.now(), confirmada: false };
    s.sesiones.set(sid, ses); s.sesion = ses; clearTimeout(s.reintento);
    for (const k of [...s.sesiones.keys()].slice(0, -3)) { const x = s.sesiones.get(k); try { x.envio.borra(); x.recibo.borra(); x.medios.fill(0); } catch (_) {} s.sesiones.delete(k); }
    s.renovaciones = (s.renovaciones || 0) + (renovada ? 1 : 0);
    emite('claves', { renovada, n: s.renovaciones });
    enviaControl(s, { tipo: 'ok' });
    if (s.revela && s.palabrasN && !s.revelaOk) enviaControl(s, { tipo: 'palabras', n: s.revela.n });
  }
  // las palabras: quien inicia revela su número cuando ya hay sesión; quien responde lo comprueba contra el compromiso previo
  function revelaPalabras(s) {
    if (!s.revela || s.palabrasN || s.fin) return;
    s.palabrasN = { hI: s.miHuella, hR: s.huella, nI: s.revela.nI, nR: s.revela.nR };
    enviaControl(s, { tipo: 'palabras', n: s.revela.n });
    ponPalabras(s);
  }
  async function recibeRevelacion(s, j) {
    if (!s.huella || soyInicio(s)) return;
    if (s.palabrasN) { enviaControl(s, { tipo: 'palabras-ok' }); return; }
    let nI; try { nI = C.deB64u(String(j.n || '')); } catch (_) { return; }
    if (!s.cwSuyo || !s.nRMio || nI.length !== 32) return;
    if (C.hex(await B.compromisoPalabras(s.huella, nI)) !== C.hex(s.cwSuyo)) { await alarma(s, 'palabras'); return; }
    s.palabrasN = { hI: s.huella, hR: s.miHuella, nI, nR: s.nRMio };
    enviaControl(s, { tipo: 'palabras-ok' });
    ponPalabras(s);
  }
  async function ponPalabras(s) {
    if (s.palabras || !s.palabrasN) return;
    const p = s.palabrasN; const w = await B.palabras(p.hI, p.hR, p.nI, p.nR);
    if (!w || s.fin) return;
    s.palabras = w; clearTimeout(s.plazoPalabras);
    emite('palabras', w.slice());
  }
  function plazoPalabras(s) {
    if (s.palabras || s.plazoPalabras) return;
    s.plazoPalabras = setTimeout(() => { if (!s.palabras && !s.fin && S === s) alarma(s, 'sin-palabras'); }, PLAZO_PALABRAS_MS);
  }

  // ---------- mensajes sellados (cadena por mensaje) y tramas de 1 KB a ritmo fijo ----------
  async function sella(s, obj) {
    const ses = s.sesion; if (!ses) return null;
    const { n, clave } = await ses.envio.siguiente();
    const cab = new Uint8Array(13); cab[0] = 2; cab.set(C.deHex(ses.sid), 1); new DataView(cab.buffer).setUint32(9, n);
    const ct = await C.sella(clave, n, B.rellena(C.te.encode(JSON.stringify(obj))), C.cat(cab, ses.hash));
    clave.fill(0);
    return C.cat(cab, ct);
  }
  // fuera del ritmo fijo: el acuerdo de claves, las palabras, las órdenes y la señalización de la llamada
  const APARTE = new Set(['ok', 'palabras', 'palabras-ok', 'alarma', 'destruir', 'llamada', 'archivo-ack', 'archivo-cancel']);
  function enviaControl(s, obj) {
    if (!s || s.fin || !s.sesion || !R.abierto || !s.miembros.has(s.suId)) return false;
    if (!APARTE.has(obj.tipo)) { aTic(s, obj); return true; }
    sella(s, obj).then((b) => b && R.manda(s.id, s.suId, b)).catch(() => {});
    return true;
  }
  const PIEZA = 660;
  function trocea(obj) {
    const b = C.te.encode(JSON.stringify(obj)); if (b.length <= 1000) return [obj];
    const id = C.hex(C.azar(8)), n = Math.ceil(b.length / PIEZA), out = [];
    for (let i = 0; i < n; i++) out.push({ tipo: 'parte', id, i, n, d: C.b64u(b.subarray(i * PIEZA, (i + 1) * PIEZA)) });
    return out;
  }
  function aTic(s, obj) { for (const o of trocea(obj)) s.tic.push(o); }
  async function tic(s) {
    if (!s || s.ticando || s.fin || !enLinea(s) || !s.sesion.confirmada) return;
    s.ticando = true;
    try {
      const obj = s.tic.length ? s.tic[0] : { tipo: 'latido' };
      const b = await sella(s, obj); if (!b || !R.manda(s.id, s.suId, b)) return;
      if (s.tic[0] === obj) s.tic.shift();
    } catch (e) { console.warn('tic', e); } finally { s.ticando = false; }
  }
  setInterval(() => { if (S) tic(S); }, TIC_MS);
  // claves nuevas cada 5 minutos: quien inicia vuelve a presentarse; las anteriores se borran
  setInterval(() => { const s = S; if (s && !s.fin && s.sesion && s.sesion.confirmada && soyInicio(s) && enLinea(s)) enCola(s, () => presenta(s, null, true)); }, RENUEVA_MS);

  async function recibeMensaje(s, de, b) {
    if (b.length < 13 + 16) return;
    const sid = C.hex(b.subarray(1, 9)), n = new DataView(b.buffer, b.byteOffset).getUint32(9);
    const ses = s.sesiones.get(sid);
    if (!ses) { R.manda(s.id, de, new Uint8Array([4])); return; }
    let j;
    try { const k = await ses.recibo.para(n); j = JSON.parse(C.td.decode(await C.abre(k, n, b.subarray(13), C.cat(b.subarray(0, 13), ses.hash)))); k.fill(0); }
    catch (e) { if (!/repetido|saltados/.test(String(e && e.message))) emite('integridad'); return; }
    if (s.suId !== de) return;
    if (!ses.confirmada) {
      ses.confirmada = true; plazoPalabras(s);
      if (!s.conectado) { s.conectado = true; emite('conectado'); }
    }
    return trata(s, j);
  }
  async function recibeParte(s, j) {
    const id = String(j.id || '').slice(0, 32), n = j.n | 0, i = j.i | 0;
    if (!id || n < 2 || n > 400 || i < 0 || i >= n) return;
    let d; try { d = C.deB64u(String(j.d || '')); } catch (_) { return; }
    if (d.length > PIEZA) return;
    for (const [k, v] of s.partes) if (Date.now() - v.t > 5 * 60 * 1000) s.partes.delete(k);
    let p = s.partes.get(id); if (!p) { if (s.partes.size >= 32) return; p = { n, piezas: new Array(n), van: 0, t: Date.now() }; s.partes.set(id, p); }
    if (p.n !== n || p.piezas[i]) return;
    p.piezas[i] = d; p.van++;
    if (p.van < n) return;
    s.partes.delete(id);
    let x; try { x = JSON.parse(C.td.decode(C.cat(...p.piezas))); } catch (_) { return; }
    if (!x || typeof x !== 'object' || x.tipo === 'parte') return;
    return trata(s, x);
  }
  async function trata(s, j) {
    if (!j || typeof j !== 'object') return;
    switch (j.tipo) {
      case 'parte': return recibeParte(s, j);
      case 'latido': case 'ok': return;
      case 'texto': {
        const m = { id: String(j.id || '').slice(0, 40), texto: String(j.texto || '').slice(0, 20000), t: Math.min(Date.now(), +j.t || Date.now()), dir: 'suya' };
        if (!m.id || s.vistos && s.vistos.has(m.id)) { enviaControl(s, { tipo: 'ack', ids: [m.id] }); return; }
        (s.vistos = s.vistos || new Set()).add(m.id);
        emite('mensaje', m);
        enviaControl(s, { tipo: 'ack', ids: [m.id] });
        return;
      }
      case 'ack': if (Array.isArray(j.ids)) emite('acuse', j.ids.slice(0, 50).map(String)); return;
      case 'escribe': emite('escribe', !!j.si); return;
      case 'palabras': return recibeRevelacion(s, j);
      case 'palabras-ok': s.revelaOk = true; return;
      case 'comprobadas': s.suComprobadas = true; emite('su-comprobacion'); return;
      case 'archivo': return recibeAnuncio(s, j);
      case 'archivo-ack': return avanzaEnvio(s, j);
      case 'archivo-cancel': return cancelaArchivo(String(j.id || ''), true);
      case 'llamada': return llamadaRecibe(s, j);
      case 'alarma': return finaliza(s, 'alarma-suya');
      case 'destruir': return finaliza(s, 'suyo');
      default: return;
    }
  }

  // ---------- el relé: quién está en la sala y lo que llega ----------
  function alSala(sala, miembros) {
    const s = S; if (!s || s.id !== sala) return;
    s.miembros = new Set(miembros); s.sesion = null;
    if (miembros.length && (!s.suId || miembros.includes(s.suId))) enCola(s, () => presenta(s, null, true));
  }
  function alLlega(sala, quien) {
    const s = S; if (!s || s.id !== sala) return;
    s.miembros.add(quien);
    if (!s.suId || s.suId === quien) { s.sesion = null; enCola(s, () => presenta(s, null, true)); }
    if (s.suId === quien) emite('vuelve');
  }
  function alSale(sala, quien) {
    const s = S; if (!s || s.id !== sala) return;
    s.miembros.delete(quien);
    if (s.suId === quien) { s.sesion = null; emite('se-va'); if (L) colgar('se-fue', true); }
  }
  function alTrama(sala, de, b) {
    const s = S; if (!s || s.id !== sala || !b.length) return;
    enCola(s, async () => {
      if (b[0] === 1) await recibePresentacion(s, de, b);
      else if (b[0] === 2) await recibeMensaje(s, de, b);
      else if (b[0] === 3) await recibeTrozo(s, de, b);
      else if (b[0] === 4) { if (s.suId === de) await presenta(s, null); }
      else if (b[0] === 5) { if (!s.huella) emite('ocupada'); }
    });
  }

  // ---------- texto ----------
  function envia(texto) {
    const s = S; texto = String(texto || '').trim();
    if (!s || !s.conectado || s.fin || !texto) return null;
    const m = { tipo: 'texto', id: C.hex(C.azar(12)), t: Date.now(), texto: texto.slice(0, 20000) };
    aTic(s, m);
    return { id: m.id, texto: m.texto, t: m.t, dir: 'mia' };
  }
  let escribeT = 0;
  function escribe() { const s = S; if (!s || !s.conectado || Date.now() - escribeT < 2500) return; escribeT = Date.now(); s.tic = s.tic.filter((x) => x.tipo !== 'escribe'); aTic(s, { tipo: 'escribe', si: 1 }); }
  function comprobadas() { const s = S; if (!s || !s.conectado) return; s.comprobadas = true; enviaControl(s, { tipo: 'comprobadas' }); }

  // ---------- archivos ----------
  // Cada archivo lleva su llave AES-256-GCM al azar dentro del anuncio (que va por la sesión). Los trozos van aparte, todos del mismo
  // tamaño (los últimos bytes, rellenos), y cada uno autentica su número y el total: nadie puede cambiarlos, quitarlos ni reordenarlos.
  const TROZO = 48 * 1024, VENTANA = 32, LIMITE = 1024 * 1024 * 1024, ATRASO = 6 * 1024 * 1024;
  const adTrozo = (cab, partes) => C.cat(cab, C.te.encode('ELIXIRE archivo v1\n' + partes));
  function enviaArchivo(file) {
    const s = S; if (!s || !s.conectado || s.fin || !file) return { ok: false, por: 'sin-sesion' };
    if (file.size > LIMITE) return { ok: false, por: 'grande' };
    const id = C.hex(C.azar(8)), llave = C.azar(32), partes = Math.max(1, Math.ceil(file.size / TROZO));
    const env = { id, file, llave, partes, enviadas: 0, confirmadas: 0, nombre: String(file.name || 'archivo').slice(0, 200), tam: file.size, mime: String(file.type || '').slice(0, 100), activo: false, fin: false };
    s.envios.set(id, env);
    aTic(s, { tipo: 'archivo', id, nombre: env.nombre, mime: env.mime, tam: env.tam, partes, llave: C.b64u(llave) });
    return { ok: true, id, nombre: env.nombre, tam: env.tam };
  }
  async function avanzaEnvio(s, j) {
    const env = s.envios.get(String(j.id || '')); if (!env || env.fin) return;
    const hasta = Math.max(0, Math.min(env.partes, j.hasta | 0));
    if (hasta > env.confirmadas) env.confirmadas = hasta;
    emite('archivo-progreso', { id: env.id, dir: 'mia', hecho: env.confirmadas / env.partes });
    if (env.confirmadas >= env.partes) { env.fin = true; env.llave.fill(0); s.envios.delete(env.id); emite('archivo-enviado', { id: env.id }); return; }
    if (!env.clave) env.clave = await C.aes(env.llave);
    bombea(s, env);
  }
  async function bombea(s, env) {
    if (env.activo) return; env.activo = true;
    try {
      while (!env.fin && !s.fin && env.enviadas < env.partes && env.enviadas - env.confirmadas < VENTANA) {
        if (!enLinea(s)) break;
        if (R.atraso > ATRASO) { await new Promise((r) => setTimeout(r, 60)); continue; }
        const i = env.enviadas;
        const datos = new Uint8Array(await env.file.slice(i * TROZO, (i + 1) * TROZO).arrayBuffer());
        const claro = new Uint8Array(4 + TROZO); new DataView(claro.buffer).setUint32(0, datos.length); claro.set(datos, 4);
        const cab = new Uint8Array(13); cab[0] = 3; cab.set(C.deHex(env.id), 1); new DataView(cab.buffer).setUint32(9, i);
        const ct = await C.sella(env.clave, i, claro, adTrozo(cab, env.partes));
        claro.fill(0); datos.fill(0);
        if (!R.manda(s.id, s.suId, C.cat(cab, ct))) break;
        env.enviadas++;
      }
    } catch (e) { console.warn('archivo', e); } finally { env.activo = false; }
  }
  async function recibeAnuncio(s, j) {
    const id = String(j.id || ''); if (!/^[0-9a-f]{16}$/.test(id) || s.recibos.has(id)) return;
    const partes = j.partes | 0, tam = +j.tam || 0;
    if (partes < 1 || tam < 0 || tam > LIMITE || partes !== Math.max(1, Math.ceil(tam / TROZO))) return;
    let llave; try { llave = C.deB64u(String(j.llave || '')); } catch (_) { return; }
    if (llave.length !== 32) return;
    const r = { id, nombre: String(j.nombre || 'archivo').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 200) || 'archivo', mime: String(j.mime || '').slice(0, 100), tam, partes, clave: await C.aes(llave), trozos: new Array(partes), llegadas: 0, seguidas: 0, avisoT: 0 };
    llave.fill(0);
    s.recibos.set(id, r);
    emite('archivo', { id, dir: 'suya', nombre: r.nombre, tam });
    enviaControl(s, { tipo: 'archivo-ack', id, hasta: 0 });
  }
  async function recibeTrozo(s, de, b) {
    if (de !== s.suId || b.length < 13 + 16) return;
    const id = C.hex(b.subarray(1, 9)), i = new DataView(b.buffer, b.byteOffset).getUint32(9);
    const r = s.recibos.get(id); if (!r || r.fin || i >= r.partes || r.trozos[i]) return;
    let claro;
    try { claro = await C.abre(r.clave, i, b.subarray(13), adTrozo(b.subarray(0, 13), r.partes)); } catch (_) { emite('integridad'); return; }
    const n = new DataView(claro.buffer, claro.byteOffset).getUint32(0);
    if (n > TROZO || (i < r.partes - 1 && n !== TROZO)) return;
    r.trozos[i] = claro.slice(4, 4 + n); claro.fill(0); r.llegadas++;
    while (r.seguidas < r.partes && r.trozos[r.seguidas]) r.seguidas++;
    if (r.seguidas === r.partes || r.seguidas % 8 === 0) enviaControl(s, { tipo: 'archivo-ack', id, hasta: r.seguidas });
    if (Date.now() - r.avisoT > 150 || r.llegadas === r.partes) { r.avisoT = Date.now(); emite('archivo-progreso', { id, dir: 'suya', hecho: r.llegadas / r.partes }); }
    if (r.llegadas === r.partes) {
      r.fin = true;
      const blob = new Blob(r.trozos, { type: r.mime || 'application/octet-stream' }); r.trozos = null;
      emite('archivo-listo', { id, nombre: r.nombre, tam: r.tam, url: URL.createObjectURL(blob), mime: r.mime });
    }
  }
  function cancelaArchivo(id, suyo) {
    const s = S; if (!s) return;
    const env = s.envios.get(id); if (env) { env.fin = true; env.llave.fill(0); s.envios.delete(id); }
    const r = s.recibos.get(id); if (r) { r.fin = true; r.trozos = null; s.recibos.delete(id); }
    if (!suyo) enviaControl(s, { tipo: 'archivo-cancel', id });
    emite('archivo-cancelado', { id, suyo: !!suyo });
  }

  // ---------- videollamada ----------
  const PQM = typeof window.RTCRtpScriptTransform === 'function' && typeof window.Worker === 'function' && typeof window.RTCPeerConnection === 'function';
  let L = null, obrero = null;
  function trabajador() {
    if (!obrero) {
      obrero = new Worker('js/medios-pq.js?v=20261119-1');
      obrero.onmessage = (e) => { const m = e.data || {}; if (m.tipo === 'visto' && L && L.rx === m.id) { L.visto = true; emite('llamada', estadoLlamada()); } if (m.tipo === 'fallo' && L && L.estado === 'hablando' && m.cuenta && m.cuenta.seguidos > 60) emite('llamada-aviso', 'descifra'); };
    }
    return obrero;
  }
  const estadoLlamada = () => (L ? { estado: L.estado, rol: L.rol, video: L.video, t0: L.t0 || 0, limite: PRUEBA_MS, mic: L.mic !== false, cam: L.cam !== false, capa: !!L.visto, local: L.local || null, remoto: L.remoto || null } : { estado: 'libre' });
  async function hkdf256(sec, sal, info) { const k = await crypto.subtle.importKey('raw', sec, 'HKDF', false, ['deriveBits']); return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: C.te.encode(sal), info: C.te.encode(info) }, k, 256)); }
  const nuevoK = () => 'k' + C.hex(C.azar(8));
  // las dos llaves de la capa poscuántica de esta llamada (una por sentido), del secreto de la sesión y del identificador de la llamada
  async function llavesLlamada(medios, idL, soyQuienLlama) {
    const sal = 'ELIXIRE medios v1\n' + idL;
    const a = await hkdf256(medios, sal, 'de quien llama'), b = await hkdf256(medios, sal, 'de quien contesta');
    const w = trabajador(); L.tx = nuevoK(); L.rx = nuevoK();
    const tx = soyQuienLlama ? a : b, rx = soyQuienLlama ? b : a;
    w.postMessage({ tipo: 'llave', id: L.tx, raw: tx.buffer }, [tx.buffer]); w.postMessage({ tipo: 'llave', id: L.rx, raw: rx.buffer }, [rx.buffer]);
    w.postMessage({ tipo: 'modo', id: L.tx, modo: 'cifra' }); w.postMessage({ tipo: 'modo', id: L.rx, modo: 'estricto' });
  }
  function ponCapa(pc) {
    if (!L || !L.tx) return;
    const w = trabajador(); L.puestos = L.puestos || new WeakSet();
    for (const tr of pc.getTransceivers()) {
      const kind = tr.receiver && tr.receiver.track ? tr.receiver.track.kind : '';
      if (!kind) continue;
      if (tr.sender && !L.puestos.has(tr.sender)) { tr.sender.transform = new RTCRtpScriptTransform(w, { op: 'cifra', k: L.tx, kind }); L.puestos.add(tr.sender); }
      if (tr.receiver && !L.puestos.has(tr.receiver)) { tr.receiver.transform = new RTCRtpScriptTransform(w, { op: 'descifra', k: L.rx, kind }); L.puestos.add(tr.receiver); }
    }
  }
  function codecs(pc) {
    if (!L || !obrero) return;
    try {
      const sdp = ((pc.remoteDescription && pc.remoteDescription.sdp) || '') + ((pc.localDescription && pc.localDescription.sdp) || ''); const mapa = {};
      for (const m of sdp.matchAll(/a=rtpmap:(\d+) ([A-Za-z0-9-]+)\/\d+/g)) mapa[m[1]] = ('video/' + m[2]).toLowerCase();
      const resp = pc.localDescription && pc.localDescription.type === 'answer' ? pc.localDescription.sdp : pc.remoteDescription && pc.remoteDescription.type === 'answer' ? pc.remoteDescription.sdp : '';
      const pt = (/\nm=video \d+ [A-Z/]+ (\d+)/.exec(resp || '') || [])[1], defecto = pt && mapa[pt] ? mapa[pt] : '';
      obrero.postMessage({ tipo: 'codecs', id: L.tx, mapa, defecto }); obrero.postMessage({ tipo: 'codecs', id: L.rx, mapa, defecto });
    } catch (_) {}
  }
  async function medios() {
    const AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    const VIDEO = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
    try { return await navigator.mediaDevices.getUserMedia({ audio: AUDIO, video: VIDEO }); }
    catch (_) { return navigator.mediaDevices.getUserMedia({ audio: AUDIO }); }
  }
  function conexion() {
    const ice = R && R.ice && R.ice.length ? R.ice : [];
    if (!LOCAL && !ice.length) throw new Error('sin-turn');
    const pc = new RTCPeerConnection({ iceServers: ice, iceTransportPolicy: LOCAL && !ice.length ? 'all' : 'relay', bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' });
    pc.addEventListener('track', (e) => { ponCapa(pc); if (!L) return; L.remoto = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]); emite('llamada', estadoLlamada()); });
    pc.addEventListener('connectionstatechange', () => {
      if (!L || L.pc !== pc) return;
      const st = pc.connectionState;
      if (st === 'connected' && L.estado !== 'hablando') { L.estado = 'hablando'; L.t0 = Date.now(); clearTimeout(L.limite); L.limite = setTimeout(() => colgar('prueba'), PRUEBA_MS); emite('llamada', estadoLlamada()); }
      else if (st === 'failed') colgar('fallo');
    });
    return pc;
  }
  const reunido = (pc) => new Promise((res) => {
    if (pc.iceGatheringState === 'complete') return res();
    const f = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', f); res(); } };
    pc.addEventListener('icegatheringstatechange', f); setTimeout(res, 4000);
  });
  function puedeLlamar() {
    if (!PQM) return 'sin-capa';
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return 'sin-medios';
    if (!S || !S.conectado || !enLinea(S)) return 'sin-sesion';
    if (!LOCAL && !(R.ice && R.ice.length)) return 'sin-turn';
    return '';
  }
  async function llamar() {
    const s = S, por = puedeLlamar(); if (por) { emite('llamada-aviso', por); return false; }
    if (L || s.llamadaHecha) { if (s.llamadaHecha) emite('llamada-aviso', 'prueba-usada'); return false; }
    L = { id: C.hex(C.azar(8)), rol: 'llama', estado: 'preparando', video: true, sid: s.sesion.sid };
    emite('llamada', estadoLlamada());
    try {
      const st = await medios(); if (!L) { st.getTracks().forEach((t) => t.stop()); return false; }
      L.local = st; L.video = st.getVideoTracks().length > 0;
      await llavesLlamada(s.sesion.medios, L.id, true);
      const pc = L.pc = conexion();
      for (const t of st.getTracks()) pc.addTrack(t, st);
      ponCapa(pc);
      await pc.setLocalDescription(await pc.createOffer()); codecs(pc);
      await reunido(pc); if (!L || L.pc !== pc) return false;
      L.estado = 'llamando'; emite('llamada', estadoLlamada());
      enviaControl(s, { tipo: 'llamada', que: 'oferta', id: L.id, sid: L.sid, sdp: pc.localDescription.sdp, video: L.video ? 1 : 0 });
      clearTimeout(L.espera); L.espera = setTimeout(() => { if (L && L.estado === 'llamando') colgar('sin-respuesta'); }, 45000);
      return true;
    } catch (e) { console.warn('llamada', e); const m = String(e && e.message); colgar(m === 'sin-turn' ? 'sin-turn' : /Permission|NotAllowed/i.test(String(e && e.name) + m) ? 'sin-permiso' : 'fallo'); return false; }
  }
  async function contestar() {
    const s = S; if (!L || L.estado !== 'entrante' || !s) return false;
    const ses = s.sesiones.get(L.sid); if (!ses) { colgar('fallo'); return false; }
    L.estado = 'preparando'; emite('llamada', estadoLlamada());
    try {
      const st = await medios(); if (!L) { st.getTracks().forEach((t) => t.stop()); return false; }
      L.local = st;
      await llavesLlamada(ses.medios, L.id, false);
      const pc = L.pc = conexion();
      await pc.setRemoteDescription({ type: 'offer', sdp: L.oferta }); ponCapa(pc);
      for (const t of st.getTracks()) pc.addTrack(t, st);
      ponCapa(pc);
      await pc.setLocalDescription(await pc.createAnswer()); codecs(pc);
      await reunido(pc); if (!L || L.pc !== pc) return false;
      L.estado = 'conectando'; emite('llamada', estadoLlamada());
      enviaControl(s, { tipo: 'llamada', que: 'respuesta', id: L.id, sdp: pc.localDescription.sdp });
      return true;
    } catch (e) { console.warn('llamada', e); colgar(/Permission|NotAllowed/i.test(String(e && e.name) + String(e && e.message)) ? 'sin-permiso' : 'fallo'); return false; }
  }
  async function llamadaRecibe(s, j) {
    const que = String(j.que || ''), id = String(j.id || '');
    if (que === 'oferta') {
      if (L || s.llamadaHecha) { enviaControl(s, { tipo: 'llamada', que: 'ocupado', id }); return; }
      if (!PQM) { enviaControl(s, { tipo: 'llamada', que: 'sin-capa', id }); emite('llamada-aviso', 'sin-capa'); return; }
      if (typeof j.sdp !== 'string' || j.sdp.length > 200000 || !s.sesiones.has(String(j.sid || ''))) return;
      L = { id, rol: 'contesta', estado: 'entrante', video: !!j.video, oferta: j.sdp, sid: String(j.sid) };
      emite('llamada', estadoLlamada());
      return;
    }
    if (!L || L.id !== id) return;
    if (que === 'respuesta' && L.rol === 'llama' && L.pc && typeof j.sdp === 'string') {
      clearTimeout(L.espera); L.estado = 'conectando'; emite('llamada', estadoLlamada());
      try { await L.pc.setRemoteDescription({ type: 'answer', sdp: j.sdp }); codecs(L.pc); ponCapa(L.pc); } catch (e) { console.warn(e); colgar('fallo'); }
      return;
    }
    if (que === 'colgar' || que === 'rechaza' || que === 'ocupado' || que === 'sin-capa') colgar(que === 'colgar' ? 'suyo' : que, true);
  }
  function colgar(motivo, suyo) {
    if (!L) return;
    const x = L; L = null;
    if (!suyo && S) enviaControl(S, { tipo: 'llamada', que: 'colgar', id: x.id });
    clearTimeout(x.limite); clearTimeout(x.espera);
    try { if (x.pc) x.pc.close(); } catch (_) {}
    try { if (x.local) x.local.getTracks().forEach((t) => t.stop()); } catch (_) {}
    try { if (obrero && x.tx) { obrero.postMessage({ tipo: 'olvida', id: x.tx }); obrero.postMessage({ tipo: 'olvida', id: x.rx }); } } catch (_) {}
    // la prueba: una videollamada por conversación, de hasta 3 minutos
    if (S && x.t0) S.llamadaHecha = true;
    emite('llamada', { estado: 'fin', motivo: motivo || '', duro: x.t0 ? Date.now() - x.t0 : 0, prueba: !!(S && S.llamadaHecha) });
  }
  function rechazar() { if (L && L.estado === 'entrante') { const id = L.id; L = null; if (S) enviaControl(S, { tipo: 'llamada', que: 'rechaza', id }); emite('llamada', { estado: 'fin', motivo: 'rechazada' }); } }
  function micro(si) { if (!L || !L.local) return; L.mic = !!si; for (const t of L.local.getAudioTracks()) t.enabled = !!si; emite('llamada', estadoLlamada()); }
  function camara(si) { if (!L || !L.local) return; L.cam = !!si; for (const t of L.local.getVideoTracks()) t.enabled = !!si; emite('llamada', estadoLlamada()); }

  // ---------- final: alarma, terminar y borrar ----------
  function quitaCodigo(s) { if (s && s.ucod) { try { R.retira(s.ucod.buzon); } catch (_) {} s.ucod = null; } }
  async function alarma(s, por) {
    if (s.fin) return;
    try { if (s.sesion) { const b = await sella(s, { tipo: 'alarma', por }); if (b) R.manda(s.id, s.suId, b); } } catch (_) {}
    finaliza(s, 'alarma', por);
  }
  function termina(motivo) {
    const s = S; if (!s) return;
    if (s.sesion && enLinea(s)) sella(s, { tipo: 'destruir' }).then((b) => { if (b) R.manda(s.id, s.suId, b); }).catch(() => {}).finally(() => finaliza(s, motivo || 'mio'));
    else finaliza(s, motivo || 'mio');
  }
  function finaliza(s, motivo, por) {
    if (s.fin) return;
    s.fin = true;
    if (L) colgar('fin', motivo !== 'mio');
    clearTimeout(s.reintento); clearTimeout(s.plazoPalabras);
    quitaCodigo(s);
    try { R.sale(s.id); } catch (_) {}
    try { for (const x of s.sesiones.values()) { x.envio.borra(); x.recibo.borra(); x.medios.fill(0); } } catch (_) {}
    try { s.psk.fill(0); s.semilla.fill(0); s.dsaSec.fill(0); if (s.nIMio) s.nIMio.fill(0); if (s.nRMio) s.nRMio.fill(0); for (const v of s.efs.values()) if (v && v.kem) v.kem.dk.fill(0); for (const e of s.envios.values()) e.llave.fill(0); } catch (_) {}
    s.sesiones.clear(); s.sesion = null; s.efs.clear(); s.tic = []; s.envios.clear(); s.recibos.clear(); s.idB = null;
    if (S === s) S = null;
    emite('fin', { motivo, por: por || '' });
  }
  addEventListener('pagehide', () => { if (S) termina('cierra'); });

  window.ElixireMotor = {
    on, prepara, crea, entra, termina, envia, escribe, comprobadas, enviaArchivo, cancelaArchivo,
    llamar, contestar, rechazar, colgar: () => colgar('mio'), micro, camara,
    puedeLlamar, estadoLlamada, get activa() { return !!S; }, get conectada() { return !!(S && S.conectado); },
    get palabras() { return S && S.palabras ? S.palabras.slice() : null; }, get red() { return !!(R && R.abierto); },
    PRUEBA_MS, LIMITE, capaMedios: PQM, disponible: () => B.hayBlindada(),
  };
  // solo en pruebas locales: en qué punto está el acuerdo (sin ninguna clave)
  if (LOCAL) window.ElixireMotor._estado = () => (S ? { inicio: soyInicio(S), huella: !!S.huella, sesiones: S.sesiones.size, confirmada: !!(S.sesion && S.sesion.confirmada), conectado: S.conectado, cwMio: !!S.cwMio, nIMio: !!S.nIMio, cwSuyo: !!S.cwSuyo, nRMio: !!S.nRMio, nRSuyo: !!S.nRSuyo, revela: !!S.revela, palabrasN: !!S.palabrasN, palabras: !!S.palabras, miembros: S.miembros.size, suId: !!S.suId } : null);
})();
