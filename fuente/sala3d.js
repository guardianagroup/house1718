// Elixire · la sala y la roca (19 nov 2026).
// Dueño: «prefiero un monolito tipo roca, pero negro obsidiana de ese brillante ultra realista» (12:46); «necesito más realidad en el
// monolito» (13:00); «que la habitación sea un poco más ancha… mucha más calidad en el decorado… que se note el acero pulido, los
// detalles, todo. La lámpara de arriba… a máxima calidad» (13:02); «se ve muy larga… quiero que se vea ancha» (13:15).
// Una sala ancha y poco profunda de hormigón visto, en paneles con sus juntas y los agujeros de los tensores; una junta de luz a la
// altura de los ojos que da la vuelta a la sala; zócalo, aletas y peana de acero pulido; suelo de piedra negra pulida en grandes
// losas; y en el techo, la luminaria: un cajón empotrado de acero pulido con su difusor y sus lamas. Sobre la peana flota una roca de
// obsidiana tallada; al pulsar, se parte en dos por una fisura de luz. three.js (MIT), servido desde este dominio; sin WebGL queda el
// monolito en CSS (puerta.js no cambia).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const lienzo = document.getElementById('lienzo3d');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
// móviles y tabletas: menos resolución en texturas, reflejos y sombras
const ligero = matchMedia('(pointer: coarse)').matches;
// en pruebas (?real), el tiempo de la animación es el del reloj aunque el equipo dibuje pocos cuadros por segundo
const DT_MAX = /[?&]real\b/.test(location.search) ? 1 : 0.05;

