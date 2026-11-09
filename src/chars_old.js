import * as THREE from 'three';
import * as T from './textures.js';

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .62, ...o });
const sph = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), mat); m.scale.set(sx, sy, sz); m.castShadow = true; return m; };
const cyl = (rt, rb, h, mat, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.castShadow = true; return m; };

const SKIN = std(0xf1b890, { roughness: .55 });
const EYE = new THREE.MeshStandardMaterial({ color: 0x1a0c0c, roughness: .3 });
const WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff });
const BLUSH = new THREE.MeshBasicMaterial({ color: 0xff7a8c, transparent: true, opacity: .55 });
const GOLD = std(0xf5b942, { metalness: .8, roughness: .3, emissive: 0x2a1a00 });

function face(girl) {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) {
    const eye = sph(girl ? .068 : .06, EYE, 1, 1.45, .55); eye.position.set(sx * .17, .02, .4); eye.castShadow = false; g.add(eye);
    const hl = sph(.02, WHITE); hl.position.set(sx * .17 + .02, .06, .435); g.add(hl);
    const hl2 = sph(.01, WHITE); hl2.position.set(sx * .17 - .015, -.02, .44); g.add(hl2);
    const bl = sph(.07, BLUSH, 1.3, .7, .3); bl.position.set(sx * .29, -.1, .35); bl.rotation.y = sx * .6; bl.castShadow = false; g.add(bl);
    const brow = new THREE.Mesh(new THREE.TorusGeometry(.07, .011, 6, 12, Math.PI * .8), EYE); brow.position.set(sx * .17, .15, .39); brow.rotation.z = Math.PI * .1; g.add(brow);
    const ear = sph(.085, SKIN, .6, 1, .8); ear.position.set(sx * .455, -.02, 0); g.add(ear);
    if (girl) { const er = sph(.04, GOLD); er.position.set(sx * .47, -.14, .02); g.add(er); const dr = sph(.025, GOLD); dr.position.set(sx * .47, -.2, .02); g.add(dr); }
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.065, .013, 6, 16, Math.PI), girl ? new THREE.MeshStandardMaterial({ color: 0xc23a52 }) : EYE);
  mouth.position.set(0, -.12, .42); mouth.rotation.z = Math.PI; g.add(mouth);
  const nose = sph(.03, std(0xe0a07c)); nose.position.set(0, -.04, .45); g.add(nose);
  return g;
}

function limb(len, r, sleeveMat, handMat, sleeveLen, bangle) {
  const pivot = new THREE.Group();
  const sleeve = cyl(r * 1.15, r, sleeveLen, sleeveMat, 12); sleeve.position.y = -sleeveLen / 2; pivot.add(sleeve);
  if (sleeveLen < len) { const bare = cyl(r * .9, r * .85, len - sleeveLen, handMat, 12); bare.position.y = -sleeveLen - (len - sleeveLen) / 2; pivot.add(bare); }
  const hand = sph(r * 1.2, handMat); hand.position.y = -len - r * .3; pivot.add(hand);
  if (bangle) for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, .012, 6, 14), i % 2 ? GOLD : std(0xd0213c)); b.rotation.x = Math.PI / 2; b.position.y = -len + .04 + i * .025; pivot.add(b); }
  pivot.userData.hand = hand;
  return pivot;
}

export function makeBoy() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const kurta = std(0xfaf0de, { roughness: .8 }), pj = std(0xf1e6d2, { roughness: .8 }), hairM = std(0x1b0f0b, { roughness: .8 });
  const torso = cyl(.27, .35, .92, kurta, 24); torso.scale.z = .8; torso.position.y = .98; body.add(torso);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.2, .03, 8, 20), GOLD); collar.rotation.x = Math.PI / 2; collar.position.y = 1.43; body.add(collar);
  for (let i = 0; i < 4; i++) { const b = sph(.025, GOLD); b.position.set(0, 1.28 - i * .17, .29 - i * .008); body.add(b); }
  const stole = new THREE.Mesh(new THREE.BoxGeometry(.13, .95, .05), std(0xb3261e, { roughness: .6 })); stole.position.set(.06, 1.0, .29); stole.rotation.z = .5; stole.castShadow = true; body.add(stole);
  const stole2 = new THREE.Mesh(new THREE.BoxGeometry(.1, .6, .04), std(0xffc247)); stole2.position.set(.06, 1.0, .295); stole2.rotation.z = .5; body.add(stole2);
  const legs = [];
  for (const sx of [-1, 1]) {
    const lp = new THREE.Group(); lp.position.set(sx * .13, .55, 0);
    const l = cyl(.11, .09, .56, pj, 12); l.position.y = -.28; lp.add(l);
    const shoe = sph(.12, std(0x7a3b1c), 1, .6, 1.5); shoe.position.set(0, -.58, .06); lp.add(shoe);
    body.add(lp); legs.push(lp);
  }
  // head
  const head = new THREE.Group(); head.position.y = 1.78; body.add(head);
  const skull = sph(.46, SKIN, 1, .94, .96); head.add(skull);
  head.add(face(false));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.485, 32, 20, 0, Math.PI * 2, 0, Math.PI * .6), hairM); cap.rotation.x = -.32; cap.position.set(0, .03, -.03); cap.castShadow = true; head.add(cap);
  for (let i = 0; i < 6; i++) { const f = sph(.085, hairM, 1.3, 1, 1); f.position.set(-.27 + i * .11, .3 - Math.abs(i - 2.5) * .02, .34); head.add(f); }
  // arms
  const arms = {};
  for (const [k, sx] of [['L', -1], ['R', 1]]) {
    const a = limb(.42, .075, kurta, SKIN, .34, false); a.position.set(sx * .32, 1.36, 0); body.add(a); arms[k] = a;
  }
  arms.L.userData.hand.updateMatrixWorld();
  const anchor = new THREE.Object3D(); anchor.position.set(0, -.98, 0); arms.L.add(anchor);
  const stick = cyl(.008, .008, .5, std(0x777777, { metalness: .6 }), 6); stick.position.set(0, -.74, 0); arms.L.add(stick);
  g.userData = { body, head, legs, arms, anchor, hairM };
  return g;
}

