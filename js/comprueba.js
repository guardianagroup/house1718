// Elixire · «Comprobar»: ¿una persona real en directo o una estafa? (19 nov 2026)
// Dueño, 16:45: «un botón… para saber si la otra persona es un avatar o no… que se vea cómo se hace un mapeo… y ponga "analizando"…
// le aparece a la persona que lo está haciendo, no a los dos… y el resultado». 16:56: «intenta detectar la estafa con la mayor
// tecnología posible». 17:14: «ponte en la mente del ladrón que quiere robar la identidad y descubrirás cómo protegernos».
// Lo que haría el estafador, y lo que aquí lo delata (todo en este equipo, sobre la imagen y el sonido que ya llegan; no se envía ni
// se guarda nada y la otra persona no ve nada):
//   · Poner otra cara en directo con un programa (DeepFaceLive, Deep-Live-Cam…): llega al navegador como una cámara virtual. Se le
//     pregunta en silencio a su navegador de qué tipo es su cámara (motor.js: fuente; contesta solo el tipo, nunca el nombre).
//   · Un vídeo grabado o una foto animada: imagen congelada, sin parpadeo, sin relieve 3D (una foto animada se deforma como algo
//     plano: la nariz no se desplaza respecto al contorno al girar), labios que no van con su voz, y no responde a la prueba extra
//     (girar la cabeza cuando se le pide).
//   · Una cara generada: el pulso en la piel (rPPG, método POS de Wang et al., 2017) suele desaparecer: las mejillas y la frente de
//     una persona cambian de color con cada latido, a la vez y al mismo ritmo. La compresión del vídeo también lo borra a veces, así
//     que no verlo no acusa a nadie; verlo, coherente en las tres zonas, es una señal más de vida.
//   · Esconderse: poca luz, lejos de la cámara o «la cámara no funciona». Se dice tal cual.
//   · La voz: si va con los labios y hasta dónde llega su espectro (un corte seco en 11–12 kHz es típico de voces sintéticas; los
//     auriculares Bluetooth lo cortan en 4 u 8 kHz). Solo informa.
// La cara se sigue con 68 puntos (face-api.js, licencia MIT, en js/terceros/, con dos modelos pequeños en modelos/; se cargan solo al
// tocar «Comprobar»). El resultado lo dice con prudencia y siempre recuerda la regla que no falla: si pide dinero, códigos o datos
// con prisa, se cuelga y se le llama a su número de siempre.
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const tr = (k) => (window.ElixireIdioma ? window.ElixireIdioma.t(k) : k);
  const M = window.ElixireMotor;
  const FACEAPI = { src: 'js/terceros/face-api.min.js?v=0.22.2', sri: 'sha384-gzn2n++arkvyhdNLmUf1s6F5NZ8iAbZ7FhIt+Zw7Jlf1n/vNTmZ3+cYr7S4ogyco' };
  // Dueño, 18:26: «si la persona se mueve, ya se cancela. No quiero que se cancele… quiero que analicen los movimientos, si son
  // naturales». Ya no hay un tiempo fijo que corta: 9 s como mínimo y, si la cara se pierde al moverse, se sigue (con la última
  // caja, ver siguePuntos) y se alarga hasta tener muestras suficientes (16 s como mucho). El movimiento cuenta a favor si es natural.
  const DUR = 9000, DUR_MAX = 16000, MUESTRAS = 45, DUR_GIRO = 10000;
  // tres palabras al azar para la prueba extra: un vídeo grabado no puede decirlas
  const PALABRAS = { es: ['luna', 'siete', 'café', 'río', 'verde', 'mesa', 'nube', 'tren', 'sol', 'mar', 'pan', 'flor', 'casa', 'tigre', 'azul', 'nueve', 'limón', 'playa', 'reloj', 'fuego', 'árbol', 'cielo', 'perro', 'gato', 'libro', 'monte', 'rojo', 'cinco', 'miel', 'barco'], en: ['moon', 'seven', 'coffee', 'river', 'green', 'table', 'cloud', 'train', 'sun', 'sea', 'bread', 'flower', 'house', 'tiger', 'blue', 'nine', 'lemon', 'beach', 'clock', 'fire', 'tree', 'sky', 'dog', 'cat', 'book', 'hill', 'red', 'five', 'honey', 'boat'] };
  function tresPalabras() { const l = PALABRAS[enIngles() ? 'en' : 'es'], r = new Uint32Array(3); crypto.getRandomValues(r); const out = []; for (let i = 0; i < 3; i++) { let w = l[r[i] % l.length]; let k = 1; while (out.includes(w)) w = l[(r[i] + k++) % l.length]; out.push(w); } return out.join(', '); }
  const capa = $('#comprobacion'), lienzo = $('#comprobacion-lienzo'), g = lienzo.getContext('2d');
  const onda = $('#comprobacion-onda'), go = onda.getContext('2d');
  const video = $('#video-suyo'), sala = $('#sala'), vivo = $('#comprobacion-vivo');
  let cargando = null, enMarcha = false, cancelado = false, triangulos = null, previo = null, vuelta = 0;

  function cargaFaceApi() {
    if (window.faceapi && window.faceapi.nets.faceLandmark68Net.isLoaded) return Promise.resolve(window.faceapi);
    if (cargando) return cargando;
    cargando = new Promise((res, rej) => {
      if (window.faceapi) return res(window.faceapi);
      const s = document.createElement('script'); s.src = FACEAPI.src; s.integrity = FACEAPI.sri;
      s.onload = () => (window.faceapi ? res(window.faceapi) : rej(new Error('faceapi'))); s.onerror = () => rej(new Error('faceapi'));
      document.head.append(s);
    }).then(async (fa) => {
      if (!fa.nets.tinyFaceDetector.isLoaded) await fa.nets.tinyFaceDetector.loadFromUri('modelos');
      if (!fa.nets.faceLandmark68Net.isLoaded) await fa.nets.faceLandmark68Net.loadFromUri('modelos');
      return fa;
    });
    cargando.catch(() => { cargando = null; });
    return cargando;
  }

  // ---- la malla: triángulos de Delaunay de los 68 puntos (una vez; los puntos siempre van en el mismo orden) ----
  function delaunay(p) {
    const n = p.length, xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
    const mx = Math.min(...xs), my = Math.min(...ys), d = Math.max(Math.max(...xs) - mx, Math.max(...ys) - my) * 20 + 1;
    const P = p.concat([[mx - d, my - d], [mx + d * 2, my - d], [mx - d, my + d * 2]]);
    let tri = [[n, n + 1, n + 2]];
    const circ = (t) => {
      const [a, b, c] = t.map((i) => P[i]), D = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
      if (!D) return [0, 0, Infinity];
      const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / D;
      const uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / D;
      return [ux, uy, (a[0] - ux) ** 2 + (a[1] - uy) ** 2];
    };
    for (let i = 0; i < n; i++) {
      const [x, y] = P[i], malos = [], bordes = new Map();
      for (const t of tri) { const [ux, uy, r2] = circ(t); if ((x - ux) ** 2 + (y - uy) ** 2 < r2) malos.push(t); }
      for (const t of malos) for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) { const k = a < b ? a + ',' + b : b + ',' + a; bordes.set(k, bordes.has(k) ? null : [a, b]); }
      tri = tri.filter((t) => !malos.includes(t));
      for (const e of bordes.values()) if (e) tri.push([e[0], e[1], i]);
    }
    return tri.filter((t) => t.every((i) => i < n));
  }
  const CONTORNOS = [[0, 16, false], [17, 21, false], [22, 26, false], [27, 30, false], [31, 35, false], [36, 41, true], [42, 47, true], [48, 59, true], [60, 67, true]];

  // ---- dibujo de la malla sobre el vídeo ----
  function ajustaLienzo() {
    const r = video.getBoundingClientRect(), k = Math.min(2, devicePixelRatio || 1);
    lienzo.style.left = r.left + 'px'; lienzo.style.top = r.top + 'px'; lienzo.style.width = r.width + 'px'; lienzo.style.height = r.height + 'px';
    const w = Math.round(r.width * k), h = Math.round(r.height * k);
    if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; }
    g.setTransform(k, 0, 0, k, 0, 0);
    return r;
  }
  // de la imagen del vídeo a la pantalla (con «object-fit: cover»)
  function aPantalla(r) {
    const vw = video.videoWidth || 1, vh = video.videoHeight || 1, s = Math.max(r.width / vw, r.height / vh);
    return { s, ox: (r.width - vw * s) / 2, oy: (r.height - vh * s) / 2 };
  }
  // El escáner sobre la cara (dueño, 18:15: «que la cara se vea, que se está haciendo un escáner a la propia cara, lo más profesional
  // posible»): fuera de la cara, todo más oscuro; sobre ella, la malla de sus 68 puntos, los contornos con luz, una línea que la recorre
  // de arriba abajo y enciende los puntos por los que pasa, las tres zonas de piel del pulso y el recuadro con su rótulo.
  function dibuja(r, puntos, avance, t) {
    g.clearRect(0, 0, r.width, r.height);
    g.fillStyle = 'rgba(3,6,10,.5)'; g.fillRect(0, 0, r.width, r.height);
    if (puntos) {
      const xs = puntos.map((q) => q[0]), ys = puntos.map((q) => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), m = (x1 - x0) * 0.18;
      const bx = x0 - m, by = y0 - m * 1.6, bw = x1 - x0 + 2 * m, bh = y1 - y0 + m * 2.4, cx = bx + bw / 2, cy = by + bh / 2;
      // la cara, a la vista (con el borde suave)
      g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.shadowColor = '#000'; g.shadowBlur = Math.max(18, bw * 0.12);
      g.beginPath(); g.ellipse(cx, cy, bw * 0.55, bh * 0.55, 0, 0, Math.PI * 2); g.fill(); g.restore();
      // la línea que recorre la cara, de arriba abajo
      const ciclo = 2400, u = (t % ciclo) / ciclo, ly = by + bh * u;
      // la malla
      if (!triangulos) triangulos = delaunay(puntos);
      g.lineWidth = 0.8; g.strokeStyle = 'rgba(156,195,228,.5)'; g.beginPath();
      for (const [a, b, c] of triangulos) { g.moveTo(puntos[a][0], puntos[a][1]); g.lineTo(puntos[b][0], puntos[b][1]); g.lineTo(puntos[c][0], puntos[c][1]); g.closePath(); }
      g.stroke();
      // los contornos: mandíbula, cejas, nariz, ojos y labios
      g.lineWidth = 1.6; g.strokeStyle = 'rgba(226,240,252,.95)'; g.shadowColor = 'rgba(156,195,228,.95)'; g.shadowBlur = 10;
      for (const [i, j, cierra] of CONTORNOS) { g.beginPath(); g.moveTo(puntos[i][0], puntos[i][1]); for (let k = i + 1; k <= j; k++) g.lineTo(puntos[k][0], puntos[k][1]); if (cierra) g.closePath(); g.stroke(); }
      // los puntos: laten, y se encienden al pasar la línea
      for (let k = 0; k < puntos.length; k++) {
        const q = puntos[k], cerca = Math.max(0, 1 - Math.abs(q[1] - ly) / (bh * 0.07)), a = 0.55 + 0.25 * Math.sin(t / 260 + k * 0.45) + 0.45 * cerca;
        g.fillStyle = 'rgba(234,244,253,' + Math.min(1, a).toFixed(3) + ')'; g.shadowBlur = 6 + 12 * cerca;
        g.beginPath(); g.arc(q[0], q[1], 1.8 + 1.4 * cerca, 0, Math.PI * 2); g.fill();
      }
      g.shadowBlur = 0;
      // las tres zonas de piel donde se mide el pulso
      if (zonasPantalla) { g.lineWidth = 1; g.strokeStyle = 'rgba(92,201,138,.5)'; g.setLineDash([3, 4]); for (const z of zonasPantalla) g.strokeRect(z[0], z[1], z[2] - z[0], z[3] - z[1]); g.setLineDash([]); }
      // la línea, con su estela
      const gr = g.createLinearGradient(0, ly - bh * 0.16, 0, ly);
      gr.addColorStop(0, 'rgba(156,195,228,0)'); gr.addColorStop(1, 'rgba(156,195,228,.32)');
      g.fillStyle = gr; g.fillRect(bx, ly - bh * 0.16, bw, bh * 0.16);
      g.fillStyle = 'rgba(240,248,255,.95)'; g.shadowColor = 'rgba(156,195,228,1)'; g.shadowBlur = 12; g.fillRect(bx, ly - 1, bw, 2); g.shadowBlur = 0;
      // el recuadro: esquinas, marcas y su rótulo
      const e = Math.min(bw, bh) * 0.15; g.lineWidth = 2.6; g.strokeStyle = '#9CC3E4'; g.lineCap = 'round'; g.beginPath();
      for (const [ex, ey, sx, sy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) { g.moveTo(ex, ey + sy * e); g.lineTo(ex, ey); g.lineTo(ex + sx * e, ey); }
      g.stroke(); g.lineWidth = 1.2; g.strokeStyle = 'rgba(156,195,228,.6)'; g.beginPath();
      for (const f of [0.25, 0.5, 0.75]) { g.moveTo(bx - 4, by + bh * f); g.lineTo(bx + 4, by + bh * f); g.moveTo(bx + bw - 4, by + bh * f); g.lineTo(bx + bw + 4, by + bh * f); }
      g.stroke(); g.lineCap = 'butt';
      g.font = '600 10px ' + fam; g.textBaseline = 'bottom'; g.fillStyle = 'rgba(156,195,228,.95)';
      const rot = tr('mallaRotulo'); g.fillText(rot, bx + 2, by - 8);
      g.fillStyle = Math.floor(t / 500) % 2 ? '#5CC98A' : 'rgba(92,201,138,.35)'; g.beginPath(); g.arc(bx + bw - 6, by - 13, 3, 0, Math.PI * 2); g.fill();
    } else {
      // buscando la cara: un barrido por toda la imagen
      const ys2 = r.height * ((t % 2600) / 2600);
      g.fillStyle = 'rgba(156,195,228,.55)'; g.shadowColor = 'rgba(156,195,228,1)'; g.shadowBlur = 10; g.fillRect(0, ys2 - 1, r.width, 2); g.shadowBlur = 0;
    }
    $('#comprobacion-avance').style.width = Math.round(avance * 100) + '%';
  }
  let zonasPantalla = null;

  // ---- utilidades ----
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const ojo = (p, i) => (dist(p[i + 1], p[i + 5]) + dist(p[i + 2], p[i + 4])) / (2 * dist(p[i], p[i + 3]) || 1);
  const media = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const desv = (a) => { const m = media(a); return Math.sqrt(media(a.map((x) => (x - m) ** 2))); };
  const mediana = (a) => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  const lerp = (a, b, t) => a + (b - a) * t;
  function correlacion(a, b) { const ma = media(a), mb = media(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sa && sb ? s / Math.sqrt(sa * sb) : 0; }
  const enIngles = () => !!(window.ElixireIdioma && window.ElixireIdioma.actual && window.ElixireIdioma.actual() === 'en');
  const fuente2D = () => getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  let fam = 'system-ui, sans-serif';

  // ---- las señales en directo (debajo de «Analizando…») ----
  const CHIPS = ['cara', 'parpadeo', 'movimiento', 'relieve', 'pulso', 'voz', 'camara'];
  function ponChips() { vivo.textContent = ''; for (const k of CHIPS) { const li = document.createElement('li'); li.dataset.k = k; li.textContent = tr('chip_' + k); vivo.append(li); } }
  function chip(k, estado) { const li = vivo.querySelector('li[data-k="' + k + '"]'); if (li && li.className !== estado) li.className = estado; }

  // ---- la piel: el pulso (rPPG) ----
  // En cada imagen: la media de color de tres zonas de piel (las dos mejillas y la frente), con un filtro de color de piel
  // (YCbCr) que deja fuera pelo, gafas y fondo. Al final: el método POS en ventanas de 1,6 s, el espectro y el pico entre 45 y 180
  // pulsaciones por minuto; «detectado» solo si el pico destaca (SNR) y al menos dos zonas coinciden en el mismo ritmo.
  const PIEL = 112, pc = document.createElement('canvas'); pc.width = PIEL; pc.height = PIEL;
  const pg = pc.getContext('2d', { willReadFrequently: true });
  function zonas(p) {
    const ojoY = (p[37][1] + p[38][1] + p[43][1] + p[44][1]) / 4, cejaY = Math.min(p[19][1], p[24][1]), d = Math.max(3, ojoY - cejaY);
    return [
      [lerp(p[2][0], p[31][0], 0.22), p[29][1], lerp(p[2][0], p[31][0], 0.8), lerp(p[33][1], p[48][1], 0.45)],
      [lerp(p[35][0], p[14][0], 0.2), p[29][1], lerp(p[35][0], p[14][0], 0.78), lerp(p[33][1], p[54][1], 0.45)],
      [lerp(p[19][0], p[24][0], 0.05), cejaY - d * 1.55, lerp(p[19][0], p[24][0], 0.95), cejaY - d * 0.35],
    ];
  }
  function muestraPiel(p, t) {
    const vw = video.videoWidth, vh = video.videoHeight; if (!vw || !vh) return null;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const q of p) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
    y0 -= (y1 - y0) * 0.45;
    const cx = Math.max(0, x0), cy = Math.max(0, y0), cw = Math.min(vw, x1) - cx, ch = Math.min(vh, y1) - cy;
    if (cw < 24 || ch < 24) return null;
    try { pg.drawImage(video, cx, cy, cw, ch, 0, 0, PIEL, PIEL); } catch (_) { return null; }
    let img; try { img = pg.getImageData(0, 0, PIEL, PIEL).data; } catch (_) { return null; }
    const kx = PIEL / cw, ky = PIEL / ch, z = [];
    let ys = 0, ny = 0, rs = 0, gs = 0, bs = 0;
    for (let i = 0; i < img.length; i += 16) { ys += 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]; rs += img[i]; gs += img[i + 1]; bs += img[i + 2]; ny++; }
    for (const [ax, ay, bx, by] of zonas(p)) {
      const zx0 = Math.max(0, Math.floor((Math.min(ax, bx) - cx) * kx)), zx1 = Math.min(PIEL, Math.ceil((Math.max(ax, bx) - cx) * kx));
      const zy0 = Math.max(0, Math.floor((Math.min(ay, by) - cy) * ky)), zy1 = Math.min(PIEL, Math.ceil((Math.max(ay, by) - cy) * ky));
      let r = 0, gg = 0, b = 0, n = 0;
      for (let y = zy0; y < zy1; y++) for (let x = zx0; x < zx1; x++) {
        const i = (y * PIEL + x) * 4, R = img[i], G = img[i + 1], B = img[i + 2];
        const Y = 0.299 * R + 0.587 * G + 0.114 * B, Cr = 128 + 0.5 * R - 0.4187 * G - 0.0813 * B, Cb = 128 - 0.1687 * R - 0.3313 * G + 0.5 * B;
        if (Y < 30 || Y > 248 || Cr < 132 || Cr > 182 || Cb < 72 || Cb > 133) continue;
        r += R; gg += G; b += B; n++;
      }
      z.push(n >= 20 ? [r / n, gg / n, b / n] : null);
    }
    return { t, z, y: ny ? ys / ny : 0, rgb: ny ? [rs / ny, gs / ny, bs / ny] : null };
  }
  // la señal de cada zona, a 30 imágenes por segundo exactas (la llegada de imágenes no es regular)
  const FS = 30;
  function remuestrea(piel, k) {
    const v = piel.filter((m) => m.z[k]);
    if (v.length < FS * 3) return null;
    const t0 = v[0].t, t1 = v[v.length - 1].t, n = Math.floor((t1 - t0) / 1000 * FS);
    if (n < FS * 4 || v.length < 0.3 * n) return null;
    const R = new Float64Array(n), G = new Float64Array(n), B = new Float64Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 1000 / FS;
      while (j < v.length - 2 && v[j + 1].t < t) j++;
      const a = v[j], b = v[j + 1] || a, u = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 0;
      R[i] = lerp(a.z[k][0], b.z[k][0], u); G[i] = lerp(a.z[k][1], b.z[k][1], u); B[i] = lerp(a.z[k][2], b.z[k][2], u);
    }
    return { R, G, B };
  }
  // POS (Plane-Orthogonal-to-Skin, Wang et al. 2017)
  function pos(R, G, B) {
    const N = R.length, l = Math.round(1.6 * FS), H = new Float64Array(N);
    const s1 = new Float64Array(l), s2 = new Float64Array(l);
    for (let n = 0; n + l <= N; n++) {
      let mr = 0, mg = 0, mb = 0; for (let k = n; k < n + l; k++) { mr += R[k]; mg += G[k]; mb += B[k]; }
      mr /= l; mg /= l; mb /= l; if (!mr || !mg || !mb) continue;
      for (let k = 0; k < l; k++) { const r = R[n + k] / mr, gg = G[n + k] / mg, b = B[n + k] / mb; s1[k] = gg - b; s2[k] = gg + b - 2 * r; }
      let m1 = 0, m2 = 0; for (let k = 0; k < l; k++) { m1 += s1[k]; m2 += s2[k]; } m1 /= l; m2 /= l;
      let v1 = 0, v2 = 0; for (let k = 0; k < l; k++) { v1 += (s1[k] - m1) ** 2; v2 += (s2[k] - m2) ** 2; }
      const a = v2 ? Math.sqrt(v1 / v2) : 0;
      let mh = 0; for (let k = 0; k < l; k++) mh += s1[k] + a * s2[k]; mh /= l;
      for (let k = 0; k < l; k++) H[n + k] += s1[k] + a * s2[k] - mh;
    }
    return H;
  }
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let x = re[i]; re[i] = re[j]; re[j] = x; x = im[i]; im[i] = im[j]; im[j] = x; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < h; k++) {
          const a = i + k, b = a + h, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }
  // el ritmo dominante entre 0,75 y 3 Hz (45–180 por minuto) y cuánto destaca (SNR en dB, con su primer armónico)
  function ritmo(H) {
    const n = H.length; if (n < FS * 4) return null;
    // sin tendencia (recta de mínimos cuadrados) y con ventana de Hann
    let sx = 0, sy = 0, sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sx += i; sy += H[i]; sxx += i * i; sxy += i * H[i]; }
    const pend = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), orig = (sy - pend * sx) / n;
    const N = 2048, re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < n; i++) re[i] = (H[i] - (orig + pend * i)) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1)));
    fft(re, im);
    const P = (k) => re[k] * re[k] + im[k] * im[k], hz = (k) => k * FS / N;
    let kmax = -1, pmax = 0;
    for (let k = 1; k < N / 2; k++) { const f = hz(k); if (f < 0.75 || f > 3.0) continue; const p = P(k); if (p > pmax) { pmax = p; kmax = k; } }
    if (kmax < 0) return null;
    const f0 = hz(kmax); let sen = 0, tot = 0;
    for (let k = 1; k < N / 2; k++) { const f = hz(k); if (f < 0.6 || f > 4.0) continue; const p = P(k); tot += p; if (Math.abs(f - f0) <= 0.1 || Math.abs(f - 2 * f0) <= 0.15) sen += p; }
    return { f: f0, snr: 10 * Math.log10(sen / Math.max(1e-12, tot - sen)) };
  }
  function pulso(piel) {
    const zs = [0, 1, 2].map((k) => remuestrea(piel, k));
    const validas = zs.filter(Boolean);
    if (validas.length < 2) return { estado: 'nd', razon: 'piel' };
    const hs = validas.map((z) => pos(z.R, z.G, z.B));
    const n = Math.min(...hs.map((h) => h.length)), suma = new Float64Array(n);
    for (const h of hs) { const d = desv(Array.from(h.subarray(0, n))) || 1; for (let i = 0; i < n; i++) suma[i] += h[i] / d; }
    const total = ritmo(suma); if (!total) return { estado: 'nd', razon: 'corto' };
    const cada = hs.map((h) => ritmo(h)).filter(Boolean), iguales = cada.filter((r) => Math.abs(r.f - total.f) * 60 <= 8).length;
    const si = total.snr >= 0.5 && iguales >= 2;
    return { estado: si ? 'si' : 'nd', lpm: Math.round(total.f * 60), snr: total.snr, iguales, zonas: hs.length };
  }
  // el trazo en directo: el verde de las mejillas, sin la deriva lenta (lo que se ve latir)
  function trazaPiel(piel, ms) {
    const fin = piel.length ? piel[piel.length - 1].t : 0, v = [];
    for (let i = piel.length - 1; i >= 0 && fin - piel[i].t <= ms + 1000; i--) { const m = piel[i]; const a = m.z[0], b = m.z[1]; if (a || b) v.push([m.t, a && b ? (a[1] + b[1]) / 2 : (a || b)[1]]); }
    v.reverse(); if (v.length < 8) return null;
    const out = [];
    for (let i = 0; i < v.length; i++) {
      if (fin - v[i][0] > ms) continue;
      let s = 0, n = 0; for (let j = i; j >= 0 && v[i][0] - v[j][0] <= 500; j--) { s += v[j][1]; n++; } for (let j = i + 1; j < v.length && v[j][0] - v[i][0] <= 500; j++) { s += v[j][1]; n++; }
      out.push([v[i][0], v[i][1] - s / n]);
    }
    const amp = Math.max(0.15, ...out.map((x) => Math.abs(x[1])));
    return out.map(([t, x]) => [(t - (fin - ms)) / ms, Math.max(-1, Math.min(1, x / amp))]);
  }

  // ---- el sonido: volumen (para los labios) y espectro (hasta dónde llega la voz) ----
  async function abreAudio() {
    try {
      const at = video.srcObject && video.srcObject.getAudioTracks()[0]; if (!at) return null;
      const AC = window.AudioContext || window.webkitAudioContext; const ctx = new AC(); if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      const an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0;
      ctx.createMediaStreamSource(new MediaStream([at])).connect(an);
      return { ctx, an, td: new Float32Array(an.fftSize), fd: new Float32Array(an.frequencyBinCount), acum: new Float64Array(an.frequencyBinCount), voz: 0, suelo: Infinity, e: 0, ult: 0 };
    } catch (_) { return null; }
  }
  function muestraAudio(A, ahora) {
    if (!A || ahora - A.ult < 40) return; A.ult = ahora;
    A.an.getFloatTimeDomainData(A.td); let s = 0; for (const x of A.td) s += x * x; A.e = Math.sqrt(s / A.td.length);
    A.an.getFloatFrequencyData(A.fd);
    const hz = A.ctx.sampleRate / 2 / A.fd.length; let banda = 0, nb = 0;
    for (let k = Math.floor(250 / hz); k <= Math.ceil(3500 / hz); k++) { banda += Math.pow(10, A.fd[k] / 10); nb++; }
    banda /= nb || 1;
    if (banda > 0) A.suelo = Math.min(A.suelo * 1.002, banda);
    if (banda > 1e-7 && banda > A.suelo * 8) { for (let k = 0; k < A.fd.length; k++) A.acum[k] += Math.pow(10, A.fd[k] / 10); A.voz++; }
  }
  function bandaVoz(A) {
    if (!A || A.voz < 15) return { estado: 'nd' };
    const hz = A.ctx.sampleRate / 2 / A.acum.length, ancho = 250, nb = Math.floor(A.ctx.sampleRate / 2 / ancho), L = [];
    for (let b = 0; b < nb; b++) { let s = 0, n = 0; for (let k = Math.floor(b * ancho / hz); k < Math.floor((b + 1) * ancho / hz) && k < A.acum.length; k++) { s += A.acum[k] / A.voz; n++; } L.push(10 * Math.log10(s / (n || 1) + 1e-20)); }
    const ref = Math.max(...L.slice(1, 16));
    let top = 0; for (let b = L.length - 1; b > 0; b--) if (L[b] > ref - 70) { top = b; break; }
    const fc = (top + 1) * ancho / 1000;
    const corte = top + 2 < L.length && L[top] - L[top + 2] > 20;
    let estado = 'info', clase = 'completa';
    if (fc < 7) clase = 'estrecha'; else if (fc < 10.5) clase = 'ancha'; else if (fc < 13.2 && corte) { clase = 'corte12'; estado = 'aviso'; } else if (fc < 15) clase = 'media';
    return { estado, clase, khz: Math.round(fc * 2) / 2 };
  }

  // ---- el relieve 3D y el giro de la cabeza ----
  // La punta de la nariz (30), escrita en la base que forman la mandíbula (0 → 16) y el mentón (8): en una imagen plana que se
  // mueve, se estira o se gira en el plano, esas dos coordenadas no cambian; en una cabeza de verdad que gira, sí (está más
  // adelante que el contorno). «a» es el giro a los lados y «b» hacia arriba y abajo.
  function afin(p) {
    const O = [(p[0][0] + p[16][0]) / 2, (p[0][1] + p[16][1]) / 2], u = [p[16][0] - p[0][0], p[16][1] - p[0][1]], v = [p[8][0] - O[0], p[8][1] - O[1]], w = [p[30][0] - O[0], p[30][1] - O[1]];
    const det = u[0] * v[1] - u[1] * v[0]; if (Math.abs(det) < 1e-6) return null;
    return [(w[0] * v[1] - w[1] * v[0]) / det, (u[0] * w[1] - u[1] * w[0]) / det];
  }
  function relieve(con) {
    const ab = con.map((d) => afin(d.p)).filter(Boolean); if (ab.length < 10) return { estado: 'nd' };
    const io0 = dist(con[0].p[36], con[0].p[45]) || 1;
    const px = [], py = [], esc = [], rol = [];
    for (const d of con) { const p = d.p; px.push((p[0][0] + p[16][0]) / 2 / io0); py.push((p[0][1] + p[16][1]) / 2 / io0); esc.push(Math.log(dist(p[0], p[16]) || 1)); rol.push(Math.atan2(p[16][1] - p[0][1], p[16][0] - p[0][0])); }
    // el temblor de los puntos (1–2 píxeles) se suaviza con una media de 5 muestras; el giro de verdad es lento y se queda
    const suave = (v) => v.map((_, i) => { let q = 0, n = 0; for (let j = Math.max(0, i - 2); j <= Math.min(v.length - 1, i + 2); j++) { q += v[j]; n++; } return q / n; });
    const par = Math.max(desv(suave(ab.map((x) => x[0]))), 0.7 * desv(suave(ab.map((x) => x[1])))), mov = desv(suave(px)) + desv(suave(py)) + desv(suave(esc)) + desv(suave(rol));
    const estado = par >= 0.018 ? 'si' : ab.length >= 30 && mov >= 0.12 && par < 0.009 ? 'no' : 'nd';
    return { estado, par, mov };
  }

  // ---- el análisis: todas las señales y el resultado ----
  function senalCamara(f) {
    if (!f) return { k: 'camara', estado: 'nd', v: tr('v_sinRespuesta') };
    const n = f.n ? ' (' + f.n + ')' : '';
    return {
      virtual: { k: 'camara', estado: 'no', v: tr('v_camVirtual') + n }, intermedia: { k: 'camara', estado: 'aviso', v: tr('v_camPrograma') + n },
      desconocida: { k: 'camara', estado: 'aviso', v: tr('v_camDesconocida') }, movil: { k: 'camara', estado: 'si', v: tr('v_camMovil') },
      fisica: { k: 'camara', estado: 'si', v: tr('v_camFisica') }, apagada: { k: 'camara', estado: 'nd', v: tr('v_camApagada') },
    }[f.k] || { k: 'camara', estado: 'nd', v: tr('v_sinRespuesta') };
  }
  // ---- ¿cambia de forma? (dueño, 18:27: «el resultado en el tanto por ciento… lo más preciso posible»). Una foto o un vídeo
  // puestos delante de la cámara, o una cara pegada y movida en plano, solo se desplazan, giran o se inclinan como un todo: si se
  // alinea cada imagen con la forma media (afín 2D por mínimos cuadrados), queda solo el ruido del detector. Una cara viva cambia de
  // forma: parpadea, mueve la boca y las cejas y, al girar en 3D, la nariz y el contorno no encajan en un plano. ----
  function normaliza(p) {
    const ox = (p[36][0] + p[45][0]) / 2, oy = (p[36][1] + p[45][1]) / 2, dx = p[45][0] - p[36][0], dy = p[45][1] - p[36][1];
    const io = Math.hypot(dx, dy) || 1, c = dx / io, s = dy / io;
    return p.map(([x, y]) => { const u = x - ox, v = y - oy; return [(u * c + v * s) / io, (-u * s + v * c) / io]; });
  }
  function residuoAfin(a, b) {
    // b ≈ M·a + t (6 parámetros), por mínimos cuadrados; devuelve la raíz del error cuadrático medio
    let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0; const n = a.length, bx = [0, 0, 0], by = [0, 0, 0];
    for (let i = 0; i < n; i++) { const [x, y] = a[i]; sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; bx[0] += x * b[i][0]; bx[1] += y * b[i][0]; bx[2] += b[i][0]; by[0] += x * b[i][1]; by[1] += y * b[i][1]; by[2] += b[i][1]; }
    const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
    const resuelve = (r) => { const m = A.map((f, i) => f.concat([r[i]])); for (let i = 0; i < 3; i++) { let k = i; for (let j = i + 1; j < 3; j++) if (Math.abs(m[j][i]) > Math.abs(m[k][i])) k = j; [m[i], m[k]] = [m[k], m[i]]; const d = m[i][i] || 1e-12; for (let j = i; j < 4; j++) m[i][j] /= d; for (let j = 0; j < 3; j++) if (j !== i) { const f = m[j][i]; for (let q = i; q < 4; q++) m[j][q] -= f * m[i][q]; } } return [m[0][3], m[1][3], m[2][3]]; };
    const px = resuelve(bx), py = resuelve(by); let e = 0;
    for (let i = 0; i < n; i++) { const [x, y] = a[i]; const ex = px[0] * x + px[1] * y + px[2] - b[i][0], ey = py[0] * x + py[1] * y + py[2] - b[i][1]; e += ex * ex + ey * ey; }
    return Math.sqrt(e / n);
  }
  function forma(con) {
    if (con.length < 6) return { estado: 'nd', p90: 0, n: con.length };
    const ns = con.map((d) => normaliza(d.p)), ref = [];
    for (let k = 0; k < 68; k++) ref.push([mediana(ns.map((q) => q[k][0])), mediana(ns.map((q) => q[k][1]))]);
    const r = ns.map((q) => residuoAfin(q, ref)).sort((a, b) => a - b), p90 = r[Math.min(r.length - 1, Math.floor(r.length * 0.9))];
    // cuánto se movió la cara como un bloque (posición, giro en el plano y tamaño; con los 68 puntos, el ruido apenas cuenta)
    const io = con.map((d) => dist(d.p[36], d.p[45]) || 1), iom = mediana(io);
    const cx = con.map((d) => d.p.reduce((s, q) => s + q[0], 0) / 68 / iom), cy = con.map((d) => d.p.reduce((s, q) => s + q[1], 0) / 68 / iom);
    const ang = con.map((d) => Math.atan2(d.p[45][1] - d.p[36][1], d.p[45][0] - d.p[36][0])), esc = io.map((v) => v / iom);
    const bloque = desv(cx) + desv(cy) + desv(ang) + desv(esc);
    // rígida solo si se movió de verdad como un bloque (una foto o una pantalla movidas); quieta y rígida, no se puede saber
    const estado = p90 >= 0.03 ? 'si' : con.length >= 15 && p90 < 0.017 && bloque >= 0.06 ? 'no' : 'nd';
    return { estado, p90: Math.round(p90 * 10000) / 10000, bloque: Math.round(bloque * 1000) / 1000, n: con.length };
  }
  function analiza(datos, x) {
    x = x || {};
    const cam = senalCamara(x.fuente);
    if (x.sinVideo) return { tipo: 'sinVideo', senales: [cam] };
    const con = datos.filter((d) => d.p), presencia = con.length / (datos.length || 1);
    const luz = x.luz != null ? x.luz : 128, tam = con.length ? mediana(con.map((d) => dist(d.p[0], d.p[16]) / (d.w || 1))) : 0;
    const imagen = { k: 'imagen', estado: luz < 55 || (tam && tam < 0.13) ? 'aviso' : 'si', v: luz < 55 ? tr('v_oscura') : tam && tam < 0.13 ? tr('v_lejos') : tr('v_buena') };
    if (con.length < 5) return { tipo: cam.estado === 'no' ? 'virtual' : 'sinCara', senales: [cam, imagen], fuente: x.fuente };
    const io = con.map((d) => dist(d.p[36], d.p[45]) || 1);
    const ear = con.map((d) => (ojo(d.p, 36) + ojo(d.p, 42)) / 2), base = [...ear].sort((a, b) => a - b)[Math.floor(ear.length * 0.6)];
    let parpadeos = 0, cerrado = false;
    for (const e of ear) { if (!cerrado && e < base * 0.72) { cerrado = true; parpadeos++; } else if (cerrado && e > base * 0.88) cerrado = false; }
    // movimiento: la nariz respecto a los ojos (giro) y la cara en la imagen, en distancias entre ojos
    const giro = con.map((d, i) => (d.p[30][0] - (d.p[36][0] + d.p[45][0]) / 2) / io[i]), cab = con.map((d, i) => (d.p[30][1] - (d.p[36][1] + d.p[45][1]) / 2) / io[i]);
    const cx = con.map((d, i) => d.p[30][0] / io[i]), cy = con.map((d, i) => d.p[30][1] / io[i]);
    const mov = desv(giro) + desv(cab) + 0.25 * (desv(cx) + desv(cy));
    let iguales = 0; for (let i = 1; i < con.length; i++) { let s = 0; for (let k = 0; k < 68; k++) s += dist(con[i].p[k], con[i - 1].p[k]); if (s / 68 < 0.006 * io[i]) iguales++; }
    const congelado = iguales / Math.max(1, con.length - 1) > 0.85;
    // la boca y la voz
    const boca = con.map((d, i) => dist(d.p[62], d.p[66]) / io[i]), voz = con.map((d) => d.e || 0);
    const habla = voz.some((v) => v > 0) && media(voz) > 0.008 && desv(voz) > 0.005;
    let corr = 0; if (habla) for (const k of [0, 1, 2]) corr = Math.max(corr, correlacion(boca.slice(k), voz.slice(0, voz.length - k)));
    const movNatural = mov > 0.012 && !congelado;
    const rel = relieve(con), pul = x.pulso || { estado: 'nd' }, bv = x.voz || { estado: 'nd' }, fo = forma(con);
    // (con pocas imágenes, la correlación es puro azar: hacen falta 20 y que la boca se mueva de verdad)
    const labios = !habla || con.length < 20 ? 'nd' : corr >= 0.25 && desv(boca) >= 0.012 ? 'si' : corr < 0.05 && desv(boca) < 0.01 ? 'no' : 'nd';
    const senales = [
      cam,
      { k: 'directo', estado: congelado ? 'no' : 'si', v: tr(congelado ? 'v_congelada' : 'v_enDirecto') },
      { k: 'parpadeo', estado: parpadeos > 0 ? 'si' : 'nd', v: parpadeos > 0 ? tr('v_parpadeos').replace('{n}', parpadeos) : tr('v_noParpadeo') },
      { k: 'movimiento', estado: movNatural && fo.estado !== 'no' ? 'si' : 'nd', v: tr(movNatural ? 'v_natural' : 'v_poco') },
      { k: 'forma', estado: fo.estado, v: tr(fo.estado === 'si' ? 'v_formaSi' : fo.estado === 'no' ? 'v_formaNo' : 'v_sinDatos') },
      { k: 'relieve', estado: rel.estado, v: tr(rel.estado === 'si' ? 'v_relieveSi' : rel.estado === 'no' ? 'v_relieveNo' : 'v_sinDatos') },
      { k: 'pulso', estado: pul.estado, v: tr(pul.estado === 'si' ? 'v_pulsoSi' : 'v_pulsoNo') },
      { k: 'labios', estado: labios, v: tr(!habla ? 'v_noHablo' : labios === 'si' ? 'v_labiosSi' : labios === 'no' ? 'v_labiosNo' : 'v_sinDatos') },
      { k: 'voz', estado: bv.estado === 'nd' ? 'nd' : bv.estado, v: bv.estado === 'nd' ? tr('v_noHablo') : tr('v_voz_' + bv.clase).replace('{k}', enIngles() ? String(bv.khz) : String(bv.khz).replace('.', ',')) },
      imagen,
    ];
    if (x.giro) senales.push({ k: 'giro', estado: x.giro.estado, v: tr(x.giro.estado === 'si' ? 'v_giroSi' : 'v_giroNo') });
    if (x.clave === 'si') senales.push({ k: 'clave', estado: 'si', v: tr('v_claveSi') });
    if (x.palabras === 'si') senales.push({ k: 'palabras', estado: 'si', v: tr('v_palabrasSi') });
    if (x.reflejo && x.reflejo.estado === 'si') senales.push({ k: 'reflejo', estado: 'si', v: tr('v_reflejoSi') });
    if (x.cortes) senales.push({ k: 'cortes', estado: x.cortes >= 2 ? 'no' : 'aviso', v: tr('v_cortesNo') });
    const E = {}; for (const s of senales) E[s.k] = s.estado;
    let tipo, confianza = null, fija = null;
    if (E.camara === 'no') tipo = 'virtual';
    else if (congelado) { tipo = 'fija'; fija = 'congelada'; }
    else if (fo.estado === 'no' && parpadeos === 0 && labios !== 'si') { tipo = 'fija'; fija = 'rigida'; }
    else if (mov < 0.006 && parpadeos === 0 && desv(boca) < 0.004) { tipo = 'fija'; fija = 'quieta'; }
    else if (E.relieve === 'no' && parpadeos === 0) tipo = 'plana';
    else if (E.cortes === 'no') tipo = 'editado';
    else if (E.labios === 'no') tipo = 'labios';
    else if (E.giro === 'no') tipo = 'sinGiro';
    else {
      const pos2 = ['parpadeo', 'movimiento', 'forma', 'relieve', 'pulso', 'labios', 'camara', 'giro'].filter((k) => E[k] === 'si').length;
      const avisos = senales.filter((s) => s.estado === 'aviso').length;
      tipo = pos2 >= 3 && avisos <= 1 && E.camara !== 'aviso' && E.relieve !== 'no' ? 'real' : 'dudoso';
      if (tipo === 'real') confianza = pos2 >= 5 || E.giro === 'si' ? 'alta' : 'media';
    }
    return { tipo, fija, confianza, senales, presencia, parpadeos, movNatural, habla, labios: habla ? corr >= 0.2 : null, relieve: rel, pulso: pul, forma: fo, n: con.length, fuente: x.fuente };
  }

  // ---- el resultado: la probabilidad de que sea una persona real (dueño, 18:01: «el resultado en probabilidad de ser humano, en
  // tanto por ciento… y ya está») ----
  // Cada señal suma o resta en la escala de las razones de probabilidad (log-odds), según lo que pesa como prueba: una cámara
  // virtual, una imagen congelada o unos labios que no van con la voz pesan mucho en contra; la cámara de un móvil, el parpadeo, el
  // relieve 3D, el pulso y los labios con la voz, a favor. Es una estimación: nunca 0 ni 100.
  const PESOS = {
    camara: { si: 0.3, aviso: -1.0, no: -4.5 }, directo: { si: 0.2, no: -5 }, parpadeo: { si: 0.9, nd: -0.3 }, movimiento: { si: 0.3, nd: -0.2 }, forma: { si: 1.0, no: -3.0 },
    relieve: { si: 0.8, no: -2.5 }, pulso: { si: 1.0 }, labios: { si: 0.9, no: -3.5 }, voz: { aviso: -0.4 }, imagen: { aviso: -0.3 }, giro: { si: 2.0, no: -1.5 }, cortes: { aviso: -2.0, no: -3.5 }, reflejo: { si: 1.0 }, palabras: { si: 1.0 }, clave: { si: 1.5 },
  };
  // lo que se ve en la cara pesa según cuántas imágenes con cara hubo (con pocas, el resultado se queda cerca del 50 %)
  const FIJAS = new Set(['camara', 'directo', 'giro', 'cortes', 'reflejo', 'palabras', 'clave']);
  function probabilidad(r) {
    // dueño (20:51): si detecta una foto, 0 %. Muy quieta sin más (puede ser alguien muy quieto) pasa a la prueba del gesto; si
    // tampoco la hace, es una foto: 0 %
    const giroNo = (r.senales || []).some((x) => x.k === 'giro' && x.estado === 'no');
    if (r.tipo === 'plana' || (r.tipo === 'fija' && (r.fija !== 'quieta' || giroNo))) return 0;
    let L = 0; const k = Math.min(1, ((r.n | 0) || 30) / 30);
    for (const x of r.senales || []) { const w = PESOS[x.k]; if (w && w[x.estado] != null) L += w[x.estado] * (FIJAS.has(x.k) || w[x.estado] <= -3 ? 1 : k); }
    // imagen congelada: casi seguro que no es nadie en directo; moverse como un bloque sin un solo gesto: muy probablemente una
    // foto o una pantalla movidas; quieta del todo y sin parpadear: dudoso (alguien muy quieto también puede estarlo)
    if (r.tipo === 'fija') L = Math.min(L, r.fija === 'quieta' ? -1.2 : r.fija === 'rigida' ? -2.2 : -3.5);
    // ninguna prueba pasiva da certeza (agencia, ronda 98): el resultado se queda entre el 3 % y el 92 %
    // si no hizo lo que se le pidió: posible vídeo falso, muñeco o avatar (como mucho un 5 %); si lo hizo, hasta el 96 %
    if (r.tipo === 'sinGiro') L = Math.min(L, -2.95);
    L = Math.max(-3.5, Math.min((r.senales || []).some((x) => x.k === 'giro' && x.estado === 'si') ? 3.2 : 2.45, L));
    return Math.max(1, Math.min(99, Math.round(100 / (1 + Math.exp(-L)))));
  }
  function pintaProbabilidad(r) {
    const pct = $('#comprobacion-pct'), anillo = $('#comprobacion-anillo'), et = $('#comprobacion-etiqueta'), caja = $('#comprobacion-prob');
    const sinDato = r.tipo === 'sinCara' || r.tipo === 'sinVideo' || r.tipo === 'error';
    const k = sinDato ? 'comprobacion_' + r.tipo : 'probHumano'; et.dataset.t = k; et.textContent = tr(k);
    caja.className = 'probabilidad';
    if (sinDato) { pct.textContent = '—'; anillo.style.setProperty('--valor', '0'); caja.classList.add('nada'); return; }
    const p = probabilidad(r); caja.classList.add(p >= 80 ? 'alta' : p >= 50 ? 'media' : 'baja');
    const t0 = performance.now(), dur = 1100;
    const paso = (t) => { const u = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - u, 3), v = Math.round(p * e); pct.textContent = v + ' %'; anillo.style.setProperty('--valor', String(v)); if (u < 1 && !resultadoCaja.hidden) requestAnimationFrame(paso); else { pct.textContent = p + ' %'; anillo.style.setProperty('--valor', String(p)); } };
    requestAnimationFrame(paso);
    r.probabilidad = p;
  }

  // ---- el modo de diagnóstico (punto 1: pruebas con móviles reales): con «?diag» en la dirección, o manteniendo pulsado el porcentaje
  // 2 segundos, el resultado enseña todas las señales y los datos de la prueba, para mandar una captura y ajustar la detección ----
  let diagOn = /[?&]diag\b/.test(location.search);
  function pintaDiag(r) {
    let pre = resultadoCaja.querySelector('.diag');
    if (!diagOn) { if (pre) pre.hidden = true; return; }
    if (!pre) { pre = document.createElement('pre'); pre.className = 'diag'; resultadoCaja.append(pre); }
    const x = r._extra || {}, gd = r._gesto || {}, f2 = (v) => (typeof v === 'number' ? v.toFixed(3) : '-');
    const lin = [
      'tipo ' + r.tipo + (r.fija ? '/' + r.fija : '') + ' · ' + probabilidad(r) + '% · caras ' + (r.n | 0),
      'parpadeos ' + (r.parpadeos | 0) + ' · gestos ' + (r.forma ? r.forma.estado + ' p90=' + f2(r.forma.p90) : '-') + ' · relieve ' + (r.relieve ? r.relieve.estado : '-'),
      'pulso ' + (r.pulso ? r.pulso.estado : '-') + ' · labios ' + (r.labios == null ? '-' : r.labios) + ' · luz ' + (x.luz != null ? Math.round(x.luz) : '-') + ' · cortes ' + (x.cortes | 0),
      'cámara ' + (x.fuente ? JSON.stringify(x.fuente).slice(0, 60) : '-'),
    ];
    if (gd.pasos) lin.push('gesto ' + gd.pasos.map((pp) => pp.q + (pp.hecho ? '✓' : '✗') + (pp.d != null ? ' ' + pp.d : '') + ' ' + pp.ms + 'ms').join(' · '));
    if (gd.reflejo) lin.push('reflejo ' + gd.reflejo.estado + (gd.reflejo.dif != null ? ' dif=' + gd.reflejo.dif + ' ruido=' + gd.reflejo.ruido : ''));
    if (gd.pasos) lin.push('palabras ' + (gd.palabras || '-') + ' · clave ' + (gd.clave || '-'));
    lin.push((r.senales || []).map((z) => z.k + ':' + z.estado).join(' '));
    pre.textContent = lin.join('\n'); pre.hidden = false;
  }
  (() => {
    const el = $('#comprobacion-prob'); if (!el) return; let t = null;
    el.addEventListener('pointerdown', () => { clearTimeout(t); t = setTimeout(() => { diagOn = !diagOn; vibra(); if (previo) resultado(previo); }, 1600); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => clearTimeout(t));
  })();

  // ---- el resultado ----
  const resultadoCaja = $('#comprobacion-resultado');
  function resultado(r) {
    previo = r; capa.classList.add('con-resultado');
    resultadoCaja.className = 'comprobacion-resultado ' + (diagOn ? '' : 'solo-prob ') + r.tipo; pintaProbabilidad(r); pintaDiag(r);
    const gi = (r.senales || []).find((x) => x.k === 'giro'), mo = $('#comprobacion-motivo');
    if (mo) { const foto = (r.tipo === 'fija' || r.tipo === 'plana') && probabilidad(r) === 0;
    const k = foto ? 'motivo_foto' : gi ? (gi.estado === 'si' ? 'motivo_giroSi' : r._gesto && r._gesto.clave === 'no' ? 'motivo_claveNo' : 'motivo_sinGiro') : ''; mo.hidden = !k; if (k) { mo.dataset.t = k; mo.textContent = tr(k); } }
    $('#comprobacion-estado').hidden = true; resultadoCaja.hidden = false; resultadoCaja.scrollTop = 0;
    $('#comprobacion-titulo').textContent = tr('comprobacion_' + r.tipo);
    let texto = tr('comprobacion_' + r.tipo + 'Texto');
    if (r.tipo === 'virtual') texto = texto.replace('{n}', r.fuente && r.fuente.n ? ' (' + r.fuente.n + ')' : '');
    $('#comprobacion-texto').textContent = texto;
    const c = $('#comprobacion-confianza'); c.hidden = !r.confianza; if (r.confianza) c.textContent = tr('confianza_' + r.confianza);
    const l = $('#comprobacion-senales'); l.textContent = '';
    for (const s of r.senales || []) {
      const li = document.createElement('li'); li.className = s.estado === 'info' ? 'nd' : s.estado;
      const n = document.createElement('span'); n.textContent = tr('senal_' + s.k);
      const v = document.createElement('span'); v.className = 'v'; v.textContent = s.v || '';
      li.append(n, v); l.append(li);
    }
    let regla = resultadoCaja.querySelector('.regla');
    if (!regla) { regla = document.createElement('p'); regla.className = 'regla'; resultadoCaja.querySelector('small').before(regla); }
    regla.textContent = tr('reglaOro');
    // la prueba extra (girar la cabeza), si hay cara y aún no se ha hecho
    $('#comprobacion-giro').hidden = !(r.senales && r.senales.length > 2 && !r.senales.some((s) => s.k === 'giro')) || r.tipo === 'virtual';
  }
  function termina() {
    avisaFin(); cancelado = true; enMarcha = false; capa.hidden = true; capa.classList.remove('con-resultado'); triangulos = null; zonasPantalla = null; resultadoCaja.hidden = true;
    sala.classList.remove('comprobando'); $('#comprobacion-estado').classList.remove('giro');
    g.clearRect(0, 0, lienzo.width, lienzo.height); go.clearRect(0, 0, onda.width, onda.height);
  }

  // ---- el trazo de abajo: el pulso a la izquierda y la voz a la derecha; en la prueba extra, el giro ----
  function dibujaOnda(piel, A, pulsoSi, giro) {
    if (!onda.offsetParent) return; // oculto (arriba solo «Analizando…»): no se dibuja
    const r = onda.getBoundingClientRect(); if (!r.width) return;
    const k = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * k), h = Math.round(r.height * k);
    if (onda.width !== w || onda.height !== h) { onda.width = w; onda.height = h; }
    go.setTransform(k, 0, 0, k, 0, 0); go.clearRect(0, 0, r.width, r.height);
    go.font = '600 8.5px ' + fam; go.textBaseline = 'top';
    if (giro) {
      const cx = r.width / 2, y = 26, ancho = r.width / 2 - 14, x = Math.max(-1, Math.min(1, giro.d / 0.36)), meta = 0.15 / 0.36;
      go.fillStyle = 'rgba(156,195,228,.8)'; go.textAlign = 'center'; go.fillText(tr('ondaGiro'), cx, 0); go.textAlign = 'left';
      go.fillStyle = 'rgba(255,255,255,.08)'; go.fillRect(cx - ancho, y - 3, ancho * 2, 6);
      go.fillStyle = giro.hecho ? 'rgba(92,201,138,.35)' : 'rgba(156,195,228,.18)';
      go.fillRect(cx - ancho, y - 3, ancho * (1 - meta), 6); go.fillRect(cx + ancho * meta, y - 3, ancho * (1 - meta), 6);
      go.fillStyle = 'rgba(255,255,255,.35)'; go.fillRect(cx - 0.75, y - 8, 1.5, 16);
      go.beginPath(); go.arc(cx + x * ancho, y, 7, 0, Math.PI * 2); go.fillStyle = giro.hecho ? '#5CC98A' : '#EAF4FD'; go.shadowColor = giro.hecho ? 'rgba(92,201,138,.9)' : 'rgba(156,195,228,.9)'; go.shadowBlur = 10; go.fill(); go.shadowBlur = 0;
      return;
    }
    const wp = r.width * 0.58, y0 = 13, alto = r.height - y0 - 3, yc = y0 + alto / 2;
    go.fillStyle = pulsoSi ? 'rgba(92,201,138,.95)' : 'rgba(156,195,228,.8)'; go.fillText(tr('ondaPulso'), 0, 0);
    go.fillStyle = 'rgba(156,195,228,.8)'; go.fillText(tr('ondaVoz'), wp + 14, 0);
    // el pulso
    go.strokeStyle = 'rgba(255,255,255,.07)'; go.lineWidth = 1; go.beginPath(); go.moveTo(0, yc); go.lineTo(wp, yc); go.stroke();
    const tz = trazaPiel(piel, 5000);
    if (tz) {
      go.strokeStyle = pulsoSi ? '#5CC98A' : '#9CC3E4'; go.lineWidth = 1.6; go.shadowColor = pulsoSi ? 'rgba(92,201,138,.8)' : 'rgba(156,195,228,.8)'; go.shadowBlur = 6; go.beginPath();
      tz.forEach(([u, v], i) => { const px = u * wp, py = yc - v * alto * 0.46; if (i) go.lineTo(px, py); else go.moveTo(px, py); });
      go.stroke(); go.shadowBlur = 0;
    }
    // la voz: el espectro en bandas (de 100 Hz a 16 kHz)
    const nb = 18, x0 = wp + 14, aw = r.width - x0, bw = aw / nb;
    for (let i = 0; i < nb; i++) {
      let v = 0;
      if (A && A.fd) {
        const hz = A.ctx.sampleRate / 2 / A.fd.length, f0 = 100 * Math.pow(160, i / nb), f1 = 100 * Math.pow(160, (i + 1) / nb);
        let m = -140; for (let kk = Math.floor(f0 / hz); kk <= Math.ceil(f1 / hz) && kk < A.fd.length; kk++) m = Math.max(m, A.fd[kk]);
        v = Math.max(0, Math.min(1, (m + 100) / 70));
      }
      const bh = Math.max(2, v * alto);
      go.fillStyle = v > 0.05 ? 'rgba(156,195,228,.85)' : 'rgba(255,255,255,.12)';
      go.fillRect(x0 + i * bw + 1, y0 + alto - bh, Math.max(1.5, bw - 2), bh);
    }
  }

  // ---- la comprobación ----
  function videoNegro() {
    try { pg.drawImage(video, 0, 0, PIEL, PIEL); const d = pg.getImageData(0, 0, PIEL, PIEL).data; let s = 0; for (let i = 0; i < d.length; i += 16) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 16) / 3 < 6; } catch (_) { return false; }
  }
  // ---- seguir la cara cuando el detector la pierde (movimiento, desenfoque, perfil): los 68 puntos sobre la última caja, ampliada;
  // se aceptan solo si tienen forma de cara y no saltan (si no, esa imagen cuenta como «sin cara») ----
  async function siguePuntos(fa, caja, prev) {
    try {
      const W = video.videoWidth, H = video.videoHeight; if (!W || !H) return null;
      const m = 0.3 * Math.max(caja.w, caja.h), x = Math.max(0, caja.x - m), y = Math.max(0, caja.y - m);
      const w = Math.min(W - x, caja.w + 2 * m), h = Math.min(H - y, caja.h + 2 * m); if (w < 40 || h < 40) return null;
      const [c] = await fa.extractFaces(video, [new fa.Rect(x, y, w, h)]); if (!c) return null;
      const lm = await fa.detectFaceLandmarks(c); if (!lm) return null;
      const p = lm.positions.map((q) => [x + q.x * (w / c.width), y + q.y * (h / c.height)]);
      const io = dist(p[36], p[45]), ancho = Math.max(w, h);
      if (!(io > 0.12 * ancho && io < 0.62 * ancho)) return null;
      const ojosY = (p[36][1] + p[45][1]) / 2;
      if (!(p[30][1] > ojosY && p[62][1] > p[30][1] && p[8][1] > p[66][1])) return null;
      if (prev) { let s = 0; for (let k = 0; k < 68; k++) s += dist(p[k], prev[k]); if (s / 68 > 0.9 * io) return null; }
      return p;
    } catch (_) { return null; }
  }
  const cajaDe = (p) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
  function sinVideo() {
    const vs = video.srcObject, vt = vs && vs.getVideoTracks()[0];
    return !vs || !vt || vt.readyState !== 'live' || video.readyState < 2 || !video.videoWidth;
  }
  // ---- no comprobar a la vez (dueño, 20:34): quien empieza avisa al otro equipo; si los dos empiezan a la vez, cede quien contestó ----
  let otroComprueba = 0, avisado = false, avisoT = null;
  const avisaFin = () => { if (!avisado) return; avisado = false; try { if (M && M.gesto) M.gesto('fin', 0, 0); } catch (_) {} };
  function ocupado() {
    let a = document.querySelector('.aviso-comprobando');
    if (!a) { a = document.createElement('p'); a.className = 'aviso-comprobando'; a.setAttribute('role', 'status'); sala.append(a); }
    a.textContent = tr('otroComprueba'); a.hidden = false; clearTimeout(avisoT); avisoT = setTimeout(() => { a.hidden = true; }, 4000);
  }
  if (M) M.on('gesto', (g) => {
    if (g.q === 'inicio') {
      otroComprueba = performance.now() + 25000;
      const e = M.estadoLlamada ? M.estadoLlamada() : null;
      if (enMarcha && (!e || e.rol !== 'llama')) { termina(); ocupado(); }
    } else if (g.q === 'fin') otroComprueba = 0;
  });
  // ---- los cortes de edición (vídeos de internet): la imagen entera cambia de golpe, solo en ese momento, y la cara salta de tamaño o
  // de sitio. Con un corte, resta; con dos o más, resta mucho. ----
  const fzL = document.createElement('canvas'); fzL.width = 32; fzL.height = 24; const fzG = fzL.getContext('2d', { willReadFrequently: true });
  function firma() {
    try { fzG.drawImage(video, 0, 0, 32, 24); } catch (_) { return null; }
    let d; try { d = fzG.getImageData(0, 0, 32, 24).data; } catch (_) { return null; }
    const v = new Float32Array(768); let m = 0, s = 0;
    for (let i = 0; i < 768; i++) { v[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; m += v[i]; }
    m /= 768; for (let i = 0; i < 768; i++) { v[i] -= m; s += v[i] * v[i]; } s = Math.sqrt(s / 768) || 1; for (let i = 0; i < 768; i++) v[i] /= s;
    return v;
  }
  function cortes(datos) {
    let n = 0;
    for (let i = 1; i < datos.length - 1; i++) {
      const a = datos[i - 1], b = datos[i], c = datos[i + 1];
      if (b.cz == null || b.cz < 0.6 || (a.cz != null && a.cz > 0.32) || (c.cz != null && c.cz > 0.32)) continue;
      if (!a.p || !b.p || a.s || b.s || b.t - a.t > 450) continue;
      const wa = a.w || 1, wb = b.w || 1, ia = dist(a.p[36], a.p[45]) / wa, ib = dist(b.p[36], b.p[45]) / wb;
      const ca = [(a.p[36][0] + a.p[45][0]) / 2 / wa, (a.p[36][1] + a.p[45][1]) / 2 / wa], cb = [(b.p[36][0] + b.p[45][0]) / 2 / wb, (b.p[36][1] + b.p[45][1]) / 2 / wb];
      if (Math.abs(Math.log(ib / ia)) >= 0.1 || Math.hypot(cb[0] - ca[0], cb[1] - ca[1]) >= 0.3 * Math.min(ia, ib)) n++;
    }
    return n;
  }

  async function comprueba() {
    if (enMarcha) return;
    if (otroComprueba > performance.now()) { ocupado(); return; }
    enMarcha = true; cancelado = false; triangulos = null; zonasPantalla = null; previo = null; const mia = ++vuelta;
    capa.hidden = false; resultadoCaja.hidden = true; $('#comprobacion-estado').hidden = false; $('#comprobacion-estado').classList.remove('giro');
    sala.classList.add('comprobando'); ponChips();
    const est = $('#comprobacion-estado-texto'); est.textContent = tr('comprobacionAnalizando'); $('#comprobacion-avance').style.width = '0%';
    // en paralelo: el tipo de cámara de la otra persona (contesta su navegador, sin que se vea)
    let fuente = null; const pf = M && M.fuente ? M.fuente().then((f) => { fuente = f; if (mia === vuelta && !cancelado) { const s = senalCamara(f); chip('camara', s.estado === 'info' ? 'nd' : s.estado); } }) : Promise.resolve();
    if (sinVideo() || videoNegro()) { await Promise.race([pf, new Promise((ok) => setTimeout(ok, 1500))]); if (cancelado || mia !== vuelta) return; enMarcha = false; resultado(analiza([], { sinVideo: true, fuente })); return; }
    const A = await abreAudio();
    let fa;
    try { fa = await cargaFaceApi(); } catch (_) { enMarcha = false; if (A) A.ctx.close().catch(() => {}); resultado({ tipo: 'error', senales: [] }); return; }
    if (cancelado || mia !== vuelta) { if (A) A.ctx.close().catch(() => {}); return; }
    fam = fuente2D();
    const telefono = matchMedia('(max-width: 760px)').matches;
    const opc = new fa.TinyFaceDetectorOptions({ inputSize: telefono ? 224 : 320, scoreThreshold: 0.3 });
    const opc2 = new fa.TinyFaceDetectorOptions({ inputSize: telefono ? 320 : 416, scoreThreshold: 0.25 });
    const datos = [], piel = [], t0 = performance.now(); let firmaPrev = null;
    if (M && M.gesto) avisado = !!M.gesto('inicio', 0, 0);
    let puntos = null, puntosT = 0, ultT = 0, pul = { estado: 'nd' }, pulT = 0, parp = 0, cerr = false, baseEar = 0, desfase = null, relojMedia = null;
    let caja = null, cajaT = 0, nCon = 0, fallos = 0;
    fam = fuente2D();
    const ears = [];
    // las muestras de piel y de sonido, en cada imagen que llega (independiente de la malla, que es más lenta)
    const usaRVFC = typeof video.requestVideoFrameCallback === 'function';
    let idCb = 0;
    const muestra = (ahora, meta) => {
      if (cancelado || mia !== vuelta || !enMarcha) return;
      const pnow = performance.now();
      if (puntos && pnow - puntosT < 450) {
        // la hora de cada imagen: la de su captura (mediaTime), llevada al reloj de esta página; si no cuadra, la de llegada
        let t = pnow;
        if (relojMedia !== false && meta && typeof meta.mediaTime === 'number' && meta.mediaTime > 0) {
          if (desfase == null) desfase = pnow - meta.mediaTime * 1000;
          const tm = meta.mediaTime * 1000 + desfase;
          if (Math.abs(tm - pnow) < 800) t = tm; else relojMedia = false;
        }
        if (t > ultT) { const m = muestraPiel(puntos, t); if (m) { piel.push(m); ultT = t; } }
      }
      muestraAudio(A, pnow);
      if (pnow - pulT > 1000 && pnow - t0 > 5500) { pulT = pnow; pul = pulso(piel); if (pul.estado === 'si') chip('pulso', 'si'); }
      dibujaOnda(piel, A, pul.estado === 'si', null);
      idCb = usaRVFC ? video.requestVideoFrameCallback(muestra) : requestAnimationFrame((n) => muestra(n, null));
    };
    idCb = usaRVFC ? video.requestVideoFrameCallback(muestra) : requestAnimationFrame((n) => muestra(n, null));
    let ultDet = 0;
    while (!cancelado && mia === vuelta) {
      const ya = performance.now() - t0;
      if (ya >= DUR_MAX || (ya >= DUR && (nCon >= MUESTRAS || (nCon === 0 && ya >= DUR + 2000)))) break;
      const espera = 110 - (performance.now() - ultDet); if (espera > 0) await new Promise((ok) => setTimeout(ok, espera));
      ultDet = performance.now();
      let res = null; try { res = await fa.detectSingleFace(video, opc).withFaceLandmarks(); } catch (_) {}
      // sin cara: cada dos fallos, otra pasada más fina (más resolución y menos umbral)
      if (!res && ++fallos % 2 === 0) { try { res = await fa.detectSingleFace(video, opc2).withFaceLandmarks(); } catch (_) {} }
      if (cancelado || mia !== vuelta) break;
      let p = res ? res.landmarks.positions.map((q) => [q.x, q.y]) : null, seguida = false;
      if (p) { const b = res.detection.box; caja = { x: b.x, y: b.y, w: b.width, h: b.height }; cajaT = performance.now(); fallos = 0; }
      else if (caja && performance.now() - cajaT < 3000) { p = await siguePuntos(fa, caja, puntos); if (p) { seguida = true; const c = cajaDe(p); caja = { x: c.x, y: c.y - c.h * 0.25, w: c.w, h: c.h * 1.25 }; } }
      if (cancelado || mia !== vuelta) break;
      const t = performance.now() - t0, r = ajustaLienzo(), m = aPantalla(r);
      if (p) { puntos = p; puntosT = performance.now(); nCon++; }
      const fi = firma(); let cz = null; if (fi && firmaPrev) { let a = 0; for (let i = 0; i < fi.length; i++) a += Math.abs(fi[i] - firmaPrev[i]); cz = a / fi.length; } firmaPrev = fi;
      datos.push({ t, p, e: A ? A.e : 0, w: video.videoWidth, s: seguida ? 1 : 0, cz });
      // las señales que ya se ven
      if (p) {
        chip('cara', 'si');
        const e = (ojo(p, 36) + ojo(p, 42)) / 2; ears.push(e); if (ears.length > 8) baseEar = [...ears].sort((a, b) => a - b)[Math.floor(ears.length * 0.6)];
        if (baseEar) { if (!cerr && e < baseEar * 0.72) { cerr = true; parp++; chip('parpadeo', 'si'); } else if (cerr && e > baseEar * 0.88) cerr = false; }
      }
      const con = datos.filter((d) => d.p);
      if (con.length > 12 && datos.length % 4 === 0) { const rel = relieve(con); if (rel.estado === 'si') chip('relieve', 'si'); else if (rel.estado === 'no') chip('relieve', 'no'); }
      if (con.length > 12 && t > 3000 && datos.length % 4 === 1) { const a = analiza(datos, {}); if (a.movNatural) chip('movimiento', 'si'); }
      if (A && A.voz > 10) chip('voz', 'si');
      zonasPantalla = p ? zonas(p).map(([a, b, c, d]) => [m.ox + a * m.s, m.oy + b * m.s, m.ox + c * m.s, m.oy + d * m.s]) : null;
      const avance = Math.min(1, Math.max(Math.min(t / DUR, nCon / MUESTRAS), t / DUR_MAX));
      dibuja(r, p ? p.map(([x, y]) => [m.ox + x * m.s, m.oy + y * m.s]) : null, avance, t);
    }
    if (usaRVFC && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(idCb); else cancelAnimationFrame(idCb);
    avisaFin();
    if (cancelado || mia !== vuelta) { if (A) A.ctx.close().catch(() => {}); return; }
    await Promise.race([pf, new Promise((ok) => setTimeout(ok, 1200))]);
    const voz = bandaVoz(A); if (A) A.ctx.close().catch(() => {});
    if (cancelado || mia !== vuelta) return;
    enMarcha = false; zonasPantalla = null;
    g.clearRect(0, 0, lienzo.width, lienzo.height);
    const luz = piel.length ? mediana(piel.map((m) => m.y)) : null;
    const nCortes = cortes(datos);
    const r = analiza(datos, { fuente, pulso: pulso(piel), voz, luz, cortes: nCortes });
    r._datos = datos; r._extra = { fuente, pulso: r.pulso, voz, luz, cortes: nCortes };
    if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) window.__comprueba = { muestras: datos.length, cara: nCon, seguidas: datos.filter((d) => d.s).length, ms: Math.round(performance.now() - t0), tipo: r.tipo, forma: r.forma, parpadeos: r.parpadeos, pct: probabilidad(r) };
    // si sale raro (ni claramente falso ni claramente real), la prueba del gesto, sin más pasos
    const pr0 = probabilidad(r);
    if (pr0 >= 10 && pr0 < 80 && (r.n | 0) >= 5 && !['virtual', 'sinCara', 'sinVideo', 'error'].includes(r.tipo)) { previo = r; pruebaGesto(true); return; }
    resultado(r);
  }

  // ---- la prueba extra: «pídele que gire la cabeza despacio hacia un lado y que vuelva» ----
  // Un vídeo grabado no puede hacerlo cuando se le pide, y las caras puestas con un programa suelen deformarse de perfil.
  // ---- la prueba del gesto (dueño, 20:45): si el análisis sale raro (o si quien comprueba quiere), se le dice qué pedirle a la otra
  // persona, paso a paso, y a ella también le sale en su pantalla: girar la cabeza a un lado, taparse la cara con la mano y girar al
  // otro lado. Un vídeo grabado, una foto, un muñeco o un avatar no lo hacen cuando se les pide. Si no lo hace: posible falso.
  const PASO_MS = 6500;
  function pregunta(mia, ops) {
    return new Promise((ok) => {
      let pb = capa.querySelector('.pide-botones');
      if (!pb) { pb = document.createElement('div'); pb.className = 'pide-botones'; capa.append(pb); }
      pb.textContent = ''; let t = null, vig = null;
      const fin = (v) => { clearTimeout(t); clearInterval(vig); pb.hidden = true; pb.textContent = ''; ok(v); };
      for (const [v, k, c] of ops) { const b = document.createElement('button'); b.type = 'button'; b.className = c; b.textContent = tr(k); b.onclick = () => fin(v); pb.append(b); }
      pb.hidden = false; t = setTimeout(() => fin('nd'), 25000); vig = setInterval(() => { if (cancelado || mia !== vuelta) fin('nd'); }, 300);
    });
  }
  const preguntaDijo = (mia) => pregunta(mia, [['si', 'pide_dijoSi', 'pide-si'], ['no', 'pide_dijoNo', 'pide-no']]);

  async function pruebaGesto(auto) {
    if (enMarcha || !previo || !previo._datos) return;
    const base = previo; enMarcha = true; cancelado = false; triangulos = null; const mia = ++vuelta;
    resultadoCaja.hidden = true; capa.classList.remove('con-resultado'); const caja = $('#comprobacion-estado'); caja.hidden = false; caja.classList.add('giro');
    vivo.textContent = ''; $('#comprobacion-avance').style.width = '0%';
    const est = $('#comprobacion-estado-texto');
    let fa; try { fa = await cargaFaceApi(); } catch (_) { enMarcha = false; resultado(base); return; }
    const telefono = matchMedia('(max-width: 760px)').matches;
    const opc = new fa.TinyFaceDetectorOptions({ inputSize: telefono ? 224 : 320, scoreThreshold: 0.35 });
    const a0s = base._datos.filter((d) => d.p).map((d) => afin(d.p)).filter(Boolean).map((x) => x[0]);
    let a0 = a0s.length ? mediana(a0s) : null, signo = 0, hechos = 0;
    const az = new Uint32Array(1); crypto.getRandomValues(az); const lado = az[0] & 1 ? 'izq' : 'der', diagPasos = [];
    const pasos = [lado, 'mano', lado === 'izq' ? 'der' : 'izq'];
    if (M && M.gesto) avisado = !!M.gesto('inicio', 0, 0);
    // el reflejo (dueño, 20:55): su pantalla se ilumina un instante en magenta y en cian (en orden al azar); en una cara de verdad esa
    // luz se refleja (el rojo frente al verde sube con el magenta y baja con el cian). Solo suma: a pleno sol casi no se nota.
    const col = [];
    const muestraLuz = async (ms, et) => {
      const t1 = performance.now();
      while (!cancelado && mia === vuelta && performance.now() - t1 < ms) {
        let res = null; try { res = await fa.detectSingleFace(video, opc).withFaceLandmarks(); } catch (_) {}
        if (res) {
          const p = res.landmarks.positions.map((x) => [x.x, x.y]), mm = muestraPiel(p, performance.now());
          if (mm && mm.rgb) { const [R, G, B] = mm.rgb; col.push({ et, t: performance.now() - t1, rg: (R - G) / (R + G + B || 1) }); }
          const rr = ajustaLienzo(), m = aPantalla(rr); dibuja(rr, p.map(([x, y]) => [m.ox + x * m.s, m.oy + y * m.s]), 0, 0);
        }
        await new Promise((ok) => requestAnimationFrame(ok));
      }
    };
    est.textContent = tr('pide_luz');
    await muestraLuz(700, 'base');
    for (const c of (az[0] & 2 ? [0, 1] : [1, 0])) { try { if (M && M.gesto) M.gesto('luz', c, 0); } catch (_) {} await muestraLuz(1500, c); }
    const ven = (c) => col.filter((x) => x.et === c && x.t >= 250 && x.t <= 1400).map((x) => x.rg), wm = ven(0), wc = ven(1), wb = col.filter((x) => x.et === 'base').map((x) => x.rg);
    let reflejo = { estado: 'nd' };
    if (wm.length >= 4 && wc.length >= 4 && wb.length >= 3) { const dif = mediana(wm) - mediana(wc), ruido = desv(wb); reflejo = { estado: dif >= Math.max(0.006, 2.5 * ruido) ? 'si' : 'nd', dif: Math.round(dif * 1e4) / 1e4, ruido: Math.round(ruido * 1e4) / 1e4 }; }
    for (let k = 0; k < pasos.length && !cancelado && mia === vuelta; k++) {
      const q = pasos[k]; est.textContent = (auto && k === 0 ? tr('pide_aviso') + ' ' : '') + tr('pide_' + q);
      try { if (M && M.gesto) M.gesto(q, k + 1, 3); } catch (_) {}
      const t0 = performance.now(); let hecho = false, perdidas = 0, vista = false, d = 0;
      while (!cancelado && mia === vuelta && performance.now() - t0 < PASO_MS && !hecho) {
        let res = null; try { res = await fa.detectSingleFace(video, opc).withFaceLandmarks(); } catch (_) {}
        if (cancelado || mia !== vuelta) break;
        const t = performance.now() - t0, rr = ajustaLienzo(), m = aPantalla(rr);
        const p = res ? res.landmarks.positions.map((x) => [x.x, x.y]) : null;
        if (q === 'mano') { if (p) { vista = true; perdidas = 0; } else if (vista && ++perdidas >= 2) hecho = true; }
        else if (p) {
          const ab = afin(p);
          if (ab) { if (a0 == null) a0 = ab[0]; d = ab[0] - a0; const s = Math.sign(d) * (q === 'izq' ? 1 : -1);
            // el primer giro marca el lado (la imagen puede llegar en espejo); el último tiene que ir al lado contrario
            if (Math.abs(d) >= 0.15) { if (!signo) { signo = s; hecho = true; } else if (s === signo) hecho = true; } }
        }
        dibuja(rr, p ? p.map(([x, y]) => [m.ox + x * m.s, m.oy + y * m.s]) : null, Math.min(1, (k + t / PASO_MS) / pasos.length), t);
        dibujaOnda(null, null, false, q === 'mano' ? null : { d, hecho });
        await new Promise((ok) => requestAnimationFrame(ok));
      }
      diagPasos.push({ q, hecho, d: q === 'mano' ? null : Math.round(d * 1000) / 1000, ms: Math.round(performance.now() - t0) });
      if (!hecho) break;
      hechos++; vibra(); est.textContent = tr('pide_hecho'); await new Promise((ok) => setTimeout(ok, 700));
    }
    // tres palabras al azar (dueño, 20:55: «alguna más»): un vídeo grabado no puede decirlas, y a un avatar le cuesta hacerlo en el
    // momento. Quien comprueba las oye y lo confirma con un toque.
    let palabras = 'nd';
    if (hechos === pasos.length && !cancelado && mia === vuelta) {
      const w = tresPalabras(); est.textContent = tr('pide_voz').replace('{w}', w);
      try { if (M && M.gesto) M.gesto('voz', 0, 0, w); } catch (_) {}
      palabras = await preguntaDijo(mia);
    }
    // la palabra clave de la empresa (punto 2): una frase acordada en persona. Una cara hecha con IA puede imitar a alguien, pero no
    // sabe esa frase. Quien comprueba la oye y dice si es correcta.
    let clave = 'nd';
    if (palabras === 'si' && !cancelado && mia === vuelta) {
      est.textContent = tr('pide_clave');
      try { if (M && M.gesto) M.gesto('clave', 0, 0); } catch (_) {}
      clave = await pregunta(mia, [['si', 'pide_claveSi', 'pide-si'], ['no', 'pide_claveNo', 'pide-no'], ['nd', 'pide_claveNd', 'pide-nd']]);
    }
    avisaFin();
    if (cancelado || mia !== vuelta) return;
    enMarcha = false; caja.classList.remove('giro'); g.clearRect(0, 0, lienzo.width, lienzo.height);
    const giro = { estado: hechos === pasos.length && palabras !== 'no' && clave !== 'no' ? 'si' : 'no', hechos, palabras, clave };
    const r = analiza(base._datos, Object.assign({}, base._extra, { giro, reflejo, palabras, clave }));
    r._gesto = { pasos: diagPasos, reflejo, palabras, clave };
    if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) window.__gesto = { giro, reflejo, muestras: col.length };
    r._datos = base._datos; r._extra = base._extra;
    resultado(r);
  }
  const vibra = () => { try { if (navigator.vibrate) navigator.vibrate(30); } catch (_) {} };

  $('#b-comprobar').addEventListener('click', comprueba);
  $('#comprobacion-cerrar').addEventListener('click', termina);
  $('#comprobacion-cancelar').addEventListener('click', termina);
  $('#comprobacion-giro').addEventListener('click', () => pruebaGesto(false));
  // la llamada termina: fuera
  if (M) M.on('llamada', (e) => { if (e.estado !== 'hablando' && e.estado !== 'reconectando' && !capa.hidden) termina(); });
  window.ElixireComprueba = {
    comprueba, cierra: termina, analiza, probabilidad, delaunay, afin, relieve, forma, pulso, ritmo, pos, bandaVoz,
    _dibuja: (pts) => { capa.hidden = false; resultadoCaja.hidden = true; $('#comprobacion-estado').hidden = false; $('#comprobacion-estado-texto').textContent = tr('comprobacionAnalizando'); const r = ajustaLienzo(); triangulos = null; zonasPantalla = null; dibuja(r, pts, 0.64, 1200); },
    _resultado: (r) => { capa.hidden = false; resultado(r); },
  };
})();
