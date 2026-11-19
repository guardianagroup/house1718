// Elixire · antes de pintar nada: el idioma de partida es el inglés (dueño, 19 nov 2026, 13:09), salvo que la persona haya
// elegido el español con el botón ES. Mientras idioma.js traduce, los textos no se pintan, para que no parpadee el español.
(function () {
  var g = null; try { g = localStorage.getItem('elixire-lengua'); } catch (e) {}
  // la invitación por WhatsApp lleva el idioma de quien la manda («#c=…&l=es»), si la persona no ha elegido otro
  var m = /[#&]l=(es|en)\b/.exec(location.hash || '');
  if (!g && m) g = m[1];
  var raiz = document.documentElement;
  raiz.lang = g === 'es' ? 'es' : 'en';
  if (raiz.lang !== 'es') raiz.classList.add('traduciendo');
})();
