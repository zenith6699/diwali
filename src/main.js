import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { buildWorld, SH } from './world.js';
import { Couple, furUni } from './chars.js';
import { makeSky, Sparks, Fireworks, Petals, Lanterns, fxUniforms, flameUni } from './fx.js';
import { Sound } from './audio.js';
import { buildRoom, ROOM_X } from './room.js';
import { ease, clamp, lerp, sleep, rand } from './util.js';

const CFG = Object.assign({ to: 'Jaanu', from: 'Tumhara apna', message: '' }, window.CONFIG || {});
const $ = s => document.querySelector(s);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const qs = new URLSearchParams(location.search);
const TS = () => window.__ts || 1;
const REC = qs.has('rec');
if (REC) Math.random = rand(20241108);

// crash recovery: if the last visit never said goodbye (no pagehide) and was alive <20s ago, the tab was killed -> go lighter and resume
let SAFE = 0, RESUME = 0;
if (!REC && !qs.has('hq') && !qs.has('nosafe')) {
  try {
    const hb = +localStorage.getItem('dw_hb') || 0; SAFE = +localStorage.getItem('dw_safe') || 0;
    if (hb && Date.now() - hb < 20000) { SAFE = Math.min(2, SAFE + 1); localStorage.setItem('dw_safe', SAFE); RESUME = +localStorage.getItem('dw_ch') || 0; }
    setInterval(() => { try { localStorage.setItem('dw_hb', Date.now()); } catch (e) { } }, 1500);
    localStorage.setItem('dw_hb', Date.now());
    const bye = () => { try { localStorage.removeItem('dw_hb'); } catch (e) { } };
    addEventListener('pagehide', bye); document.addEventListener('visibilitychange', () => { if (document.hidden) bye(); else { try { localStorage.setItem('dw_hb', Date.now()); } catch (e) { } } });
  } catch (e) { }
}
window.__SAFE = SAFE;

// ------------------------------------------------------------------ renderer
const canvas = $('#stage');
function makeContext() {
  const tries = [{ antialias: false, powerPreference: 'high-performance' }, { antialias: false }, { antialias: false, alpha: false, stencil: false, depth: true, powerPreference: 'low-power' }, {}];
  for (const a of tries) { try { const gl = canvas.getContext('webgl2', a); if (gl) return gl; } catch (e) { /* try next */ } }
  return null;
}
const gl2 = makeContext();
if (!gl2) {
  const l = document.getElementById('loading'); l.classList.remove('off'); l.style.cssText += ';opacity:1;visibility:visible';
  const e = document.getElementById('lerr') || l.appendChild(Object.assign(document.createElement('div'), { id: 'lerr' }));
  e.style.cssText = 'position:absolute;left:24px;right:24px;bottom:14%;text-align:center;font:15px/1.6 system-ui,sans-serif;color:#ffd9a0';
  e.innerHTML = 'Is jagah 3D graphics (WebGL2) chalu nahi hai.<br>Is link ko <b>Chrome / Edge / Safari</b> mein kholo (hardware acceleration ON ke saath).';
  window.__noGL = 1; throw new Error('WebGL2 unavailable');
}
let GPU = ''; try { const ex = gl2.getExtension('WEBGL_debug_renderer_info'); GPU = ex ? String(gl2.getParameter(ex.UNMASKED_RENDERER_WEBGL)) : ''; } catch (e) { }
export const LOW = !qs.has('hq') && (qs.has('low') || /swiftshader|llvmpipe|software|basic render|softpipe/i.test(GPU));
window.__LOW = LOW; window.__GPU = GPU;
const renderer = new THREE.WebGLRenderer({ canvas, context: gl2, antialias: false });
const isMobile = matchMedia('(pointer:coarse)').matches || innerWidth < 700;
let PR = LOW ? 1 : Math.min(devicePixelRatio || 1, SAFE >= 2 ? .8 : SAFE ? 1 : isMobile ? 1.25 : 2);
renderer.setPixelRatio(PR);
const NOSH = LOW || SAFE >= 2; renderer.shadowMap.enabled = !NOSH; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x94574d, .0085);
const camera = new THREE.PerspectiveCamera(50, 1, .1, 1200);

