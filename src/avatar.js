import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import boyB64 from './assets/boy.glb';
import girlB64 from './assets/girl.glb';
import * as T from './textures.js';

const b64ToBuf = s => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
const parse = buf => new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej));

const Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3();

// A posable humanoid: every bone keeps its rest world rotation; we set a world-space delta on top of it.
class Rig {
  constructor(root) {
    this.root = root; this.bones = {};
    root.traverse(o => { if (o.isBone) { this.bones[o.name] = o; } });
    root.updateMatrixWorld(true);
    this.rest = {};
    for (const k in this.bones) this.rest[k] = this.bones[k].getWorldQuaternion(new THREE.Quaternion());
    this.restLocal = {};
    for (const k in this.bones) this.restLocal[k] = this.bones[k].quaternion.clone();
  }
  // rotate bone by world-space (axis, angle) relative to its rest orientation; accumulates in `this.pending`
  reset() { for (const k in this.bones) this.bones[k].quaternion.copy(this.restLocal[k]); this.root.updateMatrixWorld(true); }
  rot(name, axis, ang) {
    const b = this.bones[name]; if (!b) return;
    // current world rotation of the bone = parentWorld * local ; we want delta * currentWorld
    b.parent.updateWorldMatrix(true, false);
    b.parent.getWorldQuaternion(_q);
    _q2.setFromAxisAngle(axis, ang);
    const curW = _q.clone().multiply(b.quaternion);
    const target = _q2.multiply(curW);
    b.quaternion.copy(_q.invert().multiply(target));
    b.updateWorldMatrix(false, true);
  }
  pos(name, out = new THREE.Vector3()) { this.bones[name].getWorldPosition(out); return out; }
}

function tintSkin(mat, rgb) { mat.color = new THREE.Color(...rgb); mat.roughness = .62; mat.metalness = 0; if (mat.normalMap) mat.normalScale.set(.8, .8); }

function plainCloth(mesh, color, { rough = .8, sheen = 0, metal = 0, keepMap = false } = {}) {
  const old = mesh.material;
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: metal, normalMap: old.normalMap || null, sheen, sheenRoughness: .5, sheenColor: new THREE.Color(color).multiplyScalar(1.2) });
  if (keepMap) { m.map = old.map; m.color.set(0xffffff); }
  if (m.normalMap) m.normalScale.set(1.2, 1.2);
  mesh.material = m; return m;
}

const GOLD = () => new THREE.MeshStandardMaterial({ color: 0xf0b445, metalness: 1, roughness: .28, envMapIntensity: 1.4 });

