// Elixire · la sala y el monolito (19 nov 2026).
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
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
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
  const PR = Math.min(devicePixelRatio || 1, ligero ? 1.25 : 1.5); // con MSAA, más resolución apenas se nota y cuesta mucho
  renderer.setPixelRatio(PR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
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
  const AN = 12, AL = 4.5, FONDO = -5.2, FRENTE = 7.6; // ancho, alto, pared del fondo y pared de delante (detrás de quien mira)
  const LARGO = FRENTE - FONDO, ZM = (FRENTE + FONDO) / 2;
  const PX = 2.4, PY = 1.5; // paneles del encofrado
  const Y_LINEA = 1.5; // la junta de luz, a la altura de los ojos (coincide con la junta entre paneles)
  const ZOC = 0.1; // zócalo de acero
  const ANCHO = 1.28, ALTO = 2.8, PROF = 0.6, Y0 = 2.06, Z0 = -2.0; // la roca
  const RD = 1.2; // el disco de acero pulido enrasado en el suelo, bajo la roca
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
    const W = ligero ? 1024 : 2048, H = Math.round((W * 3) / 4.8), k = W / 4.8; // k: píxeles por metro
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
    for (let n = 0; n < (ligero ? 2600 : 9000); n++) {
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
  const perfil = (y) => (0.05 + 0.85 * gau(y, Y_LINEA, y > Y_LINEA ? 0.48 : 0.34) + 0.34 * gau(y, ZOC + 0.03, 0.16)) * (1 - 0.3 * Math.exp(-(AL - y) / 0.35));
  function luzMuro(x, y, z, cual) {
    if (cual === 'fondo') return (perfil(y) + 0.38 * Math.exp(-(AL - y) / 1.1) + 0.24 * gau(x, 0, 2.3) * gau(y, 2.9, 1.25)) * rincon(AN / 2 - Math.abs(x));
    if (cual === 'frente') return perfil(y) * rincon(AN / 2 - Math.abs(x));
    return (perfil(y) + 0.14 * gau(z, LZC, 3.2) * (y / AL) + 0.1 * Math.exp(-(AL - y) / 1.2) * gau(z, FONDO, 1.2)) * rincon(z - FONDO) * rincon(FRENTE - z);
  }
  function luzTecho(x, z) {
    const qx = Math.abs(x) - LX / 2, qz = Math.abs(z - LZC) - LZ / 2, d = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
    return (0.05 + 0.75 * Math.exp(-d / 0.38) + 0.5 * Math.exp(-Math.max(z - FONDO - 0.22, 0) / 0.32)) * rincon(AN / 2 - Math.abs(x)) * rincon(z - FONDO) * rincon(FRENTE - z);
  }
  const matHormigon = (luz, tono) => new THREE.MeshStandardMaterial({ map: hormigon, bumpMap: hormigon, bumpScale: 1.4, color: tono || 0xffffff, roughness: 0.8, metalness: 0, lightMap: luz, lightMapIntensity: 0.95 });
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
    const h = new THREE.Path(); h.moveTo(-LX / 2, LZC - LZ / 2); h.lineTo(-LX / 2, LZC + LZ / 2); h.lineTo(LX / 2, LZC + LZ / 2); h.lineTo(LX / 2, LZC - LZ / 2); h.lineTo(-LX / 2, LZC - LZ / 2);
    s.holes.push(h);
    const geo = new THREE.ShapeGeometry(s), p = geo.attributes.position, uv = new Float32Array(p.count * 2), uv1 = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getY(i); uv[i * 2] = (x + AN / 2) / (2 * PX); uv[i * 2 + 1] = (z - FONDO) / (2 * PX); uv1[i * 2] = (x + AN / 2) / AN; uv1[i * 2 + 1] = (z - FONDO) / LARGO; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('uv1', new THREE.BufferAttribute(uv1, 2));
    const techo = new THREE.Mesh(geo, matHormigon(mapaLuz(192, 208, (u, v) => luzTecho(-AN / 2 + u * AN, FONDO + v * LARGO)), 0x9aa0a6));
    techo.rotation.x = Math.PI / 2; techo.position.y = AL; escena.add(techo);
  }

  // ---------------- el suelo: piedra negra pulida ----------------
  // un espejo oscurecido y, encima, la piedra satinada con sus losas de 2,4 m (refleja como piedra pulida, no como un espejo)
  const espejo = new Reflector(new THREE.PlaneGeometry(AN, LARGO), { clipBias: 0.003, textureWidth: 1, textureHeight: 1, color: 0x7d838b, multisample: ligero ? 0 : 4 });
  espejo.rotation.x = -Math.PI / 2; espejo.position.set(0, 0, ZM); escena.add(espejo);
  function texLosas() {
    const N = ligero ? 512 : 1024, k = N / 4.8, [c, g] = lienzo2d(N, N);
    g.fillStyle = 'rgba(8,9,12,.6)'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = `rgba(9,11,14,${0.02 + az() * 0.07})`; g.fillRect((i * N) / 2, (j * N) / 2, N / 2, N / 2); }
    g.filter = `blur(${Math.round(k * 0.08)}px)`;
    for (let n = 0; n < 60; n++) { g.fillStyle = `rgba(${az() < 0.5 ? '30,34,40' : '4,5,6'},${az() * 0.08})`; const r = k * (0.1 + az() * 0.5); g.beginPath(); g.ellipse(az() * N, az() * N, r * 2, r * 0.6, az() * 3.14, 0, 6.283); g.fill(); }
    g.filter = 'none';
    g.strokeStyle = 'rgba(1,2,3,.95)'; g.lineWidth = Math.max(2, k * 0.006);
    for (const x of [0, N / 2, N]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, N); g.stroke(); }
    for (const y of [0, N / 2, N]) { g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO;
    const r = LARGO / (2 * PX); t.repeat.set(AN / (2 * PX), r); t.offset.set(0, Math.ceil(r * 2 - 1e-6) / 2 - r); // juntas alineadas con el fondo
    return t;
  }
  const piedra = new THREE.Mesh(new THREE.PlaneGeometry(AN, LARGO), new THREE.MeshPhysicalMaterial({ map: texLosas(), transparent: true, roughness: 0.4, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.2 }));
  piedra.rotation.x = -Math.PI / 2; piedra.position.set(0, 0.002, ZM); piedra.receiveShadow = true; escena.add(piedra);

  // ---------------- acero ----------------
  const matAcero = new THREE.MeshPhysicalMaterial({ color: 0xcdd2d8, metalness: 1, roughness: 0.07 });
  const matLama = new THREE.MeshStandardMaterial({ color: 0x16181b, metalness: 1, roughness: 0.42 });
  // zócalo de acero pulido
  const zocalo = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, ZOC, d), matAcero); m.position.set(x, ZOC / 2, z); m.receiveShadow = true; escena.add(m); };
  const E = 0.014;
  zocalo(AN, E, 0, FONDO + E / 2); zocalo(AN, E, 0, FRENTE - E / 2); zocalo(E, LARGO, -AN / 2 + E / 2, ZM); zocalo(E, LARGO, AN / 2 - E / 2, ZM);
  // aletas de acero pulido en las juntas de los paneles: dos en el fondo (enmarcan la roca), dos delante y cinco en cada lado
  {
    const pos = [[-3 * PX / 2, FONDO + 0.08, 0], [3 * PX / 2, FONDO + 0.08, 0], [-3 * PX / 2, FRENTE - 0.08, 0], [3 * PX / 2, FRENTE - 0.08, 0]];
    for (let z = FONDO + PX; z < FRENTE - 0.3; z += PX) pos.push([-AN / 2 + 0.08, z, 1], [AN / 2 - 0.08, z, 1]);
    const aletas = new THREE.InstancedMesh(new RoundedBoxGeometry(0.06, AL - 0.004, 0.16, 3, 0.012), matAcero, pos.length);
    const M = new THREE.Matrix4(), R = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    pos.forEach(([x, z, lado], i) => { M.makeTranslation(x, AL / 2, z); if (lado) M.multiply(R); aletas.setMatrixAt(i, M); });
    escena.add(aletas);
  }

  // ---------------- las líneas de luz ----------------
  const matLinea = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe9f2fb).multiplyScalar(2.4), toneMapped: false });
  const linea = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLinea); m.position.set(x, y, z); escena.add(m); };
  for (const [y, h] of [[Y_LINEA, 0.022], [ZOC + 0.008, 0.008]]) {
    linea(AN, h, 0.01, 0, y, FONDO + 0.004); linea(AN, h, 0.01, 0, y, FRENTE - 0.004);
    linea(0.01, h, LARGO, -AN / 2 + 0.004, y, ZM); linea(0.01, h, LARGO, AN / 2 - 0.004, y, ZM);
  }
  // bañador de pared: una ranura de luz en el techo, a lo largo del fondo
  const matRanura = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe9f2fb).multiplyScalar(1.7), toneMapped: false });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(AN - 0.1, 0.05), matRanura); m.rotation.x = Math.PI / 2; m.position.set(0, AL - 0.003, FONDO + 0.22); escena.add(m); }
  // y la luz que de verdad dan: una tira de área por pared, a la altura de la junta
  const tira = (w, x, z, mx, mz) => { const a = new THREE.RectAreaLight(0xe8f1fa, 3, w, 0.05); a.position.set(x, Y_LINEA, z); a.lookAt(mx, Y_LINEA, mz); escena.add(a); };
  tira(AN, 0, FONDO + 0.03, 0, 0); tira(AN, 0, FRENTE - 0.03, 0, 0); tira(LARGO, -AN / 2 + 0.03, ZM, 0, ZM); tira(LARGO, AN / 2 - 0.03, ZM, 0, ZM);
  escena.add(new THREE.HemisphereLight(0x3a4452, 0x050607, 0.08));

  // ---------------- la luminaria del techo ----------------
  // Un cajón empotrado de acero pulido: arriba, un difusor de tela tensada iluminado por detrás; dentro, lamas finas de acero
  // grafito que ordenan la luz; abajo, un marco de acero pulido enrasado con el techo. Ilumina la roca desde arriba y algo por detrás.
  const lum = new THREE.Group(); lum.position.set(0, AL, LZC); escena.add(lum);
  function texDifusor() {
    const [c, g] = lienzo2d(512, 160);
    const r = g.createRadialGradient(256, 80, 10, 256, 80, 300); r.addColorStop(0, '#ffffff'); r.addColorStop(1, '#c9ced4'); g.fillStyle = r; g.fillRect(0, 0, 512, 160);
    g.globalAlpha = 0.05; for (let x = 0; x < 512; x += 3) { g.fillStyle = x % 6 ? '#000' : '#fff'; g.fillRect(x, 0, 1, 160); } g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const matDifusor = new THREE.MeshBasicMaterial({ map: texDifusor(), color: new THREE.Color(0xeef5fc).multiplyScalar(1.9), toneMapped: false });
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(LX, LZ), matDifusor); m.rotation.x = Math.PI / 2; m.position.y = LH; lum.add(m); }
  // las paredes del cajón: acero pulido que repite el difusor (más claro arriba, junto a la luz)
  function texCajon() {
    const [c, g] = lienzo2d(8, 256); const v = g.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, '#ffffff'); v.addColorStop(0.35, '#9aa2ab'); v.addColorStop(0.8, '#2a2f35'); v.addColorStop(1, '#0d0f12'); g.fillStyle = v; g.fillRect(0, 0, 8, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const matCajon = new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 1, roughness: 0.1, emissive: 0xdfe9f4, emissiveMap: texCajon(), emissiveIntensity: 1.25 });
  for (const [w, x, z, ry] of [[LX, 0, -LZ / 2, 0], [LX, 0, LZ / 2, Math.PI], [LZ, -LX / 2, 0, Math.PI / 2], [LZ, LX / 2, 0, -Math.PI / 2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, LH), matCajon); m.position.set(x, LH / 2, z); m.rotation.y = ry; lum.add(m);
  }
  {
    const NL = Math.round(LX / 0.16), lamas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.005, 0.12, LZ - 0.004), matLama, NL - 1), M = new THREE.Matrix4();
    for (let i = 1; i < NL; i++) { M.makeTranslation(-LX / 2 + (i * LX) / NL, 0.09, 0); lamas.setMatrixAt(i - 1, M); }
    lum.add(lamas);
    const marco = (w, d, x, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, 0.016, d, 2, 0.006), matAcero); m.position.set(x, -0.005, z); lum.add(m); };
    marco(LX + 0.12, 0.06, 0, -LZ / 2 - 0.03); marco(LX + 0.12, 0.06, 0, LZ / 2 + 0.03); marco(0.06, LZ, -LX / 2 - 0.03, 0); marco(0.06, LZ, LX / 2 + 0.03, 0);
  }
  const areaLum = new THREE.RectAreaLight(0xeaf2fb, 3.4, LX, LZ); areaLum.position.set(0, AL - 0.012, LZC); areaLum.lookAt(0, 0, LZC); escena.add(areaLum);
  // la luz que da la sombra de la roca sobre la peana y el suelo, desde la luminaria
  const cenital = new THREE.SpotLight(0xeaf2fb, 44, 0, 0.42, 0.85, 2); cenital.position.set(0, AL + 0.2, LZC + 0.45); cenital.target.position.set(0, 0, Z0 + 0.2);
  cenital.castShadow = true; cenital.shadow.mapSize.set(ligero ? 1024 : 2048, ligero ? 1024 : 2048); cenital.shadow.radius = 6; cenital.shadow.bias = -0.0004; cenital.shadow.normalBias = 0.02;
  cenital.shadow.camera.near = 0.5; cenital.shadow.camera.far = 9; escena.add(cenital, cenital.target);

  // ---------------- bajo la roca: un disco de acero pulido enrasado en el suelo, con un anillo de luz ----------------
  {
    const disco = new THREE.Mesh(new THREE.CylinderGeometry(RD, RD, 0.012, 128), matAcero); disco.position.set(0, 0.006, Z0); disco.receiveShadow = true; escena.add(disco);
    const anillo = new THREE.Mesh(new THREE.RingGeometry(RD + 0.012, RD + 0.026, 160), matLinea); anillo.rotation.x = -Math.PI / 2; anillo.position.set(0, 0.004, Z0); escena.add(anillo);
  }
  // ---------------- la roca de obsidiana ----------------
  // Una losa de piedra tallada a golpes: caras planas que se cortan en aristas vivas, cada una con las ondas finas de la fractura
  // concoidea; negro vítreo con capa de brillo. Al abrirse, se parte en dos por una fisura de luz.
  // el pulido no es igual en toda la piedra: zonas algo más mates entre otras de espejo (canal verde: rugosidad)
  function texPulido(n) {
    const [c, g] = lienzo2d(n, n); g.fillStyle = 'rgb(0,46,0)'; g.fillRect(0, 0, n, n);
    g.filter = `blur(${Math.round(n / 28)}px)`;
    for (let k = 0; k < 26; k++) { g.fillStyle = `rgba(0,${70 + Math.round(az() * 60)},0,${0.25 + az() * 0.4})`; const r = n * (0.04 + az() * 0.16); g.beginPath(); g.ellipse(az() * n, az() * n, r * 1.6, r, az() * 3.14, 0, 6.283); g.fill(); }
    g.filter = 'none';
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  // los puntos de una caja con la silueta algo irregular, tallados por planos (cada plano, una lasca): su envolvente convexa da
  // caras planas de verdad, con aristas rectas y vivas
  function puntosRoca() {
    const planos = [];
    const plano = (n, corte) => { n.normalize(); const apoyo = (Math.abs(n.x) * ANCHO) / 2 + (Math.abs(n.y) * ALTO) / 2 + (Math.abs(n.z) * PROF) / 2; planos.push({ n, d: apoyo * (1 - corte) }); };
    for (const z of [1, -1]) for (let k = 0; k < 8; k++) plano(new THREE.Vector3((az() * 2 - 1) * 0.85, (az() * 2 - 1) * 0.55, z), 0.05 + az() * 0.2);
    for (const x of [1, -1]) for (let k = 0; k < 6; k++) plano(new THREE.Vector3(x, (az() * 2 - 1) * 0.6, (az() * 2 - 1) * 0.95), 0.06 + az() * 0.18);
    for (let k = 0; k < 6; k++) plano(new THREE.Vector3((az() * 2 - 1) * 1.5, 1, (az() * 2 - 1) * 1.5), 0.04 + az() * 0.14);
    for (let k = 0; k < 3; k++) plano(new THREE.Vector3((az() * 2 - 1) * 1.1, -1, (az() * 2 - 1) * 1.1), 0.02 + az() * 0.07);
    for (let k = 0; k < 18; k++) plano(new THREE.Vector3(az() * 2 - 1, (az() * 2 - 1) * 0.85, az() * 2 - 1), 0.1 + az() * 0.22);
    const pts = [], N = 18;
    const pon = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z), u = y / ALTO + 0.5;
      v.x *= 1 - 0.1 * u; v.z *= 1 - 0.07 * u; // algo más estrecha arriba
      for (let vuelta = 0; vuelta < 3; vuelta++) for (const P of planos) { const e = v.dot(P.n) - P.d; if (e > 0) v.addScaledVector(P.n, -e); }
      pts.push(v);
    };
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N * 2; j++) {
      const a = i / N - 0.5, b = j / (N * 2) - 0.5;
      pon(a * ANCHO, b * ALTO, PROF / 2); pon(a * ANCHO, b * ALTO, -PROF / 2); pon(ANCHO / 2, b * ALTO, a * PROF); pon(-ANCHO / 2, b * ALTO, a * PROF);
    }
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) { const a = i / N - 0.5, b = j / N - 0.5; pon(a * ANCHO, ALTO / 2, b * PROF); pon(a * ANCHO, -ALTO / 2, b * PROF); }
    return pts;
  }
  const conUV = (g) => { const p = g.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) * 0.55 + p.getZ(i) * 0.8; uv[i * 2 + 1] = p.getY(i) * 0.55; } g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; };
  const PUNTOS = puntosRoca();
  // media roca: la envolvente de los puntos de un lado más los del otro llevados al plano del corte (x = 0): la cara del corte, plana
  const mitadDe = (signo) => conUV(new ConvexGeometry(PUNTOS.map((q) => new THREE.Vector3(signo > 0 ? Math.max(q.x, 0) : Math.min(q.x, 0), q.y, q.z))));
  const matObsidiana = new THREE.MeshPhysicalMaterial({
    color: 0x040405, metalness: 0, roughness: 0.24, roughnessMap: texPulido(256), ior: 1.49, specularIntensity: 1,
    clearcoat: 1, clearcoatRoughness: 0.012,
  });
  const geoRoca = conUV(new ConvexGeometry(PUNTOS));
  const mono = new THREE.Group(); mono.position.set(0, Y0, Z0); escena.add(mono);
  const mitad = (signo) => { const m = new THREE.Mesh(mitadDe(signo), matObsidiana); m.castShadow = true; m.receiveShadow = true; mono.add(m); return m; };
  const mIzq = mitad(-1), mDer = mitad(1);
  // la fisura de luz por donde se parte: sigue la cara de delante de la piedra
  const matSello = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd6e8f8).multiplyScalar(1.6), toneMapped: false, transparent: true });
  const sello = (() => {
    const rc = new THREE.Raycaster(), pts = [], o = new THREE.Vector3(), d = new THREE.Vector3(0, 0, -1), aux = new THREE.Mesh(geoRoca);
    for (let y = -ALTO / 2 + 0.05; y <= ALTO / 2 - 0.05; y += 0.025) { o.set(0, y, 2); rc.set(o, d); const h = rc.intersectObject(aux)[0]; if (h) pts.push(new THREE.Vector3(0, y, h.point.z + 0.0035)); }
    if (pts.length < 2) pts.push(new THREE.Vector3(0, -1, PROF / 2), new THREE.Vector3(0, 1, PROF / 2));
    return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 2), 0.0024, 6, false), matSello);
  })();
  mono.add(sello);
  const marca = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); marca.visible = false; mono.add(marca);
  // dentro: una hoja de luz y su halo
  const matNucleo = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd6e8f8).multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0 });
  const nucleo = new THREE.Mesh(new THREE.PlaneGeometry(0.022, ALTO - 0.3), matNucleo); mono.add(nucleo);
  const texHalo = (() => { const [c, g] = lienzo2d(128, 256), r = g.createRadialGradient(64, 128, 0, 64, 128, 128); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 256); return new THREE.CanvasTexture(c); })();
  const matHalo = new THREE.MeshBasicMaterial({ map: texHalo, color: 0x9cc3e4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.4, ALTO + 0.6), matHalo); halo.position.z = -0.01; mono.add(halo);
  const luzNucleo = new THREE.RectAreaLight(0xcfe3f6, 0, 0.1, ALTO - 0.3); luzNucleo.position.set(0, 0, 0.05); mono.add(luzNucleo);
  const luzNucleo2 = new THREE.PointLight(0xbfdcf5, 0, 14, 2); luzNucleo2.position.set(0, 0, 0.7); mono.add(luzNucleo2);

  // ---------------- lo que reflejan el acero y la obsidiana: la propia sala ----------------
  // Vistas en cubo de la sala desde donde está la roca (sin la roca), con las luces más intensas solo para esas vistas: como en una
  // foto, la piedra negra y el acero pulido reflejan sobre todo las luces. Para la obsidiana, además, como en un estudio de fotografía
  // de joyería: delante de la roca (detrás de quien mira), un panel negro con tiras finas de luz, y dos tiras altas a los lados. Cada
  // cara de la talla, con su inclinación, recoge las tiras en un sitio distinto: las caras quedan negras y las aristas se leen.
  {
    const brillan = [matLinea, matDifusor, matRanura]; for (const m of brillan) m.color.multiplyScalar(3);
    const e0 = matCajon.emissiveIntensity; matCajon.emissiveIntensity = e0 * 3;
    mIzq.visible = mDer.visible = sello.visible = false; espejo.visible = false;
    const desde = { position: new THREE.Vector3(0, Y0, Z0 + 0.7), size: ligero ? 256 : 512 };
    const entornoSala = pmrem.fromScene(escena, 0, 0.05, 40, desde).texture;
    const estudio = new THREE.Group();
    {
      const [c, g] = lienzo2d(1024, 512); g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 512);
      const franja = (x, w, a) => { const h = g.createLinearGradient(x - w, 0, x + w, 0); h.addColorStop(0, 'rgba(255,255,255,0)'); h.addColorStop(0.5, `rgba(255,255,255,${a})`); h.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = h; g.fillRect(x - w, 30, w * 2, 452); };
      franja(150, 9, 1); franja(498, 5, 1); franja(560, 14, 0.85); franja(880, 7, 1);
      const v = g.createLinearGradient(0, 40, 0, 72); v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(0.5, 'rgba(255,255,255,.9)'); v.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = v; g.fillRect(60, 40, 904, 32);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 3.6), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1, 1, 1).multiplyScalar(9), toneMapped: false, fog: false }));
      panel.position.set(0, 2.4, FRENTE - 0.4); panel.rotation.y = Math.PI; estudio.add(panel);
      for (const lado of [-1, 1]) {
        const tiraL = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 3.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe9f2fb).multiplyScalar(7), toneMapped: false, fog: false, side: THREE.DoubleSide }));
        tiraL.position.set(lado * 3.2, 2.2, Z0 + 2.4); tiraL.lookAt(0, 2.2, Z0); estudio.add(tiraL);
      }
    }
    escena.add(estudio);
    const entornoRoca = pmrem.fromScene(escena, 0, 0.05, 40, desde).texture;
    escena.remove(estudio);
    mIzq.visible = mDer.visible = sello.visible = true; espejo.visible = true;
    for (const m of brillan) m.color.multiplyScalar(1 / 3); matCajon.emissiveIntensity = e0;
    for (const [m, e, k] of [[matAcero, entornoSala, 1], [matLama, entornoSala, 0.2], [matCajon, entornoSala, 0.9], [matObsidiana, entornoRoca, 1]]) { m.envMap = e; m.envMapIntensity = k; m.needsUpdate = true; }
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
  const NCH = quieto ? 0 : 160, chPos = new Float32Array(NCH * 3), chU = new Float32Array(NCH), chL = new Uint8Array(NCH), chV = new Float32Array(NCH);
  for (let i = 0; i < NCH; i++) { chU[i] = Math.random(); chL[i] = Math.floor(Math.random() * ML); chV[i] = 0.25 + Math.random() * 0.6; }
  const chG = new THREE.BufferGeometry(); chG.setAttribute('position', new THREE.BufferAttribute(chPos, 3));
  const matChispa = new THREE.PointsMaterial({ map: texPunto, color: new THREE.Color(0xe3f0fb).multiplyScalar(1.6), size: 0.022, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const chispas = new THREE.Points(chG, matChispa); chispas.frustumCulled = false; mono.add(chispas);
  const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), P3 = new THREE.Vector3(), Q = new THREE.Vector3();
  const bez = (u, o) => { const a = 1 - u; return o.set(0, 0, 0).addScaledVector(P0, a * a * a).addScaledVector(P1, 3 * a * a * u).addScaledVector(P2, 3 * a * u * u).addScaledVector(P3, u * u * u); };
  function curva(L, sep) {
    const borde = Math.abs(L.y) / (ALTO * 0.42); // 0 en el centro, 1 en los extremos
    const b = (0.05 + 0.34 * borde * borde) * (0.4 + sep * 2.2), z = L.lado * (PROF / 2 + 0.01);
    P0.set(-sep, L.y, z * 0.6); P3.set(sep, L.y, z * 0.6);
    P1.set(-sep * 0.35, L.y * (1 + 0.22 * borde), z + L.lado * b); P2.set(sep * 0.35, L.y * (1 + 0.22 * borde), z + L.lado * b);
  }

  // ---------------- polvo en la luz (muy poco) ----------------
  const N = quieto ? 0 : 160, pos = new Float32Array(N * 3), vel = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * (AN - 1); pos[i * 3 + 1] = Math.random() * (AL - 0.3); pos[i * 3 + 2] = FONDO + 0.5 + Math.random() * 9; vel[i] = 0.015 + Math.random() * 0.035; }
  const polvoG = new THREE.BufferGeometry(); polvoG.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  escena.add(new THREE.Points(polvoG, new THREE.PointsMaterial({ map: texPunto, color: 0xd7e3ef, size: 0.012, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })));

  // ---------------- composición ----------------
  // con antialiasing de verdad (MSAA en el búfer de la composición), un poco de resplandor en las luces y un grano finísimo que evita
  // los escalones en los degradados oscuros
  const comp = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: ligero ? 2 : 4 }));
  comp.addPass(new RenderPass(escena, camara));
  comp.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.55, 0.92));
  comp.addPass(new OutputPass());
  const grano = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, semilla: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform float semilla; varying vec2 vUv;\n' +
      'float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n' +
      'void main() { vec4 c = texture2D(tDiffuse, vUv); float n = h(gl_FragCoord.xy + semilla) + h(gl_FragCoord.yx * 1.37 - semilla) - 1.0; c.rgb += n * 0.011; gl_FragColor = c; }',
  });
  comp.addPass(grano);

  function ajusta() {
    const w = lienzo.clientWidth || innerWidth, h = lienzo.clientHeight || innerHeight;
    renderer.setSize(w, h, false); comp.setSize(w, h);
    espejo.getRenderTarget().setSize(Math.round(w * PR * 0.6), Math.round(h * PR * 0.6));
    camara.aspect = w / h;
    // en pantallas estrechas, más ángulo para que quepa la sala; en las muy anchas, algo menos
    camara.fov = camara.aspect < 0.8 ? 64 : camara.aspect < 1.2 ? 54 : camara.aspect > 2.1 ? 38 : 44;
    camara.updateProjectionMatrix();
  }
  addEventListener('resize', ajusta); ajusta();

  // ---------------- animación ----------------
  const ease = { io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), out: (t) => 1 - Math.pow(1 - t, 3), in: (t) => t * t * t, suave: (t) => t * t * (3 - 2 * t),
    // repulsión: arranca de golpe y se asienta con un rebote corto (como dos imanes que se empujan)
    iman: (t) => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    // atracción: acelera al acercarse y rebota un poco al chocar
    atrae: (t) => (t < 0.82 ? Math.pow(t / 0.82, 2.6) * 1.0 : 1 - Math.sin(((t - 0.82) / 0.18) * Math.PI) * 0.035) };
  const tramos = []; let ahora = 0;
  const estado = { sello: 0, abre: 0, giro: 0, luz: 0, dolly: 0, marca: 0, zumbido: 0, campo: 0, golpe: 0 };
  const tween = (k, a, b, dur, e, retraso) => new Promise((res) => tramos.push({ t0: ahora + (retraso || 0), dur: Math.max(dur, 0.0001), set: (p) => { estado[k] = a + (b - a) * p; }, e: e || ease.io, res }));
  const F = quieto ? 0.25 : 1;
  let abierta = false, ocupada = false;
  async function abre() {
    if (abierta || ocupada) return; ocupada = true;
    tween('sello', estado.sello, 1, 0.45 * F, ease.out);
    tween('zumbido', 0, 1, 0.5 * F, ease.in);
    tween('campo', 0, 1, 0.5 * F, ease.out, 0.35 * F);
    tween('zumbido', 1, 0, 0.3 * F, ease.out, 0.55 * F);
    tween('abre', 0, 1, 1.35 * F, ease.iman, 0.55 * F);
    tween('giro', 0, 1, 1.5 * F, ease.iman, 0.62 * F);
    tween('luz', 0, 1, 1.3 * F, ease.out, 0.7 * F);
    tween('campo', 1, 0.28, 1.6 * F, ease.io, 1.6 * F);
    tween('dolly', 0, 1, 2.2 * F, ease.io, 0.45 * F);
    await new Promise((r) => setTimeout(r, 2150 * F));
    abierta = true; ocupada = false;
  }
  async function cierra() {
    if (!abierta || ocupada) return; ocupada = true;
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
  if (!quieto) addEventListener('pointermove', (e) => { mira.tx = e.clientX / innerWidth - 0.5; mira.ty = e.clientY / innerHeight - 0.5; });
  let antes = performance.now(), vivo = true, pausado = false;
  const delta = () => { const t = performance.now(), d = (t - antes) / 1000; antes = t; return d; };
  document.addEventListener('visibilitychange', () => { vivo = document.visibilityState === 'visible'; if (vivo) delta(); });

  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!vivo || pausado) return;
    const dt = Math.min(delta(), DT_MAX); ahora += dt;
    for (let i = tramos.length - 1; i >= 0; i--) { const x = tramos[i]; if (ahora < x.t0) continue; const p = Math.min(1, (ahora - x.t0) / x.dur); x.set(x.e(p)); if (p >= 1) { tramos.splice(i, 1); x.res(); } }
    // la roca flota y gira muy poco; al abrir, la fisura destella, se parte en dos y las mitades se apartan girando como dos hojas
    mono.position.y = Y0 + (quieto ? 0 : Math.sin(ahora * 0.6) * 0.02);
    mono.rotation.y = quieto ? 0 : Math.sin(ahora * 0.13) * 0.07 * (1 - estado.abre);
    const sep = 0.44 * estado.abre;
    const zum = estado.zumbido * 0.0022 * Math.sin(ahora * 95), golpe = estado.golpe * 0.004 * Math.sin(ahora * 70);
    mIzq.position.x = -sep - zum - golpe; mDer.position.x = sep + zum + golpe;
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
    mIzq.rotation.y = 0.28 * estado.giro; mDer.rotation.y = -0.28 * estado.giro;
    const pulso = quieto ? 0.85 : 0.7 + Math.sin(ahora * 1.3) * 0.22;
    matSello.opacity = Math.max(0, 1 - estado.abre * 2.5) * Math.min(1, pulso + estado.sello);
    sello.scale.x = 1 + estado.sello * 2.5;
    matNucleo.opacity = estado.luz; nucleo.scale.x = 1 + estado.luz * 1.5;
    matHalo.opacity = 0.55 * estado.luz;
    luzNucleo.intensity = 30 * estado.luz; luzNucleo2.intensity = 18 * estado.luz;
    // cámara: deriva lenta, mirada y avance hacia la luz
    mira.x += (mira.tx - mira.x) * 0.035; mira.y += (mira.ty - mira.y) * 0.035;
    const d = estado.dolly;
    const dx = quieto ? 0 : Math.sin(ahora * 0.19) * 0.06, dy = quieto ? 0 : Math.cos(ahora * 0.15) * 0.035;
    camara.position.set(CAM.x + mira.x * 0.5 * (1 - d) + dx * (1 - d), CAM.y - mira.y * 0.3 * (1 - d) + dy * (1 - d) + d * 0.32, CAM.z - d * 2.3);
    camara.lookAt(0, 1.95 + d * 0.06, Z0 - 0.4);
    if (N) { const a = polvoG.attributes.position; for (let i = 0; i < N; i++) { let y = a.array[i * 3 + 1] + vel[i] * dt * 0.3; if (y > AL - 0.2) y = 0.1; a.array[i * 3 + 1] = y; a.array[i * 3] += Math.sin(ahora * 0.25 + i) * 0.0003; } a.needsUpdate = true; }
    if (!quieto) grano.uniforms.semilla.value = (ahora * 61.7) % 997;
    comp.render();
  }
  cuadro();
  // la sala de la conversación tapa el 3D: mientras tanto, quieto (sin gastar la tarjeta gráfica durante la videollamada)
  const pausa = (si) => { pausado = !!si; if (!pausado) delta(); };
  return { abre, cierra, pausa, abierta: () => abierta };
}

let api = null;
// «?sin3d»: la portada sin la sala en 3D (equipos lentos y pruebas automáticas); se ve el monolito en CSS
try { api = new URLSearchParams(location.search).has('sin3d') ? null : arranca(); } catch (e) { console.warn('3D no disponible', e); api = null; }
if (api) { document.documentElement.classList.add('con-3d'); window.Sala3D = api; document.dispatchEvent(new CustomEvent('elixire-3d')); }
