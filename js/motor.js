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
//   · Llamada en grupo, hasta 4 (dueño, 23 nov 11:50: «añadir participante, que cualquiera de los dos pueda añadir»; decidido:
//     «cada uno con cada uno»): un motor por cada otra persona. window.ElixireMotor es la conversación de siempre; los demás los
//     crea grupo.js con window.ElixireMotorNuevo({ medios }) y cada pareja tiene su propia sesión poscuántica y su propia llamada.
'use strict';
const creaMotor = (OPC) => {
  OPC = OPC || {};
  const C = window.GuardianaCripto, B = C && C.B;
  if (!C || !B || !window.GuardianaRele) return null;
  const LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
  const q = new URLSearchParams(location.search);
  const TIC_MS = (LOCAL && +q.get('latido')) || 500;
  // claves nuevas cada minuto (agencia, ronda 96, e: «trinquete poscuántico continuo», las dos voces; antes, cada 5 minutos)
  const RENUEVA_MS = (LOCAL && +q.get('renueva') * 1000) || 60 * 1000;
  // Sin límite de tiempo por ahora (dueño, 16:11: «quita el límite de 3 minutos, por favor; ya te diré yo cuándo lo volvemos a
  // poner»). Para volver a ponerlo: SIN_LIMITE = false.
  const SIN_LIMITE = true;
  const PRUEBA_MS = (LOCAL && +q.get('prueba') * 1000) || (SIN_LIMITE ? 24 * 3600 * 1000 : 3 * 60 * 1000);
  const sinLimite = SIN_LIMITE && !(LOCAL && +q.get('prueba'));
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
    R.on('abierto', () => { emite('red', true); if (L && L.t0 && L.pc && L.pc.connectionState !== 'connected') recupera('fallo'); });
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
  // S: la conversación. T: solo en el ordenador, y solo mientras se pasa la conversación al móvil, la sesión con ese móvil.
  // Los avisos de una sesión de emparejamiento salen con el prefijo «par-» (la pantalla no los confunde con la conversación).
  let S = null, T = null;
  const av = (s, t, x) => emite(s.canal ? s.canal + '-' + t : t, x);
  const deSala = (sala) => (S && S.id === sala ? S : T && T.id === sala ? T : null);
  async function nuevaSesion(semilla, rol, opc) {
    opc = opc || {};
    const d = await B.deSemilla(semilla);
    const reposo = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    const n = await B.creaIdentidad(reposo);
    const s = {
      id: d.sala, presentacion: d.presentacion, psk: d.psk, semilla, rol, idB: n.guardar, dsaSec: n.dsaSec,
      miHuella: await B.huella(n.guardar.firmaPub, n.guardar.acuerdoPub, n.guardar.dsaPub),
      yo: C.hex(C.azar(8)), miembros: new Set(), suId: null, huella: null, sesiones: new Map(), sesion: null, efs: new Map(),
      epocasVistas: new Set(), tic: [], partes: new Map(), envios: new Map(), recibos: new Map(), conectado: false, fin: false, creado: Date.now(),
      canal: opc.canal || '', papel: opc.papel || '', continua: !!opc.continua, usado: opc.usado || 0, reanuda: !!opc.reanuda, llamaYo: !!opc.llamaYo, dest: opc.dest || '',
    };
    if (!opc.aparte && !opc.continua && T && T.esperaVuelta) finaliza(T, 'nueva', '', true);
    if (opc.aparte) T = s; else S = s;
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

  // Invitar desde el móvil (dueño, 15:15: «con los mínimos clics posibles… en el móvil no hará falta meter el código»): la semilla
  // nace en la página y viaja entera (256 bits) en el enlace de WhatsApp, en el fragmento; no hay código ni sobre en el relé. Si el
  // teléfono cierra la página mientras se está en WhatsApp, al volver se entra en la misma sala con la misma semilla (puerta.js).
  // No espera al relé: la sala se pide en cuanto haya conexión (rele.js la vuelve a pedir al reconectar).
  async function invitaSemilla(semilla) {
    if (!(semilla instanceof Uint8Array) || semilla.length !== 32) return { ok: false, por: 'no-vale' };
    if (!B.hayBlindada()) return { ok: false, por: 'sin-pq' };
    if (S) termina('nueva');
    await nuevaSesion(semilla, 'crea');
    return { ok: true };
  }

  // Enlace de máxima protección (agencia, ronda 96, b: las dos voces): la semilla entera (256 bits) en el fragmento «#e=», que el
  // navegador no manda a ningún servidor. Al pedirlo, el código sale del relé: desde ese momento solo vale el enlace.
  function enlace() {
    const s = S; if (!s || s.fin || s.rol !== 'crea' || s.huella) return null;
    quitaCodigo(s);
    return location.origin + location.pathname + '#e=' + C.b64u(s.semilla);
  }
  async function entraSemilla(semilla) {
    if (!(semilla instanceof Uint8Array) || semilla.length !== 32) return { ok: false, por: 'no-vale' };
    if (!B.hayBlindada()) return { ok: false, por: 'sin-pq' };
    if (!(await conectado())) return { ok: false, por: 'sin-rele' };
    if (S) termina('nueva');
    await nuevaSesion(semilla, 'entra');
    return { ok: true };
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
    if (s.huella && C.hex(s.huella) !== C.hex(huella)) { R.manda(s.id, de, new Uint8Array([5])); s.intrusos = (s.intrusos || 0) + 1; av(s, 'intruso', s.intrusos); return; }
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
    if (nueva) { quitaCodigo(s); av(s, 'llega'); }
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
    av(s, 'claves', { renovada, n: s.renovaciones });
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
    av(s, 'palabras', w.slice());
    if (s.canal === 'par' && s.esperaVuelta) av(s, 'vuelve');
    // ir y volver, como en GUARDIANA: quien da la llamada no espera a que nadie compare palabras
    if (s.canal === 'par' && s.papel === 'pc' && T === s && !s.trasp) setTimeout(() => { if (T === s && !s.trasp && !s.fin) confirmaMovil(); }, 300);
  }
  function plazoPalabras(s) {
    if (s.palabras || s.plazoPalabras) return;
    s.plazoPalabras = setTimeout(() => { if (!s.palabras && !s.fin) alarma(s, 'sin-palabras'); }, PLAZO_PALABRAS_MS);
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
  const APARTE = new Set(['ok', 'palabras', 'palabras-ok', 'alarma', 'destruir', 'llamada', 'archivo-ack', 'archivo-cancel', 'par', 'traspaso', 'traspaso-ok', 'grupo']);
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
  setInterval(() => { if (S) tic(S); if (T) tic(T); }, TIC_MS);
  // claves nuevas cada 5 minutos: quien inicia vuelve a presentarse; las anteriores se borran
  setInterval(() => { for (const s of [S, T]) if (s && !s.fin && s.sesion && s.sesion.confirmada && soyInicio(s) && enLinea(s)) enCola(s, () => presenta(s, null, true)); }, RENUEVA_MS);

  async function recibeMensaje(s, de, b) {
    if (b.length < 13 + 16) return;
    const sid = C.hex(b.subarray(1, 9)), n = new DataView(b.buffer, b.byteOffset).getUint32(9);
    const ses = s.sesiones.get(sid);
    if (!ses) { R.manda(s.id, de, new Uint8Array([4])); return; }
    let j;
    try { const k = await ses.recibo.para(n); j = JSON.parse(C.td.decode(await C.abre(k, n, b.subarray(13), C.cat(b.subarray(0, 13), ses.hash)))); k.fill(0); }
    catch (e) { if (!/repetido|saltados/.test(String(e && e.message))) av(s, 'integridad'); return; }
    if (s.suId !== de) return;
    if (!ses.confirmada) {
      ses.confirmada = true; plazoPalabras(s);
      if (!s.conectado) {
        s.conectado = true; clearTimeout(s.plazoCont);
        if (s.continua) { s.comprobadas = true; av(s, 'continua', { movil: s.papel === 'movil', reanuda: s.reanuda, dest: s.dest || '', tel: !!TEL }); if (s.reanuda && s.llamaYo) setTimeout(() => { if (S === s && !L) llamar(); }, 1500); }
        else av(s, 'conectado');
      }
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
    // en la sesión de emparejamiento con el móvil no hay conversación: solo el acuerdo, las palabras y el traspaso
    if (s.canal === 'par' && !['parte', 'latido', 'ok', 'palabras', 'palabras-ok', 'alarma', 'destruir', 'par'].includes(j.tipo)) return;
    switch (j.tipo) {
      case 'par': return recibePar(s, j);
      case 'traspaso': return recibeTraspaso(s, j);
      case 'traspaso-ok': if (s.trasp) { s.trasp.okSuyo = true; acabaTraspaso(); } return;
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
      case 'leido': if (Array.isArray(j.ids)) emite('leido', j.ids.slice(0, 50).map((x) => String(x).slice(0, 40))); return;
      case 'escribe': emite('escribe', !!j.si); return;
      case 'borra': { const id = String(j.id || '').slice(0, 40); if (id) emite('borrado', id); return; }
      case 'palabras': return recibeRevelacion(s, j);
      case 'palabras-ok': s.revelaOk = true; return;
      case 'comprobadas': s.suComprobadas = true; emite('su-comprobacion'); return;
      case 'archivo': return recibeAnuncio(s, j);
      case 'archivo-ack': return avanzaEnvio(s, j);
      case 'archivo-cancel': return cancelaArchivo(String(j.id || ''), true);
      case 'llamada': return llamadaRecibe(s, j);
      case 'grupo': {
        // la llamada en grupo: solo lo que se espera, con tamaños fijos (quién soy, a quién conectar y con qué semilla)
        const g = { que: String(j.que || '').slice(0, 16), id: String(j.id || '').slice(0, 16) };
        if (typeof j.semilla === 'string' && /^[A-Za-z0-9_-]{43}$/.test(j.semilla)) g.semilla = j.semilla;
        if (typeof j.con === 'string') g.con = j.con.slice(0, 16);
        if (j.rol === 'crea' || j.rol === 'entra') g.rol = j.rol;
        g.n = Math.max(0, Math.min(8, j.n | 0));
        emite('grupo', g); return;
      }
      case 'alarma': return finaliza(s, 'alarma-suya');
      case 'destruir': return finaliza(s, 'suyo');
      default: return;
    }
  }

  // ---------- el relé: quién está en la sala y lo que llega ----------
  function alSala(sala, miembros) {
    const s = deSala(sala); if (!s) return;
    s.miembros = new Set(miembros); s.sesion = null;
    if (miembros.length && (!s.suId || miembros.includes(s.suId))) enCola(s, () => presenta(s, null, true));
  }
  function alLlega(sala, quien) {
    const s = deSala(sala); if (!s) return;
    s.miembros.add(quien);
    if (!s.suId || s.suId === quien) { s.sesion = null; enCola(s, () => presenta(s, null, true)); }
    if (s.suId === quien) av(s, 'vuelve');
  }
  function alSale(sala, quien) {
    const s = deSala(sala); if (!s) return;
    s.miembros.delete(quien);
    if (s.traspasando || s.trasp) return; // se está pasando al móvil: no es que se haya ido
    if (s.suId === quien) { s.sesion = null; av(s, 'se-va'); if (L && s === S) colgar('se-fue', true); }
  }
  function alTrama(sala, de, b) {
    const s = deSala(sala); if (!s || !b.length) return;
    enCola(s, async () => {
      if (b[0] === 1) await recibePresentacion(s, de, b);
      else if (b[0] === 2) await recibeMensaje(s, de, b);
      else if (b[0] === 3) await recibeTrozo(s, de, b);
      else if (b[0] === 4) { if (s.suId === de) await presenta(s, null); }
      else if (b[0] === 5) { if (!s.huella) av(s, 'ocupada'); }
    });
  }

  // ---------- texto ----------
  // (en grupo, el mismo mensaje sale por cada pareja con el mismo identificador: así «Borrar para todos» lo borra en todos)
  function envia(texto, idFijo) {
    const s = S; texto = String(texto || '').trim();
    if (!s || !s.conectado || s.fin || !texto) return null;
    const m = { tipo: 'texto', id: /^[0-9a-f]{16,24}$/.test(idFijo || '') ? idFijo : C.hex(C.azar(12)), t: Date.now(), texto: texto.slice(0, 20000) };
    aTic(s, m);
    return { id: m.id, texto: m.texto, t: m.t, dir: 'mia' };
  }
  // borrar un mensaje o un archivo para los dos (dueño, 18:20): va por la sesión encriptada; la otra pantalla lo quita
  // confirmación de lectura (dueño, 23:20): quien recibe avisa de qué mensajes ha visto con el chat delante
  function leidos(ids) { const s = S; if (!s || !s.conectado || s.fin || !Array.isArray(ids) || !ids.length) return false; return enviaControl(s, { tipo: 'leido', ids: ids.slice(0, 50).map((x) => String(x).slice(0, 40)) }); }
  function borra(id) { const s = S; if (!s || !s.conectado || s.fin || !id) return false; aTic(s, { tipo: 'borra', id: String(id).slice(0, 40) }); return true; }
  let escribeT = 0;
  function escribe() { const s = S; if (!s || !s.conectado || Date.now() - escribeT < 2500) return; escribeT = Date.now(); s.tic = s.tic.filter((x) => x.tipo !== 'escribe'); aTic(s, { tipo: 'escribe', si: 1 }); }
  function comprobadas() { const s = S; if (!s || !s.conectado) return; s.comprobadas = true; enviaControl(s, { tipo: 'comprobadas' }); }

  // ---------- archivos ----------
  // Cada archivo lleva su llave AES-256-GCM al azar dentro del anuncio (que va por la sesión). Los trozos van aparte, todos del mismo
  // tamaño (los últimos bytes, rellenos), y cada uno autentica su número y el total: nadie puede cambiarlos, quitarlos ni reordenarlos.
  const TROZO = 48 * 1024, VENTANA = 32, LIMITE = 1024 * 1024 * 1024, ATRASO = 6 * 1024 * 1024;
  const adTrozo = (cab, partes) => C.cat(cab, C.te.encode('ELIXIRE archivo v1\n' + partes));
  function enviaArchivo(file, idFijo) {
    const s = S; if (!s || !s.conectado || s.fin || !file) return { ok: false, por: 'sin-sesion' };
    if (file.size > LIMITE) return { ok: false, por: 'grande' };
    const id = /^[0-9a-f]{16}$/.test(idFijo || '') && !s.envios.has(idFijo) ? idFijo : C.hex(C.azar(8)), llave = C.azar(32), partes = Math.max(1, Math.ceil(file.size / TROZO));
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
    emite('archivo', { id, dir: 'suya', nombre: r.nombre, tam, mime: r.mime });
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
  // La capa poscuántica de la imagen y el sonido: con la interfaz de hoy (RTCRtpScriptTransform: Safari, Firefox, Chrome reciente) o
  // con la anterior de Chrome (createEncodedStreams: Brave, versiones anteriores, WebView de Android). Si uno de los dos navegadores no
  // tiene ninguna, la llamada se hace igual, con el encriptado estándar del navegador, y se dice en la pantalla (dueño, 16:16–16:18:
  // «quiero que se pueda hacer la llamada… que diga que ya no pasa poscuántica, que se hace normal»; «la llamada tiene que entrar
  // automática… luego en la pantalla ya dirá si es poscuántica o es normal, dependiendo de los navegadores de cada uno»).
  const PQ_SCRIPT = typeof window.RTCRtpScriptTransform === 'function';
  const PQ_FLUJOS = !PQ_SCRIPT && typeof window.RTCRtpSender === 'function' && 'createEncodedStreams' in window.RTCRtpSender.prototype;
  const PQM = (PQ_SCRIPT || PQ_FLUJOS) && typeof window.Worker === 'function' && typeof window.RTCPeerConnection === 'function';
  let L = null, obrero = null;
  function trabajador() {
    if (!obrero) {
      obrero = new Worker('js/medios-pq.js?v=20261119-2');
      obrero.onmessage = (e) => { const m = e.data || {}; if (m.tipo === 'visto' && L && L.rx === m.id) { L.visto = true; emite('llamada', estadoLlamada()); } if (m.tipo === 'fallo' && L && L.estado === 'hablando' && m.cuenta && m.cuenta.seguidos > 60) emite('llamada-aviso', 'descifra'); };
    }
    return obrero;
  }
  // La prueba: 3 minutos de videollamada por conversación, en una llamada o en varias (dueño, 14:11: «poder volver a llamar si se
  // cuelga la llamada en el móvil… como la tenemos en Guardiana»): lo que cuenta es el tiempo hablado.
  const restante = (s) => Math.max(0, PRUEBA_MS - ((s && s.usado) || 0));
  const estadoLlamada = () => (L ? { estado: L.estado, rol: L.rol, video: L.video, t0: L.t0 || 0, limite: L.tope || restante(S), mic: L.mic !== false, cam: L.cam !== false, vozCambiada: !!L.vozCambiada, caraOculta: !!L.caraOculta, pantalla: !!L.pantalla, otroFiltro: L.otroFiltro || null, capa: !!L.visto, sinCapa: !!L.sinCapa, cruzada: !!L.cruzada, local: (L.caraOculta && ocu && ocu.vista) || L.local || null, remoto: L.remoto || null, mira: L.mira || 'user' } : { estado: 'libre' });
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
    if (!L || !L.tx || L.sinCapa) return;
    const w = trabajador(); L.puestos = L.puestos || new WeakSet();
    const pon = (x, op, k, kind) => {
      if (PQ_SCRIPT) { x.transform = new RTCRtpScriptTransform(w, { op, k, kind }); return; }
      const f = x.createEncodedStreams(); w.postMessage({ tipo: 'flujo', op, k, kind, readable: f.readable, writable: f.writable }, [f.readable, f.writable]);
    };
    for (const tr of pc.getTransceivers()) {
      const kind = tr.receiver && tr.receiver.track ? tr.receiver.track.kind : '';
      if (!kind) continue;
      if (tr.sender && !L.puestos.has(tr.sender)) { try { pon(tr.sender, 'cifra', L.tx, kind); } catch (e) { console.warn('capa', e); } L.puestos.add(tr.sender); }
      if (tr.receiver && !L.puestos.has(tr.receiver)) { try { pon(tr.receiver, 'descifra', L.rx, kind); } catch (e) { console.warn('capa', e); } L.puestos.add(tr.receiver); }
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
  // ---------- la calidad (como en GUARDIANA, llamada.js; dueño, 16:02: «aplica la tecnología de GUARDIANA para que la llamada se
  // adapte a la conexión y pueda verse a máxima calidad, incluso mejor que FaceTime… aplica todo lo necesario para vernos muy bien») --
  //   · la cámara, a lo más que dé: en el teléfono hasta 1080p y en el ordenador hasta 4K, a 30 imágenes por segundo;
  //   · los códecs, por calidad y por compatibilidad: entre teléfonos, primero el H.264 «constrained baseline», el que todos saben
  //     codificar y decodificar (en GUARDIANA, del iPhone al Android la imagen llegaba en negro cuando el iPhone ofrecía H.264 High);
  //     en el ordenador, VP9; sin AV1 (con la capa poscuántica);
  //   · la imagen arranca nítida (1,5 Mb/s desde el primer segundo, no 300 kb/s) y sube hasta 20 Mb/s (4K) en el teléfono y en el
  //     ordenador; si falta red, se conserva la fluidez y baja la resolución, que vuelve a subir en cuanto hay red;
  //   · la voz: Opus a 48 kHz, hasta 96 kb/s, con corrección de errores, y va por delante de la imagen cuando la red se aprieta.
  const TEL = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || ''));
  const MAX_BPS_AUDIO = 96000, MAX_BPS_VIDEO = 20000000; // 4K en el móvil y en el ordenador (dueño, 23 nov 07:31)
  // (dueño, 23 nov 09:19: «nos va muy lento a los dos») el techo de la imagen, según el escalón en que esté: lo justo para que se vea
  // nítida sin llenar la red (con 20 Mb/s para todo, en una red justa o lejos del relé, se ahogaba y la llamada se cortaba)
  const BPS = { 2160: 16000000, 1440: 9000000, 1080: 5000000, 720: 2500000, 540: 1200000 };
  function techoVideo(x, h) {
    try {
      const snd = x && x.pc && x.pc.getSenders().find((q) => q.track && q.track.kind === 'video'); if (!snd) return;
      const p = snd.getParameters(); if (!p.encodings || !p.encodings[0]) return;
      const b = Math.min(MAX_BPS_VIDEO, BPS[h] || BPS[1080]); if (p.encodings[0].maxBitrate === b) return;
      p.encodings[0].maxBitrate = b; snd.setParameters(p).catch(() => {});
    } catch (_) {}
  }
  async function medios() {
    // (en grupo, las llamadas con las demás personas usan copias de la cámara y el micrófono que ya están abiertos: no se abren
    // otra vez; en el iPhone solo puede haber una cámara abierta)
    if (OPC.medios) { try { const st = await OPC.medios(); if (st && st.getTracks().length) return st; } catch (_) {} }
    const AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: { ideal: 48000 }, sampleSize: { ideal: 16 }, voiceIsolation: { ideal: true } };
    const VIDEO = TEL ? { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' } : { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' };
    let st;
    try { st = await navigator.mediaDevices.getUserMedia({ audio: AUDIO, video: VIDEO }); }
    catch (e) {
      // si la cámara no da tanto (o algún navegador no admite alguna petición), lo normal
      try { st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } }); }
      catch (_) { st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    }
    for (const t of st.getVideoTracks()) { try { t.contentHint = 'motion'; } catch (_) {} }
    return st;
  }
  // la cámara y el micrófono, pedidos antes (al tocar «Entrar a la llamada», o cuando llega la otra persona a quien invitó): cuando
  // empieza la llamada ya están listos. Si en minuto y medio no se usan, se apagan.
  let mediosPrevios = null, mediosPreviosT = null;
  function preparaMedios() {
    if (mediosPrevios || L || !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return;
    const p = mediosPrevios = medios().catch(() => null);
    clearTimeout(mediosPreviosT); mediosPreviosT = setTimeout(() => { if (mediosPrevios !== p) return; mediosPrevios = null; p.then((st) => { if (st && !(L && L.local === st)) st.getTracks().forEach((t) => t.stop()); }); }, 90000);
  }
  async function tomaMedios() {
    if (mediosPrevios) { const p = mediosPrevios; mediosPrevios = null; clearTimeout(mediosPreviosT); const st = await p; if (st && st.getTracks().length && st.getTracks().every((t) => t.readyState === 'live')) return st; }
    return medios();
  }
  // Cómo va la llamada (dueño, 16:44: «cuando la llamada se establezca y sea poscuántica, que lo indique; y cuando no, que diga el
  // grado de encriptación que tiene… para que la persona sepa en todo momento lo que está pasando con la llamada y la calidad»):
  // cada 2 s, de las estadísticas del propio navegador, el encriptado del transporte que se ha negociado de verdad (DTLS y SRTP) y la
  // calidad (pérdidas en lo que llega e ida y vuelta).
  function vigilaCalidad(x) {
    clearInterval(x.calT); let antes = null;
    x.calT = setInterval(async () => {
      if (L !== x || !x.pc) { clearInterval(x.calT); return; }
      try {
        const st = await x.pc.getStats(); let par = null, tra = null, v = null, o = null; const rx = { lost: 0, recv: 0 };
        st.forEach((r) => {
          if (r.type === 'transport') tra = r;
          if (r.type === 'candidate-pair' && r.state === 'succeeded' && (r.nominated || r.selected) && !par) par = r;
          if (r.type === 'inbound-rtp' && !r.isRemote) { rx.lost += r.packetsLost || 0; rx.recv += r.packetsReceived || 0; if (r.kind === 'video') v = r; }
          if (r.type === 'outbound-rtp' && !r.isRemote && r.kind === 'video' && (!o || (r.frameHeight || 0) > (o.frameHeight || 0))) o = r;
        });
        if (tra && tra.selectedCandidatePairId && st.get(tra.selectedCandidatePairId)) par = st.get(tra.selectedCandidatePairId);
        const lost = antes ? Math.max(0, rx.lost - antes.lost) : 0, recv = antes ? Math.max(0, rx.recv - antes.recv) : 0; antes = rx;
        const perdida = lost + recv > 0 ? lost / (lost + recv) : 0, rtt = par && par.currentRoundTripTime != null ? par.currentRoundTripTime : null;
        const nivel = perdida < 0.015 && (rtt == null || rtt < 0.3) ? 'excelente' : perdida < 0.06 && (rtt == null || rtt < 0.6) ? 'buena' : 'debil';
        x.calidad = { nivel, rtt, perdida, ancho: (v && v.frameWidth) || 0, alto: (v && v.frameHeight) || 0, tls: (tra && tra.tlsVersion) || '', srtp: (tra && tra.srtpCipher) || '', dtls: (tra && tra.dtlsCipher) || '' };
        calidadAuto(x, o, v, par, perdida);
        emite('calidad', x.calidad);
      } catch (_) {}
    }, 2000);
  }
  // Calidad automática (dueño, 23 nov 07:32: «que detecte automáticamente la mejor calidad que pueda brindar el teléfono sin retrasarlo
  // y sin lag… siempre la mejor conexión y experiencia»). La cámara arranca en lo máximo que da (hasta 4K). De la red ya se ocupa el
  // navegador: baja la nitidez y conserva la fluidez. Aquí se cuida el propio equipo y el de la otra persona:
  //   · se arranca en Full HD; con 30 s seguidos de holgura en el equipo y red de sobra, sube un escalón (1440p, luego 4K, si la
  //     cámara lo da); si el equipo no da abasto al codificar (lo dice el navegador, o salen menos de 20 imágenes por segundo con la
  //     red bien), baja un escalón al momento (… → 720p → 540p); si al subir vuelve a ahogarse, se queda abajo 3 minutos (sin vaivenes);
  //   · si el equipo de la otra persona no da abasto al mostrar la imagen (pocas imágenes por segundo y descodificar le cuesta), se lo
  //     dice a este, que no pasa de ese escalón hasta que el otro vuelva a ir holgado.
  const NIV = [2160, 1440, 1080, 720, 540];
  const nivelDe = (alto) => { const i = NIV.findIndex((h) => h <= alto + 40); return i < 0 ? NIV.length - 1 : i; };
  function calidadAuto(x, o, v, par, perdida) {
    if (L !== x || x.estado !== 'hablando') return;
    const t = performance.now(), ac = x.ac || (x.ac = { n: null, tope: 0, malos: 0, buenos: 0, tCambio: 0, tSube: 0, bloqueo: 0, remoto: 0, rMalos: 0, rBuenos: 0, pedido: 0, tPide: 0, pedidos: 0, e0: null, d0: null });
    // 1) este equipo, al codificar
    const cam = x.local && x.local.getVideoTracks()[0];
    if (cam && cam.readyState === 'live' && cam.enabled && x.cam !== false && !x.caraOculta && !x.enChat && o && !topeGrupo) {
      if (ac.n == null) {
        // lo máximo que da la cámara (si el navegador lo dice) y en qué escalón arranca
        const s0 = cam.getSettings ? cam.getSettings() : {}, c0 = cam.getCapabilities ? cam.getCapabilities() : {}, mx = c0 && c0.width && c0.height && c0.width.max && c0.height.max ? Math.min(c0.width.max, c0.height.max) : 0;
        ac.n = nivelDe(Math.min(s0.width || 1080, s0.height || 1080)); ac.tope = mx ? Math.min(ac.n, nivelDe(mx)) : ac.n; ac.tCambio = t;
      }
      const e = { tt: o.totalEncodeTime || 0, n: o.framesEncoded || 0 }, encMs = ac.e0 && e.n > ac.e0.n ? (e.tt - ac.e0.tt) * 1000 / (e.n - ac.e0.n) : null; ac.e0 = e;
      const fps = o.framesPerSecond || 0, lim = o.qualityLimitationReason || 'none', red = par && par.availableOutgoingBitrate;
      const rtt = par && par.currentRoundTripTime != null ? par.currentRoundTripTime : null;
      const redMal = t - ac.tCambio > 15000 && (perdida > 0.05 || (rtt != null && rtt > 0.45) || (lim === 'bandwidth' && red && red < (BPS[NIV[ac.n]] || BPS[1080]) * 0.5));
      const mal = lim === 'cpu' || (fps > 0 && fps < 20 && encMs != null && encMs > 30 && perdida < 0.03 && (!red || red > 1500000)) || redMal;
      const bien = lim === 'none' && (fps === 0 || fps >= 27) && (encMs == null || encMs < 16) && perdida < 0.01 && (rtt == null || rtt < 0.3);
      ac.malos = mal ? ac.malos + 1 : 0; ac.buenos = bien ? ac.buenos + 1 : 0;
      if (ac.n != null && !ac.techo) { ac.techo = true; techoVideo(x, NIV[ac.n]); }
      const capRemoto = ac.remoto ? nivelDe(ac.remoto) : 0, minimo = Math.max(ac.tope, capRemoto);
      let nuevo = ac.n;
      if (ac.n < capRemoto) nuevo = capRemoto;
      else if (ac.malos >= 3 && ac.n < NIV.length - 1) { nuevo = ac.n + 1; if (t - ac.tSube < 25000) ac.bloqueo = t + 180000; }
      else if (ac.buenos >= 15 && ac.n > minimo && t > ac.bloqueo && t - ac.tCambio > 30000 && (!red || red >= (NIV[ac.n - 1] >= 2160 ? 14000000 : NIV[ac.n - 1] >= 1440 ? 9000000 : 4000000))) { nuevo = ac.n - 1; ac.tSube = t; }
      if (nuevo !== ac.n) {
        ac.n = nuevo; ac.malos = 0; ac.buenos = 0; ac.tCambio = t; const h = NIV[nuevo]; techoVideo(x, h);
        try { cam.applyConstraints({ width: { ideal: Math.round(h * 16 / 9) }, height: { ideal: h }, frameRate: { ideal: 30, max: 30 } }).catch(() => {}); } catch (_) {}
      }
      x.calidad.captura = NIV[ac.n];
    }
    // 2) el equipo de la otra persona, al mostrar lo que llega
    if (v && S) {
      const d = { tt: v.totalDecodeTime || 0, n: v.framesDecoded || 0, dr: v.framesDropped || 0 }, dec = ac.d0 && d.n > ac.d0.n ? (d.tt - ac.d0.tt) * 1000 / (d.n - ac.d0.n) : null;
      const tiradas = ac.d0 ? Math.max(0, d.dr - ac.d0.dr) / Math.max(1, d.n - ac.d0.n + Math.max(0, d.dr - ac.d0.dr)) : 0; ac.d0 = d;
      const fin = v.framesPerSecond || 0, alto = Math.min(v.frameWidth || 0, v.frameHeight || 0);
      const rMal = alto >= 720 && fin > 0 && fin < 20 && perdida < 0.03 && ((dec != null && dec > 25) || tiradas > 0.1);
      const rBien = fin >= 27 && (dec == null || dec < 12) && tiradas < 0.02;
      ac.rMalos = rMal ? ac.rMalos + 1 : 0; ac.rBuenos = rBien ? ac.rBuenos + 1 : 0;
      if (ac.rMalos >= 3 && t - ac.tPide > 20000) {
        ac.pedido = NIV[Math.min(NIV.length - 1, nivelDe(alto) + 1)]; ac.tPide = t; ac.rMalos = 0; ac.pedidos++;
        enviaControl(S, { tipo: 'llamada', que: 'calidad', id: x.id, alto: ac.pedido });
      } else if (ac.pedido && ac.rBuenos >= 30 && ac.pedidos < 2 && t - ac.tPide > 60000) {
        ac.pedido = 0; ac.tPide = t; enviaControl(S, { tipo: 'llamada', que: 'calidad', id: x.id, alto: 0 });
      }
    }
  }
  function prefiereCodecs(pc, compatible) {
    try {
      const caps = window.RTCRtpReceiver && RTCRtpReceiver.getCapabilities && RTCRtpReceiver.getCapabilities('video'); if (!caps || !caps.codecs) return;
      const env = window.RTCRtpSender && RTCRtpSender.getCapabilities && RTCRtpSender.getCapabilities('video');
      const tipo = (c) => String(c.mimeType).toLowerCase(), auxiliar = /\/(rtx|red|ulpfec|flexfec)$/i;
      const envia = env && env.codecs ? new Set(env.codecs.map(tipo)) : null;
      let lista = caps.codecs;
      if (envia) { const f = lista.filter((c) => auxiliar.test(c.mimeType) || envia.has(tipo(c))); if (f.some((c) => !auxiliar.test(c.mimeType))) lista = f; }
      const pesos = compatible ? { 'video/h264': 0, 'video/vp8': 1, 'video/vp9': 2 } : { 'video/vp9': 0, 'video/h264': 1, 'video/vp8': 2 };
      const perfilH264 = (c) => { const m = /profile-level-id=([0-9a-f]{6})/i.exec(c.sdpFmtpLine || ''); return m ? m[1].toLowerCase() : ''; };
      const peso = (c) => {
        const t = tipo(c), base = pesos[t] ?? 4;
        if (!compatible || t !== 'video/h264') return base * 10;
        const pl = perfilH264(c), pm1 = /packetization-mode=1/i.test(c.sdpFmtpLine || '');
        return /^42e0/.test(pl) && pm1 ? 0 : /^42/.test(pl) ? 1 : 10 * pesos['video/vp8'] + 5; // los demás perfiles, detrás de VP8
      };
      const orden = lista.filter((c) => !/\/av1$/i.test(c.mimeType)).sort((a, b) => peso(a) - peso(b));
      for (const tr of pc.getTransceivers()) { const k = (tr.sender.track && tr.sender.track.kind) || (tr.receiver.track && tr.receiver.track.kind); if (k === 'video' && tr.setCodecPreferences) tr.setCodecPreferences(orden); }
    } catch (e) { console.warn('códecs', e); }
  }
  function arranqueVideo(sdp) {
    try {
      const pts = [...String(sdp).matchAll(/a=rtpmap:(\d+) (H264|VP8|VP9)\/90000/gi)].map((m) => m[1]);
      for (const pt of pts) {
        const re = new RegExp('a=fmtp:' + pt + ' ([^\\r\\n]*)');
        if (re.test(sdp)) sdp = sdp.replace(re, (l, ps) => (/x-google-start-bitrate/.test(ps) ? l : l + ';x-google-start-bitrate=1500'));
        else sdp = sdp.replace(new RegExp('(a=rtpmap:' + pt + ' [^\\r\\n]*)'), '$1\r\na=fmtp:' + pt + ' x-google-start-bitrate=1500');
      }
    } catch (_) {}
    return sdp;
  }
  function altaFidelidad(sdp) {
    try {
      if (!/a=rtpmap:\d+ opus\/48000\/2/i.test(sdp || '')) return arranqueVideo(sdp);
      const fin = /\r\n$/.test(sdp) ? '\r\n' : '';
      const partes = String(sdp).replace(/\r\n$/, '').split(/\r\n(?=m=)/);
      let audio = 0;
      sdp = partes.map((sec) => {
        if (!/^m=audio /.test(sec)) return sec;
        const r = /a=rtpmap:(\d+) opus\/48000\/2/i.exec(sec); audio++;
        if (!r || audio > 1) return sec;
        const lineas = sec.split('\r\n'), pt = r[1];
        const quiero = { maxaveragebitrate: String(MAX_BPS_AUDIO), useinbandfec: '1', usedtx: '0', stereo: '0', 'sprop-stereo': '0', maxplaybackrate: '48000', 'sprop-maxcapturerate': '48000' };
        const linea = (x) => 'a=fmtp:' + pt + ' ' + Object.entries(x).map(([k, v]) => k + '=' + v).join(';');
        const i = lineas.findIndex((l) => l.startsWith('a=fmtp:' + pt + ' '));
        if (i >= 0) { const x = {}; for (const kv of lineas[i].slice(('a=fmtp:' + pt + ' ').length).split(';')) { const j = kv.indexOf('='); const k = (j < 0 ? kv : kv.slice(0, j)).trim(); if (k) x[k] = j < 0 ? '' : kv.slice(j + 1).trim(); } lineas[i] = linea(Object.assign(x, quiero)); }
        else { const k = lineas.findIndex((l) => l.startsWith('a=rtpmap:' + pt + ' ')); lineas.splice(k + 1, 0, linea(quiero)); }
        return lineas.join('\r\n');
      }).join('\r\n') + fin;
    } catch (_) {}
    return arranqueVideo(sdp);
  }
  // la descripción propia, con la alta fidelidad
  async function describe(pc, oferta, opc) { const d = oferta ? await pc.createOffer(opc) : await pc.createAnswer(); await pc.setLocalDescription({ type: d.type, sdp: altaFidelidad(d.sdp) }); }
  // En grupo, cada persona manda su imagen a cada una de las demás: menos resolución y caudal por pareja para que ningún equipo se
  // cargue (como hacen Meet, FaceTime o WhatsApp al pasar de dos a varias personas). Lo pone grupo.js; sin grupo, lo de siempre.
  let topeGrupo = null;
  function limita(t) {
    const nuevo = t && t.bps ? { bps: t.bps | 0, escala: Math.max(1, +t.escala || 1), fps: Math.max(10, Math.min(30, t.fps | 0 || 30)) } : null;
    if (JSON.stringify(nuevo) === JSON.stringify(topeGrupo)) return;
    topeGrupo = nuevo;
    if (L && L.ac) { L.ac.n = null; L.ac.techo = false; L.ac.malos = 0; L.ac.buenos = 0; L.ac.e0 = null; }
    // (si la cámara había subido de Full HD, vuelve a Full HD: en grupo no hace falta más)
    try { const cam = nuevo && L && L.local && L.local.getVideoTracks()[0], st = cam && cam.getSettings ? cam.getSettings() : {}; if (cam && Math.min(st.width || 0, st.height || 0) > 1100) cam.applyConstraints({ width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } }).catch(() => {}); } catch (_) {}
    if (L && L.pc) topes(L.pc);
  }
  async function topes(pc) {
    for (const snd of pc.getSenders()) {
      if (!snd.track) continue;
      try {
        const p = snd.getParameters(); if (!p.encodings || !p.encodings.length) p.encodings = [{}];
        if (snd.track.kind === 'audio') { p.encodings[0].maxBitrate = MAX_BPS_AUDIO; p.encodings[0].priority = 'high'; p.encodings[0].networkPriority = 'high'; }
        else if (topeGrupo && snd.track.contentHint === 'detail') { p.encodings[0].maxBitrate = Math.max(topeGrupo.bps, 1500000); p.encodings[0].maxFramerate = 15; p.encodings[0].scaleResolutionDownBy = 1; p.degradationPreference = 'maintain-resolution'; }
        else if (topeGrupo) { p.encodings[0].maxBitrate = topeGrupo.bps; p.encodings[0].maxFramerate = topeGrupo.fps; p.encodings[0].scaleResolutionDownBy = topeGrupo.escala; p.degradationPreference = 'balanced'; }
        else { p.encodings[0].maxBitrate = BPS[1080]; p.encodings[0].maxFramerate = 30; p.encodings[0].scaleResolutionDownBy = 1; p.degradationPreference = 'maintain-framerate'; }
        await snd.setParameters(p);
      } catch (_) {}
    }
  }
  function conexion() {
    const ice = R && R.ice && R.ice.length ? R.ice : [];
    if (!LOCAL && !ice.length) throw new Error('sin-turn');
    const pc = new RTCPeerConnection(Object.assign({ iceServers: ice, iceTransportPolicy: LOCAL && !ice.length ? 'all' : 'relay', bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' }, PQ_FLUJOS && L && !L.sinCapa ? { encodedInsertableStreams: true } : {}));
    pc.addEventListener('track', (e) => { ponCapa(pc); if (!L) return; L.remoto = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]); emite('llamada', estadoLlamada()); });
    pc.addEventListener('connectionstatechange', () => {
      if (!L || L.pc !== pc) return;
      const st = pc.connectionState;
      if (st === 'connected') {
        finRecupera(L); topes(pc);
        if (!L.t0) { L.t0 = Date.now(); L.tope = restante(S); clearTimeout(L.limite); L.limite = setTimeout(() => colgar('prueba'), L.tope); velaPantalla(true); vigilaCalidad(L); }
        if (L.estado !== 'hablando') { L.estado = 'hablando'; emite('llamada', estadoLlamada()); }
      } else if (st === 'failed' || st === 'disconnected') {
        if (L.t0) recupera(st === 'failed' ? 'fallo' : 'corte'); else if (st === 'failed') { L.diag = pc.__relay ? 'ICE' : 'ICE-0'; colgar('fallo'); }
      }
    });
    return pc;
  }
  // Una llamada cortada no se cuelga (como en GUARDIANA): al cambiar de wifi a datos, o en un corte corto, se negocia otra vez la
  // ruta (ICE) sin tocar la imagen ni el sonido ni sus claves. Quien llamó hace la oferta nueva; quien contestó se la pide. Se
  // repite cada pocos segundos, porque en un cambio de red también se cae la conexión con el relé y lo enviado se pierde. Si en un
  // minuto no vuelve, la llamada termina y se puede volver a llamar.
  const RECUPERA_MS = 60000, REINTENTO_MS = 4000;
  function finRecupera(x) { if (!x) return; clearTimeout(x.recFin); clearTimeout(x.recT0); clearInterval(x.recT); x.recFin = x.recT0 = x.recT = null; }
  function recupera(por) {
    const x = L; if (!x || !x.pc || !x.t0) return;
    if (x.estado !== 'reconectando') { x.estado = 'reconectando'; emite('llamada', estadoLlamada()); }
    if (!x.recFin) x.recFin = setTimeout(() => { if (L === x && x.pc.connectionState !== 'connected') colgar('caida'); }, RECUPERA_MS);
    if (x.recT || x.recT0) return;
    const intento = () => {
      if (L !== x || x.pc.connectionState === 'connected') return;
      if (x.rol === 'llama') reoferta(x); else if (S) enviaControl(S, { tipo: 'llamada', que: 'reinicia', id: x.id });
    };
    x.recT0 = setTimeout(() => { x.recT0 = null; intento(); x.recT = setInterval(intento, REINTENTO_MS); }, por === 'fallo' ? 0 : 2500);
  }
  async function reoferta(x) {
    if (x.reofertando || !x.pc) return; x.reofertando = true;
    try {
      const pc = x.pc;
      try { if (R && R.ice && R.ice.length) pc.setConfiguration({ iceServers: R.ice, iceTransportPolicy: 'relay', bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' }); } catch (_) {}
      if (pc.signalingState === 'have-local-offer') { try { await pc.setLocalDescription({ type: 'rollback' }); } catch (_) {} }
      await describe(pc, true, { iceRestart: true });
      await reunido(pc); if (L !== x) return;
      if (S) enviaControl(S, { tipo: 'llamada', que: 'reoferta', id: x.id, sdp: pc.localDescription.sdp });
    } catch (e) { console.warn('reoferta', e); } finally { x.reofertando = false; }
  }
  // la pantalla no se apaga durante la videollamada; al volver a la pestaña se pide otra vez
  let vela = null;
  async function velaPantalla(si) {
    try {
      if (si) { if (!vela && navigator.wakeLock && document.visibilityState === 'visible') { vela = await navigator.wakeLock.request('screen'); vela.addEventListener('release', () => { vela = null; }); } }
      else if (vela) { const v = vela; vela = null; await v.release(); }
    } catch (_) {}
  }
  // al volver a la pestaña (el móvil la deja en segundo plano y otra app puede quedarse la cámara o el micrófono): lo que se cortó
  // se pide otra vez y se pone en la misma llamada, con su misma capa; y si la ruta se cayó, se recupera
  let recuperando = false;
  async function recuperaMedios() {
    const x = L; if (recuperando || !x || !x.t0 || !x.pc || !x.local || document.visibilityState !== 'visible') return;
    velaPantalla(true);
    if (x.local.getTracks().some((t) => t.readyState === 'ended')) {
      recuperando = true;
      try {
        const st = await medios();
        if (L !== x) st.getTracks().forEach((t) => t.stop());
        else {
          for (const sn of x.pc.getSenders()) { const k = sn.track && sn.track.kind, nt = k && st.getTracks().find((t) => t.kind === k); if (nt) await sn.replaceTrack(nt); }
          x.local.getTracks().forEach((t) => t.stop()); x.local = st; micro(x.mic !== false); camara(x.cam !== false);
          if (x.vozCambiada) cambiaVoz(true); if (x.caraOculta) caraOculta(true);
        }
      } catch (e) { console.warn('medios', e); }
      recuperando = false;
    }
    if (L === x && (x.pc.connectionState === 'disconnected' || x.pc.connectionState === 'failed')) recupera('fallo');
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(recuperaMedios, 400); });
  addEventListener('pageshow', () => setTimeout(recuperaMedios, 400));
  addEventListener('online', () => { if (L && L.t0 && L.pc && L.pc.connectionState !== 'connected') recupera('fallo'); });
  // Rapidez (dueño, 16:18: «que la llamada se conecte lo más rápido posible… aplica la máxima velocidad»): la descripción sale en
  // cuanto hay un camino por el relé (los únicos que se usan) y un instante más, sin esperar a que terminen de responder todos.
  const reunido = (pc) => new Promise((res) => {
    if (pc.iceGatheringState === 'complete') return res();
    let hecho = false, gracia = null;
    const fin = () => { if (hecho) return; hecho = true; pc.removeEventListener('icegatheringstatechange', f); pc.removeEventListener('icecandidate', g); clearTimeout(gracia); res(); };
    const f = () => { if (pc.iceGatheringState === 'complete') fin(); };
    const g = (e) => { if (e.candidate && / typ relay /.test(e.candidate.candidate || '')) { pc.__relay = (pc.__relay || 0) + 1; if (!gracia) gracia = setTimeout(fin, 500); } };
    pc.addEventListener('icegatheringstatechange', f); pc.addEventListener('icecandidate', g); setTimeout(fin, 8000);
  });
  function puedeLlamar() {
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) return 'sin-medios';
    if (!S || !S.conectado || !enLinea(S)) return 'sin-sesion';
    if (!LOCAL && !(R.ice && R.ice.length)) return 'sin-turn';
    return '';
  }
  async function llamar() {
    const s = S, por = puedeLlamar(); if (por) { emite('llamada-aviso', por); return false; }
    if (L) return false;
    if (restante(s) < 5000) { emite('llamada-aviso', 'prueba-usada'); return false; }
    const x = L = { id: C.hex(C.azar(8)), rol: 'llama', estado: 'preparando', video: true, sid: s.sesion.sid, sinCapa: !PQM };
    emite('llamada', estadoLlamada());
    try {
      const st = await tomaMedios(); if (L !== x) { cede(st); return false; }
      L.local = st; L.video = st.getVideoTracks().length > 0;
      if (!L.sinCapa) await llavesLlamada(s.sesion.medios, L.id, true);
      if (L !== x) return false;
      const pc = L.pc = conexion();
      for (const t of st.getTracks()) pc.addTrack(t, st);
      ponCapa(pc); prefiereCodecs(pc, TEL);
      await describe(pc, true); if (L !== x) return false; codecs(pc);
      await reunido(pc); if (L !== x || L.pc !== pc) return false;
      L.estado = 'llamando'; emite('llamada', estadoLlamada());
      enviaControl(s, { tipo: 'llamada', que: 'oferta', id: L.id, sid: L.sid, sdp: pc.localDescription.sdp, video: L.video ? 1 : 0, tel: TEL ? 1 : 0, pq: L.sinCapa ? 0 : 1 });
      if (L.sinCapa) emite('llamada-aviso', 'sin-capa-mia');
      clearTimeout(L.espera); L.espera = setTimeout(() => { if (L && L.estado === 'llamando') colgar('sin-respuesta'); }, 45000);
      return true;
    } catch (e) { if (L !== x) return false; console.warn('llamada', e); const m = String(e && e.message); x.diag = 'E:' + String((e && e.name) || 'Error').slice(0, 24) + (m && m !== 'undefined' ? ' ' + m.slice(0, 40) : ''); colgar(m === 'sin-turn' ? 'sin-turn' : /Permission|NotAllowed/i.test(String(e && e.name) + m) ? 'sin-permiso' : 'fallo'); return false; }
  }
  async function contestar() {
    const s = S; if (!L || L.estado !== 'entrante' || !s) return false;
    const ses = s.sesiones.get(L.sid); if (!ses) { colgar('fallo'); return false; }
    const x = L; L.estado = 'preparando'; emite('llamada', estadoLlamada());
    try {
      const st = await tomaMedios(); if (L !== x) { cede(st); return false; }
      L.local = st;
      if (!L.sinCapa) await llavesLlamada(ses.medios, L.id, false);
      const pc = L.pc = conexion();
      await pc.setRemoteDescription({ type: 'offer', sdp: L.oferta }); ponCapa(pc);
      for (const t of st.getTracks()) pc.addTrack(t, st);
      ponCapa(pc); prefiereCodecs(pc, TEL || L.telSuyo);
      await describe(pc, false); codecs(pc);
      await reunido(pc); if (!L || L.pc !== pc) return false;
      L.estado = 'conectando'; emite('llamada', estadoLlamada());
      enviaControl(s, { tipo: 'llamada', que: 'respuesta', id: L.id, sdp: pc.localDescription.sdp, pq: L.sinCapa ? 0 : 1 });
      if (L.sinCapa) emite('llamada-aviso', L.suyaSinCapa ? 'sin-capa-suya' : 'sin-capa-mia');
      return true;
    } catch (e) { console.warn('llamada', e); colgar(/Permission|NotAllowed/i.test(String(e && e.name) + String(e && e.message)) ? 'sin-permiso' : 'fallo'); return false; }
  }
  // Dos llamadas que se cruzan (dueño, 16:30: «no quiero que se crucen las llamadas… si hay una llamada, luego me salía otra de
  // volver a llamar, una cosa muy rara»): si llega una llamada mientras la mía aún está sonando o preparándose, sigue solo una, la de
  // identificador menor, en los dos lados a la vez; la otra se retira sin aviso y quien la hizo contesta sola a la que sigue. Nunca
  // salen dos llamadas ni un «ocupado» entre los dos.
  function cede(st) { if (st && !mediosPrevios) mediosPrevios = Promise.resolve(st); else if (st && !(L && L.local === st)) st.getTracks().forEach((t) => t.stop()); }
  function retira(x) {
    clearTimeout(x.limite); clearTimeout(x.espera); clearInterval(x.calT); finRecupera(x);
    try { if (x.pc) x.pc.close(); } catch (_) {}
    try { if (obrero && x.tx) { obrero.postMessage({ tipo: 'olvida', id: x.tx }); obrero.postMessage({ tipo: 'olvida', id: x.rx }); } } catch (_) {}
    paraVoz(); paraOcultar(); paraPantalla();
    if (x.local) cede(x.local);
  }
  async function llamadaRecibe(s, j) {
    const que = String(j.que || ''), id = String(j.id || '');
    if (que === 'oferta' && L && L.rol === 'llama' && !L.t0 && (L.estado === 'preparando' || L.estado === 'llamando') && id && id !== L.id) {
      if (L.id < id) return; // sigue la mía: la otra persona retira la suya y contesta
      const x = L; L = null; retira(x);
      if (typeof j.sdp !== 'string' || j.sdp.length > 200000 || !s.sesiones.has(String(j.sid || ''))) { emite('llamada', estadoLlamada()); return; }
      L = { id, rol: 'contesta', estado: 'entrante', video: !!j.video, oferta: j.sdp, sid: String(j.sid), telSuyo: j.tel === 1, sinCapa: !PQM || j.pq === 0, suyaSinCapa: j.pq === 0, cruzada: true };
      emite('llamada', estadoLlamada());
      contestar();
      return;
    }
    // La otra persona vuelve a llamar mientras aquí sigue una llamada suya anterior (dueño, 17:29: «que no se crucen… hazlo como
    // WhatsApp o Telegram»): si para ella esa llamada ya no existe (se le cortó o la canceló), la nueva sustituye a la vieja. Si aquí
    // aún sonaba, sigue sonando, ya con la nueva; si aquí ya estabais hablando o la habías aceptado, entra sola, sin sonar. Nunca
    // «ocupado» entre los dos.
    if (que === 'oferta' && L && id && id !== L.id && !(L.rol === 'llama' && !L.t0)) {
      if (typeof j.sdp !== 'string' || j.sdp.length > 200000 || !s.sesiones.has(String(j.sid || ''))) return;
      const x = L, seguia = x.rol === 'contesta' ? x.estado !== 'entrante' : true;
      L = null; retira(x);
      L = { id, rol: 'contesta', estado: 'entrante', video: !!j.video, oferta: j.sdp, sid: String(j.sid), telSuyo: j.tel === 1, sinCapa: !PQM || j.pq === 0, suyaSinCapa: j.pq === 0, cruzada: seguia };
      emite('llamada', estadoLlamada());
      if (seguia) contestar();
      return;
    }
    if (que === 'oferta') {
      if (L || restante(s) < 5000) { enviaControl(s, { tipo: 'llamada', que: 'ocupado', id }); return; }
      if (typeof j.sdp !== 'string' || j.sdp.length > 200000 || !s.sesiones.has(String(j.sid || ''))) return;
      L = { id, rol: 'contesta', estado: 'entrante', video: !!j.video, oferta: j.sdp, sid: String(j.sid), telSuyo: j.tel === 1, sinCapa: !PQM || j.pq === 0, suyaSinCapa: j.pq === 0 };
      emite('llamada', estadoLlamada());
      return;
    }
    if (!L || L.id !== id) return;
    if (que === 'respuesta' && L.rol === 'llama' && L.pc && typeof j.sdp === 'string') {
      clearTimeout(L.espera); L.estado = 'conectando';
      if (j.pq === 0 && !L.sinCapa) { L.sinCapa = true; if (obrero && L.tx) { obrero.postMessage({ tipo: 'modo', id: L.tx, modo: 'claro' }); obrero.postMessage({ tipo: 'modo', id: L.rx, modo: 'claro' }); } emite('llamada-aviso', 'sin-capa-suya'); }
      emite('llamada', estadoLlamada());
      try { await L.pc.setRemoteDescription({ type: 'answer', sdp: j.sdp }); codecs(L.pc); ponCapa(L.pc); } catch (e) { console.warn(e); colgar('fallo'); }
      return;
    }
    // la ruta de una llamada cortada: quien contestó la pide, quien llamó la ofrece
    if (que === 'reinicia') { if (L.rol === 'llama' && L.t0) reoferta(L); return; }
    if (que === 'reoferta') {
      if (L.rol !== 'contesta' || !L.pc || !L.t0 || typeof j.sdp !== 'string' || j.sdp.length > 200000) return;
      const x = L, pc = x.pc;
      try {
        await pc.setRemoteDescription({ type: 'offer', sdp: j.sdp });
        await describe(pc, false);
        await reunido(pc); topes(pc);
        if (L === x) enviaControl(s, { tipo: 'llamada', que: 'rerespuesta', id: x.id, sdp: pc.localDescription.sdp });
      } catch (e) { console.warn('reoferta', e); }
      return;
    }
    if (que === 'rerespuesta') { if (L.rol === 'llama' && L.pc && typeof j.sdp === 'string' && L.pc.signalingState === 'have-local-offer') { try { await L.pc.setRemoteDescription({ type: 'answer', sdp: j.sdp }); } catch (e) { console.warn('rerespuesta', e); } } return; }
    if (que === 'colgar' || que === 'rechaza' || que === 'ocupado' || que === 'sin-capa') colgar(que === 'colgar' ? 'suyo' : que, true);
    if (que === 'gesto' && L.estado === 'hablando') { const q = String(j.q || ''); if (/^(izq|der|mano|frente|fin|inicio|luz|voz|clave)$/.test(q)) emite('gesto', { q, n: Math.max(0, Math.min(9, j.n | 0)), de: Math.max(0, Math.min(9, j.de | 0)), w: String(j.w || '').replace(/[^\p{L}, '-]/gu, '').slice(0, 60) }); }
    if (que === 'calidad' && L.estado === 'hablando') { L.ac = L.ac || { n: null, tope: 0, malos: 0, buenos: 0, tCambio: 0, tSube: 0, bloqueo: 0, remoto: 0, rMalos: 0, rBuenos: 0, pedido: 0, tPide: 0, pedidos: 0, e0: null, d0: null }; L.ac.remoto = Math.max(0, +j.alto || 0); }
    if (que === 'filtro' && L.estado === 'hablando') { L.otroFiltro = { voz: !!j.voz, cara: !!j.cara, chat: !!j.chat, pantalla: !!j.pantalla }; emite('filtro', L.otroFiltro); }
    if (que === 'reto' && L.estado === 'hablando') { const i = j.i | 0, w = String(j.w || '').slice(0, 24); if (i >= 0 && i < RETOS) emite('reto', { i, w, mio: false }); }
    // «Comprobar» (dueño, 16:56): quien comprueba pregunta de qué tipo es la cámara de este equipo; se contesta solo con el tipo
    if (que === 'fuente?' && L.estado === 'hablando') { if (Date.now() - fuenteT > 1500) { fuenteT = Date.now(); enviaControl(s, { tipo: 'llamada', que: 'fuente', id, n: j.n | 0, f: fuenteMia() }); } return; }
    if (que === 'fuente') { const n = j.n | 0, r = fuentes.get(n); if (r) { fuentes.delete(n); r(limpiaFuente(j.f)); } return; }
  }
  // De qué tipo es la cámara de este equipo, para «Comprobar» en el otro (dueño, 16:56: «detectar la estafa con la mayor tecnología
  // posible»). Los programas que cambian la cara en directo (DeepFaceLive, Deep-Live-Cam, Avatarify…) llegan al navegador como una
  // cámara virtual (OBS, Unity Capture…). Solo sale el tipo y, si es un programa conocido, su familia de una lista fija: nunca el
  // nombre de la cámara, ni nada más del equipo.
  const FAMILIAS = [['OBS', /\bobs\b/i], ['ManyCam', /manycam/i], ['Snap Camera', /snap ?camera/i], ['XSplit', /xsplit/i], ['Unity Capture', /unity ?(video ?)?capture/i], ['SplitCam', /splitcam/i], ['CamTwist', /camtwist/i], ['YouCam', /youcam/i], ['mmhmm', /mmhmm/i], ['Avatarify', /avatarify/i], ['DeepFace', /deep ?face|deep-?live|facefusion|face ?swap|swapface/i], ['Webcamoid', /webcamoid/i], ['ChromaCam', /chromacam/i], ['NVIDIA Broadcast', /nvidia broadcast/i], ['Camo', /\bcamo\b/i], ['DroidCam', /droidcam/i], ['Iriun', /iriun/i], ['EpocCam', /epoccam/i], ['iVCam', /ivcam/i], ['Elgato', /elgato|camera hub/i]];
  const VIRTUAL = /\bobs\b|manycam|snap ?camera|xsplit|\bvcam\b|unity ?(video ?)?capture|splitcam|camtwist|youcam|mmhmm|avatarify|deep ?face|deep-?live|facefusion|face ?swap|swapface|webcamoid|chromacam|sparkocam|altercam|loopback|dummy|fake|virtual/i;
  const INTERMEDIA = /nvidia broadcast|\bcamo\b|droidcam|iriun|epoccam|ivcam|logi capture/i;
  const TIPOS_FUENTE = ['virtual', 'intermedia', 'movil', 'fisica', 'desconocida', 'apagada'];
  function fuenteMia() {
    const t = L && L.local && L.local.getVideoTracks()[0];
    if (!t || t.readyState !== 'live' || !t.enabled) return { k: 'apagada' };
    const et = String(t.label || ''); let a = {}; try { a = t.getSettings ? t.getSettings() : {}; } catch (_) {}
    const n = (FAMILIAS.find(([, re]) => re.test(et)) || [''])[0];
    if (VIRTUAL.test(et)) return { k: 'virtual', n };
    if (INTERMEDIA.test(et)) return { k: 'intermedia', n };
    if (a.facingMode || /front|back|frontal|trasera|delantera|facing/i.test(et)) return { k: 'movil' };
    return { k: et ? 'fisica' : 'desconocida' };
  }
  function limpiaFuente(f) { if (!f || !TIPOS_FUENTE.includes(f.k)) return null; return { k: f.k, n: FAMILIAS.some(([x]) => x === f.n) ? f.n : '' }; }
  const fuentes = new Map(); let nFuente = 0, fuenteT = 0;
  function fuente() {
    return new Promise((res) => {
      if (!L || L.estado !== 'hablando' || !S) { res(null); return; }
      const n = ++nFuente; fuentes.set(n, res);
      enviaControl(S, { tipo: 'llamada', que: 'fuente?', id: L.id, n });
      setTimeout(() => { if (fuentes.has(n)) { fuentes.delete(n); res(null); } }, 3500);
    });
  }
  function colgar(motivo, suyo) {
    if (!L) return;
    const x = L; L = null;
    if (!suyo && S) enviaControl(S, { tipo: 'llamada', que: 'colgar', id: x.id });
    clearTimeout(x.limite); clearTimeout(x.espera); clearInterval(x.calT); finRecupera(x); velaPantalla(false);
    try { if (x.pc) x.pc.close(); } catch (_) {}
    try { if (x.local) x.local.getTracks().forEach((t) => t.stop()); } catch (_) {}
    try { if (obrero && x.tx) { obrero.postMessage({ tipo: 'olvida', id: x.tx }); obrero.postMessage({ tipo: 'olvida', id: x.rx }); } } catch (_) {}
    // la prueba: hasta 3 minutos hablados por conversación
    if (S && x.t0) S.usado = (S.usado || 0) + (Date.now() - x.t0);
    emite('llamada', { estado: 'fin', motivo: motivo || '', diag: x.diag || '', duro: x.t0 ? Date.now() - x.t0 : 0, prueba: restante(S) < 5000, resto: restante(S) });
  }
  // Prueba de vida (agencia, ronda 96, f): un reto al azar que la otra persona tiene que hacer en directo, en cámara. Va por la sesión
  // encriptada, así que lo pide el equipo verificado con las cuatro palabras. Ayuda a detectar un vídeo grabado o una suplantación
  // hecha con inteligencia artificial; no es una prueba infalible.
  const RETOS = 7;
  // La prueba del gesto de «Comprobar» (dueño, 19:56–20:07): quien comprueba pide en la pantalla de la otra persona que gire la cabeza
  // a un lado, al otro y que se tape la cara, en orden al azar. Aquí solo viaja la orden; lo que se ve lo analiza quien comprueba.
  function gesto(q, n, de, w) {
    if (!L || L.estado !== 'hablando' || !S || !/^(izq|der|mano|frente|fin|inicio|luz|voz|clave)$/.test(q)) return false;
    return enviaControl(S, { tipo: 'llamada', que: 'gesto', id: L.id, q, n: n | 0, de: de | 0, w: String(w || '').slice(0, 60) });
  }
  function reto() {
    if (!L || L.estado !== 'hablando' || !S) return null;
    const r = C.azar(4), i = r[0] % RETOS, L2 = window.GuardianaPalabras;
    const w = Array.isArray(L2) && L2.length ? L2[((r[1] << 8) | r[2]) % L2.length] : '';
    enviaControl(S, { tipo: 'llamada', que: 'reto', id: L.id, i, w });
    const x = { i, w, mio: true }; emite('reto', x); return x;
  }
  function rechazar() { if (L && L.estado === 'entrante') { const id = L.id; L = null; if (S) enviaControl(S, { tipo: 'llamada', que: 'rechaza', id }); emite('llamada', { estado: 'fin', motivo: 'rechazada' }); } }
  // ---- girar la cámara: la de delante o la de atrás (dueño, 18:51: «falta el botón de girar la cámara»). La pista nueva entra en el
  // mismo emisor (replaceTrack): la capa poscuántica y el encriptado siguen igual. En el iPhone solo puede haber una cámara abierta:
  // se apaga la actual antes de pedir la otra y, si la otra no se puede abrir, se vuelve a la de antes. ----
  let girando = false;
  async function giraCamara() {
    if (girando || !L || !L.local || !L.pc || !navigator.mediaDevices) return false;
    const vieja = L.local.getVideoTracks()[0]; if (!vieja) return false;
    girando = true;
    const ahora = L.mira || ((vieja.getSettings && vieja.getSettings().facingMode) || 'user'), otra = ahora === 'environment' ? 'user' : 'environment';
    const pide = (modo, exacto) => navigator.mediaDevices.getUserMedia({ video: { facingMode: exacto ? { exact: modo } : modo, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } } });
    try {
      vieja.stop();
      let st = null; try { st = await pide(otra, true); } catch (_) { try { st = await pide(otra, false); } catch (_) { st = null; } }
      let modo = otra; if (!st) { modo = ahora; st = await pide(ahora, false); }
      const nueva = st.getVideoTracks()[0]; try { nueva.contentHint = 'motion'; } catch (_) {} if (L && L.ac) { L.ac.n = null; L.ac.e0 = null; }
      nueva.enabled = L.cam !== false;
      const s = L.pc.getSenders().find((x) => x.track === vieja) || L.pc.getSenders().find((x) => x.track && x.track.kind === 'video');
      if (ocu) { ocu.v.srcObject = new MediaStream([nueva]); ocu.v.play().catch(() => {}); } else if (s && !pantallaP) await s.replaceTrack(nueva);
      L.local.removeTrack(vieja); L.local.addTrack(nueva); L.mira = modo;
      emite('llamada', estadoLlamada()); return modo === otra;
    } catch (_) { emite('llamada', estadoLlamada()); return false; } finally { girando = false; }
  }
  // ---------- privacidad propia (dueño, 22 nov 21:03: «un botón para cambiar la voz y otro para que no se pueda detectar la cara»).
  // Todo en este equipo y antes de encriptar: la pista que sale se cambia en el mismo emisor (replaceTrack), así que la capa poscuántica
  // y el encriptado siguen igual. La otra persona recibe un aviso («voz cambiada», «cara oculta»): no sirve para engañar, se ve. ----------
  const verJs = (((document.querySelector('script[src*="js/motor.js"]') || {}).src || '').split('?v=')[1] || '').replace(/[^\w.-]/g, '');
  let actx = null, vozN = null, ocu = null;
  const emisor = (kind) => L && L.pc && L.pc.getSenders().find((x) => x.track && x.track.kind === kind);
  function avisaFiltros() { if (L && S && L.estado === 'hablando') enviaControl(S, { tipo: 'llamada', que: 'filtro', id: L.id, voz: !!L.vozCambiada, cara: !!L.caraOculta, chat: !!L.enChat, pantalla: !!L.pantalla }); }
  // en el chat del móvil, la cámara propia se apaga (la voz sigue) y vuelve como estaba al volver al vídeo; la otra persona lo ve
  function modoChat(si) {
    if (!L || L.estado !== 'hablando' || !!L.enChat === !!si) return;
    if (si) { L.camAntesChat = L.cam !== false; L.enChat = true; camara(false); } else { L.enChat = false; if (L.camAntesChat) camara(true); }
    avisaFiltros();
  }
  async function cambiaVoz(si) {
    if (!L || !L.local || !L.pc) return false;
    const mic = L.local.getAudioTracks()[0], snd = emisor('audio'); if (!mic || !snd) return false;
    try {
      if (si) {
        if (!actx) { actx = new (window.AudioContext || window.webkitAudioContext)(); await actx.audioWorklet.addModule('js/cambia-voz.js' + (verJs ? '?v=' + verJs : '')); }
        if (actx.state === 'suspended') await actx.resume();
        if (vozN) { for (const n of vozN.nodos) { try { n.disconnect(); } catch (_) {} } }
        const src = actx.createMediaStreamSource(new MediaStream([mic])), dst = actx.createMediaStreamDestination();
        const nodos = vozDePelicula(src, dst);
        const pista = dst.stream.getAudioTracks()[0]; await snd.replaceTrack(pista);
        vozN = { nodos: [src, ...nodos], pista }; L.vozCambiada = true;
      } else {
        await snd.replaceTrack(mic); paraVoz(); L.vozCambiada = false;
      }
      avisaFiltros(); emite('llamada', estadoLlamada()); return true;
    } catch (e) { console.warn('voz', e); return false; }
  }
  function paraVoz() { if (vozN) { for (const n of vozN.nodos) { try { n.disconnect(); } catch (_) {} } try { vozN.pista.stop(); } catch (_) {} vozN = null; } }
  // (dueño, 23 nov 06:51: «la típica de las películas, voz seria y que da impresión de miedo») la voz del anónimo de película: grave
  // (unos 6 semitonos más baja), con cuerpo (una segunda voz una octava por debajo, suave), algo de aspereza, graves realzados y agudos
  // recortados sin perder claridad, nivel parejo (compresor) y una sala oscura muy corta. Todo en el propio equipo, antes de encriptar.
  function vozDePelicula(src, dst) {
    const c = actx, n = [], f = (tipo, fr, q, g) => { const b = c.createBiquadFilter(); b.type = tipo; b.frequency.value = fr; if (q != null) b.Q.value = q; if (g != null) b.gain.value = g; n.push(b); return b; };
    const gan = (v) => { const g = c.createGain(); g.gain.value = v; n.push(g); return g; };
    const tono = (t) => { const w = new AudioWorkletNode(c, 'cambia-voz', { parameterData: { tono: t } }); n.push(w); return w; };
    const limpia = f('highpass', 85, 0.7);
    const principal = tono(0.71), grave = tono(0.5), graveFiltro = f('lowpass', 700, 0.7), graveNivel = gan(0.38), mezcla = gan(1);
    src.connect(limpia); limpia.connect(principal); limpia.connect(grave); grave.connect(graveFiltro); graveFiltro.connect(graveNivel);
    principal.connect(mezcla); graveNivel.connect(mezcla);
    const empuje = gan(1.8), aspero = c.createWaveShaper(); n.push(aspero);
    const curva = new Float32Array(1024); for (let i = 0; i < curva.length; i++) { const x = i / (curva.length - 1) * 2 - 1; curva[i] = Math.tanh(2.2 * x) / Math.tanh(2.2); }
    aspero.curve = curva; aspero.oversample = '2x';
    const tras = gan(0.62), cuerpo = f('lowshelf', 150, null, 5), barro = f('peaking', 420, 1, -3), claridad = f('peaking', 2100, 0.9, 3), techo = f('lowpass', 5600, 0.7);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -26; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18; n.push(comp);
    mezcla.connect(empuje); empuje.connect(aspero); aspero.connect(tras); tras.connect(cuerpo); cuerpo.connect(barro); barro.connect(claridad); claridad.connect(techo); techo.connect(comp);
    // sala oscura y corta (0,45 s), muy baja: da el aire de película sin que suene a eco
    const largo = Math.round(c.sampleRate * 0.45), ir = c.createBuffer(2, largo, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < largo; i++) { lp += 0.25 * ((Math.random() * 2 - 1) - lp); d[i] = lp * Math.pow(1 - i / largo, 3.2); } }
    const sala = c.createConvolver(); sala.buffer = ir; n.push(sala);
    const seco = gan(0.92), humedo = gan(0.13), salida = gan(0.62), tope = c.createWaveShaper(); n.push(tope);
    // el compresor ya sube el nivel por su cuenta: la salida se baja y un tope suave evita que sature al encriptarse y enviarse
    const ct = new Float32Array(1024); for (let i = 0; i < ct.length; i++) { const x = i / (ct.length - 1) * 2 - 1; ct[i] = Math.tanh(1.2 * x) / Math.tanh(1.2); } tope.curve = ct;
    comp.connect(seco); comp.connect(sala); sala.connect(humedo); seco.connect(salida); humedo.connect(salida); salida.connect(tope); tope.connect(dst);
    return n;
  }
  // la cara: la imagen que sale se convierte en mosaico (22 bloques de ancho): no se reconoce la cara ni la detecta ningún programa,
  // pero se ve que hay alguien y cómo se mueve
  async function caraOculta(si) {
    if (!L || !L.local || !L.pc) return false;
    const cam = L.local.getVideoTracks()[0], snd = emisor('video'); if (!snd) return false;
    try {
      if (si) {
        if (!cam) return false; paraOcultar();
        const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.srcObject = new MediaStream([cam]); v.play().catch(() => {});
        const st = cam.getSettings ? cam.getSettings() : {}, cv = document.createElement('canvas'); cv.width = Math.min(st.width || 640, 1280); cv.height = Math.round((st.height || 480) * cv.width / (st.width || 640));
        const g = cv.getContext('2d'), pe = document.createElement('canvas'), gp = pe.getContext('2d');
        const pinta = () => { const v0 = v.videoWidth, h0 = v.videoHeight; if (!v0 || !h0) return; const vw = Math.min(v0, 1280), vh = Math.round(h0 * vw / v0); if (cv.width !== vw || cv.height !== vh) { cv.width = vw; cv.height = vh; } const bw = 22, bh = Math.max(1, Math.round(22 * vh / vw)); if (pe.width !== bw || pe.height !== bh) { pe.width = bw; pe.height = bh; } try { gp.drawImage(v, 0, 0, bw, bh); g.imageSmoothingEnabled = false; g.drawImage(pe, 0, 0, vw, vh); } catch (_) {} };
        g.fillStyle = '#05070A'; g.fillRect(0, 0, cv.width, cv.height);
        const tick = setInterval(pinta, 50), pista = cv.captureStream(20).getVideoTracks()[0];
        if (!pantallaP) await snd.replaceTrack(pista);
        ocu = { v, tick, pista, vista: new MediaStream([pista, ...L.local.getAudioTracks()]) }; L.caraOculta = true;
      } else {
        if (cam && !pantallaP) await snd.replaceTrack(cam); paraOcultar(); L.caraOculta = false;
      }
      avisaFiltros(); emite('llamada', estadoLlamada()); return true;
    } catch (e) { console.warn('cara', e); return false; }
  }
  function paraOcultar() { if (ocu) { clearInterval(ocu.tick); try { ocu.pista.stop(); ocu.v.srcObject = null; } catch (_) {} ocu = null; } }
  // ---------- compartir la pantalla (dueño, 23 nov 09:02: «añade el botón como en GUARDIANA, el de compartir pantalla») ----------
  // En el ordenador. La imagen de la pantalla sale por el mismo emisor (replaceTrack): la capa poscuántica y el encriptado siguen igual.
  // Al dejar de compartir (con el botón o con el aviso del propio navegador) vuelve lo de antes: la cámara, o la cara oculta si estaba
  // puesta. La otra persona lo sabe (la ve entera, sin recortar, y con su aviso). Sin sonido de la pantalla: solo la imagen.
  const PANTALLA = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  let pantallaP = null;
  function paraPantalla() { if (pantallaP) { const p = pantallaP; pantallaP = null; try { p.stop(); } catch (_) {} } if (L) L.pantalla = false; }
  async function pantalla(si, externa) {
    if ((!PANTALLA && !externa) || !L || !L.pc || L.estado !== 'hablando') { if (externa) { try { externa.stop(); } catch (_) {} } return false; }
    if (si) {
      if (pantallaP) { if (externa) { try { externa.stop(); } catch (_) {} } return true; }
      let pista = externa || null;
      if (!pista) { let st = null; try { st = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 15, max: 30 } }, audio: false }); } catch (_) { return false; } pista = st && st.getVideoTracks()[0]; }
      if (!pista) return false;
      const snd = emisor('video'); if (!L || L.estado !== 'hablando' || !snd) { pista.stop(); return false; }
      try { pista.contentHint = 'detail'; } catch (_) {}
      try { await snd.replaceTrack(pista); } catch (_) { pista.stop(); return false; }
      pantallaP = pista; L.pantalla = true; if (topeGrupo) topes(L.pc);
      pista.addEventListener('ended', () => { if (pantallaP === pista) pantalla(false); });
    } else {
      if (!pantallaP) return true;
      const p = pantallaP; pantallaP = null; L.pantalla = false;
      const snd = emisor('video'), vuelta = ocu ? ocu.pista : L.local && L.local.getVideoTracks()[0];
      try { if (snd && vuelta) await snd.replaceTrack(vuelta); } catch (_) {}
      try { p.stop(); } catch (_) {}
      if (topeGrupo && L.pc) topes(L.pc);
    }
    avisaFiltros(); emite('llamada', estadoLlamada()); return true;
  }
  // pistas nuevas para esta llamada (grupo.js: al girar la cámara, copias nuevas): entran en los mismos emisores (replaceTrack), con
  // los filtros que estén puestos (la cara oculta o la pantalla siguen saliendo; la voz cambiada se rehace con el micrófono nuevo)
  async function ponPistas(st) {
    const x = L; if (!x || !x.pc || !st || !st.getTracks().length) return false;
    const viejo = x.local, cam = st.getVideoTracks()[0], mic = st.getAudioTracks()[0];
    x.local = st; micro(x.mic !== false); camara(x.cam !== false);
    try {
      const sv = emisor('video'), sa = emisor('audio');
      if (cam) { if (ocu) { ocu.v.srcObject = new MediaStream([cam]); ocu.v.play().catch(() => {}); } else if (sv && !pantallaP) await sv.replaceTrack(cam); }
      if (mic) { if (vozN) await cambiaVoz(true); else if (sa) await sa.replaceTrack(mic); }
    } catch (e) { console.warn('pistas', e); }
    if (viejo && viejo !== st) for (const t of viejo.getTracks()) if (!st.getTracks().includes(t)) { try { t.stop(); } catch (_) {} }
    emite('llamada', estadoLlamada()); return true;
  }
  // los avisos del grupo (quién soy, a quién conectar): por la sesión encriptada de esta pareja, nunca por el relé a la vista
  function enviaGrupo(obj) { const s = S; if (!s || !s.conectado || s.fin || !obj) return false; return enviaControl(s, Object.assign({}, obj, { tipo: 'grupo' })); }
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
  function finaliza(s, motivo, por, callado) {
    if (s.fin) return;
    s.fin = true;
    if (s === S && !s.canal && motivo !== 'traspaso' && vuelta) { vuelta.fill(0); vuelta = null; }
    if (L && s === S) colgar('fin', motivo !== 'mio');
    clearTimeout(s.reintento); clearTimeout(s.plazoPalabras); clearTimeout(s.plazoCont); clearTimeout(s.caducaT);
    quitaCodigo(s);
    try { R.sale(s.id); } catch (_) {}
    try { for (const x of s.sesiones.values()) { x.envio.borra(); x.recibo.borra(); x.medios.fill(0); } } catch (_) {}
    try { s.psk.fill(0); s.semilla.fill(0); s.dsaSec.fill(0); if (s.nIMio) s.nIMio.fill(0); if (s.nRMio) s.nRMio.fill(0); for (const v of s.efs.values()) if (v && v.kem) v.kem.dk.fill(0); for (const e of s.envios.values()) e.llave.fill(0); } catch (_) {}
    s.sesiones.clear(); s.sesion = null; s.efs.clear(); s.tic = []; s.envios.clear(); s.recibos.clear(); s.idB = null;
    if (S === s) S = null;
    if (T === s) T = null;
    if (!callado) av(s, 'fin', { motivo, por: por || '' });
  }
  addEventListener('pagehide', () => { if (T) finaliza(T, 'cierra', '', true); if (S) termina('cierra'); });

  // ---------- pasar la conversación al móvil con un QR ----------
  // Dueño, 14:08: «añade la versión de pasar la llamada al móvil, eso sí, por QR. Y si puedes mejorarle la seguridad y encriptarla aún
  // más, mejor». Más segura que la de GUARDIANA, en tres pasos:
  //   1. El ordenador enseña un QR con una semilla de 256 bits recién hecha: va de la pantalla a la cámara, por ningún servidor.
  //      Vale una sola vez y caduca a los 2 minutos.
  //   2. El móvil y el ordenador hacen con ella un acuerdo completo (ML-KEM-1024 + ECDH P-384, firmas ML-DSA-87 + ECDSA P-384) y los
  //      dos enseñan las mismas cuatro palabras: quien tiene los dos aparatos delante lo confirma en el ordenador. Si alguien
  //      fotografió el QR y entró antes, las palabras no salen en el móvil de verdad y no se confirma.
  //   3. Solo entonces el ordenador hace otra semilla y se la da al móvil (por esa sesión comprobada) y a la otra persona (por la
  //      conversación, ya comprobada). Con ella, los dos hacen un acuerdo poscuántico nuevo, de equipos nuevos: no hace falta volver
  //      a comparar palabras, porque esa semilla solo ha viajado por sesiones comprobadas. El ordenador borra todo y sale.
  const PAR_MS = 2 * 60 * 1000;
  async function pasaMovil() {
    const s = S; if (!s || s.canal || !s.conectado || !enLinea(s)) return { ok: false, por: 'sin-sesion' };
    if (T) finaliza(T, 'nueva', '', true);
    const semilla = C.nuevaSemilla();
    const t = await nuevaSesion(semilla, 'crea', { aparte: true, canal: 'par', papel: 'pc' });
    t.caducaT = setTimeout(() => { if (T === t && !t.trasp) { finaliza(t, 'caduca', '', true); emite('par-fin', { motivo: 'caduca' }); } }, PAR_MS);
    return { ok: true, enlace: location.origin + location.pathname + '#m=' + C.b64u(semilla), caduca: Date.now() + PAR_MS };
  }
  function cancelaMovil() {
    const t = T; if (!t || t.trasp) return;
    if (t.sesion && enLinea(t)) sella(t, { tipo: 'destruir' }).then((b) => { if (b) R.manda(t.id, t.suId, b); }).catch(() => {}).finally(() => finaliza(t, 'cancela', '', true));
    else finaliza(t, 'cancela', '', true);
  }
  // en el ordenador: «sí, es mi móvil» (las palabras coinciden en los dos aparatos)
  function confirmaMovil() {
    const t = T, s = S; if (!t || t.trasp || !t.conectado || !t.palabras || !s || !enLinea(s) || !enLinea(t)) return false;
    const k = C.nuevaSemilla(), enLlamada = !!(L && L.t0);
    const resto = Math.max(0, restante(s) - (enLlamada ? Date.now() - L.t0 : 0));
    t.trasp = s.trasp = { okMovil: false, okSuyo: false };
    clearTimeout(t.caducaT);
    // el secreto para volver (lo tienen solo los dos aparatos: va por la sesión comprobada del traspaso). Como en GUARDIANA, solo el
    // ordenador se queda esperando: el móvil, al devolver la llamada, se borra (dueño, 23 nov 10:36: «en cuanto pase al PC, que se
    // cierre en el móvil»)
    vueltaMia = TEL ? null : C.nuevaSemilla();
    const dest = t.vuelve ? 'pc' : 'movil';
    enviaControl(t, { tipo: 'par', que: 'semilla', k: C.b64u(k), resto, llamada: enLlamada ? 1 : 0, v: vueltaMia ? C.b64u(vueltaMia) : undefined });
    enviaControl(s, { tipo: 'traspaso', k: C.b64u(k), llamada: enLlamada ? 1 : 0, dest });
    k.fill(0);
    s.trasp.plazo = setTimeout(() => acabaTraspaso(true), 7000);
    return true;
  }
  function acabaTraspaso(yaVale) {
    const s = S, t = T; if (!s || !s.trasp || s.trasp.hecho) return;
    if (!yaVale && !(s.trasp.okMovil && s.trasp.okSuyo)) return;
    const completo = s.trasp.okMovil && s.trasp.okSuyo;
    s.trasp.hecho = true; clearTimeout(s.trasp.plazo);
    const aPc = !!(t && t.vuelve);
    if (t) finaliza(t, 'traspaso', '', true);
    finaliza(s, 'traspaso', '', true);
    const v = vueltaMia; vueltaMia = null;
    emite('traspasada', { completo, vuelta: !!v, aPc });
    if (v) esperaVuelta(v);
  }
  // ---------- ir y volver, como en GUARDIANA (dueño, 23 nov 09:37: «para pasar al móvil todo se hace difícil, no hay botón de volver
  // atrás… que sea fácil ir, volver automáticamente, todo igual que GUARDIANA, que ahí ya está probado y funciona») ----------
  // Quien da la llamada se queda esperando en una sala que sale de un secreto de 32 bytes que solo tienen los dos aparatos. Desde el
  // otro, «Volver al ordenador» (en el móvil) o «Pasar al móvil» (en el ordenador, ya sin QR) entra en esa sala y hace lo mismo al
  // revés: el acuerdo poscuántico, la semilla nueva para los dos y la otra persona, y el que esperaba contesta solo. Se puede ir y
  // volver cuantas veces se quiera; al cerrar la página o empezar otra conversación, se deja de esperar.
  let vuelta = null, vueltaMia = null;
  async function esperaVuelta(v) {
    if (!(await conectado())) { v.fill(0); return; }
    if (S || (T && !T.fin)) { v.fill(0); return; }
    const w = await nuevaSesion(v, 'crea', { aparte: true, canal: 'par', papel: 'movil' });
    w.esperaVuelta = true; emite('espera-vuelta', { si: true });
  }
  async function devuelve() {
    const s = S; if (!vuelta || !s || s.canal || !s.conectado || !enLinea(s)) return { ok: false, por: 'sin-sesion' };
    if (!(await conectado())) return { ok: false, por: 'sin-rele' };
    if (T) finaliza(T, 'nueva', '', true);
    const v = vuelta; vuelta = null;
    const t = await nuevaSesion(v, 'entra', { aparte: true, canal: 'par', papel: 'pc' });
    t.vuelve = !!TEL; // desde el móvil, la llamada vuelve al ordenador
    t.caducaT = setTimeout(() => { if (T === t && !t.trasp) { finaliza(t, 'caduca', '', true); emite('par-fin', { motivo: 'no-espera' }); } }, 30000);
    return { ok: true };
  }
  function recibePar(s, j) {
    if (s.canal !== 'par') return;
    if (j.que === 'ok' && s.papel === 'pc' && s.trasp) { s.trasp.okMovil = true; if (S && S.trasp) S.trasp.okMovil = true; acabaTraspaso(); return; }
    if (j.que === 'semilla' && s.papel === 'movil' && !s.traspasando) {
      let k; try { k = C.deB64u(String(j.k || '')); } catch (_) { return; }
      if (k.length !== 32) return;
      s.traspasando = true;
      enviaControl(s, { tipo: 'par', que: 'ok' });
      const usado = Math.max(0, PRUEBA_MS - Math.max(0, +j.resto || 0)), reanuda = j.llamada === 1;
      let v = null; try { v = j.v ? C.deB64u(String(j.v)) : null; } catch (_) { v = null; }
      setTimeout(async () => { finaliza(s, 'traspaso', '', true); emite('par-hecho'); if (v && v.length === 32) { if (vuelta) vuelta.fill(0); vuelta = v; } await continuaEn(k, { papel: 'movil', usado, reanuda }); }, 700);
    }
  }
  // la otra persona: su conversación pasa sola a la sesión nueva con el móvil
  function recibeTraspaso(s, j) {
    if (s.canal || s.traspasando || s !== S) return;
    let k; try { k = C.deB64u(String(j.k || '')); } catch (_) { return; }
    if (k.length !== 32) return;
    s.traspasando = true;
    const reanuda = j.llamada === 1 || !!(L && L.t0), dest = j.dest === 'pc' ? 'pc' : 'movil';
    enviaControl(s, { tipo: 'traspaso-ok' });
    emite('traspaso', { fase: 'espera', dest });
    setTimeout(async () => { finaliza(s, 'traspaso', '', true); await continuaEn(k, { usado: s.usado || 0, reanuda, llamaYo: true, dest }); }, 700);
  }
  async function continuaEn(k, opc) {
    if (!(await conectado())) { emite('fin', { motivo: 'suyo', por: 'traspaso' }); return; }
    const s = await nuevaSesion(k, 'entra', Object.assign({ continua: true }, opc));
    s.plazoCont = setTimeout(() => { if (!s.fin && !s.conectado) finaliza(s, 'suyo', 'traspaso'); }, 90000);
  }
  // en el móvil: lo que trae el QR («#m=»): la sesión de emparejamiento con el ordenador
  async function entraMovil(semilla) {
    if (!(semilla instanceof Uint8Array) || semilla.length !== 32) return { ok: false, por: 'no-vale' };
    if (!B.hayBlindada()) return { ok: false, por: 'sin-pq' };
    if (!(await conectado())) return { ok: false, por: 'sin-rele' };
    if (S) termina('nueva');
    await nuevaSesion(semilla, 'entra', { canal: 'par', papel: 'movil' });
    return { ok: true };
  }

  // El nivel de la voz que llega (0–1), para la vigilancia de la cara (js/vigia.js): lo da el propio receptor de audio, sin tocar
  // el sonido ni abrir otro contexto de audio. Sin paquetes en el último segundo (micro apagado, silencio): 0.
  function nivelVoz() {
    try {
      const r = L && L.pc && L.pc.getReceivers().find((x) => x.track && x.track.kind === 'audio');
      const f = r && r.getSynchronizationSources ? r.getSynchronizationSources() : [];
      if (!f.length) return null;
      const u = f[0]; return performance.now() - (u.timestamp || 0) > 1000 && u.timestamp < 1e12 ? 0 : (u.audioLevel || 0);
    } catch (_) { return null; }
  }
  const API = {
    on, prepara, crea, entra, termina, envia, borra, leidos, escribe, giraCamara, comprobadas, enviaArchivo, cancelaArchivo, grupo: enviaGrupo, ponPistas, limita,
    llamar, contestar, rechazar, colgar: () => colgar('mio'), micro, camara, cambiaVoz, caraOculta, pantalla, puedePantalla: PANTALLA, modoChat, reto, gesto, fuente, nivelVoz, enlace, entraSemilla, invitaSemilla, preparaMedios,
    pasaMovil, confirmaMovil, cancelaMovil, entraMovil, devuelve, get puedeVolver() { return !!(vuelta && S && !S.canal && S.conectado); }, get esperando() { return !!(T && T.esperaVuelta && !T.fin); }, dejaEspera: () => { if (T && T.esperaVuelta) finaliza(T, 'cancela', '', true); },
    puedeLlamar, estadoLlamada, get activa() { return !!S; }, get otroEsta() { return !!(S && S.suId && S.miembros && S.miembros.has(S.suId)); }, get conectada() { return !!(S && S.conectado && !S.canal); }, get terminada() { return !S || !!S.fin; },
    get palabras() { return S && S.palabras ? S.palabras.slice() : null; }, get red() { return !!(R && R.abierto); },
    PRUEBA_MS, sinLimite, LIMITE, capaMedios: PQM, disponible: () => B.hayBlindada(),
  };
  // solo en pruebas locales: en qué punto está el acuerdo (sin ninguna clave)
  if (LOCAL) API._reoferta = () => { if (L && L.rol === 'llama') reoferta(L); else if (L && S) enviaControl(S, { tipo: 'llamada', que: 'reinicia', id: L.id }); };
  if (LOCAL) API._usa = (ms) => { if (S) S.usado = ms; };
  if (LOCAL) API._suelta = () => colgar('caida', true); // una llamada que se corta solo de este lado
  if (LOCAL) API._estado = () => (S ? { inicio: soyInicio(S), huella: !!S.huella, sesiones: S.sesiones.size, confirmada: !!(S.sesion && S.sesion.confirmada), conectado: S.conectado, cwMio: !!S.cwMio, nIMio: !!S.nIMio, cwSuyo: !!S.cwSuyo, nRMio: !!S.nRMio, nRSuyo: !!S.nRSuyo, revela: !!S.revela, palabrasN: !!S.palabrasN, palabras: !!S.palabras, miembros: S.miembros.size, suId: !!S.suId } : null);
  return API;
};
window.ElixireMotor = creaMotor({});
window.ElixireMotorNuevo = creaMotor;