function arranca() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: false, powerPreference: 'high-performance' }); } catch (_) { return null; }
  if (!renderer.getContext()) return null;
  // Calidad según el equipo (dueño, 15:13: «tiene muchísimo lag… que funcione en cualquier tipo de dispositivo, de última generación
  // o de bajos recursos»). 2: ordenador; 1: móvil o tableta; 0: equipo modesto (poca memoria, pocos núcleos o una gráfica sencilla).
  // En los niveles 1 y 0, sin luces de área (cuestan en cada píxel: queda la luz horneada), sin antialiasing por muestras y con el
  // espejo del suelo a menos resolución; en el 0, además, sin resplandor y a 30 cuadros por segundo. Y en todos, la resolución se
  // ajusta sola al ritmo real de cuadros (abajo, «calidad»).
  const gl = renderer.getContext();
  let gpu = ''; try { const x = gl.getExtension('WEBGL_debug_renderer_info'); if (x) gpu = String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL) || ''); } catch (_) {}
  const esIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const modesto = (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) || (!esIOS && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) ||
    /Mali-(4|T|G(31|51|52|57|68|71|72|76)\b)|Adreno[^0-9]*([1-5]\d\d|6[01]\d)\b|PowerVR|SwiftShader|llvmpipe|softpipe/i.test(gpu);
  const pedida = /[?&]calidad=([012])\b/.exec(location.search);
  const NIVEL = pedida ? +pedida[1] : modesto ? 0 : ligero || esIOS ? 1 : 2;
  const PR_MAX = Math.min(devicePixelRatio || 1, [1, 1.5, 2][NIVEL]), PR_MIN = Math.min(PR_MAX, [0.6, 0.75, 1][NIVEL]);
  let PR = PR_MAX;
  renderer.setPixelRatio(PR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  RectAreaLightUniformsLib.init();
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x05070a);
  escena.fog = new THREE.Fog(0x05070a, 11, 28);
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environmentIntensity = 0.05;

  const camara = new THREE.PerspectiveCamera(44, 1, 0.05, 80);
  const CAM = { x: 0, y: 1.5, z: 5.4 };

  // ---------------- medidas (metros) ----------------
  // (dueño, 16:06: «el efecto de la pared, súbelo hasta arriba… que no tengamos cabecera ni nada… todo pared»: la sala, más alta;
  // el techo queda fuera de la imagen y ELIXIRE y el idioma flotan sobre el muro)
  const AN = 12, AL = 8, FONDO = -5.2, FRENTE = 7.6; // ancho, alto, pared del fondo y pared de delante (detrás de quien mira)
  const LARGO = FRENTE - FONDO, ZM = (FRENTE + FONDO) / 2;
  const PX = 2.4, PY = 1.5; // paneles del encofrado
  const Y_LINEA = 1.5; // la junta de luz, a la altura de los ojos (coincide con la junta entre paneles)
  const ZOC = 0.1; // zócalo de acero
  const ANCHO = 1.3, ALTO = 2.45, PROF = 1.0, Y0 = 2.1, Z0 = -2.0; // la roca
  const LX = 5.6, LZ = 1.5, LH = 0.42, LZC = -3.0; // la luminaria: ancho, fondo, profundidad del cajón y su centro

  let sem = 20261119;
  const az = () => { sem = (sem + 0x6d2b79f5) | 0; let t = Math.imul(sem ^ (sem >>> 15), 1 | sem); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const gau = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
  const lienzo2d = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

  // ---------------- hormigón visto ----------------
  // Dos por dos paneles de encofrado (4,8 × 3 m): cada vertido con su tono, poros, manchas suaves del fraguado, las juntas entre
  // paneles y seis agujeros de tensor por panel, tapados con mortero, como el hormigón de Tadao Ando. La misma textura da el relieve:
  // lo oscuro (juntas, agujeros, poros) queda hundido.
  function texHormigon() {
    const W = [768, 1024, 2048][NIVEL], H = Math.round((W * 3) / 4.8), k = W / 4.8; // k: píxeles por metro
    const [c, g] = lienzo2d(W, H);
    g.fillStyle = 'rgb(118,122,127)'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const d = (az() - 0.5) * 16; g.fillStyle = d > 0 ? `rgba(255,255,255,${d / 150})` : `rgba(0,0,0,${-d / 150})`;
      g.fillRect((i * W) / 2, (j * H) / 2, W / 2, H / 2);
    }
    g.filter = `blur(${Math.round(k * 0.1)}px)`;
    for (let n = 0; n < 110; n++) {
      const a = az() * 0.055, r = k * (0.12 + az() * 0.65);
      g.fillStyle = az() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(12,14,16,${a})`;
      g.beginPath(); g.ellipse(az() * W, az() * H, r * (0.7 + az()), r * (0.4 + az() * 0.6), az() * 3.14, 0, 6.283); g.fill();
    }
    g.filter = 'none';
    const s = W / 2048;
    for (let n = 0; n < [1600, 2600, 9000][NIVEL]; n++) {
      const r = (0.5 + az() * az() * 2.6) * s; g.fillStyle = `rgba(38,42,46,${0.16 + az() * 0.42})`;
      g.beginPath(); g.arc(az() * W, az() * H, r, 0, 6.283); g.fill();
    }
    const im = g.getImageData(0, 0, W, H);
    for (let i = 0; i < im.data.length; i += 4) { const n = (az() - 0.5) * 9; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; }
    g.putImageData(im, 0, 0);
    // juntas: la lechada que se escapa oscurece un poco el borde; en medio, la ranura
    const junta = (x0, y0, x1, y1) => {
      g.strokeStyle = 'rgba(28,31,35,.13)'; g.lineWidth = k * 0.06; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = 'rgba(20,23,26,.92)'; g.lineWidth = Math.max(2, k * 0.008); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    };
    for (const x of [0, W / 2, W]) junta(x, 0, x, H);
    for (const y of [0, H / 2, H]) junta(0, y, W, y);
    // agujeros de los tensores
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (const fx of [1 / 6, 3 / 6, 5 / 6]) for (const fy of [1 / 4, 3 / 4]) {
      const x = ((i + fx) * W) / 2, y = ((j + fy) * H) / 2, r = k * 0.017;
      g.fillStyle = 'rgba(255,255,255,.09)'; g.beginPath(); g.arc(x, y + r * 0.3, r * 1.4, 0, 6.283); g.fill();
      g.fillStyle = 'rgb(62,66,71)'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(18,20,23,.6)'; g.beginPath(); g.arc(x, y - r * 0.18, r * 0.78, 0, 6.283); g.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO;
    return t;
  }
  const hormigon = texHormigon();

  // luz «horneada» sobre el hormigón (la que las luces de área no dan): la junta de luz lava el muro hacia arriba y hacia abajo, la
  // línea del zócalo, el bañador del fondo desde el techo, el reflejo de la luminaria detrás de la roca y la penumbra de los rincones.
  // Una textura por paramento, en el segundo juego de coordenadas (uv1).
  function mapaLuz(n, m, f) {
    const [c, g] = lienzo2d(n, m), im = g.createImageData(n, m);
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const v = Math.min(1, f((i + 0.5) / n, 1 - (j + 0.5) / m) / 1.7), k = (j * n + i) * 4;
      const e = Math.pow(v, 1 / 2.2) * 255; // en sRGB, para que los degradados oscuros no hagan escalones
      im.data[k] = e * 0.95; im.data[k + 1] = e * 0.98; im.data[k + 2] = e; im.data[k + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.channel = 1; return t;
  }
  const rincon = (d) => 1 - 0.42 * Math.exp(-Math.max(d, 0) / 0.55);
  // (dueño, 15:57: «quita las líneas, todas; así se verá mejor el holograma»: sin las juntas de luz, el muro solo recibe una luz suave
  // y difusa; la luz de verdad es la del holograma)
  const perfil = (y) => 0.13 + 0.17 * gau(y, 2.6, 2.4) + 0.05 * gau(y, ZOC + 0.03, 0.25);
  function luzMuro(x, y, z, cual) {
    if (cual === 'fondo') return (perfil(y) + 0.1 * Math.exp(-(AL - y) / 1.1) + 0.3 * gau(x, 0, 2.1) * gau(y, 2.2, 1.2)) * rincon(AN / 2 - Math.abs(x));
    if (cual === 'frente') return perfil(y) * rincon(AN / 2 - Math.abs(x));
    return (perfil(y) + 0.14 * gau(z, LZC, 3.2) * (y / AL) + 0.1 * Math.exp(-(AL - y) / 1.2) * gau(z, FONDO, 1.2)) * rincon(z - FONDO) * rincon(FRENTE - z);
  }
  function luzTecho(x, z) {
    const qx = Math.abs(x) - LX / 2, qz = Math.abs(z - LZC) - LZ / 2, d = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
    return (0.05 + 0.1 * Math.exp(-d / 1.2) + 0.08 * Math.exp(-Math.max(z - FONDO - 0.22, 0) / 0.6)) * rincon(AN / 2 - Math.abs(x)) * rincon(z - FONDO) * rincon(FRENTE - z);
  }
  const matHormigon = (luz, tono) => new THREE.MeshStandardMaterial({ map: hormigon, bumpMap: NIVEL ? hormigon : null, bumpScale: 1.4, color: tono || 0xffffff, roughness: 0.8, metalness: 0, lightMap: luz, lightMapIntensity: [1.3, 1.15, 0.95][NIVEL] });
  // un paramento de (x1, z1) a (x2, z2), mirando hacia dentro; la textura va en metros y una junta cae en la esquina del fondo
  function muro(x1, z1, x2, z2, cual, juntaAlFinal) {
    const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
    const geo = new THREE.PlaneGeometry(L, AL), uv = geo.attributes.uv; geo.setAttribute('uv1', uv.clone());
    const off = juntaAlFinal ? Math.ceil(L / PX - 1e-6) * PX - L : 0;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (off + uv.getX(i) * L) / (2 * PX), (uv.getY(i) * AL) / (2 * PY));
    const luz = mapaLuz(Math.max(64, Math.round(L * 22)), 112, (u, v) => luzMuro(x1 + u * dx, v * AL, z1 + u * dz, cual));
    const m = new THREE.Mesh(geo, matHormigon(luz));
    m.rotation.y = Math.atan2(-dz, dx); m.position.set((x1 + x2) / 2, AL / 2, (z1 + z2) / 2); m.receiveShadow = true; escena.add(m);
  }
  muro(-AN / 2, FONDO, AN / 2, FONDO, 'fondo');
  muro(-AN / 2, FRENTE, -AN / 2, FONDO, 'lado', true);
  muro(AN / 2, FONDO, AN / 2, FRENTE, 'lado');
  muro(AN / 2, FRENTE, -AN / 2, FRENTE, 'frente');
  // el techo, con el hueco de la luminaria
  {
    const s = new THREE.Shape(); s.moveTo(-AN / 2, FONDO); s.lineTo(AN / 2, FONDO); s.lineTo(AN / 2, FRENTE); s.lineTo(-AN / 2, FRENTE); s.lineTo(-AN / 2, FONDO);
    const geo = new THREE.ShapeGeometry(s), p = geo.attributes.position, uv = new Float32Array(p.count * 2), uv1 = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getY(i); uv[i * 2] = (x + AN / 2) / (2 * PX); uv[i * 2 + 1] = (z - FONDO) / (2 * PX); uv1[i * 2] = (x + AN / 2) / AN; uv1[i * 2 + 1] = (z - FONDO) / LARGO; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    const techo = new THREE.Mesh(geo, matHormigon(mapaLuz(192, 208, (u, v) => luzTecho(-AN / 2 + u * AN, FONDO + v * LARGO)), 0x9aa0a6));
    techo.rotation.x = Math.PI / 2; techo.position.y = AL; escena.add(techo);
  }

  // ---------------- el suelo: piedra negra pulida ----------------
  // un espejo y, encima, una capa muy fina de piedra negra con sus juntas (dueño, 14:50: «abajo debe ser efecto espejo»)
  // (dueño, 16:05: «quita el efecto reflejo abajo, así ganamos espacio y hacemos más grande el holograma»: sin espejo; el suelo, piedra
  // negra mate, en la que solo se ve la luz del holograma. Además, el espejo volvía a dibujar toda la sala en cada cuadro.)
  void Reflector;
  function texLosas() {
    const N = NIVEL === 2 ? 1024 : 512, k = N / 4.8, [c, g] = lienzo2d(N, N);
    g.fillStyle = 'rgba(8,9,12,.2)'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = `rgba(9,11,14,${0.01 + az() * 0.03})`; g.fillRect((i * N) / 2, (j * N) / 2, N / 2, N / 2); }
    g.filter = `blur(${Math.round(k * 0.08)}px)`;
    for (let n = 0; n < 60; n++) { g.fillStyle = `rgba(${az() < 0.5 ? '30,34,40' : '4,5,6'},${az() * 0.04})`; const r = k * (0.1 + az() * 0.5); g.beginPath(); g.ellipse(az() * N, az() * N, r * 2, r * 0.6, az() * 3.14, 0, 6.283); g.fill(); }
    g.filter = 'none';
    g.strokeStyle = 'rgba(1,2,3,.75)'; g.lineWidth = Math.max(2, k * 0.005);
    for (const x of [0, N / 2, N]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, N); g.stroke(); }
    for (const y of [0, N / 2, N]) { g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO;
    const r = LARGO / (2 * PX); t.repeat.set(AN / (2 * PX), r); t.offset.set(0, Math.ceil(r * 2 - 1e-6) / 2 - r); // juntas alineadas con el fondo
    return t;
  }
  const piedra = new THREE.Mesh(new THREE.PlaneGeometry(AN, LARGO), new THREE.MeshStandardMaterial({ map: texLosas(), color: 0x9aa3ad, roughness: 0.62, metalness: 0 }));
  piedra.rotation.x = -Math.PI / 2; piedra.position.set(0, 0.002, ZM); piedra.receiveShadow = true; escena.add(piedra);

  // ---------------- acero ----------------
  const matAcero = new THREE.MeshPhysicalMaterial({ color: 0xcdd2d8, metalness: 1, roughness: 0.07 });
  // zócalo de acero pulido
  const zocalo = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, ZOC, d), matAcero); m.position.set(x, ZOC / 2, z); m.receiveShadow = true; escena.add(m); };
  const E = 0.014;
  void zocalo; void E; // (sin zócalo: también era una línea; dueño, 15:57)
  // aletas de acero pulido en las juntas de los paneles: dos en el fondo (enmarcan la roca), dos delante y cinco en cada lado
  {
    const pos = [[-3 * PX / 2, FONDO + 0.08, 0], [3 * PX / 2, FONDO + 0.08, 0], [-3 * PX / 2, FRENTE - 0.08, 0], [3 * PX / 2, FRENTE - 0.08, 0]];
    for (let z = FONDO + PX; z < FRENTE - 0.3; z += PX) pos.push([-AN / 2 + 0.08, z, 1], [AN / 2 - 0.08, z, 1]);
    const aletas = new THREE.InstancedMesh(new RoundedBoxGeometry(0.06, AL - 0.004, 0.16, 3, 0.012), matAcero, pos.length);
    const M = new THREE.Matrix4(), R = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    pos.forEach(([x, z, lado], i) => { M.makeTranslation(x, AL / 2, z); if (lado) M.multiply(R); aletas.setMatrixAt(i, M); });
    void aletas; // (sin aletas: también eran líneas)
  }

  // ---------------- las líneas de luz ----------------
  const matLinea = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe9f2fb).multiplyScalar(2.4), toneMapped: false });
  // (sin líneas de luz en los muros ni en el techo: dueño, 15:57)
  // bañador de pared: una ranura de luz en el techo, a lo largo del fondo
  const matRanura = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe9f2fb).multiplyScalar(1.7), toneMapped: false });

  // y la luz que de verdad dan: una tira de área por pared, a la altura de la junta
  const tira = (w, x, z, mx, mz) => { const a = new THREE.RectAreaLight(0xe8f1fa, 3, w, 0.05); a.position.set(x, Y_LINEA, z); a.lookAt(mx, Y_LINEA, mz); escena.add(a); };
  void tira;
  escena.add(new THREE.HemisphereLight(0x3a4452, 0x050607, 0.08));

  // ---------------- la luz sobre la roca ----------------
  // (Dueño, 14:40: «quita la lámpara».) Sin luminaria a la vista: la luz cae del techo, como en una sala de museo, y da la sombra
  // de la roca en el suelo; otra, más suave, le saca el relieve por delante.
  const cenital = new THREE.SpotLight(0xeaf2fb, 70, 0, 0.5, 0.9, 2); cenital.position.set(0.5, 4.45, Z0 + 0.9); cenital.target.position.set(0, 0.4, Z0);
  escena.add(cenital, cenital.target);
  if (NIVEL === 2) { const areaLum = new THREE.RectAreaLight(0xeaf2fb, 1.6, LX, LZ); areaLum.position.set(0, 4.49, Z0); areaLum.lookAt(0, 0, Z0); escena.add(areaLum); }

  // ---------------- la roca ----------------
  // Dueño, 14:40 y 14:50 (con una imagen de referencia: «la piedra no se ve real como la que te envié»): una roca natural, oscura y
  // mate, rota en planos de fractura, con conchas, grietas y grano fino, flotando sobre un suelo que es un espejo. 14:25: «que se abra
  // en 4 partes, arriba y abajo también»; 14:51: «no debe verse la línea blanca en la roca hasta presionar el botón».
  // Es una roca propia, hecha aquí, sin modelos de terceros:
  //   · la forma: una esfera (octaedro subdividido: sus aristas caen en los planos del corte) llevada a un bloque irregular con ruido
  //     de baja frecuencia, rota por planos (lascas: caras planas y aristas vivas), con conchas cóncavas (la fractura concoidea),
  //     grietas finas y rugosidad;
  //   · la sombra de cada hueco (oclusión) y el desgaste de las aristas van en el color de cada vértice;
  //   · el grano fino (milímetros) se calcula en la tarjeta gráfica, en el espacio de la roca: sin texturas ni costuras.
  // Cada cuarto lleva sus dos caras de corte, de piedra negra pulida.
  const perm = new Uint8Array(512);
  { const q = Array.from({ length: 256 }, (_, k) => k); for (let k = 255; k > 0; k--) { const m = Math.floor(az() * (k + 1)); const t = q[k]; q[k] = q[m]; q[m] = t; } for (let k = 0; k < 512; k++) perm[k] = q[k & 255]; }
  const suav = (t) => t * t * t * (t * (t * 6 - 15) + 10), mez = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y, z) => { const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return (h & 1 ? -u : u) + (h & 2 ? -v : v); };
  function ruido(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255; x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = suav(x), v = suav(y), w = suav(z), A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return mez(mez(mez(grad(perm[AA] & 15, x, y, z), grad(perm[BA] & 15, x - 1, y, z), u), mez(grad(perm[AB] & 15, x, y - 1, z), grad(perm[BB] & 15, x - 1, y - 1, z), u), v),
      mez(mez(grad(perm[AA + 1] & 15, x, y, z - 1), grad(perm[BA + 1] & 15, x - 1, y, z - 1), u), mez(grad(perm[AB + 1] & 15, x, y - 1, z - 1), grad(perm[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
  }
  const fbm = (x, y, z, n) => { let s = 0, a = 1, f = 1, t = 0; for (let k = 0; k < n; k++) { s += a * ruido(x * f, y * f, z * f); t += a; a *= 0.5; f *= 2.03; } return s / t; };
  const lascas = [], conchas = [];
  for (let k = 0; k < 22; k++) lascas.push({ n: new THREE.Vector3(az() * 2 - 1, (az() * 2 - 1) * 0.85, az() * 2 - 1).normalize(), d: 0.62 + az() * 0.3 });
  for (let k = 0; k < 16; k++) conchas.push({ n: new THREE.Vector3(az() * 2 - 1, az() * 2 - 1, az() * 2 - 1).normalize(), c: Math.cos(0.16 + az() * 0.3), h: 0.04 + az() * 0.08 });
  function radio(x, y, z) {
    const pw = 3.6; // entre esfera y bloque
    let r = Math.pow(Math.pow(Math.abs(x), pw) + Math.pow(Math.abs(y), pw) + Math.pow(Math.abs(z), pw), -1 / pw) * (1.02 + 0.22 * fbm(x * 1.3 + 7.1, y * 1.3 - 3.3, z * 1.3 + 1.7, 3));
    for (const c of lascas) { const k = x * c.n.x + y * c.n.y + z * c.n.z; if (k > 1e-3) { const t = c.d / k; if (t < r) r = t; } }
    for (const c of conchas) { const k = x * c.n.x + y * c.n.y + z * c.n.z; if (k > c.c) r -= c.h * Math.sqrt((k - c.c) / (1 - c.c)); }
    r -= 0.034 * Math.pow(1 - Math.abs(ruido(x * 3.4 + 1.3, y * 3.4, z * 3.4 - 2.1)), 10); // grietas
    r -= 0.012 * Math.pow(1 - Math.abs(ruido(x * 9 - 4, y * 9 + 2, z * 9)), 8);
    return r + 0.03 * fbm(x * 5 + 2.2, y * 5, z * 5 - 5.5, 4) + 0.008 * ruido(x * 22, y * 22, z * 22);
  }
  const RX = ANCHO / 2, RY = ALTO / 2, RZ = PROF / 2;
  const punto = (x, y, z, o) => { const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l; const r = radio(x, y, z), f = 1 + 0.18 * y * r; return o.set(x * r * RX * f, y * r * RY, z * r * RZ * f); }; // algo más ancha arriba
  // Dueño, 14:54: «¿puedes hacer que la piedra parezca holograma? Quedaría muy bien». La misma roca, hecha de luz: azul hielo, los
  // bordes encendidos (lo que se ve de canto brilla más), líneas de barrido que siguen su relieve, una banda que sube despacio, un
  // parpadeo leve y, de vez en cuando, una franja que se desplaza un instante. Las grietas y los huecos, más tenues.
  // Dueño, 14:59: «el holograma quiero que también se vea ultra realista; utiliza todos tus recursos». Una proyección de luz de una
  // roca real: la roca se «fotografía» con una luz alta y lateral (su relieve, sus grietas y su grano, calculados aquí) y esa imagen
  // es de luz: se suma a la sala, deja ver un poco su cara de atrás, enciende sus cantos, la cruzan líneas de barrido finas y una
  // banda que sube; tiembla un poco, hace grano como un proyector y, de vez en cuando, se desplaza una franja. Ilumina la sala.
  const GLSL_RUIDO = `
    float hR(vec3 p) { p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float vnR(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hR(i), hR(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hR(i + vec3(0.0, 1.0, 0.0)), hR(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                 mix(mix(hR(i + vec3(0.0, 0.0, 1.0)), hR(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hR(i + vec3(0.0, 1.0, 1.0)), hR(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
    float granoR(vec3 p) { return 0.55 * vnR(p) + 0.3 * vnR(p * 2.13 + 7.1) + 0.15 * vnR(p * 4.37 - 3.3); }
  `;
  const HOLO_V = `
    uniform float t, glitch, nivel, paso, alto;
    varying vec3 vN, vV, vP; varying float vAo;
    float h1(float n) { return fract(sin(n) * 43758.5453); }
    ${GLSL_RUIDO}
    void main() {
      vec3 p = position;
      float banda = floor(p.y * 16.0), salto = step(0.986, h1(banda * 12.9898 + floor(t * 6.0) * 78.233)) * glitch;
      p.x += salto * 0.03 * sin(t * 90.0 + banda);
      // en el frente del cambio de luz, la proyección tiembla un instante (como si la roca se volviera a proyectar)
      float dF = p.y / alto + 0.5 - nivel;
      p.x += exp(-dF * dF / 0.0012) * paso * glitch * 0.011 * sin(t * 70.0 + p.y * 90.0);
      p += normal * (vnR(p * 9.0 + vec3(0.0, t * 0.7, 0.0)) - 0.5) * 0.004 * glitch; // la superficie de luz respira
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vN = normalize(normalMatrix * normal); vV = -mv.xyz; vP = position; vAo = color.r;
      gl_Position = projectionMatrix * mv;
    }`;
  const HOLO_F = `
    uniform float t, brillo, nivel, paso, alto, sube; uniform vec3 hielo, blanco, profundo;
    varying vec3 vN, vV, vP; varying float vAo;
    ${GLSL_RUIDO}
    float h2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      float cara = gl_FrontFacing ? 1.0 : -1.0;
      vec3 v = normalize(vV), n = normalize(vN) * cara;
      // el grano de la piedra, en el relieve (como un mapa de relieve, calculado en la roca: sin texturas)
      float px = length(fwidth(vP)), fino = clamp(1.0 - px * 90.0, 0.0, 1.0);
      float h = granoR(vP * 34.0) + fino * 0.4 * vnR(vP * 150.0);
      vec3 sx = normalize(dFdx(-vV)), sy = normalize(dFdy(-vV)), r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1);
      n = normalize(abs(det) * n - sign(det) * (dFdx(h) * r1 + dFdy(h) * r2) * 0.5);
      float nv = abs(dot(n, v)), fres = pow(1.0 - nv, 3.0);
      // la «foto» de la roca: luz alta y lateral, un relleno suave y la sombra de cada hueco
      vec3 L = normalize(vec3(-0.5, 0.78, 0.38));
      float luz = 0.14 + 0.86 * pow(max(dot(n, L), 0.0), 1.15);
      float ao = smoothstep(0.22, 1.0, vAo);
      float cuerpo = luz * ao * (0.72 + 0.5 * h);
      // líneas de barrido cada 4,5 cm, sin dientes (se apagan si se juntan demasiado en pantalla), y la banda que sube
      float y = vP.y * 22.0 - t * 0.35, w = fwidth(y) * 1.2;
      float linea = (1.0 - smoothstep(0.0, 0.08 + w, abs(fract(y) - 0.5) - 0.42)) * (1.0 - smoothstep(0.25, 0.6, w));
      float banda = smoothstep(0.1, 0.0, abs(fract(vP.y * 0.3 - t * 0.11) - 0.5));
      float grano = (h2(gl_FragCoord.xy + fract(t * 3.1) * 91.0) - 0.5) * 0.06;
      float parpadeo = 0.95 + 0.05 * sin(t * 37.0) * sin(t * 11.3);
      float atras = gl_FrontFacing ? 1.0 : 0.28;
      // claro: la luz blanca y hielo
      float a = (cuerpo * 0.36 + fres * 0.42 + linea * 0.09 + banda * 0.1 + grano) * atras;
      vec3 col = mix(hielo, blanco, clamp(cuerpo * 0.45 + fres * 0.55, 0.0, 1.0));
      col += vec3(-0.12, 0.02, 0.1) * fres * n.x; // un borde algo cian a un lado y algo violeta al otro, como en una lente
      vec3 claro = max(col, 0.0) * max(a, 0.0);
      // oscuro (dueño, 15:10: «en vez de blanco, que sea más oscuro»): un cristal de noche que apaga lo que hay detrás; el relieve y
      // los cantos, en azul profundo; las líneas de barrido, apenas
      float aO = (cuerpo * 0.08 + fres * 0.55 + linea * 0.05 + banda * 0.06 + grano * 0.5) * (gl_FrontFacing ? 1.0 : 0.4);
      vec3 colO = mix(profundo, hielo, clamp(fres * 0.85 + cuerpo * 0.2, 0.0, 1.0));
      colO += vec3(-0.06, 0.0, 0.09) * fres * n.x;
      vec3 oscuro = max(colO, 0.0) * max(aO, 0.0);
      float tapa = (0.48 + 0.32 * cuerpo) * (gl_FrontFacing ? 1.0 : 0.6);
      // el cambio (15:17: «que vaya cambiando de blanco a oscuro… la transición tiene que ser espectacular»): un frente recorre la
      // roca (lo oscuro sube desde abajo; la luz vuelve bajando desde arriba), con el borde irregular de la piedra, un filo de luz
      // blanca, chispas y una estela que se apaga detrás
      float hy = vP.y / alto + 0.5;
      float fr = nivel + (vnR(vP * 3.2 + vec3(0.0, t * 0.3, 0.0)) - 0.5) * 0.12 + (h - 0.6) * 0.04;
      float d = hy - fr;
      float o = 1.0 - smoothstep(-0.01, 0.01, d);
      float filo = exp(-d * d / 0.00016) * paso;
      float chispa = step(0.955, h2(floor(vP.xz * 240.0 + vP.y * 37.0) + floor(t * 24.0))) * exp(-d * d / 0.0014) * paso;
      float tras = -d * sube;
      float estela = tras > 0.0 ? exp(-tras * 16.0) * paso : 0.0;
      vec3 rgb = mix(claro, oscuro, o) + (blanco * (filo * 1.8 + chispa * 2.4) + hielo * estela * 0.22) * atras;
      gl_FragColor = vec4(rgb * brillo * parpadeo, tapa * o);
    }`;
  const uHolo = { t: { value: 0 }, glitch: { value: quieto ? 0 : 1 }, brillo: { value: 1 }, hielo: { value: new THREE.Color(0x5aa6e8) }, blanco: { value: new THREE.Color(0xdcecfb) },
    nivel: { value: quieto ? 1.2 : -0.2 }, paso: { value: 0 }, sube: { value: 1 }, alto: { value: ALTO }, ambiente: { value: 1 }, profundo: { value: new THREE.Color(0x0c1f36) } };
  const matRoca = new THREE.ShaderMaterial({ uniforms: uHolo, vertexShader: HOLO_V, fragmentShader: HOLO_F, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    // premultiplicado: en lo claro suma luz (como antes); en lo oscuro, además, apaga lo que hay detrás
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
  // las caras del corte, al abrirse: una sección de escáner, con su retícula
  const matCorte = new THREE.ShaderMaterial({
    uniforms: uHolo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float brillo; uniform vec3 hielo; varying vec3 vP;
      void main() { vec2 q = (abs(vP.x) < 1e-3 ? vP.zy : vP.xz) * 18.0; vec2 g = abs(fract(q) - 0.5) / fwidth(q); float red = 1.0 - min(min(g.x, g.y), 1.0);
        gl_FragColor = vec4(hielo * (0.05 + 0.3 * red) * brillo, 1.0); }`,
  });
  const mono = new THREE.Group(); mono.position.set(0, Y0, Z0); escena.add(mono);
  const baseRoca = new THREE.OctahedronGeometry(1, [40, 52, 72][NIVEL]).attributes.position; // sin índices: tres vértices por triángulo
  const cuartos = [];
  {
    // cada dirección se calcula una vez (en el octaedro, cada vértice se repite en varios triángulos)
    const memo = new Map(), P = new THREE.Vector3(), P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), Q = new THREE.Vector3(), D = new THREE.Vector3(), T1 = new THREE.Vector3(), T2 = new THREE.Vector3(), Nn = new THREE.Vector3();
    const EJE = new THREE.Vector3(0, 1, 0), EJE2 = new THREE.Vector3(1, 0, 0), E = 0.009, ANILLO = [0, 1, 2, 3, 4, 5].map((k) => [Math.cos((k * Math.PI) / 3), Math.sin((k * Math.PI) / 3)]);
    function vertice(dx, dy, dz) {
      const clave = Math.round(dx * 1e5) + ',' + Math.round(dy * 1e5) + ',' + Math.round(dz * 1e5);
      let v = memo.get(clave); if (v) return v;
      D.set(dx, dy, dz).normalize();
      punto(D.x, D.y, D.z, P);
      T1.crossVectors(D, Math.abs(D.y) > 0.9 ? EJE2 : EJE).normalize(); T2.crossVectors(D, T1);
      punto(D.x + T1.x * E, D.y + T1.y * E, D.z + T1.z * E, P1); punto(D.x + T2.x * E, D.y + T2.y * E, D.z + T2.z * E, P2);
      Nn.crossVectors(P1.sub(P), P2.sub(P)).normalize(); if (Nn.dot(P) < 0) Nn.negate();
      // oclusión: si los vecinos sobresalen, es un hueco (más oscuro); si quedan por debajo, una arista (algo más clara, gastada)
      const r0 = P.length(); let media = 0;
      for (const [a, b] of ANILLO) { punto(D.x + (T1.x * a + T2.x * b) * 0.05, D.y + (T1.y * a + T2.y * b) * 0.05, D.z + (T1.z * a + T2.z * b) * 0.05, Q); media += Q.length(); }
      const conc = media / 6 - r0;
      const ao = Math.max(0.28, Math.min(1, 1 - 7 * conc)), arista = 1 + Math.min(0.3, Math.max(0, -conc) * 6);
      const t = Math.max(0.55, Math.min(1.2, 0.9 + 0.22 * fbm(D.x * 2.6 + 4, D.y * 2.6, D.z * 2.6 - 2, 3))) * ao * arista;
      v = { p: P.clone(), n: Nn.clone(), c: t, x: dx, y: dy };
      memo.set(clave, v); return v;
    }
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) {
      const pos = [], nor = [], col = [], cpos = [], cnor = [];
      for (let i = 0; i < baseRoca.count; i += 3) {
        if ((baseRoca.getX(i) + baseRoca.getX(i + 1) + baseRoca.getX(i + 2)) * sx <= 0 || (baseRoca.getY(i) + baseRoca.getY(i + 1) + baseRoca.getY(i + 2)) * sy <= 0) continue;
        const tri = [];
        for (let k = 0; k < 3; k++) {
          const v = vertice(baseRoca.getX(i + k), baseRoca.getY(i + k), baseRoca.getZ(i + k));
          pos.push(v.p.x, v.p.y, v.p.z); nor.push(v.n.x, v.n.y, v.n.z); col.push(v.c, v.c, v.c * 1.02); tri.push(v);
        }
        // las caras del corte: cada arista que cae en un plano del corte, con el centro
        for (let k = 0; k < 3; k++) {
          const a = tri[k], b = tri[(k + 1) % 3];
          for (const [eje, nx, ny] of [['x', -sx, 0], ['y', 0, -sy]]) {
            if (a[eje] !== 0 || b[eje] !== 0) continue;
            Nn.crossVectors(a.p, b.p); const alReves = Nn.x * nx + Nn.y * ny < 0, u = alReves ? b.p : a.p, w = alReves ? a.p : b.p;
            cpos.push(0, 0, 0, u.x, u.y, u.z, w.x, w.y, w.z); for (let q = 0; q < 3; q++) cnor.push(nx, ny, 0);
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const gc = new THREE.BufferGeometry(); gc.setAttribute('position', new THREE.Float32BufferAttribute(cpos, 3)); gc.setAttribute('normal', new THREE.Float32BufferAttribute(cnor, 3));
      const grupo = new THREE.Group(), piel = new THREE.Mesh(g, matRoca), corte = new THREE.Mesh(gc, matCorte);
      corte.visible = false; grupo.add(piel, corte); grupo.userData = { sx, sy, corte }; mono.add(grupo); cuartos.push(grupo);
    }
  }
  const motas = {};
  const texPuntoH = (() => { const [c2, g2] = lienzo2d(32, 32), r = g2.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = r; g2.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c2); })();
  {
    const RP = 0.5, alto = Y0 - ALTO / 2 + 0.25;
    const anillo = new THREE.Mesh(new THREE.RingGeometry(RP, RP + 0.012, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9cc3e4).multiplyScalar(2.2), toneMapped: false }));
    anillo.rotation.x = -Math.PI / 2; anillo.position.set(0, 0.004, Z0); escena.add(anillo);
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(RP + 0.26, RP, alto, 96, 1, true), new THREE.ShaderMaterial({
      uniforms: uHolo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vU; varying vec3 vN, vV; void main() { vU = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform float t, brillo, ambiente; uniform vec3 hielo; varying vec2 vU; varying vec3 vN, vV;
        void main() { float lado = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5); float rayas = 0.6 + 0.4 * sin(vU.x * 6.2832 * 48.0 + t * 0.6);
          gl_FragColor = vec4(hielo * (1.0 - vU.y) * (1.0 - vU.y) * (0.03 + 0.16 * lado) * rayas * brillo * ambiente, 1.0); }`,
    }));
    haz.position.set(0, alto / 2, Z0); escena.add(haz);
    // el brillo del emisor en el suelo
    const [cv, gv] = lienzo2d(256, 256), rg = gv.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(0.32, 'rgba(255,255,255,.28)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); gv.fillStyle = rg; gv.fillRect(0, 0, 256, 256);
    const charco = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: new THREE.Color(0x5aa6e8).multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    charco.rotation.x = -Math.PI / 2; charco.position.set(0, 0.006, Z0); escena.add(charco); motas.charco = charco; motas.cc = charco.material.color.clone();
    // motas de polvo que suben dentro del haz y brillan al cruzarlo
    const NM = quieto ? 0 : [40, 70, 90][NIVEL], mp = new Float32Array(NM * 3); motas.v = new Float32Array(NM);
    for (let k = 0; k < NM; k++) { const a = az() * 6.283, r = Math.sqrt(az()) * (RP + 0.1); mp[k * 3] = Math.cos(a) * r; mp[k * 3 + 1] = az() * (Y0 + ALTO / 2); mp[k * 3 + 2] = Z0 + Math.sin(a) * r; motas.v[k] = 0.04 + az() * 0.08; }
    motas.g = new THREE.BufferGeometry(); motas.g.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    motas.mat = new THREE.PointsMaterial({ map: texPuntoH, color: new THREE.Color(0x9cc3e4).multiplyScalar(1.4), size: 0.018, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); escena.add(new THREE.Points(motas.g, motas.mat));
  }
  // la luz del holograma: tiñe de azul la sala y el suelo, y tiembla con él
  const luzHolo = new THREE.PointLight(0x6fb0ea, 3.2, 7, 2); luzHolo.position.set(0, Y0 - 0.2, Z0 + 0.35); escena.add(luzHolo);
  // la fisura de luz por donde se parte, en cruz: sigue la piel de la roca por delante; solo se enciende al pulsar
  const matSello = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd6e8f8).multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0 });
  const matSelloH = matSello.clone();
  const fisura = (vertical, mat) => {
    const pts = [], lim = vertical ? 1.42 : 1.3;
    for (let a = -lim; a <= lim + 1e-6; a += lim / 70) { const q = new THREE.Vector3(); punto(vertical ? 0 : Math.sin(a), vertical ? Math.sin(a) : 0, Math.cos(a), q); q.multiplyScalar(1.004); q.z += 0.003; pts.push(q); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.0026, 6, false), mat); mono.add(m); return m;
  };
  const sello = fisura(true, matSello), selloH = fisura(false, matSelloH);
  const marca = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); marca.visible = false; mono.add(marca);
  // dentro: una hoja de luz y su halo
  const matNucleo = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd6e8f8).multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0 });
  const nucleo = new THREE.Mesh(new THREE.PlaneGeometry(0.022, ALTO - 0.3), matNucleo); mono.add(nucleo);
  const texHalo = (() => { const [c, g] = lienzo2d(128, 256), r = g.createRadialGradient(64, 128, 0, 64, 128, 128); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 256); return new THREE.CanvasTexture(c); })();
  const matHalo = new THREE.MeshBasicMaterial({ map: texHalo, color: 0x9cc3e4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.4, ALTO + 0.6), matHalo); halo.position.z = -0.01; mono.add(halo);
  const luzNucleo = NIVEL === 2 ? new THREE.RectAreaLight(0xcfe3f6, 0, 0.1, ALTO - 0.3) : { intensity: 0 }; if (luzNucleo.isLight) { luzNucleo.position.set(0, 0, 0.05); mono.add(luzNucleo); }
  const luzNucleo2 = new THREE.PointLight(0xbfdcf5, 0, 14, 2); luzNucleo2.position.set(0, 0, 0.7); mono.add(luzNucleo2);

  // ---------------- lo que refleja el acero: la propia sala ----------------
  // Una vista en cubo de la sala desde donde está la roca (sin ella), con las luces más intensas solo para esa vista: como en una
  // foto, el acero pulido refleja sobre todo las luces.
  {
    const brillan = [matLinea, matRanura]; for (const m of brillan) m.color.multiplyScalar(3);
    for (const m of cuartos) m.visible = false; sello.visible = false;
    const entorno = pmrem.fromScene(escena, 0, 0.05, 40, { position: new THREE.Vector3(0, Y0, Z0 + 0.7), size: [128, 256, 512][NIVEL] }).texture;
    for (const m of cuartos) m.visible = true; sello.visible = true;
    for (const m of brillan) m.color.multiplyScalar(1 / 3);
    for (const [m, k] of [[matAcero, 1]]) { m.envMap = entorno; m.envMapIntensity = k; m.needsUpdate = true; }
  }

  // ---------------- el campo magnético entre las dos mitades ----------------
  // líneas de campo que se estiran al separarse (las de los bordes se curvan más, como entre dos imanes enfrentados) y chispas que
  // corren por ellas; al cerrar, las mitades se atraen y se juntan con un pequeño rebote
  const texPunto = (() => { const [c, g] = lienzo2d(32, 32), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const ML = 14, MP = 36;
  const matCampo = new THREE.LineBasicMaterial({ color: new THREE.Color(0xbfdcf5).multiplyScalar(1.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const lineas = [];
  for (let k = 0; k < ML; k++) {
    const gL = new THREE.BufferGeometry(); gL.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MP * 3), 3));
    const l = new THREE.Line(gL, matCampo); l.frustumCulled = false; mono.add(l);
    const lado = k % 2 ? 1 : -1, i = Math.floor(k / 2), n = Math.ceil(ML / 2) - 1;
    lineas.push({ l, lado, y: (-0.42 + (0.84 * i) / n) * ALTO, fase: Math.random() * 6.28 });
  }
  const NCH = quieto ? 0 : [70, 120, 160][NIVEL], chPos = new Float32Array(NCH * 3), chU = new Float32Array(NCH), chL = new Uint8Array(NCH), chV = new Float32Array(NCH);
  for (let i = 0; i < NCH; i++) { chU[i] = Math.random(); chL[i] = Math.floor(Math.random() * ML); chV[i] = 0.25 + Math.random() * 0.6; }
  const chG = new THREE.BufferGeometry(); chG.setAttribute('position', new THREE.BufferAttribute(chPos, 3));
  const matChispa = new THREE.PointsMaterial({ map: texPunto, color: new THREE.Color(0xe3f0fb).multiplyScalar(1.6), size: 0.022, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const chispas = new THREE.Points(chG, matChispa); chispas.frustumCulled = false; mono.add(chispas);

  // ---------------- el campo gravitatorio: el disco de luz y las ondas ----------------
  const NG = quieto ? 0 : [260, 480, 760][NIVEL], R0 = 0.4, R1 = 1.8;
  const disco = new THREE.Group(); disco.position.set(0, Y0, Z0); disco.rotation.x = 0.24; disco.visible = false; escena.add(disco);
  const gP = new Float32Array(NG * 3), gC = new Float32Array(NG * 3), gR = new Float32Array(NG), gA = new Float32Array(NG), gY = new Float32Array(NG), gW = new Float32Array(NG);
  const nace = (i, fuera) => { gR[i] = fuera ? R1 * (0.8 + 0.2 * Math.random()) : R0 + (R1 - R0) * Math.pow(Math.random(), 1.7); gA[i] = Math.random() * 6.2832; gY[i] = (Math.random() - 0.5) * 0.07 * gR[i]; gW[i] = 0.7 + Math.random() * 0.6; };
  for (let i = 0; i < NG; i++) nace(i, false);
  const gG = new THREE.BufferGeometry(); gG.setAttribute('position', new THREE.BufferAttribute(gP, 3)); gG.setAttribute('color', new THREE.BufferAttribute(gC, 3));
  const matDisco = new THREE.PointsMaterial({ map: texPunto, size: 0.03, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  matDisco.color.setScalar(1.7);
  const puntosDisco = new THREE.Points(gG, matDisco); puntosDisco.frustumCulled = false; disco.add(puntosDisco);
  const ondas = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.992, 1, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xbfdcf5).multiplyScalar(1.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })); m.rotation.x = -Math.PI / 2; disco.add(m); return m; });
  function campoGravitatorio(dt) {
    const f = estado.campoG; disco.visible = f > 0.002; if (!disco.visible) return;
    matDisco.opacity = f;
    const w = 0.8 + 1.7 * estado.giroG;
    for (let i = 0; i < NG; i++) {
      const r = gR[i];
      gA[i] += dt * w * gW[i] * 2.1 * Math.pow(R0 / r, 1.5);
      gR[i] -= dt * 0.07 * (R0 / r) * f;
      if (gR[i] < R0 * 0.72) nace(i, true);
      const k = i * 3, cerca = Math.pow(R0 / gR[i], 1.15), aparece = Math.min(1, (R1 * 1.02 - gR[i]) / 0.25);
      gP[k] = Math.cos(gA[i]) * gR[i]; gP[k + 1] = gY[i]; gP[k + 2] = Math.sin(gA[i]) * gR[i];
      gC[k] = (0.3 + 0.62 * cerca) * aparece; gC[k + 1] = (0.55 + 0.42 * cerca) * aparece; gC[k + 2] = (0.9 + 0.1 * cerca) * aparece;
    }
    gG.attributes.position.needsUpdate = true; gG.attributes.color.needsUpdate = true;
    for (let k = 0; k < 3; k++) { const p = (ahora * 0.42 + k / 3) % 1, s2 = R0 + (R1 + 0.5 - R0) * p; ondas[k].scale.setScalar(s2); ondas[k].material.opacity = f * 0.42 * Math.sin(p * Math.PI) * (1 - p) * (0.4 + 0.6 * estado.giroG); }
  }
  const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), P3 = new THREE.Vector3(), Q = new THREE.Vector3();
  const bez = (u, o) => { const a = 1 - u; return o.set(0, 0, 0).addScaledVector(P0, a * a * a).addScaledVector(P1, 3 * a * a * u).addScaledVector(P2, 3 * a * u * u).addScaledVector(P3, u * u * u); };
  function curva(L, sep) {
    const borde = Math.abs(L.y) / (ALTO * 0.42); // 0 en el centro, 1 en los extremos
    const b = (0.05 + 0.34 * borde * borde) * (0.4 + sep * 2.2), z = L.lado * (PROF / 2 + 0.01);
    P0.set(-sep, L.y, z * 0.6); P3.set(sep, L.y, z * 0.6);
    P1.set(-sep * 0.35, L.y * (1 + 0.22 * borde), z + L.lado * b); P2.set(sep * 0.35, L.y * (1 + 0.22 * borde), z + L.lado * b);
  }

  // ---------------- polvo en la luz (muy poco) ----------------
  const N = quieto ? 0 : [50, 100, 160][NIVEL], pos = new Float32Array(N * 3), vel = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * (AN - 1); pos[i * 3 + 1] = Math.random() * (AL - 0.3); pos[i * 3 + 2] = FONDO + 0.5 + Math.random() * 9; vel[i] = 0.015 + Math.random() * 0.035; }
  const polvoG = new THREE.BufferGeometry(); polvoG.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  escena.add(new THREE.Points(polvoG, new THREE.PointsMaterial({ map: texPunto, color: 0xd7e3ef, size: 0.012, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })));

  // ---------------- composición ----------------
  // con antialiasing de verdad (MSAA en el búfer de la composición), un poco de resplandor en las luces y un grano finísimo que evita
  // los escalones en los degradados oscuros
  const comp = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: NIVEL === 2 ? 4 : 0 }));
  comp.addPass(new RenderPass(escena, camara));
  const resplandor = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.55, 0.92); resplandor.enabled = NIVEL >= 1;
  comp.addPass(resplandor);
  comp.addPass(new OutputPass());
  const grano = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, semilla: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float semilla; varying vec2 vUv;\n' +
      'float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n' +
      'void main() { vec4 c = texture2D(tDiffuse, vUv); float n = h(gl_FragCoord.xy + semilla) + h(gl_FragCoord.yx * 1.37 - semilla) - 1.0; c.rgb += n * 0.011; gl_FragColor = c; }',
  });
  comp.addPass(grano); grano.enabled = NIVEL >= 1;

  function ajusta() {
    const w = lienzo.clientWidth || innerWidth, h = lienzo.clientHeight || innerHeight;
    renderer.setSize(w, h, false); comp.setSize(w, h);
    camara.aspect = w / h;
    // en pantallas estrechas, más ángulo para que quepa la sala; en las muy anchas, algo menos
    // (dueño, 15:42: «así se verá más grande e impresionante en el PC»: en el ordenador, menos ángulo: la roca, más grande)
    // (dueño, 22 nov 16:47: «en la versión del móvil reduce un poquito el tamaño de la piedra porque se va muy arriba»: de pie, 52°)
    camara.fov = camara.aspect < 0.8 ? 52 : camara.aspect < 1.2 ? 46 : camara.aspect > 2.1 ? 38 : 40;
    // en el móvil de pie (dueño, 15:41: «arriba queda mucho espacio, aprovéchalo»): la roca, más grande y más arriba (la imagen se
    // desplaza como con un objetivo descentrable, sin deformar), y abajo el suelo espejo y el botón; al abrir, se acerca menos
    retrato = camara.aspect < 0.8;
    // y más cerca: el holograma, a pantalla completa (dueño, 16:05)
    CAM.z = retrato ? 4.2 : 4.7;
    // (dueño, 22 nov: «en la versión pc el botón tapa la parte inferior del holograma»): la sala, algo más arriba, para que el botón
    // y la flecha de bajar queden debajo de la base del proyector
    camara.setViewOffset(w, h, 0, Math.round(h * (retrato ? 0.105 : 0.1)), w, h);
    camara.updateProjectionMatrix();
  }
  let retrato = false;
  addEventListener('resize', ajusta); ajusta();

  // ---------------- animación ----------------
  const ease = { io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), out: (t) => 1 - Math.pow(1 - t, 3), in: (t) => t * t * t, suave: (t) => t * t * (3 - 2 * t),
    // repulsión: arranca de golpe y se asienta con un rebote corto (como dos imanes que se empujan)
    iman: (t) => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    // atracción: acelera al acercarse y rebota un poco al chocar
    atrae: (t) => (t < 0.82 ? Math.pow(t / 0.82, 2.6) * 1.0 : 1 - Math.sin(((t - 0.82) / 0.18) * Math.PI) * 0.035) };
  const tramos = []; let ahora = 0;
  const estado = { sello: 0, abre: 0, giro: 0, luz: 0, dolly: 0, marca: 0, zumbido: 0, campo: 0, golpe: 0, giroG: 0, campoG: 0, vuelta: 0, vida: 0 };
  const tween = (k, a, b, dur, e, retraso) => new Promise((res) => tramos.push({ k, t0: ahora + (retraso || 0), dur: Math.max(dur, 0.0001), set: (p) => { estado[k] = a + (b - a) * p; }, e: e || ease.io, res }));
  const cancela = (k) => { for (let i = tramos.length - 1; i >= 0; i--) if (tramos[i].k === k) { const x = tramos[i]; tramos.splice(i, 1); x.res(); } };
  // Dueño, 15:43: «al abrirse la roca, que empiece a girar de menos a más hasta crear un campo gravitatorio… un efecto así
  // increíble». Al abrirse, las cuatro partes empiezan a girar alrededor de la luz, despacio y cada vez más deprisa, y alrededor se
  // forma el campo: un disco de polvo de luz que orbita (más deprisa cuanto más cerca del centro, como alrededor de una masa) y cae
  // despacio hacia dentro, y ondas que salen del centro. Al cerrar, el giro se frena y la roca queda otra vez de frente.
  const VMAX = 2.3;
  function frenaGiro() {
    cancela('giroG'); cancela('vuelta');
    const w0 = VMAX * estado.giroG, dos = Math.PI * 2, v0 = estado.vuelta; estado.giroG = 0;
    const resto = dos - (((v0 % dos) + dos) % dos);
    let D = resto > dos - 1e-3 ? 0 : resto; if (w0 > 0.3 && D < w0 * 0.6) D += dos;
    if (D < 1e-3) { estado.vuelta = 0; return; }
    const T = Math.min(3, 1.2 + D * 0.22), m0 = w0 * T;
    // sale a la misma velocidad que llevaba y se para justo de frente (curva de Hermite)
    tween('vuelta', v0, v0 + D, T, (t) => (D * (3 * t * t - 2 * t * t * t) + m0 * (t - 2 * t * t + t * t * t)) / D).then(() => { if (!estado.giroG) estado.vuelta = 0; });
  }
  const F = quieto ? 0.25 : 1;
  let abierta = false, ocupada = false;
  async function abre() {
    if (abierta || ocupada) return; ocupada = true;
    giro.obj = 0; giro.dedo = null;
    tween('sello', estado.sello, 1, 0.45 * F, ease.out);
    tween('zumbido', 0, 1, 0.5 * F, ease.in);
    tween('campo', 0, 1, 0.5 * F, ease.out, 0.35 * F);
    tween('zumbido', 1, 0, 0.3 * F, ease.out, 0.55 * F);
    tween('abre', 0, 1, 1.35 * F, ease.iman, 0.55 * F);
    tween('giro', 0, 1, 1.5 * F, ease.iman, 0.62 * F);
    tween('luz', 0, 1, 1.3 * F, ease.out, 0.7 * F);
    tween('campo', 1, 0.28, 1.6 * F, ease.io, 1.6 * F);
    tween('dolly', 0, 1, 2.2 * F, ease.io, 0.45 * F);
    cancela('vida'); tween('vida', estado.vida, 0, 0.3, ease.out);
    if (!quieto) { cancela('vuelta'); estado.vuelta = 0; tween('giroG', 0, 1, 4.4, ease.in, 0.9); tween('campoG', 0, 1, 3.4, ease.io, 1.2); }
    await new Promise((r) => setTimeout(r, 2150 * F));
    abierta = true; ocupada = false; giro.v = 0;
  }
  async function cierra() {
    if (!abierta || ocupada) return; ocupada = true;
    cancela('campoG'); frenaGiro(); tween('campoG', estado.campoG, 0, 0.9, ease.out);
    tween('dolly', 1, 0, 1.8 * F, ease.io);
    tween('campo', estado.campo, 1, 0.5 * F, ease.out);
    tween('luz', 1, 0, 1.0 * F, ease.out, 0.3 * F);
    tween('giro', 1, 0, 1.15 * F, ease.atrae, 0.15 * F);
    await tween('abre', 1, 0, 1.2 * F, ease.atrae, 0.2 * F);
    if (!quieto) tween('golpe', 1, 0, 0.35, ease.out);
    tween('campo', 1, 0, 0.45 * F, ease.out);
    await tween('sello', 1, 0, 0.5 * F, ease.out);
    abierta = false; ocupada = false;
  }

  const mira = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!quieto) addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; mira.tx = e.clientX / innerWidth - 0.5; mira.ty = e.clientY / innerHeight - 0.5; });
  // Dueño, 15:11: «que si la persona con el móvil desliza pueda ver 180 grados la roca holográfica… un recorrido por toda la página
  // web, no de alto y de bajo, solamente hacia los lados». Deslizar a los lados en cualquier parte de la página (no sobre un botón,
  // un panel o la tabla) gira la roca: el ancho de la pantalla son 180 grados, con inercia y un tope suave a 90 grados por cada lado.
  // Arriba y abajo sigue siendo la página. Si nadie la toca en un rato, vuelve despacio de frente; al abrirla, de frente.
  const GIRO_MAX = Math.PI / 2;
  const giro = { v: 0, obj: 0, vel: 0, dedo: null, x0: 0, y0: 0, g0: 0, lado: 0, ux: 0, ut: 0, toque: -99 };
  const noGira = (t) => !!(t && t.closest && t.closest('button, a, input, textarea, select, label, video, dialog, .panel, .sala, .aviso, .tabla, [data-no-gira]'));
  addEventListener('pointerdown', (e) => {
    if (giro.dedo !== null || (e.pointerType === 'mouse' && e.button !== 0) || noGira(e.target) || abierta || ocupada || pausado) return;
    giro.dedo = e.pointerId; giro.x0 = giro.ux = e.clientX; giro.y0 = e.clientY; giro.g0 = giro.obj; giro.lado = 0; giro.vel = 0; giro.ut = performance.now();
  }, { passive: true });
  addEventListener('pointermove', (e) => {
    if (e.pointerId !== giro.dedo) return;
    const dx = e.clientX - giro.x0, dy = e.clientY - giro.y0;
    if (!giro.lado) { if (Math.hypot(dx, dy) < 8) return; if (Math.abs(dx) < Math.abs(dy) * 1.15) { giro.dedo = null; return; } giro.lado = 1; }
    const ancho = Math.max(320, innerWidth);
    let g = giro.g0 + (dx / ancho) * Math.PI;
    if (g > GIRO_MAX) g = GIRO_MAX + (g - GIRO_MAX) * 0.25; else if (g < -GIRO_MAX) g = -GIRO_MAX + (g + GIRO_MAX) * 0.25;
    giro.obj = g;
    const t = performance.now(), d = Math.max(8, t - giro.ut);
    giro.vel = giro.vel * 0.5 + (((e.clientX - giro.ux) / ancho) * Math.PI * 1000 / d) * 0.5; giro.ux = e.clientX; giro.ut = t;
    giro.toque = ahora;
  }, { passive: true });
  const suelta = (e) => {
    if (e.pointerId !== giro.dedo) return;
    giro.dedo = null;
    if (giro.lado) { giro.obj = Math.max(-GIRO_MAX, Math.min(GIRO_MAX, giro.obj + Math.max(-3, Math.min(3, giro.vel)) * 0.16)); giro.toque = ahora; }
  };
  addEventListener('pointerup', suelta, { passive: true }); addEventListener('pointercancel', suelta, { passive: true });
  // el ciclo de la luz del holograma: claro, el paso a oscuro, oscuro y el paso de vuelta (segundos)
  // (dueño, 15:55: «el cambio de color de la roca, que sea cada 3 segundos, que se sienta viva»: un cambio cada 3 segundos)
  const CICLO = { claro: 1.4, paso: 1.6, oscuro: 1.4 }; CICLO.total = CICLO.claro + CICLO.oscuro + 2 * CICLO.paso;
  let holoFijo = null, autoPeso = 1;
  // Vida propia (dueño, 15:59: «aparte de cambiar de color, que se separe y vuelva a su estado original, que se separe cada vez de una
  // forma distinta… que tenga vida propia»): cada pocos segundos, con la roca cerrada, se abre un poco y se vuelve a juntar, cada vez
  // de una manera: las cuatro partes hacia fuera, arriba y abajo, a los lados girando, en diagonal, abriéndose en espiral o un latido.
  const VIDAS = [
    (sx, sy) => [sx * 0.07, sy * 0.05, 0, 0, 0, 0],
    (sx, sy) => [0, sy * 0.11, 0, -sy * 0.06, 0, 0],
    (sx, sy) => [sx * 0.13, 0, 0, 0, -sx * 0.18, 0],
    (sx, sy) => (sx * sy > 0 ? [sx * 0.1, sy * 0.08, 0.05, 0, 0, sx * 0.08] : [sx * 0.02, sy * 0.02, -0.03, 0, 0, 0]),
    (sx, sy) => [sx * 0.05, sy * 0.04, sx * sy * 0.06, sy * 0.12, sx * 0.25, 0],
    (sx, sy) => [sx * 0.035, sy * 0.03, 0, 0, 0, 0],
  ];
  const vidaD = new Map(), CERO6 = [0, 0, 0, 0, 0, 0];
  let vidaI = -1, vidaSig = 3.5, vidaFija = false;
  function ponVida(i, k) { for (const m of cuartos) { const { sx, sy } = m.userData; vidaD.set(m, VIDAS[i](sx, sy).map((v) => v * k)); } }
  function nuevaVida() {
    let i; do { i = Math.floor(Math.random() * VIDAS.length); } while (i === vidaI); vidaI = i;
    ponVida(i, 0.8 + Math.random() * 0.5);
    const latido = i === 5;
    tween('vida', 0, 1, latido ? 0.3 : 0.9 + Math.random() * 0.5, latido ? ease.out : ease.iman)
      .then(() => tween('vida', 1, 0, latido ? 0.55 : 1.1 + Math.random() * 0.5, ease.atrae, latido ? 0 : 0.25 + Math.random() * 0.6));
  }
  let antes = performance.now(), vivo = true, pausado = false;
  const delta = () => { const t = performance.now(), d = (t - antes) / 1000; antes = t; return d; };
  document.addEventListener('visibilitychange', () => { vivo = document.visibilityState === 'visible'; if (vivo) delta(); });

  // la resolución se adapta: si no llega al ritmo, baja; si va holgada un rato, sube (hasta el máximo de su nivel); en lo más bajo, y
  // si aún no llega, sin resplandor ni grano
  let med = 1 / 60, cuenta = 0, holgado = 0, tCal = 0;
  const OBJ = NIVEL === 0 ? 1 / 30 : 1 / 60;
  function calidad(real) {
    if (real > 0.25 || ++cuenta < 90) return; // los primeros cuadros compilan
    med += (real - med) * 0.06;
    if (ahora - tCal < 1.6) return; tCal = ahora;
    let nuevo = PR;
    if (med > OBJ * 1.3 && PR > PR_MIN + 0.01) { nuevo = Math.max(PR_MIN, PR * 0.84); holgado = 0; }
    else if (med > OBJ * 1.55 && resplandor.enabled) { resplandor.enabled = false; grano.enabled = false; }
    else if (med < OBJ * 1.08) { if (++holgado >= 3 && PR < PR_MAX - 0.01) { nuevo = Math.min(PR_MAX, PR * 1.12); holgado = 0; } }
    else holgado = 0;
    if (Math.abs(nuevo - PR) > 0.01) { PR = nuevo; renderer.setPixelRatio(PR); comp.setPixelRatio(PR); ajusta(); }
  }
  // en equipos modestos, 30 cuadros por segundo; al bajar por la página (la sala queda tapada), quieta
  const MIN_MS = NIVEL === 0 ? 1000 / 31 : 0;
  let ultimo = 0;
  function cuadro(tq) {
    requestAnimationFrame(cuadro);
    if (!vivo || pausado) return;
    if (scrollY > innerHeight * 1.05 && !tramos.length) { antes = performance.now(); return; }
    tq = tq || performance.now();
    if (MIN_MS && tq - ultimo < MIN_MS) return;
    ultimo = tq;
    const real = delta(), dt = Math.min(real, DT_MAX); ahora += dt;
    calidad(real);
    for (let i = tramos.length - 1; i >= 0; i--) { const x = tramos[i]; if (ahora < x.t0) continue; const p = Math.min(1, (ahora - x.t0) / x.dur); x.set(x.e(p)); if (p >= 1) { tramos.splice(i, 1); x.res(); } }
    // la roca flota y gira muy poco; al abrir, la fisura destella, se parte en cuatro y los cuartos se apartan girando
    mono.position.y = Y0 + (quieto ? 0 : Math.sin(ahora * 0.6) * 0.02);
    if (giro.dedo === null) {
      if (giro.obj > GIRO_MAX) giro.obj += (GIRO_MAX - giro.obj) * Math.min(1, dt * 8); else if (giro.obj < -GIRO_MAX) giro.obj += (-GIRO_MAX - giro.obj) * Math.min(1, dt * 8);
      if (ahora - giro.toque > 9) giro.obj *= Math.exp(-dt * 0.45);
    }
    giro.v += (giro.obj - giro.v) * Math.min(1, dt * (giro.dedo === null ? 4 : 16));
    estado.vuelta += dt * VMAX * estado.giroG;
    // y gira sola, a un lado y a otro (dueño, 16:53: «que se mueva sola, que rote, a izquierda, a derecha, aparte de que si yo la quiero
    // rotar»): mientras se toca, y un rato después, manda el dedo; luego vuelve poco a poco su propio giro
    autoPeso += ((giro.dedo !== null || ahora - giro.toque < 6 ? 0 : 1) - autoPeso) * Math.min(1, dt * 0.7);
    const propio = quieto ? 0 : (Math.sin(ahora * 0.42) * 0.78 + Math.sin(ahora * 1.07 + 1.3) * 0.12) * autoPeso;
    mono.rotation.y = (giro.v + propio) * Math.max(0, 1 - estado.abre) + estado.vuelta;
    halo.rotation.y = nucleo.rotation.y = -mono.rotation.y; // la luz de dentro, siempre de frente
    campoGravitatorio(dt);
    const sep = 0.44 * estado.abre, sepY = 0.3 * estado.abre;
    const zum = estado.zumbido * 0.0022 * Math.sin(ahora * 95), golpe = estado.golpe * 0.004 * Math.sin(ahora * 70);
    if (!quieto && !vidaFija && !abierta && !ocupada && estado.abre < 0.001 && giro.dedo === null && ahora > vidaSig && !tramos.some((x) => x.k === 'vida')) { nuevaVida(); vidaSig = ahora + 3.4 + Math.random() * 3.4; }
    const partido = estado.abre > 0.002 || estado.vida > 0.002, fv = estado.vida;
    for (const m of cuartos) { const { sx, sy } = m.userData, v = vidaD.get(m) || CERO6; m.userData.corte.visible = partido; m.position.set(sx * (sep + zum + golpe) + v[0] * fv, sy * (sepY + (zum + golpe) * 0.6) + v[1] * fv, v[2] * fv); m.rotation.set(-sy * 0.09 * estado.giro + v[3] * fv, -sx * 0.28 * estado.giro + v[4] * fv, v[5] * fv); }
    // campo: visible mientras hay separación o zumbido; parpadea un poco, como una descarga
    const vCampo = estado.campo * (0.75 + 0.25 * Math.sin(ahora * 23) * Math.sin(ahora * 7.3));
    matCampo.opacity = vCampo * 0.85; matChispa.opacity = vCampo;
    if (vCampo > 0.002) {
      const s2 = Math.max(sep, 0.004);
      for (const L of lineas) {
        curva(L, s2 + 0.01 * Math.sin(ahora * 3 + L.fase));
        const a = L.l.geometry.attributes.position;
        for (let j = 0; j < MP; j++) { bez(j / (MP - 1), Q); a.array[j * 3] = Q.x; a.array[j * 3 + 1] = Q.y; a.array[j * 3 + 2] = Q.z; }
        a.needsUpdate = true;
      }
      if (NCH) { const a = chG.attributes.position; for (let i = 0; i < NCH; i++) { chU[i] = (chU[i] + chV[i] * dt * (0.6 + estado.campo)) % 1; curva(lineas[chL[i]], s2); bez(chU[i], Q); a.array[i * 3] = Q.x; a.array[i * 3 + 1] = Q.y; a.array[i * 3 + 2] = Q.z; } a.needsUpdate = true; }
    }
    const pulso = quieto ? 0.85 : 0.7 + Math.sin(ahora * 1.3) * 0.22;
    matSello.opacity = Math.max(0, 1 - estado.abre * 2.5) * estado.sello;
    matSelloH.opacity = Math.max(0, 1 - estado.abre * 2.5) * estado.sello;
    matNucleo.opacity = estado.luz; nucleo.scale.x = 1 + estado.luz * 1.5;
    matHalo.opacity = 0.55 * estado.luz;
    luzNucleo.intensity = 30 * estado.luz; luzNucleo2.intensity = 18 * estado.luz + 9 * estado.campoG;
    // cámara: deriva lenta, mirada y avance hacia la luz
    mira.x += (mira.tx - mira.x) * 0.035; mira.y += (mira.ty - mira.y) * 0.035;
    const d = estado.dolly;
    const dx = quieto ? 0 : Math.sin(ahora * 0.19) * 0.06, dy = quieto ? 0 : Math.cos(ahora * 0.15) * 0.035;
    camara.position.set(CAM.x + mira.x * 0.5 * (1 - d) + dx * (1 - d), CAM.y - mira.y * 0.3 * (1 - d) + dy * (1 - d) + d * 0.32, CAM.z - d * (retrato ? 0.5 : 2.0));
    camara.lookAt(0, 1.95 + d * 0.06, Z0 - 0.4);
    if (N) { const a = polvoG.attributes.position; for (let i = 0; i < N; i++) { let y = a.array[i * 3 + 1] + vel[i] * dt * 0.3; if (y > AL - 0.2) y = 0.1; a.array[i * 3 + 1] = y; a.array[i * 3] += Math.sin(ahora * 0.25 + i) * 0.0003; } a.needsUpdate = true; }
    if (!quieto) { grano.uniforms.semilla.value = (ahora * 61.7) % 997; uHolo.t.value = ahora; }
    uHolo.brillo.value = 1 + 0.6 * estado.sello;
    // de luz a oscuro y vuelta: el frente sube (lo oscuro llega desde abajo) y luego baja (la luz vuelve desde arriba)
    if (holoFijo !== null) uHolo.nivel.value = holoFijo;
    else if (!quieto) {
      const c = ahora % CICLO.total, p1 = CICLO.claro, p2 = p1 + CICLO.paso, p3 = p2 + CICLO.oscuro;
      if (c < p1) { uHolo.nivel.value = -0.2; uHolo.sube.value = 1; }
      else if (c < p2) { uHolo.nivel.value = -0.2 + 1.4 * ease.suave((c - p1) / CICLO.paso); uHolo.sube.value = 1; }
      else if (c < p3) { uHolo.nivel.value = 1.2; uHolo.sube.value = -1; }
      else { uHolo.nivel.value = 1.2 - 1.4 * ease.suave((c - p3) / CICLO.paso); uHolo.sube.value = -1; }
    }
    const nh = uHolo.nivel.value, oscura = Math.min(1, Math.max(0, nh)), filo = Math.max(0, Math.min(1, (nh + 0.1) / 0.15, (1.1 - nh) / 0.15));
    uHolo.paso.value = filo;
    uHolo.ambiente.value = 1 - 0.55 * oscura + 0.35 * filo;
    if (motas.charco) motas.charco.material.color.copy(motas.cc).multiplyScalar(1 - 0.6 * oscura + 0.5 * filo);
    if (motas.mat) motas.mat.opacity = 0.55 * (1 - 0.5 * oscura + 0.4 * filo);
    luzHolo.intensity = (3.2 * (1 - 0.65 * oscura) + 2.5 * estado.sello + 2.4 * filo) * (0.95 + 0.05 * Math.sin(ahora * 37) * Math.sin(ahora * 11.3));
    if (motas.g && !quieto) { const a = motas.g.attributes.position; for (let k = 0; k < a.count; k++) { let y = a.array[k * 3 + 1] + motas.v[k] * dt; if (y > Y0 + ALTO / 2) y = 0.02; a.array[k * 3 + 1] = y; } a.needsUpdate = true; }
    comp.render();
  }
  requestAnimationFrame(cuadro);
  // la sala de la conversación tapa el 3D: mientras tanto, quieto (sin gastar la tarjeta gráfica durante la videollamada)
  const pausa = (si) => { pausado = !!si; if (!pausado) delta(); };
  return { abre, cierra, pausa, abierta: () => abierta,
    // para las pruebas y la imagen de la invitación: la calidad elegida, girar la roca y fijar la luz del holograma (null: el ciclo)
    calidad: () => ({ nivel: NIVEL, pr: +PR.toFixed(2), ms: +(med * 1000).toFixed(1), resplandor: resplandor.enabled, gpu }),
    gira: (g) => { giro.obj = giro.v = g; giro.toque = ahora; }, holo: (n) => { holoFijo = n == null ? null : +n; },
    vida: (i) => { if (i == null) { vidaFija = false; return; } vidaFija = true; cancela('vida'); ponVida(i, 1); estado.vida = 1; } };
}

let api = null;
// «?sin3d»: la portada sin la sala en 3D (equipos lentos y pruebas automáticas); se ve el monolito en CSS
try { api = new URLSearchParams(location.search).has('sin3d') ? null : arranca(); } catch (e) { console.warn('3D no disponible', e); api = null; }
if (api) { document.documentElement.classList.add('con-3d'); window.Sala3D = api; document.dispatchEvent(new CustomEvent('elixire-3d')); }
