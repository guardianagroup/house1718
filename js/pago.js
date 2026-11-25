// 1718 · la vuelta del pago (Dodo Payments vuelve aquí con ?license_key=…&payment_id=…&status=…; con varias horas, varias claves
// separadas por comas). Cada clave es un código de 60 minutos: se guarda en este navegador (localStorage «1718-codigos», el mismo que
// usa la conversación) y la pestaña de la conversación, si está abierta, se entera sola y se lo pasa al relé. Nada sale de aquí:
// la página no carga nada de fuera y borra la dirección (con el código y el correo) de la barra y del historial en cuanto la lee.
'use strict';
(() => {
  const CLAVE = '1718-codigos';
  const esCodigo = (s) => typeof s === 'string' && s.length >= 8 && s.length <= 100 && /^[A-Za-z0-9_-]+$/.test(s);
  const T = {
    es: {
      etiqueta: 'PAGO', ok: 'PAGO COMPLETADO', recibido: 'PAGO RECIBIDO', mal: 'PAGO NO COMPLETADO',
      tituloOk: 'Ya tienes tu tiempo.', tituloSin: 'Tu código llega por correo.', tituloMal: 'El pago no se completó.', tituloNada: 'Aquí vuelves después de pagar.', tituloEspera: 'El pago se está procesando.',
      textoOk: (h, m) => (h === 1 ? '1 hora de conversación: 60 minutos.' : h + ' horas de conversación: ' + m + ' minutos.') + ' Han quedado guardados en este navegador.',
      vuelve: 'Si tienes la conversación abierta en otra pestaña, vuelve a ella: el tiempo ya está puesto y podéis seguir hablando.',
      textoSin: 'Dodo Payments te manda el código por correo en unos minutos. Pégalo en 1718, en «¿Ya tienes un código?».',
      textoMal: 'No se ha guardado ningún código. Puedes intentarlo de nuevo desde 1718.',
      textoEspera: 'En cuanto se confirme, Dodo Payments te manda el código por correo. Pégalo en 1718, en «¿Ya tienes un código?».',
      textoNada: (n) => (n ? 'En este navegador hay ' + (n === 1 ? '1 código guardado.' : n + ' códigos guardados.') : 'Al pagar, tu código se guarda aquí y también te llega por correo.'),
      codigosT: (n) => (n === 1 ? 'Tu código (también te llega por correo, como comprobante):' : 'Tus códigos (también te llegan por correo, como comprobante):'),
      copiar: 'Copiar', copiado: 'Copiado', cerrar: 'Volver a la conversación', ir: 'Ir a 1718',
      cerrarNo: 'Cierra esta pestaña y vuelve a la de 1718.',
      nota: 'Los códigos no caducan y quedan unidos a este navegador: no los compartas. Si vas a borrar los datos del navegador, gasta antes el tiempo o escríbenos.',
    },
    en: {
      etiqueta: 'PAYMENT', ok: 'PAYMENT COMPLETE', recibido: 'PAYMENT RECEIVED', mal: 'PAYMENT NOT COMPLETED',
      tituloOk: 'Your time is ready.', tituloSin: 'Your code is on its way by email.', tituloMal: 'The payment was not completed.', tituloNada: 'This is where you land after paying.', tituloEspera: 'Your payment is being processed.',
      textoOk: (h, m) => (h === 1 ? '1 hour of conversation: 60 minutes.' : h + ' hours of conversation: ' + m + ' minutes.') + ' Saved in this browser.',
      vuelve: 'If your conversation is open in another tab, go back to it: the time is already there and you can keep talking.',
      textoSin: 'Dodo Payments will email you the code within a few minutes. Paste it into 1718, under “Already have a code?”.',
      textoMal: 'No code was saved. You can try again from 1718.',
      textoEspera: 'As soon as it is confirmed, Dodo Payments will email you the code. Paste it into 1718, under “Already have a code?”.',
      textoNada: (n) => (n ? 'This browser has ' + (n === 1 ? '1 saved code.' : n + ' saved codes.') : 'When you pay, your code is saved here and also sent to you by email.'),
      codigosT: (n) => (n === 1 ? 'Your code (also emailed to you, as a receipt):' : 'Your codes (also emailed to you, as a receipt):'),
      copiar: 'Copy', copiado: 'Copied', cerrar: 'Back to the conversation', ir: 'Go to 1718',
      cerrarNo: 'Close this tab and go back to the 1718 one.',
      nota: 'Codes do not expire and are tied to this browser: do not share them. If you are going to clear this browser’s data, use your time first or write to us.',
    },
  };
  let lengua = null; try { lengua = localStorage.getItem('elixire-lengua'); } catch (_) {}
  if (lengua !== 'es' && lengua !== 'en') lengua = /^es\b/i.test(navigator.language || '') ? 'es' : 'en';
  const t = T[lengua];
  document.documentElement.lang = lengua;
  const $ = (s) => document.getElementById(s);

  // lo que trae la dirección, y fuera de la barra y del historial
  const q = new URLSearchParams(location.search);
  const claves = [...new Set(q.getAll('license_key').concat(q.getAll('license_keys')).join(',').split(',').map((k) => k.trim()).filter(esCodigo))].slice(0, 40);
  const estado = String(q.get('status') || '').toLowerCase();
  const hubo = q.has('status') || q.has('payment_id') || claves.length > 0;
  if (location.search) { try { history.replaceState(null, '', location.pathname); } catch (_) {} }

  // guardar: los de antes y los nuevos, sin repetir
  let guardados = [];
  try { const x = JSON.parse(localStorage.getItem(CLAVE) || '[]'); guardados = Array.isArray(x) ? x.filter(esCodigo) : []; } catch (_) {}
  if (claves.length) {
    const todos = [...new Set(guardados.concat(claves))].slice(-40);
    try { localStorage.setItem(CLAVE, JSON.stringify(todos)); guardados = todos; } catch (_) {}
  }

  const pon = (id, txt) => { const e = $(id); e.textContent = txt; return e; };
  pon('p-ir', t.ir); pon('p-nota', t.nota); pon('p-cerrar', t.cerrar); pon('p-copiar', t.copiar);
  if (claves.length) {
    const h = claves.length;
    pon('p-etiqueta', t.ok); pon('p-titulo', t.tituloOk); pon('p-texto', t.textoOk(h, h * 60));
    pon('p-vuelve', t.vuelve).hidden = false;
    pon('p-codigos-t', t.codigosT(h));
    const ul = $('p-lista'); for (const k of claves) { const li = document.createElement('li'); li.textContent = k; ul.append(li); }
    $('p-codigos').hidden = false;
    // (esta pestaña la abrió la conversación: al cerrarla, se vuelve a ella; si el navegador no deja cerrarla, se dice cómo)
    const b = $('p-cerrar'); b.hidden = false;
    b.addEventListener('click', () => { try { window.close(); } catch (_) {} setTimeout(() => { if (!window.closed) pon('p-vuelve', t.cerrarNo); }, 300); });
    $('p-ir').classList.add('linea');
  } else if (hubo && /^(failed|cancelled|canceled|declined|expired)$/.test(estado)) {
    pon('p-etiqueta', t.mal); pon('p-titulo', t.tituloMal); pon('p-texto', t.textoMal); document.body.classList.add('mal');
  } else if (hubo && /^(processing|requires_customer_action|requires_payment_method|pending)$/.test(estado)) {
    pon('p-etiqueta', t.recibido); pon('p-titulo', t.tituloEspera); pon('p-texto', t.textoEspera);
  } else if (hubo) {
    pon('p-etiqueta', t.recibido); pon('p-titulo', t.tituloSin); pon('p-texto', t.textoSin);
  } else {
    pon('p-etiqueta', t.etiqueta); pon('p-titulo', t.tituloNada); pon('p-texto', t.textoNada(guardados.length));
  }
  document.title = (claves.length ? t.ok : t.etiqueta).charAt(0) + (claves.length ? t.ok : t.etiqueta).slice(1).toLowerCase() + ' · 1718';
  $('p-copiar').addEventListener('click', async () => {
    const b = $('p-copiar');
    try { await navigator.clipboard.writeText(claves.join('\n')); b.textContent = t.copiado; setTimeout(() => { b.textContent = t.copiar; }, 2000); }
    catch (_) { const r = document.createRange(); r.selectNodeContents($('p-lista')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  });
})();
