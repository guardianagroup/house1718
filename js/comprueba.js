// Elixire · «Comprobar»: ¿una persona real en directo o un avatar? (19 nov 2026)
// Dueño, 16:45: «un botón… para saber si la otra persona es un avatar o no… que se vea incluso cómo se hace un mapeo, que detectemos
// la cara de la persona… como analizando todo, la silueta, todo, y comprobando durante unos segundos, y ponga "analizando"…
// obviamente le aparece a la persona que lo está haciendo, no a los dos… y el resultado, si es un humano o no».
// Todo se hace en este equipo, sobre la imagen que ya llega: no se envía nada ni se guarda nada, y la otra persona no lo ve.
//   · La cara se encuentra y se sigue con 68 puntos (face-api.js, licencia MIT, en js/terceros/, con sus dos modelos pequeños en
//     modelos/; se cargan solo al tocar «Comprobar»). La malla que se ve encima son esos puntos, de verdad, en cada imagen.
//   · Durante 7 segundos se mide: si la cara está a la vista; el parpadeo (la apertura de los ojos); el movimiento natural de la
//     cabeza (una imagen fija o un vídeo congelado no se mueve nada); y, si habla, si la boca se abre y se cierra con su voz.
//   · El resultado dice lo que se ha visto, con prudencia: «Persona real en directo», «No se puede confirmar», «Posible imagen fija o
//     vídeo grabado» o «Posible vídeo manipulado: los labios no van con la voz». Ayuda, pero no es infalible: una falsificación muy
//     buena en directo podría pasarla (igual que dice la web de la prueba de vida).
'use strict';
(() => {
  const $ = (s) => document.querySelector(s);
  const tr = (k) => (window.ElixireIdioma ? window.ElixireIdioma.t(k) : k);
  const FACEAPI = { src: 'js/terceros/face-api.min.js?v=0.22.2', sri: 'sha384-gzn2n++arkvyhdNLmUf1s6F5NZ8iAbZ7FhIt+Zw7Jlf1n/vNTmZ3+cYr7S4ogyco' };
  const DUR = 7000;
  const capa = $('#comprobacion'), lienzo = $('#comprobacion-lienzo'), g = lienzo.getContext('2d');
  const video = $('#video-suyo');
  let cargando = null, enMarcha = false, cancelado = false, triangulos = null;

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

  // ---- dibujo ----
  function ajustaLienzo() {
    const r = video.getBoundingClientRect(), k = Math.min(2, devicePixelRatio || 1);
    lienzo.style.left = r.left + 'px'; lienzo.style.top = r.top + 'px'; lienzo.style.width = r.width + 'px'; lienzo.style.height = r.height + 'px';
    lienzo.width = Math.round(r.width * k); lienzo.height = Math.round(r.height * k); g.setTransform(k, 0, 0, k, 0, 0);
    return r;
  }
  // de la imagen del vídeo a la pantalla (con «object-fit: cover»)
  function aPantalla(r) {
    const vw = video.videoWidth || 1, vh = video.videoHeight || 1, s = Math.max(r.width / vw, r.height / vh);
    return { s, ox: (r.width - vw * s) / 2, oy: (r.height - vh * s) / 2 };
  }
  function dibuja(r, puntos, avance, t) {
    g.clearRect(0, 0, r.width, r.height);
    g.fillStyle = 'rgba(3,6,10,.35)'; g.fillRect(0, 0, r.width, r.height);
    if (puntos) {
      const xs = puntos.map((q) => q[0]), ys = puntos.map((q) => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), m = (x1 - x0) * 0.18;
      const bx = x0 - m, by = y0 - m * 1.6, bw = x1 - x0 + 2 * m, bh = y1 - y0 + m * 2.4;
      // la cara, más clara que el resto
      g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.8)'; g.beginPath(); g.ellipse(bx + bw / 2, by + bh / 2, bw * 0.62, bh * 0.6, 0, 0, Math.PI * 2); g.fill(); g.restore();
      // la malla
      if (!triangulos) triangulos = delaunay(puntos);
      g.lineWidth = 0.7; g.strokeStyle = 'rgba(156,195,228,.38)'; g.beginPath();
      for (const [a, b, c] of triangulos) { g.moveTo(puntos[a][0], puntos[a][1]); g.lineTo(puntos[b][0], puntos[b][1]); g.lineTo(puntos[c][0], puntos[c][1]); g.closePath(); }
      g.stroke();
      // los contornos: mandíbula, cejas, nariz, ojos y labios
      g.lineWidth = 1.4; g.strokeStyle = 'rgba(220,236,251,.9)'; g.shadowColor = 'rgba(156,195,228,.9)'; g.shadowBlur = 8;
      for (const [i, j, cierra] of CONTORNOS) { g.beginPath(); g.moveTo(puntos[i][0], puntos[i][1]); for (let k = i + 1; k <= j; k++) g.lineTo(puntos[k][0], puntos[k][1]); if (cierra) g.closePath(); g.stroke(); }
      g.fillStyle = '#EAF4FD'; for (const q of puntos) { g.beginPath(); g.arc(q[0], q[1], 1.7, 0, Math.PI * 2); g.fill(); }
      g.shadowBlur = 0;
      // el barrido que sube y baja por la cara
      const ys2 = by + bh * (0.5 + 0.5 * Math.sin(t / 380)), gr = g.createLinearGradient(0, ys2 - 26, 0, ys2 + 26);
      gr.addColorStop(0, 'rgba(156,195,228,0)'); gr.addColorStop(0.5, 'rgba(156,195,228,.38)'); gr.addColorStop(1, 'rgba(156,195,228,0)');
      g.fillStyle = gr; g.fillRect(bx, ys2 - 26, bw, 52);
      g.fillStyle = 'rgba(234,244,253,.95)'; g.fillRect(bx, ys2 - 0.75, bw, 1.5);
      // las esquinas del recuadro
      const e = Math.min(bw, bh) * 0.16; g.lineWidth = 2.2; g.strokeStyle = '#9CC3E4'; g.beginPath();
      for (const [cx, cy, sx, sy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) { g.moveTo(cx, cy + sy * e); g.lineTo(cx, cy); g.lineTo(cx + sx * e, cy); }
      g.stroke();
    } else {
      // buscando la cara: un barrido por toda la imagen
      const ys2 = r.height * (0.5 + 0.45 * Math.sin(t / 420));
      g.fillStyle = 'rgba(156,195,228,.5)'; g.fillRect(0, ys2 - 0.75, r.width, 1.5);
    }
    $('#comprobacion-avance').style.width = Math.round(avance * 100) + '%';
  }

  // ---- las medidas ----
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const ojo = (p, i) => (dist(p[i + 1], p[i + 5]) + dist(p[i + 2], p[i + 4])) / (2 * dist(p[i], p[i + 3]) || 1);
  const media = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const desv = (a) => { const m = media(a); return Math.sqrt(media(a.map((x) => (x - m) ** 2))); };
  function correlacion(a, b) { const ma = media(a), mb = media(b); let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return sa && sb ? s / Math.sqrt(sa * sb) : 0; }
  function analiza(datos) {
    const con = datos.filter((d) => d.p), presencia = con.length / (datos.length || 1);
    if (con.length < 12 || presencia < 0.5) return { tipo: 'sinCara', presencia };
    const io = con.map((d) => dist(d.p[36], d.p[45]) || 1);
    const ear = con.map((d) => (ojo(d.p, 36) + ojo(d.p, 42)) / 2), base = [...ear].sort((a, b) => a - b)[Math.floor(ear.length * 0.6)];
    let parpadeos = 0, cerrado = false;
    for (const e of ear) { if (!cerrado && e < base * 0.72) { cerrado = true; parpadeos++; } else if (cerrado && e > base * 0.88) cerrado = false; }
    // movimiento: la nariz respecto a los ojos (giro) y la cara en la imagen, en distancias entre ojos
    const giro = con.map((d, i) => (d.p[30][0] - (d.p[36][0] + d.p[45][0]) / 2) / io[i]), cab = con.map((d, i) => (d.p[30][1] - (d.p[36][1] + d.p[45][1]) / 2) / io[i]);
    const cx = con.map((d, i) => d.p[30][0] / io[i]), cy = con.map((d, i) => d.p[30][1] / io[i]);
    const mov = desv(giro) + desv(cab) + 0.25 * (desv(cx) + desv(cy));
    let iguales = 0; for (let i = 1; i < con.length; i++) { let s = 0; for (let k = 0; k < 68; k++) s += dist(con[i].p[k], con[i - 1].p[k]); if (s / 68 < 0.02 * io[i]) iguales++; }
    const congelado = iguales / Math.max(1, con.length - 1) > 0.85;
    // la boca y la voz
    const boca = con.map((d, i) => dist(d.p[62], d.p[66]) / io[i]), voz = con.map((d) => d.e || 0);
    const habla = voz.some((x) => x > 0) && media(voz) > 0.008 && desv(voz) > 0.005;
    let corr = 0; if (habla) for (const k of [0, 1, 2]) corr = Math.max(corr, correlacion(boca.slice(k), voz.slice(0, voz.length - k)));
    const movNatural = mov > 0.012 && !congelado;
    let tipo;
    if (congelado || (mov < 0.006 && parpadeos === 0 && desv(boca) < 0.004)) tipo = 'fija';
    else if (habla && corr < 0.05 && desv(boca) < 0.01) tipo = 'labios';
    else if ((parpadeos >= 1 || movNatural) && (!habla || corr >= 0.2)) tipo = 'real';
    else tipo = 'dudoso';
    return { tipo, presencia, parpadeos, movNatural, habla, labios: habla ? corr >= 0.2 : null };
  }

  // ---- el resultado ----
  function resultado(r) {
    const caja = $('#comprobacion-resultado'); caja.className = 'comprobacion-resultado ' + r.tipo;
    $('#comprobacion-estado').hidden = true; caja.hidden = false;
    $('#comprobacion-titulo').textContent = tr('comprobacion_' + r.tipo);
    $('#comprobacion-texto').textContent = tr('comprobacion_' + r.tipo + 'Texto');
    const l = $('#comprobacion-senales'); l.textContent = '';
    if (r.tipo !== 'sinCara' && r.tipo !== 'error') {
      for (const [k, v] of [['senalParpadeo', r.parpadeos > 0], ['senalMovimiento', r.movNatural], ['senalLabios', r.labios]]) {
        const li = document.createElement('li'); li.className = v === null ? 'nd' : v ? 'si' : 'no';
        li.textContent = tr(k) + (v === null ? ' · ' + tr('senalNoHablo') : ''); l.append(li);
      }
    }
  }
  function termina() {
    cancelado = true; enMarcha = false; capa.hidden = true; triangulos = null; $('#comprobacion-resultado').hidden = true;
    g.clearRect(0, 0, lienzo.width, lienzo.height);
  }
  async function comprueba() {
    if (enMarcha) return;
    enMarcha = true; cancelado = false; triangulos = null;
    capa.hidden = false; $('#comprobacion-resultado').hidden = true; $('#comprobacion-estado').hidden = false;
    const est = $('#comprobacion-estado-texto'); est.textContent = tr('comprobacionPreparando'); $('#comprobacion-avance').style.width = '0%';
    if (!video.srcObject || video.readyState < 2 || !video.videoWidth) { enMarcha = false; resultado({ tipo: 'sinCara' }); return; }
    // la voz que llega, solo para medir su volumen (no se graba ni se envía)
    let actx = null, an = null, buf = null;
    try {
      const at = video.srcObject.getAudioTracks()[0];
      if (at) { const AC = window.AudioContext || window.webkitAudioContext; actx = new AC(); if (actx.state === 'suspended') await actx.resume(); const fuente = actx.createMediaStreamSource(new MediaStream([at])); an = actx.createAnalyser(); an.fftSize = 1024; fuente.connect(an); buf = new Float32Array(an.fftSize); }
    } catch (_) { an = null; }
    let fa;
    try { fa = await cargaFaceApi(); } catch (_) { enMarcha = false; if (actx) actx.close().catch(() => {}); resultado({ tipo: 'error' }); return; }
    if (cancelado) { if (actx) actx.close().catch(() => {}); return; }
    est.textContent = tr('comprobacionAnalizando');
    const opc = new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }), datos = [], t0 = performance.now();
    while (!cancelado && performance.now() - t0 < DUR) {
      let res = null; try { res = await fa.detectSingleFace(video, opc).withFaceLandmarks(); } catch (_) {}
      if (cancelado) break;
      const t = performance.now() - t0, r = ajustaLienzo(), m = aPantalla(r);
      let e = 0; if (an) { an.getFloatTimeDomainData(buf); let s = 0; for (const x of buf) s += x * x; e = Math.sqrt(s / buf.length); }
      const p = res ? res.landmarks.positions.map((q) => [q.x, q.y]) : null;
      datos.push({ t, p, e });
      dibuja(r, p ? p.map(([x, y]) => [m.ox + x * m.s, m.oy + y * m.s]) : null, Math.min(1, t / DUR), t);
      await new Promise((ok) => requestAnimationFrame(ok));
    }
    if (actx) actx.close().catch(() => {});
    if (cancelado) return;
    enMarcha = false;
    g.clearRect(0, 0, lienzo.width, lienzo.height);
    resultado(analiza(datos));
  }
  $('#b-comprobar').addEventListener('click', comprueba);
  $('#comprobacion-cerrar').addEventListener('click', termina);
  $('#comprobacion-cancelar').addEventListener('click', termina);
  // la llamada termina: fuera
  if (window.ElixireMotor) window.ElixireMotor.on('llamada', (e) => { if (e.estado !== 'hablando' && e.estado !== 'reconectando' && !capa.hidden) termina(); });
  window.ElixireComprueba = { comprueba, analiza, delaunay, _dibuja: (pts) => { capa.hidden = false; $('#comprobacion-resultado').hidden = true; $('#comprobacion-estado').hidden = false; $('#comprobacion-estado-texto').textContent = tr('comprobacionAnalizando'); const r = ajustaLienzo(); triangulos = null; dibuja(r, pts, 0.64, 1200); } };
})();
