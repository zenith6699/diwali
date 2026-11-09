import * as THREE from 'three';
import * as T from './textures.js';
import { loadAvatars, Rig, X, Y, Z } from './avatar.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

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

export const furUni = { uSunDir: { value: new THREE.Vector3(-.4, .8, .5).normalize() }, uSunCol: { value: new THREE.Color(1, .8, .55) }, uAmb: { value: new THREE.Color(.45, .38, .36) }, uWarm: { value: new THREE.Color(0, 0, 0) } };
// shell-fur: N extruded copies of an ellipsoid; strands are 3-D hash cells that taper towards the tip
const SHELLS = window.__LOW ? 5 : (window.__SAFE || matchMedia('(pointer:coarse)').matches) ? 8 : 16;
function furMat(base, tip, len, dens) {
  return new THREE.ShaderMaterial({
    uniforms: { ...furUni, uBase: { value: new THREE.Color(base) }, uTip: { value: new THREE.Color(tip) }, uLen: { value: len }, uDens: { value: dens } },
    vertexShader: `attribute float aL; uniform float uLen; varying vec3 vN; varying vec3 vO; varying float vL; varying vec3 vW;
      void main(){ vL=aL; vO=position; vec3 p=position+normal*aL*uLen + vec3(0.,-.35,0.)*aL*aL*uLen; vN=normalize(mat3(modelMatrix)*normal);
        vec4 w=modelMatrix*instanceMatrix*vec4(p,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uSunDir,uSunCol,uAmb,uWarm,uBase,uTip; uniform float uDens; varying vec3 vN; varying vec3 vO; varying float vL; varying vec3 vW;
      float h3(vec3 p){ p=fract(p*vec3(.1031,.1030,.0973)); p+=dot(p,p.yxz+33.33); return fract((p.x+p.y)*p.z); }
      void main(){ vec3 q=vO*uDens; vec3 c=floor(q); float h=h3(c); vec3 f=fract(q)-.5; float r=length(f)*1.25;
        float len=.45+.55*h; if(vL>len) discard; if(r>(1.-vL/len)*.9+.1) discard;
        vec3 N=normalize(vN); float nd=dot(N,uSunDir); float diff=clamp(nd*.6+.55,0.,1.);
        vec3 alb=mix(uBase*.55,uTip,smoothstep(0.,1.,vL)); alb*=.8+.4*h;
        vec3 col=alb*(uAmb*(.35+.65*vL)+uSunCol*diff*(.25+.75*vL)+uWarm);
        vec3 V=normalize(cameraPosition-vW); col+=uSunCol*pow(1.-max(dot(N,V),0.),3.)*.35*vL;
        gl_FragColor=vec4(col,1.); }`,
  });
}
function furPart(rx, ry, rz, pos, rot, mat, innerCol, castInner = true) {
  const gl = mergeVertices(new THREE.SphereGeometry(1, 26, 18)); gl.scale(rx, ry, rz); gl.computeVertexNormals();
  const g = new THREE.Group(); g.position.set(...pos); if (rot) g.rotation.set(...rot);
  const inner = new THREE.Mesh(gl, new THREE.MeshStandardMaterial({ color: innerCol, roughness: .95 })); inner.castShadow = castInner; g.add(inner);
  const sh = new THREE.InstancedMesh(gl, mat, SHELLS); const L = new Float32Array(SHELLS);
  for (let i = 0; i < SHELLS; i++) { L[i] = (i + 1) / SHELLS; sh.setMatrixAt(i, new THREE.Matrix4()); }
  gl.setAttribute('aL', new THREE.InstancedBufferAttribute(L, 1)); sh.frustumCulled = false; g.add(sh);
  return g;
}
export function makeBunny() {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  // agouti (wild-brown) coat with a pale belly / muzzle / scut and dark-tipped ears, like a real pet rabbit
  const fur = furMat(0x4f3d2e, 0xb99b75, .03, 900), furW = furMat(0x9a8c7a, 0xf3ede3, .03, 820), furD = furMat(0x2a211a, 0x6e5741, .022, 900);
  const IN = 0x6b5743, INW = 0xcfc3b2, IND = 0x3a2e24;
  b.add(furPart(.1, .098, .165, [0, .125, .005], null, fur, IN));          // torso
  b.add(furPart(.112, .112, .125, [0, .135, -.075], null, fur, IN));       // rounded rump
  b.add(furPart(.075, .082, .09, [0, .108, .105], null, fur, IN));         // chest
  b.add(furPart(.07, .045, .13, [0, .052, .02], null, furW, INW, false));  // pale belly
  for (const sx of [-1, 1]) {
    b.add(furPart(.058, .088, .112, [sx * .088, .105, -.07], [0, 0, 0], fur, IN));            // thigh
    b.add(furPart(.026, .02, .09, [sx * .082, .024, -.03], [0, sx * .05, 0], fur, IN, false)); // long hind foot
    b.add(furPart(.022, .066, .024, [sx * .04, .068, .135], [.12, 0, 0], fur, IN, false));     // foreleg
    b.add(furPart(.022, .014, .036, [sx * .04, .02, .168], null, furW, INW, false));           // paw
  }
  b.add(furPart(.05, .05, .048, [0, .165, -.195], null, furW, INW));       // cotton-ball scut
  const head = new THREE.Group(); head.position.set(0, .185, .165); b.add(head);
  head.add(furPart(.068, .066, .088, [0, .012, .03], null, fur, IN));      // skull
  head.add(furPart(.044, .036, .05, [0, -.018, .098], null, furW, INW, false)); // muzzle
  head.add(furPart(.024, .02, .03, [0, -.045, .085], null, furW, INW, false));  // chin
  for (const sx of [-1, 1]) head.add(furPart(.044, .042, .052, [sx * .04, -.02, .06], null, furW, INW, false)); // cheeks
  const pink = new THREE.MeshStandardMaterial({ color: 0xe0a0a2, roughness: .65, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a0f0b, roughness: .5 });
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(sx * .03, .066, -.022); ear.rotation.set(-.32, sx * .06, -sx * .3);
    ear.add(furPart(.026, .118, .011, [0, .112, 0], null, fur, IN));
    ear.add(furPart(.022, .03, .011, [0, .205, .0], null, furD, IND, false));          // dark ear tip
    const inn = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), pink); inn.scale.set(.016, .092, .004); inn.position.set(0, .105, .0105); ear.add(inn);
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.0185, 18, 14), new THREE.MeshPhysicalMaterial({ color: 0x1b0e08, roughness: .08, clearcoat: 1, envMapIntensity: 2.2 }));
    eye.position.set(sx * .062, .03, .066); head.add(eye);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.0195, .0035, 6, 18), new THREE.MeshStandardMaterial({ color: 0xd9cdbb, roughness: .9 }));
    rim.position.set(sx * .0625, .03, .067); rim.rotation.y = sx * Math.PI / 2.4; head.add(rim);       // pale eye-ring
    const gl = new THREE.Mesh(new THREE.SphereGeometry(.0042, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); gl.position.set(sx * .074, .038, .078); head.add(gl);
    for (let w = 0; w < 4; w++) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(.0007, .0002, .11, 4), new THREE.MeshBasicMaterial({ color: 0xf4f0ea }));
      wh.geometry.translate(0, .055, 0); wh.position.set(sx * .03, -.02 - w * .0045, .118); wh.rotation.set(-.12 + w * .08, 0, -sx * (Math.PI / 2 - .35 + w * .16)); head.add(wh);
    }
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.011, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd98791, roughness: .45 })); nose.position.set(0, -.002, .15); nose.scale.set(1.25, .9, .8); head.add(nose);
  for (const sx of [-1, 1]) { const n = new THREE.Mesh(new THREE.SphereGeometry(.0034, 8, 6), dark); n.position.set(sx * .0045, -.003, .159); head.add(n); }
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(.0006, .0006, .014, 4), dark); mouth.position.set(0, -.014, .156); head.add(mouth);
  for (const sx of [-1, 1]) { const m2 = new THREE.Mesh(new THREE.CylinderGeometry(.0006, .0006, .016, 4), dark); m2.position.set(sx * .006, -.021, .15); m2.rotation.z = sx * 1.0; head.add(m2); }
  g.userData = { b, head };
  return g;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _qq = new THREE.Quaternion(), _rq = new THREE.Quaternion();
