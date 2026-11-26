// Elixire · antes de pintar nada. Cada idioma tiene su dirección y llega ya escrito en él (26 nov 2026, SEO; herramientas/seo.py):
// https://www.house1718.com/ en inglés (el idioma de partida, dueño, 19 nov 2026, 13:09) y /es/ en español. Si la persona eligió el
// otro idioma con ES/EN, o la invitación que abre trae el de quien la manda («#…&l=es») y ella no ha elegido, se va en el acto a la
// dirección de ese idioma con todo lo demás igual (?…, #…). Mientras tanto esta página no se pinta ni abre nada (window.ElixireSalta).
(function () {
  // al abrir (también al volver a la pestaña o recargar en el iPhone), la página empieza arriba del todo, en su sitio (dueño, 19:18:
  // «al abrir en iPhone la web aparece más arriba y debo tocar la pantalla y arrastrar… que aparezca en su sitio automáticamente»)
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  var arriba = function () { if (!location.hash || /^#(e|c|g|l)=/.test(location.hash)) { try { window.scrollTo(0, 0); } catch (e) {} } };
  window.addEventListener('pageshow', arriba); window.addEventListener('load', function () { arriba(); setTimeout(arriba, 60); });
  var raiz = document.documentElement;
  var pagina = raiz.getAttribute('data-idioma-pagina') === 'es' ? 'es' : 'en';
  raiz.lang = pagina;
  var g = null; try { g = localStorage.getItem('elixire-lengua'); } catch (e) {}
  if (g !== 'es' && g !== 'en') g = null;
  var m = /[#&]l=(es|en)\b/.exec(location.hash || '');
  var quiere = g || (m ? m[1] : pagina);
  var ruta = function (l) { return l === 'es' ? '/es/' : '/'; };
  // solo desde la portada (no desde una página de pruebas con otro nombre)
  if (quiere === pagina || location.pathname !== ruta(pagina)) return;
  // nunca en bucle: si se acaba de llegar desde la otra dirección y habría que volver a ella, se queda aquí
  var antes = null; try { antes = JSON.parse(sessionStorage.getItem('elixire-salto') || 'null'); } catch (e) {}
  if (antes && antes.de === ruta(quiere) && Date.now() - antes.t < 8000) return;
  try { sessionStorage.setItem('elixire-salto', JSON.stringify({ de: location.pathname, t: Date.now() })); } catch (e) {}
  var destino = ruta(quiere) + location.search + location.hash;
  window.ElixireSalta = destino;
  raiz.classList.add('saltando');
  location.replace(destino);
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
