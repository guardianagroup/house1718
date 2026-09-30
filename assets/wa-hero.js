(function () {
  var href = 'https://wa.me/573239218906?text=' + encodeURIComponent('Hola, quiero una evaluación de HOUSE 1718');

  function makeLink(className, label) {
    var a = document.createElement('a');
    a.className = className;
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    return a;
  }

  function placeUnderMenu() {
    var menuBtn = document.querySelector('.menu-btn');
    if (!menuBtn) return;
    var parent = menuBtn.parentElement;
    if (!parent) return;
    var wrap = parent.querySelector('.header-wa');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'header-wa';
      parent.insertBefore(wrap, menuBtn);
      wrap.appendChild(menuBtn);
    }
    if (!wrap.querySelector('.btn-wa-nav')) {
      wrap.appendChild(makeLink('btn-wa-nav', 'WhatsApp'));
    }
  }

  function placeInDrawer() {
    var menu = document.getElementById('menu');
    if (!menu || menu.querySelector('.btn-wa-menu')) return;
    menu.appendChild(makeLink('btn-wa-menu', 'WhatsApp'));
  }

  function placeHero() {
    var d = document.querySelector('.btn-dossier');
    if (!d) return;
    if (d.parentElement && d.parentElement.querySelector('.btn-wa')) return;
    var wrap = d.parentElement && d.parentElement.classList.contains('hero-actions') ? d.parentElement : document.createElement('div');
    if (wrap !== d.parentElement) {
      wrap.className = 'hero-actions';
      d.parentNode.insertBefore(wrap, d);
      wrap.appendChild(d);
    }
    wrap.appendChild(makeLink('btn btn-wa', 'Escribir por WhatsApp'));
  }

  function place() {
    placeUnderMenu();
    placeInDrawer();
    placeHero();
  }

  place();
  [80, 300, 800, 1600, 3000, 5000].forEach(function (ms) { setTimeout(place, ms); });
  try {
    new MutationObserver(place).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
