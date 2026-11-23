// Elixire · antes de pintar nada: el idioma de partida es el inglés (dueño, 19 nov 2026, 13:09), salvo que la persona haya
// elegido el español con el botón ES. Mientras idioma.js traduce, los textos no se pintan, para que no parpadee el español.
(function () {
  // al abrir (también al volver a la pestaña o recargar en el iPhone), la página empieza arriba del todo, en su sitio (dueño, 19:18:
  // «al abrir en iPhone la web aparece más arriba y debo tocar la pantalla y arrastrar… que aparezca en su sitio automáticamente»)
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  var arriba = function () { if (!location.hash || /^#(e|c|g|l)=/.test(location.hash)) { try { window.scrollTo(0, 0); } catch (e) {} } };
  window.addEventListener('pageshow', arriba); window.addEventListener('load', function () { arriba(); setTimeout(arriba, 60); });
  var g = null; try { g = localStorage.getItem('elixire-lengua'); } catch (e) {}
  // la invitación por WhatsApp lleva el idioma de quien la manda («#c=…&l=es»), si la persona no ha elegido otro
  var m = /[#&]l=(es|en)\b/.exec(location.hash || '');
  if (!g && m) g = m[1];
  var raiz = document.documentElement;
  raiz.lang = g === 'es' ? 'es' : 'en';
  if (raiz.lang !== 'es') raiz.classList.add('traduciendo');
})();

// En la app del iPhone (pantalla de inicio, barra de estado translúcida), 100vh y 100svh se quedan cortos justo la altura de la barra
// de estado y el botón de la portada quedaba alto (dueño, 22 nov 23:28). En la app, la portada y la roca miden la pantalla entera.
(() => {
  if (navigator.standalone !== true) return;
  const raiz = document.documentElement; let ultimo = 0;
  const mide = () => {
    if (!matchMedia('(max-width:760px)').matches) { raiz.classList.remove('app-ios'); return; }
    const vert = matchMedia('(orientation: portrait)').matches, h = vert ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    raiz.classList.add('app-ios'); if (h === ultimo) return; ultimo = h; raiz.style.setProperty('--alto-app', h + 'px');
    window.dispatchEvent(new Event('resize'));
  };
  mide(); addEventListener('resize', mide); addEventListener('orientationchange', mide);
})();
