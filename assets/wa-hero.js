(function () {
  var href = 'https://wa.me/573239218906?text=' + encodeURIComponent('Hola, quiero una evaluación de HOUSE 1718');
  function place() {
    var d = document.querySelector('.btn-dossier');
    if (!d) return;
    if (d.parentElement && d.parentElement.querySelector('.btn-wa')) return;
    var wrap = d.parentElement && d.parentElement.classList.contains('hero-actions') ? d.parentElement : document.createElement('div');
    if (wrap !== d.parentElement) {
      wrap.className = 'hero-actions';
      d.parentNode.insertBefore(wrap, d);
      wrap.appendChild(d);
    }
    var a = document.createElement('a');
    a.className = 'btn btn-wa';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Escribir por WhatsApp';
    wrap.appendChild(a);
  }
  place();
  [80, 300, 800, 1600, 3000, 5000].forEach(function (ms) { setTimeout(place, ms); });
  try {
    new MutationObserver(place).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
