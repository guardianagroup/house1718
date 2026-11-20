const { chromium, devices } = require('playwright');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--use-file-for-fake-video-capture=/tmp/cara_fija.y4m'] });
  const err = [];
  const nuevo = async (dev, n) => { const ctx = await b.newContext({ ...dev, locale: 'es-ES', permissions: ['camera', 'microphone'] }); const p = await ctx.newPage(); p.on('pageerror', (e) => err.push(n + ' ' + e)); p.on('console', (m) => { if (m.type() === 'error') err.push(n + ' consola: ' + m.text().slice(0, 160)); }); return p; };
  const A = await nuevo(devices['iPhone 13'], 'A');
  await A.addInitScript(() => { navigator.share = (d) => { window.__compartido = d.text; return new Promise((r) => setTimeout(r, 200)); }; });
  await A.goto('http://127.0.0.1:8090/index.html?sin3d', { waitUntil: 'load' }); await A.waitForTimeout(400);
  await A.tap('[data-idioma="es"]'); await A.tap('#empezar');
  await A.waitForSelector('#panel-crear.visible.enviada', { timeout: 15000 });
  const enlace = (await A.evaluate(() => window.__compartido)).match(/https?:\/\/\S+/)[0];
  const B = await nuevo(devices['Pixel 7'], 'B');
  await B.goto('http://127.0.0.1:8090/index.html?sin3d' + enlace.slice(enlace.indexOf('#')) + '&l=es', { waitUntil: 'load' });
  await B.waitForFunction(() => !!document.querySelector('#panel-invitado.visible') || window.ElixireMotor.conectada || window.ElixireMotor.estadoLlamada().estado !== 'libre', null, { timeout: 15000 }); await espera(300);
  if (await B.locator('#entrar-llamada').isVisible()) { console.log('(B tuvo que tocar «Entrar»)'); await B.tap('#entrar-llamada'); }
  for (const P of [A, B]) await P.waitForFunction(() => window.ElixireMotor.estadoLlamada().estado === 'hablando', null, { timeout: 45000 });
  await espera(1200);
  const t0 = Date.now(); await A.tap('#b-comprobar');
  const visto = [];
  for (let i = 0; i < 26; i++) { await espera(500); const v = await B.evaluate(() => { const c = document.querySelector('#video-reto'); return c && !c.hidden && c.classList.contains('gesto') ? c.dataset.q + ':' + document.querySelector('#reto-texto').textContent + ' [' + document.querySelector('#reto-etiqueta').textContent + ']' : '-'; }); if (visto[visto.length - 1] !== v) visto.push(v); if (/^(izq|der)/.test(v) && !globalThis.__f) { globalThis.__f = 1; await B.screenshot({ path: '/tmp/g-B-orden.png' }); } }
  console.log('B ve:', visto.join(' | '));
  await A.waitForSelector('#comprobacion-resultado:not([hidden])', { timeout: 40000 });
  console.log('resultado en', Date.now() - t0, 'ms:', (await A.locator('#comprobacion-titulo').innerText()).trim(), '|', (await A.locator('#comprobacion-pct').innerText()).trim(), '|', (await A.locator('#comprobacion-texto').innerText()).trim().slice(0, 90));
  console.log('señales:', (await A.locator('#comprobacion-senales').innerText()).replace(/\n/g, ' · ').slice(0, 300));
  console.log('depura:', JSON.stringify(await A.evaluate(() => window.__comprueba)).slice(0, 600));
  console.log('botón repetir visible:', await A.locator('#comprobacion-giro').isVisible(), '| B tras el fin:', await B.evaluate(() => document.querySelector('#video-reto').hidden));
  await A.screenshot({ path: '/tmp/g-A-resultado.png' });
  console.log('errores', JSON.stringify(err)); await b.close();
})().catch((e) => { console.error('FALLO', e.message.slice(0, 400)); process.exit(1); });
