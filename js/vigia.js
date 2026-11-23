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
    filter: { enabled: false }, gesture: { enabled: false }, body: { enabled: false },
    hand: { enabled: false, rotation: false, landmarks: false, skipFrames: 0, skipTime: 0, minConfidence: 0.4, iouThreshold: 0.2, maxDetected: 2, detector: { modelPath: 'handtrack.json' } }, object: { enabled: false }, segmentation: { enabled: false },
    face: {
      enabled: true,
      detector: { modelPath: 'blazeface.json', rotation: false, maxDetected: 1, minConfidence: 0.3, skipFrames: 10, skipTime: 1200, return: false },
      mesh: { enabled: true, modelPath: 'facemesh.json' }, iris: { enabled: true, modelPath: 'iris.json' }, attention: { enabled: false },
      description: { enabled: false, modelPath: 'faceres.json', skipFrames: 6, skipTime: 700, minConfidence: 0.1 }, emotion: { enabled: false },
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
  // el autovector del mayor autovalor de una matriz simétrica 4×4 (Jacobi)
  function autovector4(A0) {
    const A = A0.map((r) => r.slice()), V = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    for (let it = 0; it < 40; it++) {
      let p = 0, q = 1, m = 0; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (Math.abs(A[i][j]) > m) { m = Math.abs(A[i][j]); p = i; q = j; }
      if (m < 1e-12) break;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < 4; k++) { const a = A[k][p], b = A[k][q]; A[k][p] = c * a - s * b; A[k][q] = s * a + c * b; }
      for (let k = 0; k < 4; k++) { const a = A[p][k], b = A[q][k]; A[p][k] = c * a - s * b; A[q][k] = s * a + c * b; }
      for (let k = 0; k < 4; k++) { const a = V[k][p], b = V[k][q]; V[k][p] = c * a - s * b; V[k][q] = s * a + c * b; }
    }
    let b = 0; for (let i = 1; i < 4; i++) if (A[i][i] > A[b][b]) b = i;
    return [V[0][b], V[1][b], V[2][b], V[3][b]];
  }
  // lo que no explica un giro + desplazamiento + escala en 3D entre dos mallas (Horn, 1987): deformación o temblor, en px
  function residuo3D(A, B) {
    const n = A.length; if (n < 6) return null; const ca = [0, 0, 0], cb = [0, 0, 0];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { ca[k] += (A[i][k] || 0) / n; cb[k] += (B[i][k] || 0) / n; }
    const a = A.map((p) => [p[0] - ca[0], p[1] - ca[1], (p[2] || 0) - ca[2]]), b = B.map((p) => [p[0] - cb[0], p[1] - cb[1], (p[2] || 0) - cb[2]]);
    let sa = 0, sb = 0; const M3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) { sa += a[i][k] * a[i][k]; sb += b[i][k] * b[i][k]; } for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) M3[r][c] += a[i][r] * b[i][c]; }
    if (!sa || !sb) return null;
    const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = M3, esc = Math.sqrt(sb / sa);
    const [w, x, y, z] = autovector4([[xx + yy + zz, yz - zy, zx - xz, xy - yx], [yz - zy, xx - yy - zz, xy + yx, zx + xz], [zx - xz, xy + yx, -xx + yy - zz, yz + zy], [xy - yx, zx + xz, yz + zy, -xx - yy + zz]]);
    const R = [[w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y)], [2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x)], [2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z]];
    let e = 0; for (let i = 0; i < n; i++) { const p = a[i]; for (let r = 0; r < 3; r++) { const v = esc * (R[r][0] * p[0] + R[r][1] * p[1] + R[r][2] * p[2]) - b[i][r]; e += v * v; } }
    return Math.sqrt(e / n);
  }
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
  // para el temblor en 3D: contorno, frente, nariz y rabillos de los ojos (lo que no se mueve al hablar)
  const RIG3D = [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1, 234, 454, 93, 323, 132, 361, 58, 288, 152, 127, 356, 162, 389, 21, 251, 54, 284, 103, 332, 67, 297, 109, 338, 33, 133, 362, 263];

  // ---------- el estado de una llamada ----------
  let S = null;
  const nuevo = () => ({
    t0: performance.now(), n: 0, conCara: 0, ultima: null, dtMedio: 0, analizado: 0,
    ear: [], parpadeos: [], cerrado: false, ojosMs: 0, tOjos: 0,
    boca: [], voz: [], piel: [], fondo: [], cuello: [], ojos: [], iris: [], tex: [], temblor: [], manos: [], ident: [], pulso: { ok: 0, no: 0, ultimo: null },
    poses: [], plano: { si: 0, no: 0, ultimo: null }, gestos: [], refGestos: null,
    modelos: [], firmas: [], quietas: [], repes: [], prevFirma: null, prevCaraF: null, bucle: { racha: 0, lag: 0 },
    cortes: [], fuente: null, fuenteT: 0, frames: 0, ultFrame: 0, indicios: {}, vida: [], nivel: null, mostrado: null, cerradoPor: null,
  });

  // ---------- el muestreo ligero (unas 10 veces por segundo): firmas de la imagen, la piel y la voz ----------
  const c64 = document.createElement('canvas'); c64.width = 64; c64.height = 48; const g64 = c64.getContext('2d', { willReadFrequently: true });
  const c24 = document.createElement('canvas'); c24.width = 24; c24.height = 24; const g24 = c24.getContext('2d', { willReadFrequently: true });
  const c6 = document.createElement('canvas'); c6.width = 6; c6.height = 6; const g6 = c6.getContext('2d', { willReadFrequently: true });
  const c16 = document.createElement('canvas'); c16.width = 16; c16.height = 16; const g16 = c16.getContext('2d', { willReadFrequently: true });
  const c48 = document.createElement('canvas'); c48.width = 48; c48.height = 48; const g48 = c48.getContext('2d', { willReadFrequently: true });
  for (const g of [g64, g24, g6, g16, g48]) { g.imageSmoothingEnabled = true; try { g.imageSmoothingQuality = 'high'; } catch (_) {} }
  // un trozo de la imagen, en grises, a n×n (null si se sale casi entero)
  const cF = document.createElement('canvas'), gF = cF.getContext('2d', { willReadFrequently: true }); let F = null;
  function leeFrame(t) {
    const vw = video.videoWidth, vh = video.videoHeight; if (!vw || !vh) { F = null; return null; }
    const w = 256, h = Math.max(2, Math.round(256 * vh / vw)); if (cF.width !== w || cF.height !== h) { cF.width = w; cF.height = h; }
    try { gF.drawImage(video, 0, 0, w, h); F = { d: gF.getImageData(0, 0, w, h).data, w, h, sx: w / vw, sy: h / vh, t }; } catch (_) { F = null; }
    return F;
  }
  // la media de color de un rectángulo de la imagen (en píxeles del vídeo), sacada de la copia pequeña
  function mediaF(x, y, w, h) {
    const x0 = Math.max(0, Math.floor(x * F.sx)), y0 = Math.max(0, Math.floor(y * F.sy)), x1 = Math.min(F.w, Math.max(x0 + 1, Math.ceil((x + w) * F.sx))), y1 = Math.min(F.h, Math.max(y0 + 1, Math.ceil((y + h) * F.sy)));
    if (x1 <= x0 || y1 <= y0) return null; let R = 0, G = 0, B = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * F.w + xx) * 4; R += F.d[i]; G += F.d[i + 1]; B += F.d[i + 2]; n++; }
    return [R / n, G / n, B / n];
  }
  // un trozo en grises a n×n, con medias por celda, de la copia pequeña
  function recorteF(n, x, y, w, h) {
    const vw = video.videoWidth, vh = video.videoHeight, xa = Math.max(0, x), ya = Math.max(0, y), xb = Math.min(vw, x + w), yb = Math.min(vh, y + h);
    if (!F || xb - xa < 6 || yb - ya < 6) return null; const o = new Uint8Array(n * n), cw = (xb - xa) / n, ch = (yb - ya) / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const c = mediaF(xa + i * cw, ya + j * ch, cw, ch); o[j * n + i] = c ? (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) | 0 : 0; }
    return o;
  }
  function recorte(g, n, x, y, w, h) {
    const vw = video.videoWidth, vh = video.videoHeight, x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y)), x1 = Math.min(vw, Math.round(x + w)), y1 = Math.min(vh, Math.round(y + h));
    if (x1 - x0 < 6 || y1 - y0 < 6) return null;
    try { g.drawImage(video, x0, y0, x1 - x0, y1 - y0, 0, 0, n, n); return luma(g.getImageData(0, 0, n, n).data); } catch (_) { return null; }
  }
  // ¿el iris cae dentro del contorno de su ojo? (si no, el modelo de iris se ha perdido: se usa el contorno)
  function irisBien(m) {
    if (!m || m.length < 478) return false;
    const dentro = (p, ids) => { const xs = ids.map((i) => m[i][0]), ys = ids.map((i) => m[i][1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), mx = (x1 - x0) * 0.15, my = Math.max((y1 - y0) * 0.6, (x1 - x0) * 0.15); return p[0] >= x0 - mx && p[0] <= x1 + mx && p[1] >= y0 - my && p[1] <= y1 + my; };
    const a = [33, 133, 159, 145, 160, 144, 158, 153], b = [362, 263, 386, 374, 387, 373, 385, 380];
    return (dentro(m[468], a) && dentro(m[473], b)) || (dentro(m[468], b) && dentro(m[473], a));
  }
  // el detalle fino (laplaciano medio, relativo al brillo)
  function textura(l, n) { let s = 0, m = 0, c = 0; for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) { const i = y * n + x; s += Math.abs(4 * l[i] - l[i - 1] - l[i + 1] - l[i - n] - l[i + n]); m += l[i]; c++; } return c && m ? (s / c) / (m / c) : null; }
  function luma(d) { const o = new Uint8Array(d.length / 4); for (let i = 0, j = 0; i < d.length; i += 4, j++) o[j] = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0; return o; }
  function firma16(l64) { const o = new Uint8Array(192); for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) { let s = 0; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) s += l64[(y * 4 + j) * 64 + x * 4 + i]; o[y * 16 + x] = s >> 4; } return o; }
  function colorZona(cx, cy, r) {
    if (F) return mediaF(cx - r, cy - r, 2 * r, 2 * r);
    const vw = video.videoWidth, vh = video.videoHeight, x = Math.max(0, cx - r), y = Math.max(0, cy - r), w = Math.min(vw - x, 2 * r), h = Math.min(vh - y, 2 * r);
    if (w < 4 || h < 4) return null; g6.drawImage(video, x, y, w, h, 0, 0, 6, 6); const d = g6.getImageData(0, 0, 6, 6).data;
    let R = 0, G = 0, B = 0; for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; } const n = d.length / 4; return [R / n, G / n, B / n];
  }
  function muestra(t) {
    if (!S || !video.videoWidth || video.readyState < 2) return;
    if (!leeFrame(t)) return; const l64 = new Uint8Array(64 * 48), bx = F.w / 64, by = F.h / 48;
    for (let j = 0; j < 48; j++) for (let i = 0; i < 64; i++) { const c = mediaF(i * bx / F.sx, j * by / F.sy, bx / F.sx, by / F.sy); l64[j * 64 + i] = c ? (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) | 0 : 0; }
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
      if (cara.piel) { const z = cara.piel.map(([x, y, r]) => colorZona(x, y, r)); if (z.every(Boolean)) { S.piel.push({ t, z, f: t - cara.t < 450 || (t - cara.t < 2500 && mov < 1.5) }); corta(S.piel, t, 12000); } }
      if (compr && compr.pruebas && cara.malla) {
        // el cuello, debajo de la barbilla (para la costura con luz: si su cuello refleja la luz y su cara no, la cara está pegada)
        const mm = cara.malla, alto = Math.abs(mm[152][1] - mm[10][1]) || 1, cy = mm[152][1] + alto * 0.3, rc = Math.max(4, alto * 0.11);
        const fr = t - cara.t < 450 || (t - cara.t < 2500 && mov < 1.5);
        if (cy + rc < video.videoHeight) { const z = colorZona(mm[152][0], cy, rc); if (z) { S.cuello.push({ t, z: [z], f: fr }); corta(S.cuello, t, 12000); } }
        // los ojos y, si lleva gafas, sus cristales
        const ojo = (ids) => [ids.reduce((a, i) => a + mm[i][0], 0) / ids.length, ids.reduce((a, i) => a + mm[i][1], 0) / ids.length], ro = Math.max(4, cara.io * 0.28);
        const zo = [ojo([33, 133, 159, 145]), ojo([362, 263, 386, 374])].map(([x, y]) => colorZona(x, y, ro));
        if (zo.every(Boolean)) { S.ojos.push({ t, z: zo, f: fr }); corta(S.ojos, t, 12000); }
        if (irisBien(mm)) { const ri = Math.max(2.5, cara.io * 0.09), zi = [mm[468], mm[473]].map((p) => colorZona(p[0], p[1], ri)); if (zi.every(Boolean)) { S.iris.push({ t, z: zi, f: fr }); corta(S.iris, t, 12000); } }
      }
      if (!S.tTex || t - S.tTex > 1000) { S.tTex = t; texturaMuestra(cara, t); }
      if (compr && compr.pruebas) {
        const vw = video.videoWidth, vh = video.videoHeight, rr = Math.max(4, Math.round(Math.min(vw, vh) * 0.05)), [bx, by, bw, bh] = cara.caja;
        const fuera = ([x, y]) => x < bx - 0.3 * bw || x > bx + 1.3 * bw || y < by - 0.4 * bh || y > by + 1.3 * bh;
        const z = [[0.07 * vw, 0.06 * vh], [0.93 * vw, 0.06 * vh]].filter(fuera).map(([x, y]) => colorZona(x, y, rr));
        if (z.length && z.every(Boolean)) { S.fondo.push({ t, z }); corta(S.fondo, t, 12000); }
      }
    } else { S.prevCaraF = null; if (!S.ultima) S.quietas.length = 0; }
    if (compr && compr.manoReto) manoMuestra(t);
    // la voz que llega
    const nv = M.nivelVoz ? M.nivelVoz() : null; if (nv != null) { S.voz.push({ t, v: nv }); corta(S.voz, t, 45000); }
  }
  // al ritmo de los fotogramas que llegan de verdad (si el navegador lo permite); si no, cada 100 ms
  let rvfc = 0, tMuestra = 0, iv = 0, enPausa = 0;
  function arrancaMuestreo() {
    if (video.requestVideoFrameCallback) {
      const cb = (now) => { if (!S) return; S.frames++; S.ultFrame = performance.now(); if (now - tMuestra >= 90 && !document.hidden && performance.now() > enPausa) { tMuestra = now; muestra(performance.now()); } rvfc = video.requestVideoFrameCallback(cb); };
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
    if (t < enPausa || (compr && compr.manoReto && (CONFIG.backend === 'cpu' || t - (S.tDetMano || 0) < 380))) { tDet = setTimeout(detecta, 120); return; }
    if (compr && compr.manoReto) S.tDetMano = t;
    if (document.hidden || !video.videoWidth || video.readyState < 2 || (S.brillo != null && S.brillo < 12)) { tDet = setTimeout(detecta, 700); return; }
    let r = null; try { r = await humano.detect(video); } catch (e) { fallo = String(e && e.message || e); }
    if (!S) return;
    const dt = performance.now() - t; S.dtMedio = S.dtMedio ? S.dtMedio * 0.9 + dt * 0.1 : dt; S.n++;
    S.tFrame = t; procesa(r, performance.now());
    if (compr && r && r.face && r.face[0] && r.face[0].embedding && r.face[0].embedding.length && S.ultima) { S.ident.push({ t, e: Array.from(r.face[0].embedding), g: S.ultima.giro || 0 }); if (S.ident.length > 120) S.ident.shift(); }
    if (compr && compr.manoReto && humano.config.hand.enabled) { S.manos.push({ t, cajas: ((r && r.hand) || []).filter((h) => (h.score || 0) >= 0.45 && h.box).map((h) => h.box) }); corta(S.manos, t, 15000); }
    tDet = setTimeout(detecta, compr ? Math.max(90, S.dtMedio * 0.9) : Math.max(140, S.dtMedio * 1.6)); // como mucho, el 40 % del tiempo (salvo al comprobar): la llamada va primero
  }
  function procesa(r, t) {
    const f = r && r.face && r.face[0];
    if (!f || !f.mesh || f.mesh.length < 468 || (f.faceScore || f.score || 0) < 0.5) { S.ultima = null; S.refGestos = null; S.tSinCara = t; return; }
    S.conCara++; S.tCara = t;
    const m = f.mesh, io = d2(m[33], m[263]) || 1, ang = (f.rotation && f.rotation.angle) || {}, yaw = ang.yaw || 0, pitch = ang.pitch || 0;
    const caja = f.box ? f.box.map((v) => Math.round(v)) : null; if (!caja) return;
    const centro = [(m[33][0] + m[263][0]) / 2, (m[33][1] + m[263][1]) / 2];
    const piel = [[m[151][0], m[151][1], Math.max(3, io * 0.22)], [m[205][0], m[205][1], Math.max(3, io * 0.16)], [m[425][0], m[425][1], Math.max(3, io * 0.16)], [m[199][0], m[199][1], Math.max(3, io * 0.14)], [m[4][0], m[4][1], Math.max(3, io * 0.1)]];
    const ancho = Math.abs(m[454][0] - m[234][0]) || 1, giro = (m[1][0] - (m[234][0] + m[454][0]) / 2) / ancho;
    S.pitches = S.pitches || []; S.pitches.push(pitch); if (S.pitches.length > 40) S.pitches.shift();
    const pm = S.pitches.length >= 5 ? cuantil(S.pitches, 0.5) : 0, frontal = Math.abs(giro) < 0.25 && Math.abs(pitch - pm) < (S.pitches.length >= 5 ? 0.3 : 0.6);
    const grande = io >= 26, luz = S.brilloCara == null || S.brilloCara > 30;
    S.ultima = { t, caja, centro, io, yaw, pitch, piel, frontal, giro, malla: m };
    // el temblor en 3D entre dos análisis seguidos: lo que queda tras quitar el giro, el movimiento y la escala (una cara pegada
    // por un programa tiembla y se deforma al ponerse de perfil; una real, no)
    if (S.mallaPrev && t - S.mallaPrev.t < 450) { const r = residuo3D(RIG3D.map((i) => S.mallaPrev.m[i]), RIG3D.map((i) => m[i])); if (r != null) { S.temblor.push({ t, v: r / io, g: giro }); corta(S.temblor, t, 30000); } }
    S.mallaPrev = { t, m };
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
      S.boca.push({ t, tf: S.tFrame || t, v: d2(m[13], m[14]) / (d2(m[10], m[152]) || 1) }); corta(S.boca, t, 45000);
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

  // ---------- la costura por textura: una cara generada a baja resolución y ampliada queda mucho más lisa que su propio cuello ----------
  function texturaMuestra(cara, t) {
    if (!cara.malla || t - cara.t > 450 || !cara.frontal || cara.io < 45) return;
    const m = cara.malla, alto = Math.abs(m[152][1] - m[10][1]) || 1, lado = Math.round(cara.io * 0.42), yc = m[152][1] + alto * 0.3;
    if (yc + lado / 2 > video.videoHeight) return;
    const zona = (x, y) => recorte(g48, 48, x - lado / 2, y - lado / 2, lado, lado);
    const a = zona(m[205][0], m[205][1]), b = zona(m[425][0], m[425][1]), cu = zona(m[152][0], yc); if (!a || !b || !cu) return;
    const tc = textura(cu, 48), tm = ((textura(a, 48) || 0) + (textura(b, 48) || 0)) / 2; if (!tc || tc < 0.02) return; // cuello sin detalle (sombra): no se juzga
    S.tex.push({ t, r: tm / tc }); corta(S.tex, t, 60000);
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
    cortes: 'vg_cortes', sinGestos: 'vg_sinGestos', metronomo: 'vg_metronomo', modelos: 'vg_modelos', sinPulso: 'vg_sinPulso', noGira: 'vg_noGira', desfase: 'vg_desfase', costura: 'vg_costura', manoOculta: 'vg_manoOculta', perfil: 'vg_perfil', suave: 'vg_suave', noMano: 'vg_noMano', pantalla: 'vg_pantalla', otraCara: 'vg_otraCara', vozSinLabios: 'vg_vozSinLabios', noVoz: 'vg_noVoz',
  };
  // (22 nov 17:56: los cortes pasan a débiles: en una prueba real, mover el móvil deprisa o dejar de mirar los imitaba)
  const FUERZA = { congelada: 3, bucle: 3, virtual: 3, sinParpadeo: 2, labios: 2, plano: 2, cortes: 1, sinGestos: 1, metronomo: 1, modelos: 1, sinPulso: 1, noGira: 1, desfase: 1, costura: 2, manoOculta: 2, pantalla: 2, otraCara: 2, vozSinLabios: 2, perfil: 1, suave: 1, noMano: 1, noVoz: 1 };
  const UNA_VEZ = { costura: 1, manoOculta: 1, pantalla: 1, otraCara: 1, vozSinLabios: 1 }; // pruebas de un momento (en «Comprobar»): cuentan ya, sin esperar 8 s
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
      const vozEn = (t) => { let lo = 0, hi = S.voz.length - 1; if (hi < 1 || t < S.voz[0].t || t > S.voz[hi].t) return null; while (hi - lo > 1) { const mi = (lo + hi) >> 1; if (S.voz[mi].t <= t) lo = mi; else hi = mi; } const a = S.voz[lo], b = S.voz[hi], u = (t - a.t) / ((b.t - a.t) || 1); return a.v + (b.v - a.v) * u; };
      let best = null;
      for (let D = -400; D <= 600; D += 50) {
        const xs = [], ys = []; for (const b of S.boca) { const v = vozEn((b.tf || b.t) - D); if (v != null) { xs.push(b.v); ys.push(v); } }
        if (xs.length < 40) continue; const ma = media(xs), mv2 = media(ys); let nn = 0, da = 0, dd = 0; for (let k = 0; k < xs.length; k++) { nn += (xs[k] - ma) * (ys[k] - mv2); da += (xs[k] - ma) ** 2; dd += (ys[k] - mv2) ** 2; }
        const c = nn / (Math.sqrt(da * dd) || 1); if (!best || c > best.c) best = { D, c };
      }
      if (best) { S.desfase = best.D; S.desfaseCorr = best.c; if (best.c > 0.35 && best.D >= 250) I.desfase = 1; }
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
    if (S.reflejo === 'si') vida.push('reflejo');
    if (S.giro === 'si') vida.push('giro'); else if (S.giro === 'no') I.noGira = 1;
    if (S.mano === 'si') vida.push('mano'); else if (S.mano === 'oculta') I.manoOculta = 1; else if (S.mano === 'no') I.noMano = 1;
    if (S.vozReto === 'si') vida.push('voz'); else if (S.vozReto === 'mudo') I.vozSinLabios = 1; else if (S.vozReto === 'no') I.noVoz = 1;
    if (S.costura === 'si') I.costura = 1;
    if (S.pantalla) I.pantalla = 1;
    if (compr) identidad(); if (S.otraCara) I.otraCara = 1;
    if (S.perfilMal) I.perfil = 1;
    if (S.tex.length >= 12) { S.texR = cuantil(S.tex.map((x) => x.r), 0.5); if (S.texR < 0.25) I.suave = 1; }
    const J = {}; S.cuenta = S.cuenta || {};
    for (const x of Object.keys(FUERZA)) { S.cuenta[x] = I[x] ? (S.cuenta[x] || 0) + 1 : 0; if (I[x] && (FUERZA[x] !== 2 || UNA_VEZ[x] || S.cuenta[x] >= 8)) J[x] = 1; }
    S.indicios = J; S.crudos = I; S.vida = vida; S.minOjos = minOjos;
    // el nivel
    const k = Object.keys(J), fuertes = k.filter((x) => FUERZA[x] === 3), medias = k.filter((x) => FUERZA[x] === 2), debiles = k.filter((x) => FUERZA[x] === 1);
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
    if (compr) { if (compr.fase === 'fin' && !compr.poco) { const p = porcentaje(); if (p != null && p <= 8 && p !== compr.pct) fin(true); } return; }
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
      'cámara ' + (S.fuente ? S.fuente.k + (S.fuente.n ? ' ' + S.fuente.n : '') : '–') + ' · luz ' + (S.reflejo || '–') + ' ' + f(S.reflejoDif, 4) + '/' + f(S.reflejoRuido, 4) + ' fondo ' + f(S.reflejoFondo, 4) + ' cuello ' + f(S.reflejoCuello, 4) + ' ojos ' + f(S.reflejoOjos, 4) + (S.reflejoGafas ? ' (gafas)' : '') + ' espectro ' + f(S.reflejoEspectro, 2) + (S.pantalla ? ' PANTALLA' : '') + ' · A/F/L ' + Object.values(cuentas()).join('/') + ' · giro ' + (S.giro || '–') + ' ' + f(S.giroBueno, 2) + '/' + f(S.giroContra, 2) + (S.perfil ? ' temblor ' + f(S.perfil.rg, 3) + '/' + f(S.perfil.rf, 3) : '') + ' · voz ' + (S.vozReto || '–') + (S.vozDatos ? ' ' + S.vozDatos.hablaMs + 'ms r' + f(S.vozDatos.corr, 2) + ' b' + f(S.vozDatos.db, 3) : '') + ' · mano ' + (S.mano || '–') + (S.manoDatos ? ' ' + f(S.manoDatos.pc, 0) + '/' + f(S.manoDatos.pl, 0) + '/' + f(S.manoDatos.pr, 0) + ' q' + f(S.manoDatos.quieto, 0) + ' cubre ' + f(S.manoDatos.cubre, 2) : '') + ' · textura ' + f(S.texR, 2) + (S.identDatos ? ' · identidad ' + f(S.identDatos.cons, 2) + '/' + f(S.identDatos.min, 2) + ' (' + S.identDatos.n + ')' : '') + ' · desfase ' + (S.desfase == null ? '–' : S.desfase + ' ms ' + f(S.desfaseCorr, 2)),
      'INDICIOS ' + (Object.keys(S.indicios).join(', ') || '–') + ' · VIDA ' + (S.vida.join(', ') || '–') + ' · AVISO ' + (S.mostrado || '–'),
    ].join('\n');
  }
  (() => {
    if (!diagOn) return; // (solo para calibrar: ?diag)
    const tiempo = $('#video-tiempo'); if (!tiempo) return; let tp = 0;
    tiempo.addEventListener('pointerdown', () => { clearTimeout(tp); tp = setTimeout(() => { diagVisible = !diagVisible; if (!diagVisible && pre) pre.hidden = true; else pintaDiag(); }, 1500); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) tiempo.addEventListener(ev, () => clearTimeout(tp));
  })();


  // ---------- «Comprobar» (dueño, 22 nov 17:34 y 17:40–17:41: «cuando la persona le da a analizar, tiene que aparecer arriba
  // "analizando", y una especie de escáner que recorra toda la pantalla, de arriba a abajo, de izquierda a derecha… lo más real posible…
  // como una película de Agente 007… detectar la cara, ojos… y cuando entregas la información, con la posibilidad de que sea humano, con
  // un tanto por ciento… simple y fácil»). La vigilancia sigue siempre; el botón la hace visible: «Analizando» arriba, el barrido por toda
  // la pantalla, el enfoque que se cierra sobre su cara y sus ojos con la malla de luz, y al final un número grande: la probabilidad de
  // que sea una persona real, con una frase. El número sale de las mismas pruebas de la vigilancia (sin pruebas de engaño y con señales
  // de vida, alto; con una prueba fuerte, muy bajo); no se inventa: si falta información, lo dice.
  let compr = null, tri = null;
  const DUR_COMPR = 8000, PI2 = Math.PI * 2; let rayas = null;
  const lienzo = document.createElement('canvas'); lienzo.className = 'vg-escaner'; lienzo.setAttribute('aria-hidden', 'true'); lienzo.hidden = true;
  const cabecera = document.createElement('div'); cabecera.className = 'vg-analiza'; cabecera.setAttribute('role', 'status'); cabecera.hidden = true;
  cabecera.innerHTML = '<i class="vg-a-punto" aria-hidden="true"></i><b class="vg-a-texto"></b><i class="vg-a-barra" aria-hidden="true"><i></i></i>';
  const res = document.createElement('div'); res.className = 'vg-resultado'; res.setAttribute('role', 'status'); res.hidden = true;
  res.innerHTML = '<svg class="vg-r-anillo" viewBox="0 0 120 120" aria-hidden="true"><circle class="vg-r-fondo" cx="60" cy="60" r="52"/><circle class="vg-r-valor" cx="60" cy="60" r="52" pathLength="100"/></svg>' +
    '<b class="vg-r-pct"></b><span class="vg-r-et"></span><p class="vg-r-txt"></p><ul class="vg-r-pruebas"></ul><button type="button" class="vg-r-cerrar"></button>';
  caja.append(lienzo, cabecera, res);
  res.querySelector('.vg-r-cerrar').addEventListener('click', () => cierraComprobacion());
  const facil = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3), suave = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  function imagenViva() { const q = S ? S.quietas : []; return q.length >= 15 && q[q.length - 1].t - q[0].t >= 5000 && media(q.map((x) => x.q)) < 0.5; }
  // ¿hay datos para concluir? (la imagen congelada se juzga con 9,5 s de su cara)
  function datosListos() { const q = S ? S.quietas : []; return (q.length >= 20 && q[q.length - 1].t - q[0].t >= 9500) || (S && !S.ultima && S.conCara > 0); }
  // la probabilidad de que sea una persona real, a partir de las pruebas (null: no se ve la cara)
  function porcentaje() {
    if (!S || S.conCara < 3) return null;
    const I = S.indicios, k = Object.keys(I);
    // una prueba fuerte (una foto puesta como cámara, un vídeo en bucle, un programa que hace de cámara): casi cero
    if (I.congelada) return 1; if (I.bucle) return 2; if (I.virtual) return 4;
    // (al acabar los retos puede estar aún de lado: vale una cara vista en los últimos 8 s)
    if (cuentas().F) return 0;
    if (!S.tCara || performance.now() - S.tCara > 8000) return null;
    const medias = k.filter((x) => FUERZA[x] === 2).length, debiles = k.filter((x) => FUERZA[x] === 1 && x !== 'noGira' && x !== 'noMano' && x !== 'noVoz').length;
    // Lo que manda son las pruebas activas, pedidas al azar y en ese momento (la luz, la mano, el giro): un vídeo grabado no puede
    // hacerlas. Las pasivas (parpadear, labios con la voz, gestos, relieve, pulso) también las tiene un vídeo de una persona real
    // (dueño, 22 nov 19:57: «un vídeo de YouTube… lo ha dado como 97 % humano»): solo suman un poco.
    const { A, F, L } = cuentas();
    if (medias >= 2) return Math.max(3, 14 - debiles * 3);
    if (medias === 1) return Math.max(8, Math.min(55, 10 + A * 15 + L * 3 - F * 5 - debiles * 3));
    const p = A >= 2 ? (A === 3 || L >= 2 ? 98 : 97) : A === 1 ? (F ? 70 : 85 + L * 2) : (F ? 20 + L * 5 : 50 + L * 5);
    return Math.max(A === 0 && F ? 10 : 40, p - debiles * 3);
  }
  // A: pruebas activas superadas; F: pedidas y no hechas (con la cara a la vista); L: señales pasivas de vida (como mucho 2)
  function cuentas() {
    const v = S ? S.vida : [], act = ['reflejo', 'voz', 'mano', 'giro'];
    return { A: act.filter((x) => v.includes(x)).length, F: (S && S.giro === 'no' ? 1 : 0) + (S && S.mano === 'no' ? 1 : 0) + (S && S.vozReto === 'no' ? 1 : 0), L: Math.min(2, v.filter((x) => !act.includes(x)).length) };
  }
  // ---- el escáner, dibujado sobre toda la pantalla de la llamada ----
  function esquinas(g, x, y, w, h, l) {
    g.beginPath();
    g.moveTo(x, y + l); g.lineTo(x, y); g.lineTo(x + l, y); g.moveTo(x + w - l, y); g.lineTo(x + w, y); g.lineTo(x + w, y + l);
    g.moveTo(x + w, y + h - l); g.lineTo(x + w, y + h); g.lineTo(x + w - l, y + h); g.moveTo(x + l, y + h); g.lineTo(x, y + h); g.lineTo(x, y + h - l); g.stroke();
  }
  function barrido(g, W, H, d, pos, vertical) {
    // la banda que deja detrás (una rejilla fina que se enciende al pasar) y la línea de luz
    const ancho = 70 * d, a = vertical ? pos : pos;
    g.save();
    const gr = vertical ? g.createLinearGradient(pos - ancho, 0, pos, 0) : g.createLinearGradient(0, pos - ancho, 0, pos);
    gr.addColorStop(0, 'rgba(156,195,228,0)'); gr.addColorStop(1, 'rgba(156,195,228,.22)'); g.fillStyle = gr;
    if (vertical) g.fillRect(pos - ancho, 0, ancho, H); else g.fillRect(0, pos - ancho, W, ancho);
    g.beginPath(); g.strokeStyle = 'rgba(214,236,252,.13)'; g.lineWidth = 1;
    const paso = 22 * d;
    if (vertical) { for (let y = 0; y < H; y += paso) { g.moveTo(Math.max(0, pos - ancho), y); g.lineTo(pos, y); } for (let x = pos - (pos % paso); x > pos - ancho; x -= paso) { g.moveTo(x, 0); g.lineTo(x, H); } }
    else { for (let x = 0; x < W; x += paso) { g.moveTo(x, Math.max(0, pos - ancho)); g.lineTo(x, pos); } for (let y = pos - (pos % paso); y > pos - ancho; y -= paso) { g.moveTo(0, y); g.lineTo(W, y); } }
    g.stroke();
    g.strokeStyle = 'rgba(156,195,228,.28)'; g.lineWidth = 9 * d; g.beginPath(); if (vertical) { g.moveTo(a, 0); g.lineTo(a, H); } else { g.moveTo(0, a); g.lineTo(W, a); } g.stroke();
    g.strokeStyle = 'rgba(232,245,255,.95)'; g.lineWidth = 2 * d;
    g.beginPath(); if (vertical) { g.moveTo(a, 0); g.lineTo(a, H); } else { g.moveTo(0, a); g.lineTo(W, a); } g.stroke();
    g.restore();
  }
  function pintaEscaner() {
    if (!compr) return;
    const ahora = performance.now(); if (compr.tPinta && ahora - compr.tPinta < 30) { compr.raf = requestAnimationFrame(pintaEscaner); return; } compr.tPinta = ahora;
    const rc = caja.getBoundingClientRect(), d = Math.min(1.5, devicePixelRatio || 1), W = Math.round(rc.width * d), H = Math.round(rc.height * d);
    if (lienzo.width !== W || lienzo.height !== H) { lienzo.width = W; lienzo.height = H; }
    const g = lienzo.getContext('2d'); g.clearRect(0, 0, W, H);
    const t = (performance.now() - compr.t0) / 1000, fin = compr.fase === 'fin', tf = fin ? (performance.now() - compr.tFin) / 1000 : 0;
    const col = fin ? compr.color : '207,230,250', aparece = facil(t / 0.6);
    // el velo y las esquinas de la pantalla
    g.fillStyle = 'rgba(3,7,12,' + (0.32 * aparece + (fin ? 0.25 * facil(tf / 0.5) : 0)) + ')'; g.fillRect(0, 0, W, H);
    g.lineWidth = 1.5 * d; g.strokeStyle = 'rgba(' + col + ',' + 0.7 * aparece + ')'; esquinas(g, 16 * d, 16 * d, W - 32 * d, H - 32 * d, 30 * d);
    // líneas de barrido finas, como en un monitor (muy suaves)
    if (!rayas) { rayas = document.createElement('canvas'); rayas.width = 1; rayas.height = 4; const q = rayas.getContext('2d'); q.fillStyle = 'rgba(0,0,0,.55)'; q.fillRect(0, 0, 1, 1); }
    g.save(); g.globalAlpha = 0.18 * aparece; g.fillStyle = g.createPattern(rayas, 'repeat'); g.fillRect(0, 0, W, H); g.restore();
    // la prueba de luz: su pantalla se enciende en magenta o en cian; aquí, un pulso del mismo color
    const fl = compr.flash, ef = fl ? (performance.now() - fl.t) / 1000 : 9;
    if (ef < 1.2) { g.fillStyle = (fl.c ? 'rgba(0,229,255,' : 'rgba(255,64,255,') + (Math.sin(Math.min(1, ef / 1.2) * Math.PI) * 0.13).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
    // los barridos: de arriba a abajo y de izquierda a derecha, uno tras otro
    if (!fin) { const c = t % 3.3; if (c < 1.55) barrido(g, W, H, d, H * suave(c / 1.55), false); else if (c >= 1.65 && c < 3.1) barrido(g, W, H, d, W * suave((c - 1.65) / 1.45), true); }
    // la cara: el enfoque que se cierra sobre ella, los ojos y la malla de luz
    const u = S && S.ultima, vw = video.videoWidth, vh = video.videoHeight;
    if (u && u.malla && vw) {
      const r = video.getBoundingClientRect(), ajuste = getComputedStyle(video).objectFit === 'contain' ? Math.min : Math.max, k = ajuste(r.width / vw, r.height / vh) * d;
      const ox = (r.left - rc.left) * d + (r.width * d - vw * k) / 2, oy = (r.top - rc.top) * d + (r.height * d - vh * k) / 2, P = (q) => [ox + q[0] * k, oy + q[1] * k];
      const pts = u.malla.map(P), xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys); const mw = (x1 - x0) * 0.14, mh = (y1 - y0) * 0.12; x0 -= mw; x1 += mw; y0 -= mh; y1 += mh;
      const cierre = facil((t - 0.4) / 0.9), bx = 16 * d + (x0 - 16 * d) * cierre, by = 16 * d + (y0 - 16 * d) * cierre, bw = (W - 32 * d) + ((x1 - x0) - (W - 32 * d)) * cierre, bh = (H - 32 * d) + ((y1 - y0) - (H - 32 * d)) * cierre;
      const late = 0.75 + 0.25 * Math.sin(t * 5);
      g.save(); g.shadowColor = 'rgba(' + col + ',.8)'; g.shadowBlur = 12 * d; g.lineWidth = 2 * d; g.strokeStyle = 'rgba(' + col + ',' + (0.95 * late) + ')';
      esquinas(g, bx, by, bw, bh, Math.min(bw, bh) * 0.16); g.restore();
      if (cierre > 0.98) {
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.max(x1 - x0, y1 - y0) * 0.62, op = facil((t - 1.3) / 0.6);
        // el anillo de enfoque, que gira despacio, con sus marcas
        g.save(); g.translate(cx, cy); g.rotate(t * 0.35); g.strokeStyle = 'rgba(' + col + ',' + 0.45 * op + ')'; g.lineWidth = 1 * d; g.setLineDash([6 * d, 10 * d]);
        g.beginPath(); g.arc(0, 0, R, 0, PI2); g.stroke(); g.setLineDash([]);
        for (let a = 0; a < 24; a++) { const an = a / 24 * PI2, l = a % 6 ? 6 * d : 13 * d; g.beginPath(); g.moveTo(Math.cos(an) * (R + 3 * d), Math.sin(an) * (R + 3 * d)); g.lineTo(Math.cos(an) * (R + 3 * d + l), Math.sin(an) * (R + 3 * d + l)); g.stroke(); }
        g.restore();
        // los ojos
        const ojo = (ids) => { let x = 0, y = 0; for (const i of ids) { x += pts[i][0]; y += pts[i][1]; } return [x / ids.length, y / ids.length]; };
        const conIris = irisBien(u.malla), ojos = conIris ? [pts[468], pts[473]] : [ojo([33, 133, 159, 145]), ojo([362, 263, 386, 374])], ro = (x1 - x0) * 0.085, oo = facil((t - 1.6) / 0.5);
        g.save(); g.strokeStyle = 'rgba(' + (fin ? col : '240,199,127') + ',' + 0.9 * oo + ')'; g.lineWidth = 1.4 * d; g.shadowColor = 'rgba(240,199,127,.7)'; g.shadowBlur = 8 * d;
        for (const [ex, ey] of ojos) { const rr = ro * (1.4 - 0.4 * oo); g.beginPath(); g.arc(ex, ey, rr, 0, PI2); g.stroke(); g.beginPath(); g.moveTo(ex - rr * 1.5, ey); g.lineTo(ex - rr * 0.6, ey); g.moveTo(ex + rr * 0.6, ey); g.lineTo(ex + rr * 1.5, ey); g.moveTo(ex, ey - rr * 1.5); g.lineTo(ex, ey - rr * 0.6); g.moveTo(ex, ey + rr * 0.6); g.lineTo(ex, ey + rr * 1.5); g.stroke(); }
        g.restore();
        // la malla de luz: las líneas, finas; los puntos, que se encienden en ámbar al pasar la banda de análisis
        const om = facil((t - 1.9) / 0.8) * (fin ? 0.5 : 1);
        if (om > 0) {
          const banda = y0 + (y1 - y0) * ((t * 0.55) % 1), ancho = 26 * d;
          if (tri) {
            g.lineWidth = 0.6 * d; g.strokeStyle = 'rgba(207,230,250,' + 0.16 * om + ')'; g.beginPath(); for (let i = 0; i < tri.length; i += 3) { const a = pts[tri[i]], b = pts[tri[i + 1]], c = pts[tri[i + 2]]; g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath(); } g.stroke();
            // donde pasa la banda, la malla se enciende (como un escáner 3D que va «leyendo» la cara)
            if (!fin) { g.save(); g.lineWidth = 0.9 * d; g.strokeStyle = 'rgba(240,199,127,' + (0.55 * om).toFixed(3) + ')'; g.beginPath();
              for (let i = 0; i < tri.length; i += 3) { const a = pts[tri[i]], b = pts[tri[i + 1]], c = pts[tri[i + 2]]; if (Math.abs((a[1] + b[1] + c[1]) / 3 - banda) < ancho) { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath(); } }
              g.stroke(); g.restore(); }
          }
          for (const [x, y] of pts) { const cerca = fin ? 0 : Math.max(0, 1 - Math.abs(y - banda) / (18 * d)); g.fillStyle = cerca > 0.05 ? 'rgba(240,199,127,' + (0.5 + 0.5 * cerca) * om + ')' : 'rgba(214,236,252,' + 0.7 * om + ')'; g.fillRect(x - 0.9 * d, y - 0.9 * d, 1.8 * d, 1.8 * d); }
        }
        // el rótulo, pequeño, bajo el enfoque
        g.font = 600 + ' ' + Math.round(10 * d) + 'px Inter, system-ui, sans-serif'; g.fillStyle = 'rgba(' + col + ',' + 0.85 * op + ')'; g.textAlign = 'center';
        if ('letterSpacing' in g) g.letterSpacing = (2.5 * d) + 'px';
        g.fillText(tr(fin ? 'vc_rostroFin' : compr.reto ? 'vc_giro' : compr.manoReto ? 'vc_mano' : ef < 1.2 ? 'vc_luz' : 'vc_rostro'), cx, y1 + 22 * d);
        // al fijar el resultado: un fogonazo que se abre desde la cara
        if (fin && tf < 0.7) { const e = tf / 0.7; g.save(); g.strokeStyle = 'rgba(' + col + ',' + (0.85 * (1 - e)).toFixed(3) + ')'; g.lineWidth = 2.5 * d * (1 - e) + 0.5 * d; g.shadowColor = 'rgba(' + col + ',.9)'; g.shadowBlur = 16 * d; g.beginPath(); g.arc(cx, cy, R * (1 + e * 1.4), 0, PI2); g.stroke(); g.restore(); }
      }
    }
    compr.raf = requestAnimationFrame(pintaEscaner);
  }
  async function comprueba() {
    if (compr) return;
    const e = M.estadoLlamada ? M.estadoLlamada() : null; if (!e || e.estado !== 'hablando') return;
    // si la otra persona te está comprobando a ti, la tuya espera a que termine (y empieza sola)
    if (teComprueban > performance.now()) { enEspera = true; muestraEspera(true); return; }
    enEspera = false; muestraEspera(false);
    try { M.gesto('inicio', 0, 0); } catch (_) {}
    compr = { t0: performance.now(), fase: 'prepara' };
    res.hidden = true; res.classList.remove('visible');
    cabecera.querySelector('.vg-a-texto').textContent = tr('vc_analizando'); cabecera.querySelector('.vg-a-texto').dataset.k = 'vc_analizando'; cabecera.querySelector('.vg-a-barra i').style.setProperty('--p', '0'); cabecera.hidden = false; requestAnimationFrame(() => cabecera.classList.add('visible'));
    lienzo.hidden = false; const sl = video.closest('.sala'); if (sl) sl.classList.add('comprobando'); pintaEscaner(); // (pantalla limpia: sin el recuadro propio ni la cabecera)
    try { if (navigator.vibrate) navigator.vibrate(20); } catch (_) {}
    arranca(); // por si la vigilancia aún no había empezado
    const hasta = performance.now() + 15000;
    while (compr && (!humano || !S || !S.n) && performance.now() < hasta) await new Promise((r) => setTimeout(r, 250));
    if (!compr) return;
    if (!humano || !S) { fin(); return; }
    if (!tri && humano.faceTriangulation) tri = Array.from(humano.faceTriangulation);
    compr.fase = 'analiza'; compr.tA = performance.now(); compr.frontalMs = 0; compr.sinMirar = 0;
    precargaManos(); precargaIdent(); S.ident.length = 0; S.otraCara = false; S.identDatos = null; compr.tRefIdent = performance.now() + 8000;
    retos(); // las pruebas activas (luz, mano y giro), mientras el escáner analiza
    const txt = cabecera.querySelector('.vg-a-texto');
    const paso = () => {
      if (!compr || compr.fase !== 'analiza') return;
      // cuánto tiempo se le ha visto la cara de frente (si deja de mirar, no se le juzga: se espera y se le pide que mire)
      const u = S && S.ultima, vista = u && u.frontal && performance.now() - u.t < 2500;
      if (vista) { compr.frontalMs += 250; compr.sinMirar = 0; } else if (!compr.reto && !compr.manoReto) compr.sinMirar += 250;
      const k = compr.reto ? 'vc_giroTxt' : compr.manoReto ? 'vc_manoTxt' : compr.luz && compr.flash ? 'vc_luzVozTxt' : S && S.brilloCara != null && S.brilloCara < 32 ? 'vc_luzBaja' : compr.sinMirar >= 1500 ? 'vc_mira' : 'vc_analizando'; if (txt.dataset.k !== k) { txt.dataset.k = k; txt.textContent = tr(k); }
      const el = performance.now() - compr.tA, listo = !compr.pruebas && compr.frontalMs >= 2000 && S && S.tCara && performance.now() - S.tCara < 2000 && (datosListos() || el >= 15000 || S.vida.length >= 3 || Object.keys(S.indicios).length > 0), acaba = el >= DUR_COMPR && (listo || el >= 38000); // (con los retos, en el peor caso, unos 31 s)
      cabecera.querySelector('.vg-a-barra i').style.setProperty('--p', (acaba ? 1 : Math.min(0.97, el / 24000)).toFixed(3));
      if (!acaba) compr.tp = setTimeout(paso, 250); else { evalua(); fin(); }
    };
    paso();
  }
  // La prueba de luz (dueño, 19 nov 20:55: «añádelo, cuando se hace la prueba»): su pantalla se ilumina un instante en magenta y en
  // cian, en orden al azar. En una cara de verdad, delante de su móvil, esa luz se refleja: el rojo frente al verde sube con el magenta
  // y baja con el cian, a la vez que su pantalla. Una cara puesta por un programa no lo hace igual. Solo suma: a pleno sol casi no se
  // nota, así que no verlo no acusa a nadie. A él le sale «Comprobación de seguridad · Mira a la pantalla» (js/sala.js).
  async function retos() {
    const yo = compr; if (!yo) return; yo.pruebas = true;
    try { await reflejo(); if (compr === yo) { await new Promise((r) => setTimeout(r, 600)); vozDecide(yo); } if (compr === yo) await manoReto(); if (compr === yo) await giroReto(); } finally { yo.pruebas = false; }
  }
  // Girar la cabeza (dueño, 22 nov 18:01: «ponte en la piel del estafador… y haz la contramedida»). Es el reto que más delata a una
  // cara cambiada en directo (Deep-Live-Cam, DeepFaceLive, FaceFusion…): de perfil el cambio se rompe, y un vídeo grabado o un avatar
  // no pueden girar justo cuando se les pide (estudio de 2026 sobre retos frente a caras cambiadas en directo: el de la postura fue el
  // mejor). Se le pide un lado al azar; vale cualquiera de los dos (mucha gente confunde izquierda y derecha) con unos 23° o más.
  async function giroReto() {
    // Dos giros: primero a un lado (al azar) y después al otro (dueño, 22 nov 20:00: «que se gire la cara a un lado… al otro…
    // y si no lo hace, un 0»). El primero vale hacia cualquier lado (mucha gente confunde izquierda y derecha); el segundo tiene que
    // ser hacia el contrario del primero. Un vídeo grabado no puede girar dos veces, en sentidos opuestos, justo cuando se le pide.
    const yo = compr; if (!M.gesto || !S || !yo) return;
    yo.reto = true; S.giro = 'nd'; S.giroMax = 0; S.giroBueno = 0; S.giroContra = 0; S.perfilMal = false; S.perfil = null;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms)), vivo = () => compr === yo && !!S;
    const primero = crypto.getRandomValues(new Uint8Array(1))[0] & 1 ? 'izq' : 'der', segundo = primero === 'izq' ? 'der' : 'izq';
    let t0 = 0;
    try {
      // antes, de frente y quieto (hasta 2 s): el giro tiene que ser la respuesta a lo pedido, no algo que ya pasaba
      const q0 = performance.now(); while (performance.now() - q0 < 2000) { const u = S.ultima; if (u && performance.now() - u.t < 700 && Math.abs(u.giro || 0) < 0.15) break; await espera(120); if (!vivo()) return; }
      t0 = performance.now();
      const r1 = await unGiro(yo, primero, 0); if (!vivo()) return;
      if (r1.estado !== 'si') { S.giro = r1.estado; return; }
      const r2 = await unGiro(yo, segundo, -r1.signo); if (!vivo()) return;
      S.giro = r2.estado;
    } catch (_) {} finally {
      try { M.gesto('fin', 0, 0); } catch (_) {} yo.reto = false;
      // de perfil, ¿tiembla o se deforma más de la cuenta? (frente a como estaba de frente en los 12 s de antes)
      if (S && t0) { const tg = S.temblor.filter((x) => x.t >= t0 && Math.abs(x.g) >= 0.15).map((x) => x.v), tf = S.temblor.filter((x) => x.t < t0 && x.t >= t0 - 12000 && Math.abs(x.g) < 0.1).map((x) => x.v);
        if (tg.length >= 3 && tf.length >= 3) { const rg = cuantil(tg, 0.5), rf = cuantil(tf, 0.5); S.perfil = { rg, rf }; if (rg > 0.05 && rg > 3 * Math.max(rf, 0.004)) S.perfilMal = true; } }
    }
  }
  // un giro: se pide, se espera la reacción (400 ms) y se mira hasta 5,5 s. signoExigido 0: vale cualquier lado
  async function unGiro(yo, lado, signoExigido) {
    const espera = (ms) => new Promise((r) => setTimeout(r, ms)), vivo = () => compr === yo && !!S;
    const u0 = S.ultima && performance.now() - S.ultima.t < 900 ? S.ultima : null;
    if (M.gesto(lado, 0, 0) === false) return { estado: 'nd' };
    const t0 = performance.now(); let pos = 0, neg = 0, maximo = 0, visto = 0, tPerd = 0, previo = 0, perdPos = 0, perdNeg = 0, perdSin = 0, ultT = 0, seFue = false;
    const vale = (sg) => !signoExigido || sg === signoExigido;
    while (performance.now() - t0 < 5500) {
      await espera(120); if (!vivo()) return { estado: 'nd' };
      if (performance.now() - t0 < 400) continue; // nadie reacciona antes
      const u = S.ultima, fresca = u && performance.now() - u.t < 700;
      if (!fresca) { if (!tPerd) tPerd = performance.now(); seFue = true; continue; }
      if (u.t === ultT) continue; ultT = u.t; // cada análisis cuenta una vez
      // la cara se perdió al girar (de perfil el detector deja de verla) y vuelve en el mismo sitio (no un corte de vídeo)
      if (tPerd) { if (performance.now() - tPerd >= 400 && (!u0 || d2(u.centro, u0.centro) < 0.8 * u0.io)) { if (previo >= 0.05) perdPos++; else if (previo <= -0.05) perdNeg++; else if (!signoExigido) perdSin++; } tPerd = 0; }
      visto++; const g = u.giro || 0; previo = g; maximo = Math.max(maximo, Math.abs(g)); pos = Math.max(pos, g); neg = Math.max(neg, -g);
      const hecho = (vale(1) && (pos >= 0.22 || perdPos)) || (vale(-1) && (neg >= 0.22 || perdNeg)) || perdSin;
      if (hecho && Math.abs(g) < 0.12 && performance.now() - t0 > 1300) break; // giró y volvió
    }
    S.giroMax = Math.max(S.giroMax || 0, maximo); S.giroBueno = Math.max(S.giroBueno || 0, signoExigido ? (signoExigido > 0 ? pos : neg) : Math.max(pos, neg)); S.giroPerdida = (S.giroPerdida || 0) + perdPos + perdNeg;
    const okPos = vale(1) && (pos >= 0.22 || perdPos), okNeg = vale(-1) && (neg >= 0.22 || perdNeg);
    if (okPos || okNeg) return { estado: 'si', signo: okPos && (!okNeg || pos >= neg) ? 1 : -1 };
    if (perdSin) return { estado: 'si', signo: 0 }; // se fue de la imagen al girar, sin saber hacia dónde: el segundo vale hacia cualquier lado
    if (visto >= 6 && !seFue && maximo < 0.12) return { estado: 'no' }; // con la cara siempre a la vista (6 análisis o más), no se movió nada
    if (signoExigido) S.giroContra = Math.max(S.giroContra || 0, signoExigido > 0 ? neg : pos);
    return { estado: 'nd' };
  }

  // La mano por delante (la prueba de «los tres dedos»; agencia, ronda 99): a una cara pegada encima por un programa la mano le suele
  // desaparecer al pasar por la cara (el programa pinta la cara encima) o se le rompe. Se mira en la imagen, sin modelo de manos: una
  // franja a cada lado de su cara, a la altura de ojos y nariz, y la cara. Si la mano cruza de un lado al otro (cambian las dos
  // franjas) y la cara no cambia nada, la cara está superpuesta. Si la cara se tapa, es lo normal. Antes, todo quieto (si ya se movía
  // mucho, no se juzga) y sin mover la cabeza durante la prueba (eso no sería la mano).
  let manosListas = false, cargandoManos = false;
  // la misma cara de principio a fin: FaceRes (incluido en Human) solo mientras dura la comprobación
  let identLista = false;
  function precargaIdent() {
    if (identLista || !humano || CONFIG.backend === 'cpu') return;
    humano.config.face.description.enabled = true; humano.load().then(() => { const reg = humano.models && (humano.models.models || humano.models); identLista = !!(reg && reg.faceres); }).catch(() => {}).finally(() => { humano.config.face.description.enabled = !!(compr && identLista); });
  }
  const coseno = (a, b) => { let p = 0, na = 0, nb = 0; for (let i = 0; i < a.length && i < b.length; i++) { p += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return p / (Math.sqrt(na * nb) || 1); };
  // ¿cambia la cara? La referencia: las caras de frente de la prueba de luz; después, cada cara de frente o poco girada se compara con ella
  function identidad() {
    const v = S.ident; if (v.length < 4 || !compr) return;
    const ref = v.filter((x) => x.t < (compr.tRefIdent || 0) && Math.abs(x.g) < 0.15); if (ref.length < 3) return;
    let cons = 1; for (let i = 1; i < ref.length; i++) cons = Math.min(cons, coseno(ref[0].e, ref[i].e)); // la referencia tiene que ser estable
    const dim = ref[0].e.length, med = new Array(dim).fill(0); for (const x of ref) for (let i = 0; i < dim; i++) med[i] += x.e[i] / ref.length;
    const despues = v.filter((x) => x.t >= (compr.tRefIdent || 0) && Math.abs(x.g) < 0.3).map((x) => coseno(med, x.e));
    S.identDatos = { cons, n: despues.length, min: despues.length ? Math.min(...despues) : null, bajas: despues.filter((c) => c < 0.5).length }; // (prueba: la misma cara ~0,98; caras distintas ~0,34)
    S.otraCara = cons >= 0.7 && S.identDatos.bajas >= 2;
  }
  function precargaManos() {
    if (manosListas || !humano || CONFIG.backend === 'cpu') return;
    cargandoManos = true; humano.config.hand.enabled = true; humano.load().then(() => { const reg = humano.models && (humano.models.models || humano.models); manosListas = !!(reg && (reg.handtrack || reg.handdetect)); }).catch(() => {}).finally(() => { cargandoManos = false; if (!(compr && compr.manoReto)) humano.config.hand.enabled = false; });
  }
  // ¿dijo las palabras? Su voz sube después de pedírselo y sus labios se mueven con ella. Si se oye voz y los labios no se mueven,
  // es un vídeo doblado o un avatar. Si no habla (o tiene el micro apagado), no lo ha hecho.
  function vozDecide(yo) {
    const t0 = yo.vozT0; if (!t0 || !S) return;
    const antes = S.voz.filter((x) => x.t >= t0 - 3000 && x.t < t0).map((x) => x.v), despues = S.voz.filter((x) => x.t >= t0 + 400 && x.t <= t0 + 8500);
    if (despues.length < 20) return; // sin muestras del audio que llega: no se juzga
    const base = antes.length >= 5 ? cuantil(antes, 0.5) : 0, umbral = Math.max(0.02, base * 4 + 0.01), hablaMs = despues.filter((x) => x.v > umbral).length * 100;
    const vozEn = (t) => { let mejor = null, dm = 1e9; for (const x of despues) { const dd = Math.abs(x.t - t); if (dd < dm) { dm = dd; mejor = x; } } return dm < 250 ? mejor.v : null; };
    const pares = S.boca.filter((b) => (b.tf || b.t) >= t0 + 400 && (b.tf || b.t) <= t0 + 8500).map((b) => [b.v, vozEn(b.tf || b.t)]).filter((p) => p[1] != null);
    let corr = 0, db = 0; if (pares.length >= 6) { const xb = pares.map((p) => p[0]), xv = pares.map((p) => p[1]), mb = media(xb), mv = media(xv); let n = 0, a = 0, b = 0; for (let i = 0; i < xb.length; i++) { n += (xb[i] - mb) * (xv[i] - mv); a += (xb[i] - mb) ** 2; b += (xv[i] - mv) ** 2; } corr = n / (Math.sqrt(a * b) || 1); db = desv(xb); }
    S.vozDatos = { base, hablaMs, corr, db, n: pares.length };
    if (hablaMs >= 500) { if (pares.length >= 6 && (corr > 0.2 || db > 0.012)) S.vozReto = 'si'; else if (pares.length >= 8 && corr < 0.05 && db < 0.004) S.vozReto = 'mudo'; }
    else if (hablaMs < 200 && base < 0.02) S.vozReto = 'no';
  }
  async function manoReto() {
    const yo = compr; if (!M.gesto || !S || !yo) return;
    for (let i = 0; i < 25 && !manosListas && cargandoManos; i++) await new Promise((r) => setTimeout(r, 100));
    if (compr !== yo || !S) return;
    S.mano = 'nd'; S.manoDatos = null;
    const u = S.ultima; if (!u || performance.now() - u.t > 1500) return;
    const [bx, by, bw, bh] = u.caja, y0 = by + bh * 0.2, h0 = bh * 0.6;
    yo.manoZ = { cara0: [bx, by, bw, bh], c: [bx + bw * 0.12, y0, bw * 0.76, h0], l: [bx - bw * 0.62, y0, bw * 0.5, h0], r: [bx + bw * 1.12, y0, bw * 0.5, h0], centro: u.centro, ancho: bw };
    yo.manoM = []; yo.manoReto = true; S.manos.length = 0; if (manosListas) humano.config.hand.enabled = true;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms)), vivo = () => compr === yo && !!S;
    try {
      await espera(900); if (!vivo()) return; // la base: la imagen quieta de antes
      if (M.gesto('mano', 0, 0) === false) return;
      const t0 = performance.now(); yo.manoT0 = t0;
      while (performance.now() - t0 < 5500) { await espera(150); if (!vivo()) return; if (performance.now() - t0 > 2200 && manoPasada(yo)) break; }
    } catch (_) {} finally { try { M.gesto('fin', 0, 0); } catch (_) {} yo.manoReto = false; if (humano) humano.config.hand.enabled = false; }
    if (vivo()) manoDecide(yo);
  }
  function manoMuestra(t) {
    const yo = compr, Z = yo.manoZ; if (!Z) return;
    const u = S.ultima, movida = u && t - u.t < 600 ? d2(u.centro, Z.centro) / Z.ancho : null;
    yo.manoM.push({ t, c: recorteF(16, ...Z.c), l: recorteF(16, ...Z.l), r: recorteF(16, ...Z.r), movida });
  }
  function manoBase(yo) { const a = yo.manoM.filter((x) => x.t < yo.manoT0); return a.length >= 3 ? { antes: a, base: a[a.length - 1] } : null; }
  // ya pasó: algo cambió de verdad y la cara ha vuelto a estar como antes
  function manoPasada(yo) {
    const B = manoBase(yo); if (!B || !B.base.c) return false;
    const d = yo.manoM.filter((x) => x.t >= yo.manoT0 + 250 && x.c).map((x) => Math.max(mad(x.c, B.base.c), x.l && B.base.l ? mad(x.l, B.base.l) : 0, x.r && B.base.r ? mad(x.r, B.base.r) : 0));
    return d.length >= 6 && Math.max(...d) >= 16 && d.slice(-3).every((v) => v < 6);
  }
  function manoDecide(yo) {
    const B = manoBase(yo); if (!B || !B.base.c) return;
    let quieto = 0; for (let i = 1; i < B.antes.length; i++) for (const k of ['c', 'l', 'r']) if (B.antes[i][k] && B.antes[i - 1][k]) quieto = Math.max(quieto, mad(B.antes[i][k], B.antes[i - 1][k]));
    const dif = (x, k) => (x[k] && B.base[k] ? mad(x[k], B.base[k]) : 0);
    let pc = 0, pl = 0, pr = 0, tc = 0, tl = 0, tr2 = 0, validas = 0; const ult = [];
    for (const x of yo.manoM) { if (x.t < yo.manoT0 + 250 || (x.movida != null && x.movida > 0.2)) continue; validas++; const c = dif(x, 'c'), l = dif(x, 'l'), r = dif(x, 'r'); ult.push(c); if (c > pc) { pc = c; tc = x.t; } if (l > pl) { pl = l; tl = x.t; } if (r > pr) { pr = r; tr2 = x.t; } }
    const vuelve = ult.length >= 3 && ult.slice(-3).every((v) => v < Math.max(8, 0.5 * pc)), perdio = !!(S.tSinCara && S.tSinCara >= yo.manoT0 && S.tSinCara <= yo.manoT0 + 6500);
    S.manoDatos = { quieto, pc, pl, pr, validas, vuelve, perdio };
    if (quieto > 14 || validas < 8) return; // se movía mucho antes, o pocas muestras: no se juzga
    // lo que vio el detector de manos: cuánto de su cara llegó a cubrir una mano (0–1)
    const [fx, fy, fw, fh] = yo.manoZ.cara0 || [0, 0, 0, 0]; let cubre = 0, vista = 0;
    for (const x of S.manos) { if (x.t < yo.manoT0) continue; for (const [hx, hy, hw, hh] of x.cajas) { vista++; const ix = Math.max(0, Math.min(fx + fw, hx + hw) - Math.max(fx, hx)), iy = Math.max(0, Math.min(fy + fh, hy + hh) - Math.max(fy, hy)); if (fw && fh) cubre = Math.max(cubre, (ix * iy) / (fw * fh)); } }
    S.manoDatos.cubre = cubre; S.manoDatos.vista = vista;
    const U = Math.max(16, 2.2 * quieto), lado = (pl >= U * 0.8 && Math.abs(tl - tc) < 1200) || (pr >= U * 0.8 && Math.abs(tr2 - tc) < 1200);
    if (cubre >= 0.2) { // con el detector de manos: lo más fiable
      if (pc >= U * 0.8 || perdio) { S.mano = 'si'; return; }
      if (pc < 0.35 * U && !perdio) { S.mano = 'oculta'; return; }
    }
    if ((pc >= U && lado && vuelve) || (perdio && Math.max(pl, pr, pc) >= U * 0.8)) S.mano = 'si';
    else if (!perdio && pl >= U && pr >= U && Math.abs(tl - tr2) >= 150 && pc < 0.45 * Math.min(pl, pr)) S.mano = 'oculta';
    else if (Math.max(pl, pr, pc) < U * 0.6 && !vista) S.mano = 'no';
  }
  async function reflejo() {
    // cuatro destellos (dos parejas magenta/cian, cada una en orden al azar). Para contar, los cuatro tienen que mover el color de su
    // cara hacia donde toca (el magenta sube el rojo frente al verde; el cian lo baja), contra lo que había justo antes, y con fuerza
    // de sobra frente al ruido. Solo con muestras de piel recién medidas (la malla de hace menos de medio segundo): si la cara se mueve
    // y la malla llega tarde, no se juzga. Un vídeo grabado, una foto o un avatar no reciben esa luz.
    const yo = compr; if (!M.gesto || !S || !yo) return;
    yo.luz = true; S.reflejo = 'nd'; S.pantalla = false; S.reflejoEspectro = null; S.reflejoDif = S.reflejoRuido = null; S.costura = 'nd'; S.reflejoCuello = null; S.reflejoOjos = null; S.reflejoGafas = false;
    const espera = (ms) => new Promise((r) => setTimeout(r, ms)), vivo = () => compr === yo && !!S;
    const az = crypto.getRandomValues(new Uint8Array(2)), orden = [az[0] & 1, 1 - (az[0] & 1), az[1] & 1, 1 - (az[1] & 1)], marcas = [];
    // dos palabras al azar de la lista de verificación (2048 palabras neutras): «Mira a la pantalla y di en voz alta: …»
    const PL = window.GuardianaPalabras || [], ap = crypto.getRandomValues(new Uint16Array(2)), palabras = PL.length ? PL[ap[0] % PL.length] + ' ' + PL[ap[1] % PL.length] : '';
    S.vozReto = 'nd'; S.vozDatos = null; yo.vozT0 = 0; yo.palabras = palabras;
    try {
      await espera(2200); if (!vivo()) return;
      for (const c of orden) { if (!vivo()) return; if (M.gesto('luz', c, 0, palabras) === false) return; const t = performance.now(); if (!yo.vozT0) yo.vozT0 = t; marcas.push({ c, t }); yo.flash = { c, t }; await espera(1700); }
    } catch (_) { return; } finally { try { M.gesto('fin', 0, 0); } catch (_) {} yo.luz = false; }
    if (!vivo() || marcas.length < 4) return;
    const zonas = (x) => x.z.map((z) => (z[0] - z[1]) / ((z[0] + z[1] + z[2]) || 1));
    const tramo = (arr, a, b) => { const v = arr.filter((x) => x.t >= a && x.t <= b); if (v.length < 2) return null; const n = v[0].z.length, o = new Array(n).fill(0); for (const x of v) { const r = zonas(x); for (let k = 0; k < n && k < r.length; k++) o[k] += r[k] / v.length; } return o; };
    const okC = S.cuello.filter((x) => x.f), okI = S.iris.filter((x) => x.f), okO = (okI.length >= 20 ? okI : S.ojos).filter((x) => x.f), ok = S.piel.filter((x) => x.f), fondo = S.fondo.filter((x) => x.z.length === (S.fondo[S.fondo.length - 1] || { z: [] }).z.length);
    // el ruido: cuánto baila ese color sin destellos (los 2 s de antes)
    const quieto = ok.filter((x) => x.t >= marcas[0].t - 2200 && x.t < marcas[0].t + 100).map((x) => media(zonas(x))); if (quieto.length < 6) return;
    const previas = ok.filter((x) => x.t >= marcas[0].t - 2200 && x.t < marcas[0].t + 100), nz = previas.length ? previas[0].z.length : 0, esPiel = [];
    for (let q = 0; q < nz; q++) { let R = 0, G = 0, B = 0; for (const x of previas) { R += x.z[q][0]; G += x.z[q][1]; B += x.z[q][2]; } const n = previas.length || 1; R /= n; G /= n; B /= n; const rgq = (R - G) / ((R + G + B) || 1); esPiel.push(R > G && G > B * 0.75 && rgq > 0.02 && rgq < 0.4 && (R + G + B) / 3 > 35); }
    if (esPiel.filter(Boolean).length < 2) esPiel.fill(true); // si casi nada parece piel (luz rara), se usan todas
    const ruido = desv(quieto), quietoO = okO.filter((x) => x.t >= marcas[0].t - 2200 && x.t < marcas[0].t + 100).map((x) => media(zonas(x))), ruidoO = quietoO.length >= 6 ? desv(quietoO) : null; let mejor = null;
    for (let L = 100; L <= 1300; L += 100) {
      const por = [], porZona = new Array(nz).fill(0), bg = [], cu = [], oj = []; let falta = false;
      for (const m of marcas) {
        const sg = m.c ? -1 : 1, antes = tramo(ok, m.t - 450, m.t + 100), luz = tramo(ok, m.t + L, m.t + L + 380); if (!antes || !luz) { falta = true; break; }
        const dz = luz.map((v, k) => (v - antes[k]) * sg).filter((v, k) => esPiel[k]); luz.forEach((v, k) => { if (k < nz) porZona[k] += (v - antes[k]) * sg; }); por.push(media(dz));
        const fa = tramo(fondo, m.t - 450, m.t + 100), fl = tramo(fondo, m.t + L, m.t + L + 380); if (fa && fl) bg.push(media(fl.map((v, k) => (v - fa[k]) * sg)));
        const ca = tramo(okC, m.t - 450, m.t + 100), cl = tramo(okC, m.t + L, m.t + L + 380); if (ca && cl) cu.push((cl[0] - ca[0]) * sg);
        const oa = tramo(okO, m.t - 450, m.t + 100), ol = tramo(okO, m.t + L, m.t + L + 380); oj.push(oa && ol ? media(ol.map((v, k) => (v - oa[k]) * sg)) : null);
      }
      if (falta) continue;
      const prom = media(por), dBg = bg.length >= 3 ? media(bg) : 0, neto = prom - Math.max(0, dBg), zonasBien = porZona.filter((v, k) => esPiel[k] && v > 0).length, dCu = cu.length >= 3 ? media(cu) : null;
      // el retraso que mejor se ve, en la cara o en el cuello (si la cara no responde, se ve en el cuello)
      const ojV = oj.filter((v) => v != null), dOj = ojV.length >= 4 ? media(ojV) : null, bienOj = ojV.filter((v) => v > 0).length, coloresOj = new Set(marcas.filter((m, i) => oj[i] != null && oj[i] > 0).map((m) => m.c)).size;
      const valor = Math.max(neto, dCu == null ? -1 : dCu - Math.max(0, dBg), dOj == null ? -1 : dOj - Math.max(0, dBg));
      const bien = por.filter((v) => v > 0).length, colores = new Set(marcas.filter((m, i) => por[i] > 0).map((m) => m.c)).size;
      if (!mejor || valor > mejor.valor) mejor = { L, prom, neto, dBg, dCu, dOj, bienOj, coloresOj, valor, bien, colores, zonasBien };
    }
    S.reflejoRuido = ruido; if (!mejor) return; S.reflejoDif = mejor.prom; S.reflejoFondo = mejor.dBg;
    const caraResponde = mejor.bien >= 3 && mejor.colores === 2 && mejor.zonasBien >= 2 && mejor.neto >= Math.max(0.004, 1.2 * ruido) && mejor.dBg < 0.6 * mejor.prom;
    // El color de lo que rebota: la piel se traga buena parte del azul (con el magenta sube mucho más el rojo que el azul; con el cian,
    // más el verde que el azul); un cristal o una pantalla lo devuelven tal cual (cociente cerca de 1). Así se distingue una cara de
    // verdad de un vídeo puesto delante de la cámara en otra pantalla, que también «refleja» el destello.
    const rgb = (arr, a, b) => { const v = arr.filter((x) => x.t >= a && x.t <= b); if (v.length < 2) return null; const n = v[0].z.length, o = Array.from({ length: n }, () => [0, 0, 0]); for (const x of v) for (let q = 0; q < n && q < x.z.length; q++) for (let c = 0; c < 3; c++) o[q][c] += x.z[q][c] / v.length; return o; };
    const cocientes = [];
    for (const m of marcas) {
      const a = rgb(ok, m.t - 450, m.t + 100), l = rgb(ok, m.t + mejor.L, m.t + mejor.L + 380); if (!a || !l) continue;
      let dR = 0, dG = 0, dB = 0; for (let q = 0; q < a.length; q++) { if (esPiel[q] === false) continue; const br = (a[q][0] + a[q][1] + a[q][2]) / 3 || 1; dR += (l[q][0] - a[q][0]) / br; dG += (l[q][1] - a[q][1]) / br; dB += (l[q][2] - a[q][2]) / br; }
      const den = m.c ? dG : dR; if (den > 0.004 * a.length) cocientes.push(dB / den);
    }
    S.reflejoEspectro = cocientes.length >= 3 ? cuantil(cocientes, 0.5) : null;
    S.pantalla = caraResponde && S.reflejoEspectro != null && S.reflejoEspectro >= 0.95;
    if (caraResponde && !S.pantalla) S.reflejo = 'si';
    // o en sus ojos / sus gafas: el brillo de su pantalla en los cristales (dueño, 22 nov 18:05: «tengo gafas sin antirreflejo… sí que se ve reflejado»)
    S.reflejoOjos = mejor.dOj;
    const ojosResponden = mejor.dOj != null && mejor.bienOj >= 3 && mejor.coloresOj === 2 && mejor.dOj >= Math.max(0.008, 1.5 * (ruidoO || 0)) && mejor.dBg < 0.5 * mejor.dOj;
    if (S.reflejo !== 'si' && !S.pantalla && ojosResponden) { S.reflejo = 'si'; S.reflejoGafas = true; }
    // la costura: su cuello refleja la luz con claridad y su cara apenas (una cara de verdad, más cerca de la pantalla, refleja igual o más)
    if (mejor.dCu != null) { S.reflejoCuello = mejor.dCu; if (S.reflejo !== 'si' && !ojosResponden && (mejor.dOj == null || mejor.dOj < 0.4 * mejor.dCu) && mejor.dCu >= Math.max(0.005, 1.5 * ruido) && mejor.prom <= 0.35 * mejor.dCu && mejor.dBg < 0.6 * mejor.dCu) S.costura = 'si'; }
  }
  // el resultado: un número grande y una frase
  function fin(forzar) {
    if (!compr) return;
    if (compr.fase === 'fin' && !forzar) return;
    const poco = compr.frontalMs != null && compr.frontalMs < 1000;
    const pct = poco ? null : porcentaje(), I = S ? S.indicios : {}, k = Object.keys(I).filter((x) => FUERZA[x] >= 2).sort((a, b) => FUERZA[b] - FUERZA[a]);
    const nivel = pct == null ? 'nd' : pct >= 85 ? 'real' : pct >= 60 ? 'bien' : pct >= 30 ? 'raro' : 'falso';
    if (compr.fase === 'fin' && compr.pct === pct) return;
    compr.fase = 'fin'; compr.poco = poco; if (humano) humano.config.face.description.enabled = false; avisaFin(); compr.pct = pct; compr.tFin = compr.tFin || performance.now(); compr.r = nivel === 'falso' || nivel === 'raro' ? 'riesgo' : nivel;
    compr.color = { real: '143,224,174', bien: '207,230,250', raro: '240,199,127', falso: '242,160,148', nd: '207,230,250' }[nivel];
    cabecera.classList.remove('visible'); setTimeout(() => { if (compr && compr.fase === 'fin') cabecera.hidden = true; }, 400);
    res.dataset.n = nivel; cuentaPct(pct);
    res.querySelector('.vg-r-et').textContent = tr('vc_probabilidad');
    const n = S && S.fuente && S.fuente.n ? S.fuente.n : tr('vg_programa'), { A, F } = cuentas(), motivo = k.length ? tr(TXT[k[0]]).replace('{n}', n) : A === 0 && F ? tr('vg_noResponde') : A === 0 ? tr('vg_inconcluso') : S && S.vozReto === 'no' ? tr('vg_noVoz') : S && S.giro === 'no' ? tr('vg_noGira') : S && S.mano === 'no' ? tr('vg_noMano') : '';
    res.querySelector('.vg-r-txt').textContent = nivel === 'nd' ? tr(poco ? 'vc_noMira' : 'vc_sinCara') : nivel === 'real' ? tr('vc_real') : nivel === 'bien' ? (tr('vc_bien') + (motivo ? ' ' + motivo : '')) : (nivel === 'raro' ? tr('vc_raro') : tr('vc_falso')) + ' ' + motivo;
    const lista = res.querySelector('.vg-r-pruebas'); lista.textContent = '';
    if (S) for (const [k, v] of [['vc_pLuz', S.reflejo === 'si' ? 'si' : 'nd'], ['vc_pVoz', S.vozReto === 'si' ? 'si' : S.vozReto === 'no' || S.vozReto === 'mudo' ? 'no' : 'nd'], ['vc_pMano', S.mano === 'si' ? 'si' : S.mano === 'no' || S.mano === 'oculta' ? 'no' : 'nd'], ['vc_pGiro', S.giro === 'si' ? 'si' : S.giro === 'no' ? 'no' : 'nd']]) {
      const li = document.createElement('li'); li.className = 'vg-p-' + v; li.textContent = tr(k); lista.append(li);
    }
    res.querySelector('.vg-r-cerrar').textContent = tr('vc_cerrar');
    res.hidden = false; requestAnimationFrame(() => res.classList.add('visible'));
    if (nivel === 'falso') { try { if (navigator.vibrate) navigator.vibrate([70, 60, 70]); } catch (_) {} }
  }
  function cuentaPct(pct) {
    const el = res.querySelector('.vg-r-pct'), anillo = res.querySelector('.vg-r-valor'), yo = compr;
    cancelAnimationFrame(yo.rafPct); anillo.style.setProperty('--v', String(pct == null ? 0 : pct));
    if (pct == null) { el.textContent = '—'; return; }
    const desde = yo.pctVisto || 0, t0 = performance.now() + 150, dur = 1400;
    const paso = (t) => { if (compr !== yo) return; const u = Math.max(0, Math.min(1, (t - t0) / dur)), e = 1 - Math.pow(1 - u, 3.2), v = Math.round(desde + (pct - desde) * e); el.textContent = v + '%'; yo.pctVisto = v; if (u < 1) yo.rafPct = requestAnimationFrame(paso); };
    el.textContent = desde + '%'; yo.rafPct = requestAnimationFrame(paso);
  }
  let teComprueban = 0, enEspera = false;
  function muestraEspera(si) {
    cabecera.classList.toggle('vg-espera', si);
    if (si) { const tx = cabecera.querySelector('.vg-a-texto'); tx.textContent = tr('vc_espera'); tx.dataset.k = 'vc_espera'; cabecera.querySelector('.vg-a-barra i').style.setProperty('--p', '0'); cabecera.hidden = false; requestAnimationFrame(() => cabecera.classList.add('visible')); }
    else if (!compr) { cabecera.classList.remove('visible'); cabecera.hidden = true; }
  }
  // el final de una comprobación entera se avisa con «fin» y n = 9 (los «fin» de cada prueba van con n = 0)
  function avisaFin() { if (compr && !compr.finAvisado) { compr.finAvisado = true; try { M.gesto('fin', 9, 0); } catch (_) {} } }
  M.on('gesto', (g) => {
    if (!g) return;
    if (g.q === 'inicio') {
      teComprueban = performance.now() + 40000;
      // las dos a la vez: sigue la de quien llamó; la otra se aparta y espera
      if (compr && compr.fase !== 'fin') { const e = M.estadoLlamada ? M.estadoLlamada() : null; if (!e || e.rol !== 'llama') { cierraComprobacion(); enEspera = true; muestraEspera(true); } }
    } else if (g.q === 'fin' && (g.n | 0) === 9) {
      teComprueban = 0;
      if (enEspera) { enEspera = false; setTimeout(() => { if (!compr) comprueba(); }, 1200); }
    }
  });
  function cierraComprobacion() {
    // lo que ya ha visto en pantalla no se repite enseguida como aviso
    if (compr && compr.r === 'riesgo' && S) S.cerradoPor = { nivel: S.mostrado || 'riesgo', motivos: (S.motivos || []).join(), t: performance.now() };
    avisaFin();
    if (compr) { clearTimeout(compr.tp); cancelAnimationFrame(compr.raf); cancelAnimationFrame(compr.rafPct); if (compr.luz || compr.reto || compr.manoReto) { try { M.gesto('fin', 0, 0); } catch (_) {} } }
    { const sl = video.closest('.sala'); if (sl) sl.classList.remove('comprobando'); }
    if (humano) humano.config.face.description.enabled = false;
    compr = null; lienzo.hidden = true; cabecera.classList.remove('visible'); cabecera.hidden = true; res.classList.remove('visible'); res.hidden = true;
  }
  const bComprobar = $('#b-comprobar'); if (bComprobar) bComprobar.addEventListener('click', () => { if (enEspera) { enEspera = false; muestraEspera(false); return; } if (compr) cierraComprobacion(); else comprueba(); });

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
    cierraComprobacion(); S = null; oculta(); if (pre) pre.hidden = true;
  }
  M.on('llamada', (e) => { if (e && e.estado === 'hablando' && e.video !== false) arranca(); else if (e && ['fin', 'libre', 'rechazada', 'caida'].includes(e.estado)) para(); });
  M.on('fin', () => para());
  window.ElixireVigia = { pausa(si) { enPausa = si ? performance.now() + 8000 : 0; }, get estado() { return S ? { reflejo: S.reflejo, reflejoDif: S.reflejoDif, giro: S.giro, giroMax: S.giroMax, giroPerdida: S.giroPerdida, giroBueno: S.giroBueno, giroContra: S.giroContra, espectro: S.reflejoEspectro, pantalla: S.pantalla, mano: S.mano, manoDatos: S.manoDatos, costura: S.costura, cuello: S.reflejoCuello, perfil: S.perfil, texR: S.texR, indicios: Object.keys(S.indicios), vida: S.vida.slice(), aviso: S.mostrado, n: S.n, conCara: S.conCara, frames: S.frames, quietas: media(S.quietas.map((x) => x.q)), bucle: S.bucle.racha, plano: S.plano, parpadeos: S.parpadeos.length, ojosMs: S.ojosMs, dt: S.dtMedio, fuente: S.fuente, fallo } : null; }, diag: () => { diagVisible = true; pintaDiag(); }, comprueba: () => comprueba(), cierra: () => cierraComprobacion() };
})();
