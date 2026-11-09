import * as THREE from 'three';
import { Batch, Beads, rand, lerp } from './util.js';
import * as T from './textures.js';
import { flameMaterial, flameUni } from './fx.js';

const UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);
export const SH = 5; // street half width

// soft round glow that lights the air / ground around a lit diya (billboard, additive)
function haloMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: flameUni,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; mat4 im=instanceMatrix; vec3 c=im[3].xyz; float sx=length(im[0].xyz);
      vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]); vec3 up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
      vec3 wp=(modelMatrix*vec4(c,1.)).xyz+(right*position.x+up*position.y)*sx; gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uT; void main(){ float r=length(vUv-.5)*2.; float a=pow(clamp(1.-r,0.,1.),2.6)*(.34+.04*sin(uT*11.+r*3.));
      gl_FragColor=vec4(vec3(1.7,.75,.22)*a,a); }`,
  });
}
// a proper clay diya: turned terracotta bowl with a thick rim, oil, a wick and a small flame
class Diyas {
  constructor() { this.items = []; }
  add(x, y, z, s = 1, lit = true) {
    this.items.push({ x, y, z, s, target: lit ? 1 : 0, cur: lit ? 1 : 0, ph: Math.random() * 6 });
    return this.items.length - 1;
  }
  light(id, on = true) { this.items[id].target = on ? 1 : 0; }
  finalize(parent) {
    const n = this.items.length;
    const prof = [[0, 0], [.04, 0], [.05, .006], [.072, .018], [.09, .038], [.1, .06], [.098, .07], [.09, .072], [.086, .066], [.078, .05], [.06, .038], [.03, .034], [0, .033]].map(([r, y]) => new THREE.Vector2(r, y));
    const bowlGeo = new THREE.LatheGeometry(prof, 22); bowlGeo.computeVertexNormals();
    const clay = new THREE.MeshStandardMaterial({ color: 0xb4532a, roughness: .78, metalness: 0, side: THREE.DoubleSide, emissive: 0x2a0c04, emissiveIntensity: .35 });
    this.bowls = new THREE.InstancedMesh(bowlGeo, clay, n);
    const oilGeo = new THREE.CircleGeometry(.07, 18); oilGeo.rotateX(-Math.PI / 2);
    this.oil = new THREE.InstancedMesh(oilGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, .95, .32), toneMapped: false }), n); this.oil.renderOrder = 2;
    const wickGeo = new THREE.CylinderGeometry(.006, .009, .045, 6); wickGeo.translate(0, .05, 0);
    this.wicks = new THREE.InstancedMesh(wickGeo, new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 1 }), n);
    this.flames = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), flameMaterial(), n); this.flames.renderOrder = 5;
    this.halos = new THREE.InstancedMesh(new THREE.PlaneGeometry(2, 2), haloMaterial(), n); this.halos.renderOrder = 4;
    for (const m of [this.bowls, this.oil, this.wicks, this.flames, this.halos]) m.frustumCulled = false;
    this.m = new THREE.Matrix4();
    this.items.forEach((it, i) => { this.m.makeScale(it.s, it.s, it.s).setPosition(it.x, it.y, it.z); this.bowls.setMatrixAt(i, this.m); this.wicks.setMatrixAt(i, this.m); });
    this.bowls.castShadow = false;
    parent.add(this.bowls, this.oil, this.wicks, this.halos, this.flames);
  }
  update(t, dt) {
    const m = this.m, k = Math.min(1, dt * 2.5); flameUni.uT.value = t;
    this.items.forEach((it, i) => {
      it.cur += (it.target - it.cur) * k;
      const f = 1 + .16 * Math.sin(t * 13 + it.ph) + .1 * Math.sin(t * 23 + it.ph * 2);
      const sc = it.s * Math.max(0.0001, it.cur);
      m.makeScale(sc * .052, sc * .125 * f, 1).setPosition(it.x, it.y + .08 * it.s, it.z); this.flames.setMatrixAt(i, m);
      m.makeScale(it.s * Math.max(0.0001, it.cur), it.s * Math.max(0.0001, it.cur), it.s * Math.max(0.0001, it.cur)).setPosition(it.x, it.y + .0006, it.z); this.oil.setMatrixAt(i, m);
      m.makeScale(sc * .62, sc * .62, 1).setPosition(it.x, it.y + .13 * it.s, it.z); this.halos.setMatrixAt(i, m);
    });
    this.flames.instanceMatrix.needsUpdate = true; this.oil.instanceMatrix.needsUpdate = true; this.halos.instanceMatrix.needsUpdate = true;
  }
}

function starGeo(outer = .5, inner = .16, depth = .1) {
  const s = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? inner : outer;
    const x = Math.cos(a) * r, y = Math.sin(a) * r * (i % 4 === 0 ? 1.45 : 1);
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2); return g;
}

export function buildWorld(scene) {
  const world = { stars: [], flickerLights: [], update: null };
  const cs = T.cobbleSet(), ps = T.plasterSet();
  const tex = { cobble: cs.map, plaster: ps.map, win: T.windowTex(), door: T.doorTex(), rangoli: T.rangoliTex() };
  const std = o => new THREE.MeshStandardMaterial(o);
  const glowC = (r, g, b, map) => new THREE.MeshBasicMaterial(map ? { color: new THREE.Color(r, g, b), map } : { color: new THREE.Color(r, g, b) });
  const mat = {
    trim: std({ color: 0xe9dcc6, roughness: .9, map: tex.plaster, bumpMap: ps.bump, bumpScale: 2 }),
    trimD: std({ color: 0x8a3b32, roughness: .85 }),
    dark: std({ color: 0x24101c, roughness: .9 }),
    gold: std({ color: 0xf5b942, metalness: .75, roughness: .32, emissive: 0x3a2400 }),
    stone: std({ color: 0xc9ae8e, roughness: .95, map: tex.plaster, bumpMap: ps.bump, bumpScale: 2 }),
    white: std({ color: 0xe9ddca, roughness: .9, map: tex.plaster, bumpMap: ps.bump, bumpScale: 2 }),
    saffron: std({ color: 0xc8672f, roughness: .85, map: tex.plaster, bumpMap: ps.bump, bumpScale: 2 }),
    saffron2: std({ color: 0xd9902f, roughness: .85, map: tex.plaster, bumpMap: ps.bump, bumpScale: 2 }),
    wood: std({ color: 0x5a1c14, roughness: .6 }),
    door: std({ map: tex.door, roughness: .55 }),
    glowOn: glowC(1.5, 1.25, .9, tex.win),
    glowDim: glowC(.55, .38, .28, tex.win),
    shop: glowC(1.5, 1.0, .5),
    niche: glowC(1.9, 1.15, .45),
    star: glowC(2.4, 1.8, .6),
    starHang: glowC(2.4, 1.8, .6),
  };
  const solid = new Batch(), glow = new Batch();
  const GB = new THREE.BoxGeometry(1, 1, 1), GP = new THREE.PlaneGeometry(1, 1);
  const GCyl = new THREE.CylinderGeometry(1, 1, 1, 16), GHalf = new THREE.CircleGeometry(1, 24, 0, Math.PI);
  const GSph = new THREE.SphereGeometry(1, 14, 10);

  const marigold = new Beads(new THREE.IcosahedronGeometry(1, 1), std({ roughness: .8 }), 6000);
  const bulbs = new Beads(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial(), 1400);
  const mcol = [0xff8a00, 0xffb300, 0xff5a00, 0xffd23f, 0xe8590c].map(c => new THREE.Color(c));
  const mc = i => mcol[Math.abs(i * 7 + (i >> 2)) % mcol.length];
  const bulbCols = [new THREE.Color(2.2, 1.6, .6), new THREE.Color(2.2, .7, 1.2), new THREE.Color(2.2, 1.1, .3), new THREE.Color(1.2, 1.9, 2.3)];
  const marigoldX = new Beads(new THREE.IcosahedronGeometry(1, 1), std({ roughness: .8 }), 600);
  const bulbsX = new Beads(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial(), 600);
  const diyas = new Diyas(); world.diyas = diyas;
  const swagM = (a, b, sag = .5, n = 16, s = .11) => marigold.swag(a, b, sag, n, s, mc);
  const strand = (a, b, sag, n, ci = 0, B = bulbs) => B.swag(a, b, sag, n, .075, i => bulbCols[(i + ci) % 2 === 0 ? 0 : (ci % 3) + 1].clone());

  // ---------------------------------------------------------------- buildings
  const wallCols = [0xc27a68, 0xb88a54, 0xcfa79c, 0x7fa39d, 0xd8c8a6, 0x8c9ab8, 0xb2573f];
  const signs = [['MITHAI GHAR', '#6b1030'], ['DIYA WALA', '#143a6b'], ['RANGOLI STORE', '#1d5b4a'], ['GIFT SHOP', '#5b1d6b'], ['SWEETS', '#7a2a10'], ['FLOWER MART', '#7a1d44']];
  const buildings = [];

  function building(o) {
    const { w, d, h, floors, color } = o, fh = h / floors, Rn = rand(o.seed);
    const B = new THREE.Matrix4().compose(new THREE.Vector3(o.px, 0, o.pz), new THREE.Quaternion().setFromAxisAngle(UP, o.ry), ONE);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const add = (geo, mt, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
      e.set(rx, ry, rz); q.setFromEuler(e); m.compose(p.set(x, y, z), q, s.set(sx, sy, sz)); m.premultiply(B);
      (mt.isMeshBasicMaterial ? glow : solid).add(geo, mt, m);
    };
    const W = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(B);
    const wallM = new THREE.MeshStandardMaterial({ color, roughness: .9, map: tex.plaster, bumpMap: ps.bump, bumpScale: 2.5 });
    wallM.userData.k = color;
    if (!building.cache) building.cache = new Map();
    const wm = building.cache.get(color) || (building.cache.set(color, wallM), wallM);

    add(GB, wm, 0, h / 2, 0, w, h, d);
    add(GB, mat.trimD, 0, .3, 0, w + .14, .6, d + .14);
    for (let f = 1; f < floors; f++) add(GB, mat.trim, 0, f * fh, 0, w + .16, .16, d + .16);
    add(GB, mat.trim, 0, h + .12, 0, w + .4, .28, d + .4);
    const nm = Math.floor(w / .85);
    for (let i = 0; i < nm; i++) add(GB, mat.trim, -w / 2 + .4 + i * ((w - .8) / (nm - 1)), h + .5, d / 2 + .12, .42, .5, .22);

    // windows
    const nw = Math.max(2, Math.round(w / 2.3)), sp = w / nw;
    for (let f = 1; f < floors; f++) {
      for (let i = 0; i < nw; i++) {
        const x = -w / 2 + sp * (i + .5), y = f * fh + fh * .5 + .15;
        add(GB, mat.trim, x, y, d / 2 + .05, 1.18, 1.72, .14);
        add(GP, Rn() < .86 ? mat.glowOn : mat.glowDim, x, y, d / 2 + .13, .94, 1.46, 1);
        add(GB, mat.trim, x, y + 1.0, d / 2 + .28, 1.5, .1, .6, .28);
        add(GB, mat.trimD, x, y - .93, d / 2 + .2, 1.4, .1, .42);
        if (Rn() < .35) {
          add(GB, mat.trim, x, y - 1.05, d / 2 + .55, 1.9, .14, 1.1);
          add(GB, mat.dark, x, y - .45, d / 2 + 1.07, 1.9, .07, .06);
          for (let k = 0; k < 8; k++) add(GB, mat.dark, x - .85 + k * .243, y - .75, d / 2 + 1.07, .05, .55, .05);
          add(GB, mat.dark, x - .93, y - .75, d / 2 + .6, .05, .55, .05); add(GB, mat.dark, x + .93, y - .75, d / 2 + .6, .05, .55, .05);
          const a = W(x - .95, y - .95, d / 2 + 1.05), b = W(x + .95, y - .95, d / 2 + 1.05);
          swagM(a, b, .25, 9, .09);
        }
      }
      // marigold swags below each band
      const y0 = f * fh - .5;
      for (let k = 0; k < 3; k++) swagM(W(-w / 2 + k * w / 3 + .1, y0, d / 2 + .22), W(-w / 2 + (k + 1) * w / 3 - .1, y0, d / 2 + .22), .55, 14, .1);
    }

    // ground floor: door + optional shop
    const doorX = o.grandDoor ? 0 : (o.shop ? w * .24 : 0);
    if (o.grandDoor) {
      add(GB, mat.stone, 0, 2.25, d / 2 + .08, 3.6, 4.5, .22);
      add(GHalf, mat.stone, 0, 4.5, d / 2 + .19, 1.8, 1.4, 1);
      add(GB, mat.door, 0, 1.85, d / 2 + .22, 2.6, 3.7, .12);
      add(GHalf, mat.door, 0, 3.7, d / 2 + .285, 1.3, 1.05, 1);
      for (const sx of [-1, 1]) {
        add(GCyl, mat.gold, sx * .62, 1.6, d / 2 + .35, .24, .06, .24, Math.PI / 2);
        add(GSph, mat.gold, sx * .62, 1.6, d / 2 + .39, .09, .09, .09);
      }
      add(GB, mat.stone, 0, .45, d / 2 + .62, 4.4, .9, 1.0);          // ledge
      add(GB, mat.trim, 0, .95, d / 2 + .62, 4.6, .12, 1.12);
      add(GB, mat.stone, 0, .12, d / 2 + 1.4, 3.6, .24, .7);          // step
      // toran
      for (let i = -9; i <= 9; i++) { const L = 3 + (i % 2 ? 1 : 2) + (9 - Math.abs(i)) % 3; for (let j = 0; j < L; j++) marigold.add(...W(i * .15, 4.3 - j * .15, d / 2 + .38).toArray(), .09, mc(i + j)); }
      const doorW = W(0, 0, d / 2 + .2);
      world.door = { pos: W(0, 1.5, d / 2 + .3), out: W(0, 1.2, d / 2 + 4), ledge: [W(-1.2, 1.012, d / 2 + .62), W(1.2, 1.012, d / 2 + .62)], normal: W(0, 0, 1).sub(new THREE.Vector3(o.px, 0, o.pz)).normalize() };
      // diyas on ledge (unlit)
      world.door.diyaIds = [diyas.add(...world.door.ledge[0].toArray(), 1.15, false), diyas.add(...world.door.ledge[1].toArray(), 1.15, false)];
      for (let k = -2; k <= 2; k++) if (k) world.door.diyaIds.push(diyas.add(...W(k * .75 + (k > 0 ? 1 : -1) * .1, 1.012, d / 2 + .62).toArray(), .95, false));
    } else {
      add(GB, mat.trim, doorX, 1.4, d / 2 + .06, 1.9, 2.8, .14);
      add(GHalf, mat.trim, doorX, 2.8, d / 2 + .06, .95, .95, 1);
      add(GB, mat.door, doorX, 1.3, d / 2 + .14, 1.5, 2.6, .1);
      add(GHalf, mat.door, doorX, 2.6, d / 2 + .2, .75, .75, 1);
      add(GSph, mat.gold, doorX + .45, 1.2, d / 2 + .24, .06, .06, .06);
      for (let i = -6; i <= 6; i++) { const L = 2 + (i % 2 ? 1 : 0) + (6 - Math.abs(i)) % 2; for (let j = 0; j < L; j++) marigold.add(...W(doorX + i * .13, 3.5 - j * .14, d / 2 + .3).toArray(), .075, mc(i + j)); }
    }
    if (o.shop) {
      const sx = -w * .22;
      add(GB, mat.dark, sx, 1.25, d / 2 + .08, 2.7, 2.5, .12);
      add(GP, mat.shop, sx, 1.2, d / 2 + .16, 2.4, 2.2, 1);
      add(GB, mat.trimD, sx, .95, d / 2 + .4, 2.5, .12, .7);
      add(GB, mat.gold, sx - .6, 1.2, d / 2 + .3, .5, .3, .3); add(GB, mat.saffron, sx + .3, 1.15, d / 2 + .3, .5, .25, .3);
      for (let i = 0; i < 12; i++) add(GB, i % 2 ? mat.saffron : mat.trim, sx - 1.4 + i * .25, 2.65, d / 2 + .5, .25, .1, .9, .45);
      const [txt, bg] = signs[o.seed % signs.length];
      const sm = new THREE.MeshBasicMaterial({ map: T.signTex(txt, bg), color: new THREE.Color(1.35, 1.25, 1.1) });
      add(GP, sm, sx, 3.15, d / 2 + .18, 2.5, .62, 1);
    }

    // roof extras
    if (o.roofStar) { world.stars.push({ pos: W(o.roofStar, h + 1.5, d / 2 - .3), rot: o.ry, s: 1.5 + Rn() * .4 }); }
    if (Rn() < .45 && !o.roofTerrace) {
      add(GCyl, mat.trim, w * .25, h + 1.2, -d * .2, .5, 2, .5); add(GSph, mat.saffron, w * .25, h + 2.2, -d * .2, .62, .62, .62);
    }
    // string lights hugging each facade
    strand(W(-w / 2 + .1, h - .25, d / 2 + .35), W(w / 2 - .1, h - .25, d / 2 + .35), .35, 14, o.seed);
    buildings.push({ ...o, fh, W });
  }

  // layout both sides
  function layout(side, seed0) {
    const R = rand(seed0); let z = 13, i = 0; const out = [];
    while (z > -52) {
      const w = 5.6 + R() * 1.6, d = 7, floors = 3, h = 9.3 + R() * 3.6;
      const b = { w, d, h, floors, color: wallCols[(i * 3 + (side > 0 ? 2 : 0)) % wallCols.length], seed: seed0 + i * 13, px: side * (SH + d / 2), pz: z - w / 2, ry: side < 0 ? Math.PI / 2 : -Math.PI / 2, shop: R() < .5 };
      z -= w; out.push(b); i++;
    }
    return out;
  }
  const left = layout(-1, 100), right = layout(1, 300);
  // special buildings
  const nearest = (arr, z) => arr.reduce((a, b) => Math.abs(b.pz - z) < Math.abs(a.pz - z) ? b : a);
  const grand = nearest(left, -26); grand.grandDoor = true; grand.shop = false; grand.floors = 3;
  const roof = nearest(left, 0); roof.h = 11.5; roof.roofTerrace = true;
  left.concat(right).forEach((b, i) => { if (i % 4 === 1) b.roofStar = (i % 8 < 4 ? -1 : 1) * b.w * .22; });
  [...left, ...right].forEach(building);
  building({ w: 10.8, d: 6, h: 11, floors: 3, color: 0xe8467c, seed: 77, px: 0, pz: 14.2, ry: Math.PI, shop: false });
  world.roof = { x: -SH - 1.7, y: roof.h, z: roof.pz, camX: -SH - 12.5 };
  world.doorBuilding = grand;

  // ---------------------------------------------------------------- ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(SH * 2, 90, 1, 1), new THREE.MeshStandardMaterial({ map: tex.cobble, bumpMap: cs.bump, bumpScale: 3.5, roughnessMap: cs.rough, roughness: .62, metalness: 0, color: 0xffffff, envMapIntensity: 1.2 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -35); ground.receiveShadow = true; scene.add(ground);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x2a0a22, roughness: 1 }));
  far.rotation.x = -Math.PI / 2; far.position.y = -.05; scene.add(far);
  // curbs
  for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(.35, .12, 90), new THREE.MeshStandardMaterial({ color: 0xe9c7a8, roughness: .9 })); c.position.set(sx * (SH - .17), .06, -35); c.receiveShadow = true; scene.add(c); }

  // rangoli
  for (const [x, z, r] of [[-2.7, 3.6, 1.9], [3.0, -5, 1.5], [-2.6, -17, 1.7], [2.8, -33, 1.6]]) {
    const rg = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshStandardMaterial({ map: tex.rangoli, transparent: true, roughness: .8, emissive: 0xffffff, emissiveMap: tex.rangoli, emissiveIntensity: .35 }));
    rg.rotation.x = -Math.PI / 2; rg.position.set(x, .025, z); rg.rotation.z = Math.random() * 6; scene.add(rg);
  }

  // ---------------------------------------------------------------- street dressing
  // cross strings of light + stars
  const starG = starGeo(.5, .16, .1);
  let si = 0;
  for (let z = 9; z > -52; z -= 7.6, si++) {
    const y = 8.1;
    strand(new THREE.Vector3(-SH + .1, y, z), new THREE.Vector3(SH - .1, y, z), 1.15, 26, si, bulbsX);
    marigoldX.swag(new THREE.Vector3(-SH + .1, y + .12, z + .2), new THREE.Vector3(SH - .1, y + .12, z + .2), 1.15, 30, .1, mc);
    if (si % 2 === 0) for (const x of [-2.4, 2.4, 0]) {
      const t = (x + SH) / (2 * SH), yy = y - 1.15 * 4 * t * (1 - t) - .9 - (x === 0 ? .35 : 0);
      world.stars.push({ pos: new THREE.Vector3(x, yy, z), s: .78 + (x === 0 ? .12 : 0), hang: true });
    }
  }
  // kerb diyas
  for (let z = 9; z > -50; z -= 1.8) for (const sx of [-1, 1]) diyas.add(sx * (SH - .55), .12, z + (sx > 0 ? .5 : 0), 1, true);
  for (let i = -6; i <= 6; i++) diyas.add(i * .75, .02, 7.6 + (Math.abs(i) % 2) * .2, 1, true);

  // ---------------------------------------------------------------- temple
  const TZ = -57;
  (function temple() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const add = (geo, mt, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
      e.set(rx, ry, rz); q.setFromEuler(e); m.compose(p.set(x, y, z), q, s.set(sx, sy, sz));
      (mt.isMeshBasicMaterial ? glow : solid).add(geo, mt, m);
    };
    add(GB, mat.stone, 0, .4, TZ, 13, .8, 11);
    for (let i = 0; i < 3; i++) add(GB, mat.stone, 0, .13 + i * .27, TZ + 5.8 - i * .5 + .0, 7 + (2 - i) * 1.2, .27, 1.0 + i * 0 + .3);
    add(GB, mat.white, 0, 3.3, TZ, 7, 5, 6);
    add(GB, mat.trimD, 0, 2.2, TZ + 3.02, 2.9, 3.6, .16);
    add(GHalf, mat.trimD, 0, 4.0, TZ + 3.02, 1.45, 1.1, 1);
    add(GB, mat.niche, 0, 2.2, TZ + 3.12, 2.4, 3.2, .1);
    add(GHalf, mat.niche, 0, 3.8, TZ + 3.13, 1.2, 1.0, 1);
    // little golden idol
    add(GCyl, mat.gold, 0, 1.3, TZ + 3.3, .55, .35, .55); add(GSph, mat.gold, 0, 1.85, TZ + 3.3, .38, .5, .3); add(GSph, mat.gold, 0, 2.5, TZ + 3.3, .24, .26, .22);
    // pillars + porch
    for (const sx of [-2.9, 2.9]) { add(GCyl, mat.saffron2, sx, 2.9, TZ + 3.9, .3, 4.2, .3); add(GB, mat.gold, sx, .95, TZ + 3.9, .8, .3, .8); add(GB, mat.gold, sx, 5.05, TZ + 3.9, .8, .24, .8); }
    add(GB, mat.saffron, 0, 5.35, TZ + 3.4, 8, .4, 2.2);
    add(GB, mat.gold, 0, 5.6, TZ + 3.4, 8.3, .12, 2.5);
    // shikhara
    for (let i = 0; i < 7; i++) {
      const wd = 6.6 - i * .85, y = 5.9 + i * .95;
      add(GB, i % 2 ? mat.saffron2 : mat.saffron, 0, y + .5, TZ, wd, .95, wd - .6);
      add(GB, mat.gold, 0, y + .02, TZ, wd + .15, .1, wd - .45);
    }
    add(GCyl, mat.gold, 0, 12.8, TZ, .5, .9, .5); add(GSph, mat.gold, 0, 13.4, TZ, .45, .6, .45); add(GCyl, mat.gold, 0, 14.4, TZ, .05, 1.6, .05);
    add(GB, mat.saffron, .4, 14.6, TZ, .7, .4, .04);
    // lamps flanking
    for (const sx of [-5.2, 5.2]) { add(GCyl, mat.stone, sx, 1.3, TZ + 5.2, .22, 1.2, .22); add(GSph, mat.shop, sx, 2.1, TZ + 5.2, .22, .22, .22); }
    // marigold swag between pillars + vertical strands
    const L = new THREE.Vector3(-2.9, 4.8, TZ + 4.95), Rr = new THREE.Vector3(2.9, 4.8, TZ + 4.95);
    swagM(L, Rr, .7, 36, .13); swagM(L.clone().setY(5.05), Rr.clone().setY(5.05), .7, 36, .12);
    for (let i = -14; i <= 14; i++) { const x = i * .2, t = (x + 2.9) / 5.8, y = 4.8 - .7 * 4 * t * (1 - t) - .1; const Ln = 3 + (i % 2 ? 2 : 0) + (i * i) % 3; if (Math.abs(x) < 2.9) for (let j = 0; j < Ln; j++) marigold.add(x, y - j * .17, TZ + 4.95, .08, mc(i + j)); }
    for (const sx of [-2.9, 2.9]) for (let j = 0; j < 22; j++) marigold.add(sx + Math.cos(j * .9) * .34, 4.7 - j * .17, TZ + 3.9 + Math.sin(j * .9) * .34, .09, mc(j));
    // diyas along platform
    world.templeDiyas = [];
    for (let i = -11; i <= 11; i++) world.templeDiyas.push(diyas.add(i * .5, .82, TZ + 5.55, 1.1, false));
    for (let i = 0; i < 3; i++) for (let j = -4; j <= 4; j++) if (j % 2 === 0) world.templeDiyas.push(diyas.add(j * .95, .27 * (i + 1) + .0, TZ + 6.15 + .45 * (2 - i) * 0, 1, false));
  })();
  world.temple = { z: TZ, front: TZ + 6 };
  // bell (dynamic)
  const bell = new THREE.Group();
  {
    const prof = [[.0, .5], [.12, .48], [.2, .38], [.3, .15], [.38, -.1], [.42, -.28], [.4, -.3], [.0, -.3]].map(([x, y]) => new THREE.Vector2(x, y));
    const b = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), mat.gold); b.position.y = -.65; b.castShadow = true;
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .5, 6), mat.dark); rope.position.y = -.2;
    const clap = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 8), mat.dark); clap.position.y = -1.0;
    const pull = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0xc03030 })); pull.position.set(0, -1.55, .0);
    bell.add(b, rope, clap, pull);
    bell.position.set(0, 5.15, TZ + 4.4);
    scene.add(bell);
  }
  world.bell = bell;

  // ---------------------------------------------------------------- flush batches
  solid.build(scene, { cast: true, receive: true });
  glow.build(scene, { cast: false, receive: false });
  scene.add(marigold.done());

  // stars (dynamic meshes)
  const starMeshes = []; world.overhead = new THREE.Group(); scene.add(world.overhead);
  world.stars.forEach(st => {
    const g = new THREE.Group();
    const mesh = new THREE.Mesh(starG, st.hang ? mat.starHang : mat.star); mesh.scale.setScalar(st.s);
    g.add(mesh);
    if (st.hang) { const th = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1, 4), mat.dark); th.position.y = .5 + st.s * .6; th.scale.y = 1; g.add(th); }
    g.position.copy(st.pos); if (st.rot !== undefined) g.rotation.y = st.rot;
    g.userData = { ph: Math.random() * 6, hang: st.hang };
    (st.hang ? world.overhead : scene).add(g); starMeshes.push(g);
  });
  const bulbMesh = bulbs.done(); scene.add(bulbMesh);
  const bulbMeshX = bulbsX.done(), mariX = marigoldX.done(); world.overhead.add(bulbMeshX, mariX);
  [bulbMeshX.material, mariX.material, mat.starHang].forEach(m => { m.transparent = true; });
  world.setOverhead = k => { [bulbMeshX.material, mariX.material, mat.starHang].forEach(m => { m.opacity = k; m.depthWrite = k > .99; }); world.overhead.visible = k > .01; };
  diyas.finalize(scene);

  // street lights (shadow-free fill) — a few warm point lights
  const mkL = (c, i, d, x, y, z) => { const l = new THREE.PointLight(c, i, d, 1.6); l.position.set(x, y, z); scene.add(l); return l; };
  world.lights = {
    couple: mkL(0xffa45c, 14, 16, 0, 2.5, 1.5),
    door: mkL(0xffa030, 0, 9, world.door.pos.x + 1.5, 1.8, world.door.pos.z),
    temple: mkL(0xff9a3c, 0, 22, 0, 3.5, TZ + 8),
  };

  // ---------------------------------------------------------------- skyline
  {
    const [c, g] = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 512; return [c, c.getContext('2d')]; })();
    g.fillStyle = '#220a2c'; g.fillRect(0, 0, 256, 512); const R = rand(9);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,${190 + R() * 50 | 0},${90 + R() * 60 | 0},${.5 + R() * .5})`; g.fillRect((R() * 60 | 0) * 4, (R() * 120 | 0) * 4, 6, 8); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sm = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(.3, .28, .32), fog: false });
    const R2 = rand(21), geo = new THREE.BoxGeometry(1, 1, 1);
    const inst = new THREE.InstancedMesh(geo, sm, 120), mm = new THREE.Matrix4();
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2, rad = 150 + R2() * 90, w = 8 + R2() * 14, h = 10 + R2() * 26;
      mm.compose(new THREE.Vector3(Math.sin(a) * rad, h / 2 - 1, -40 + Math.cos(a) * rad), new THREE.Quaternion().setFromAxisAngle(UP, a), new THREE.Vector3(w, h, w));
      inst.setMatrixAt(i, mm);
    }
    scene.add(inst);
  }

  // ---------------------------------------------------------------- animation
  world.update = (t, dt) => {
    diyas.update(t, dt);
    starMeshes.forEach(g => {
      g.children[0].rotation.y = Math.sin(t * .8 + g.userData.ph) * .5;
      g.children[0].scale.setScalar(g.children[0].scale.x);
      if (g.userData.hang) g.rotation.z = Math.sin(t * .9 + g.userData.ph) * .06;
    });
    // twinkle fairy lights
    for (const [bm, bb] of [[bulbMesh, bulbs], [bulbMeshX, bulbsX]]) {
      for (let i = 0; i < bb.n; i++) {
        const b = bb.base[i], k = .62 + .38 * Math.sin(t * (1.5 + (i % 5) * .35) + i * 1.7);
        bm.setColorAt(i, tmpC.copy(b).multiplyScalar(k));
      }
      bm.instanceColor.needsUpdate = true;
    }
  };
  const tmpC = new THREE.Color();
  return world;
}
