// 1718 · la sala en 3D, solo donde se puede dibujar de verdad (revisión de velocidad, 25 nov 2026, 23:45; dueño: «que pase las
// pruebas de velocidad… que la web sea muy fluida»).
// Sin tarjeta gráfica (WebGL por software: SwiftShader, llvmpipe…), la escena bloqueaba el procesador más de 10 segundos y la página
// iba a tirones. Ahí se queda la puerta en CSS, la de siempre sin WebGL, y ni siquiera se descargan los 877 KB de three.js. Con tarjeta
// gráfica, todo igual que antes: la escena se pide ya (para que llegue pronto) y arranca cuando la página está lista, como hasta ahora.
// (pruebas: ?3d=si fuerza la escena; ?3d=no, la puerta en CSS)
'use strict';
(() => {
  if (window.ElixireSalta) return; // (la página se va a la dirección de su idioma: js/idioma-inicio.js)
  const forzado = (/[?&]3d=(si|no)\b/.exec(location.search) || [])[1];
  let puede = false;
  if (forzado) puede = forzado === 'si';
  else {
    try {
      const c = document.createElement('canvas');
      // «failIfMajorPerformanceCaveat»: el navegador no da contexto si tendría que dibujar sin la tarjeta gráfica
      const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
      if (gl) {
        let r = '';
        try { const x = gl.getExtension('WEBGL_debug_renderer_info'); if (x) r = String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL) || ''); } catch (_) {}
        puede = !/SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(r);
        try { const p = gl.getExtension('WEBGL_lose_context'); if (p) p.loseContext(); } catch (_) {}
      }
    } catch (_) { puede = false; }
  }
  const plantilla = document.getElementById('carga-3d');
  if (!puede || !plantilla) { document.body.classList.add('sin-3d'); return; }
  // la escena se pide ya, con su huella (la misma que lleva el script de la plantilla)…
  const s = plantilla.content.querySelector('script');
  if (s) {
    const l = document.createElement('link');
    l.rel = 'modulepreload'; l.href = s.getAttribute('src'); l.integrity = s.getAttribute('integrity') || '';
    document.head.append(l);
  }
  // …y arranca cuando la página ya está pintada y los demás scripts han corrido, como cuando iba en el HTML
  const arranca = () => document.body.append(document.importNode(plantilla.content, true));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arranca, { once: true });
  else arranca();
})();
