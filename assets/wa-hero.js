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
    if (!menu.querySelector('a[href="#preopening"]')) {
      var a = el('a', { href: '#preopening' }, 'Pre-Opening');
      var ev = menu.querySelector('a[href="#evaluacion"]');
      if (ev) menu.insertBefore(a, ev);
      else menu.appendChild(a);
    }
    if (!menu.querySelector('.btn-wa-menu')) menu.appendChild(makeLink('btn-wa-menu', 'WhatsApp'));
  }
  function placeSection() {
    if (document.getElementById('preopening')) return;
    var hacemos = document.getElementById('hacemos');
    if (!hacemos || !hacemos.parentNode) return;
    var s = el('section', { class: 'section section-stone', id: 'preopening' });
    s.innerHTML = '<div class="wrap"><p class="eyebrow dark">HOUSE 1718 · Pre-Opening</p><h2>Las decisiones más rentables pueden tomarse antes de abrir.</h2><p class="intro">HOUSE 1718 también acompaña proyectos que todavía no han iniciado actividad y negocios en sus primeros meses.</p><p class="intro muted">Analizamos ubicación, arriendo, competencia, costes, inversión, climatización, capacidad, experiencia, posicionamiento y punto de equilibrio antes de que el cliente comprometa capital o consolide decisiones difíciles de corregir.</p><p class="intro">El objetivo es evitar que una mala decisión inicial se convierta después en un coste estructural.</p><p class="stage-line">Antes de abrir.<br>Al abrir.<br>Cuando ya está funcionando.<br>HOUSE 1718 analiza el negocio en cada etapa.</p><div class="moments"><article class="moment"><h3>Pre-Opening</h3><p class="when">Antes de firmar o invertir.</p><ul><li>Ubicación</li><li>Arriendo</li><li>Competencia</li><li>Público objetivo</li><li>Visibilidad</li><li>Accesos</li><li>Costes fijos</li><li>Inversión inicial</li><li>Climatización</li><li>Servicios</li><li>Capacidad</li><li>Punto de equilibrio</li></ul></article><article class="moment"><h3>Launch</h3><p class="when">Antes y durante la apertura.</p><ul><li>Oferta</li><li>Precios</li><li>Fachada</li><li>Experiencia</li><li>Google Maps</li><li>Reservas</li><li>WhatsApp</li><li>Presencia digital</li><li>Alianzas</li><li>Reputación inicial</li><li>Estrategia de apertura</li></ul></article><article class="moment"><h3>First 90</h3><p class="when">Primeros 90 días.</p><ul><li>Ventas</li><li>Ticket medio</li><li>Horarios</li><li>Clientes</li><li>Reseñas</li><li>Consumo de energía</li><li>Agua</li><li>Gas</li><li>Márgenes</li><li>Incidencias</li><li>Productos o servicios más rentables</li><li>Comportamiento real del negocio</li></ul></article></div><p class="fine">En los primeros 90 días el propósito es corregir rápido, antes de que los problemas se conviertan en hábitos costosos.</p><div class="gonogo"><p class="eyebrow">HOUSE 1718 GO / NO-GO™</p><h3>Un escenario económico antes de comprometer capital.</h3><p>Antes de firmar un arriendo importante o ejecutar una inversión relevante, convertimos supuestos en un escenario económico documentado.</p><div class="verdicts"><span>Avanzar</span><span>Avanzar con condiciones</span><span>Replantear el proyecto</span></div><p>No es una garantía de éxito. HOUSE 1718 reduce incertidumbre, pero no elimina el riesgo empresarial.</p></div><p class="assume intro muted">Cuando el negocio todavía no está operativo, trabajamos con propuesta o contrato de arriendo, presupuesto de inversión, cotizaciones, local candidato, plano, estructura de precios, capacidad prevista, costes fijos estimados y estimaciones conservadoras de demanda. Los supuestos se identifican como supuestos.</p><p class="form-actions" style="margin-top:2rem"><a class="btn btn-dark" href="#evaluacion">Evaluar mi proyecto</a></p></div>';
    hacemos.parentNode.insertBefore(s, hacemos.nextSibling);
    var list = document.querySelector('#negocios .sectors');
    if (list && !/Proyectos en apertura/.test(list.textContent)) {
      var li = document.createElement('li');
      li.textContent = 'Proyectos en apertura';
      var last = list.lastElementChild;
      if (last) list.insertBefore(li, last);
      else list.appendChild(li);
    }
  }
  function place() {
    placeUnderMenu();
    placeInDrawer();
    placeSection();
  }
  place();
  [120, 400, 900, 1800, 3200].forEach(function (ms) { setTimeout(place, ms); });
  try { new MutationObserver(place).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
})();
