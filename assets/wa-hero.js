(function () {
  var btn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      menu.hidden = open;
      btn.textContent = open ? 'Menú' : 'Cerrar';
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        btn.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
        btn.textContent = 'Menú';
      });
    });
  }
  window.addEventListener('scroll', function () {
    var header = document.getElementById('header');
    if (header) header.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });
  document.querySelectorAll('#evaluacion form, form[name="house1718-evaluacion"]').forEach(function (f) { f.remove(); });
})();
