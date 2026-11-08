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
const SHELLS = 16;
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
  const fur = furMat(0xa09283, 0xf1e8dc, .019, 640), furW = furMat(0xb9ab9c, 0xfffaf2, .026, 560);
  const IN = 0xb3a595;
  b.add(furPart(.115, .105, .19, [0, .125, 0], null, fur, IN));
  for (const sx of [-1, 1]) {
    b.add(furPart(.07, .09, .11, [sx * .085, .1, -.075], [0, 0, 0], fur, IN));
    b.add(furPart(.026, .05, .026, [sx * .05, .045, .12], [.15, 0, 0], fur, IN, false));
    b.add(furPart(.032, .018, .075, [sx * .08, .02, -.06], null, fur, IN, false));
  }
  b.add(furPart(.045, .045, .045, [0, .13, -.205], null, furW, 0xe0d6ca));
  const head = new THREE.Group(); head.position.set(0, .2, .16); b.add(head);
  head.add(furPart(.075, .072, .098, [0, .015, .03], null, fur, IN));
  head.add(furPart(.06, .045, .05, [0, -.012, .098], null, furW, 0xd2c6b8, false));
  const pink = new THREE.MeshStandardMaterial({ color: 0xd9908f, roughness: .6, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(sx * .035, .075, -.015); ear.rotation.set(-.12, 0, -sx * .22);
    ear.add(furPart(.025, .092, .011, [0, .085, 0], null, fur, IN));
    const inn = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), pink); inn.scale.set(.016, .075, .004); inn.position.set(0, .085, .011); ear.add(inn);
    head.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.017, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x050303, roughness: .05, clearcoat: 1, envMapIntensity: 2 })); eye.position.set(sx * .056, .036, .104); head.add(eye);
    for (let w = 0; w < 3; w++) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.0008, .0003, .09, 4), new THREE.MeshBasicMaterial({ color: 0xf2eee8 })); wh.rotation.set(0, 0, Math.PI / 2 + sx * (w - 1) * .22); wh.position.set(sx * .085, -.012 + (w - 1) * .008, .13); head.add(wh); }
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.011, 12, 10), new THREE.MeshStandardMaterial({ color: 0xd98a96, roughness: .5 })); nose.position.set(0, -.002, .152); nose.scale.set(1.2, .9, .8); head.add(nose);
  g.userData = { b, head };
  g.traverse(o => { if (o.isMesh && !o.material.isShaderMaterial) o.castShadow = o.castShadow; });
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
    this.girl = { userData: {} };
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
      aim(G, 'LeftArm', 'LeftForeArm', nv(.22, -.96, -s * .25 * wk)); aim(G, 'LeftForeArm', 'LeftHand', nv(.2, -.9, .3 + s * .1 * wk));
      // girl skirt / dupatta
      G.skirt.position.y = bob; G.skirt.rotation.z = Math.sin(ph) * .035 * wk; G.skirt.rotation.x = Math.cos(ph * 2) * .02 * wk; G.skirt.scale.setScalar(1 + Math.sin(t * 1.4) * .004);
      // sparkler stick follows the hand
      const hp = B.rig.pos('RightHand', _a); this.group.worldToLocal(hp);
      B.group.worldToLocal(_b.copy(hp)); // hp is in couple space; convert via world instead
      const hw = B.rig.pos('RightHand', new THREE.Vector3()), fw = B.rig.pos('RightHandMiddle1', new THREE.Vector3());
      const dirW = fw.clone().sub(hw).normalize();
      const tip = hw.clone().addScaledVector(dirW, .3);
      B.anchor.position.copy(B.group.worldToLocal(tip.clone())); B.stick.position.copy(B.group.worldToLocal(hw.clone().addScaledVector(dirW, .15)));
      B.stick.quaternion.copy(B.group.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(new THREE.Quaternion().setFromUnitVectors(Y, dirW)));
      B.stick.visible = sp > .05;
    }
    // bunny
    const bn = this.bunny.userData, hop = this.walking ? Math.abs(Math.sin(this.phase * .9)) * .16 : Math.max(0, Math.sin(t * 2.2)) * .04;
    bn.b.position.y = hop; bn.head.rotation.x = Math.sin(t * 2.2) * .08;
  }
  setSparkler(v) { this.sparkler = v; }
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
  // long braid on the back of the head
  const braidM = new THREE.MeshStandardMaterial({ color: 0x0f0809, roughness: .4, metalness: .1 });
  const top = new THREE.Vector3(c.x, bb.max.y - .09, c.z - .075);
  const cur = new THREE.CatmullRomCurve3([top, top.clone().add(new THREE.Vector3(0, -.12, -.06)), top.clone().add(new THREE.Vector3(0, -.3, -.07)), top.clone().add(new THREE.Vector3(0, -.55, -.06)), top.clone().add(new THREE.Vector3(0, -.8, -.055))]);
  const tg = new THREE.TubeGeometry(cur, 40, .04, 12, false);
  { const p = tg.attributes.position; const n = tg.attributes.position.count; for (let i = 0; i < n; i++) { const k = Math.floor(i / 13) / 40; /* taper */ const cc = cur.getPoint(Math.min(k, 1)); const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).sub(cc); const f = (1 - k * .6) * (1 + Math.sin(k * 80) * .08); p.setXYZ(i, cc.x + v.x * f, cc.y + v.y * f, cc.z + v.z * f); } tg.computeVertexNormals(); }
  const braid = new THREE.Mesh(tg, braidM); braid.castShadow = true; braid.frustumCulled = false;
  head.updateWorldMatrix(true, false); const hs = head.getWorldScale(new THREE.Vector3()).x;
  const bq = head.getWorldQuaternion(new THREE.Quaternion()).invert(); braid.quaternion.copy(bq); braid.scale.setScalar(1 / hs); braid.position.copy(head.worldToLocal(new THREE.Vector3())); head.add(braid);
  G.braid = braid;
  // dupatta sash: left shoulder -> across the chest -> right hip
  { const tm = topMesh(G), g0 = G.group.getWorldPosition(new THREE.Vector3()), cx = g0.x; tm.updateWorldMatrix(true, false);
    const sh = rig.pos('LeftArm', new THREE.Vector3()), y0 = sh.y + .02;
    const P = (x, y, o = .02) => new THREE.Vector3(cx + x, y, surfaceZ(tm, cx + x, y) + o);
    const pts = [new THREE.Vector3(cx + .13, y0 + .02, surfaceZ(tm, cx + .13, y0 - .06) - .02), P(.1, y0 - .1), P(.0, y0 - .24), P(-.1, y0 - .4), P(-.19, y0 - .56), P(-.215, y0 - .75, .03)];
    const m = new THREE.Mesh(ribbon(pts, .15, new THREE.Vector3(0, 0, 1), 34), new THREE.MeshPhysicalMaterial({ map: stoleTex('#c81e58', '#f1c25a', '#f1c25a'), roughness: .5, sheen: 1, sheenColor: new THREE.Color(0xff8fb0), side: THREE.DoubleSide })); bindWorld(rig.bones.Spine2, m); }
  // gajra (jasmine garland) on the braid start
  for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(.013, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: .6, emissive: 0x332a20 })); const a = -1.2 + i * .3; f.scale.multiplyScalar(1 / hs); f.position.copy(head.worldToLocal(new THREE.Vector3(c.x + Math.sin(a) * .105, c.y + .085 + Math.cos(a) * .02, c.z - .06 - Math.cos(a) * .035))); head.add(f); }
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
  // gold buttons
  const gm = GOLDM();
  for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.011, 10, 8), gm); const y = neck.y - .16 - i * .11; b.position.set(cx, y, surfaceZ(tm, cx, y) + .006); const w = new THREE.Group(); w.add(b); bindWorld(rig.bones.Spine2, w); }
}
const GOLDM = () => new THREE.MeshStandardMaterial({ color: 0xf0b445, metalness: 1, roughness: .28 });
