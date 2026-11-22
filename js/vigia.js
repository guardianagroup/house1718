// Elixire · la vigilancia de la cara durante toda la llamada (20–22 nov 2026)
// Dueño, 20 nov 08:02: «quiero que sea automático toda la llamada pero sin mostrarse, así vigilamos durante toda la llamada y si
// detecta algo lo decimos en pantalla con un aviso». 08:00: «el mejor que puedas conseguir a nivel mundial». 22 nov: «añade el
// sistema de detección profesional… para detectar avatares y caras no humanas».
//
// Todo pasa en este equipo, sobre el vídeo y el sonido que ya llegan: no se envía ni se guarda nada y la otra persona no ve nada.
// No hay botón ni porcentaje: se mira en silencio y solo sale un aviso si hay una prueba de engaño. Callarse, quedarse quieto o no
// girar nunca cuentan en contra: a una persona real no se le acusa por no hacer nada.
//
// El motor: Human 3.3.6 (github.com/vladmandic/human, licencia MIT, en js/terceros/), con la malla de 468 puntos de MediaPipe
// Face Mesh de Google (Apache 2.0) y dos redes de antisuplantación («real» y «vivo»). Se carga solo cuando empieza la llamada.
// Encima, las señales propias que un vídeo falso no imita bien:
//   · fuertes (un aviso rojo por sí solas): la imagen no cambia nada (una foto puesta como cámara), el vídeo se repite (una
//     grabación en bucle) o su cámara es un programa de cámara virtual (lo dice su navegador: motor.js, «fuente»);
//   · medias: no parpadea en más de un minuto; se oye hablar y sus labios no se mueven; al girar se deforma como algo plano;
//     el vídeo tiene cortes de edición;
//   · débiles (solo suman): la cara no hace ningún gesto, parpadea con un ritmo de metrónomo, las redes de antisuplantación la
//     ven artificial, no se ve el pulso en la piel (rPPG, método POS de Wang y otros, 2017).
//   · y de vida (quitan el aviso amarillo): parpadeo natural, labios que van con la voz, relieve de verdad al girar, gestos, pulso.
// Aviso amarillo («atención») con dos señales medias si no hay señales de vida; rojo («riesgo alto») con
// una fuerte o tres medias. Ninguna prueba es infalible: el aviso siempre recuerda colgar y llamar a su número de siempre.
'use strict';
(() => {
  const M = window.ElixireMotor; if (!M) return;
  const $ = (s) => document.querySelector(s);
  const tr = (k) => (window.ElixireIdioma ? window.ElixireIdioma.t(k) : k);
  const HUMAN = { src: 'js/terceros/human.js?v=3.3.6', sri: 'sha384-vASLsXJSh9FIgw41jM2fwBSF2MoEPlegwV4SO9G3NeyRMcWf7XjSdYvU6MlwOfQl' };
  const CONFIG = {
    debug: false, backend: /[?&]motor=cpu\b/.test(location.search) ? 'cpu' : 'humangl', modelBasePath: 'modelos/human/', warmup: 'none', cacheSensitivity: 0, deallocate: false,
    filter: { enabled: false }, gesture: { enabled: false }, body: { enabled: false }, hand: { enabled: false }, object: { enabled: false }, segmentation: { enabled: false },
    face: {
      enabled: true,
      detector: { modelPath: 'blazeface.json', rotation: false, maxDetected: 1, minConfidence: 0.3, skipFrames: 10, skipTime: 1200, return: false },
      mesh: { enabled: true, modelPath: 'facemesh.json' }, iris: { enabled: false }, attention: { enabled: false },
      description: { enabled: false }, emotion: { enabled: false },
      antispoof: { enabled: true, modelPath: 'antispoof.json', skipFrames: 12, skipTime: 1500 },
      liveness: { enabled: true, modelPath: 'liveness.json', skipFrames: 12, skipTime: 1500 },
    },
  };
  const diagOn = /[?&]diag\b/.test(location.search);
  if (/[?&]vigia=0\b/.test(location.search)) return; // solo para pruebas
  const video = $('#video-suyo'), caja = $('#escena-video');
  if (!video || !caja) return;

  // ---------- el motor, perezoso: solo al empezar la primera llamada ----------
  let humano = null, cargando = null, fallo = '';
  function cargaHumano() {
    if (humano) return Promise.resolve(humano);
    if (cargando) return cargando;
    cargando = new Promise((res, rej) => {
      if (window.Human) { res(window.Human); return; }
      const s = document.createElement('script'); s.src = HUMAN.src; s.integrity = HUMAN.sri; s.async = true;
      s.onload = () => (window.Human ? res(window.Human) : rej(new Error('human'))); s.onerror = () => rej(new Error('human'));
      document.head.append(s);
    }).then(async (H) => { const h = new H.Human(CONFIG); await h.load(); humano = h; return h; });
    cargando.catch((e) => { fallo = String(e && e.message || e); cargando = null; });
    return cargando;
  }

  // ---------- utilidades ----------
  const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const media = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
  const desv = (v) => { if (v.length < 2) return 0; const m = media(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / (v.length - 1)); };
  const cuantil = (v, q) => { if (!v.length) return 0; const o = v.slice().sort((a, b) => a - b); return o[Math.min(o.length - 1, Math.max(0, Math.floor(q * (o.length - 1))))]; };
  const corta = (arr, t, ms) => { let i = 0; while (i < arr.length && t - arr[i].t > ms) i++; if (i) arr.splice(0, i); };
  function mad(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; }
  // mínimos cuadrados: resuelve (AᵀA) x = Aᵀb por eliminación de Gauss (n ≤ 8)
  function resuelve(A, b, n) {
    const N = Array.from({ length: n }, () => new Float64Array(n + 1));
    for (let r = 0; r < A.length; r++) for (let i = 0; i < n; i++) { N[i][n] += A[r][i] * b[r]; for (let j = 0; j < n; j++) N[i][j] += A[r][i] * A[r][j]; }
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(N[r][c]) > Math.abs(N[p][c])) p = r;
      if (Math.abs(N[p][c]) < 1e-12) return null; [N[c], N[p]] = [N[p], N[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = N[r][c] / N[c][c]; for (let k = c; k <= n; k++) N[r][k] -= f * N[c][k]; }
    }
    return Array.from({ length: n }, (_, i) => N[i][n] / N[i][i]);
  }
  // ¿se mueve como algo plano? Una foto o una pantalla, al girar, se deforma con una homografía exacta; una cara de verdad no
  // (la nariz sale hacia delante y el contorno queda detrás). Error medio que deja la mejor homografía, en distancias entre ojos.
  function errorPlano(P, Q) {
    const A = [], b = [];
    for (let i = 0; i < P.length; i++) { const [x, y] = P[i], [u, v] = Q[i]; A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]); b.push(u); A.push([0, 0, 0, x, y, 1, -x * v, -y * v]); b.push(v); }
    const h = resuelve(A, b, 8); if (!h) return null;
    let e = 0; for (let i = 0; i < P.length; i++) { const [x, y] = P[i], w = h[6] * x + h[7] * y + 1; e += Math.hypot((h[0] * x + h[1] * y + h[2]) / w - Q[i][0], (h[3] * x + h[4] * y + h[5]) / w - Q[i][1]); }
    return e / P.length;
  }
  // lo que no explica una semejanza (girar en el plano, acercarse, moverse): si la cara cambia de forma de verdad, este error crece
  function errorSemejanza(P, Q) {
    const A = [], b = [];
    for (let i = 0; i < P.length; i++) { const [x, y] = P[i]; A.push([x, -y, 1, 0]); b.push(Q[i][0]); A.push([y, x, 0, 1]); b.push(Q[i][1]); }
    const h = resuelve(A, b, 4); if (!h) return null;
    let e = 0; for (let i = 0; i < P.length; i++) { const [x, y] = P[i]; e += Math.hypot(h[0] * x - h[1] * y + h[2] - Q[i][0], h[1] * x + h[0] * y + h[3] - Q[i][1]); }
    return e / P.length;
  }
  // los gestos: lo que se mueve por dentro de la cara (boca, cejas, párpados) cuando se quita el movimiento de la cabeza (afín)
  function errorGestos(P, Q, Pm, Qm) {
    const A = [], bx = [], by = [];
    for (let i = 0; i < P.length; i++) { A.push([P[i][0], P[i][1], 1]); bx.push(Q[i][0]); by.push(Q[i][1]); }
    const a = resuelve(A, bx, 3), c = resuelve(A, by, 3); if (!a || !c) return null;
    let e = 0; for (let i = 0; i < Pm.length; i++) { const [x, y] = Pm[i]; e += Math.hypot(a[0] * x + a[1] * y + a[2] - Qm[i][0], c[0] * x + c[1] * y + c[2] - Qm[i][1]); }
    return e / Pm.length;
  }
  // puntos de la malla de MediaPipe: los rígidos (nariz, ojos, contorno, frente, barbilla) y los que hacen gestos
  const RIGIDOS = [1, 4, 5, 6, 168, 197, 195, 33, 133, 362, 263, 234, 454, 10, 152, 127, 356];
  const GESTOS = [13, 14, 61, 291, 78, 308, 0, 17, 70, 105, 107, 336, 334, 300, 159, 145, 386, 374];

  // ---------- el estado de una llamada ----------
  let S = null;
  const nuevo = () => ({
    t0: performance.now(), n: 0, conCara: 0, ultima: null, dtMedio: 0, analizado: 0,
    ear: [], parpadeos: [], cerrado: false, ojosMs: 0, tOjos: 0,
    boca: [], voz: [], piel: [], pulso: { ok: 0, no: 0, ultimo: null },
    poses: [], plano: { si: 0, no: 0, ultimo: null }, gestos: [], refGestos: null,
    modelos: [], firmas: [], quietas: [], repes: [], prevFirma: null, prevCaraF: null, bucle: { racha: 0, lag: 0 },
    cortes: [], fuente: null, fuenteT: 0, frames: 0, ultFrame: 0, indicios: {}, vida: [], nivel: null, mostrado: null, cerradoPor: null,
  });

  // ---------- el muestreo ligero (unas 10 veces por segundo): firmas de la imagen, la piel y la voz ----------
  const c64 = document.createElement('canvas'); c64.width = 64; c64.height = 48; const g64 = c64.getContext('2d', { willReadFrequently: true });
  const c24 = document.createElement('canvas'); c24.width = 24; c24.height = 24; const g24 = c24.getContext('2d', { willReadFrequently: true });
  const c6 = document.createElement('canvas'); c6.width = 6; c6.height = 6; const g6 = c6.getContext('2d', { willReadFrequently: true });
  for (const g of [g64, g24, g6]) { g.imageSmoothingEnabled = true; try { g.imageSmoothingQuality = 'high'; } catch (_) {} }
  function luma(d) { const o = new Uint8Array(d.length / 4); for (let i = 0, j = 0; i < d.length; i += 4, j++) o[j] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0; return o; }
  function firma16(l64) { const o = new Uint8Array(192); for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) { let s = 0; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) s += l64[(y * 4 + j) * 64 + x * 4 + i]; o[y * 16 + x] = s >> 4; } return o; }
  function colorZona(cx, cy, r) {
    const vw = video.videoWidth, vh = video.videoHeight, x = Math.max(0, cx - r), y = Math.max(0, cy - r), w = Math.min(vw - x, 2 * r), h = Math.min(vh - y, 2 * r);
    if (w < 4 || h < 4) return null; g6.drawImage(video, x, y, w, h, 0, 0, 6, 6); const d = g6.getImageData(0, 0, 6, 6).data;
    let R = 0, G = 0, B = 0; for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; } const n = d.length / 4; return [R / n, G / n, B / n];
  }
  function muestra(t) {
    if (!S || !video.videoWidth || video.readyState < 2) return;
    let l64; try { g64.drawImage(video, 0, 0, 64, 48); l64 = luma(g64.getImageData(0, 0, 64, 48).data); } catch (_) { return; }
    const brillo = media(l64); S.brillo = brillo;
    if (brillo < 12) { S.prevFirma = null; S.prevCaraF = null; S.repes.length = 0; return; } // cámara apagada o tapada: no se mira
    const f = firma16(l64), u = S.ultima, cara = u && t - u.t < 8000 ? u : null;
    // cortes de edición: un salto de toda la imagen y la cara aparece en otro sitio
    const mov = S.prevFirma ? mad(f, S.prevFirma) : 0; S.mov = mov;
    if (mov > 28 && cara && S.prevCentro && d2(cara.centro, S.prevCentro) > 0.35 * cara.io) { S.cortes.push({ t }); corta(S.cortes, t, 60000); }
    S.prevCentro = cara ? cara.centro : null;
    // ¿se repite? (una grabación en bucle): con la imagen en movimiento, la mitad o más de las muestras son idénticas a alguna de hace
    // más de 1,5 s. En directo eso no pasa nunca: el ruido de la cámara y el movimiento no se repiten igual.
    if (mov > 1.2 && S.firmas.length > 20) {
      let mejor = 1e9; for (const r of S.firmas) { if (t - r.t < 1500) break; const d = mad(f, r.f); if (d < mejor) mejor = d; }
      S.repes.push({ t, r: mejor < 0.8 ? 1 : 0 }); corta(S.repes, t, 12000); S.bucle.mejor = mejor;
    }
    S.firmas.push({ t, f }); corta(S.firmas, t, 40000); S.prevFirma = f;
    // ¿la cara no cambia nada? (una foto puesta como cámara): la zona de la cara, idéntica fotograma tras fotograma
    if (cara) {
      const b = cara.caja; let cf;
      try { g24.drawImage(video, b[0], b[1], b[2], b[3], 0, 0, 24, 24); cf = luma(g24.getImageData(0, 0, 24, 24).data); } catch (_) { cf = null; }
      if (cf && S.prevCaraF) { S.quietas.push({ t, q: mad(cf, S.prevCaraF) < 0.45 ? 1 : 0 }); corta(S.quietas, t, 12000); }
      S.prevCaraF = cf;
      // la piel, para el pulso: frente y mejillas
      if (cara.piel) { const z = cara.piel.map(([x, y, r]) => colorZona(x, y, r)); if (z.every(Boolean)) { S.piel.push({ t, z }); corta(S.piel, t, 12000); } }
    } else { S.prevCaraF = null; if (!S.ultima) S.quietas.length = 0; }
    // la voz que llega
    const nv = M.nivelVoz ? M.nivelVoz() : null; if (nv != null) { S.voz.push({ t, v: nv }); corta(S.voz, t, 45000); }
  }
  // al ritmo de los fotogramas que llegan de verdad (si el navegador lo permite); si no, cada 100 ms
  let rvfc = 0, tMuestra = 0, iv = 0;
  function arrancaMuestreo() {
    if (video.requestVideoFrameCallback) {
      const cb = (now) => { if (!S) return; S.frames++; S.ultFrame = performance.now(); if (now - tMuestra >= 90 && !document.hidden) { tMuestra = now; muestra(performance.now()); } rvfc = video.requestVideoFrameCallback(cb); };
      rvfc = video.requestVideoFrameCallback(cb);
    } else {
      let ant = -1;
      iv = setInterval(() => { if (!S || document.hidden) return; let n = -1; try { const q = video.getVideoPlaybackQuality(); n = q.totalVideoFrames; } catch (_) {} if (n !== ant) { ant = n; S.frames++; S.ultFrame = performance.now(); } muestra(performance.now()); }, 100);
    }
  }
  function paraMuestreo() { if (rvfc && video.cancelVideoFrameCallback) { try { video.cancelVideoFrameCallback(rvfc); } catch (_) {} } rvfc = 0; clearInterval(iv); iv = 0; }

  // ---------- la malla (unas 3–6 veces por segundo, según el equipo) ----------
  let tDet = 0;
  async function detecta() {
    if (!S || !humano) return;
    const t = performance.now();
    if (document.hidden || !video.videoWidth || video.readyState < 2 || (S.brillo != null && S.brillo < 12)) { tDet = setTimeout(detecta, 700); return; }
    let r = null; try { r = await humano.detect(video); } catch (e) { fallo = String(e && e.message || e); }
    if (!S) return;
    const dt = performance.now() - t; S.dtMedio = S.dtMedio ? S.dtMedio * 0.9 + dt * 0.1 : dt; S.n++;
    procesa(r, performance.now());
    tDet = setTimeout(detecta, Math.max(140, S.dtMedio * 1.6)); // como mucho, el 40 % del tiempo: la llamada va primero
  }
  function procesa(r, t) {
    const f = r && r.face && r.face[0];
    if (!f || !f.mesh || f.mesh.length < 468 || (f.faceScore || f.score || 0) < 0.5) { S.ultima = null; S.refGestos = null; return; }
    S.conCara++;
    const m = f.mesh, io = d2(m[33], m[263]) || 1, ang = (f.rotation && f.rotation.angle) || {}, yaw = ang.yaw || 0, pitch = ang.pitch || 0;
    const caja = f.box ? f.box.map((v) => Math.round(v)) : null; if (!caja) return;
    const centro = [(m[33][0] + m[263][0]) / 2, (m[33][1] + m[263][1]) / 2];
    const piel = [[m[151][0], m[151][1], Math.max(3, io * 0.22)], [m[50][0], m[50][1], Math.max(3, io * 0.16)], [m[280][0], m[280][1], Math.max(3, io * 0.16)]];
    const frontal = Math.abs(yaw) < 0.45 && Math.abs(pitch) < 0.4, grande = io >= 26, luz = S.brilloCara == null || S.brilloCara > 45;
    S.ultima = { t, caja, centro, io, yaw, pitch, piel, frontal };
    const k = t - (S.tPrev || t); S.tPrev = t;
    // las redes de antisuplantación (cada pocos segundos)
    if (typeof f.real === 'number' || typeof f.live === 'number') { S.modelos.push({ t, real: f.real, live: f.live }); corta(S.modelos, t, 40000); }
    // el brillo de la cara (para no juzgar a oscuras)
    if (S.piel.length) { const z = S.piel[S.piel.length - 1].z; S.brilloCara = media(z.map((c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2])); }
    // parpadeo: la apertura de los ojos cae y vuelve
    if (frontal && grande && luz) {
      S.ojosMs += Math.min(k, 800);
      const ear = (d2(m[159], m[145]) / (d2(m[33], m[133]) || 1) + d2(m[386], m[374]) / (d2(m[362], m[263]) || 1)) / 2;
      S.ear.push({ t, v: ear }); corta(S.ear, t, 4000);
      const base = cuantil(S.ear.map((x) => x.v), 0.7);
      if (S.ear.length >= 6) {
        if (!S.cerrado && ear < base * 0.62) { S.cerrado = true; S.tCierre = t; }
        else if (S.cerrado && ear > base * 0.8) { S.cerrado = false; if (t - S.tCierre < 900) { S.parpadeos.push({ t }); corta(S.parpadeos, t, 120000); } }
      }
      // la boca, para la voz
      S.boca.push({ t, v: d2(m[13], m[14]) / (d2(m[10], m[152]) || 1) }); corta(S.boca, t, 45000);
    } else { S.cerrado = false; }
    // relieve: dos momentos con la cabeza girada de forma distinta (15° o más) y no muy separados en el tiempo
    if (grande) {
      const P = RIGIDOS.map((i) => [(m[i][0] - centro[0]) / io, (m[i][1] - centro[1]) / io]);
      S.poses.push({ t, yaw, P }); corta(S.poses, t, 20000);
      // de los momentos de hace 2–20 s, el que más ha cambiado de forma (más allá de girar, acercarse o moverse); si ha cambiado
      // bastante, ¿lo explica una homografía (algo plano) o no (relieve de verdad)?
      if (!S.plano.tUlt || t - S.plano.tUlt > 1000) {
        let otro = null, sm = 0; for (const q of S.poses) { if (t - q.t < 2000) break; const e = errorSemejanza(q.P, P); if (e != null && e > sm) { sm = e; otro = q; } }
        if (otro && sm >= 0.025) {
          const e = errorPlano(otro.P, P);
          if (e != null) { S.plano.tUlt = t; S.plano.ultimo = e; S.plano.sem = sm; if (e < 0.012 && e < 0.35 * sm) S.plano.si++; else if (e > 0.02 && e > 0.6 * sm) S.plano.no++; }
        }
      }
      // gestos: lo que se mueve dentro de la cara respecto a una referencia que se renueva cada 8 s
      const Pm = GESTOS.map((i) => [(m[i][0] - centro[0]) / io, (m[i][1] - centro[1]) / io]);
      if (!S.refGestos || t - S.refGestos.t > 8000) S.refGestos = { t, P, Pm };
      else if (frontal) { const e = errorGestos(S.refGestos.P, P, S.refGestos.Pm, Pm); if (e != null) { S.gestos.push({ t, v: e }); corta(S.gestos, t, 70000); } }
    }
  }

  // ---------- el pulso (POS): frente y mejillas cambian de color con cada latido, a la vez y al mismo ritmo ----------
  function pulso() {
    const p = S.piel; if (p.length < 60) return null;
    const t0 = p[0].t, t1 = p[p.length - 1].t; if (t1 - t0 < 7000) return null;
    const F = 10, n = Math.floor((t1 - t0) / 1000 * F), out = [];
    for (let z = 0; z < 3; z++) {
      // a 10 muestras por segundo, interpolando
      const rgb = []; let j = 0;
      for (let i = 0; i < n; i++) { const tt = t0 + i * 1000 / F; while (j < p.length - 2 && p[j + 1].t < tt) j++; const a = p[j], b = p[j + 1], u = Math.min(1, Math.max(0, (tt - a.t) / ((b.t - a.t) || 1))); rgb.push([0, 1, 2].map((c) => a.z[z][c] * (1 - u) + b.z[z][c] * u)); }
      const mR = media(rgb.map((c) => c[0])) || 1, mG = media(rgb.map((c) => c[1])) || 1, mB = media(rgb.map((c) => c[2])) || 1;
      const s1 = rgb.map((c) => c[1] / mG - c[2] / mB), s2 = rgb.map((c) => c[1] / mG + c[2] / mB - 2 * c[0] / mR);
      const al = desv(s1) / (desv(s2) || 1); let h = s1.map((v, i) => v + al * s2[i]);
      const mm = h.map((_, i) => media(h.slice(Math.max(0, i - 5), i + 6))); h = h.map((v, i) => v - mm[i]);
      let mejor = 0, fM = 0, tot = 0; const pot = [];
      for (let fq = 0.75; fq <= 3.0; fq += 0.05) { let re = 0, im = 0; for (let i = 0; i < h.length; i++) { const w = 2 * Math.PI * fq * i / F; re += h[i] * Math.cos(w); im += h[i] * Math.sin(w); } const q = re * re + im * im; pot.push([fq, q]); tot += q; if (q > mejor) { mejor = q; fM = fq; } }
      const cerca = pot.filter(([fq]) => Math.abs(fq - fM) <= 0.1).reduce((a, [, q]) => a + q, 0);
      out.push({ f: fM, snr: 10 * Math.log10(cerca / Math.max(1e-12, tot - cerca)) });
    }
    return out;
  }

  // ---------- las señales y el aviso (cada segundo) ----------
  const TXT = {
    congelada: 'vg_congelada', bucle: 'vg_bucle', virtual: 'vg_virtual', sinParpadeo: 'vg_sinParpadeo', labios: 'vg_labios', plano: 'vg_plano',
    cortes: 'vg_cortes', sinGestos: 'vg_sinGestos', metronomo: 'vg_metronomo', modelos: 'vg_modelos', sinPulso: 'vg_sinPulso',
  };
  const FUERZA = { congelada: 3, bucle: 3, virtual: 3, sinParpadeo: 2, labios: 2, plano: 2, cortes: 2, sinGestos: 1, metronomo: 1, modelos: 1, sinPulso: 1 };
  function evalua() {
    if (!S) return;
    const t = performance.now(), mirado = t - S.t0, I = {}, vida = [];
    // fuertes
    const q = S.quietas; if (q.length >= 25 && q[q.length - 1].t - q[0].t >= 9500 && media(q.map((x) => x.q)) >= 0.9 && t - S.ultFrame < 1500) I.congelada = 1;
    const rp = S.repes; S.bucle.racha = rp.length; S.bucle.parte = media(rp.map((x) => x.r)); if (rp.length >= 20 && S.bucle.parte >= 0.5) I.bucle = 1;
    if (S.fuente && S.fuente.k === 'virtual') I.virtual = 1;
    // medias
    const minOjos = S.ojosMs / 60000, pp = S.parpadeos;
    if (S.ojosMs >= 60000 && pp.length === 0) I.sinParpadeo = 1;
    const ib = pp.slice(1).map((x, i) => x.t - pp[i].t).filter((x) => x < 20000);
    if (ib.length >= 6 && desv(ib) / (media(ib) || 1) < 0.12) I.metronomo = 1;
    if (pp.length >= 2 && (ib.length < 3 || desv(ib) / (media(ib) || 1) > 0.25)) vida.push('parpadeo');
    // la voz y los labios
    const vz = S.voz.map((x) => x.v), suelo = cuantil(vz, 0.2), umbral = Math.max(0.012, suelo * 3);
    const pares = []; let jv = 0;
    for (const b of S.boca) { while (jv < S.voz.length - 1 && S.voz[jv + 1].t <= b.t) jv++; const v = S.voz[jv]; if (v && Math.abs(v.t - b.t) < 300) pares.push([b.v, v.v]); }
    const hablando = pares.filter(([, v]) => v > umbral);
    S.hablaN = hablando.length;
    if (hablando.length >= 40) {
      const sb = desv(hablando.map(([b]) => b)); S.sb = sb;
      if (sb < 0.006) I.labios = 1;
      const xb = pares.map(([b]) => b), xv = pares.map(([, v]) => v), mb = media(xb), mv = media(xv);
      let num = 0, db = 0, dv = 0; for (let i = 0; i < xb.length; i++) { num += (xb[i] - mb) * (xv[i] - mv); db += (xb[i] - mb) ** 2; dv += (xv[i] - mv) ** 2; }
      S.corr = num / (Math.sqrt(db * dv) || 1); if (S.corr > 0.3) vida.push('labios');
    }
    if (S.plano.si >= 5 && S.plano.no === 0) I.plano = 1;
    if (S.plano.no >= 2) vida.push('relieve');
    if (S.cortes.length >= 3) I.cortes = 1;
    // débiles
    const gs = S.gestos.map((x) => x.v);
    if (gs.length >= 150 && S.gestos[gs.length - 1].t - S.gestos[0].t > 55000) { S.g90 = cuantil(gs, 0.9); if (S.g90 < 0.022) I.sinGestos = 1; else if (S.g90 > 0.045) vida.push('gestos'); }
    const md = S.modelos.filter((x) => typeof x.real === 'number');
    if (md.length >= 8) { S.real = cuantil(md.map((x) => x.real), 0.5); S.live = cuantil(md.map((x) => x.live || 0), 0.5); if (S.real < 0.15 && S.live < 0.15) I.modelos = 1; }
    if (!S.tPulso || t - S.tPulso > 2000) {
      S.tPulso = t; const pz = pulso(); S.pz = pz;
      if (pz) { const buenos = pz.filter((z) => z.snr > 1.5); const ok = buenos.length >= 2 && Math.abs(buenos[0].f - buenos[1].f) <= 0.15; if (ok) S.pulso.ok++; else S.pulso.no++; }
    }
    if (S.pulso.ok >= 2) vida.push('pulso');
    if (S.pulso.no >= 25 && S.pulso.ok === 0 && (S.brilloCara || 0) > 60) I.sinPulso = 1;
    S.indicios = I; S.vida = vida; S.minOjos = minOjos;
    // el nivel
    const k = Object.keys(I), fuertes = k.filter((x) => FUERZA[x] === 3), medias = k.filter((x) => FUERZA[x] === 2), debiles = k.filter((x) => FUERZA[x] === 1);
    let nivel = null;
    if (fuertes.length || medias.length >= 3) nivel = 'riesgo';
    // (de momento, las débiles solo se ven en el modo diagnóstico: sin calibrar con móviles de verdad, no bastan para avisar)
    else if (mirado > 20000 && vida.length < 2 && medias.length >= 2) nivel = 'atencion';
    const motivos = k.sort((a, b) => FUERZA[b] - FUERZA[a]).slice(0, 2);
    decide(nivel, motivos);
    if (diagOn || diagVisible) pintaDiag();
  }

  // ---------- el aviso en pantalla (solo en este lado) ----------
  let aviso = null, tBien = 0;
  const ESCUDO = 'M12 3.2 5 6v5.6c0 4.4 3 8.2 7 9.3 4-1.1 7-4.9 7-9.3V6l-7-2.8Z';
  function creaAviso() {
    const a = document.createElement('div'); a.className = 'vigia-aviso'; a.setAttribute('role', 'alert'); a.hidden = true;
    a.innerHTML = '<span class="vg-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ESCUDO + '"/><path class="vg-signo" d="M12 8.2v4.6M12 15.9v.1"/><path class="vg-ok" d="m9 12.2 2.1 2.1 4-4.2"/></svg></span>' +
      '<span class="vg-txt"><b class="vg-titulo"></b><span class="vg-motivo"></span><small class="vg-consejo"></small></span>' +
      '<button type="button" class="vg-cerrar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button>';
    a.querySelector('.vg-cerrar').addEventListener('click', () => { if (S) S.cerradoPor = { nivel: S.mostrado, motivos: (S.motivos || []).join(), t: performance.now() }; oculta(); });
    caja.append(a); return a;
  }
  function oculta() { if (aviso) { aviso.hidden = true; aviso.classList.remove('visible'); } if (S) S.mostrado = null; }
  function muestraAviso(nivel, motivos) {
    if (!aviso) aviso = creaAviso();
    aviso.dataset.nivel = nivel;
    aviso.querySelector('.vg-titulo').textContent = tr(nivel === 'riesgo' ? 'vg_riesgo' : nivel === 'bien' ? 'vg_bien' : 'vg_atencion');
    const n = S && S.fuente && S.fuente.n ? S.fuente.n : tr('vg_programa');
    aviso.querySelector('.vg-motivo').textContent = nivel === 'bien' ? tr('vg_bienSub') : motivos.map((k) => tr(TXT[k]).replace('{n}', n)).join(' ');
    aviso.querySelector('.vg-consejo').textContent = nivel === 'bien' ? '' : tr('vg_consejo');
    aviso.querySelector('.vg-cerrar').setAttribute('aria-label', tr('vg_cerrar'));
    aviso.hidden = false; requestAnimationFrame(() => aviso.classList.add('visible'));
    if (nivel === 'riesgo') { try { if (navigator.vibrate) navigator.vibrate([70, 60, 70]); } catch (_) {} }
  }
  function decide(nivel, motivos) {
    const t = performance.now(), clave = motivos.join();
    if (nivel) {
      const c = S.cerradoPor; // lo cerró: no se repite lo mismo hasta pasados 3 minutos, salvo que suba a rojo o cambie el motivo
      if (c && c.nivel === nivel && c.motivos === clave && t - c.t < 180000) return;
      if (S.mostrado !== nivel || S.motivos.join() !== clave) { S.mostrado = nivel; S.motivos = motivos; S.huboAviso = true; muestraAviso(nivel, motivos); }
    } else if (S.mostrado === 'atencion' && S.vida.length >= 2) {
      S.mostrado = 'bien'; S.motivos = []; muestraAviso('bien', []); clearTimeout(tBien); tBien = setTimeout(() => { if (S && S.mostrado === 'bien') oculta(); }, 6000);
    }
  }

  // ---------- el modo diagnóstico, para calibrar con móviles de verdad (?diag, o mantener pulsado el tiempo de la llamada) ----------
  let diagVisible = false, pre = null;
  function pintaDiag() {
    if (!pre) { pre = document.createElement('pre'); pre.className = 'vigia-diag'; caja.append(pre); }
    pre.hidden = false; if (!S) { pre.textContent = 'vigía: parado' + (fallo ? ' · ' + fallo : ''); return; }
    const f = (x, d = 2) => (x == null || Number.isNaN(x) ? '–' : Number(x).toFixed(d)), u = S.ultima;
    pre.textContent = [
      'VIGÍA ' + (humano ? 'motor ok' : 'cargando…') + (fallo ? ' · ' + fallo : '') + ' · ' + Math.round((performance.now() - S.t0) / 1000) + ' s',
      'detecciones ' + S.n + ' (' + f(S.dtMedio, 0) + ' ms) · con cara ' + S.conCara + ' · fotogramas ' + S.frames,
      'cara ' + (u ? 'sí io ' + f(u.io, 0) + ' yaw ' + f(u.yaw * 57.3, 0) + '° pitch ' + f(u.pitch * 57.3, 0) + '°' : 'no') + ' · brillo ' + f(S.brillo, 0) + '/' + f(S.brilloCara, 0),
      'quieta ' + f(media(S.quietas.map((x) => x.q)), 2) + ' (' + S.quietas.length + ') · mov ' + f(S.mov, 1) + ' · bucle ' + f(S.bucle.parte, 2) + ' (' + S.bucle.racha + ') ' + f(S.bucle.mejor, 2) + ' · cortes ' + S.cortes.length,
      'parpadeos ' + S.parpadeos.length + ' en ' + f(S.ojosMs / 1000, 0) + ' s de ojos · ear ' + f(S.ear.length ? S.ear[S.ear.length - 1].v : null, 3),
      'voz habla ' + (S.hablaN || 0) + ' · desv boca ' + f(S.sb, 4) + ' · corr ' + f(S.corr, 2),
      'plano si ' + S.plano.si + ' no ' + S.plano.no + ' últ ' + f(S.plano.ultimo, 3) + '/' + f(S.plano.sem, 3) + ' · gestos p90 ' + f(S.g90, 3),
      'redes real ' + f(S.real) + ' vivo ' + f(S.live) + ' · pulso ok ' + S.pulso.ok + ' no ' + S.pulso.no + (S.pz ? ' [' + S.pz.map((z) => f(z.f * 60, 0) + 'lpm ' + f(z.snr, 1) + 'dB').join(' · ') + ']' : ''),
      'cámara ' + (S.fuente ? S.fuente.k + (S.fuente.n ? ' ' + S.fuente.n : '') : '–'),
      'INDICIOS ' + (Object.keys(S.indicios).join(', ') || '–') + ' · VIDA ' + (S.vida.join(', ') || '–') + ' · AVISO ' + (S.mostrado || '–'),
    ].join('\n');
  }
  (() => {
    const tiempo = $('#video-tiempo'); if (!tiempo) return; let tp = 0;
    tiempo.addEventListener('pointerdown', () => { clearTimeout(tp); tp = setTimeout(() => { diagVisible = !diagVisible; if (!diagVisible && pre) pre.hidden = true; else pintaDiag(); }, 1500); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) tiempo.addEventListener(ev, () => clearTimeout(tp));
  })();

  // ---------- en marcha durante toda la llamada ----------
  let tEval = 0, tFuente = 0, tArranca = 0;
  function preguntaFuente() { if (!S || !M.fuente) return; M.fuente().then((f) => { if (S && f) S.fuente = f; }).catch(() => {}); }
  function arranca() {
    if (S) return;
    S = nuevo();
    tArranca = setTimeout(async () => {
      if (!S) return;
      try { await cargaHumano(); } catch (_) { if (diagOn || diagVisible) pintaDiag(); return; }
      if (!S) return;
      arrancaMuestreo(); detecta();
      tEval = setInterval(evalua, 1000);
      preguntaFuente(); tFuente = setInterval(preguntaFuente, 45000);
    }, 2500);
  }
  function para() {
    clearTimeout(tArranca); clearTimeout(tDet); clearInterval(tEval); clearInterval(tFuente); clearTimeout(tBien); paraMuestreo();
    S = null; oculta(); if (pre) pre.hidden = true;
  }
  M.on('llamada', (e) => { if (e && e.estado === 'hablando' && e.video !== false) arranca(); else if (e && ['fin', 'libre', 'rechazada', 'caida'].includes(e.estado)) para(); });
  M.on('fin', () => para());
  window.ElixireVigia = { get estado() { return S ? { indicios: Object.keys(S.indicios), vida: S.vida.slice(), aviso: S.mostrado, n: S.n, conCara: S.conCara, frames: S.frames, quietas: media(S.quietas.map((x) => x.q)), bucle: S.bucle.racha, plano: S.plano, parpadeos: S.parpadeos.length, ojosMs: S.ojosMs, dt: S.dtMedio, fuente: S.fuente, fallo } : null; }, diag: () => { diagVisible = true; pintaDiag(); } };
})();
