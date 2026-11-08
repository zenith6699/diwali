import * as THREE from 'three';
import * as T from './textures.js';

export const ROOM_X = 90;
export function buildRoom(scene) {
  const g = new THREE.Group(); g.position.x = ROOM_X; scene.add(g);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, ...o });
  const box = (w, h, d, m, x, y, z, parent = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; parent.add(b); return b; };
  const wallM = std(0xf3e4cb, { map: T.plasterTex() });
  const floor = box(16, .2, 14, std(0x8a5230, { roughness: .6 }), 0, -.1, 0);
  box(16, 9, .3, wallM, 0, 4.5, -3.6); box(.3, 9, 14, wallM, -8, 4.5, 0); box(.3, 9, 14, wallM, 8, 4.5, 0);
  box(16, .22, .4, std(0xb0752e), 0, .11, -3.4); // skirting
  // table
  const cloth = std(0xb0202c, { roughness: .7 });
  box(4.2, .14, 2.0, cloth, 0, 1.0, -1.7); box(4.3, .9, 2.1, cloth, 0, .55, -1.7);
  box(4.35, .08, 2.15, std(0xf5b942, { metalness: .7, roughness: .35 }), 0, .2, -1.7);
  box(4.35, .06, 2.15, std(0xf5b942, { metalness: .7, roughness: .35 }), 0, .93, -1.7);
  const topY = 1.07;
  // gift box
  const wood = new THREE.MeshStandardMaterial({ map: T.woodBoxTex(), roughness: .5 });
  const base = box(1.3, .6, .95, wood, 0, topY + .3, -1.7);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .75), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.2, .5) }));
  inner.rotation.x = -Math.PI / 2; inner.position.set(0, topY + .605, -1.7); inner.visible = false; g.add(inner);
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, topY + .6, -1.7 - .475); g.add(lidPivot);
  const lid = box(1.36, .16, 1.0, wood, 0, .08, .5, lidPivot);
  const gold = std(0xf5b942, { metalness: .8, roughness: .3, emissive: 0x2a1800 });
  box(.14, .18, 1.02, gold, 0, .09, .5, lidPivot); box(.14, .62, .98, gold, 0, topY + .3, -1.7);
  const bow = new THREE.Mesh(new THREE.TorusKnotGeometry(.12, .035, 40, 6, 2, 3), gold); bow.position.set(0, .26, .5); bow.scale.set(1.2, .8, 1.2); lidPivot.add(bow);
  // card in box
  const card = new THREE.Mesh(new THREE.PlaneGeometry(.8, 1.0), new THREE.MeshBasicMaterial({ map: T.cardTex(), side: THREE.DoubleSide, color: new THREE.Color(1.15, 1.1, 1.0) }));
  card.position.set(0, topY + .3, -1.7); card.rotation.x = -Math.PI / 2 + .3; card.visible = false; g.add(card);
  // laddoo plate
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(.6, .5, .07, 28), new THREE.MeshStandardMaterial({ map: T.plateTex(), roughness: .4, metalness: .2 })); plate.position.set(-1.45, topY + .04, -1.6); g.add(plate);
  const ladM = std(0xf19a23, { roughness: .9 });
  [[0, 0], [.3, .1], [-.28, .15], [.1, -.28], [-.1, .32], [.28, -.25], [0, .05]].forEach(([x, z], i) => { const l = new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 12), ladM); l.position.set(-1.45 + x, topY + .16 + (i === 6 ? .22 : 0), -1.6 + z); l.castShadow = true; g.add(l); });
  // marigold bowl
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(.5, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0xd2a05a, { metalness: .6, roughness: .4, side: THREE.DoubleSide })); bowl.position.set(1.5, topY + .38, -1.65); g.add(bowl);
  const mcols = [0xff8a00, 0xffb300, 0xff5a00, 0xffd23f];
  for (let i = 0; i < 28; i++) { const a = i * 2.4, r = Math.sqrt(i / 28) * .42; const f = new THREE.Mesh(new THREE.IcosahedronGeometry(.11, 1), std(mcols[i % 4])); f.position.set(1.5 + Math.cos(a) * r, topY + .42 + (1 - r) * .1, -1.65 + Math.sin(a) * r); g.add(f); }
  // diyas (lit)
  const flames = [];
  for (const [x, z] of [[-.7, -.95], [.75, -.95], [-2.0, -2.2], [2.0, -2.25]]) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(.13, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0xc8582b, { side: THREE.DoubleSide })); b.position.set(x, topY + .12, z); g.add(b);
    const f = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.9, .5) })); f.scale.set(1, 1.7, 1); f.position.set(x, topY + .22, z); g.add(f); flames.push(f);
  }
  // fairy lights on back wall
  const bm = new THREE.MeshBasicMaterial(); const bulbs = [];
  for (let s = 0; s < 3; s++) for (let i = 0; i <= 26; i++) {
    const t = i / 26, x = -7.5 + t * 15, y = 6.1 - s * .55 - Math.sin(t * Math.PI) * -0.0 - 1.1 * 4 * t * (1 - t);
    const b = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(...(i % 2 ? [3, 2, .7] : [3, .9, 1.6])) })); b.position.set(x, y, -3.4); g.add(b); bulbs.push(b);
  }
  // wall hangings: glowing stars + frame
  for (const x of [-5, -2.7, 2.7, 5]) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(.35), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.1, .6) })); s.scale.set(.6, 1.2, .3); s.position.set(x, 4.6 + (Math.abs(x) > 3 ? .3 : 0), -3.35); g.add(s); }
  const frame = box(1.6, 2.0, .08, std(0xb0752e, { metalness: .4 }), 0, 4.2, -3.4); box(1.38, 1.78, .1, std(0xfff1de), 0, 4.2, -3.38);
  const heart = new THREE.Mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, -.5); s.bezierCurveTo(-.9, .1, -.4, .8, 0, .35); s.bezierCurveTo(.4, .8, .9, .1, 0, -.5); return s; })()), new THREE.MeshBasicMaterial({ color: 0xe8465a })); heart.scale.setScalar(.85); heart.position.set(0, 4.2, -3.32); g.add(heart);
  // lights
  const L1 = new THREE.PointLight(0xffb36b, 26, 18, 1.5); L1.position.set(0, 3.4, 1.5); g.add(L1);
  const L2 = new THREE.PointLight(0xffa04a, 0, 8, 1.6); L2.position.set(0, topY + 1.1, -1.7); g.add(L2);
  g.visible = false;
  let openK = 0;
  return {
    group: g, topY, glowLight: L2, spark: new THREE.Vector3(ROOM_X, topY + .7, -1.7), card,
    setOpen(k) {
      openK = k; lidPivot.rotation.x = -k * 2.05; inner.visible = k > .05; L2.intensity = k * 14;
    },
    riseCard(k) { card.visible = k > 0; card.position.set(0, topY + .35 + k * 1.05, -1.7 + k * .15); card.rotation.x = -Math.PI / 2 + .3 + k * (Math.PI / 2 - .3 - .08); card.scale.setScalar(.55 + k * .55); },
    update(t) { flames.forEach((f, i) => f.scale.set(1, 1.7 * (1 + .15 * Math.sin(t * 13 + i * 2)), 1)); },
  };
}