const nv = (x, y, z) => new THREE.Vector3(x, y, z).normalize();

// aim `bone` so that the segment bone -> child points along `dir` (given in the character's own space)
function aim(av, bone, child, dir) {
  const rig = av.rig, b = rig.bones[bone], c = rig.bones[child]; if (!b || !c) return;
  b.updateWorldMatrix(true, false); c.updateWorldMatrix(true, false);
  b.getWorldPosition(_a); c.getWorldPosition(_b); _b.sub(_a).normalize();
  av.root.getWorldQuaternion(_rq); _c.copy(dir).applyQuaternion(_rq).normalize();
  _qq.setFromUnitVectors(_b, _c);
  b.parent.getWorldQuaternion(_rq); const cur = _rq.clone().multiply(b.quaternion);
  const tgt = _qq.clone().multiply(cur); b.quaternion.copy(_rq.invert().multiply(tgt)); b.updateWorldMatrix(false, true);
}
function aimW(av, bone, child, dirW) {
  const b = av.rig.bones[bone], c = av.rig.bones[child];
  b.updateWorldMatrix(true, false); c.updateWorldMatrix(true, false);
  b.getWorldPosition(_a); c.getWorldPosition(_b); _b.sub(_a).normalize(); _c.copy(dirW).normalize();
  _qq.setFromUnitVectors(_b, _c);
  b.parent.getWorldQuaternion(_rq); const cur = _rq.clone().multiply(b.quaternion);
  b.quaternion.copy(_rq.invert().multiply(_qq.clone().multiply(cur))); b.updateWorldMatrix(false, true);
}
// two-bone IK: put the hand at `tgt` (world) with the elbow bending toward `pole` (world direction)
function reach(av, side, tgt, pole) {
  const r = av.rig, sh = r.pos(side + 'Arm', new THREE.Vector3()), el = r.pos(side + 'ForeArm', new THREE.Vector3()), hd = r.pos(side + 'Hand', new THREE.Vector3());
  const L1 = sh.distanceTo(el), L2 = el.distanceTo(hd);
  const d = tgt.clone().sub(sh); const dist = Math.min(d.length(), (L1 + L2) * .995); d.normalize();
  const cosA = THREE.MathUtils.clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const pl = pole.clone().addScaledVector(d, -pole.dot(d)).normalize();
  const elbow = sh.clone().addScaledVector(d, L1 * cosA).addScaledVector(pl, L1 * sinA);
  aimW(av, side + 'Arm', side + 'ForeArm', elbow.clone().sub(sh));
  r.pos(side + 'ForeArm', el); const hand = sh.clone().addScaledVector(d, dist);
  aimW(av, side + 'ForeArm', side + 'Hand', hand.sub(el));
}
function turn(av, bone, axis, ang) {
  const b = av.rig.bones[bone]; if (!b) return;
  av.root.getWorldQuaternion(_rq); _a.copy(axis).applyQuaternion(_rq);
  _qq.setFromAxisAngle(_a, ang);
  b.parent.updateWorldMatrix(true, false); b.parent.getWorldQuaternion(_rq); const cur = _rq.clone().multiply(b.quaternion);
  b.quaternion.copy(_rq.invert().multiply(_qq.multiply(cur))); b.updateWorldMatrix(false, true);
}