function hairShell(headMesh, eyeMesh, mat) {
  headMesh.updateWorldMatrix(true, false); eyeMesh.updateWorldMatrix(true, false);
  const geo = headMesh.geometry, pos = geo.attributes.position, nor = geo.attributes.normal, idx = geo.index.array;
  geo.computeBoundingBox(); const bb = geo.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, R = (bb.max.x - bb.min.x) / 2;
  const eb = new THREE.Box3().setFromObject(eyeMesh), ew = eb.getCenter(new THREE.Vector3()); const el = headMesh.worldToLocal(ew.clone());
  const eyeY = el.y, hz = (bb.max.z - bb.min.z) / 2;
  const thr = (x, y, z) => { const f = (z - cz) / hz, w = THREE.MathUtils.clamp((1 - f) / 2, 0, 1), sx = Math.abs(x - cx) / R; return eyeY + R * .62 - R * 1.0 * w * w * w - R * .22 * sx * sx; };
  const keep = []; const n = pos.count; const ex = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); ex[i] = THREE.MathUtils.smoothstep(y - thr(x, y, z), -.004, .018); }
  const used = new Map(), map = new Int32Array(n).fill(-1); const outIdx = [];
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (ex[a] > 0 || ex[b] > 0 || ex[c] > 0) outIdx.push(a, b, c); }
  const g = new THREE.BufferGeometry();
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const top = THREE.MathUtils.smoothstep(pos.getY(i), eyeY, bb.max.y);
    const th = (.0025 + ex[i] * (.0065 + top * .012));
    P[i * 3] = pos.getX(i) + nor.getX(i) * th; P[i * 3 + 1] = pos.getY(i) + nor.getY(i) * th + ex[i] * top * .004; P[i * 3 + 2] = pos.getZ(i) + nor.getZ(i) * th;
    N[i * 3] = nor.getX(i); N[i * 3 + 1] = nor.getY(i); N[i * 3 + 2] = nor.getZ(i);
  }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', geo.attributes.uv);
  g.setAttribute('skinIndex', geo.attributes.skinIndex); g.setAttribute('skinWeight', geo.attributes.skinWeight); g.setIndex(outIdx);
  // strand look: fine procedural bump along the head
  const m = new THREE.SkinnedMesh(g, mat); m.bind(headMesh.skeleton, headMesh.bindMatrix); m.position.copy(headMesh.position); m.quaternion.copy(headMesh.quaternion); m.scale.copy(headMesh.scale);
  m.castShadow = true; m.frustumCulled = false; headMesh.parent.add(m); return m;
}
function hairTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2200; i++) { const x = Math.random() * 256, y = Math.random() * 256, l = 20 + Math.random() * 60; g.strokeStyle = `rgba(${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},${Math.random() > .5 ? 255 : 0},.15)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 6, y + l); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}
function addHair(rig, headMesh, mat, opts) {
  const head = rig.bones.Head; const bb = new THREE.Box3().setFromObject(headMesh); const c = bb.getCenter(new THREE.Vector3());
  const R = (bb.max.x - bb.min.x) * .5;
  const g = new THREE.Group(); head.add(g);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 40, 28, 0, Math.PI * 2, 0, Math.PI * .56), mat);
  cap.scale.set(1, 1.1, 1.18); cap.castShadow = true;
  g.add(cap);
  head.worldToLocal(c.set(c.x, bb.max.y - R * 1.05, c.z - R * .05));
  g.position.copy(c); g.rotation.x = -.15;
  cap.traverse(() => { });
  return g;
}

export async function loadAvatars() {
  const [bg, gg] = await Promise.all([parse(b64ToBuf(boyB64)), parse(b64ToBuf(girlB64))]);
  return { boy: makeBoy(bg.scene), girl: makeGirl(gg.scene) };
}

function prep(root) {
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
}

function makeBoy(root) {
  prep(root);
  const rig = new Rig(root); const M = {}; root.traverse(o => { if (o.isMesh) M[o.name] = o; });
  if (M.Wolf3D_Headwear) M.Wolf3D_Headwear.visible = false; if (M.Wolf3D_Beard) M.Wolf3D_Beard.visible = false;
  tintSkin(M.Wolf3D_Head.material, [.97, .82, .68]); M.Wolf3D_Body.material = M.Wolf3D_Head.material;
  plainCloth(M.Wolf3D_Outfit_Top, 0xf1e2c4, { rough: .72, sheen: .6 });
  plainCloth(M.Wolf3D_Outfit_Bottom, 0xeadcc0, { rough: .78, sheen: .5 });
  M.Wolf3D_Outfit_Footwear.material = new THREE.MeshStandardMaterial({ color: 0x5a3018, roughness: .5, metalness: .1 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x15100d, roughness: .5, metalness: .05, bumpMap: hairTex(), bumpScale: 1.5 });
  hairShell(M.Wolf3D_Head, M.EyeLeft, hairMat);
  const g = new THREE.Group(); g.add(root);
  const anchor = new THREE.Object3D(); g.add(anchor);
  // sparkler stick (visible only while lit)
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .4, 6), new THREE.MeshStandardMaterial({ color: 0x8a8a90, metalness: .8, roughness: .4 })); stick.visible = false; g.add(stick);
  return { group: g, rig, anchor, stick, kind: 'boy' };
}

function makeGirl(root) {
  prep(root);
  const rig = new Rig(root); const M = {}; root.traverse(o => { if (o.isMesh) M[o.name] = o; });
  tintSkin(M.Wolf3D_Head.material, [1, .88, .76]); M.Wolf3D_Body.material = M.Wolf3D_Head.material;
  const hm = new THREE.MeshStandardMaterial({ color: 0x0f0809, roughness: .42, metalness: .1, normalMap: M.Wolf3D_Hair.material.normalMap, side: THREE.DoubleSide });
  M.Wolf3D_Hair.material = hm;
  M.Wolf3D_Outfit_Bottom.visible = false; M.Wolf3D_Outfit_Footwear.visible = false;
  plainCloth(M.Wolf3D_Outfit_Top, 0xf2b31f, { rough: .42, sheen: 1, metal: .05 });
  const g = new THREE.Group(); g.add(root);
  // lehenga skirt
  const prof = []; const N = 14;
  for (let i = 0; i <= N; i++) { const k = i / N; prof.push(new THREE.Vector2(.17 + Math.pow(k, 1.3) * .36 + Math.sin(k * 3.1) * .02, 1.0 - k * .98)); }
  const lg = new THREE.LatheGeometry(prof, 96);
  { // pleats
    const p = lg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); const a = Math.atan2(z, x), r = Math.hypot(x, z), k = 1 - y; const f = 1 + Math.sin(a * 28) * .018 * k + Math.sin(a * 9 + 1) * .01 * k; p.setXYZ(i, x * f, y, z * f); }
    lg.computeVertexNormals();
  }
  const lt = T.lehengaTex();
  const lm = new THREE.MeshPhysicalMaterial({ map: lt, roughness: .45, metalness: .08, sheen: 1, sheenColor: new THREE.Color(0xff6a8a), sheenRoughness: .4, side: THREE.DoubleSide });
  const skirt = new THREE.Mesh(lg, lm); skirt.castShadow = true; skirt.receiveShadow = true; skirt.frustumCulled = false; g.add(skirt);
  // dupatta draped over shoulders (back cape) – animated lightly
  const dm = new THREE.MeshPhysicalMaterial({ color: 0xc81e58, roughness: .5, sheen: 1, sheenColor: new THREE.Color(0xff8fb0), side: THREE.DoubleSide });
  const dg = new THREE.PlaneGeometry(.56, 1.0, 14, 18); dg.translate(0, -.5, 0);
  const dup = new THREE.Mesh(dg, dm); dup.visible = false; g.add(dup);
  // gold hem on dupatta (thin strip mesh built in update-space)
  const jew = GOLD();
  // earrings + necklace
  const earGeo = new THREE.SphereGeometry(.011, 12, 10), dropGeo = new THREE.ConeGeometry(.008, .03, 10);
  const ears = [];
  for (const s of [-1, 1]) { const e = new THREE.Mesh(earGeo, jew); const d = new THREE.Mesh(dropGeo, jew); d.rotation.x = Math.PI; d.position.y = -.025; e.add(d); g.add(e); ears.push(e); }
  const neck = new THREE.Mesh(new THREE.TorusGeometry(.085, .0065, 8, 40), jew); g.add(neck);
  const bangles = [];
  for (const side of ['Left', 'Right']) for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(.03, .0045, 8, 24), i % 2 ? jew : new THREE.MeshStandardMaterial({ color: 0xc9142e, roughness: .3, metalness: .2 })); g.add(b); bangles.push({ b, side, i }); }
  const bindi = new THREE.Mesh(new THREE.CircleGeometry(.0065, 16), new THREE.MeshBasicMaterial({ color: 0xc40d22 })); g.add(bindi);
  const anchor = new THREE.Object3D(); g.add(anchor);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, .4, 6), new THREE.MeshStandardMaterial({ color: 0x8a8a90, metalness: .8, roughness: .4 })); stick.visible = false; g.add(stick);
  return { group: g, rig, anchor, stick, skirt, dup, dg, ears, neck, bangles, bindi, kind: 'girl' };
}

export { Rig, X, Y, Z };
