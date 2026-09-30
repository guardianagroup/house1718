(function () {
  var href = 'https://wa.me/573239218906?text=' + encodeURIComponent('Hola, quiero una evaluación de HOUSE 1718');
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html) n.innerHTML = html;
    return n;
  }
  function makeLink(className, label) {
    return el('a', { class: className, href: href, target: '_blank', rel: 'noopener noreferrer' }, label);
  }
  function toWhatsApp(node) {
    if (!node) return;
    node.setAttribute('href', href);
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
    if (/evaluaci|proyecto/i.test(node.textContent || '')) node.textContent = 'WhatsApp';
  }
  function stripForm() {
    document.querySelectorAll('#evaluacion form, form[name="house1718-evaluacion"]').forEach(function (f) { f.remove(); });
    document.querySelectorAll('a[href="#evaluacion"]').forEach(toWhatsApp);
    var cta = document.querySelector('#evaluacion .form-actions a, a[href="#evaluacion"]');
    document.querySelectorAll('a.btn-header').forEach(toWhatsApp);
    var box = document.querySelector('#evaluacion .wrap');
    if (box && !box.querySelector('.btn-wa-eval')) {
      var p = el('p', { class: 'form-actions' });
      var a = makeLink('btn btn-dark btn-wa-eval', 'Escribir por WhatsApp');
      p.appendChild(a);
      box.appendChild(p);
    }
  }
  function placeUnderMenu() {
    var menuBtn = document.querySelector('.menu-btn');
    if (!menuBtn) return;
    var parent = menuBtn.parentElement;
    if (!parent) return;
    var wrap = parent.querySelector('.header-wa');
    if (!wrap) {
      wrap = el('div', { class: 'header-wa' });
      parent.insertBefore(wrap, menuBtn);
      wrap.appendChild(menuBtn);
    }
    if (!wrap.querySelector('.btn-wa-nav')) wrap.appendChild(makeLink('btn-wa-nav', 'WhatsApp'));
  }
  function placeInDrawer() {
    var menu = document.getElementById('menu');
    if (!menu) return;
    if (!menu.querySelector('.btn-wa-menu')) menu.appendChild(makeLink('btn-wa-menu', 'WhatsApp'));
  }
  function placeHero() {
    var d = document.querySelector('.btn-dossier');
    if (!d) return;
    var wrap = d.parentElement;
    if (!wrap) return;
    if (!wrap.querySelector('.btn-wa')) {
      if (!wrap.classList.contains('hero-actions')) {
        var w = el('div', { class: 'hero-actions' });
        d.parentNode.insertBefore(w, d);
        w.appendChild(d);
        wrap = w;
      }
      wrap.appendChild(makeLink('btn btn-wa', 'WhatsApp'));
    }
  }
  function place() {
    stripForm();
    placeUnderMenu();
    placeInDrawer();
    placeHero();
  }
  place();
  [80, 300, 800, 1600, 3000].forEach(function (ms) { setTimeout(place, ms); });
  try { new MutationObserver(place).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
})();