export class Couple {
  constructor() {
    this.group = new THREE.Group();
    this.bunny = makeBunny();
    this.bunny.position.set(1.15, 0, .8); this.bunny.rotation.y = -.5;
    this.group.add(this.bunny);
    this.walking = false; this.phase = 0; this.sparkler = 0; this.wk = 0;
    this.bunnyHome = this.bunny.position.clone();
    this.boy = { userData: { anchor: new THREE.Object3D() } }; this.girl = { userData: {} };
  }
  async load() {
    const { boy, girl } = await loadAvatars();
    this.B = boy; this.G = girl;
    boy.root = boy.rig.root; girl.root = girl.rig.root;
    boy.group.position.x = -.36; girl.group.position.x = .44;
    this.group.add(boy.group, girl.group);
    this.boy = { userData: { anchor: boy.anchor } };
    this.girl = { userData: { anchor: girl.anchor } };
    this.group.updateMatrixWorld(true);
    decorateGirl(girl); decorateBoy(boy);
    this.group.traverse(o => { if (o.isMesh) { o.receiveShadow = false; } });
    this.update(0, 0);
  }
  update(t, dt) {
    const B = this.B, G = this.G;
    if (B) {
      this.group.updateMatrixWorld(true);
      this.wk += ((this.walking ? 1 : 0) - this.wk) * Math.min(1, dt * 7);
      this.phase += dt * 5.6 * this.wk;
      const wk = this.wk, ph = this.phase, s = Math.sin(ph), c = Math.cos(ph), idle = Math.sin(t * 1.5), sp = this.sparkler;
      const bob = Math.abs(Math.sin(ph)) * .028 * wk;
      for (const [av, off] of [[B, 0], [G, 1.1]]) {
        const rig = av.rig; rig.reset(); av.root.position.y = bob - (av === G ? 0 : 0);
        const ph2 = ph + off * 0;
        // legs
        for (const [side, sg] of [['Left', 1], ['Right', -1]]) {
          const sw = Math.sin(ph) * sg, kn = Math.max(0, Math.cos(ph) * sg);
          turn(av, side + 'UpLeg', X, -sw * .55 * wk); turn(av, side + 'Leg', X, kn * .75 * wk + .02); turn(av, side + 'Foot', X, sw * .25 * wk - kn * .15 * wk);
        }
        // spine & breathing
        turn(av, 'Spine1', X, .02 + idle * .006 + Math.abs(s) * .02 * wk); turn(av, 'Spine2', Y, s * .06 * wk);
      }
      // ---- boy arms: left (+x) holds her hand, right (-x) is the sparkler arm
      const bl = this.walking || wk > .1 ? s * .3 * wk : 0;
      this.group.updateMatrixWorld(true);
      { const bs = B.rig.pos('LeftArm', new THREE.Vector3()), gs = G.rig.pos('RightArm', new THREE.Vector3());
        const M = bs.clone().add(gs).multiplyScalar(.5); M.y -= .5; this.group.getWorldQuaternion(_rq); M.addScaledVector(Z.clone().applyQuaternion(_rq), .1 + Math.sin(t * 1.5) * .008 + s * .03 * wk); M.y += Math.sin(t * 1.5) * .006 + Math.abs(s) * .02 * wk;
        const fwd = Z.clone().applyQuaternion(_rq);
        reach(B, 'Left', M, new THREE.Vector3(.35, -1, -.55).applyQuaternion(_rq)); reach(G, 'Right', M, new THREE.Vector3(-.35, -1, -.55).applyQuaternion(_rq)); }
      const up = (a, b, k) => a.clone().lerp(b, k).normalize();
      const w = Math.sin(t * 5.3) * .22 * sp, w2 = Math.sin(t * 4) * .15 * sp;
      aim(B, 'RightArm', 'RightForeArm', up(nv(-.18, -.95, -.18 * s * wk * 0 + .08 - s * .3 * wk), nv(-.4 + w, .1 + w2, .9), sp));
      aim(B, 'RightForeArm', 'RightHand', up(nv(-.2, -.94, .25), nv(-.2 + w * .5, .85 + w2, .45), sp));
      aim(B, 'RightHand', 'RightHandMiddle1', up(nv(-.1, -1, .2), nv(-.1, 1, .25), sp));
      // heads: look at each other, tiny life
      turn(B, 'Head', Y, .22 + Math.sin(t * .7) * .05 + (sp > .5 ? -.25 * sp : 0)); turn(B, 'Head', Z, -.05); turn(B, 'Neck', X, .03);
      turn(G, 'Head', Y, -.2 + Math.sin(t * .6 + 2) * .05); turn(G, 'Head', Z, .07);
      // girl arms: right (-x) holds his hand, left (+x) hangs
      const gw = Math.sin(t * 4.6 + 1) * .22 * sp, gw2 = Math.sin(t * 3.7 + 2) * .15 * sp;
      aim(G, 'LeftArm', 'LeftForeArm', up(nv(.22, -.96, -s * .25 * wk), nv(.4 - gw, .1 + gw2, .9), sp));
      aim(G, 'LeftForeArm', 'LeftHand', up(nv(.2, -.9, .3 + s * .1 * wk), nv(.2 - gw * .5, .85 + gw2, .45), sp));
      aim(G, 'LeftHand', 'LeftHandMiddle1', up(nv(.1, -1, .2), nv(.1, 1, .25), sp));
      // girl skirt / dupatta
      G.skirt.position.y = bob; G.skirt.rotation.z = Math.sin(ph) * .035 * wk; G.skirt.rotation.x = Math.cos(ph * 2) * .02 * wk; G.skirt.scale.setScalar(1 + Math.sin(t * 1.4) * .004);
      // sparkler sticks follow the hands (boy right, girl left)
      for (const [av, side] of [[B, 'Right'], [G, 'Left']]) {
        const hw = av.rig.pos(side + 'Hand', new THREE.Vector3()), fw = av.rig.pos(side + 'HandMiddle1', new THREE.Vector3());
        const dirW = fw.clone().sub(hw).normalize();
        av.anchor.position.copy(av.group.worldToLocal(hw.clone().addScaledVector(dirW, .3)));
        av.stick.position.copy(av.group.worldToLocal(hw.clone().addScaledVector(dirW, .15)));
        av.stick.quaternion.copy(av.group.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(Y, dirW)));
        av.stick.visible = sp > .05;
      }
    }
    // bunny
    const bn = this.bunny.userData, hop = this.walking ? Math.abs(Math.sin(this.phase * .9)) * .16 : Math.max(0, Math.sin(t * 2.2)) * .04;
    bn.b.position.y = hop; bn.head.rotation.x = Math.sin(t * 2.2) * .08;
  }
  setSparkler(v) { this.sparkler = v; }
  setFurVisible(v) { this.bunny.traverse(o => { if (o.isInstancedMesh) o.visible = v; }); }
}