export function makeGirl() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const lt = T.lehengaTex();
  const lehM = new THREE.MeshStandardMaterial({ map: lt, roughness: .6, side: THREE.DoubleSide });
  const prof = [[.25, 1.02], [.29, .95], [.37, .72], [.5, .38], [.62, .06], [.63, .0]].map(([x, y]) => new THREE.Vector2(x, y));
  const leh = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), lehM); leh.castShadow = true; body.add(leh);
  for (const [r, y] of [[.625, .05], [.58, .2]]) { const b = new THREE.Mesh(new THREE.TorusGeometry(r, .035, 8, 40), GOLD); b.rotation.x = Math.PI / 2; b.position.y = y; body.add(b); }
  const choliM = std(0xffc23a, { roughness: .55 });
  const choli = cyl(.2, .26, .44, choliM, 24); choli.scale.z = .8; choli.position.y = 1.22; body.add(choli);
  const mid = cyl(.2, .21, .12, SKIN, 20); mid.scale.z = .8; mid.position.y = .98; body.add(mid);
  const duM = std(0xd8245f, { roughness: .5, side: THREE.DoubleSide });
  const cape = new THREE.Mesh(new THREE.PlaneGeometry(.78, 1.15, 8, 8), duM); cape.castShadow = true;
  { const p = cape.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -.2 - x * x * .5 + (p.getY(i) < 0 ? -.06 : 0)); } cape.geometry.computeVertexNormals(); }
  cape.position.set(0, .82, 0); body.add(cape);
  const sash = new THREE.Mesh(new THREE.BoxGeometry(.13, .9, .05), duM); sash.position.set(-.06, 1.18, .24); sash.rotation.z = -.5; sash.castShadow = true; body.add(sash);
  const feet = [];
  for (const sx of [-1, 1]) { const f = sph(.09, std(0xf5b942, { metalness: .5 }), 1, .55, 1.5); f.position.set(sx * .14, .05, .38); body.add(f); feet.push(f); }
  const head = new THREE.Group(); head.position.y = 1.72; body.add(head);
  const skull = sph(.46, SKIN, 1, .94, .96); head.add(skull);
  head.add(face(true));
  const hairM = std(0x120a0c, { roughness: .45 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(.495, 32, 20, 0, Math.PI * 2, 0, Math.PI * .62), hairM); cap.rotation.x = -.3; cap.position.set(0, .03, -.04); cap.castShadow = true; head.add(cap);
  const back = sph(.5, hairM, .98, 1.7, .62); back.position.set(0, -.42, -.2); head.add(back);
  for (const sx of [-1, 1]) { const lock = sph(.12, hairM, .8, 2.1, .7); lock.position.set(sx * .43, -.26, .12); head.add(lock); }
  for (let i = 0; i < 5; i++) { const f = sph(.1, hairM, 1.2, 1, 1); f.position.set(-.24 + i * .12, .31, .33); head.add(f); }
  // part line
  const part = new THREE.Mesh(new THREE.BoxGeometry(.012, .1, .01), std(0xc23a52)); part.position.set(0, .4, .26); part.rotation.x = -.55; head.add(part);
  // bindi + gajra flowers
  const bindi = sph(.032, new THREE.MeshBasicMaterial({ color: 0xd8102a })); bindi.position.set(0, .2, .445); head.add(bindi);
  for (let i = 0; i < 8; i++) { const a = -1.1 + i * .31; const fl = sph(.05, new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfff3cf : 0xffd24a })); fl.position.set(Math.sin(a) * .48, .2 + Math.cos(a) * .1, -.22 - Math.cos(a) * .12); head.add(fl); }
  const arms = {};
  for (const [k, sx] of [['L', -1], ['R', 1]]) {
    const a = limb(.4, .06, choliM, SKIN, .13, true); a.position.set(sx * .27, 1.38, 0); body.add(a); arms[k] = a;
  }
  g.userData = { body, head, feet, arms, cape };
  return g;
}

