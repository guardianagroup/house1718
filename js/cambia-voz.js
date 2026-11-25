// 1718 · cambiar la voz (22 nov 2026; dueño, 21:03: «un botón para cambiar la voz»). Procesador de audio (AudioWorklet) que baja el
// tono de la voz en el propio equipo, antes de encriptarla y enviarla: la otra persona oye una voz distinta y nada sale del equipo
// sin cambiar.
// 25 nov 2026 (dueño, 11:40: «la voz sí se cambia, pero no se escucha bien… demasiado ruido»; «la típica voz de película, de la que
// pone el malo, que da miedo»): el método de antes (dos lecturas con retardo variable) temblaba y metía ruido, sobre todo una octava
// por debajo. Ahora es un vocoder de fase, el método de los estudios: cada 512 muestras se mira el espectro de los últimos 2048
// (FFT con ventana de Hann), se lleva cada frecuencia a su nueva altura conservando su fase y se vuelve a montar la onda. Además:
// una puerta suave que baja el ruido de fondo cuando no se habla (para que no suba con todo lo demás) y una segunda voz, una octava
// más grave y solo con los graves, que da el cuerpo del «malo». Sin modelos ni servidores. Misma licencia que el resto (AGPL-3.0).
'use strict';
class CambiaVoz extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'tono', defaultValue: 0.7, minValue: 0.5, maxValue: 2, automationRate: 'k-rate' }]; }
  constructor(opciones) {
    super();
    const o = (opciones && opciones.processorOptions) || {};
    this.sub = +o.sub || 0;                        // la segunda voz (0,5 = una octava por debajo); 0, sin ella
    this.subNivel = o.subNivel != null ? +o.subNivel : 0.3;
    this.subCorte = +o.subCorte || 520;            // de la segunda voz, solo lo que quede por debajo de esto (Hz)
    this.puerta = o.puerta !== false;
    const N = sampleRate > 30000 ? 2048 : 1024, osamp = 4;
    this.N = N; this.osamp = osamp; this.paso = N / osamp; this.mitad = N / 2;
    this.entrada = new Float32Array(N); this.salida = new Float32Array(N); this.acum = new Float32Array(2 * N);
    this.rover = N - this.paso; // retardo: N - paso muestras (unos 32 ms)
    this.ventana = new Float32Array(N); for (let i = 0; i < N; i++) this.ventana[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    this.re = new Float64Array(N); this.im = new Float64Array(N);
    this.faseAnt = new Float64Array(this.mitad + 1);
    this.capas = [this.capa(), this.capa()]; // la voz principal y la segunda voz
    this.mag = new Float64Array(this.mitad + 1); this.frec = new Float64Array(this.mitad + 1);
    // la FFT: tablas de giro y de inversión de bits
    this.cosT = new Float64Array(N / 2); this.sinT = new Float64Array(N / 2);
    for (let i = 0; i < N / 2; i++) { this.cosT[i] = Math.cos(2 * Math.PI * i / N); this.sinT[i] = Math.sin(2 * Math.PI * i / N); }
    this.inv = new Uint32Array(N); const bits = Math.log2(N);
    for (let i = 0; i < N; i++) { let x = i, r = 0; for (let b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; } this.inv[i] = r; }
    // la puerta: sigue el nivel de la voz (sube en 2 ms, baja en 40 ms); abre en cuanto se habla, se queda abierta 150 ms tras cada
    // sílaba (no corta entre palabras) y, cuando solo hay ruido, baja hasta -26 dB poco a poco (60 ms, sin chasquidos)
    this.nivel = 0.003; this.ganPuerta = 1; this.abierta = true; this.quedan = 0; this.espera = Math.round(0.15 * sampleRate);
    this.subeK = Math.exp(-1 / (0.002 * sampleRate)); this.bajaK = Math.exp(-1 / (0.04 * sampleRate));
    this.abrirK = Math.exp(-1 / (0.004 * sampleRate)); this.cerrarK = Math.exp(-1 / (0.06 * sampleRate));
    this.abre = Math.pow(10, -40 / 20); this.cierra = Math.pow(10, -50 / 20); this.suelo = Math.pow(10, -26 / 20);
    // el ruido de fondo de la sala, medido sobre la marcha: el nivel más bajo de los últimos 3 s (en tramos de 100 ms). La puerta abre
    // 20 dB por encima y cierra a 10 dB (nunca por encima de -30 dB, para no comerse la voz): también funciona en un sitio con ruido
    this.tramo = Math.round(0.1 * sampleRate); this.cuenta = 0; this.minTramo = 1; this.minimos = new Float32Array(30).fill(1); this.iMin = 0;
    this.ruido = Math.pow(10, -60 / 20);
  }
  capa() { return { mag: new Float64Array(this.mitad + 1), frec: new Float64Array(this.mitad + 1), suma: new Float64Array(this.mitad + 1) }; }
  fft(re, im, inversa) {
    const N = this.N, inv = this.inv;
    for (let i = 0; i < N; i++) { const j = inv[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    const s = inversa ? -1 : 1;
    for (let tam = 2; tam <= N; tam <<= 1) {
      const medio = tam >> 1, salto = N / tam;
      for (let i = 0; i < N; i += tam) {
        for (let j = 0, k = 0; j < medio; j++, k += salto) {
          const c = this.cosT[k], sn = -s * this.sinT[k];
          const a = i + j, b = a + medio;
          const xr = re[b] * c - im[b] * sn, xi = re[b] * sn + im[b] * c;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        }
      }
    }
  }
  // lleva el espectro analizado (mag, frec) a otra altura, con su propia fase acumulada, y lo suma a (re, im)
  monta(capa, factor, nivel, corte) {
    const M = this.mitad, porBin = sampleRate / this.N, esperado = 2 * Math.PI * this.paso / this.N, os = this.osamp;
    capa.mag.fill(0); capa.frec.fill(0);
    for (let k = 0; k <= M; k++) {
      const d = Math.round(k * factor); if (d > M) break;
      const f = this.frec[k] * factor; if (corte && f > corte) continue;
      capa.mag[d] += this.mag[k] * nivel; capa.frec[d] = f;
    }
    for (let k = 0; k <= M; k++) {
      let t = capa.frec[k] / porBin - k; t = 2 * Math.PI * t / os; t += k * esperado;
      capa.suma[k] += t; const ph = capa.suma[k], m = capa.mag[k];
      this.re[k] += m * Math.cos(ph); this.im[k] += m * Math.sin(ph);
    }
  }
  trama(factor) {
    const N = this.N, M = this.mitad, porBin = sampleRate / N, esperado = 2 * Math.PI * this.paso / N, os = this.osamp;
    const re = this.re, im = this.im;
    for (let k = 0; k < N; k++) { re[k] = this.entrada[k] * this.ventana[k]; im[k] = 0; }
    this.fft(re, im, false);
    for (let k = 0; k <= M; k++) {
      const a = re[k], b = im[k], mag = 2 * Math.sqrt(a * a + b * b), fase = Math.atan2(b, a);
      let t = fase - this.faseAnt[k]; this.faseAnt[k] = fase;
      t -= k * esperado; let q = Math.trunc(t / Math.PI); if (q >= 0) q += q & 1; else q -= q & 1; t -= Math.PI * q;
      t = os * t / (2 * Math.PI);
      this.mag[k] = mag; this.frec[k] = (k + t) * porBin;
    }
    re.fill(0); im.fill(0);
    this.monta(this.capas[0], factor, 1, 0);
    if (this.sub > 0 && this.subNivel > 0) this.monta(this.capas[1], this.sub, this.subNivel, this.subCorte);
    for (let k = M + 1; k < N; k++) { re[k] = 0; im[k] = 0; }
    this.fft(re, im, true);
    const g = 2 / (M * os);
    for (let k = 0; k < N; k++) this.acum[k] += this.ventana[k] * re[k] * g;
    for (let k = 0; k < this.paso; k++) this.salida[k] = this.acum[k];
    this.acum.copyWithin(0, this.paso, this.paso + N); this.acum.fill(0, N);
    this.entrada.copyWithin(0, this.paso, N);
  }
  process(entradas, salidas, params) {
    const ent = entradas[0], sal = salidas[0]; if (!sal || !sal.length) return true;
    const x = ent && ent[0], y = sal[0], N = this.N, lat = N - this.paso;
    const factor = Math.min(2, Math.max(0.5, params.tono[0]));
    for (let i = 0; i < y.length; i++) {
      let v = x ? x[i] : 0;
      if (this.puerta) {
        const a = Math.abs(v); this.nivel = a > this.nivel ? this.subeK * this.nivel + (1 - this.subeK) * a : this.bajaK * this.nivel + (1 - this.bajaK) * a;
        if (this.nivel < this.minTramo) this.minTramo = this.nivel;
        if (++this.cuenta >= this.tramo) {
          this.cuenta = 0; this.minimos[this.iMin] = this.minTramo; this.iMin = (this.iMin + 1) % this.minimos.length; this.minTramo = 1;
          let m = 1; for (let j = 0; j < this.minimos.length; j++) if (this.minimos[j] < m) m = this.minimos[j]; this.ruido = Math.max(m, 3e-4);
        }
        const abre = Math.min(Math.max(this.abre, this.ruido * 10), 0.0316), cierra = Math.min(Math.max(this.cierra, this.ruido * 3.2), abre * 0.5);
        if (this.nivel >= abre) { this.abierta = true; this.quedan = this.espera; } else if (this.quedan > 0) this.quedan--; else if (this.nivel <= cierra) this.abierta = false;
        const obj = this.abierta ? 1 : this.suelo, k = obj > this.ganPuerta ? this.abrirK : this.cerrarK;
        this.ganPuerta = k * this.ganPuerta + (1 - k) * obj; v *= this.ganPuerta;
      }
      this.entrada[this.rover] = v;
      y[i] = this.salida[this.rover - lat];
      if (++this.rover >= N) { this.rover = lat; this.trama(factor); }
    }
    for (let c = 1; c < sal.length; c++) sal[c].set(y);
    return true;
  }
}
registerProcessor('cambia-voz', CambiaVoz);
