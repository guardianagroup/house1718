// Elixire · cambiar la voz (22 nov 2026; dueño, 21:03: «un botón para cambiar la voz»). Procesador de audio (AudioWorklet) que baja
// o sube el tono de la voz en el propio equipo, antes de encriptarla y enviarla: la otra persona oye una voz distinta y nada sale del
// equipo sin cambiar. Método clásico de dos lecturas con retardo variable y fundido entre ellas (sin modelos ni servidores): el retardo
// crece o decrece a un ritmo fijo, lo que cambia el tono; dos lecturas desfasadas medio ciclo, con ventana seno, evitan los saltos.
// Misma licencia que el resto del código (AGPL-3.0).
'use strict';
class CambiaVoz extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'tono', defaultValue: 0.78, minValue: 0.5, maxValue: 2, automationRate: 'k-rate' }]; }
  constructor() {
    super();
    this.ventana = Math.round(sampleRate * 0.05); // 50 ms
    this.buf = new Float32Array(this.ventana * 4); this.pos = 0; this.fase = 0;
  }
  lee(retardo) {
    const n = this.buf.length; let p = this.pos - retardo; while (p < 0) p += n;
    const i = Math.floor(p), f = p - i, a = this.buf[i % n], b = this.buf[(i + 1) % n];
    return a + (b - a) * f;
  }
  process(entradas, salidas, params) {
    const ent = entradas[0], sal = salidas[0]; if (!sal || !sal.length) return true;
    const x = ent && ent[0], y = sal[0], W = this.ventana, paso = (1 - params.tono[0]) / W, n = this.buf.length;
    for (let k = 0; k < y.length; k++) {
      this.buf[this.pos] = x ? x[k] : 0;
      this.fase += paso; if (this.fase >= 1) this.fase -= 1; else if (this.fase < 0) this.fase += 1;
      const f2 = (this.fase + 0.5) % 1;
      const w1 = Math.sin(Math.PI * this.fase), w2 = Math.sin(Math.PI * f2); // seno² + coseno² = 1: sin altibajos de volumen
      y[k] = this.lee(this.fase * W + 1) * w1 * w1 + this.lee(f2 * W + 1) * w2 * w2;
      this.pos = (this.pos + 1) % n;
    }
    for (let c = 1; c < sal.length; c++) sal[c].set(y);
    return true;
  }
}
registerProcessor('cambia-voz', CambiaVoz);