const hemi = new THREE.HemisphereLight(0xffb0c8, 0x6a2a5a, 1.1); scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffc48a, 2.3); dir.castShadow = !NOSH;
const SM = +(qs.get('sm') || (isMobile || SAFE ? 1024 : 2048)); dir.shadow.mapSize.set(SM, SM); const sc = dir.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
dir.shadow.bias = -.0005; dir.shadow.normalBias = .04; scene.add(dir, dir.target);

// image-based light: a dusk sky + warm street glow baked once, so skin, cloth, brass and wet stone pick up believable reflections
{
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h=vP.y; vec3 top=vec3(.10,.14,.34), hor=vec3(1.5,.62,.3), gr=vec3(.34,.2,.14); vec3 c=h>0.?mix(hor,top,pow(h,.5)):mix(hor*.5,gr,clamp(-h*3.,0.,1.)); c+=vec3(1.4,.8,.4)*pow(max(dot(vP,normalize(vec3(.2,.1,-1.))),0.),24.)*1.5; gl_FragColor=vec4(c,1.); }' })));
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0, .1, 100).texture; pm.dispose();
}
const world = buildWorld(scene);
const sky = makeSky(scene);
const couple = new Couple(); scene.add(couple.group);
const room = buildRoom(scene);
const audio = new Sound();
const fw = new Fireworks(scene, audio);
const sparks = new Sparks(700); scene.add(sparks.mesh);
const embers = new Sparks(160); embers.gravity = -.15; embers.drag = .1; scene.add(embers.mesh);
const petals = new Petals(scene);
const lanterns = new Lanterns(scene);
const sparkLight = new THREE.PointLight(0xffc070, 0, 8, 1.6); scene.add(sparkLight);

