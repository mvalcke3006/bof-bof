(() => {
if (!window.THREE) return;
const T = window.THREE;
const root = document.documentElement;
const C = { nuit: '#04081F', bleu: '#2342FF', glace: '#EAF0FF', piment: '#2342FF', neige: '#EAF0FF', encre: '#04081F', rose: '#2342FF', jaune: '#EAF0FF', sapin: '#2342FF' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const still = () => root.classList.contains('no-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const STATIONS = [
['19.12', 'Val Thorens', '2 300 m', 'bleu', 'Malaysia'], ['02.01', 'Courchevel', '1 850 m', 'bleu', 'Les Caves de Courchevel'],
['16.01', 'Chamonix', '1 035 m', 'bleu', 'Chambre Neuf'], ['30.01', 'Verbier', '1 500 m', 'bleu', 'Le Farinet'],
['13.02', 'Avoriaz', '1 800 m', 'bleu', 'Le Chapka'], ['27.02', 'Les Arcs', '1 800 m', 'bleu', "L'Arpette · Arc 1800"],
['13.03', "Val d'Isère", '1 850 m', 'bleu', "Dick's Tea Bar"], ['03.04', 'Tignes', '2 100 m', 'bleu', 'Dropzone · Val Claret'],
];
const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 900 }) : setTimeout(fn, 200));
const lazy = (section, init) => {
let done = false;
const go = () => { if (done) return; done = true; io.disconnect(); idle(init); };
const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) go(); }, { rootMargin: '120% 0px' });
const arm = () => setTimeout(() => io.observe(section), 250);
if (document.readyState !== 'loading') arm(); else addEventListener('DOMContentLoaded', arm, { once: true });
};
const makeScene = (section, canvas, opts) => {
let renderer;
try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: !!opts.alpha }); } catch (e) { section.classList.add('no-webgl'); return null; }
const touch = matchMedia('(pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(opts.pr || Math.min(devicePixelRatio, 2), touch ? 1.5 : 2.5));
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(opts.fov || 35, 1, opts.near || 0.01, opts.far || 50);
let composer = null;
if (opts.bloom && T.EffectComposer && T.UnrealBloomPass) {
composer = new T.EffectComposer(renderer);
composer.addPass(new T.RenderPass(scene, camera));
composer.addPass(new T.UnrealBloomPass(new T.Vector2(512, 512), opts.bloom, 0.55, 0.82));
if (T.GammaCorrectionShader) composer.addPass(new T.ShaderPass(T.GammaCorrectionShader));
}
const state = { p: 0, target: 0, mx: 0, my: 0, tmx: 0, tmy: 0, visible: false, t: 0 };
const resize = () => {
const w = canvas.clientWidth, h = canvas.clientHeight;
renderer.setSize(w, h, false);
if (composer) { composer.setPixelRatio(Math.min(devicePixelRatio, 2)); composer.setSize(w, h); }
camera.aspect = w / h;
camera.updateProjectionMatrix();
};
const measure = () => {
const r = section.getBoundingClientRect();
state.target = clamp(-r.top / (section.offsetHeight - innerHeight), 0, 1);
};
let raf = 0, last = performance.now();
const minFrame = touch ? 30 : 0;
const loop = (now) => {
if (minFrame && now - last < minFrame) { raf = state.visible ? requestAnimationFrame(loop) : 0; return; }
const dt = Math.min(0.05, (now - last) / 1000); last = now;
state.t += dt;
const k = still() ? 1 : 1 - Math.pow(opts.smooth || 0.02, dt);
state.p = lerp(state.p, state.target, k);
state.mx = lerp(state.mx, state.tmx, k * 0.6); state.my = lerp(state.my, state.tmy, k * 0.6);
opts.update(state, dt);
if (composer) composer.render(); else renderer.render(scene, camera);
if (opts.after) opts.after();
raf = state.visible ? requestAnimationFrame(loop) : 0;
};
const kick = () => { if (!raf && state.visible) { last = performance.now(); raf = requestAnimationFrame(loop); } };
new IntersectionObserver(([e]) => { state.visible = e.isIntersecting; if (state.visible) { resize(); measure(); kick(); } }, { rootMargin: '200px 0px' }).observe(section);
addEventListener('scroll', measure, { passive: true });
addEventListener('resize', () => { resize(); measure(); });
if (fine) section.addEventListener('pointermove', (e) => { state.tmx = (e.clientX / innerWidth - 0.5) * 2; state.tmy = (e.clientY / innerHeight - 0.5) * 2; });
resize(); measure();
const panels = [...section.querySelectorAll('[data-range]')].map((el) => ({ el, r: el.dataset.range.split(',').map(Number) }));
const showPanels = (p) => panels.forEach(({ el, r }) => el.classList.toggle('is-on', p >= r[0] && p <= r[1]));
return { renderer, scene, camera, state, showPanels };
};
const roundedRect = (w, h, r) => {
const s = new T.Shape(), x = -w / 2, y = -h / 2;
s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
return s;
};
const slab = (w, d, h, r, mat) => {
const g = new T.ExtrudeGeometry(roundedRect(w, d, r), { depth: h, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 8 });
g.rotateX(-Math.PI / 2);
return new T.Mesh(g, mat);
};
const canvasTex = (w, h) => {
const c = document.createElement('canvas'); c.width = w; c.height = h;
const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 8;
return { c, ctx: c.getContext('2d'), tex };
};
let _glow = null;
const glowSprite = () => {
if (_glow) return _glow;
const c = document.createElement('canvas'); c.width = c.height = 64;
const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(160,180,255,0.7)'); gr.addColorStop(1, 'rgba(35,66,255,0)');
g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
return (_glow = new T.CanvasTexture(c));
};
const font = (w, size) => `${w} ${size}px "Archivo", Arial, sans-serif`;
const fontInfo = (size) => `700 ${size}px "Archivo", Arial, sans-serif`;
const deck = document.getElementById('deck');
if (deck) lazy(deck, () => {
let updateDeck = () => {};
const S = makeScene(deck, deck.querySelector('canvas'), { fov: 30, alpha: true, pr: Math.min(Math.max(devicePixelRatio, 1.5), 2), update: (st, dt) => updateDeck(st, dt) });
if (S && T.GLTFLoader) {
const { scene, camera, renderer } = S;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMappingExposure = 1.15;
if (T.RoomEnvironment) {
const pmrem = new T.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
}
scene.add(new T.HemisphereLight('#c9d4ff', '#04081F', 0.35));
const key = new T.DirectionalLight('#ffffff', 2.1);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4;
scene.add(key, key.target);
const rimRose = new T.PointLight('#2342FF', 4, 0, 2); scene.add(rimRose);
const rimBleu = new T.PointLight('#6A82FF', 2.2, 0, 2); scene.add(rimBleu);
const jogTex = canvasTex(768, 768);
const screenTex = canvasTex(1024, 490);
screenTex.tex.flipY = false;
const drawJog = (idx, angle, lock) => {
const g = jogTex.ctx, c = 384, st = STATIONS[idx], col = C[st[3]];
g.fillStyle = '#020203'; g.fillRect(0, 0, 768, 768);
g.lineCap = 'butt';
for (let i = 0; i < 120; i++) {
const t = i / 120 * Math.PI * 2 - Math.PI / 2;
g.strokeStyle = i % 15 === 0 ? '#e9e9ee' : '#2b2b33'; g.lineWidth = i % 15 === 0 ? 5 : 3;
g.beginPath(); g.moveTo(c + Math.cos(t) * 318, c + Math.sin(t) * 318); g.lineTo(c + Math.cos(t) * 352, c + Math.sin(t) * 352); g.stroke();
}
g.strokeStyle = '#ffffff'; g.lineWidth = 10;
g.beginPath(); g.moveTo(c + Math.cos(angle) * 300, c + Math.sin(angle) * 300); g.lineTo(c + Math.cos(angle) * 370, c + Math.sin(angle) * 370); g.stroke();
g.strokeStyle = col; g.lineWidth = 14;
g.beginPath(); g.arc(c, c, 372, -Math.PI / 2, -Math.PI / 2 + (idx + 1) / 8 * Math.PI * 2); g.stroke();
g.fillStyle = col; g.beginPath(); g.arc(c, c, 210, 0, Math.PI * 2); g.fill();
g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 180; y < 590; y += 9) for (let x = 180; x < 590; x += 9) { if (Math.hypot(x - c, y - c) < 206) { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); } }
g.fillStyle = '#020203'; g.beginPath(); g.arc(c, c, 26, 0, Math.PI * 2); g.fill();
g.textAlign = 'center';
const ink = st[3] === 'bleu' ? '#F5EFE3' : '#16110F';
g.fillStyle = ink; g.font = fontInfo(118); g.fillText(st[0], c, 340);
g.font = fontInfo(36); g.fillText(st[1].toUpperCase(), c, 470);
g.fillStyle = lock > 0.98 ? '#3cff7a' : '#8a8a96'; g.font = fontInfo(26); g.fillText(lock > 0.98 ? 'CUE ●' : 'SYNC', c, 120);
g.fillStyle = '#c9c9d2'; g.fillText(`${idx + 1}/8 · ${st[2]}`, c, 670);
jogTex.tex.needsUpdate = true;
};
const wave = Array.from({ length: 260 }, (_, i) => 0.2 + Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.113) + Math.sin(i * 1.7) * 0.25) * 0.8);
const drawScreen = (idx, head) => {
const g = screenTex.ctx;
g.fillStyle = '#050507'; g.fillRect(0, 0, 1024, 490);
g.fillStyle = '#16161c'; g.fillRect(0, 0, 1024, 44);
g.fillStyle = '#e9e9ee'; g.font = fontInfo(20); g.textAlign = 'left'; g.fillText('BOF BOF  ·  TOURNÉE HIVER 2027', 18, 29);
g.textAlign = 'right'; g.fillStyle = C.piment; g.fillText('● REC', 1006, 29);
const x0 = 18, w = 988;
wave.forEach((v, i) => {
const x = x0 + i * (w / wave.length), done = i / wave.length < head;
g.fillStyle = done ? '#2f6bff' : '#203a7a'; g.fillRect(x, 92 - v * 34, 2.6, v * 68);
g.fillStyle = done ? '#ffb347' : '#6a4a20'; g.fillRect(x, 92 - v * 14, 2.6, v * 28);
});
g.fillStyle = '#ffffff'; g.fillRect(x0 + head * w, 52, 2, 80);
for (let k = 0; k < 8; k++) { g.fillStyle = C[STATIONS[k][3]]; g.fillRect(x0 + k / 8 * w, 136, 10, 10); }
STATIONS.forEach((st, i) => {
const y = 182 + i * 36, on = i === idx;
g.fillStyle = on ? '#1f2a52' : (i % 2 ? '#0b0b10' : '#08080c'); g.fillRect(18, y - 25, 620, 34);
g.fillStyle = C[st[3]]; g.fillRect(18, y - 25, 6, 34);
g.textAlign = 'left'; g.font = fontInfo(19);
g.fillStyle = on ? '#ffffff' : '#9a9aa8'; g.fillText(st[0], 36, y); g.fillText(st[1].toUpperCase(), 130, y);
g.textAlign = 'right'; g.fillText(st[2], 630, y);
});
g.textAlign = 'left'; g.fillStyle = '#9a9aa8'; g.font = fontInfo(18); g.fillText('BPM', 670, 200);
g.fillStyle = '#ffffff'; g.font = fontInfo(64); g.fillText(String(122 + idx), 670, 262);
g.fillStyle = '#9a9aa8'; g.font = fontInfo(18); g.fillText('STATION', 670, 320);
g.fillStyle = C[STATIONS[idx][3]]; g.font = fontInfo(34); g.fillText(STATIONS[idx][1].toUpperCase(), 670, 360);
g.fillStyle = '#e9e9ee'; g.font = fontInfo(22); g.fillText(`${STATIONS[idx][0]} · 16:30 → 02:00`, 670, 400);
screenTex.tex.needsUpdate = true;
};
const ZONE = {
jog: { x: 262, y: 582, r: 137 },
screen: { x0: 139, x1: 405, y0: 783, y1: 910 },
pads: { x0: 119, x1: 410, y0: 745, y1: 763 },
};
const inJog = (u, v) => Math.hypot(u * 1024 - ZONE.jog.x, v * 1024 - ZONE.jog.y) < ZONE.jog.r;
const zoneOf = (U, t) => {
if (inJog(U.getX(t), U.getY(t)) && inJog(U.getX(t + 1), U.getY(t + 1)) && inJog(U.getX(t + 2), U.getY(t + 2))) return 'jog';
const x = (U.getX(t) + U.getX(t + 1) + U.getX(t + 2)) / 3 * 1024, y = (U.getY(t) + U.getY(t + 1) + U.getY(t + 2)) / 3 * 1024;
const sc = ZONE.screen; if (x > sc.x0 && x < sc.x1 && y > sc.y0 && y < sc.y1) return 'screen';
const pd = ZONE.pads, inPad = (k) => { const px = U.getX(t + k) * 1024, py = U.getY(t + k) * 1024; return px > pd.x0 - 2 && px < pd.x1 + 2 && py > pd.y0 - 2 && py < pd.y1 + 2; };
if (inPad(0) && inPad(1) && inPad(2)) return 'pad' + Math.min(7, Math.max(0, Math.floor((x - pd.x0) / ((pd.x1 - pd.x0) / 8))));
return 'rest';
};
const split = (geo, worldMatrix) => {
const g = geo.index ? geo.toNonIndexed() : geo;
const nm = new T.Matrix3().getNormalMatrix(worldMatrix), wn = new T.Vector3();
const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
const out = {};
const wb = new T.Box3().setFromBufferAttribute(P).applyMatrix4(worldMatrix);
const topY = wb.min.y + (wb.max.y - wb.min.y) * 0.55, wp = new T.Vector3();
for (let t = 0; t < P.count; t += 3) {
wp.set((P.getX(t) + P.getX(t + 1) + P.getX(t + 2)) / 3, (P.getY(t) + P.getY(t + 1) + P.getY(t + 2)) / 3, (P.getZ(t) + P.getZ(t + 1) + P.getZ(t + 2)) / 3).applyMatrix4(worldMatrix);
wn.set(N.getX(t) + N.getX(t + 1) + N.getX(t + 2), N.getY(t) + N.getY(t + 1) + N.getY(t + 2), N.getZ(t) + N.getZ(t + 1) + N.getZ(t + 2)).applyMatrix3(nm).normalize();
const z = wn.y > 0.5 && wp.y > topY ? zoneOf(U, t) : 'rest';
const o = out[z] || (out[z] = { p: [], n: [], uv: [] });
for (let k = t; k < t + 3; k++) {
o.p.push(P.getX(k), P.getY(k), P.getZ(k));
o.n.push(N.getX(k), N.getY(k), N.getZ(k));
let u = U.getX(k), v = U.getY(k);
if (z === 'screen') { const sc = ZONE.screen; u = (u * 1024 - sc.x0) / (sc.x1 - sc.x0); v = 1 - (v * 1024 - sc.y0) / (sc.y1 - sc.y0); }
o.uv.push(u, v);
}
}
const geos = {};
for (const z in out) {
const b = new T.BufferGeometry();
b.setAttribute('position', new T.Float32BufferAttribute(out[z].p, 3));
b.setAttribute('normal', new T.Float32BufferAttribute(out[z].n, 3));
b.setAttribute('uv', new T.Float32BufferAttribute(out[z].uv, 2));
geos[z] = b;
}
return geos;
};
const pivots = [];
const discs = [];
const padMats = STATIONS.map(() => []);
const anchors = {};
const tmp = new T.Vector3();
const hiMaps = new Set();
const brushed = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, 256, 256);
for (let y = 0; y < 256; y++) { const v = 128 + (Math.random() - 0.5) * 34; g.fillStyle = `rgba(128,${v | 0},255,0.9)`; g.fillRect(0, y, 256, 1); }
const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(24, 24); t.anisotropy = 8; return t; })();
new T.GLTFLoader().load('assets/3d/cdj-3000.glb', (gltf) => {
const model = gltf.scene;
let cdj, mixer;
model.traverse((o) => {
if (!o.isMesh) return;
o.castShadow = true; o.receiveShadow = true;
const m = o.material;
if (m.map) { m.map.anisotropy = renderer.capabilities.getMaxAnisotropy(); m.map.encoding = T.sRGBEncoding; hiMaps.add(m.map); }
m.normalMap = brushed; m.normalScale = new T.Vector2(0.18, 0.18);
m.metalness = 0.45; m.roughness = 0.5; m.envMapIntensity = 1.1;
if (/CDJ/i.test(o.name)) cdj = o; else if (/DJM/i.test(o.name)) mixer = o;
});
if (!cdj) { deck.classList.add('no-webgl'); return; }
if (!matchMedia('(pointer: coarse)').matches && innerWidth >= 900) new T.ImageLoader().load('assets/3d/cdj-texture-4k.jpg', (img) => { hiMaps.forEach((t) => { t.image = img; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.needsUpdate = true; }); });
const parent = cdj.parent;
model.updateMatrixWorld(true);
const uvPoints = (geo, tu, tv) => {
const g = geo.index ? geo.toNonIndexed() : geo, P = g.attributes.position, U = g.attributes.uv, N = g.attributes.normal;
const nm = new T.Matrix3().getNormalMatrix(cdj.matrixWorld), wn = new T.Vector3(), pts = [];
for (let t = 0; t < P.count; t += 3) {
wn.set(N.getX(t), N.getY(t), N.getZ(t)).applyMatrix3(nm).normalize();
if (wn.y < 0.5) continue;
const ax = U.getX(t), ay = U.getY(t), bx = U.getX(t + 1), by = U.getY(t + 1), cx = U.getX(t + 2), cy = U.getY(t + 2);
const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(det) < 1e-12) continue;
const wa = ((by - cy) * (tu - cx) + (cx - bx) * (tv - cy)) / det, wb2 = ((cy - ay) * (tu - cx) + (ax - cx) * (tv - cy)) / det, wc = 1 - wa - wb2;
if (wa < -1e-4 || wb2 < -1e-4 || wc < -1e-4) continue;
pts.push(new T.Vector3(
wa * P.getX(t) + wb2 * P.getX(t + 1) + wc * P.getX(t + 2),
wa * P.getY(t) + wb2 * P.getY(t + 1) + wc * P.getY(t + 2),
wa * P.getZ(t) + wb2 * P.getZ(t + 1) + wc * P.getZ(t + 2)));
}
return pts;
};
const jogCenters = uvPoints(cdj.geometry, ZONE.jog.x / 1024, ZONE.jog.y / 1024);
const jogEdges = uvPoints(cdj.geometry, (ZONE.jog.x + 36) / 1024, ZONE.jog.y / 1024);
const geos = split(cdj.geometry, cdj.matrixWorld);
cdj.geometry = geos.rest;
const baseMat = cdj.material;
const halves = (geo) => {
const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv;
const side = [{ p: [], n: [], uv: [] }, { p: [], n: [], uv: [] }];
for (let t = 0; t < P.count; t += 3) {
const o = side[(P.getX(t) + P.getX(t + 1) + P.getX(t + 2)) > 0 ? 1 : 0];
for (let k = t; k < t + 3; k++) { o.p.push(P.getX(k), P.getY(k), P.getZ(k)); o.n.push(N.getX(k), N.getY(k), N.getZ(k)); o.uv.push(U.getX(k), U.getY(k)); }
}
return side.filter((o) => o.p.length).map((o) => {
const g = new T.BufferGeometry();
g.setAttribute('position', new T.Float32BufferAttribute(o.p, 3));
g.setAttribute('normal', new T.Float32BufferAttribute(o.n, 3));
g.setAttribute('uv', new T.Float32BufferAttribute(o.uv, 2));
return g;
});
};
let ext0 = 1;
const nrm = new T.Vector3(0, 1, 0).applyQuaternion(parent.getWorldQuaternion(new T.Quaternion()).invert()).normalize();
const restExtra = { p: [], n: [], uv: [] };
halves(geos.jog).forEach((half) => {
half.computeBoundingBox();
const bb = half.boundingBox;
const inHalf = (c) => c.x >= bb.min.x && c.x <= bb.max.x;
const cands = jogCenters.filter(inHalf);
if (!cands.length) return;
const center = cands.reduce((a, b) => (b.dot(nrm) > a.dot(nrm) ? b : a)).clone();
const edge = jogEdges.filter(inHalf).sort((a, b) => Math.abs(a.clone().sub(center).dot(nrm)) - Math.abs(b.clone().sub(center).dot(nrm)) || a.distanceTo(center) - b.distanceTo(center))[0];
const d = edge ? edge.clone().sub(center) : new T.Vector3(0.2, 0, 0);
d.addScaledVector(nrm, -d.dot(nrm));
const radius = d.length(), R = radius * (ZONE.jog.r / 36) * 1.04;
ext0 = radius;
{
const P0 = half.attributes.position, ax = new T.Vector3(1, 0, 0).addScaledVector(nrm, -nrm.x).normalize(), az = new T.Vector3().crossVectors(nrm, ax);
let mnA = Infinity, mxA = -Infinity, mnB = Infinity, mxB = -Infinity; const v = new T.Vector3();
for (let i = 0; i < P0.count; i++) {
v.set(P0.getX(i), P0.getY(i), P0.getZ(i)).sub(center); const h = v.clone().addScaledVector(nrm, -v.dot(nrm));
if (h.length() > R) continue;
const a = h.dot(ax), b = h.dot(az); mnA = Math.min(mnA, a); mxA = Math.max(mxA, a); mnB = Math.min(mnB, b); mxB = Math.max(mxB, b);
}
if (isFinite(mnA)) center.addScaledVector(ax, (mnA + mxA) / 2).addScaledVector(az, (mnB + mxB) / 2);
}
const P = half.attributes.position, N = half.attributes.normal, U = half.attributes.uv;
const keep = { p: [], n: [], uv: [] }, c3 = new T.Vector3();
for (let t = 0; t < P.count; t += 3) {
c3.set((P.getX(t) + P.getX(t + 1) + P.getX(t + 2)) / 3, (P.getY(t) + P.getY(t + 1) + P.getY(t + 2)) / 3, (P.getZ(t) + P.getZ(t + 1) + P.getZ(t + 2)) / 3).sub(center);
c3.addScaledVector(nrm, -c3.dot(nrm));
const o = c3.length() <= R ? keep : restExtra;
for (let k = t; k < t + 3; k++) { o.p.push(P.getX(k), P.getY(k), P.getZ(k)); o.n.push(N.getX(k), N.getY(k), N.getZ(k)); o.uv.push(U.getX(k), U.getY(k)); }
}
const jogGeo = new T.BufferGeometry();
jogGeo.setAttribute('position', new T.Float32BufferAttribute(keep.p, 3));
jogGeo.setAttribute('normal', new T.Float32BufferAttribute(keep.n, 3));
jogGeo.setAttribute('uv', new T.Float32BufferAttribute(keep.uv, 2));
jogGeo.translate(-center.x, -center.y, -center.z);
const pivot = new T.Group(); pivot.position.copy(center); pivot.userData.axis = nrm;
const jogMesh = new T.Mesh(jogGeo, baseMat); jogMesh.castShadow = jogMesh.receiveShadow = true; pivot.add(jogMesh);
parent.add(pivot); pivots.push(pivot);
const disc = new T.Mesh(new T.CircleGeometry(radius * 1.75, 96), new T.MeshBasicMaterial({ map: jogTex.tex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4 }));
disc.userData.center = center.clone(); disc.userData.axis = nrm.clone();
parent.add(disc); discs.push(disc);
});
if (restExtra.p.length) {
const g = new T.BufferGeometry();
g.setAttribute('position', new T.Float32BufferAttribute(restExtra.p, 3));
g.setAttribute('normal', new T.Float32BufferAttribute(restExtra.n, 3));
g.setAttribute('uv', new T.Float32BufferAttribute(restExtra.uv, 2));
const m = new T.Mesh(g, baseMat); m.castShadow = m.receiveShadow = true; parent.add(m);
}
const screens = geos.screen ? halves(geos.screen).map((g) => { const m = new T.Mesh(g, new T.MeshBasicMaterial({ map: screenTex.tex, toneMapped: false })); parent.add(m); return m; }) : [];
for (let k = 0; k < 8; k++) {
const g = geos['pad' + k]; if (!g) continue;
const mat = baseMat.clone(); mat.emissive = new T.Color(C[STATIONS[k][3]]); mat.emissiveIntensity = 0.05;
parent.add(new T.Mesh(g, mat)); padMats[k].push(mat);
}
scene.add(model);
model.updateMatrixWorld(true);
const size = new T.Box3().setFromObject(model).getSize(new T.Vector3());
model.scale.multiplyScalar(0.98 / Math.max(size.x, size.z));
model.updateMatrixWorld(true);
const booth = new T.Box3().setFromObject(model);
const bc = booth.getCenter(new T.Vector3());
model.position.x -= bc.x; model.position.z -= bc.z; model.position.y -= booth.min.y;
model.updateMatrixWorld(true);
const boothBox = new T.Box3().setFromObject(model);
anchors.booth = boothBox.getCenter(new T.Vector3());
anchors.boothSize = boothBox.getSize(new T.Vector3());
pivots.sort((p, q) => p.getWorldPosition(new T.Vector3()).x - q.getWorldPosition(new T.Vector3()).x);
const pv = pivots[0];
anchors.jog = pv.getWorldPosition(new T.Vector3());
anchors.jogR = ext0 * (ZONE.jog.r / 36) * Math.abs(parent.getWorldScale(new T.Vector3()).x);
anchors.up = pv.userData.axis.clone().transformDirection(parent.matrixWorld);
if (anchors.up.y < 0) anchors.up.negate();
const scrCenters = screens.map((m) => { m.geometry.computeBoundingBox(); return m.geometry.boundingBox.getCenter(new T.Vector3()).applyMatrix4(m.matrixWorld); });
scrCenters.sort((a, b) => a.distanceTo(anchors.jog) - b.distanceTo(anchors.jog));
anchors.screen = scrCenters[0];
anchors.front = anchors.screen ? anchors.jog.clone().sub(anchors.screen).setY(0).normalize() : new T.Vector3(0, 0, 1);
anchors.cdj = anchors.screen ? anchors.jog.clone().lerp(anchors.screen, 0.35) : anchors.jog.clone();
const invP = parent.matrixWorld.clone().invert();
const toScreenLocal = anchors.screen ? anchors.screen.clone().applyMatrix4(invP).sub(pivots[0].position) : new T.Vector3(0, 0, -1);
discs.forEach((d) => {
const z = d.userData.axis, y = toScreenLocal.clone().addScaledVector(z, -toScreenLocal.dot(z)).normalize(), x = new T.Vector3().crossVectors(y, z);
d.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
d.position.copy(d.userData.center).addScaledVector(z, ext0 * 0.02);
});
const W = anchors.boothSize.x;
const floor = new T.Mesh(new T.PlaneGeometry(W * 8, W * 8), new T.ShadowMaterial({ opacity: 0.55, color: '#000016' }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
key.position.set(W * 0.6, W * 1.6, W * 1.1); key.target.position.copy(anchors.booth);
const sc = key.shadow.camera; sc.left = sc.bottom = -W; sc.right = sc.top = W; sc.near = 0.01; sc.far = W * 5; sc.updateProjectionMatrix();
rimRose.position.set(-W * 0.9, W * 0.35, -W * 0.5); rimBleu.position.set(W * 0.9, W * 0.3, -W * 0.6);
deck.classList.add('is-loaded');
}, undefined, () => deck.classList.add('no-webgl'));
const camPos = new T.Vector3(), camLook = new T.Vector3(), camUp = new T.Vector3();
const WORLD_UP = new T.Vector3(0, 1, 0);
const shots = () => {
const W = anchors.boothSize.x, far = Math.max(1, 1.25 / camera.aspect);
const jr = anchors.jogR || 0.08;
const jogTop = anchors.jog.clone().addScaledVector(anchors.up, jr * 10.5 * Math.max(1, 0.9 / camera.aspect)).addScaledVector(anchors.front, jr * 2.6);
return [
[0.0, anchors.booth.clone().add(new T.Vector3(0, W * 0.75 * far, W * 1.05 * far)), anchors.booth, WORLD_UP],
[0.16, anchors.cdj.clone().add(new T.Vector3(W * 0.3, W * 0.42, W * 0.6).multiplyScalar(far)), anchors.cdj, WORLD_UP],
[0.3, jogTop, anchors.jog, anchors.front.clone().negate()],
[0.86, jogTop, anchors.jog, anchors.front.clone().negate()],
[0.97, anchors.booth.clone().add(new T.Vector3(0, W * 0.95 * far, W * 1.3 * far)), anchors.booth.clone().add(new T.Vector3(0, W * 0.06, 0)), WORLD_UP],
[1.0, anchors.booth.clone().add(new T.Vector3(0, W * 0.95 * far, W * 1.3 * far)), anchors.booth.clone().add(new T.Vector3(0, W * 0.06, 0)), WORLD_UP],
];
};
const data8 = STATIONS.length;
const readVenue = document.getElementById('deckVenue');
const readIdx = document.getElementById('deckIdx'), readDate = document.getElementById('deckDate'), readName = document.getElementById('deckName');
let lastIdx = -1, pulse = 0;
const quat = new T.Quaternion();
updateDeck = (st, dt) => {
const p = st.p;
S.showPanels(p);
if (!anchors.jog) { camera.position.set(0, 1, 2); camera.lookAt(0, 0, 0); return; }
const keys = shots();
let i = 0; while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
const [p0, a0, l0, u0] = keys[i], [p1, a1, l1, u1] = keys[i + 1];
const u = ease(clamp((p - p0) / (p1 - p0), 0, 1));
camPos.lerpVectors(a0, a1, u); camLook.lerpVectors(l0, l1, u); camUp.lerpVectors(u0, u1, u).normalize();
const sway = anchors.boothSize.x * 0.04;
camPos.x += st.mx * sway; camPos.y -= st.my * sway * 0.6;
camera.position.copy(camPos); camera.up.copy(camUp); camera.lookAt(camLook);
const lift = camera.aspect < 1.15 ? Math.min(clamp((p - 0.2) / 0.1, 0, 1), clamp((0.95 - p) / 0.09, 0, 1)) : 0;
if (lift > 0) { const vh = S.size ? S.size.h : renderer.domElement.clientHeight, vw = renderer.domElement.clientWidth; camera.setViewOffset(vw, vh, 0, vh * 0.17 * ease(lift), vw, vh); }
else if (camera.view && camera.view.enabled) camera.clearViewOffset();
const q = clamp((p - 0.3) / 0.56, 0, 0.9999);
const idx = Math.floor(q * 8), local = q * 8 - idx;
const lock = 1 - Math.min(1, Math.abs(local - 0.5) * 2.4);
const angle = -q * data8 * Math.PI * 2;
pivots.forEach((pv, k) => { quat.setFromAxisAngle(pv.userData.axis, k ? -angle * 0.5 + st.t * (still() ? 0 : 0.6) : angle); pv.quaternion.copy(quat); });
if (idx !== lastIdx) { pulse = 1; lastIdx = idx; if (readIdx) { readIdx.textContent = idx + 1; readDate.textContent = STATIONS[idx][0]; readName.textContent = `${STATIONS[idx][1]} · ${STATIONS[idx][2]}`; if (readVenue) readVenue.textContent = STATIONS[idx][4]; deck.style.setProperty('--station', C[STATIONS[idx][3]]); } }
pulse = Math.max(0, pulse - dt * 2.5);
drawJog(idx, -angle - Math.PI / 2, lock);
drawScreen(idx, q);
padMats.forEach((mats, k) => mats.forEach((m) => { m.emissiveIntensity = k === idx ? 1.2 + pulse * 1.5 : (k < idx ? 0.25 : 0.04); }));
};
{
}
} else if (S) deck.classList.add('no-webgl');
});
const skiSection = document.getElementById('ski');
if (skiSection) lazy(skiSection, () => {
let updateSki = () => {};
const S = makeScene(skiSection, skiSection.querySelector('canvas'), { fov: 28, alpha: true, smooth: 0.06, update: (st, dt) => updateSki(st, dt) });
if (!S) return;
skiSection.classList.add('is-loaded');
const { scene, camera, renderer } = S;
renderer.toneMappingExposure = 1;
if (T.RoomEnvironment) { const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; }
scene.add(new T.HemisphereLight('#ffffff', '#3a3a44', 0.55));
const key = new T.DirectionalLight('#ffffff', 0.7); key.position.set(1.5, 2.5, 4); scene.add(key);
const L = 1.78, N = 180;
const halfW = (t) => {
const tip = 0.069, waist = 0.053, tail = 0.062;
if (t > 0.93) { const k = (t - 0.93) / 0.07; return tip * Math.sqrt(Math.max(0, 1 - k * k)) + 0.0015; }
if (t < 0.025) { const k = (0.025 - t) / 0.025; return tail * Math.sqrt(Math.max(0, 1 - k * k * 0.7)); }
const m = 0.47;
return t > m ? lerp(waist, tip, Math.pow((t - m) / (0.93 - m), 1.7)) : lerp(waist, tail, Math.pow((m - t) / (m - 0.025), 1.8));
};
const outline = (inset) => {
const sh = new T.Shape();
for (let i = 0; i <= N; i++) { const t = i / N, w = Math.max(0.001, halfW(t) - inset); i ? sh.lineTo(w, (t - 0.5) * L) : sh.moveTo(w, (t - 0.5) * L); }
for (let i = N; i >= 0; i--) { const t = i / N; sh.lineTo(-Math.max(0.001, halfW(t) - inset), (t - 0.5) * L); }
return sh;
};
const bend = (y) => { const t = y / L + 0.5; return (t > 0.8 ? Math.pow((t - 0.8) / 0.2, 2.2) * 0.085 : 0) + (t < 0.07 ? Math.pow((0.07 - t) / 0.07, 2) * 0.03 : 0) + Math.sin(clamp((t - 0.07) / 0.73, 0, 1) * Math.PI) * 0.007; };
const thick = (y) => { const t = y / L + 0.5; return 0.0045 + 0.0125 * Math.pow(Math.sin(clamp((t - 0.03) / 0.92, 0, 1) * Math.PI), 0.55); };
const skin = canvasTex(512, 4096);
skin.tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); skin.tex.flipY = true;
(() => {
const g = skin.ctx;
g.fillStyle = '#af0100'; g.fillRect(0, 0, 512, 4096);
const img = g.getImageData(0, 0, 512, 4096), d = img.data;
for (let k = 0; k < d.length; k += 4) { const n = (Math.random() - 0.5) * 14; d[k] = clamp(d[k] + n, 0, 255); d[k + 1] = clamp(d[k + 1] + n * 0.15, 0, 255); d[k + 2] = clamp(d[k + 2] + n * 0.15, 0, 255); }
g.putImageData(img, 0, 0);
g.fillStyle = '#141414'; g.textAlign = 'center';
g.font = '200 132px Archivo, Arial'; g.fillText('1000', 256, 2010);
g.font = '500 30px Archivo, Arial'; g.fillText('S   K   I   S', 256, 2058);
g.font = '600 24px Archivo, Arial'; g.fillText('All MOUNTAIN', 256, 2112);
skin.tex.needsUpdate = true;
})();
const matTop = new T.MeshStandardMaterial({ map: skin.tex, roughness: 0.9, metalness: 0.0, envMapIntensity: 0.15 });
const matSide = new T.MeshStandardMaterial({ color: '#8a0100', roughness: 0.9, metalness: 0.0, envMapIntensity: 0.15 });
const matBase = new T.MeshStandardMaterial({ color: '#0a0a0c', roughness: 0.42, metalness: 0.0, side: T.DoubleSide });
const matSteel = new T.MeshStandardMaterial({ color: '#b8bdc8', roughness: 0.25, metalness: 1, envMapIntensity: 0.8 });
const matPlastic = new T.MeshPhysicalMaterial({ color: '#1a2fd0', roughness: 0.4, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.4 });
const matDark = new T.MeshPhysicalMaterial({ color: '#111118', roughness: 0.45, metalness: 0.2, clearcoat: 0.4 });
const shapeUV = (geo) => { const P = geo.attributes.position, U = geo.attributes.uv; for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i) / 0.14 + 0.5, P.getY(i) / L + 0.5); };
const makeSki = () => {
const ski = new T.Group();
const body = new T.ExtrudeGeometry(outline(0), { depth: 1, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 4, steps: 1 });
const P = body.attributes.position;
for (let i = 0; i < P.count; i++) { const y = P.getY(i), z = P.getZ(i); P.setZ(i, ((z + 0.1) / 1.2) * thick(y) + bend(y) + 0.0012); }
shapeUV(body); body.computeVertexNormals();
ski.add(new T.Mesh(body, [matTop, matSide]));
const base = new T.ShapeGeometry(outline(0.0022), 3);
const edge = new T.ShapeGeometry((() => { const o = outline(0); o.holes.push(outline(0.0022)); return o; })(), 3);
[base, edge].forEach((g, k) => { const Q = g.attributes.position; for (let i = 0; i < Q.count; i++) Q.setZ(i, bend(Q.getY(i)) + (k ? 0.0002 : 0.0004)); shapeUV(g); g.computeVertexNormals(); });
ski.add(new T.Mesh(base, matBase), new T.Mesh(edge, matSteel));
return ski;
};
const holder = new T.Group(), pair = new T.Group(); scene.add(holder); holder.add(pair);
pair.add(makeSki());
const shTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,22,0.55)'); gr.addColorStop(1, 'rgba(0,0,22,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.05; shadow.scale.set(1.6, 0.5, 1); scene.add(shadow);
camera.position.set(0, 0, 3.6);
const keysFor = (wide) => [
[0.0, [-0.3, -0.85, 0.32]],
[0.22, [-0.12, 0.0, 0.06]],
[0.45, wide ? [-Math.PI / 2 + 0.12, 0, -Math.PI / 2] : [0, Math.PI / 2 - 0.12, 0.04]],
[0.68, [0.0, Math.PI, 0.1]],
[0.88, [-0.85, Math.PI * 2 + 0.35, -0.55]],
[1.0, [-0.85, Math.PI * 2 + 0.35, -0.55]],
];
updateSki = (st) => {
const p = st.p, wide = camera.aspect > 1;
const keys = keysFor(wide);
let i = 0; while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
const [p0, a] = keys[i], [p1, b] = keys[i + 1];
const u = ease(clamp((p - p0) / (p1 - p0), 0, 1));
pair.rotation.set(lerp(a[0], b[0], u) + st.my * 0.12, lerp(a[1], b[1], u) + st.mx * 0.25, lerp(a[2], b[2], u));
const float = still() ? 0 : Math.sin(st.t * 1.2) * 0.02;
if (wide) {
holder.rotation.z = 0; holder.scale.setScalar(1);
pair.position.set(0, 0, 0);
const camZ = lerp(4.1, 3.3, Math.sin(clamp(p / 0.45, 0, 1) * Math.PI));
const halfW = Math.tan(14 * Math.PI / 180) * camZ * camera.aspect;
const side = p < 0.3 ? 1 : p < 0.34 ? lerp(1, -1, ease((p - 0.3) / 0.04)) : p < 0.58 ? -1 : p < 0.62 ? lerp(-1, 1, ease((p - 0.58) / 0.04)) : 1;
holder.position.set(side * Math.min(halfW * 0.42, 1.1), float, 0);
camera.position.set(0, 0, camZ);
} else {
const vis = 2 * 3.6 * Math.tan(14 * Math.PI / 180), fit = Math.min(0.92, (vis * camera.aspect * 0.9) / L);
const low = p < 0.58 ? 1 : p > 0.62 ? 0 : (0.62 - p) / 0.04;
holder.rotation.z = Math.PI / 2 - 0.18; holder.scale.setScalar(fit);
pair.position.set(0, 0, 0);
holder.position.set(0, lerp(vis * 0.17, -vis * 0.2, ease(low)) + float, 0);
camera.position.set(0, 0, 3.6);
}
camera.lookAt(0, 0, 0);
S.showPanels(p);
};
});
const tab = document.getElementById('tableau');
if (tab) lazy(tab, () => {
let updateTab = () => {};
const S = makeScene(tab, tab.querySelector('canvas'), { fov: 30, alpha: true, smooth: 0.05, pr: Math.min(Math.max(devicePixelRatio, 1.5), 2), update: (st, dt) => updateTab(st, dt) });
if (!S) return;
const { scene, camera, renderer } = S;
renderer.toneMappingExposure = 1.05;
if (T.RoomEnvironment) { const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; }
scene.add(new T.HemisphereLight('#c9d4ff', '#04081F', 0.12));
const key = new T.DirectionalLight('#ffffff', 1.6); key.position.set(-8, 14, 18); scene.add(key);
const rimA = new T.PointLight('#2342FF', 4, 0, 2); rimA.position.set(-18, 4, -6); scene.add(rimA);
const rimB = new T.PointLight('#6A82FF', 1.6, 0, 2); rimB.position.set(18, -6, -5); scene.add(rimB);
const norm = (t) => t.trim().toUpperCase().replace(/→/g, '>');
const rows = [...tab.querySelectorAll('.board__row')].map((r) => ({ k: norm(r.querySelector('.board__k').textContent), v: norm(r.querySelector('.board__v').getAttribute('aria-label') || r.querySelector('.board__v').textContent), rem: norm(r.dataset.remark || ''), link: r.getAttribute('href') }));
const lin = (h) => new T.Color(h).convertSRGBToLinear();
const body = new T.MeshPhysicalMaterial({ color: lin('#08080a'), roughness: 0.4, metalness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1, envMapIntensity: 0.35 });
const silver = new T.MeshStandardMaterial({ color: lin('#c3c8d2'), roughness: 0.22, metalness: 1, envMapIntensity: 1.2 });
const slotMat = new T.MeshStandardMaterial({ color: lin('#000000'), roughness: 0.9 });
const plate = (w, h, draw) => { const c = canvasTex(Math.round(w * 110), Math.round(h * 110)); draw(c.ctx, c.c.width, c.c.height); c.tex.needsUpdate = true; return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: c.tex, transparent: true, toneMapped: false })); };
const YEL = '#FFC83A', WHT = '#ECEDEF';
const texCache = {};
const charTex = (ch, col) => {
const id = ch + col; if (texCache[id]) return texCache[id];
const c = canvasTex(96, 136), g = c.ctx;
const gt = g.createLinearGradient(0, 0, 0, 68); gt.addColorStop(0, '#26272c'); gt.addColorStop(1, '#1b1c20'); g.fillStyle = gt; g.fillRect(0, 0, 96, 68);
const gb = g.createLinearGradient(0, 68, 0, 136); gb.addColorStop(0, '#141518'); gb.addColorStop(1, '#0e0f11'); g.fillStyle = gb; g.fillRect(0, 68, 96, 68);
if (ch !== ' ') { g.fillStyle = col; g.font = '500 92px "Martian Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 48, 74); }
c.tex.needsUpdate = true; return (texCache[id] = c.tex);
};
const CW = 0.62, CH = 0.86, CG = 0.06, STEP = CW + CG, RH = 1.06, COLGAP = 0.55;
const half = (top) => { const g = new T.PlaneGeometry(CW, CH / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, top ? 0.5 + uv.getY(i) * 0.5 : uv.getY(i) * 0.5); return g; };
const gTop = half(true), gBot = half(false);
const mat = (t) => new T.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0.1, side: T.DoubleSide, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.28, envMapIntensity: 0.4 });
const FLAPS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:€+>/';
const led = new T.Mesh(new T.BoxGeometry(1, 0.04, 0.04), new T.MeshBasicMaterial({ color: '#6A82FF' }));
let board = null, lines = [], BW = 0, BH = 0, layoutPortrait = null;
const pad = (t, n) => (t.length > n ? t.slice(0, n) : t + ' '.repeat(n - t.length));
const cell = (parent, x, y, ch, col) => {
const g = new T.Group(); g.position.set(x, y, 0.52); parent.add(g);
const slot = new T.Mesh(new T.BoxGeometry(CW + 0.04, CH + 0.04, 0.1), slotMat); slot.position.z = -0.06; g.add(slot);
const sTop = new T.Mesh(gTop, mat(charTex(' ', col))); sTop.position.y = CH / 4; g.add(sTop);
const sBot = new T.Mesh(gBot, mat(charTex(' ', col))); sBot.position.y = -CH / 4; g.add(sBot);
const pA = new T.Group(), pB = new T.Group(); pA.position.z = pB.position.z = 0.01; g.add(pA, pB);
const lTop = new T.Mesh(gTop, mat(charTex(' ', col))); lTop.position.y = CH / 4; pA.add(lTop);
const lBot = new T.Mesh(gBot, mat(charTex(' ', col))); lBot.position.y = -CH / 4; pB.add(lBot);
const hinge = new T.Mesh(new T.BoxGeometry(CW, 0.018, 0.02), slotMat); hinge.position.z = 0.02; g.add(hinge);
pA.visible = pB.visible = false;
return { ch, hot: col, cur: ' ', next: ' ', t: 1, sTop, sBot, pA, pB, lTop, lBot, queue: [] };
};
const frame = (parent, w, h) => {
const fb = new T.Mesh(new T.BoxGeometry(w, h, 0.9), body); parent.add(fb);
const R = 0.16;
[[w + R, R * 2, 0, h / 2], [w + R, R * 2, 0, -h / 2], [R * 2, h + R, -w / 2, 0], [R * 2, h + R, w / 2, 0]].forEach(([fw, fh, x, y]) => { const b = new T.Mesh(new T.BoxGeometry(fw, fh, 1.05), silver); b.position.set(x, y, 0); parent.add(b); });
[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const c = new T.Mesh(new T.CylinderGeometry(R, R, 1.05, 20), silver); c.rotation.x = Math.PI / 2; c.position.set(sx * w / 2, sy * h / 2, 0); parent.add(c); });
};
const build = (portrait) => {
if (board) scene.remove(board);
board = new T.Group(); scene.add(board); lines = []; layoutPortrait = portrait;
const NI = 9, ND = Math.max(...rows.map((r) => r.v.length)), NR = portrait ? 0 : 10;
const cols = portrait ? [NI, ND] : [NI, ND, NR];
const innerW = cols.reduce((a, n) => a + n * STEP, 0) + COLGAP * (cols.length - 1);
BW = innerW + 1.6; BH = 2.5 + rows.length * RH + 0.7;
frame(board, BW, BH);
[-1, 1].forEach((sx) => { const rod = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 30, 12), silver); rod.position.set(sx * BW * 0.32, BH / 2 + 15, -0.1); board.add(rod); const cap = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.2, 16), silver); cap.position.set(sx * BW * 0.32, BH / 2 + 0.25, -0.1); board.add(cap); });
const X0 = -innerW / 2, top = BH / 2;
const head = plate(9, 1.3, (g, w, h) => {
const s = h * 0.82, y0 = (h - s) / 2; g.fillStyle = YEL; g.beginPath(); g.roundRect ? g.roundRect(0, y0, s, s, s * 0.14) : g.rect(0, y0, s, s); g.fill();
g.fillStyle = '#0b0b0d'; g.fillRect(s * 0.1, y0 + s * 0.2, s * 0.8, s * 0.06);
g.fillRect(s * 0.47, y0 + s * 0.24, s * 0.06, s * 0.16);
g.beginPath(); g.roundRect ? g.roundRect(s * 0.24, y0 + s * 0.4, s * 0.52, s * 0.42, s * 0.08) : g.rect(s * 0.24, y0 + s * 0.4, s * 0.52, s * 0.42); g.fill();
g.fillStyle = YEL; g.fillRect(s * 0.31, y0 + s * 0.48, s * 0.17, s * 0.13); g.fillRect(s * 0.52, y0 + s * 0.48, s * 0.17, s * 0.13);
g.fillStyle = YEL; g.font = `800 ${h * 0.7}px "Inter Tight", Arial`; g.textBaseline = 'middle'; g.fillText('Départs', s * 1.3, h / 2 + 2);
});
head.position.set(X0 + 4.5, top - 0.95, 0.52); board.add(head);
const sub = plate(7, 0.5, (g, w, h) => { g.fillStyle = 'rgba(236,237,239,0.6)'; g.font = `700 ${h * 0.6}px "Inter Tight", Arial`; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('BOF BOF · HIVER 26/27', w - 4, h / 2); });
sub.position.set(-X0 - 3.5, top - 0.95, 0.52); if (!portrait) board.add(sub);
const names = portrait ? ['INFO', 'DÉTAIL'] : ['INFO', 'DÉTAIL', 'REMARQUE'];
let cx = X0; const colX = cols.map((n) => { const x = cx; cx += n * STEP + COLGAP; return x; });
names.forEach((t, i) => { const w = cols[i] * STEP; const m = plate(w, 0.42, (g, ww, h) => { g.fillStyle = YEL; g.font = `800 ${h * 0.62}px "Inter Tight", Arial`; g.textBaseline = 'middle'; g.fillText(t, 2, h / 2); }); m.position.set(colX[i] + w / 2 - CG, top - 1.95, 0.52); board.add(m); });
rows.forEach((r, ri) => {
const y = top - 2.6 - ri * RH;
const texts = portrait ? [pad(r.k, NI), pad(r.v, ND)] : [pad(r.k, NI), pad(r.v, ND), pad(r.rem, NR)];
const colors = [WHT, YEL, WHT];
const mods = [];
texts.forEach((t, ci) => [...t].forEach((ch, i) => mods.push(cell(board, colX[ci] + i * STEP + CW / 2, y, ch, colors[ci]))));
const hit = new T.Mesh(new T.PlaneGeometry(innerW, RH * 0.95), new T.MeshBasicMaterial({ visible: false })); hit.position.set(0, y, 0.6); hit.userData.row = ri; board.add(hit);
lines.push({ r, mods, hit });
});
const sTxt = portrait ? 'HIVER 26/27' : 'BOF BOF  8 STATIONS  HIVER 26/27', SW = sTxt.length * STEP + 1.2, SH = 1.7, sy = -BH / 2 - 2.3;
const small = new T.Group(); small.position.set(0, sy, 0); board.add(small);
frame(small, SW, SH);
[-1, 1].forEach((sx) => { const rod = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 1.5, 10), silver); rod.position.set(sx * SW * 0.3, SH / 2 + 0.7, -0.1); small.add(rod); });
const sm = [...sTxt].map((ch, i) => cell(small, -sTxt.length * STEP / 2 + i * STEP + CW / 2, 0, ch, WHT));
lines.push({ r: { link: null }, mods: sm, hit: new T.Object3D() });
BH = BH + 4.2; board.position.y = 2.1;
led.visible = false;
started = false;
};
const flipTo = (m, to) => { if (m.t < 1) { m.queue.push(to); return; }
if (to === m.cur) { if (m.queue.length) flipTo(m, m.queue.shift()); else if (m.onDone) { const f = m.onDone; m.onDone = null; f(); } return; }
m.next = to; m.t = 0;
m.lTop.material.map = charTex(m.cur, m.hot); m.lBot.material.map = charTex(to, m.hot); m.sTop.material.map = charTex(to, m.hot);
[m.lTop, m.lBot, m.sTop].forEach((o) => { o.material.emissiveMap = o.material.map; o.material.needsUpdate = true; }); m.pA.visible = true; m.pB.visible = false; };
const spin = (li, delay = 0) => { const L = lines[li]; if (!L || L.busy) return; L.busy = true; let left = L.mods.length;
L.mods.forEach((m, i) => { const turns = still() ? 0 : 3 + Math.floor(i / 3) + Math.floor(Math.random() * 3); setTimeout(() => { for (let n = 0; n < turns; n++) m.queue.push(FLAPS[Math.floor(Math.random() * FLAPS.length)]); m.queue.push(m.ch); m.onDone = () => { if (--left === 0) L.busy = false; }; if (m.t >= 1) flipTo(m, m.queue.shift()); }, delay + i * 30); }); };
let started = false;
const startAll = () => { if (started) return; started = true; lines.forEach((_, i) => spin(i, 300 + i * 260)); };
if (!still()) setInterval(() => { if (!document.hidden && started) spin(Math.floor(Math.random() * lines.length)); }, 5200);
build(camera.aspect < 0.95);
const ray = new T.Raycaster(), mouse = new T.Vector2(); let hoverRow = -1;
const pick = (e) => { const r = renderer.domElement.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); const h = ray.intersectObjects(lines.map((l) => l.hit).filter((o) => o.isMesh))[0]; return h ? h.object.userData.row : -1; };
renderer.domElement.addEventListener('pointermove', (e) => { const r = pick(e); if (r !== hoverRow) { hoverRow = r; if (r >= 0) spin(r); } renderer.domElement.style.cursor = r >= 0 && lines[r].r.link ? 'pointer' : ''; });
renderer.domElement.addEventListener('click', (e) => { const r = pick(e); const link = r >= 0 && lines[r].r.link; if (!link) return; const t = document.querySelector(link); if (t && window.BOF && window.BOF.lenis) window.BOF.lenis.scrollTo(t, { offset: -40, duration: 1.6 }); else if (t) t.scrollIntoView({ behavior: 'smooth' }); });
tab.classList.add('is-loaded');
camera.far = 400; camera.updateProjectionMatrix();
const look = new T.Vector3(0, 0, 0);
updateTab = (st, dt) => {
const portrait = camera.aspect < 0.95;
if (portrait !== layoutPortrait) build(portrait);
startAll();
const D = 0.13;
lines.forEach((L) => L.mods.forEach((m) => {
if (m.t >= 1) return;
m.t = Math.min(1, m.t + dt / D);
if (m.t < 0.5) { m.pA.rotation.x = (m.t / 0.5) * Math.PI / 2; }
else { if (m.pA.visible) { m.pA.visible = false; m.pB.visible = true; m.pB.rotation.x = -Math.PI / 2; } m.pB.rotation.x = -Math.PI / 2 * (1 - (m.t - 0.5) / 0.5); }
if (m.t >= 1) { m.pB.visible = false; m.cur = m.next; m.sBot.material.map = m.sBot.material.emissiveMap = charTex(m.cur, m.hot); m.sBot.material.needsUpdate = true;
if (m.queue.length) flipTo(m, m.queue.shift()); else if (m.onDone) { const f = m.onDone; m.onDone = null; f(); } }
}));
const tf = Math.tan((camera.fov * Math.PI / 180) / 2);
const dist = Math.max((BW / 2) / (tf * camera.aspect) * 1.2, (BH / 2) / tf * (portrait ? 1.3 : 1.25));
const e = st.p * st.p * (3 - 2 * st.p);
const az = lerp(portrait ? 0.25 : 0.42, 0, e) + st.mx * 0.08, el = lerp(-0.12, 0.03, e) - st.my * 0.05, d = dist * lerp(portrait ? 1 : 1.32, 0.95, e);
camera.position.set(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
camera.lookAt(look);
const cw = renderer.domElement.clientWidth, ch = renderer.domElement.clientHeight;
camera.setViewOffset(cw, ch, 0, -ch * ((portrait ? 0.08 : 0.25) * (1 - e) + 0.06 * e), cw, ch);
S.showPanels(st.p);
};
});
const THERMAL = ['#1A0E8C', '#2B1BFF', '#7A1FD6', '#C21FB0', '#FF2E88', '#FF5A1F', '#FF9A00', '#FFD400', '#FFF6D8'].map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const djSlug = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const djCache = {};
const DJ_PHOTOS = ["adam-ten", "anotr", "bedouin", "chloe-caillet", "chris-stussy", "cloonee", "danny-howard", "dennis-cruz", "east-end-dubs", "ewan-mcvicar", "franky-rizardo", "jamie-jones", "josh-baker", "mau-p", "max-dean", "michael-bibi", "mochakk", "pawsa", "prospa", "rampa", "toman", "tsha", "vintage-culture"];
const thermalize = (ctx, S) => {
const img = ctx.getImageData(0, 0, S, S), d = img.data;
for (let i = 0; i < d.length; i += 4) {
if (d[i + 3] < 8) { d[i + 3] = 0; continue; }
let l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; l = Math.min(1, Math.max(0, (l - 0.06) / 0.86));
const f = Math.min(7.999, (0.12 + l * 0.88) * 8), k = Math.floor(f), tt = f - k, a = THERMAL[k], b = THERMAL[k + 1];
d[i] = a[0] + (b[0] - a[0]) * tt; d[i + 1] = a[1] + (b[1] - a[1]) * tt; d[i + 2] = a[2] + (b[2] - a[2]) * tt;
}
ctx.putImageData(img, 0, 0);
};
const djPortrait = (name) => {
if (djCache[name]) return djCache[name];
const S = 160, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
const done = () => { thermalize(g, S); return c.toDataURL('image/png'); };
return (djCache[name] = new Promise((res) => {
const im = new Image();
im.onload = () => { const r = Math.max(S / im.width, S / (im.height * 0.55)); g.drawImage(im, (S - im.width * r) / 2, -im.height * r * 0.01, im.width * r, im.height * r); res(done()); };
im.onerror = () => {
let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
const rr = (a, b) => { h = (h * 1103515245 + 12345) >>> 0; return a + (h / 4294967296) * (b - a); };
const tilt = rr(-0.18, 0.18), hx = S / 2 + rr(-6, 6), hy = S * 0.4, hr = S * rr(0.19, 0.23);
g.save(); g.translate(hx, hy); g.rotate(tilt);
const body = g.createRadialGradient(0, S * 0.55, 4, 0, S * 0.55, S * 0.5); body.addColorStop(0, '#9a9a9a'); body.addColorStop(1, '#2a2a2a');
g.fillStyle = body; g.beginPath(); g.ellipse(0, S * 0.62, S * rr(0.36, 0.44), S * 0.34, 0, Math.PI, 0); g.lineTo(S * 0.5, S); g.lineTo(-S * 0.5, S); g.fill();
g.fillStyle = '#7a7a7a'; g.fillRect(-hr * 0.38, hr * 0.7, hr * 0.76, hr * 0.9);
const face = g.createRadialGradient(-hr * 0.15, -hr * 0.05, 2, 0, 0, hr * 1.1); face.addColorStop(0, '#ffffff'); face.addColorStop(0.45, '#d8d8d8'); face.addColorStop(1, '#5a5a5a');
g.fillStyle = face; g.beginPath(); g.ellipse(0, 0, hr * 0.86, hr, 0, 0, Math.PI * 2); g.fill();
if (rr(0, 1) < 0.6) { g.fillStyle = '#3a3a3a'; g.beginPath(); g.ellipse(0, -hr * 0.62, hr * 0.92, hr * 0.5, 0, Math.PI, 0); g.fill(); }
g.strokeStyle = '#222'; g.lineWidth = hr * 0.16; g.beginPath(); g.arc(0, -hr * 0.05, hr * 1.05, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
g.fillStyle = '#444'; [-1, 1].forEach((sd) => { g.beginPath(); g.ellipse(sd * hr * 0.98, hr * 0.12, hr * 0.24, hr * 0.34, 0, 0, Math.PI * 2); g.fill(); });
g.restore();
res(done());
};
if (name === 'guest' || !DJ_PHOTOS.includes(djSlug(name))) im.onerror(); else im.src = `assets/djs/${djSlug(name)}.png`;
}));
};
const alps = document.getElementById('alps');
if (alps) requestAnimationFrame(() => {
let updateAlps = () => {};
const S = makeScene(alps, alps.querySelector('canvas'), { fov: 38, near: 0.05, far: 600, update: (st, dt) => updateAlps(st, dt) });
if (S) {
const { scene, camera, renderer } = S;
renderer.toneMappingExposure = 0.76;
const data = JSON.parse(document.getElementById('alpsData').textContent);
const TX0 = 530, TY0 = 363, NX = 3, NY = 5, Z = 10, PX = 256;
const LAT0 = 45.75, MPP = 156543.03392 * Math.cos(LAT0 * Math.PI / 180) / Math.pow(2, Z);
const KM = MPP / 1000, EXAG = 1.35;
const W = NX * PX, H = NY * PX, WK = W * KM, DK = H * KM;
const tileXY = (lat, lon) => {
const n = Math.pow(2, Z), x = (lon + 180) / 360 * n, r = lat * Math.PI / 180;
const y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n;
return [(x - TX0) * PX, (y - TY0) * PX];
};
const HORIZON = new T.Color('#16247a'), ZENITH = new T.Color('#04081F');
scene.fog = new T.FogExp2('#13206a', 0.022);
const sky = new T.Mesh(new T.SphereGeometry(400, 32, 16), new T.ShaderMaterial({
side: T.BackSide, depthWrite: false, fog: false,
uniforms: { top: { value: ZENITH }, bot: { value: HORIZON } },
vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(vP.y * 2.4, 0.0, 1.0); vec3 c = mix(bot, top, pow(h, 0.55)); c += vec3(0.08, 0.12, 0.45) * pow(1.0 - h, 6.0); gl_FragColor = vec4(c, 1.0); }',
}));
scene.add(sky);
const starG = new T.BufferGeometry(), sp = [];
for (let i = 0; i < 1400; i++) { const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.2; sp.push(Math.cos(a) * Math.cos(e) * 380, Math.sin(e) * 380, Math.sin(a) * Math.cos(e) * 380); }
starG.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
const stars = new T.Points(starG, new T.PointsMaterial({ color: '#dfe6ff', size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false }));
scene.add(stars);
scene.add(new T.HemisphereLight('#6A82FF', '#04081F', 0.16));
const moon = new T.DirectionalLight('#dfe6ff', 1.7); moon.position.set(-70, 26, -40); scene.add(moon);
const glow = new T.DirectionalLight('#2342FF', 1.4); glow.position.set(50, 12, 60); scene.add(glow);
const group = new T.Group(); scene.add(group);
const labelsEl = document.getElementById('alpsLabels');
const ui = {
idx: document.getElementById('aIdx'), date: document.getElementById('aDate'), alt: document.getElementById('aAlt'),
name: document.getElementById('aName'), venue: document.getElementById('aVenue'), list: document.getElementById('aArtists'), prog: document.getElementById('aProgress'),
};
ui.prog.innerHTML = data.map(() => '<i></i>').join('');
let heights = null, route = null, routeLen = [], stationAt = [], markers = [], trail = null, trailCount = 0, head = null;
const villages = [];
const loadTile = (x, y) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = `assets/terrain/${Z}_${x}_${y}.png`; });
const tiles = [];
for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) tiles.push(loadTile(TX0 + i, TY0 + j).then((im) => [i, j, im]));
Promise.all(tiles).then((list) => {
const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
const g = cv.getContext('2d');
list.forEach(([i, j, im]) => g.drawImage(im, i * PX, j * PX));
const px = g.getImageData(0, 0, W, H).data;
heights = new Float32Array(W * H);
for (let k = 0; k < W * H; k++) heights[k] = (px[k * 4] * 256 + px[k * 4 + 1] + px[k * 4 + 2] / 256) - 32768;
build();
alps.classList.add('is-loaded');
}).catch((err) => { console.error(err); alps.classList.add('no-webgl'); });
const hAt = (x, y) => {
x = clamp(x, 0, W - 1.001); y = clamp(y, 0, H - 1.001);
const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
const a = heights[y0 * W + x0], b = heights[y0 * W + x0 + 1], c = heights[(y0 + 1) * W + x0], d = heights[(y0 + 1) * W + x0 + 1];
return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
};
const toWorld = (x, y, lift = 0) => new T.Vector3(x * KM - WK / 2, hAt(x, y) / 1000 * EXAG + lift, y * KM - DK / 2);
const MSTEP = matchMedia('(pointer: coarse)').matches ? 4 : 2;
const meshH = (x, y) => {
const gw = W / MSTEP, gh = H / MSTEP, fi = clamp(x * (gw - 1) / W, 0, gw - 1.001), fj = clamp(y * (gh - 1) / H, 0, gh - 1.001);
const i = Math.floor(fi), j = Math.floor(fj), fx = fi - i, fy = fj - j, hv = (a, b) => hAt(a * MSTEP, b * MSTEP);
const ha = hv(i, j), hb = hv(i, j + 1), hc = hv(i + 1, j + 1), hd = hv(i + 1, j);
const h = fx + fy <= 1 ? ha + (hd - ha) * fx + (hb - ha) * fy : hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fy);
return h / 1000 * EXAG;
};
const onMesh = (x, y, lift = 0) => new T.Vector3(x * KM - WK / 2, meshH(x, y) + lift, y * KM - DK / 2);
const glowTex = (() => {
const c = document.createElement('canvas'); c.width = c.height = 128;
const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(140,160,255,0.9)'); gr.addColorStop(0.5, 'rgba(35,66,255,0.35)'); gr.addColorStop(1, 'rgba(35,66,255,0)');
g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
return new T.CanvasTexture(c);
})();
const seeded = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const winTex = (() => {
const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r0 = seeded(5);
g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
for (let y = 5; y < 64; y += 11) for (let x = 3; x < 64; x += 8) { const r = r0(); if (r < 0.6) { g.globalAlpha = 0.45 + r0() * 0.55; g.fillStyle = r < 0.14 ? '#ffffff' : r < 0.4 ? '#c9d4ff' : '#6A82FF'; g.fillRect(x, y, 4, 5); } }
const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
})();
const matWall = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0.05, emissive: '#000000' });
matWall.onBeforeCompile = (sh) => {
sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
.replace('#include <begin_vertex>', `#include <begin_vertex>
vec4 wp4 = vec4(transformed, 1.0); vec3 n0 = objectNormal;
#ifdef USE_INSTANCING
wp4 = instanceMatrix * wp4; n0 = mat3(instanceMatrix) * n0;
#endif
wp4 = modelMatrix * wp4; vWP = wp4.xyz; vWN = normalize(mat3(modelMatrix) * n0);`);
sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;\nfloat h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }')
.replace('#include <emissivemap_fragment>', `
vec3 an = abs(vWN); float hc = an.x > an.z ? vWP.z : vWP.x;
vec2 gw = vec2(hc / 0.0105, vWP.y / 0.0135); vec2 cell = floor(gw), fw = fract(gw);
float side = step(an.y, 0.5);
float win = step(0.27, fw.x) * step(fw.x, 0.73) * step(0.32, fw.y) * step(fw.y, 0.8) * side;
float r1 = h21(cell + floor(vWP.xz * 3.0)), r2 = h21(cell.yx * 1.7 + 3.1);
float lit = step(r1, 0.52) * win;
vec3 wc = mix(vec3(0.72, 0.8, 1.0), vec3(1.0, 0.76, 0.46), step(r2, 0.2));
totalEmissiveRadiance += wc * lit * (0.55 + r2 * 0.9);
diffuseColor.rgb *= 1.0 - win * (1.0 - lit) * 0.55;
diffuseColor.rgb *= 1.0 - step(fw.y, 0.07) * side * 0.4;`);
};
const matTop = new T.MeshStandardMaterial({ color: '#0c1440', roughness: 0.9 });
const matChimney = new T.MeshStandardMaterial({ color: '#141a3a', roughness: 0.9 });
const matSnowRoof = new T.MeshStandardMaterial({ color: '#dbe3ff', roughness: 0.95 });
const matPine = new T.MeshStandardMaterial({ color: '#0a1035', roughness: 0.95, flatShading: true });
const pineG = (() => { const parts = [[1, 0.45, 0.12], [0.75, 0.38, 0.4], [0.5, 0.32, 0.66]].map(([r, h, y]) => { const c = new T.ConeGeometry(r, h, 7); c.translate(0, y + h / 2, 0); return c.toNonIndexed(); }); const pos = []; parts.forEach((g) => pos.push(...g.attributes.position.array)); const m = new T.BufferGeometry(); m.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); m.computeVertexNormals(); return m; })();
const matWoodRoof = new T.MeshStandardMaterial({ color: '#1b2668', roughness: 0.8 });
const boxG = new T.BoxGeometry(1, 1, 1); boxG.translate(0, 0.5, 0);
const roofG = (() => { const sh = new T.Shape(); sh.moveTo(-0.5, 0); sh.lineTo(0.5, 0); sh.lineTo(0, 1); sh.closePath(); const g = new T.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -0.5); return g; })();
const spireG = new T.ConeGeometry(0.5, 1, 4); spireG.translate(0, 0.5, 0);
const BPS = 124 / 60;
const buildVillage = (k, d, base, px, py) => {
const rnd = seeded(k * 977 + 31), R = (a, b) => a + rnd() * (b - a);
const walls = [], roofs = [], woodRoofs = [], spires = [], chimneys = [];
const SC = 1.5;
const at = (dx, dy) => onMesh(px + dx * SC, py + dy * SC, -0.02);
const contour = (dx, dy) => { const gx = hAt(px + dx + 1, py + dy) - hAt(px + dx - 1, py + dy), gy = hAt(px + dx, py + dy + 1) - hAt(px + dx, py + dy - 1); return Math.atan2(-gx, -gy) + Math.PI / 2; };
const put = (dx, dy, w, dd, h, roof, kind = 'snow', rot) => {
const p = at(dx, dy), a = rot === undefined ? contour(dx * SC, dy * SC) : rot;
w *= SC; dd *= SC; h *= SC; roof *= SC;
walls.push([p, w, dd, h + 0.035, a]);
if (roof) (kind === 'wood' ? woodRoofs : roofs).push([p.clone().add(new T.Vector3(0, h + 0.035, 0)), w * 1.2, dd * 1.16, roof, a]);
if (roof && rnd() < 0.55) { const ox = (rnd() - 0.5) * w * 0.5; chimneys.push([p.clone().add(new T.Vector3(Math.cos(a) * ox, h + 0.035 + roof * 0.35, -Math.sin(a) * ox)), w * 0.1, dd * 0.1, roof * 0.6, a]); }
};
const chalets = (n, r, big = 1) => { for (let i = 0; i < n; i++) { const rr = Math.max(1.5, r * Math.sqrt(R(0.08, 1))), a = R(0, Math.PI * 2); put(Math.cos(a) * rr, Math.sin(a) * rr, R(0.055, 0.1) * big, R(0.045, 0.075) * big, R(0.03, 0.055) * big, R(0.028, 0.042) * big); } };
const spire = (dx, dy) => { const p = at(dx, dy); walls.push([p, 0.045, 0.045, 0.16, 0]); spires.push([p.clone().add(new T.Vector3(0, 0.18, 0)), 0.06, 0.06, 0.12, Math.PI / 4]); };
const n = d.name;
if (n === 'Val Thorens') {
for (let row = 0; row < 4; row++) for (let i = 0; i < 6 + row; i++) { const a = -1.2 + (i / (5 + row)) * 2.4 + R(-0.08, 0.08), rr = 2.2 + row * 1.3; put(Math.cos(a) * rr, Math.sin(a) * rr - 1.5, R(0.14, 0.24), R(0.06, 0.08), R(0.09, 0.2), row % 2 ? 0 : 0.03, 'snow', -a + Math.PI / 2); }
chalets(10, 5);
} else if (n === 'Avoriaz') {
for (let i = 0; i < 16; i++) { const rr = 4.5 * Math.sqrt(R(0.05, 1)), a = R(0, Math.PI * 2); put(Math.cos(a) * rr, Math.sin(a) * rr, R(0.07, 0.11), R(0.06, 0.09), R(0.16, 0.3), R(0.08, 0.12), 'wood'); }
chalets(8, 5);
} else if (n === 'Les Arcs') {
for (let b = 0; b < 4; b++) { const r0 = 2 + b * 1.5, a0 = R(-0.6, 0.2); for (let i = 0; i < 7; i++) { const a = a0 + i * 0.16; put(Math.cos(a) * r0, Math.sin(a) * r0, 0.13, 0.07, 0.14 - Math.abs(i - 3) * 0.012, 0.02, 'wood', -a + Math.PI / 2); } }
chalets(10, 5.5);
} else if (n === 'Tignes') {
for (let i = 0; i < 11; i++) put(R(-3, 3), R(-2.5, 1.5), R(0.14, 0.26), R(0.06, 0.08), R(0.12, 0.26), 0);
chalets(10, 4.5);
const lp = at(0, 6), lake = new T.Mesh(new T.CircleGeometry(0.42, 40), new T.MeshStandardMaterial({ color: '#d7e0ff', roughness: 0.25, metalness: 0.1, emissive: '#2342FF', emissiveIntensity: 0.12 }));
lake.rotation.x = -Math.PI / 2; lake.scale.set(1.5, 0.8, 1); lake.position.copy(lp).add(new T.Vector3(0, 0.03, 0)); group.add(lake);
} else if (n === 'Chamonix') {
for (let i = 0; i < 46; i++) { const rr = 6.5 * Math.sqrt(R(0.02, 1)), a = R(0, Math.PI * 2); const tall = rnd() < 0.35; put(Math.cos(a) * rr, Math.sin(a) * rr * 0.7, R(0.07, 0.13), R(0.06, 0.1), tall ? R(0.08, 0.12) : R(0.04, 0.07), R(0.03, 0.045)); }
spire(0.6, -0.4);
} else if (n === "Val d'Isère") {
chalets(48, 5.5); spire(-0.4, 0.3);
} else if (n === 'Courchevel') {
chalets(32, 6, 1.35);
for (let i = 0; i < 4; i++) put(R(-2, 2), R(-2, 2), R(0.16, 0.22), R(0.09, 0.12), R(0.07, 0.1), 0.05);
} else {
chalets(50, 6.5);
}
const vp = at(0, 0), va = contour(0, 0);
const venueMat = new T.MeshStandardMaterial({ color: '#1a2a8c', roughness: 0.5, emissive: '#2342FF', emissiveIntensity: 0.5 });
const venue = new T.Mesh(boxG, [venueMat, venueMat, matTop, matTop, venueMat, venueMat]);
venue.position.copy(vp); venue.rotation.y = va; venue.scale.set(0.22 * SC, 0.11 * SC, 0.15 * SC); group.add(venue);
const inst = (list, geo, mat) => {
if (!list.length) return null;
const im = new T.InstancedMesh(geo, mat, list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), up = new T.Vector3(0, 1, 0);
list.forEach(([p, w, dd, h, a], i) => { q.setFromAxisAngle(up, a); sc.set(w, h, dd); m4.compose(p, q, sc); im.setMatrixAt(i, m4); });
group.add(im); return im;
};
const wallMesh = inst(walls, boxG, [matWall, matWall, matTop, matTop, matWall, matWall]);
if (wallMesh) { if (!wallMesh.instanceColor) wallMesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(walls.length * 3), 3); const pal = ['#1a2466', '#222c70', '#2a2f55', '#1b2150', '#30324f', '#3a3048', '#202a5c'].map((h) => new T.Color(h).convertSRGBToLinear()); for (let i = 0; i < walls.length; i++) wallMesh.setColorAt(i, pal[Math.floor(rnd() * pal.length)]); wallMesh.instanceColor.needsUpdate = true; }
inst(chimneys, boxG, matChimney);
const pines = [];
for (let i = 0; i < 90; i++) { const a = R(0, Math.PI * 2), rr = R(5.5, 10); const p = at(Math.cos(a) * rr, Math.sin(a) * rr); const h = R(0.035, 0.07); pines.push([p, h * 0.42, h * 0.42, h, R(0, 6.3)]); }
inst(pines, pineG, matPine);
const lamps = [];
for (let i = 0; i < 40; i++) { const a = R(0, Math.PI * 2), rr = R(0.8, 6); const p = at(Math.cos(a) * rr, Math.sin(a) * rr); lamps.push(p.x, p.y + 0.03, p.z); }
const lampG = new T.BufferGeometry(); lampG.setAttribute('position', new T.Float32BufferAttribute(lamps, 3));
group.add(new T.Points(lampG, new T.PointsMaterial({ color: '#ffd9a0', size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })));
inst(roofs, roofG, matSnowRoof); inst(woodRoofs, roofG, matWoodRoof); inst(spires, spireG, matSnowRoof);
const party = new T.Group(); party.position.copy(vp); party.scale.setScalar(SC); group.add(party);
const heat = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.TextureLoader().load(`assets/brand/station-${k + 1}.svg`), transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
heat.rotation.x = -Math.PI / 2; heat.position.y = 0.05; heat.scale.setScalar(0.95); party.add(heat);
const lasers = new T.Group(); lasers.position.y = 0.13; party.add(lasers);
['#6A82FF', '#2342FF', '#A3B4FF', '#6A82FF', '#2342FF', '#EAF0FF'].forEach((c, i) => {
const g = new T.CylinderGeometry(0.0025, 0.0025, 0.9, 6, 1, true); g.translate(0, 0.45, 0);
const l = new T.Mesh(g, new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.75, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
l.userData.ph = i * 1.1; lasers.add(l);
});
const NC = 240, cp = new Float32Array(NC * 3), base0 = new Float32Array(NC), phase = new Float32Array(NC);
for (let i = 0; i < NC; i++) { const rr = Math.sqrt(R(0, 1)) * 0.16 + 0.1, a = R(0, Math.PI * 2); cp[i * 3] = Math.cos(a) * rr; cp[i * 3 + 2] = Math.sin(a) * rr * 0.8; const wp = vp.clone().add(new T.Vector3(cp[i * 3], 0, cp[i * 3 + 2])); base0[i] = (onMesh((wp.x + WK / 2) / KM, (wp.z + DK / 2) / KM, 0.012).y - vp.y) / SC; cp[i * 3 + 1] = base0[i]; phase[i] = R(0, 0.35); }
const crowdG = new T.BufferGeometry(); crowdG.setAttribute('position', new T.BufferAttribute(cp, 3));
const crowd = new T.Points(crowdG, new T.PointsMaterial({ color: '#EAF0FF', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
party.add(crowd);
return { k, venueMat, heat, lasers, crowd, cp, base0, phase, party, pos: vp };
};
const partyLight = new T.PointLight('#6A82FF', 0, 1.8, 1.6); scene.add(partyLight);
const updateVillages = (st, active, close) => {
const beat = (st.t * BPS) % 1, pulse = still() ? 0.3 : Math.pow(1 - beat, 3);
villages.forEach((v) => {
const on = v.k === active;
v.venueMat.emissiveIntensity = on ? 0.6 + pulse * 1.6 : 0.35;
v.heat.material.opacity = on ? 0.45 + pulse * 0.4 : 0.14;
v.heat.scale.setScalar(on ? 0.95 + pulse * 0.08 : 0.8);
v.lasers.visible = on && close > 0.2;
v.crowd.visible = on && close > 0.1;
if (v.lasers.visible) v.lasers.children.forEach((l) => { const ph = l.userData.ph; l.rotation.set(Math.sin(st.t * 0.9 + ph) * 0.9, 0, Math.cos(st.t * 0.7 + ph * 1.3) * 0.9); l.material.opacity = (0.18 + pulse * 0.4) * close; });
if (v.crowd.visible && !still()) {
for (let i = 0; i < v.base0.length; i++) { const b = (st.t * BPS + v.phase[i]) % 1; v.cp[i * 3 + 1] = v.base0[i] + Math.pow(Math.sin(b * Math.PI), 2) * 0.014; }
v.crowd.geometry.attributes.position.needsUpdate = true;
}
if (on) { partyLight.position.copy(v.pos).add(new T.Vector3(0, 0.35, 0)); partyLight.intensity = (0.8 + pulse * 3) * close; }
});
};
const build = () => {
const STEP = MSTEP, gw = W / STEP, gh = H / STEP;
const geo = new T.PlaneGeometry(WK, DK, gw - 1, gh - 1);
geo.rotateX(-Math.PI / 2);
const P = geo.attributes.position;
for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) P.setY(j * gw + i, hAt(i * STEP, j * STEP) / 1000 * EXAG);
geo.computeVertexNormals();
const N = geo.attributes.normal, col = new Float32Array(P.count * 3);
const snow = new T.Color('#8f9fdc'), rock = new T.Color('#1a2257'), valley = new T.Color('#040824'), tmp = new T.Color();
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
for (let k = 0; k < P.count; k++) {
const h = P.getY(k) / EXAG, ny = N.getY(k);
const n1 = Math.sin(k * 12.9898) * 43758.5453, noise = (n1 - Math.floor(n1)) * 0.08;
const snowAmt = sstep(0.55, 0.82, ny + noise) * sstep(1.05, 1.5, h + noise);
const valAmt = 1 - sstep(0.6, 1.1, h);
tmp.copy(rock).lerp(valley, valAmt).lerp(snow, snowAmt);
col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
}
geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
const terrain = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.0 }));
group.add(terrain);
data.forEach((d, k) => {
const [x, y] = tileXY(d.lat, d.lon);
const base = toWorld(x, y, 0.02);
stationAt.push({ x, y, p: base });
villages.push(buildVillage(k, d, base, x, y));
const beam = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 2.2, 8, 1, true), new T.MeshBasicMaterial({ color: '#6A82FF', transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
beam.position.copy(base).add(new T.Vector3(0, 1.1, 0));
const halo = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
halo.position.copy(base).add(new T.Vector3(0, 0.12, 0)); halo.scale.setScalar(1.6);
const emp = new T.Sprite(new T.SpriteMaterial({ map: new T.TextureLoader().load(`assets/brand/station-${k + 1}.svg`), transparent: true, depthWrite: false, fog: false }));
emp.position.copy(base).add(new T.Vector3(0, 2.3, 0)); emp.scale.setScalar(1.1);
group.add(beam, halo, emp);
const el = document.createElement('div');
el.className = 'alps__label';
el.innerHTML = `<b>${d.name}</b><span>${d.date} · ${d.alt.toLocaleString('fr-FR')} m</span>`;
labelsEl.append(el);
markers.push({ beam, halo, emp, el, base, top: base.clone().add(new T.Vector3(0, 3.2, 0)) });
});
const pts = [];
for (let k = 0; k < stationAt.length - 1; k++) {
const a = stationAt[k], b = stationAt[k + 1], dist = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(8, Math.round(dist / 2));
stationAt[k].i = pts.length;
for (let s = 0; s < n; s++) {
const t = s / n, bend = Math.sin(t * Math.PI) * 0.12;
const x = lerp(a.x, b.x, t) + (b.y - a.y) * bend, y = lerp(a.y, b.y, t) - (b.x - a.x) * bend;
pts.push(toWorld(x, y, 0.08));
}
}
stationAt[stationAt.length - 1].i = pts.length;
pts.push(stationAt[stationAt.length - 1].p.clone().add(new T.Vector3(0, 0.06, 0)));
route = new T.CatmullRomCurve3(pts, false, 'centripetal');
const segs = pts.length * 4;
const lens = route.getLengths(segs); routeLen = lens;
route.arcLengthDivisions = segs * 4; route.updateArcLengths();
{ const N = 6000, smp = []; for (let i = 0; i <= N; i++) smp.push(route.getPointAt(i / N));
stationAt.forEach((st) => { let best = 0, bd = Infinity; smp.forEach((q, i) => { const dd = q.distanceToSquared(st.p); if (dd < bd) { bd = dd; best = i; } }); st.u = best / N; }); }
const tube = new T.TubeGeometry(route, segs, 0.045, 6, false);
trailCount = tube.index.count;
trail = new T.Mesh(tube, new T.MeshBasicMaterial({ color: '#c9d4ff', transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
trail.geometry.setDrawRange(0, 0);
group.add(trail);
head = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
head.scale.setScalar(2.4); group.add(head);
};
const prevBtn = document.getElementById('aPrev'), nextBtn = document.getElementById('aNext'), nextLabel = document.getElementById('aNextLabel');
const jump = [...document.querySelectorAll('[data-go]')];
const pAt = (i) => (i === 0 ? 0.02 : (i + 0.7) / data.length);
const tw = { from: pAt(0), to: pAt(0), t: 1, dur: 1, target: 0, fromIdx: 0 };
const goTo = (i) => {
i = clamp(i, 0, data.length - 1);
if (i === tw.target && tw.t >= 1) return;
tw.fromIdx = tw.t < 0.5 ? tw.fromIdx : tw.target; tw.target = i; tw.t = still() ? 0.999 : 0;
const hopKm = stationAt.length ? stationAt[tw.fromIdx].p.distanceTo(stationAt[i].p) : 10;
tw.dur = Math.min(3.2, 1.6 + hopKm * 0.03);
if (shown !== i) { shown = i; render(i); }
jump.forEach((b) => b.setAttribute('aria-current', String(+b.dataset.go === i)));
const bar = jump[0] && jump[0].parentElement, act = jump[i];
if (bar && act && bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: act.offsetLeft - (bar.clientWidth - act.offsetWidth) / 2, behavior: still() ? 'auto' : 'smooth' });
};
prevBtn.addEventListener('click', () => goTo(Math.max(0, tw.target) - 1));
nextBtn.addEventListener('click', () => goTo(Math.max(0, tw.target) + 1));
jump.forEach((b) => b.addEventListener('click', () => goTo(+b.dataset.go)));
addEventListener('keydown', (e) => {
const r = alps.getBoundingClientRect();
if (r.bottom < innerHeight * 0.5 || r.top > innerHeight * 0.5 || e.target.closest('input, textarea')) return;
if (e.key === 'ArrowRight') { e.preventDefault(); goTo(tw.target + 1); }
if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(tw.target - 1); }
});
let shown = -1, scr = 0;
const render = (i) => {
const d = data[i];
ui.idx.textContent = `${String(i + 1).padStart(2, '0')}/08`; ui.date.textContent = d.date; ui.alt.textContent = `${d.alt.toLocaleString('fr-FR')} m`;
ui.name.textContent = d.name; ui.venue.textContent = d.venue;
const bk = document.getElementById('aBook'); if (bk) { bk.href = d.page + '#billets'; bk.dataset.label = d.name; }
ui.list.classList.remove('is-in');
ui.list.innerHTML = d.artists.map((a, k) => a[1] === 'guest'
? `<li class="guest" style="--i:${k}"><span class="dj" data-dj="guest" aria-hidden="true"></span><span class="alps__who">Special guest<span class="guest__code" aria-label="nom secret">? ? ? ? ?</span></span><small class="num">${a[2] || ''}</small></li>`
: `<li style="--i:${k}"><span class="dj" data-dj="${a[0]}" aria-hidden="true"></span><span class="alps__who">${a[0]}${a[1] ? `<em>${a[1]}</em>` : ''}</span><small class="num">${a[2] || ''}</small></li>`).join('');
ui.list.querySelectorAll('.dj').forEach((el) => djPortrait(el.dataset.dj).then((url) => { el.style.backgroundImage = `url(${url})`; }));
void ui.list.offsetWidth; ui.list.classList.add('is-in');
[...ui.prog.children].forEach((b, k) => b.classList.toggle('on', k <= i));
const mark = document.getElementById('aMark'); if (mark) mark.src = `assets/brand/station-${i + 1}.svg`;
prevBtn.disabled = i === 0; nextBtn.disabled = i === data.length - 1;
nextLabel.textContent = i < data.length - 1 ? data[i + 1].name : 'Fin de la tournée';
clearInterval(scr);
const code = ui.list.querySelector('.guest__code');
if (code && !still()) scr = setInterval(() => { code.textContent = Array.from({ length: 6 }, () => '?#%*&!§'[Math.floor(Math.random() * 7)]).join(' '); }, 90);
};
shown = 0; render(0); jump.forEach((b) => b.setAttribute('aria-current', String(b.dataset.go === '0')));
if (window.__alpsPending != null) { const i = window.__alpsPending; window.__alpsPending = null; goTo(i); }
const camPos = new T.Vector3(), camLook = new T.Vector3(), dir = new T.Vector3(1, 0, 0), v3 = new T.Vector3();
let init = false;
updateAlps = (st, dt) => {
if (!route) { camera.position.set(0, 40, 80); camera.lookAt(0, 0, 0); return; }
if (tw.t < 1) tw.t = Math.min(1, tw.t + dt / tw.dur);
const fk = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - Math.pow(-2 * tw.t + 2, 3) / 2;
const A = stationAt[tw.fromIdx], B = stationAt[tw.target];
const hop = A.p.distanceTo(B.p), arc = Math.sin(fk * Math.PI);
const focus = A.p.clone().lerp(B.p, fk).add(new T.Vector3(0, arc * Math.min(4, 0.6 + hop * 0.12), 0));
const u = lerp(A.u, B.u, fk);
v3.subVectors(B.p, A.p).setY(0);
if (v3.lengthSq() > 1e-6) dir.lerp(v3.normalize(), init ? 1 - Math.pow(0.08, dt) : 1).normalize();
const side = new T.Vector3(-dir.z, 0, dir.x);
const orbit = (still() ? 0 : Math.sin(st.t * 0.15) * 0.15) + st.mx * 0.08;
side.applyAxisAngle(new T.Vector3(0, 1, 0), orbit);
const close = A === B ? 1 : Math.pow(1 - arc, 1.6);
const t = fk, travel = fk;
const hub = focus.clone().lerp(fk < 0.5 ? A.p : B.p, close);
const wide = 13 + Math.min(14, hop * 0.35);
const target = hub.clone().addScaledVector(side, lerp(wide, 4.0, close)).add(new T.Vector3(0, lerp(2.8, 2.15, close) - st.my * 0.3, 0)).addScaledVector(dir, lerp(-3, -1.0, close));
{
const groundKm = (wx, wz) => hAt((wx + WK / 2) / KM, (wz + DK / 2) / KM) / 1000 * EXAG;
let need = groundKm(target.x, target.z) + 0.8;
for (let f = 0.06; f <= 0.9; f += 0.06) {
const wx = lerp(target.x, hub.x, f), wz = lerp(target.z, hub.z, f);
need = Math.max(need, (groundKm(wx, wz) + 0.35 - hub.y * f) / (1 - f));
}
target.y = Math.max(target.y, need);
}
if (!init) { camPos.copy(target); camLook.copy(focus); init = true; }
const k = 1 - Math.pow(0.18, dt), kl = 1 - Math.pow(0.1, dt);
camPos.lerp(target, k); camLook.lerp(hub.clone().addScaledVector(dir, lerp(3, 0, close)).add(new T.Vector3(0, lerp(1.4, 0.3, close), 0)), kl);
camera.position.copy(camPos); camera.lookAt(camLook);
const cw = renderer.domElement.clientWidth, ch = renderer.domElement.clientHeight;
if (cw > 860 || cw > ch * 1.25) camera.setViewOffset(cw, ch, -cw * lerp(0.22, 0.17, close), ch * 0.04 * close, cw, ch); else camera.setViewOffset(cw, ch, 0, ch * (cw < 700 ? 0.2 : 0.12), cw, ch);
sky.position.copy(camPos); stars.position.copy(camPos);
trail.geometry.setDrawRange(0, Math.floor(trailCount * clamp(u, 0, 1) / 3) * 3);
head.position.copy(focus).add(new T.Vector3(0, 0.08, 0));
head.scale.setScalar(lerp(2.2, 0.25, close) + (still() ? 0 : Math.sin(st.t * 4) * 0.25 * (1 - close)));
const s = tw.target;
updateVillages(st, s, close);
const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
markers.forEach((m, k) => {
v3.copy(m.top).project(camera);
const visible = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
m.el.classList.toggle('is-hidden', !visible);
m.el.classList.toggle('is-active', k === s);
m.el.classList.toggle('is-dim', k !== s);
m.el.style.transform = `translate3d(${clamp((v3.x + 1) / 2 * w, 64, w - 64).toFixed(1)}px, ${((1 - v3.y) / 2 * h).toFixed(1)}px, 0) translate(-50%, -100%)`;
const near = k === s ? close : 0;
m.emp.position.copy(m.base).add(new T.Vector3(0, lerp(2.3, 0.75, near), 0));
m.top.copy(m.base).add(new T.Vector3(0, lerp(3.2, 1.2, near), 0));
m.halo.material.opacity = lerp(1, 0.25, near);
m.halo.scale.setScalar(k === s ? lerp(2.6 + Math.sin(st.t * 3) * 0.3, 0.9, near) : 1.2);
m.beam.material.opacity = k === s ? lerp(0.9, 0.3, near) : 0.25;
m.emp.scale.setScalar(k === s ? lerp(1.7, 0.26, near) + Math.sin(st.t * 2) * 0.04 : 0.9);
m.emp.material.opacity = k === s ? 1 : 0.55;
});
};
}
});
const venueEl = document.getElementById('lieu');
if (venueEl) lazy(venueEl, () => {
const cfg = JSON.parse(document.getElementById('venueData').textContent);
const plan = cfg.plan;
const stage = venueEl.querySelector('.venue__stage');
let updateVenue = () => {}, afterRender = () => {};
const S = makeScene(stage, stage.querySelector('canvas'), { fov: 34, alpha: true, near: 0.1, far: 500, update: (st, dt) => updateVenue(st, dt), after: () => afterRender() });
if (!S) return;
venueEl.classList.add('is-loaded');
const { scene, camera, renderer } = S;
renderer.toneMappingExposure = 1.1;
scene.add(new T.HemisphereLight('#9fb0ff', '#04081F', 0.55));
const key = new T.DirectionalLight('#ffffff', 0.9); key.position.set(-30, 40, 30); scene.add(key);
const root3 = new T.Group(); scene.add(root3);
const lineMat = new T.LineBasicMaterial({ color: '#EAF0FF', transparent: true, opacity: 0.4 });
const lineSoft = new T.LineBasicMaterial({ color: '#6A82FF', transparent: true, opacity: 0.24 });
const box = (w, h, d, mat, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); root3.add(m); return m; };
const edges = (mesh, mat = lineMat) => { const l = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), mat); l.position.copy(mesh.position); l.rotation.copy(mesh.rotation); root3.add(l); return l; };
const line = (pts, mat = lineMat) => root3.add(new T.Line(new T.BufferGeometry().setFromPoints(pts.map((p) => new T.Vector3(...p))), mat));
const labelsBox = venueEl.querySelector('.venue__labels');
const labels = [];
const label = (text, x, y, z) => { const el = document.createElement('span'); el.textContent = text; labelsBox.append(el); labels.push({ el, p: new T.Vector3(x, y, z) }); };
const H = cfg.style === 'cave' ? 4.2 : 5;
const bounds = new T.Box3();
const wallMat = new T.MeshBasicMaterial({ color: '#2342FF', transparent: true, opacity: 0.05, side: T.DoubleSide, depthWrite: false });
const floorMat = new T.MeshStandardMaterial({ color: '#0b1342', roughness: 0.6, metalness: 0.2 });
plan.rooms.forEach((r) => {
bounds.expandByPoint(new T.Vector3(r.x - r.w / 2, 0, r.z - r.d / 2)); bounds.expandByPoint(new T.Vector3(r.x + r.w / 2, H, r.z + r.d / 2));
if (r.round) {
const rad = Math.min(r.w, r.d) / 2;
const fl = new T.Mesh(new T.CircleGeometry(rad, 64), floorMat); fl.rotation.x = -Math.PI / 2; fl.position.set(r.x, 0, r.z); root3.add(fl);
const wall = new T.Mesh(new T.CylinderGeometry(rad, rad, H, 64, 1, true), wallMat); wall.position.set(r.x, H / 2, r.z); root3.add(wall);
[0, H].forEach((y) => { const pts = []; for (let a = 0; a <= 64; a++) pts.push([r.x + Math.cos(a / 64 * Math.PI * 2) * rad, y, r.z + Math.sin(a / 64 * Math.PI * 2) * rad]); line(pts); });
for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; line([[r.x + Math.cos(t) * rad, 0, r.z + Math.sin(t) * rad], [r.x + Math.cos(t) * rad, H, r.z + Math.sin(t) * rad]], lineSoft); }
} else {
const fl = new T.Mesh(new T.PlaneGeometry(r.w, r.d), floorMat); fl.rotation.x = -Math.PI / 2; fl.position.set(r.x, 0, r.z); root3.add(fl);
[[r.w, 0, r.d / 2], [r.w, 0, -r.d / 2]].forEach(([w, , dz]) => { const m = new T.Mesh(new T.PlaneGeometry(w, H), wallMat); m.position.set(r.x, H / 2, r.z + dz); root3.add(m); edges(m); });
[[-r.w / 2], [r.w / 2]].forEach(([dx]) => { const m = new T.Mesh(new T.PlaneGeometry(r.d, H), wallMat); m.rotation.y = Math.PI / 2; m.position.set(r.x + dx, H / 2, r.z); root3.add(m); edges(m); });
if (cfg.style === 'cave') for (let z = r.z - r.d / 2; z <= r.z + r.d / 2 + 0.01; z += 3) { const pts = []; for (let a = 0; a <= 28; a++) { const t = a / 28 * Math.PI; pts.push([r.x + Math.cos(t) * r.w / 2, H + Math.sin(t) * Math.min(3, r.w * 0.2), z]); } line(pts, Math.round(z) % 6 === 0 ? lineMat : lineSoft); }
if (cfg.style === 'chalet') { for (let z = r.z - r.d / 2; z <= r.z + r.d / 2 + 0.01; z += r.d / 4) line([[r.x - r.w / 2 - 0.6, H, z], [r.x, H + r.w * 0.3, z], [r.x + r.w / 2 + 0.6, H, z]]); line([[r.x, H + r.w * 0.3, r.z - r.d / 2], [r.x, H + r.w * 0.3, r.z + r.d / 2]]); }
if (cfg.style === 'glass') for (let x = r.x - r.w / 2; x <= r.x + r.w / 2 + 0.01; x += 2) line([[x, 0, r.z + r.d / 2], [x, H, r.z + r.d / 2]], lineSoft);
if (cfg.style === 'club') for (let x = r.x - r.w / 2 + 3; x < r.x + r.w / 2; x += 4) line([[x, H, r.z - r.d / 2], [x, H, r.z + r.d / 2]], lineSoft);
}
if (r.label && plan.rooms.length > 1) label(r.label, r.x, H + 1.2, r.z - r.d / 2 + 1);
});
const sg = plan.stage, side = !!sg.side;
const stageMesh = box(sg.w, 0.8, sg.d, new T.MeshStandardMaterial({ color: '#1a2a8c', emissive: '#2342FF', emissiveIntensity: 0.6 }), sg.x, 0, sg.z); edges(stageMesh);
const booth = box(side ? 1 : 2.4, 1.1, side ? 2.4 : 1, new T.MeshStandardMaterial({ color: '#04081F', emissive: '#6A82FF', emissiveIntensity: 0.4 }), sg.x, 0.8, sg.z); edges(booth);
label('Scène', sg.x, 3.2, sg.z);
const beams = [];
for (let k = 0; k < 5; k++) {
const cone = new T.Mesh(new T.ConeGeometry(1.3, 9, 24, 1, true), new T.MeshBasicMaterial({ color: k % 2 ? '#6A82FF' : '#FF2E88', transparent: true, opacity: 0.08, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
cone.geometry.translate(0, -4.5, 0);
const off = -0.4 + k * 0.2;
cone.position.set(sg.x + (side ? 0 : off * sg.w), H - 0.2, sg.z + (side ? off * sg.d : 0));
root3.add(cone); beams.push(cone);
}
const stagePos = new T.Vector3(sg.x, 0, sg.z);
const heatMat = new T.ShaderMaterial({
transparent: true, depthWrite: false, uniforms: { t: { value: 0 } },
vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
fragmentShader: `varying vec2 vUv; uniform float t;
vec3 ramp(float x){ vec3 c0=vec3(.102,.055,.549), c1=vec3(.169,.106,1.), c2=vec3(.478,.122,.839), c3=vec3(.761,.122,.69), c4=vec3(1.,.18,.533), c5=vec3(1.,.353,.122), c6=vec3(1.,.604,0.), c7=vec3(1.,.831,0.), c8=vec3(1.,.965,.847);
float k = floor(clamp(x, 0., .999) * 9.); return k<1.?c0:k<2.?c1:k<3.?c2:k<4.?c3:k<5.?c4:k<6.?c5:k<7.?c6:k<8.?c7:c8; }
void main(){ vec2 p = vUv; float f = 0.;
for (int i = 0; i < 7; i++) { float fi = float(i); vec2 c = vec2(0.5 + 0.34 * sin(t * (0.3 + fi * 0.07) + fi * 1.7), 0.5 + 0.34 * cos(t * (0.25 + fi * 0.05) + fi * 2.3)); f += 0.02 / dot(p - c, p - c); }
float edge = smoothstep(0.5, 0.42, length(p - 0.5) * (1.0 + 0.0)) ;
float v = clamp(f * 0.12, 0., 1.) * max(edge, step(0.0, -1.0));
gl_FragColor = vec4(ramp(v), smoothstep(0.02, 0.12, v) * 0.95); }`,
});
const fl = plan.floor;
const danceFloor = new T.Mesh(fl.r ? new T.CircleGeometry(fl.r, 64) : new T.PlaneGeometry(fl.w, fl.d), heatMat);
danceFloor.rotation.x = -Math.PI / 2; danceFloor.position.set(fl.x, 0.03, fl.z); root3.add(danceFloor);
label('Piste de danse', fl.x, 0.4, fl.z);
plan.bars.forEach((b) => {
const bar = box(b.w, 1.1, b.d, new T.MeshStandardMaterial({ color: '#101a55', emissive: '#EAF0FF', emissiveIntensity: 0.06 }), b.x, 0, b.z); edges(bar);
box(b.w + 0.02, 0.05, b.d + 0.02, new T.MeshBasicMaterial({ color: '#EAF0FF' }), b.x, 1.1, b.z);
label(b.island ? 'Bar central' : 'Bar', b.x, 2, b.z);
});
if (plan.mezz) {
const m = plan.mezz, mm = new T.MeshStandardMaterial({ color: '#0f1850', transparent: true, opacity: 0.32, depthWrite: false });
edges(box(m.w, 0.25, m.d, mm, m.x, 3, m.z));
if (m.u) { edges(box(4, 0.25, plan.rooms[0].d - m.d, mm, m.x - m.w / 2 + 2, 3, m.z - plan.rooms[0].d / 2 + 0.5)); edges(box(4, 0.25, plan.rooms[0].d - m.d, mm, m.x + m.w / 2 - 2, 3, m.z - plan.rooms[0].d / 2 + 0.5)); }
label(m.u ? 'Balcon' : 'Mezzanine', m.x, 4.6, m.z);
}
label('Entrée', plan.entry[0], 0.6, plan.entry[1]);
edges(box(3, 2.2, 1.6, new T.MeshStandardMaterial({ color: '#101a55' }), plan.vest[0], 0, plan.vest[1]));
label('Vestiaire', plan.vest[0], 2.8, plan.vest[1]);
if (plan.terrace) {
const tr = plan.terrace;
bounds.expandByPoint(new T.Vector3(tr.x - tr.w / 2, 0, tr.z - tr.d / 2)); bounds.expandByPoint(new T.Vector3(tr.x + tr.w / 2, 0, tr.z + tr.d / 2));
const snow = new T.Mesh(new T.PlaneGeometry(tr.w, tr.d), new T.MeshStandardMaterial({ color: '#c9d4ff', roughness: 0.95 }));
snow.rotation.x = -Math.PI / 2; snow.position.set(tr.x, 0.02, tr.z); root3.add(snow); edges(snow, lineSoft);
if (tr.stage) edges(box(6, 0.6, 2.4, new T.MeshStandardMaterial({ color: '#1a2a8c', emissive: '#2342FF', emissiveIntensity: 0.5 }), tr.x, 0, tr.z + tr.d / 2 - 2));
const rnd = (() => { let a = cfg.seed * 9301 + 49297; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; })();
for (let k = 0; k < (tr.fire ? 5 : 7); k++) {
const x = tr.x - tr.w / 2 + 1.5 + rnd() * (tr.w - 3), z = tr.z - tr.d / 2 + 1.5 + rnd() * (tr.d - 3);
if (tr.fire) { const f = new T.Mesh(new T.CylinderGeometry(0.5, 0.6, 0.5, 20), new T.MeshStandardMaterial({ color: '#331100', emissive: '#FF5A1F', emissiveIntensity: 1.2 })); f.position.set(x, 0.25, z); root3.add(f); }
else box(0.12, 2.4, 0.12, new T.MeshStandardMaterial({ color: '#EAF0FF', emissive: '#FFD400', emissiveIntensity: 0.25 }), x, 0, z);
}
label(tr.stage ? 'Terrasse et scène · 16:30' : 'Terrasse · 16:30', tr.x, 1.6, tr.z);
}
const spots = [], pickables = [];
cfg.tiers.forEach((tier, k) => {
const r = k + 1, [x, z] = plan.spots[k];
const free = tier.left > 0, col = new T.Color(free ? tier.color : '#3a4270');
const W = 1.5 + 0.65 * k, D = 1.25 + 0.42 * k, H = 0.06 + 0.09 * k;
const g = new T.Group(); g.position.set(x, 0, z);
const mat = new T.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: free ? 0.55 : 0.05, roughness: 0.4 });
const dais = new T.Mesh(new T.BoxGeometry(W, H, D), new T.MeshStandardMaterial({ color: '#0b1240', emissive: col, emissiveIntensity: free ? 0.12 + 0.05 * k : 0.02, roughness: 0.6 }));
dais.position.y = H / 2;
const daisEdge = new T.LineSegments(new T.EdgesGeometry(dais.geometry), new T.LineBasicMaterial({ color: tier.color, transparent: true, opacity: free ? 0.7 : 0.2 })); daisEdge.position.copy(dais.position); g.add(daisEdge);
const parts = [dais];
if (r === 1) {
const top = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 0.06, 20), mat); top.position.set(0, H + 1.05, 0);
const leg = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 1.05, 8), mat); leg.position.set(0, H + 0.52, 0);
parts.push(top, leg);
[[-0.5, 0.3], [0.5, 0.3], [-0.5, -0.3], [0.5, -0.3]].forEach(([sx, sz]) => { const st = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.7, 12), mat); st.position.set(sx * 1.2, H + 0.35, sz * 1.4); parts.push(st); });
} else {
const bw = W - 0.3, seatD = 0.5;
const seat = new T.Mesh(new T.BoxGeometry(bw, 0.42, seatD), mat); seat.position.set(0, H + 0.21, -D / 2 + 0.15 + seatD / 2);
const back = new T.Mesh(new T.BoxGeometry(bw, 0.75, 0.16), mat); back.position.set(0, H + 0.55, -D / 2 + 0.12);
parts.push(seat, back);
if (r >= 3) [-1, 1].forEach((sd) => { const arm = new T.Mesh(new T.BoxGeometry(seatD, 0.42, D - 0.5), mat); arm.position.set(sd * (bw / 2 - seatD / 2), H + 0.21, 0.05); parts.push(arm); });
const nT = r >= 4 ? 2 : 1;
for (let t = 0; t < nT; t++) { const tb = new T.Mesh(new T.CylinderGeometry(0.32 + 0.04 * k, 0.32 + 0.04 * k, 0.55, 20), new T.MeshStandardMaterial({ color: '#EAF0FF', emissive: '#EAF0FF', emissiveIntensity: free ? 0.25 : 0.02 })); tb.position.set(nT > 1 ? (t ? 1 : -1) * bw * 0.2 : 0, H + 0.27, 0.15); parts.push(tb); }
}
if (r >= 4) { const rope = new T.Mesh(new T.TorusGeometry(1, 0.025, 6, 64), new T.MeshBasicMaterial({ color: tier.color, transparent: true, opacity: free ? 0.9 : 0.2 })); rope.rotation.x = Math.PI / 2; rope.scale.set(W * 0.58, D * 0.62, 1); rope.position.y = H + 0.9; parts.push(rope); }
const rad = Math.max(W, D) * 0.62;
const ring = new T.Mesh(new T.RingGeometry(rad, rad + 0.15, 48), new T.MeshBasicMaterial({ color: tier.color, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
const pin = new T.Mesh(new T.ConeGeometry(0.35, 0.9, 16), new T.MeshBasicMaterial({ color: tier.color, transparent: true, opacity: 0 }));
pin.rotation.x = Math.PI; pin.position.y = 3 + H;
g.add(...parts, ring, pin);
g.lookAt(stagePos.x, 0, stagePos.z);
root3.add(g);
const tag = document.createElement('span');
tag.className = 'is-table' + (free ? '' : ' is-taken'); tag.style.setProperty('--tier', tier.color);
tag.textContent = free ? tier.name : `${tier.name} · réservé`;
labelsBox.append(tag); labels.push({ el: tag, p: new T.Vector3(x, 2.1 + H, z) });
const spot = { g, tier, n: 1, free, mat, ring, pin, tag };
spots.push(spot);
parts.forEach((m) => { m.userData.spot = spot; pickables.push(m); });
});
const ui = { label: document.getElementById('vpLabel'), name: document.getElementById('vpName'), desc: document.getElementById('vpDesc'), facts: document.getElementById('vpFacts'),
people: document.getElementById('vpPeople'), bottles: document.getElementById('vpBottles'), price: document.getElementById('vpPrice'), left: document.getElementById('vpLeft'), book: document.getElementById('vpBook'), all: document.getElementById('vpAll') };
const center = bounds.getCenter(new T.Vector3()); center.y = 0;
const size = bounds.getSize(new T.Vector3());
const R0 = Math.max(size.x, size.z) * 1.05 + 8;
const cam = { target: center.clone(), R: R0, phi: 0.95, goalTarget: center.clone(), goalR: R0, goalPhi: 0.95 };
let selected = null, hovered = null;
const overview = () => { selected = null; spots.forEach((o) => o.tag.classList.remove('is-on')); cam.goalTarget.copy(center); cam.goalR = R0; cam.goalPhi = 0.95; if (ui.all) ui.all.hidden = true; document.querySelectorAll('.venue__tier').forEach((b) => b.setAttribute('aria-pressed', 'false')); };
const select = (spot) => {
selected = spot;
cam.goalTarget.copy(spot.g.position); cam.goalR = 13; cam.goalPhi = 0.82; idleT = 0;
document.querySelectorAll('.venue__tier').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pickTier === spot.tier.id)));
document.querySelectorAll('.spot-card').forEach((c) => c.classList.toggle('is-picked', c.dataset.tier === spot.tier.id));
ui.label.textContent = `Niveau ${cfg.tiers.indexOf(spot.tier) + 1}/5 · ${spot.free ? 'libre' : 'réservé'}`;
ui.name.textContent = spot.tier.name;
ui.desc.textContent = spot.free ? 'La caméra te montre où il se trouve. La mini-carte garde la vue d’ensemble du lieu.' : 'Déjà pris pour cette soirée. Choisis un autre niveau, ou inscris-toi sur la liste d’attente.';
ui.facts.hidden = false;
ui.people.textContent = `${spot.tier.people} pers.`; ui.bottles.textContent = String(spot.tier.bottles);
ui.price.textContent = `${spot.tier.price.toLocaleString('fr-FR')} €`; ui.left.textContent = spot.free ? 'libre' : 'réservé';
ui.book.hidden = !spot.free; ui.book.dataset.item = spot.tier.name; ui.book.dataset.price = spot.tier.price;
spots.forEach((o) => o.tag.classList.toggle('is-on', o === spot));
if (ui.all) ui.all.hidden = false;
};
if (ui.all) ui.all.addEventListener('click', overview);
const pickTier = (id) => { const list = spots.filter((s) => s.tier.id === id); const cur = selected && selected.tier.id === id ? list.indexOf(selected) : -1; const free = list.filter((s) => s.free); const pool = free.length ? free : list; const next = pool[(pool.indexOf(selected) + 1) % pool.length] || pool[0]; if (next) select(cur >= 0 ? next : pool[0]); };
document.querySelectorAll('[data-pick-tier]').forEach((b) => b.addEventListener('click', () => {
pickTier(b.dataset.pickTier);
if (!b.closest('.venue')) { const y = venueEl.getBoundingClientRect().top + scrollY - 60; if (window.BOF && window.BOF.lenis) window.BOF.lenis.scrollTo(y, { duration: 1.4 }); else scrollTo({ top: y, behavior: 'smooth' }); }
}));
let theta = 0.5, dragging = false, moved = 0, lastX = 0, lastY = 0, idleT = 0;
const ray = new T.Raycaster(), mouse = new T.Vector2();
const canvas = stage.querySelector('canvas');
const toMouse = (e) => { const r = canvas.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
stage.addEventListener('pointerdown', (e) => { if (e.target.closest('.venue__panel')) return; dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; idleT = 0; });
addEventListener('pointerup', () => { dragging = false; });
stage.addEventListener('pointermove', (e) => {
if (dragging) { moved += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY); theta -= (e.clientX - lastX) * 0.006; cam.goalPhi = clamp(cam.goalPhi - (e.clientY - lastY) * 0.004, 0.4, 1.3); lastX = e.clientX; lastY = e.clientY; idleT = 0; }
toMouse(e); ray.setFromCamera(mouse, camera);
const hit = ray.intersectObjects(pickables, false)[0];
hovered = hit ? hit.object.userData.spot : null; canvas.style.cursor = hovered ? 'pointer' : '';
});
stage.addEventListener('click', (e) => { if (e.target.closest('.venue__panel, .venue__map') || moved > 6) return; toMouse(e); ray.setFromCamera(mouse, camera); const hit = ray.intersectObjects(pickables, false)[0]; if (hit) select(hit.object.userData.spot); });
const mapEl = venueEl.querySelector('.venue__map');
const ortho = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
afterRender = () => {
if (!mapEl) return;
const cr = canvas.getBoundingClientRect(), mr = mapEl.getBoundingClientRect();
const x = mr.left - cr.left, w = mr.width, h = mr.height, y = cr.height - (mr.top - cr.top) - h;
const half = Math.max(size.x, size.z * w / h) / 2 + 2;
ortho.left = -half; ortho.right = half; ortho.top = half * h / w; ortho.bottom = -half * h / w; ortho.updateProjectionMatrix();
ortho.position.set(center.x, 80, center.z); ortho.up.set(0, 0, -1); ortho.lookAt(center.x, 0, center.z);
renderer.setScissorTest(true); renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h);
renderer.setClearColor('#04081F', 0.9); renderer.clear(true, true);
beams.forEach((b) => { b.visible = false; });
renderer.render(scene, ortho);
beams.forEach((b) => { b.visible = true; });
renderer.setClearColor('#000000', 0); renderer.setScissorTest(false); renderer.setViewport(0, 0, cr.width, cr.height);
};
const v3 = new T.Vector3();
updateVenue = (st, dt) => {
idleT += dt;
if (!dragging && idleT > 2.5 && !still() && !selected) theta += dt * 0.07;
const k = still() ? 1 : 1 - Math.pow(0.02, dt);
cam.target.lerp(cam.goalTarget, k); cam.R = lerp(cam.R, cam.goalR, k); cam.phi = lerp(cam.phi, cam.goalPhi, k);
camera.position.set(cam.target.x + cam.R * Math.sin(cam.phi) * Math.sin(theta), cam.R * Math.cos(cam.phi) + 2, cam.target.z + cam.R * Math.sin(cam.phi) * Math.cos(theta));
camera.lookAt(cam.target);
heatMat.uniforms.t.value = still() ? 2 : st.t;
beams.forEach((b, i) => { b.rotation.z = Math.sin(st.t * 0.9 + i) * 0.5; b.rotation.x = Math.cos(st.t * 0.7 + i * 1.3) * 0.35; });
spots.forEach((s) => {
const on = s === selected, hov = s === hovered;
s.g.scale.setScalar(lerp(s.g.scale.x, on ? 1.2 : hov ? 1.1 : 1, 0.2));
s.ring.material.opacity = on ? 0.95 : hov ? 0.5 : 0;
s.pin.material.opacity = on ? 1 : 0; s.pin.position.y = 3 + (on ? Math.sin(st.t * 4) * 0.3 : 0);
s.mat.emissiveIntensity = s.free ? (on ? 1.2 : hov ? 0.9 : 0.55) : 0.05;
});
const w = stage.clientWidth, h = stage.clientHeight;
labels.forEach(({ el, p }) => { v3.copy(p).project(camera); const hw = el._hw > 20 ? el._hw : (el._hw = el.offsetWidth / 2 + 6); el.style.transform = `translate3d(${clamp((v3.x + 1) / 2 * w, hw, w - hw).toFixed(1)}px, ${((1 - v3.y) / 2 * h).toFixed(1)}px, 0) translate(-50%, -50%)`; el.style.opacity = v3.z < 1 ? 1 : 0; });
};
});
})();
