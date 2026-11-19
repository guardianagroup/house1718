// Elixire · la sala y el monolito (19 nov 2026; dueño: «trabaja desde esta base», «aspecto sobrio y minimalista», «futurista»,
// «la piedra la cambiamos» → «monolito que se abre»). Una sala de hormigón gris frío con líneas de luz blanca, suelo negro que
// refleja y, en el centro, un monolito de acero negro con una línea de luz. Al pulsar, la línea se enciende, el monolito se parte
// en dos, las mitades se separan y la luz fría de dentro llena la sala mientras la cámara avanza. three.js (MIT), servido desde
// este dominio; sin WebGL se queda la imagen fija de la sala (puerta.js no cambia).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const lienzo = document.getElementById('lienzo3d');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
// en pruebas (?real), el tiempo de la animación es el del reloj aunque el equipo dibuje pocos cuadros por segundo
const DT_MAX = /[?&]real\b/.test(location.search) ? 1 : 0.05;

function arranca() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' }); } catch (_) { return null; }
  if (!renderer.getContext()) return null;
  const PR = Math.min(devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(PR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  RectAreaLightUniformsLib.init();

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x05070a);
  escena.fog = new THREE.Fog(0x05070a, 9, 22);
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environmentIntensity = 0.12;

  const camara = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  const CAM = { x: 0, y: 1.72, z: 7.6 };

  // ---------------- medidas de la sala ----------------
  const AN = 4.8, AL = 5.2, FONDO = -5.2, FRENTE = 8.5; // ancho, alto, pared del fondo, boca de la sala
  const LARGO = FRENTE - FONDO, ZM = (FRENTE + FONDO) / 2;
  const Y_LINEA = 1.72; // altura de las líneas de luz de los muros

  // ---------------- texturas ----------------
  // hormigón frío con vetas verticales (como el de la imagen): ruido estirado en vertical
  function texMuro(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = '#80868d'; g.fillRect(0, 0, w, h);
    g.filter = 'blur(28px)';
    for (let i = 0; i < 70; i++) { const a = Math.random() * 0.07; g.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(Math.random() * w - 60, Math.random() * h - 120, 40 + Math.random() * 220, 120 + Math.random() * 520); }
    g.filter = 'blur(1.2px)';
    for (let i = 0; i < 260; i++) { const a = Math.random() * 0.035; g.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(Math.random() * w, Math.random() * h * 0.4, 1 + Math.random() * 3, h * (0.4 + Math.random() * 0.6)); }
    g.filter = 'none';
    const im = g.getImageData(0, 0, w, h);
    for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() - 0.5) * 9; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; }
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  }
  // acero cepillado vertical para el monolito (rugosidad)
  function texCepillado(n) {
    const c = document.createElement('canvas'); c.width = n; c.height = 8; const g = c.getContext('2d');
    for (let x = 0; x < n; x++) { const v = 120 + (Math.random() - 0.5) * 60; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, 8); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
  }
  function texMarca() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d');
    g.clearRect(0, 0, 1024, 128); g.font = '500 54px Unbounded, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '30px';
    g.fillStyle = 'rgba(205,215,226,.55)'; g.fillText('ELIXIRE', 527, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }

  // ---------------- la sala ----------------
  const muroTex = texMuro(1024, 1024);
  // luz «horneada» de las líneas sobre el hormigón: más clara junto a cada línea, a la altura de la ranura del techo y hacia el
  // fondo (como en la imagen de referencia); las luces de área quedan para el monolito, el suelo y los reflejos
  function texLuz(lateral) {
    const W = 256, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const im = g.createImageData(W, H);
    const gau = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
    for (let y = 0; y < H; y++) {
      const alto = (1 - y / H) * AL; // v=0 abajo en el plano; la textura va de arriba abajo
      for (let x = 0; x < W; x++) {
        const prof = x / W; // 0: boca de la sala, 1: fondo (lateral); en el fondo, horizontal
        let v = 0.14 + 0.62 * gau(alto, Y_LINEA, alto > Y_LINEA ? 1.05 : 0.7) + 0.2 * gau(alto, 0, 0.45);
        if (lateral) v += 0.22 * gau(alto, AL, 1.3) * prof + 0.12 * prof;
        else v += 0.34 * gau(alto, AL, 1.6) + 0.08 * gau(prof, 0.5, 0.35);
        const k = Math.min(255, Math.round(255 * Math.min(1, v)));
        const i = (y * W + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = k; im.data[i + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const luzLateral = texLuz(true), luzFondo = texLuz(false);
  const matMuro = (rx, ry, fondo) => { const t = muroTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
    return new THREE.MeshStandardMaterial({ map: t, color: 0x80878f, roughness: 0.8, metalness: 0.04, emissive: 0x8d99a6, emissiveMap: fondo ? luzFondo : luzLateral, emissiveIntensity: 0.95 }); };
  const plano = (w, h, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.receiveShadow = true; return m; };
  const izq = plano(LARGO, AL, matMuro(3, 1)); izq.rotation.y = Math.PI / 2; izq.scale.x = -1; izq.position.set(-AN / 2, AL / 2, ZM); escena.add(izq);
  const der = plano(LARGO, AL, matMuro(3, 1)); der.rotation.y = -Math.PI / 2; der.position.set(AN / 2, AL / 2, ZM); escena.add(der);
  const fondoP = plano(AN, AL, matMuro(1, 1, true)); fondoP.position.set(0, AL / 2, FONDO); escena.add(fondoP);
  const techo = plano(AN, LARGO, new THREE.MeshStandardMaterial({ color: 0x2a2f35, roughness: 0.9 })); techo.rotation.x = Math.PI / 2; techo.position.set(0, AL, ZM); escena.add(techo);

  // suelo: espejo oscurecido + una capa satinada encima (refleja como piedra pulida, no como un espejo)
  const espejo = new Reflector(new THREE.PlaneGeometry(AN, LARGO), { clipBias: 0.003, textureWidth: Math.round(innerWidth * PR * 0.6), textureHeight: Math.round(innerHeight * PR * 0.6), color: 0x6a6f76 });
  espejo.rotation.x = -Math.PI / 2; espejo.position.set(0, 0, ZM); escena.add(espejo);
  const satin = new THREE.Mesh(new THREE.PlaneGeometry(AN, LARGO), new THREE.MeshPhysicalMaterial({ color: 0x0b0d10, roughness: 0.55, metalness: 0.2, transparent: true, opacity: 0.48 }));
  satin.rotation.x = -Math.PI / 2; satin.position.set(0, 0.002, ZM); satin.receiveShadow = true; escena.add(satin);

  // líneas de luz (emisivas: el «bloom» les da el halo) y las luces de área que de verdad iluminan
  const matLinea = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xe9f2fb).multiplyScalar(2.2), toneMapped: false });
  const linea = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matLinea); m.position.set(x, y, z); escena.add(m); return m; };
  const g = 0.018;
  linea(g, g, LARGO, -AN / 2 + g / 2, Y_LINEA, ZM); linea(g, g, LARGO, AN / 2 - g / 2, Y_LINEA, ZM); linea(AN, g, g, 0, Y_LINEA, FONDO + g / 2);
  linea(g, g, LARGO, -AN / 2 + g / 2, g / 2, ZM); linea(g, g, LARGO, AN / 2 - g / 2, g / 2, ZM); linea(AN, g, g, 0, g / 2, FONDO + g / 2);
  // ranura del techo, al fondo: un plano de luz y su borde
  const ranura = new THREE.Mesh(new THREE.PlaneGeometry(AN - 1.4, 1.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdde8f3).multiplyScalar(0.95), toneMapped: false }));
  ranura.rotation.x = Math.PI / 2; ranura.position.set(0, AL - 0.002, FONDO + 1.05); escena.add(ranura);
  linea(AN - 1.4, g, g, 0, AL - 0.01, FONDO + 1.7);
  const areaTecho = new THREE.RectAreaLight(0xe8f1fa, 3.4, AN - 1.4, 1.3); areaTecho.position.set(0, AL - 0.01, FONDO + 1.05); areaTecho.lookAt(0, 0, FONDO + 1.05); escena.add(areaTecho);
  const areaIzq = new THREE.RectAreaLight(0xe8f1fa, 1.9, LARGO, 0.1); areaIzq.position.set(-AN / 2 + 0.02, Y_LINEA, ZM); areaIzq.lookAt(0, Y_LINEA - 0.3, ZM); escena.add(areaIzq);
  const areaDer = new THREE.RectAreaLight(0xe8f1fa, 1.9, LARGO, 0.1); areaDer.position.set(AN / 2 - 0.02, Y_LINEA, ZM); areaDer.lookAt(0, Y_LINEA - 0.3, ZM); escena.add(areaDer);
  const areaFondo = new THREE.RectAreaLight(0xe8f1fa, 1.8, AN, 0.1); areaFondo.position.set(0, Y_LINEA, FONDO + 0.02); areaFondo.lookAt(0, Y_LINEA, 0); escena.add(areaFondo);
  escena.add(new THREE.HemisphereLight(0x3a4452, 0x050607, 0.2));
  // luz cenital que da la sombra del monolito en el suelo
  const cenital = new THREE.SpotLight(0xe8f1fa, 38, 0, 0.5, 0.9, 2); cenital.position.set(0, AL - 0.1, -1.4); cenital.target.position.set(0, 0, -0.7);
  cenital.castShadow = true; cenital.shadow.mapSize.set(1024, 1024); cenital.shadow.radius = 8; cenital.shadow.bias = -0.0005; escena.add(cenital, cenital.target);

  // ---------------- el monolito ----------------
  // proporción de losa (ancho : alto : fondo ≈ 4 : 9 : 1,4); negro pulido que refleja las líneas de luz como un espejo oscuro
  const ANCHO = 1.08, ALTO = 2.42, PROF = 0.36, Y0 = 2.08, Z0 = -1.0;
  const cepillado = texCepillado(1024);
  const matMono = new THREE.MeshPhysicalMaterial({ color: 0x08090b, metalness: 0.65, roughness: 0.14, roughnessMap: cepillado, anisotropy: 0.4, anisotropyRotation: Math.PI / 2, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1 });
  const matInterior = new THREE.MeshPhysicalMaterial({ color: 0xa7b0ba, metalness: 1, roughness: 0.2, anisotropy: 0.5 });
  const mono = new THREE.Group(); mono.position.set(0, Y0, Z0); escena.add(mono);
  const entero = new THREE.Mesh(new RoundedBoxGeometry(ANCHO, ALTO, PROF, 6, 0.018), matMono); entero.castShadow = true; entero.receiveShadow = true; mono.add(entero);
  const mitad = (signo) => {
    const grupo = new THREE.Group(); grupo.visible = false;
    const caja = new THREE.Mesh(new RoundedBoxGeometry(ANCHO / 2, ALTO, PROF, 6, 0.012), matMono); caja.castShadow = true; caja.receiveShadow = true;
    caja.position.x = signo * ANCHO / 4; grupo.add(caja);
    const cara = new THREE.Mesh(new THREE.PlaneGeometry(PROF - 0.04, ALTO - 0.04), matInterior); cara.rotation.y = -signo * Math.PI / 2; cara.position.x = 0.0015 * signo; grupo.add(cara);
    mono.add(grupo); return grupo;
  };
  const mIzq = mitad(-1), mDer = mitad(1);
  // la línea de luz que sella el monolito
  const matSello = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd6e8f8).multiplyScalar(1.6), toneMapped: false, transparent: true });
  const sello = new THREE.Mesh(new THREE.PlaneGeometry(0.0045, ALTO - 0.06), matSello); sello.position.set(0, 0, PROF / 2 + 0.0015); mono.add(sello);
  // la marca grabada, abajo y muy discreta
  const marca = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.0625), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); marca.position.set(0, -ALTO / 2 + 0.16, PROF / 2 + 0.002); mono.add(marca);
  // dentro: una hoja de luz y su halo
  const matNucleo = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd6e8f8).multiplyScalar(3), toneMapped: false, transparent: true, opacity: 0 });
  const nucleo = new THREE.Mesh(new THREE.PlaneGeometry(0.022, ALTO - 0.25), matNucleo); mono.add(nucleo);
  const matHalo = new THREE.MeshBasicMaterial({ color: 0x9cc3e4, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.4, ALTO + 0.6), matHalo); halo.position.z = -0.01; mono.add(halo);
  { const c = document.createElement('canvas'); c.width = 256; c.height = 512; const gx = c.getContext('2d'); const gr = gx.createRadialGradient(128, 256, 0, 128, 256, 256); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gx.fillStyle = gr; gx.fillRect(0, 0, 256, 512); matHalo.map = new THREE.CanvasTexture(c); }
  const luzNucleo = new THREE.RectAreaLight(0xcfe3f6, 0, 0.1, ALTO - 0.25); luzNucleo.position.set(0, 0, 0.05); mono.add(luzNucleo);
  const luzNucleo2 = new THREE.PointLight(0xbfdcf5, 0, 10, 2); luzNucleo2.position.set(0, 0, 0.7); mono.add(luzNucleo2);

  // ---------------- el campo magnético entre las dos mitades ----------------
  // líneas de campo que se estiran al separarse (las de los bordes se curvan más, como entre dos imanes enfrentados) y chispas
  // que corren por ellas; al cerrar, las mitades se atraen y se juntan con un pequeño rebote
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
  const matChispa = new THREE.PointsMaterial({ color: new THREE.Color(0xe3f0fb).multiplyScalar(1.6), size: 0.014, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
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
  const N = quieto ? 0 : 140, pos = new Float32Array(N * 3), vel = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * (AN - 0.4); pos[i * 3 + 1] = Math.random() * (AL - 0.3); pos[i * 3 + 2] = FONDO + 0.5 + Math.random() * 9; vel[i] = 0.015 + Math.random() * 0.035; }
  const polvoG = new THREE.BufferGeometry(); polvoG.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  escena.add(new THREE.Points(polvoG, new THREE.PointsMaterial({ color: 0xd7e3ef, size: 0.008, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending })));

  // ---------------- composición ----------------
  const comp = new EffectComposer(renderer);
  comp.addPass(new RenderPass(escena, camara));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.36, 0.6, 0.9); comp.addPass(bloom);
  comp.addPass(new OutputPass());

  function ajusta() {
    const w = lienzo.clientWidth || innerWidth, h = lienzo.clientHeight || innerHeight;
    renderer.setSize(w, h, false); comp.setSize(w, h); bloom.setSize(w, h);
    espejo.getRenderTarget().setSize(Math.round(w * PR * 0.6), Math.round(h * PR * 0.6));
    camara.aspect = w / h;
    // en pantallas estrechas, más ángulo para que quepa la sala
    camara.fov = camara.aspect < 0.8 ? 58 : camara.aspect < 1.2 ? 46 : 36;
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
  const reloj = new THREE.Clock(); let vivo = true;
  document.addEventListener('visibilitychange', () => { vivo = document.visibilityState === 'visible'; if (vivo) reloj.getDelta(); });

  function cuadro() {
    requestAnimationFrame(cuadro);
    if (!vivo) return;
    const dt = Math.min(reloj.getDelta(), DT_MAX); ahora += dt;
    for (let i = tramos.length - 1; i >= 0; i--) { const x = tramos[i]; if (ahora < x.t0) continue; const p = Math.min(1, (ahora - x.t0) / x.dur); x.set(x.e(p)); if (p >= 1) { tramos.splice(i, 1); x.res(); } }
    // monolito: flota y gira muy poco; al abrir, el sello destella, se parte en dos y las mitades se apartan girando como dos hojas
    const flota = quieto ? 0 : Math.sin(ahora * 0.6) * 0.02;
    mono.position.y = Y0 + flota;
    mono.rotation.y = quieto ? 0 : Math.sin(ahora * 0.13) * 0.07 * (1 - estado.abre);
    const partido = estado.abre > 0.001; entero.visible = !partido; mIzq.visible = mDer.visible = partido; marca.visible = !partido;
    const sep = 0.44 * estado.abre;
    const zum = estado.zumbido * 0.0022 * Math.sin(ahora * 95), golpe = estado.golpe * 0.004 * Math.sin(ahora * 70);
    mIzq.position.x = -sep - zum - golpe; mDer.position.x = sep + zum + golpe;
    entero.position.x = zum * 0.5;
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
    camara.position.set(CAM.x + mira.x * 0.5 * (1 - d) + dx * (1 - d), CAM.y - mira.y * 0.3 * (1 - d) + dy * (1 - d) + d * 0.32, CAM.z - d * 3.1);
    camara.lookAt(0, 1.98 + d * 0.04, Z0 - 0.4);
    if (N) { const a = polvoG.attributes.position; for (let i = 0; i < N; i++) { let y = a.array[i * 3 + 1] + vel[i] * dt * 0.3; if (y > AL - 0.2) y = 0.1; a.array[i * 3 + 1] = y; a.array[i * 3] += Math.sin(ahora * 0.25 + i) * 0.0003; } a.needsUpdate = true; }
    comp.render();
  }
  const ponMarca = () => { marca.material.map = texMarca(); marca.material.opacity = 1; marca.material.needsUpdate = true; };
  (document.fonts && document.fonts.load ? document.fonts.load('500 54px Unbounded').catch(() => {}) : Promise.resolve()).then(ponMarca);
  cuadro();
  return { abre, cierra, abierta: () => abierta };
}

let api = null;
try { api = arranca(); } catch (e) { console.warn('3D no disponible', e); api = null; }
if (api) { document.documentElement.classList.add('con-3d'); window.Sala3D = api; document.dispatchEvent(new CustomEvent('elixire-3d')); }