let composer;
try { composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: qs.has('ms') ? +qs.get('ms') : (LOW || SAFE || isMobile ? 0 : 4) })); }
catch (e) { composer = new EffectComposer(renderer); }
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .5, .7, 1.05); if (qs.get('bloom') !== '0' && !LOW && !SAFE) composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ p=fract(p*vec2(443.897,441.423)); p+=dot(p,p.yx+19.19); return fract((p.x+p.y)*p.x); }
    void main(){ vec2 d=vUv-.5; float r2=dot(d,d); vec2 off=d*r2*.018;
      vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
      float l=dot(col,vec3(.299,.587,.114));
      col=mix(col,col*vec3(1.05,1.0,.92),smoothstep(.35,1.,l)); col+=vec3(-.006,.003,.014)*(1.-l);
      col=mix(col,col*col*(3.-2.*col),.28);
      col*=1.-smoothstep(.22,.82,length(d*vec2(1.,1.1)))*.55;
      float g=hash(vUv*uRes+fract(uT*7.13)*61.7)+hash(vUv*uRes*.5+fract(uT*3.1)*17.3)-1.; col+=g*.032*(1.-l*.55);
      gl_FragColor=vec4(col,1.); }`,
});
composer.addPass(grade);
if (qs.get('aa') === 'smaa') composer.addPass(new SMAAPass());

function resize() {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setPixelRatio(PR); renderer.setSize(w, h, false); composer.setPixelRatio(PR); composer.setSize(w, h);
  camera.aspect = a; camera.fov = a < .8 ? 64 : a < 1.2 ? 54 : 46; camera.updateProjectionMatrix();
  grade.uniforms.uRes.value.set(w * PR, h * PR); fxUniforms.uScale.value = (h * PR) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)); fxUniforms.uPR.value = PR;
}
addEventListener('resize', resize); resize();

// ------------------------------------------------------------------ tween / timing (story clock)
const tweens = [];
function tween(dur, fn, e = ease.inOut) { return new Promise(res => tweens.push({ t: 0, dur: Math.max(dur, .0001), fn, e, res })); }
const wait = s => tween(s, () => { });
const after = (s, fn) => { wait(s).then(fn); };
function stepTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; tw.t += dt; const k = clamp(tw.t / tw.dur); tw.fn(tw.e(k));
    if (k >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}

// ------------------------------------------------------------------ camera rig
const cam = { pos: V(0, 2.2, 7.5), look: V(0, 1.3, 0), follow: null, orbit: false };
const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', e => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; });
function camTo(pos, look, dur = 3, e = ease.inOut) {
  cam.follow = null; const p0 = cam.pos.clone(), l0 = cam.look.clone();
  return tween(dur, k => { cam.pos.lerpVectors(p0, pos, k); cam.look.lerpVectors(l0, look, k); }, e);
}
function camSnap(pos, look) { cam.follow = null; cam.pos.copy(pos); cam.look.copy(look); }

// ------------------------------------------------------------------ UI
const ui = {
  caption: $('#caption'), cta: $('#cta'), ctaLabel: $('#cta span'), fade: $('#fade'), dots: [...document.querySelectorAll('#dots i')],
  letter: $('#letter'), final: $('#final'), intro: $('#intro'), load: $('#loading'),
};
let capTok = 0;
function caption(t, hold = 0) {
  ui.caption.classList.remove('on');
  const k = ++capTok;
  after(.35, () => { if (k === capTok) { ui.caption.textContent = t; ui.caption.classList.add('on'); } });
}
function hideCaption() { capTok++; ui.caption.classList.remove('on'); }
function cta(label) {
  return new Promise(res => {
    ui.ctaLabel.textContent = label; ui.cta.classList.add('on');
    const h = () => { ui.cta.removeEventListener('click', h); ui.cta.classList.remove('on'); res(); };
    ui.cta.addEventListener('click', h);
    if (qs.has('auto')) after((parseFloat(qs.get('auto')) || 400) / 1000, () => ui.cta.click());
  });
}
function progress(i) { ui.dots.forEach((d, k) => d.classList.toggle('on', k <= i)); }
let fadeTarget = 0;
const setFade = v => { fadeTarget = v; if (!REC) ui.fade.style.opacity = v; };
async function fadeOut(color = '#fff1d0', ms = 700) { ui.fade.style.background = color; setFade(1); await wait(ms / 1000); }
async function fadeIn(ms = 900) { setFade(0); await wait(ms / 1000); }

// ------------------------------------------------------------------ state
const state = { night: 0, sparkler: false, focus: V(0, 0, 0), inRoom: false };
const nightTo = (n, d = 5) => { const n0 = state.night; return tween(d, k => state.night = lerp(n0, n, k), ease.sine); };
const letterText = () => (CFG.message || `Meri ${CFG.to},\n\nDiyon ki roshni se zyada tumhari muskaan meri zindagi roshan karti hai. Tum ho toh har din Diwali jaisa lagta hai.\n\nIs Diwali pe bas ek hi wish hai: tum hamesha mere saath rehna.\n\nHappy Diwali ♥`);

// couple movement along the street
async function walkTo(p, dur, finalRot) {
  const g = couple.group, p0 = g.position.clone(), d = p.clone().sub(p0); d.y = 0;
  const heading = Math.atan2(d.x, d.z), r0 = g.rotation.y;
  let dr = heading - r0; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
  couple.walking = true;
  await tween(Math.min(.7, dur * .2), k => g.rotation.y = r0 + dr * k, ease.out);
  await tween(dur, k => g.position.lerpVectors(p0, p, k), t => t);
  couple.walking = false;
  if (finalRot !== undefined) { const r1 = g.rotation.y; let d2 = finalRot - r1; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); await tween(.9, k => g.rotation.y = r1 + d2 * k, ease.out); }
}
function turnTo(rot, dur = 1.2) { const g = couple.group, r1 = g.rotation.y; let d = rot - r1; d = Math.atan2(Math.sin(d), Math.cos(d)); return tween(dur, k => g.rotation.y = r1 + d * k, ease.out); }
function followCouple(off, lookOff, damp = 3) {
  cam.follow = dt => {
    const gp = couple.group.position, tp = gp.clone().add(off), tl = gp.clone().add(lookOff), k = 1 - Math.exp(-damp * dt);
    cam.pos.lerp(tp, k); cam.look.lerp(tl, k);
  };
}

// ------------------------------------------------------------------ story
const names = () => ({ to: CFG.to, from: CFG.from });
const skyW = () => { const a = camera.aspect, hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * a); return clamp(2 * 100 * Math.tan(hf / 2) * .9, 38, 84); };

const chapters = [
  async function arrive() {
    state.night = 0; couple.group.position.set(0, 0, 0); couple.group.rotation.y = Math.PI;
    state.focus.set(0, 0, 0);
    camTo(V(1.0, 1.6, 4.7), V(-.1, 1.3, -.4), 3.4);
    caption('Aaj ki shaam, diyon ki roshni aur bas hum dono ✨');
    await wait(2);
    await cta('Light the phuljhadi');
    try { sessionStorage.setItem('dw_ch', '1'); localStorage.setItem('dw_ch', '1'); } catch (e) { }
    audio.crackle(6); state.sparkler = true; world.lights.couple.intensity = 7;
    tween(.9, k => couple.setSparkler(k));
    caption('Dekho, kitni pyaari lag rahi hai ye shaam…');
    await wait(6.5);
    state.sparkler = false; tween(.9, k => couple.setSparkler(1 - k));
    await wait(.8);
  },
  async function fireworks() {
    hideCaption();
    const pitch = THREE.MathUtils.degToRad(camera.aspect > 1.1 ? 17 : 30), cp = V(0, 1.5, 7.6);
    const f = V(0, Math.sin(pitch), -Math.cos(pitch)), r = V(1, 0, 0), u = V(0, Math.cos(pitch), Math.sin(pitch));
    const P = (d, dx = 0, dy = 0) => cp.clone().addScaledVector(f, d).addScaledVector(r, dx).addScaledVector(u, dy);
    const D = 70;
    await Promise.all([turnTo(Math.PI, 1.5), camTo(cp, P(120), 3.6), nightTo(.55, 5), tween(2.4, k => world.setOverhead(1 - k), t => t)]);
    caption('Aasmaan bhi aaj humare liye jagmaga raha hai…');
    const a = camera.aspect, hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * a);
    const w = clamp(2 * D * Math.tan(hf / 2) * .8, 30, 80);
    await fw.writeText(['Happy Diwali', CFG.to, CFG.from], P(D, 0, 1), w);
    await cta('Launch the fireworks');
    hideCaption();
    const C = [[0xff3d7f, 0xffb300], [0xffb300, 0xff6b35], [0x39d0ff, 0x8a7bff], [0xffffff, 0xffd27a], [0x5cff9d, 0xffe14d], [0xff5ad1, 0xfff0a0]];
    const shot = (delay, dx, dy, ci, kind = 0, size = .5, d = D) => fw.schedule(delay, () => {
      const t = P(d + Math.random() * 14 - 4, dx, dy), o = V(t.x * .6, 4, t.z + 6 - Math.random() * 10);
      fw.launch(o, t, C[ci][0], C[ci][1], kind, size);
    });
    shot(0, -12, 8, 0); shot(.9, 12, 12, 2); shot(1.8, 0, 16, 1, 1);
    shot(3.1, -16, 14, 4, 2, .45); shot(3.5, 15, 6, 5); shot(4.4, -8, 3, 3, 0, .45); shot(4.8, 9, 14, 0, 1);
    shot(5.9, 0, 6, 2, 0, .55); shot(6.2, -18, 10, 1, 2); shot(6.5, 18, 12, 3, 2);
    fw.schedule(7.6, () => fw.showText());
    shot(9, -19, 18, 5, 0, .4, D + 30); shot(9.6, 19, 18, 0, 1, .4, D + 30); shot(11.5, -20, 4, 2, 2, .4, D + 30); shot(12, 20, 5, 4, 0, .4, D + 30);
    shot(14.3, 0, 22, 3, 0, .6, D + 20); shot(14.8, -14, 14, 0, 1); shot(15.2, 14, 14, 1, 1); shot(15.6, 0, 10, 5, 2, .6);
    caption('Humari Diwali, humari kahani ♥');
    await wait(19);
    hideCaption();
  },
  async function walk() {
    tween(3, k => world.setOverhead(k), t => t);
    await nightTo(.3, 3);
    caption('Chalo, is galli mein thodi der saath chalte hain…');
    followCouple(V(0, 2.3, 5.4), V(0, 1.5, -6), 2.6);
    await cta('Walk together');
    hideCaption(); audio.heart();
    nightTo(.4, 8);
    const t = world.door.pos.z;
    await walkTo(V(0, 0, t + 8), 5.5);
    caption('Har ghar mein diye, har dil mein khushi…');
    await walkTo(V(-2.9, 0, t), 4.5, -Math.PI / 2);
  },
  async function door() {
    state.focus.set(-3, 0, world.door.pos.z);
    const dz = world.door.pos.z;
    await camTo(V(1.6, 1.95, dz + 6.2), V(-4.2, 1.8, dz - .8), 2.8);
    caption('Ek diya, ek wish — sirf tumhare liye 🪔');
    await cta('Light the diya');
    audio.chime();
    world.door.diyaIds.forEach((id, i) => after(i * .45, () => world.diyas.light(id, true)));
    tween(2, k => world.lights.door.intensity = 9 * k);
    for (let i = 0; i < 40; i++) after(i * .06, () => embers.emit(world.door.ledge[0].clone().add(V((Math.random() - .5) * 2.4, .2, 0)), V((Math.random() - .5) * .6, .8 + Math.random(), (Math.random() - .5) * .3), 1.8 + Math.random(), .12, new THREE.Color(1, .6, .2)));
    await wait(2.4);
    await camTo(V(.2, 1.8, dz + 4.6), V(-4.5, 1.7, dz - .6), 3, ease.sine);
    await wait(1.2);
  },
  async function temple() {
    hideCaption();
    const tz = world.temple.z;
    followCouple(V(0, 2.3, 5.4), V(0, 1.8, -7), 2.4);
    caption('Chalo, bhagwan ka ashirwad bhi le lete hain 🙏');
    await walkTo(V(0, 0, tz + 17), 7.5, Math.PI);
    await nightTo(.6, 3);
    await camTo(V(.6, 2.7, tz + 25), V(0, 4.3, tz + 4), 3, ease.out);
    await cta('Ring the bell');
    hideCaption();
    world.lights.temple.intensity = 0; tween(3, k => world.lights.temple.intensity = 22 * k);
    const bell = world.bell;
    audio.bell(); after(.9, () => audio.bell()); after(1.9, () => audio.bell());
    tween(5, k => { bell.rotation.z = Math.sin(k * 5 * Math.PI * 2) * .55 * Math.exp(-k * 3.2); }, t => t);
    petals.start(V(0, 0, tz + 13), 6, 10);
    world.templeDiyas.forEach((id, i) => after(.5 + i * .07, () => world.diyas.light(id, true)));
    camTo(V(0, 2.5, tz + 21), V(0, 4.8, tz + 4), 7, ease.sine);
    caption('Humesha yun hi khush rehna, mere saath ♥');
    await wait(8);
    petals.stop();
  },
  async function gift() {
    hideCaption();
    await fadeOut('#ffe9b8', 800);
    couple.group.visible = false; world.lights.couple.intensity = 0; room.group.visible = true; state.inRoom = true; state.focus.set(ROOM_X, 1, -1);
    nightTo(0, .1); state.night = 0;
    camSnap(V(ROOM_X + .3, 2.0, 6.6), V(ROOM_X, 1.5, -1.7));
    await fadeIn(900);
    camTo(V(ROOM_X, 2.0, 3.4), V(ROOM_X, 1.35, -1.7), 3.4);
    caption('Tumhare liye ek chhota sa tohfa 🎁');
    await wait(2.5);
    await cta('Open the gift');
    audio.chime();
    await tween(1.5, k => room.setOpen(k), ease.out);
    for (let i = 0; i < 90; i++) after(i * .01, () => sparks.emit(room.spark.clone(), V((Math.random() - .5) * 4, 2 + Math.random() * 4, (Math.random() - .5) * 3), 1.4 + Math.random(), .16, new THREE.Color(1, .7 + Math.random() * .3, .3)));
    tween(2, k => room.riseCard(k), ease.out);
    camTo(V(ROOM_X, 2.1, 2.2), V(ROOM_X, 2.0, -1.7), 2.4);
    audio.heart();
    await wait(2.6);
    await showLetter();
    hideCaption();
  },
  async function finale() {
    await fadeOut('#0a0418', 900);
    room.group.visible = false; state.inRoom = false; couple.group.visible = true; world.lights.couple.intensity = 26;
    const R = world.roof;
    couple.group.position.set(R.x, R.y, R.z); couple.group.rotation.y = Math.PI / 2; couple.walking = false;
    state.focus.set(R.x, R.y, R.z); state.night = 1; sky.set(1, 0);
    camSnap(V(R.camX, R.y + 2.0, R.z + 1.2), V(R.x + 16, R.y + 5.5, R.z - 3));
    await fadeIn(1400);
    lanterns.start(V(22, 0, R.z - 2), 46, 34, R.y - 6);
    fw.burst(V(30, R.y + 40, R.z - 90), 0xffb300, 0xff5a7a, 0, .7);
    camTo(V(R.camX + 1.2, R.y + 2.2, R.z + .8), V(R.x + 16, R.y + 10, R.z - 5), 14, ease.sine);
    audio.heart();
    await wait(2.5);
    showFinal();
    for (let i = 0; i < 5; i++) { fw.schedule(2 + i * 2.4, () => fw.burst(V(-30 + Math.random() * 70, R.y + 28 + Math.random() * 26, R.z - 90 - Math.random() * 50), [0xff3d7f, 0xffb300, 0x39d0ff][i % 3], 0xffffff, i % 3 ? 0 : 2, .6)); }
    if (REC) { await wait(15); window.__recDone = true; return; }
    await new Promise(() => { });
  },
];

function showLetter() {
  return new Promise(res => {
    $('#letter .to').textContent = '';
    $('#letter .body').textContent = letterText();
    $('#letter .from').textContent = `— ${CFG.from}`;
    ui.letter.classList.add('on');
    const b = $('#letter button'); const h = () => { b.removeEventListener('click', h); ui.letter.classList.remove('on'); after(.5, res); }; b.addEventListener('click', h);
    if (qs.has('auto')) after(REC ? 7 : 1.5, () => b.click());
  });
}
function showFinal() {
  $('#final .names').textContent = `${CFG.to} ♥ ${CFG.from}`; ui.final.classList.add('on');
}

let running = 0;
async function run(from = 0) {
  const id = ++running;
  for (let i = from; i < chapters.length; i++) { if (id !== running) return; progress(i); if (i > 0) { try { localStorage.setItem('dw_ch', i); sessionStorage.setItem('dw_ch', i); } catch (e) { } } await chapters[i](); }
}
window.__story = { renderer, run, chapters, state, cam, couple, world, fw, room, camera, tweens };

// ------------------------------------------------------------------ frame loop
const clock = new THREE.Clock(); let T = 0, frames = 0, acc = 0, perfStage = 0, perfT = 0;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), col = new THREE.Color();
const fogDusk = new THREE.Color(.5, .27, .24), fogNight = new THREE.Color(.03, .03, .07);
function frame() {
  requestAnimationFrame(frame);
  tick(Math.min(clock.getDelta(), .25), true);
}
function tick(raw, doRender) {
  const dt = Math.min(raw, .1) * TS(), sdt = Math.min(raw, .12) * TS();
  T += dt; window.__T = T;
  stepTweens(sdt);
  if (cam.follow) cam.follow(sdt);
  couple.update(T, sdt);
  world.update(T, dt);
  room.update(T);
  fw.update(sdt); petals.update(dt); lanterns.update(dt);
  sky.set(state.night, T);

  // sparkler
  if (state.sparkler) {
    const a = couple.boy.userData.anchor; a.getWorldPosition(tmp);
    const n = Math.max(2, Math.round(260 * dt));
    for (let i = 0; i < n; i++) {
      const th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1), sp = 1.2 + Math.random() * 3.2;
      sparks.emit(tmp, tmp2.set(Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp + .8, Math.sin(ph) * Math.sin(th) * sp), .35 + Math.random() * .7, .13 + Math.random() * .1, col.setRGB(4, 2.2 + Math.random() * .6, .6 + Math.random() * .5));
    }
    sparkLight.position.copy(tmp); sparkLight.intensity = 1.6 + Math.random() * 1.6;
  } else sparkLight.intensity *= .85;
  sparks.update(dt); embers.update(dt);
  if (Math.random() < dt * 12) { const p = tmp.set(state.focus.x + (Math.random() - .5) * 18, .5 + Math.random() * 6, state.focus.z - 4 + (Math.random() - .5) * 26); embers.emit(p, tmp2.set((Math.random() - .5) * .3, .3 + Math.random() * .4, (Math.random() - .5) * .3), 4 + Math.random() * 4, .05 + Math.random() * .05, col.setRGB(1, .65, .25)); }

  // lighting vs night
  const n = state.night;
  flameUni.uT.value = T; grade.uniforms.uT.value = T; scene.environmentIntensity = lerp(.9, .3, n) + fw.flash * .4;
  furUni.uSunCol.value.copy(dir.color).multiplyScalar(dir.intensity * .55); furUni.uSunDir.value.copy(dir.position).sub(dir.target.position).normalize(); furUni.uAmb.value.setRGB(lerp(.5, .16, n), lerp(.38, .13, n), lerp(.36, .2, n)); furUni.uWarm.value.setRGB(1, .55, .22).multiplyScalar(world.lights.couple.intensity * .006);
  hemi.intensity = lerp(.32, .2, n) + fw.flash * .6;
  hemi.color.setRGB(lerp(1, .55, n), lerp(.7, .4, n), lerp(.8, .85, n)); hemi.groundColor.setRGB(lerp(.42, .12, n), lerp(.16, .05, n), lerp(.36, .2, n));
  dir.intensity = lerp(1.7, .6, n); dir.color.setRGB(1, lerp(.78, .62, n), lerp(.52, .6, n));
  scene.fog.color.copy(fogDusk).lerp(fogNight, n); scene.fog.density = lerp(.0085, .0065, n);
  renderer.toneMappingExposure = lerp(.92, .95, n) + fw.flash * .12;
  bloom.strength = lerp(.42, .5, n);
  // shadow light follows focus
  const f = couple.group.visible && !state.inRoom ? couple.group.position : state.focus;
  dir.target.position.copy(f); dir.position.set(f.x - 7, f.y + 17, f.z + 10);
  world.lights.couple.position.set(f.x, f.y + 2.6, f.z + 1.6);

  // camera
  ptr.sx += (ptr.x - ptr.sx) * .05; ptr.sy += (ptr.y - ptr.sy) * .05;
  camera.position.set(cam.pos.x + ptr.sx * .35 + Math.sin(T * .6) * .035, cam.pos.y - ptr.sy * .14 + Math.sin(T * .8) * .03, cam.pos.z);
  camera.lookAt(cam.look.x + ptr.sx * 1.4, cam.look.y - ptr.sy * .7, cam.look.z);

  if (doRender) try { composer.render(); } catch (err) { if (!window.__renderErr) { window.__renderErr = 1; const e = document.getElementById('lerr') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'lerr' })); e.style.cssText = 'position:fixed;z-index:99;left:16px;right:16px;top:16px;color:#ffd9a0;font:13px system-ui;background:#000a;padding:10px;border-radius:8px'; e.textContent = 'Render error: ' + err.message; } }

  // adaptive quality (never recompiles shaders - that freezes weak GPUs)
  acc += raw; frames++;
  if (acc > 2 && !REC) {
    const fps = frames / acc; acc = 0; frames = 0;
    if (fps < 30 && perfStage < 3 && T > 2.5) {
      perfStage++;
      if (perfStage === 1) { PR = Math.max(.75, PR * .8); resize(); }
      else if (perfStage === 2) { PR = Math.max(.6, PR * .8); bloom.enabled = false; resize(); }
      else { PR = .6; resize(); if (dir.shadow.map) { dir.shadow.mapSize.set(512, 512); dir.shadow.map.dispose(); dir.shadow.map = null; } couple.setFurVisible?.(false); }
    }
  }
}

// ------------------------------------------------------------------ deterministic recording mode
const OV = REC ? [
  [ui.caption, () => ui.caption.classList.contains('on'), .9, 0], [ui.cta, () => ui.cta.classList.contains('on'), .7, 0],
  [ui.letter, () => ui.letter.classList.contains('on'), .7, 0], [ui.final, () => ui.final.classList.contains('on'), 2, 1],
  [ui.intro, () => !ui.intro.classList.contains('off'), 1, 0], [$('#hud'), () => $('#hud').classList.contains('on'), 1, 0], [ui.fade, () => fadeTarget > .5, .8, 0],
].map(([el, on, dur, delay]) => ({ el, on, dur, delay, v: el === ui.intro ? 1 : 0, hold: 0 })) : [];
function overlays(dt) {
  for (const o of OV) {
    const target = o.on();
    if (target) { o.hold += dt; if (o.hold >= o.delay) o.v = Math.min(1, o.v + dt / o.dur); } else { o.hold = 0; o.v = Math.max(0, o.v - dt / o.dur); }
    o.el.style.opacity = o.v.toFixed(3); o.el.style.visibility = o.v > .001 ? 'visible' : 'hidden';
  }
}
if (REC) {
  document.body.classList.add('rec');
  window.__rec = {
    fps: +(qs.get('fps') || 24),
    async init() { await boot(true); },
    async stepAsync(render = true) { this.step(render); await new Promise(r => setTimeout(r, 0)); },
    async ff(n) { for (let i = 0; i < n; i++) { this.step(false); await new Promise(r => setTimeout(r, 0)); } },
    step(render = true) { const dt = 1 / (+(qs.get('fps') || 24)); tick(dt, render); overlays(dt); },
    begin() { ui.intro.classList.add('off'); $('#hud').classList.add('on'); cam.follow = null; run(0); },
    done: () => !!window.__recDone, log: () => window.__alog || [],
  };
}

// ------------------------------------------------------------------ boot
const hint = t => { const h = document.getElementById('lhint'); if (h) h.firstChild.textContent = t; };
async function boot(rec = false) {
  hint('Graphics shuru ho rahe hain…');
  try { await Promise.race([document.fonts.ready, sleep(2500)]); } catch (e) { }
  // show the greeting card right away (the page is already usable); the 3D street finishes loading behind it
  const enter = $('#enter'), enterTxt = enter.innerHTML, early = !rec && !RESUME;
  if (early) { enter.disabled = true; enter.innerHTML = 'Galli saj rahi hai…'; ui.load.classList.add('off'); await sleep(60); }
  hint('Ladka-ladki aa rahe hain…');
  try { await Promise.race([couple.load(), sleep(25000).then(() => { throw new Error('avatar load timeout'); })]); } catch (e) { console.error('avatar load failed', e); window.__avatarErr = String(e && e.stack || e); }
  hint('Galli ki roshni taiyaar ho rahi hai…');
  if (!rec) {
    const hid = []; scene.traverse(o => { if (!o.visible) { hid.push(o); o.visible = true; } });
    try { await Promise.race([renderer.compileAsync(scene, camera), sleep(30000)]); } catch (e) { }
    hid.forEach(o => o.visible = false);
  }
  couple.group.rotation.y = Math.PI;
  camSnap(V(0, 2.4, 8), V(0, 1.4, 0));
  state.night = 0;
  cam.follow = dt => { const a = T * .12; cam.pos.set(Math.sin(a) * 2.2, 2.2 + Math.sin(a * 1.3) * .2, 7.4); cam.look.set(0, 1.3, 0); };
  if (!rec) frame();
  await sleep(rec ? 0 : 300);
  ui.load.classList.add('off');
  $('#intro .to-name').textContent = CFG.to;
  if (SAFE >= 2) couple.setFurVisible?.(false);
  enter.disabled = false; enter.innerHTML = enterTxt;
  if (RESUME > 0) { hint('Wapas wahin se shuru…'); begin(RESUME); }
}
function begin(r0) { try { audio.start(); } catch (e) { } ui.intro.classList.add('off'); $('#hud').classList.add('on'); cam.follow = null; run(r0); }
addEventListener('pointerdown', () => { try { audio.ctx && audio.ctx.state !== 'running' && audio.ctx.resume(); } catch (e) { } }, { passive: true });
$('#enter').addEventListener('click', async () => {
  if ($('#enter').disabled) return;
  try { localStorage.removeItem('dw_ch'); sessionStorage.removeItem('dw_ch'); } catch (e) { }
  audio.start();
  ui.intro.classList.add('off'); $('#hud').classList.add('on');
  cam.follow = null;
  await sleep(500);
  run(0);
});
$('#mute').addEventListener('click', e => { audio.setMuted(!audio.muted); e.currentTarget.classList.toggle('muted', audio.muted); });
$('#replay').addEventListener('click', () => { try { sessionStorage.removeItem('dw_ch'); localStorage.removeItem('dw_ch'); } catch (e) { } location.reload(); });
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); const l = ui.load; l.classList.remove('off'); l.style.cssText += ';opacity:1;visibility:visible'; hint('Graphics reset ho gaye… ek second, wapas aa rahe hain'); });
canvas.addEventListener('webglcontextrestored', () => ui.load.classList.add('off'));
$('#personalize').addEventListener('click', () => $('#edit').classList.toggle('on'));
$('#edit').addEventListener('input', () => { CFG.to = $('#in-to').value.trim() || CFG.to; CFG.from = $('#in-from').value.trim() || CFG.from; CFG.message = $('#in-msg').value.trim(); $('#intro .to-name').textContent = CFG.to; });
$('#in-to').value = CFG.to; $('#in-from').value = CFG.from; $('#in-msg').value = CFG.message || '';
if (!REC) boot();
