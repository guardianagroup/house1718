const menuBtn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");
menuBtn.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  menu.hidden = !open;
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.textContent = open ? "Cerrar" : "Menú";
  document.body.style.overflow = open ? "hidden" : "";
});
menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => {
  menu.classList.remove("open");
  menu.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.textContent = "Menú";
  document.body.style.overflow = "";
}));
if (matchMedia("(min-width: 960px)").matches) {
  document.getElementById("topCta").style.display = "inline-flex";
}

const fmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const money = (n) => "$" + fmt.format(n) + " M";
const presets = {
  Hotel: { el: 1200, wa: 240, ga: 60, elp: 15, wap: 25, gap: 10 },
  Restaurante: { el: 420, wa: 90, ga: 80, elp: 12, wap: 18, gap: 12 },
  Residencia: { el: 180, wa: 40, ga: 20, elp: 10, wap: 15, gap: 8 },
  Oficina: { el: 260, wa: 30, ga: 12, elp: 14, wap: 10, gap: 6 },
  Clínica: { el: 380, wa: 55, ga: 25, elp: 10, wap: 12, gap: 8 },
  Comercio: { el: 220, wa: 35, ga: 18, elp: 12, wap: 12, gap: 8 }
};
const box = document.getElementById("presets");
Object.keys(presets).forEach((name) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = name;
  if (name === "Hotel") b.classList.add("on");
  b.addEventListener("click", () => applyPreset(name));
  box.appendChild(b);
});
function applyPreset(name) {
  const p = presets[name];
  el.value = p.el; wa.value = p.wa; ga.value = p.ga;
  elp.value = p.elp; wap.value = p.wap; gap.value = p.gap;
  box.querySelectorAll("button").forEach((btn) => btn.classList.toggle("on", btn.textContent === name));
  render();
}
["el","wa","ga","elp","wap","gap"].forEach((id) => document.getElementById(id).addEventListener("input", render));
function render() {
  const E = +el.value || 0, W = +wa.value || 0, G = +ga.value || 0;
  const ep = +elp.value, wp = +wap.value, gp = +gap.value;
  elpv.textContent = ep + " %";
  wapv.textContent = wp + " %";
  gapv.textContent = gp + " %";
  const before = E + W + G;
  const after = E * (1 - ep / 100) + W * (1 - wp / 100) + G * (1 - gp / 100);
  const save = before - after;
  t0.textContent = money(before);
  t1.textContent = money(after);
  t2.textContent = money(save);
  t3.textContent = before ? (100 * save / before).toFixed(1).replace(".", ",") + " %" : "0 %";
  ambitious.style.display = (ep > 25 || wp > 25 || gp > 25) ? "block" : "none";
}
render();

document.getElementById("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const lines = [
    "Evaluación inicial HOUSE 1718",
    "Nombre: " + f.nombre.value,
    "Organización: " + f.org.value,
    "Negocio: " + f.tipo.value,
    "Ciudad: " + f.ciudad.value,
    "Teléfono: " + f.tel.value,
    "Nota: " + f.nota.value
  ].join("\n");
  const mail = "mailto:contacto@house1718.com?subject=" + encodeURIComponent("Evaluación inicial") + "&body=" + encodeURIComponent(lines);
  const wa = "https://wa.me/573239218906?text=" + encodeURIComponent(lines);
  formNote.innerHTML = 'Mensaje preparado. Abrir <a href="' + mail + '">correo</a> o <a href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a>.';
  window.location.href = mail;
});
