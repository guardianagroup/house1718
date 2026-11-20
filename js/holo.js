// Elixire · el holograma de abajo da el color a la roca (dueño, 19:34: «la que le da el color es la parte de abajo del holograma;
// si cambia el color de abajo, cambia la piedra, para que ese efecto se note»). Antes de que la roca pase a obsidiana, la luz del
// suelo y el aro se apagan y se vuelven plata; al volver al hielo, se encienden otra vez en azul. Va un paso por delante de la roca:
// primero cambia la luz de abajo y después el frente sube por la piedra.
'use strict';
(() => {
  let base = null;
  const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  function vuelta() {
    const K = window.__rocaK, suelo = window.__holoSuelo, aro = window.__holoAro;
    if (K && K.nivel && suelo && aro) {
      if (!base) base = { suelo: suelo.clone(), aro: aro.clone(), plata: aro.clone().setRGB(0.93, 0.95, 0.98).multiplyScalar(1.6) };
      const o = suave(-0.25, 0.12, K.nivel.value); // 0: hielo · 1: obsidiana (la luz de abajo cambia antes que la roca)
      suelo.copy(base.suelo).multiplyScalar(1 - 0.78 * o);
      aro.copy(base.aro).lerp(base.plata, o).multiplyScalar(1 - 0.45 * o);
    }
    requestAnimationFrame(vuelta);
  }
  requestAnimationFrame(vuelta);
})();