export function makeBunny() {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  const fur = std(0xfff8f2, { roughness: .9 });
  const body = sph(.22, fur, 1, .9, 1.25); body.position.y = .2; b.add(body);
  const head = new THREE.Group(); head.position.set(0, .34, .22); b.add(head);
  head.add(sph(.16, fur));
  for (const sx of [-1, 1]) {
    const ear = sph(.05, fur, .8, 3.2, .45); ear.position.set(sx * .075, .26, -.02); ear.rotation.z = -sx * .12; head.add(ear);
    const inner = sph(.03, new THREE.MeshStandardMaterial({ color: 0xffb3c1 }), .7, 3, .3); inner.position.set(sx * .075, .26, .008); inner.rotation.z = -sx * .12; head.add(inner);
    const e = sph(.022, EYE); e.position.set(sx * .075, .03, .14); head.add(e);
    const f = sph(.07, fur, 1, .75, 1.3); f.position.set(sx * .1, -.15, .1); b.add(f);
  }
  const n = sph(.022, new THREE.MeshStandardMaterial({ color: 0xff8fa3 })); n.position.set(0, -.02, .155); head.add(n);
  const tail = sph(.07, fur); tail.position.set(0, .22, -.27); b.add(tail);
  g.userData = { b, head };
  return g;
}

export class Couple {
  constructor() {
    this.group = new THREE.Group();
    this.boy = makeBoy(); this.girl = makeGirl(); this.bunny = makeBunny();
    this.boy.position.x = -.48; this.girl.position.x = .52;
    this.bunny.position.set(1.35, 0, .85); this.bunny.rotation.y = -.5;
    this.group.add(this.boy, this.girl, this.bunny);
    this.walking = false; this.phase = 0; this.sparkler = 0; this.wave = 0;
    this.bunnyHome = this.bunny.position.clone();
    // joined inner hands
    this.boy.userData.arms.R.rotation.z = .62; this.girl.userData.arms.L.rotation.z = -.78;
    this.group.traverse(o => { if (o.isMesh) o.receiveShadow = false; });
  }
  update(t, dt) {
    const bu = this.boy.userData, gu = this.girl.userData, k = this.walking ? 1 : 0;
    this.phase += dt * (this.walking ? 6.2 : 0);
    const s = Math.sin(this.phase), idle = Math.sin(t * 1.6);
    const bob = this.walking ? Math.abs(Math.sin(this.phase)) * .07 : idle * .012;
    bu.body.position.y = bob; gu.body.position.y = bob + (this.walking ? .0 : Math.sin(t * 1.6 + 1) * .01);
    bu.legs[0].rotation.x = s * .7 * k; bu.legs[1].rotation.x = -s * .7 * k;
    gu.feet[0].position.z = .38 + s * .22 * k; gu.feet[1].position.z = .38 - s * .22 * k;
    gu.feet[0].position.y = .05 + Math.max(0, s) * .1 * k; gu.feet[1].position.y = .05 + Math.max(0, -s) * .1 * k;
    // heads lean toward each other + look
    bu.head.rotation.z = .1 + Math.sin(t * .9) * .03; gu.head.rotation.z = -.1 - Math.sin(t * .9 + 1) * .03;
    bu.head.rotation.y = Math.sin(t * .6) * .08 + this.look * 0.0; gu.head.rotation.y = Math.sin(t * .6 + 2) * .08;
    gu.cape.rotation.x = Math.sin(t * 1.3) * .03 + (this.walking ? .1 : 0);
    // outer arms
    const wv = this.sparkler;
    bu.arms.L.rotation.x = THREE.MathUtils.lerp(this.walking ? s * .35 : 0, -.45 + Math.sin(t * 4) * .15, wv);
    bu.arms.L.rotation.z = THREE.MathUtils.lerp(-.12, -2.15 + Math.sin(t * 5.3) * .22, wv);
    gu.arms.R.rotation.z = .12 + (this.walking ? 0 : Math.sin(t * 1.6) * .02);
    gu.arms.R.rotation.x = this.walking ? -s * .3 : 0;
    // bunny hops
    const bn = this.bunny.userData, hop = this.walking ? Math.abs(Math.sin(this.phase * .9)) * .22 : Math.max(0, Math.sin(t * 2.2)) * .06;
    bn.b.position.y = hop; bn.head.rotation.x = Math.sin(t * 2.2) * .08;
  }
  setSparkler(v) { this.sparkler = v; }
  get look() { return 0; }
}