function updateDupatta(G, t, wk, s) {
  const rig = G.rig, sp = rig.pos('Spine2', new THREE.Vector3()), p = G.dg.attributes.position;
  G.root.getWorldQuaternion(_rq);
  G.group.updateMatrixWorld(true);
  const sh = rig.pos('Spine2', _a.set(0, 0, 0)); const loc = G.group.worldToLocal(sh.clone());
  G.dup.position.set(0, loc.y + .12, loc.z - .09);
  const base = G.dup.userData.base || (G.dup.userData.base = p.array.slice());
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1];
    const k = -y / 1.0; // 0 at shoulder .. 1 at hem
    const wave = Math.sin(t * 2.1 + x * 5 + k * 3.5) * .035 * k + Math.sin(t * 1.3 + k * 6) * .02 * k;
    p.setXYZ(i, x * (1 + k * .28), y, -k * .05 - Math.abs(x) * .09 * (1 - k) + wave - wk * k * .12 + Math.sin(ph0(t)) * 0);
  }
  p.needsUpdate = true; G.dg.computeVertexNormals();
}
const ph0 = () => 0;

function decorateGirl(G) {
  const rig = G.rig, root = G.root; root.updateMatrixWorld(true);
  const head = rig.bones.Head; let headMesh; root.traverse(o => { if (o.name === 'Wolf3D_Head') headMesh = o; });
  const ray = new THREE.Raycaster();
  const hit = (o, d) => { ray.set(o, d); const r = ray.intersectObject(headMesh, false); return r[0]; };
  const bb = new THREE.Box3().setFromObject(headMesh), c = bb.getCenter(new THREE.Vector3());
  const attach = (bone, mesh, wp, wq) => { bone.updateWorldMatrix(true, false); const s = bone.getWorldScale(new THREE.Vector3()).x; mesh.scale.multiplyScalar(1 / s); mesh.position.copy(bone.worldToLocal(wp.clone())); if (wq) { bone.getWorldQuaternion(_qq); mesh.quaternion.copy(_qq.invert().multiply(wq)); } bone.add(mesh); };
  // bindi
  const fh = hit(new THREE.Vector3(c.x, bb.max.y - (bb.max.y - bb.min.y) * .3, c.z + 1), new THREE.Vector3(0, 0, -1));
  if (fh) { const wq = new THREE.Quaternion().setFromUnitVectors(Z, fh.face.normal.clone().transformDirection(headMesh.matrixWorld)); attach(head, G.bindi, fh.point.clone().addScaledVector(Z, .0012), wq); }
  // earrings
  G.ears.forEach((e, i) => { const sx = i ? -1 : 1; const eh = hit(new THREE.Vector3(c.x + sx * 1, c.y - .03, c.z - .005), new THREE.Vector3(-sx, 0, 0)); const p = eh ? eh.point.clone().add(new THREE.Vector3(sx * .004, -.01, 0)) : c.clone().add(new THREE.Vector3(sx * .09, -.04, 0)); attach(head, e, p); });
  // necklace
  const nk = rig.pos('Neck', new THREE.Vector3()); nk.y -= .06; const nq = new THREE.Quaternion().setFromAxisAngle(X, Math.PI / 2 - .8); G.neck.scale.set(1.5, 1.5, 1.5); attach(rig.bones.Neck, G.neck, nk.add(new THREE.Vector3(0, 0, .02)), nq);
  // bangles on both forearms
  for (const { b, side, i } of G.bangles) {
    const fa = rig.pos(side + 'ForeArm', new THREE.Vector3()), hd = rig.pos(side + 'Hand', new THREE.Vector3());
    const dir = hd.clone().sub(fa).normalize(); const p = hd.clone().addScaledVector(dir, -.03 - i * .0085);
    attach(rig.bones[side + 'ForeArm'], b, p, new THREE.Quaternion().setFromUnitVectors(Z, dir));
  }
  // loose, long, wavy hair (like the photo): a sheet down the back + heavy locks over both shoulders
  const hairM = new THREE.MeshPhysicalMaterial({ color: 0x0d0708, roughness: .42, metalness: .08, sheen: 1, sheenRoughness: .4, sheenColor: new THREE.Color(0x7a6a8a) });
  head.updateWorldMatrix(true, false); const hs = head.getWorldScale(new THREE.Vector3()).x;
  const hg = new THREE.Group(); { const bq = head.getWorldQuaternion(new THREE.Quaternion()).invert(); hg.quaternion.copy(bq); hg.scale.setScalar(1 / hs); hg.position.copy(head.worldToLocal(new THREE.Vector3())); head.add(hg); }
  const R = (bb.max.x - bb.min.x) * .5, topY = c.y + R * .15;
  const lock = (start, drift, len, rad, waves, amp, ph) => {
    const pts = []; const N = 9;
    for (let i = 0; i <= N; i++) { const k = i / N, w = Math.sin(k * Math.PI * 2 * waves + ph) * amp * (.3 + k);
      pts.push(new THREE.Vector3(start.x + drift.x * Math.pow(k, .8) + w, start.y - len * k, start.z + drift.z * Math.pow(k, .8) + Math.cos(k * Math.PI * 2 * waves + ph) * amp * .5 * k)); }
    const cur = new THREE.CatmullRomCurve3(pts), tg = new THREE.TubeGeometry(cur, 36, rad, 8, false), p = tg.attributes.position, n = p.count, ring = 9;
    for (let i = 0; i < n; i++) { const k = Math.min(1, Math.floor(i / ring) / 36), cc = cur.getPoint(k), f = 1 - k * .55; p.setXYZ(i, cc.x + (p.getX(i) - cc.x) * f, cc.y + (p.getY(i) - cc.y) * f, cc.z + (p.getZ(i) - cc.z) * f); }
    tg.computeVertexNormals(); const m = new THREE.Mesh(tg, hairM); m.castShadow = true; m.frustumCulled = false; hg.add(m);
  };
  // back sheet
  for (let i = 0; i < 15; i++) { const a = -1.3 + i * (2.6 / 14), sx = Math.sin(a), bz = -Math.cos(a);
    lock(new THREE.Vector3(c.x + sx * R * 1.02, topY - Math.abs(sx) * R * .1, c.z + bz * R * .95 - .004), new THREE.Vector3(sx * .05, 0, -.045 - Math.abs(sx) * .03), .5 + Math.cos(a) * .22 - Math.abs(sx) * .12, .03, 1.5 + (i % 3) * .4, .006 + (i % 2) * .004, i * 1.3); }
  // front locks over the shoulders
  for (const sx of [-1, 1]) for (let j = 0; j < 5; j++) {
    lock(new THREE.Vector3(c.x + sx * (R * 1.02 + j * .004), topY - .015 - j * .012, c.z + R * (.05 - j * .05)), new THREE.Vector3(sx * (.075 + j * .012), 0, .055 + j * .012), .36 + j * .035, .026 - j * .002, 1.6 + j * .25, .007, j * 1.7 + (sx > 0 ? 0 : 2)); }
  G.braid = hg;
  // oversized thin-frame glasses
  { const eyes = []; root.traverse(o => { if (o.name === 'EyeLeft' || o.name === 'EyeRight') eyes.push(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())); });
    if (eyes.length === 2) {
      const d = Math.abs(eyes[0].x - eyes[1].x), ey = (eyes[0].y + eyes[1].y) / 2, w = d * .92, h = d * .8;
      const fz = Math.max(hit(new THREE.Vector3(eyes[0].x, eyes[0].y, c.z + 1), new THREE.Vector3(0, 0, -1))?.point.z ?? 0, hit(new THREE.Vector3(eyes[1].x, eyes[1].y, c.z + 1), new THREE.Vector3(0, 0, -1))?.point.z ?? 0, hit(new THREE.Vector3(c.x, ey, c.z + 1), new THREE.Vector3(0, 0, -1))?.point.z ?? 0);
      const gl = new THREE.Group(), fm = new THREE.MeshStandardMaterial({ color: 0xe6c8a2, metalness: 1, roughness: .22, envMapIntensity: 1.6 }), lm = new THREE.MeshPhysicalMaterial({ color: 0xdfe8f0, roughness: .05, metalness: 0, transparent: true, opacity: .16, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
      const outline = (cx0) => { const pts = []; for (let i = 0; i < 56; i++) { const a = i / 56 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), e = 2 / 3.4; pts.push(new THREE.Vector3(cx0 + w / 2 * Math.sign(ca) * Math.pow(Math.abs(ca), e) * (ca > 0 ? .98 : 1), h / 2 * Math.sign(sa) * Math.pow(Math.abs(sa), e) - (sa < 0 ? h * .02 : 0), 0)); } return pts; };
      for (const sx of [-1, 1]) { const pts = outline(sx * d / 2), cur = new THREE.CatmullRomCurve3(pts, true); gl.add(new THREE.Mesh(new THREE.TubeGeometry(cur, 80, .0016, 6, true), fm));
        const sh = new THREE.Shape(pts.map(v => new THREE.Vector2(v.x, v.y))); gl.add(new THREE.Mesh(new THREE.ShapeGeometry(sh, 8), lm));
        const t = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * (d / 2 + w / 2), h * .28, 0), new THREE.Vector3(sx * (d / 2 + w / 2 + .004), h * .28, -.04), new THREE.Vector3(sx * (R * 1.04), h * .25, -.11), new THREE.Vector3(sx * (R * 1.03), h * .1, -.15)]); gl.add(new THREE.Mesh(new THREE.TubeGeometry(t, 14, .0016, 5, false), fm)); }
      gl.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-d / 2 + w / 2, h * .2, 0), new THREE.Vector3(0, h * .3, .006), new THREE.Vector3(d / 2 - w / 2, h * .2, 0)]), 10, .0017, 5, false), fm));
      gl.traverse(o => { o.castShadow = false; o.frustumCulled = false; });
      attach(head, gl, new THREE.Vector3(c.x, ey - .002, fz + .016), new THREE.Quaternion());
    } }
  // dupatta sash: left shoulder -> across the chest -> right hip
  { const tm = topMesh(G), g0 = G.group.getWorldPosition(new THREE.Vector3()), cx = g0.x; tm.updateWorldMatrix(true, false);
    const sh = rig.pos('LeftArm', new THREE.Vector3()), y0 = sh.y + .02;
    const P = (x, y, o = .02) => new THREE.Vector3(cx + x, y, surfaceZ(tm, cx + x, y) + o);
    const pts = [new THREE.Vector3(cx + .13, y0 + .02, surfaceZ(tm, cx + .13, y0 - .06) - .02), P(.1, y0 - .1), P(.0, y0 - .24), P(-.1, y0 - .4), P(-.19, y0 - .56), P(-.215, y0 - .75, .03)];
    const m = new THREE.Mesh(ribbon(pts, .15, new THREE.Vector3(0, 0, 1), 34), new THREE.MeshPhysicalMaterial({ map: stoleTex('#c81e58', '#f1c25a', '#f1c25a'), roughness: .5, sheen: 1, sheenColor: new THREE.Color(0xff8fb0), side: THREE.DoubleSide })); bindWorld(rig.bones.Spine2, m); }
}


