// Maqueta local (no se publica): el holograma, más ancho, con una cara que habla dentro, en lugar de la roca
const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, locale: 'es-ES' }); const p = await ctx.newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e).slice(0, 200)));
  await p.route(/\/index\.html$/, async (r) => { const res = await r.fetch(); const t = (await res.text()).replace(/\s+integrity="[^"]*"/g, ''); await r.fulfill({ response: res, body: t }); });
  await p.route(/\/js\/sala3d\.js/, async (r) => { const res = await r.fetch(); let t = await res.text(); const n = t.length;
    t = t.replace('te.userData.corte.visible=le,', 'te.visible=!window.__sinRoca,te.userData.corte.visible=le&&!window.__sinRoca,'); console.log('roca oculta:', t.length !== n); await r.fulfill({ response: res, body: t }); });
  await p.goto('http://127.0.0.1:8090/index.html', { waitUntil: 'load' }); await p.click('[data-idioma="es"]').catch(() => {}); await p.waitForTimeout(2500);
  const ok = await p.evaluate(async () => {
    window.__sinRoca = true; if (window.Sala3D && window.Sala3D.holo) window.Sala3D.holo(-0.6);
    const carga = (src) => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });
    if (!window.faceapi) await carga('js/terceros/face-api.min.js?v=0.22.2');
    if (!window.ElixireComprueba) await carga('js/comprueba.js');
    const fa = window.faceapi; await fa.nets.tinyFaceDetector.loadFromUri('modelos'); await fa.nets.faceLandmark68Net.loadFromUri('modelos');
    const img = new Image(); img.src = '/img/caras/legal.webp'; await img.decode();
    const r = await fa.detectSingleFace(img, new fa.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 })).withFaceLandmarks();
    if (!r) return 'sin cara';
    const P0 = r.landmarks.positions.map((q) => [q.x, q.y]), W = img.width, H = img.height, C = window.ElixireComprueba;
    if (!C || typeof C.delaunay !== 'function') return 'sin delaunay ' + Object.keys(C || {});
    const borde = [[0, 0], [W / 2, 0], [W, 0], [W, H / 2], [W, H], [W / 2, H], [0, H], [0, H / 2], [W * .2, H * .12], [W * .8, H * .12], [W * .08, H * .9], [W * .92, H * .9]];
    const base = P0.concat(borde); let tri = C.delaunay(base);
    if (!Array.isArray(tri[0])) { const t2 = []; for (let i = 0; i < tri.length; i += 3) t2.push([tri[i], tri[i + 1], tri[i + 2]]); tri = t2; }
    const D = 2, VW = innerWidth, VH = innerHeight;
    const fw = Math.hypot(P0[16][0] - P0[0][0], P0[16][1] - P0[0][1]), fh = P0[8][1] - P0[27][1], nc = P0[8][1] - P0[33][1], mw = P0[54][0] - P0[48][0];
    const sc = 150 / fw * D, AX = 195 * D, AY = 222 * D;
    const map = (q) => [AX + (q[0] - P0[27][0]) * sc, AY + (q[1] - P0[27][1]) * sc];
    const lienzo = () => { const c = document.createElement('canvas'); c.width = VW * D; c.height = VH * D; return c; };
    const tmp = lienzo(), msk = lienzo(), out = lienzo(), haz = lienzo();
    for (const [c, z] of [[haz, 2], [out, 3]]) Object.assign(c.style, { position: 'fixed', left: '0', top: '0', width: VW + 'px', height: VH + 'px', zIndex: String(z), pointerEvents: 'none', mixBlendMode: 'screen' });
    out.style.filter = 'drop-shadow(0 0 12px rgba(142,197,242,.5))'; document.body.append(haz, out);
    const gt = tmp.getContext('2d'), gm = msk.getContext('2d'), go = out.getContext('2d'), gh = haz.getContext('2d');
    function tri3(sp, dp) {
      const [[x0, y0], [x1, y1], [x2, y2]] = sp, [[u0, v0], [u1, v1], [u2, v2]] = dp;
      const d = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1); if (Math.abs(d) < 1e-6) return;
      const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / d, bq = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / d, c = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / d;
      const dd = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / d, e = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / d, f = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / d;
      const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3, k = 0.025;
      gt.save(); gt.beginPath(); gt.moveTo(u0 + (u0 - cx) * k, v0 + (v0 - cy) * k); gt.lineTo(u1 + (u1 - cx) * k, v1 + (v1 - cy) * k); gt.lineTo(u2 + (u2 - cx) * k, v2 + (v2 - cy) * k); gt.closePath(); gt.clip();
      gt.setTransform(a, dd, bq, e, c, f); gt.drawImage(img, 0, 0); gt.restore();
    }
    const habla = (t) => { const s = Math.max(0, Math.sin(t * 13.5) * .55 + Math.sin(t * 7.3 + 1) * .38 + Math.sin(t * 3.1) * .22); return 0; };
    const baja = { 55: .6, 56: .9, 57: 1, 58: .9, 59: .6, 65: .9, 66: 1, 67: .9, 48: .25, 54: .25, 60: .3, 64: .3, 5: .2, 6: .45, 7: .75, 8: .85, 9: .75, 10: .45, 11: .2 };
    const prof = (k) => (k >= 27 && k <= 35) ? 1 : (k >= 48) ? .6 : (k >= 36) ? .45 : (k >= 17) ? .4 : (k >= 4 && k <= 12) ? .25 : .05;
    const elipse = (cx, cy, rx, ry, rot, a, s1) => { gm.save(); gm.translate(cx, cy); gm.rotate(rot); gm.scale(rx, ry); const g = gm.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(s1, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); gm.fillStyle = g; gm.beginPath(); gm.arc(0, 0, 1, 0, Math.PI * 2); gm.fill(); gm.restore(); };
    window.__cara = (i, FPS) => {
      const t = i / FPS, P = P0.map((q) => q.slice()), h = habla(t), m = h * 0.16 * nc;
      for (const k in baja) P[k][1] += m * baja[k];
      for (const k of [50, 51, 52]) P[k][1] -= m * .06; for (const k of [61, 62, 63]) P[k][1] -= m * .1;
      const son = Math.max(0, Math.sin(t * 0.7 + 0.5)) * 0.15;
      P[48][0] -= son * .06 * mw; P[54][0] += son * .06 * mw; P[48][1] -= son * .05 * mw; P[54][1] -= son * .05 * mw; P[60][0] -= son * .04 * mw; P[64][0] += son * .04 * mw;
      const tb = (t + 0.4) % 3.3, bl = tb < 0.18 ? Math.sin(tb / 0.18 * Math.PI) : 0;
      for (const [u, d] of [[37, 41], [38, 40], [43, 47], [44, 46]]) P[u][1] += (P0[d][1] - P0[u][1]) * bl * .9;
      const ce = (Math.pow(Math.max(0, Math.sin(t * 1.1 - 1)), 4) * 0.05 + h * 0.012) * fh;
      for (let k = 17; k <= 26; k++) P[k][1] -= ce;
      const yaw = (Math.sin(t * 0.55) * 0.045 + Math.sin(t * 1.7) * 0.01) * fw;
      for (let k = 0; k < 68; k++) P[k][0] += yaw * prof(k);
      const rot = Math.sin(t * 0.8) * 0.04 + Math.sin(t * 2.3) * 0.012, nod = (Math.sin(t * 2.7) * .5 + .5) * h * 0.03 * fh * sc + Math.sin(t * 1.2) * 3 * D;
      const [hx, hy] = map(P0[30]);
      const dst = P.concat(borde).map(map).map(([x, y]) => { const dx = x - hx, dy = y - hy; return [hx + dx * Math.cos(rot) - dy * Math.sin(rot), hy + dx * Math.sin(rot) + dy * Math.cos(rot) + nod]; });
      gt.setTransform(1, 0, 0, 1, 0, 0); gt.clearRect(0, 0, tmp.width, tmp.height);
      for (const [a, bb, c] of tri) tri3([base[a], base[bb], base[c]], [dst[a], dst[bb], dst[c]]);
      if (m > 0.5) { gt.beginPath(); [60, 61, 62, 63, 64, 65, 66, 67].forEach((k, j) => j ? gt.lineTo(dst[k][0], dst[k][1]) : gt.moveTo(dst[k][0], dst[k][1])); gt.closePath(); gt.fillStyle = `rgba(18,10,12,${Math.min(.35, m / (0.3 * nc))})`; gt.fill(); }
      // la máscara de la cabeza (y el cuello, que se funde en el haz)
      const jl = dst[0], jr = dst[16], ch = dst[8], brY = (dst[19][1] + dst[24][1]) / 2, wJ = Math.hypot(jr[0] - jl[0], jr[1] - jl[1]), hF = ch[1] - brY, top = brY - 0.56 * hF;
      gm.setTransform(1, 0, 0, 1, 0, 0); gm.globalCompositeOperation = 'source-over'; gm.clearRect(0, 0, msk.width, msk.height); gm.globalCompositeOperation = 'lighter';
      elipse((jl[0] + jr[0]) / 2, (top + ch[1]) / 2 + 0.02 * hF, 0.66 * wJ, 0.62 * (ch[1] - top), rot, 1, 0.7);
      elipse(ch[0], ch[1] + 0.35 * hF, 0.36 * wJ, 0.6 * hF, 0, 0.75, 0.15);
      // el holograma: gris, tinte azul, máscara, líneas de barrido, banda de luz y algún corte
      go.globalCompositeOperation = 'source-over'; go.clearRect(0, 0, out.width, out.height);
      go.filter = 'saturate(.4) contrast(1.12) brightness(1.18)'; go.drawImage(tmp, 0, 0); go.filter = 'none';
      go.globalCompositeOperation = 'color'; go.globalAlpha = .6; go.fillStyle = '#7FBFF0'; go.fillRect(0, 0, out.width, out.height); go.globalAlpha = 1;
      go.globalCompositeOperation = 'destination-in'; go.drawImage(msk, 0, 0);
      { const cxF = (dst[0][0] + dst[16][0]) / 2, lado = (x) => Math.max(0, Math.min(1, (x - cxF) / (0.42 * wJ)));
        go.globalCompositeOperation = 'source-atop'; go.lineWidth = 1;
        for (const [a, bb, c] of tri) { if (a >= 68 || bb >= 68 || c >= 68) continue; const al = lado((dst[a][0] + dst[bb][0] + dst[c][0]) / 3) * 0.2; if (al < 0.03) continue;
          go.strokeStyle = `rgba(215,238,255,${al})`; go.beginPath(); go.moveTo(dst[a][0], dst[a][1]); go.lineTo(dst[bb][0], dst[bb][1]); go.lineTo(dst[c][0], dst[c][1]); go.closePath(); go.stroke(); }
        for (let k = 0; k < 68; k++) { const al = lado(dst[k][0]) * 0.38; if (al < 0.05) continue; go.fillStyle = `rgba(225,244,255,${al})`; go.beginPath(); go.arc(dst[k][0], dst[k][1], 1.6, 0, Math.PI * 2); go.fill(); }
        go.globalCompositeOperation = 'lighter'; go.lineWidth = 1.4; go.strokeStyle = 'rgba(190,230,255,.45)';
        go.beginPath(); go.moveTo(dst[45][0] + 0.03 * wJ, dst[45][1] + 0.06 * hF); go.quadraticCurveTo(dst[15][0] - 0.02 * wJ, dst[29][1], dst[13][0] - 0.04 * wJ, dst[13][1]); go.stroke();
        go.beginPath(); go.moveTo(dst[13][0] - 0.04 * wJ, dst[13][1]); go.quadraticCurveTo(dst[11][0] - 0.03 * wJ, dst[11][1] - 0.01 * hF, dst[9][0], dst[9][1] - 0.03 * hF); go.stroke();
        const sx = dst[16][0] - 0.07 * wJ, sy = dst[16][1] - 0.32 * hF, sr = 0.055 * wJ;
        go.strokeStyle = 'rgba(200,236,255,.6)'; go.beginPath(); go.arc(sx, sy, sr, 0, Math.PI * 2); go.stroke(); go.beginPath(); go.arc(sx, sy, sr * 0.55, -1.2 + i * 0.08, 1.6 + i * 0.08); go.stroke();
        const gp = go.createRadialGradient(sx, sy, 0, sx, sy, sr * 0.5); gp.addColorStop(0, 'rgba(220,245,255,.9)'); gp.addColorStop(1, 'rgba(220,245,255,0)'); go.fillStyle = gp; go.beginPath(); go.arc(sx, sy, sr * 0.5, 0, Math.PI * 2); go.fill();
        for (const ojo of [[36, 37, 38, 39, 40, 41], [42, 43, 44, 45, 46, 47]]) {
          const ex = ojo.reduce((s, k) => s + dst[k][0], 0) / 6, ey = ojo.reduce((s, k) => s + dst[k][1], 0) / 6, ew = Math.hypot(dst[ojo[3]][0] - dst[ojo[0]][0], dst[ojo[3]][1] - dst[ojo[0]][1]);
          const ab = ((Math.hypot(dst[ojo[1]][0] - dst[ojo[5]][0], dst[ojo[1]][1] - dst[ojo[5]][1]) + Math.hypot(dst[ojo[2]][0] - dst[ojo[4]][0], dst[ojo[2]][1] - dst[ojo[4]][1])) / 2) / ew;
          const vis = Math.max(0, Math.min(1, (ab - 0.08) / 0.14)); if (vis < 0.05) continue;
          go.save(); go.beginPath(); ojo.forEach((k, j) => j ? go.lineTo(dst[k][0], dst[k][1]) : go.moveTo(dst[k][0], dst[k][1])); go.closePath(); go.clip();
          const gi = go.createRadialGradient(ex, ey, 0, ex, ey, 0.3 * ew); gi.addColorStop(0, `rgba(235,250,255,${0.55 * vis})`); gi.addColorStop(0.35, `rgba(150,215,255,${0.6 * vis})`); gi.addColorStop(1, 'rgba(150,215,255,0)');
          go.fillStyle = gi; go.fillRect(ex - ew, ey - ew, 2 * ew, 2 * ew); go.strokeStyle = `rgba(210,240,255,${0.7 * vis})`; go.lineWidth = 1.2; go.beginPath(); go.arc(ex, ey, 0.19 * ew, 0, Math.PI * 2); go.stroke(); go.restore();
        }
        go.strokeStyle = 'rgba(190,230,255,.2)'; go.lineWidth = 1.3;
        for (const f of [0.3, 0.44, 0.58]) { go.beginPath(); go.ellipse(ch[0], ch[1] + f * hF, 0.2 * wJ * (1 + f * 0.4), 0.035 * hF, 0, 0.1, Math.PI - 0.1); go.stroke(); }
      }
      go.globalCompositeOperation = 'destination-out'; go.fillStyle = 'rgba(0,0,0,.2)'; for (let y = (i * 2) % 6; y < out.height; y += 6) go.fillRect(0, y, out.width, 2);
      go.globalCompositeOperation = 'source-atop'; const alto = (ch[1] + 0.9 * hF) - top + 80 * D, yb = top - 40 * D + ((i * 7 * D) % alto);
      const gb = go.createLinearGradient(0, yb - 34 * D, 0, yb + 34 * D); gb.addColorStop(0, 'rgba(210,235,255,0)'); gb.addColorStop(.5, 'rgba(210,235,255,.32)'); gb.addColorStop(1, 'rgba(210,235,255,0)');
      go.fillStyle = gb; go.fillRect(0, yb - 34 * D, out.width, 68 * D);
      const corte = i % 31 === 13 || i % 31 === 14;
      if (corte) { const y0 = Math.round(brY + ((i * 37) % 7) * 0.1 * hF), hh = Math.round(0.07 * hF); const band = go.getImageData(0, y0, out.width, hh); go.clearRect(0, y0, out.width, hh); go.putImageData(band, 7 * D, y0); }
      out.style.opacity = String(Math.max(0, Math.min(1, 0.9 + 0.05 * Math.sin(i * 1.9) - (corte ? 0.22 : 0))));
      // el haz, más ancho, con partículas que suben, y un aro más amplio en la base
      const BX = 195 * D, BY = 503 * D, bw = 66 * D, tw = 182 * D, TY = 60 * D;
      gh.setTransform(1, 0, 0, 1, 0, 0); gh.globalCompositeOperation = 'source-over'; gh.clearRect(0, 0, haz.width, haz.height); gh.globalCompositeOperation = 'lighter';
      gh.beginPath(); gh.moveTo(BX - bw, BY); gh.lineTo(BX + bw, BY); gh.lineTo(BX + tw, TY); gh.lineTo(BX - tw, TY); gh.closePath();
      const gv = gh.createLinearGradient(0, BY, 0, TY); gv.addColorStop(0, 'rgba(120,180,235,.17)'); gv.addColorStop(.6, 'rgba(120,180,235,.05)'); gv.addColorStop(1, 'rgba(120,180,235,0)'); gh.fillStyle = gv; gh.fill();
      for (let k = 0; k < 46; k++) {
        const u = -1 + 2 * k / 45, w = Math.pow(1 - u * u, 1.4), a = (0.035 + 0.02 * Math.sin(i * 0.35 + k * 1.7)) * w, xb = BX + u * bw, xt = BX + u * tw + Math.sin(i * 0.05 + k) * 2 * D;
        const g = gh.createLinearGradient(0, BY, 0, TY); g.addColorStop(0, `rgba(150,200,240,${a * 1.6})`); g.addColorStop(.5, `rgba(150,200,240,${a * .7})`); g.addColorStop(1, 'rgba(150,200,240,0)');
        gh.fillStyle = g; gh.beginPath(); gh.moveTo(xb - 1.2 * D, BY); gh.lineTo(xb + 1.2 * D, BY); gh.lineTo(xt + 3.5 * D, TY); gh.lineTo(xt - 3.5 * D, TY); gh.closePath(); gh.fill();
      }
      for (let k = 0; k < 34; k++) { const s = ((k * 0.6180339) % 1 + i * (0.005 + (k % 5) * 0.0012)) % 1, u = Math.sin(k * 12.9898) * 0.95, x = BX + u * (bw + (tw - bw) * s), y = BY - s * (BY - TY);
        gh.fillStyle = `rgba(205,232,255,${Math.sin(Math.PI * s) * 0.75})`; gh.beginPath(); gh.arc(x, y, (0.8 + (k % 3) * 0.4) * D, 0, Math.PI * 2); gh.fill(); }
      gh.save(); gh.translate(BX, BY); gh.scale(1, 0.2); const gr = gh.createRadialGradient(0, 0, 0, 0, 0, 135 * D); gr.addColorStop(0, 'rgba(140,195,240,.32)'); gr.addColorStop(1, 'rgba(140,195,240,0)');
      gh.fillStyle = gr; gh.beginPath(); gh.arc(0, 0, 135 * D, 0, Math.PI * 2); gh.fill(); gh.setLineDash([10 * D, 6 * D]); gh.lineDashOffset = -i * 2 * D; gh.strokeStyle = 'rgba(190,225,255,.6)'; gh.lineWidth = 1.5 * D; gh.beginPath(); gh.arc(0, 0, 100 * D, 0, Math.PI * 2); gh.stroke(); gh.restore();
    };
    window.__cara(0, 24); return 'ok';
  });
  console.log('preparado:', ok); if (ok !== 'ok') { await b.close(); return; }
  for (let i = 0; i < 96; i++) { await p.evaluate((i) => window.__cara(i, 24), i); await p.screenshot({ path: `/tmp/real_f/f${String(i).padStart(3, '0')}.jpg`, type: 'jpeg', quality: 90 }); }
  console.log('errores', JSON.stringify(err)); await b.close();
})().catch((e) => { console.error('FALLO', e.message.slice(0, 500)); process.exit(1); });
