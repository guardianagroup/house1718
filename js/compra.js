// 1718 · comprar tiempo (dueño, 25 nov 2026, 08:30: «de la forma más simplificada posible, para que la experiencia de compra de la
// persona sea muy fácil»; 08:49: «en la versión del PC y en la versión del móvil también»).
//  · Se paga en Dodo Payments, en otra pestaña: la conversación sigue abierta en esta. Dodo vuelve a pago.html con el código.
//  · Cada código vale 60 minutos de conversación. Se guarda solo en este navegador (localStorage «1718-codigos») y Dodo se lo manda
//    a la persona por correo. pago.html lo guarda; esta pestaña se entera al momento (evento «storage») y el motor se lo pasa al relé.
//  · El relé comprueba cada código con Dodo y lleva la cuenta de los minutos (zero-motor/tiempo.js). Esta página no decide nada:
//    solo guarda los códigos, abre el pago y enseña lo que dice el relé.
'use strict';
(() => {
  const CLAVE = '1718-codigos';
  const PRODUCTO = 'pdt_0NsiZyEoDrhs2W9Rpp0EJ'; // «1718 · 1 hour of calls», 5 USD, una clave de licencia de 60 activaciones por unidad
  const VUELTA = 'https://house1718.com/pago.html';
  const $ = (s) => document.querySelector(s);
  const tr = (k) => (window.ElixireIdioma ? window.ElixireIdioma.t(k) : k);
  const esCodigo = (s) => typeof s === 'string' && s.length >= 8 && s.length <= 100 && /^[A-Za-z0-9_-]+$/.test(s);
  const limpia = (s) => String(s || '').trim().replace(/\s+/g, '');

  // ---------- los códigos de este navegador ----------
  function codigos() { try { const x = JSON.parse(localStorage.getItem(CLAVE) || '[]'); return Array.isArray(x) ? [...new Set(x.filter(esCodigo))] : []; } catch (_) { return []; } }
  function guarda(l) { try { localStorage.setItem(CLAVE, JSON.stringify(l.slice(-40))); return true; } catch (_) { return false; } }
  const avisa = () => { try { dispatchEvent(new Event('elixire-codigos')); } catch (_) {} };
  // añade los que no estén; siempre avisa al motor (así también se vuelve a mirar el saldo de uno que ya estaba)
  function anade(lista) {
    const v = (Array.isArray(lista) ? lista : [lista]).map(limpia).filter(esCodigo); if (!v.length) return 0;
    const ya = codigos(), nuevos = [...new Set(v)].filter((k) => !ya.includes(k));
    if (nuevos.length) guarda(ya.concat(nuevos));
    avisa(); return nuevos.length;
  }
  function quita(lista) { const fuera = new Set(lista || []); const ya = codigos(); const q = ya.filter((k) => !fuera.has(k)); if (q.length !== ya.length) guarda(q); }
  // otra pestaña (pago.html) guardó un código: el motor de esta pestaña se lo pasa al relé
  addEventListener('storage', (e) => { if (e.key === CLAVE) avisa(); });

  // ---------- el pago: un enlace de Dodo (en otra pestaña), con 1 o 5 horas ----------
  const enlace = (horas) => 'https://checkout.dodopayments.com/buy/' + PRODUCTO + '?quantity=' + (horas === 5 ? 5 : 1) + '&redirect_url=' + encodeURIComponent(VUELTA);
  for (const a of document.querySelectorAll('a[data-horas]')) a.href = enlace(+a.dataset.horas);

  // ---------- la ventana de compra (en la conversación) ----------
  const caja = $('#compra');
  const M = window.ElixireMotor;
  let motivo = '', esperando = null, esperaT = 0;
  // (con un dato dentro, sin data-t: al cambiar de idioma no se pierde el dato)
  const pon = (el, k, extra) => { if (!el) return; if (extra) { delete el.dataset.t; el.textContent = tr(k).replace('{m}', extra); } else { el.dataset.t = k; el.textContent = tr(k); } };
  function estadoCodigo(k, extra, bien) { const e = $('#compra-estado'); if (!e) return; e.classList.toggle('bien', !!bien); if (!k) { e.textContent = ''; delete e.dataset.t; return; } pon(e, k, extra); }
  // motivo: 'cortesia' (se acabaron los minutos gratis), 'tiempo' (se acabó lo comprado) o 'mas' (comprar más sin que se haya acabado)
  function abre(m) {
    if (!caja) return;
    motivo = m === 'cortesia' || m === 'tiempo' ? m : 'mas';
    pon($('#compra-titulo'), { cortesia: 'compraTituloCortesia', tiempo: 'compraTituloTiempo', mas: 'compraTituloMas' }[motivo]);
    caja.classList.toggle('sin-tiempo', motivo !== 'mas');
    if (caja.hidden) { estadoCodigo(''); const i = $('#compra-input'); if (i) i.value = ''; }
    caja.hidden = false;
    // (en el ordenador, el foco al primer botón; en el móvil, nada: que no salga el teclado)
    if (!matchMedia('(max-width: 760px)').matches) setTimeout(() => { const b = caja.querySelector('.compra-op'); if (b) b.focus(); }, 60);
  }
  function cierra() { if (caja) caja.hidden = true; esperando = null; clearTimeout(esperaT); }
  if (caja) {
    $('#compra-cerrar').addEventListener('click', cierra);
    caja.addEventListener('click', (e) => { if (e.target === caja) cierra(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !caja.hidden) cierra(); });
    // «Ya tengo un código»: se guarda y el relé dice si vale (lo que conteste llega como «saldo»)
    $('#compra-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const k = limpia($('#compra-input').value);
      if (!esCodigo(k)) { estadoCodigo('codigoFormato'); return; }
      if (!M || !M.conTiempo) { anade([k]); estadoCodigo('codigoGuardado', '', true); return; }
      esperando = k; estadoCodigo('codigoMirando'); anade([k]);
      clearTimeout(esperaT); esperaT = setTimeout(() => { if (esperando === k) { esperando = null; estadoCodigo('codigoSinRed'); } }, 12000);
    });
  }
  // lo que dice el relé de los códigos: los que ya no valen o no tienen minutos se borran de este navegador
  if (M) M.on('saldo', (s) => {
    if (!s || !s.estados) return;
    const fuera = Object.keys(s.estados).filter((k) => s.estados[k] === 'mal' || s.estados[k] === 0); // (los que no valen o ya no tienen minutos)
    if (esperando) {
      const k = esperando, x = s.estados[k];
      if (x === 'mal') { esperando = null; estadoCodigo('codigoMal'); }
      else if (x === 0) { esperando = null; estadoCodigo('codigoGastado'); }
      else if (typeof x === 'number') { esperando = null; estadoCodigo('codigoBien', String(s.minutos || x), true); }
      else if (x === 'espera') { esperando = null; estadoCodigo('codigoEspera'); }
      else if (x === '?') { esperando = null; estadoCodigo('codigoPendiente'); } // (Dodo no contesta: se queda guardado y se mira al usarlo)
      if (!esperando) clearTimeout(esperaT);
    }
    if (fuera.length) quita(fuera);
  });

  window.ElixireCompra = { codigos, anade, quita, enlace, abre, cierra, get abierta() { return !!(caja && !caja.hidden); }, get motivo() { return motivo; } };
})();
