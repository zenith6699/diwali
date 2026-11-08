import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = {
  inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
};
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Collects many small transformed geometries and merges them per material. */
export class Batch {
  constructor() { this.groups = new Map(); }
  add(geo, mat, matrix) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    let a = this.groups.get(mat); if (!a) { a = []; this.groups.set(mat, a); }
    a.push(g);
  }
  build(parent, { cast = true, receive = true } = {}) {
    const out = [];
    for (const [mat, arr] of this.groups) {
      const geo = mergeGeometries(arr, false);
      arr.forEach(g => g.dispose());
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = cast; m.receiveShadow = receive;
      m.matrixAutoUpdate = false; m.updateMatrix();
      parent.add(m); out.push(m);
    }
    this.groups.clear();
    return out;
  }
}

/** Instanced set of small spheres (marigolds, fairy bulbs) filled incrementally. */
export class Beads {
  constructor(geo, mat, cap) {
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.frustumCulled = false;
    this.n = 0; this.cap = cap;
    this.m = new THREE.Matrix4(); this.base = [];
  }
  add(x, y, z, s, color) {
    if (this.n >= this.cap) return -1;
    this.m.makeScale(s, s, s).setPosition(x, y, z);
    this.mesh.setMatrixAt(this.n, this.m);
    this.mesh.setColorAt(this.n, color);
    this.base.push(color.clone());
    return this.n++;
  }
  /** points along a sagging curve between a and b */
  swag(a, b, sag, n, size, colorFn) {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t);
      const y = lerp(a.y, b.y, t) - sag * 4 * t * (1 - t);
      this.add(x, y, z, size, colorFn(i));
    }
  }
  done() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true; return this.mesh; }
}
