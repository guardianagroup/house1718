// Elixire · antes de pintar nada: el idioma de partida es el inglés (dueño, 19 nov 2026, 13:09), salvo que la persona haya
// elegido el español con el botón ES. Mientras idioma.js traduce, los textos no se pintan, para que no parpadee el español.
(function () {
  var g = null; try { g = localStorage.getItem('elixire-lengua'); } catch (e) {}
  var raiz = document.documentElement;
  raiz.lang = g === 'es' ? 'es' : 'en';
  if (raiz.lang !== 'es') raiz.classList.add('traduciendo');
})();