function stoleTex(base, border, motif) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 512);
  for (let y = 0; y < 512; y += 4) { g.fillStyle = `rgba(0,0,0,${.05 + Math.random() * .05})`; g.fillRect(0, y, 128, 1); }
  g.fillStyle = border; g.fillRect(0, 0, 10, 512); g.fillRect(118, 0, 10, 512); g.fillRect(14, 0, 2, 512); g.fillRect(112, 0, 2, 512);
  g.fillStyle = motif; for (let y = 20; y < 480; y += 44) { g.beginPath(); g.moveTo(64, y); g.lineTo(78, y + 12); g.lineTo(64, y + 24); g.lineTo(50, y + 12); g.closePath(); g.fill(); }
  g.fillStyle = border; g.fillRect(0, 488, 128, 24); g.fillStyle = base; for (let x = 6; x < 128; x += 12) g.fillRect(x, 496, 4, 16);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function bindWorld(bone, mesh) {
  bone.updateWorldMatrix(true, false);
  const s = bone.getWorldScale(new THREE.Vector3()).x;
  mesh.quaternion.copy(bone.getWorldQuaternion(new THREE.Quaternion()).invert()); mesh.scale.setScalar(1 / s); mesh.position.copy(bone.worldToLocal(new THREE.Vector3()));
  bone.add(mesh); mesh.frustumCulled = false; mesh.castShadow = true;
}
// flat cloth strip following a world-space curve; `out` = outward normal hint
function ribbon(pts, width, out, segs = 28) {
  const cur = new THREE.CatmullRomCurve3(pts), pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const k = i / segs, p = cur.getPoint(k), tg = cur.getTangent(k), side = new THREE.Vector3().crossVectors(tg, out).normalize();
    for (const sd of [-1, 1]) { const q = p.clone().addScaledVector(side, sd * width * .5); pos.push(q.x, q.y, q.z); uv.push(sd < 0 ? 0 : 1, 1 - k); }
    if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function surfaceZ(mesh, x, y, zFrom = 2) { const rc = new THREE.Raycaster(new THREE.Vector3(x, y, zFrom), new THREE.Vector3(0, 0, -1)); const h = rc.intersectObject(mesh, false)[0]; return h ? h.point.z : 0; }
function topMesh(av) { let m; av.root.traverse(o => { if (o.name === 'Wolf3D_Outfit_Top') m = o; }); return m; }

function decorateBoy(B) {
  const rig = B.rig, root = B.root, tm = topMesh(B); tm.updateWorldMatrix(true, false);
  const g0 = B.group.getWorldPosition(new THREE.Vector3()), cx = g0.x, cz = g0.z;
  const neck = rig.pos('Neck', new THREE.Vector3()), sp2 = rig.pos('Spine2', new THREE.Vector3());
  const mat = new THREE.MeshPhysicalMaterial({ map: stoleTex('#8c1a22', '#e9b64a', '#e9b64a'), roughness: .55, sheen: 1, sheenColor: new THREE.Color(0xff6a60), side: THREE.DoubleSide });
  const yTop = neck.y - .01;
  for (const sx of [-1, 1]) {
    const x0 = cx + sx * .075, pts = [], N = 7;
    for (let i = 0; i <= N; i++) { const k = i / N, y = yTop - k * .66; const zz = surfaceZ(tm, x0 + sx * k * .015, y) + .014 + k * .004; pts.push(new THREE.Vector3(x0 + sx * (.01 + k * .025), y, zz)); }
    const m = new THREE.Mesh(ribbon(pts, .115, new THREE.Vector3(0, 0, 1)), mat); bindWorld(rig.bones.Spine2, m);
  }
  // thin silver chain (from the photo)
  { const pts = []; for (let i = 0; i <= 12; i++) { const k = i / 12, x = cx + (k - .5) * .15, y = neck.y - .03 - .085 * (1 - Math.pow((k - .5) * 2, 2)) * 1; pts.push(new THREE.Vector3(x, y, surfaceZ(tm, x, y) + .012)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, .0022, 6, false), new THREE.MeshStandardMaterial({ color: 0xdfe3ea, metalness: 1, roughness: .22, envMapIntensity: 1.5 })); bindWorld(rig.bones.Spine2, m); }
  // swept-up textured quiff, built from individual tapered locks (like the photo)
  { let headMesh; root.traverse(o => { if (o.name === 'Wolf3D_Head') headMesh = o; });
    const head = rig.bones.Head; root.updateMatrixWorld(true); head.updateWorldMatrix(true, false);
    const ray = new THREE.Raycaster(), bb = new THREE.Box3().setFromObject(headMesh), c = bb.getCenter(new THREE.Vector3()), R = (bb.max.x - bb.min.x) * .5;
    const surf = (x, z) => { ray.set(new THREE.Vector3(x, bb.max.y + .3, z), new THREE.Vector3(0, -1, 0)); const h = ray.intersectObject(headMesh, false)[0]; return h ? h.point.y : bb.max.y - .02; };
    const hs = head.getWorldScale(new THREE.Vector3()).x;
    const hg = new THREE.Group(); { const bq = head.getWorldQuaternion(new THREE.Quaternion()).invert(); hg.quaternion.copy(bq); hg.scale.setScalar(1 / hs); hg.position.copy(head.worldToLocal(new THREE.Vector3())); head.add(hg); }
    const hm = new THREE.MeshPhysicalMaterial({ color: 0x0e0a08, roughness: .5, metalness: .03, sheen: .8, sheenRoughness: .4, sheenColor: new THREE.Color(0x6a625c) });
    const rnd = (() => { let s0 = 11; return () => (s0 = (s0 * 16807) % 2147483647) / 2147483647; })();
    let eyeY = c.y + R * .1; { const eb = new THREE.Box3(); root.traverse(o => { if (o.name === 'EyeLeft') eb.setFromObject(o); }); if (!eb.isEmpty()) eyeY = eb.getCenter(new THREE.Vector3()).y; }
    const rayV = (x, z) => { ray.set(new THREE.Vector3(x, bb.max.y + .3, z), new THREE.Vector3(0, -1, 0)); const h = ray.intersectObject(headMesh, false)[0]; return h ? h.point.y : bb.max.y - .02; };
    const rayZ = (x, y) => { ray.set(new THREE.Vector3(x, y, c.z + R * 2), new THREE.Vector3(0, 0, -1)); const h = ray.intersectObject(headMesh, false)[0]; return h ? h.point.z : c.z + R * .8; };
    const quiffLock = (u, up, len, rad) => {
      // u in [-1,1] across the forehead; starts at the hairline, rises, arcs back over the crown and hugs the skull
      const x0 = c.x + u * R * .62, hy = eyeY + R * (.7 - .2 * u * u), z0 = rayZ(x0, hy) - .004;
      const xr = f => c.x + (x0 - c.x) * f, zA = c.z + R * .38, zB = c.z - R * .08, zC = c.z - R * (.38 + len * .25), sw = .012 * u;
      const P = [
        new THREE.Vector3(x0, hy, z0),
        new THREE.Vector3(x0 + sw * .3, hy + .026 + up * .01, z0 + .014),
        new THREE.Vector3(xr(.92) + sw, rayV(xr(.92), zA) + .02 + up * .026, zA),
        new THREE.Vector3(xr(.8) + sw * 1.5, rayV(xr(.8), zB) + .016 + up * .014, zB),
        new THREE.Vector3(xr(.6) + sw * 2, rayV(xr(.6), zC) + .006, zC),
      ];
      const cur = new THREE.CatmullRomCurve3(P), seg = 26, tg = new THREE.TubeGeometry(cur, seg, rad, 6, false), p = tg.attributes.position, ring = 7;
      for (let i = 0; i < p.count; i++) { const k = Math.min(1, Math.floor(i / ring) / seg), cc = cur.getPoint(k), f = .8 + .3 * Math.sin(Math.min(1, k * 3) * Math.PI / 2) - Math.max(0, k - .5) * 1.1; p.setXYZ(i, cc.x + (p.getX(i) - cc.x) * f, cc.y + (p.getY(i) - cc.y) * f * .85, cc.z + (p.getZ(i) - cc.z) * f); }
      tg.computeVertexNormals(); const m = new THREE.Mesh(tg, hm); m.castShadow = true; m.frustumCulled = false; hg.add(m);
    };
    for (let i = 0; i < 46; i++) { const u = (i / 45) * 2 - 1 + (rnd() - .5) * .04, e = 1 - Math.abs(u); quiffLock(u, .25 + e * .75 + rnd() * .3, rnd(), .0062 + e * .0025 + rnd() * .0018); }
    B.quiff = hg;
  }
  // gold buttons
  const gm = GOLDM();
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.011, 10, 8), gm); const y = neck.y - .16 - i * .11; b.position.set(cx, y, surfaceZ(tm, cx, y) + .006); const w = new THREE.Group(); w.add(b); bindWorld(rig.bones.Spine2, w); }
}
const GOLDM = () => new THREE.MeshStandardMaterial({ color: 0xf0b445, metalness: 1, roughness: .28 });
