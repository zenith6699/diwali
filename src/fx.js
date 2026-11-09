import * as THREE from 'three';
import { rand, clamp, lerp, smooth } from './util.js';

export const fxUniforms = { uScale: { value: 800 }, uPR: { value: 1 } };

const POINT_FRAG = `
varying vec3 vCol; varying float vA;
void main(){
  vec2 c = gl_PointCoord - .5; float d = length(c)*2.;
  if(d>1.) discard;
  float core = exp(-d*d*5.);
  float halo = exp(-d*d*1.4)*.35;
  gl_FragColor = vec4(vCol*(core+halo)*vA, 1.);
}`;
const additive = (o) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...o });

// ------------------------------------------------------------------ sky
// soft teardrop flame, billboarded, additive HDR; instance matrix = (centre of base, scale x/y)
export const flameUni = { uT: { value: 0 } };
export function flameMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: flameUni,
    vertexShader: `varying vec2 vUv; varying float vPh;
      void main(){ vUv=uv; mat4 im=instanceMatrix; vec3 c=im[3].xyz; float sx=length(im[0].xyz), sy=length(im[1].xyz);
        vPh=fract(sin(dot(c,vec3(12.9898,78.233,37.719)))*43758.5453)*6.2831;
        vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]); vec3 up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
        vec3 wp=(modelMatrix*vec4(c,1.)).xyz+right*position.x*sx+up*(position.y+.5)*sy;
        gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.); }`,
    fragmentShader: `varying vec2 vUv; varying float vPh; uniform float uT;
      void main(){ float y=vUv.y; float x=(vUv.x-.5)*2.;
        float sway=sin(y*5.+uT*8.+vPh)*.16*y*y + sin(y*11.-uT*13.+vPh*2.)*.07*y;
        x+=sway; float w=pow(max(1.-y,0.),.75)*smoothstep(0.,.16,y+.05)*(.62+.08*sin(uT*17.+vPh));
        float d=abs(x)/max(w,.001); float a=smoothstep(1.,.05,d)*smoothstep(1.,.78,y);
        float core=pow(clamp(1.-d,0.,1.),2.2)*pow(clamp(1.-y*1.05,0.,1.),1.2);
        vec3 col=mix(vec3(2.6,.95,.2),vec3(3.4,2.5,1.1),core); col=mix(vec3(.25,.45,1.6),col,smoothstep(0.,.22,y));
        gl_FragColor=vec4(col*a*.9,a); }`,
  });
}

export function makeSky(scene) {
  const uni = { uNight: { value: 0 }, uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: uni,
    vertexShader: `varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vP; uniform vec3 uTop; uniform vec3 uHor;
      void main(){ float h=clamp(vP.y,0.,1.); float k=pow(h,.55); vec3 c=mix(uHor,uTop,k);
        float glow=exp(-pow((vP.y-.02)*5.,2.))*.35; c+=uHor*glow; gl_FragColor=vec4(c,1.); }`,
  }));
  sky.renderOrder = -10; scene.add(sky);

  // stars
  const N = 1400, pos = new Float32Array(N * 3), ph = new Float32Array(N), sz = new Float32Array(N), R = rand(5);
  for (let i = 0; i < N; i++) {
    const u = R(), v = R() * .85 + .12, th = u * Math.PI * 2, y = v, r = Math.sqrt(1 - y * y);
    pos.set([Math.cos(th) * r * 480, y * 480, Math.sin(th) * r * 480], i * 3); ph[i] = R() * 6; sz[i] = .8 + R() * 2.2;
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('aPh', new THREE.BufferAttribute(ph, 1)); sg.setAttribute('aSz', new THREE.BufferAttribute(sz, 1));
  const sm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uT: { value: 0 }, uNight: uni.uNight, uPR: fxUniforms.uPR },
    vertexShader: `attribute float aPh; attribute float aSz; uniform float uT; uniform float uNight; uniform float uPR; varying float vA;
      void main(){ vA=uNight*(.55+.45*sin(uT*1.7+aPh*9.)); gl_PointSize=aSz*uPR; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying float vA; void main(){ vec2 c=gl_PointCoord-.5; float d=length(c)*2.; if(d>1.)discard; gl_FragColor=vec4(vec3(1.,.92,.8)*(1.-d)*vA*1.6,1.);}`,
  });
  const stars = new THREE.Points(sg, sm); stars.frustumCulled = false; scene.add(stars);

  // moon
  const moon = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 1.7), fog: false, transparent: true, opacity: 0 }));
  moon.position.set(120, 150, -280); scene.add(moon);

  const dusk = { top: new THREE.Color(.05, .07, .2), hor: new THREE.Color(1.25, .5, .2) };
  const mid = { top: new THREE.Color(.012, .018, .075), hor: new THREE.Color(.5, .17, .09) };
  const night = { top: new THREE.Color(.004, .007, .035), hor: new THREE.Color(.1, .06, .14) };
  return {
    uni, set(n, t) {
      uni.uNight.value = n;
      const a = n < .5 ? dusk : mid, b = n < .5 ? mid : night, k = n < .5 ? n * 2 : (n - .5) * 2;
      uni.uTop.value.lerpColors(a.top, b.top, k); uni.uHor.value.lerpColors(a.hor, b.hor, k);
      sm.uniforms.uT.value = t; moon.material.opacity = smooth(.55, 1, n);
    },
  };
}

// ------------------------------------------------------------------ generic CPU particles (sparks, embers)
export class Sparks {
  constructor(max = 600) {
    this.max = max; this.n = 0; this.cursor = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.a = new Float32Array(max); this.sz = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max).fill(99); this.base = new Float32Array(max * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aA', new THREE.BufferAttribute(this.a, 1)); g.setAttribute('aS', new THREE.BufferAttribute(this.sz, 1));
    this.mesh = new THREE.Points(g, additive({
      uniforms: { uScale: fxUniforms.uScale },
      vertexShader: `attribute vec3 aCol; attribute float aA; attribute float aS; uniform float uScale; varying vec3 vCol; varying float vA;
        void main(){ vCol=aCol; vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=aS*uScale/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: POINT_FRAG,
    }));
    this.mesh.frustumCulled = false;
    this.gravity = 3.5; this.drag = .6;
  }
  emit(p, v, life, size, color) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    this.pos.set([p.x, p.y, p.z], i * 3); this.vel.set([v.x, v.y, v.z], i * 3); this.life[i] = life; this.age[i] = 0; this.sz[i] = size;
    this.base.set([color.r, color.g, color.b], i * 3);
  }
  update(dt) {
    const { pos, vel, life, age, a, col, base, sz } = this;
    for (let i = 0; i < this.max; i++) {
      if (age[i] >= life[i]) { a[i] = 0; continue; }
      age[i] += dt; const k = age[i] / life[i];
      vel[i * 3 + 1] -= this.gravity * dt; const dr = 1 - this.drag * dt;
      vel[i * 3] *= dr; vel[i * 3 + 1] *= dr; vel[i * 3 + 2] *= dr;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const f = (1 - k) * (.6 + .4 * Math.sin(age[i] * 40 + i));
      a[i] = f; col[i * 3] = base[i * 3] * (1 + (1 - k)); col[i * 3 + 1] = base[i * 3 + 1] * (1 + (1 - k) * .6); col[i * 3 + 2] = base[i * 3 + 2];
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = g.attributes.aCol.needsUpdate = g.attributes.aA.needsUpdate = g.attributes.aS.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ fireworks
const BURST_VERT = `
attribute vec3 aDir; attribute vec4 aRnd;
uniform float uT; uniform vec3 uOrigin; uniform vec3 uColor; uniform vec3 uColor2; uniform float uScale; uniform float uSize; uniform float uLife; uniform float uGrav; uniform float uDrag; uniform float uGlit;
varying vec3 vCol; varying float vA;
float h1(float x){ return fract(sin(x*127.1)*43758.5453); }
void main(){
  float trail = aRnd.w;
  float t = uT - trail*.03;
  float life = uLife*(.7+aRnd.x*.6);
  if(t<0.||t>life){ gl_Position=vec4(2.,2.,2.,1.); gl_PointSize=0.; vA=0.; vCol=vec3(0.); return; }
  vec3 d = aDir*(1.-exp(-uDrag*t))/uDrag;
  d.y -= .5*uGrav*t*t;
  d += vec3(sin(t*3.+aRnd.y*40.),0.,cos(t*2.7+aRnd.z*40.))*.35*t*aRnd.x;
  vec3 p = uOrigin + d;
  float k = t/life;
  float tw = .65+.35*sin(t*34.+aRnd.y*50.);
  float glit = step(.82, h1(aRnd.y*91.+floor(t*16.+aRnd.z*9.)*7.3))*uGlit*smoothstep(.2,.5,k);
  vA = pow(1.-k,1.15)*tw*(1.-trail*.13)*(.35+.65*smoothstep(0.,.05,k)) + glit*(1.-trail*.5)*1.4;
  vec3 c = mix(uColor, uColor2, aRnd.z);
  c = mix(vec3(1.,.95,.8), c, smoothstep(0.,.14,k));
  c = mix(c, vec3(1.7,.55,.14), smoothstep(.62,1.,k)*.75);
  vCol = c*(1.35+glit*1.2);
  vec4 mv = modelViewMatrix*vec4(p,1.);
  gl_PointSize = uSize*(1.-k*.4)*(1.-trail*.1)*(1.+glit*.7)*uScale/-mv.z;
  gl_Position = projectionMatrix*mv;
}`;

function burstGeometry(kind, n) {
  const R = rand(kind * 17 + 3), TR = 7, N = n * TR;
  const dir = new Float32Array(N * 3), rnd = new Float32Array(N * 4);
  for (let i = 0; i < n; i++) {
    let x, y, z, sp;
    if (kind === 1) { const a = i / n * Math.PI * 2; x = Math.cos(a); y = Math.sin(a) * .25; z = Math.sin(a) * .95; sp = 17 + R() * 1.5; } // ring-ish
    else if (kind === 2) { const u = R() * 2 - 1, a = R() * Math.PI * 2, r = Math.sqrt(1 - u * u); x = Math.cos(a) * r; y = u; z = Math.sin(a) * r; sp = 8 + R() * 8; } // willow-ish
    else { const u = 1 - 2 * (i + .5) / n, a = i * 2.39996, r = Math.sqrt(1 - u * u); x = Math.cos(a) * r; y = u; z = Math.sin(a) * r; sp = (i % 3 === 0 ? 11 : 18) + R() * 4; }
    for (let t = 0; t < TR; t++) {
      const j = i * TR + t;
      dir.set([x * sp, y * sp, z * sp], j * 3); rnd.set([R(), R(), R(), t], j * 4);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('aDir', new THREE.BufferAttribute(dir, 3)); g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
  return g;
}

export class Fireworks {
  constructor(scene, audio) {
    this.scene = scene; this.audio = audio; this.pool = []; this.timers = []; this.flash = 0; this.time = 0;
    this.geos = [burstGeometry(0, 240), burstGeometry(1, 180), burstGeometry(2, 220)];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Points(this.geos[0], additive({
        uniforms: { uT: { value: 99 }, uOrigin: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color() }, uColor2: { value: new THREE.Color() }, uScale: fxUniforms.uScale, uSize: { value: .55 }, uLife: { value: 2.6 }, uGrav: { value: 2.4 }, uDrag: { value: 2.1 }, uGlit: { value: 1 } },
        vertexShader: BURST_VERT, fragmentShader: POINT_FRAG,
      }));
      m.frustumCulled = false; m.visible = false; m.userData.t0 = -99; scene.add(m); this.pool.push(m);
    }
    // rockets
    this.rockets = [];
    for (let i = 0; i < 8; i++) {
      const g = new THREE.BufferGeometry(); const n = 14;
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      g.setAttribute('aI', new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, k) => k), 1));
      const m = new THREE.Points(g, additive({
        uniforms: { uT: { value: 0 }, uA: { value: new THREE.Vector3() }, uB: { value: new THREE.Vector3() }, uDur: { value: 1 }, uScale: fxUniforms.uScale },
        vertexShader: `attribute float aI; uniform float uT; uniform vec3 uA; uniform vec3 uB; uniform float uDur; uniform float uScale; varying vec3 vCol; varying float vA;
          void main(){ float t=clamp((uT-aI*.028)/uDur,0.,1.); t=1.-(1.-t)*(1.-t); vec3 p=mix(uA,uB,t); p.x+=sin(uT*30.+aI)*.04;
            vA=(1.-aI/14.)*(uT<uDur+.1?1.:0.)*step(0.,uT-aI*.028); vCol=vec3(3.2,1.9,.7); vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=.45*(1.-aI/20.)*uScale/-mv.z; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: POINT_FRAG,
      }));
      m.frustumCulled = false; m.visible = false; m.userData.t0 = -99; scene.add(m); this.rockets.push(m);
    }
    this.textPts = null;
    // lingering smoke, lit by the burst colour
    const SN = 46, sg = new THREE.BufferGeometry(), sd = new Float32Array(SN * 3), sr = new Float32Array(SN * 2); const SR = rand(77);
    for (let i = 0; i < SN; i++) { const u = SR() * 2 - 1, a = SR() * 6.283, r = Math.sqrt(1 - u * u), sp = 1 + SR() * 5; sd.set([Math.cos(a) * r * sp, u * sp, Math.sin(a) * r * sp], i * 3); sr.set([SR(), SR()], i * 2); }
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SN * 3), 3)); sg.setAttribute('aDir', new THREE.BufferAttribute(sd, 3)); sg.setAttribute('aRnd', new THREE.BufferAttribute(sr, 2));
    this.smokes = this.pool.map(() => {
      const m = new THREE.Points(sg, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, fog: false,
        uniforms: { uT: { value: 99 }, uOrigin: { value: new THREE.Vector3() }, uLit: { value: new THREE.Color() }, uScale: fxUniforms.uScale, uSize: { value: 6 } },
        vertexShader: `attribute vec3 aDir; attribute vec2 aRnd; uniform float uT; uniform vec3 uOrigin; uniform float uScale; uniform float uSize; varying float vA; varying float vL;
          void main(){ float t=uT; vec3 p=uOrigin+aDir*(1.-exp(-.9*t))*1.3+vec3(1.2*t*(.5+aRnd.x),.35*t,0.); float k=clamp(t/6.5,0.,1.);
            vA=smoothstep(.4,1.6,t)*(1.-k)*(1.-k)*.1; vL=exp(-t*1.1); vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=uSize*(.6+aRnd.y*.8)*(1.+t*.5)*uScale/-mv.z; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform vec3 uLit; varying float vA; varying float vL; void main(){ vec2 c=gl_PointCoord-.5; float d=length(c)*2.; if(d>1.)discard; float a=pow(1.-d,1.6)*vA; gl_FragColor=vec4(vec3(.1,.085,.09)+uLit*vL*.25,a); }`,
      }));
      m.frustumCulled = false; m.visible = false; m.renderOrder = 3; scene.add(m); return m;
    });
    this.lightK = 0;
  }
  schedule(delay, fn) { this.timers.push({ at: this.time + delay, fn }); }
  launch(origin, target, color, color2, kind = 0, size = .55) {
    const r = this.rockets.find(m => !m.visible) || this.rockets[0];
    const dur = .9 + Math.random() * .25;
    r.userData.t0 = this.time; r.visible = true; r.userData.dur = dur;
    r.material.uniforms.uA.value.copy(origin); r.material.uniforms.uB.value.copy(target); r.material.uniforms.uDur.value = dur;
    this.audio?.whoosh(origin);
    this.schedule(dur, () => this.burst(target, color, color2, kind, size));
  }
  burst(pos, color, color2, kind = 0, size = .55) {
    const b = this.pool.find(m => !m.visible) || this.pool[0];
    b.geometry = this.geos[kind]; b.visible = true; b.userData.t0 = this.time;
    const u = b.material.uniforms; u.uOrigin.value.copy(pos); u.uColor.value.set(color); u.uColor2.value.set(color2 ?? color); u.uSize.value = size * 1.15;
    u.uLife.value = kind === 2 ? 3.4 : 2.7; u.uGrav.value = kind === 2 ? 4.4 : 2.4; u.uDrag.value = kind === 2 ? 1.6 : 2.1;
    { const i = this.pool.indexOf(b), sm = this.smokes[i]; sm.visible = true; sm.userData.t0 = this.time; sm.material.uniforms.uOrigin.value.copy(pos); sm.material.uniforms.uLit.value.set(color).multiplyScalar(1.1); sm.material.uniforms.uSize.value = 3 + size * 4;
      this.lightK = 1; this.flashCol = new THREE.Color(color); }
    this.flash = Math.min(.8, this.flash + .35);
    this.audio?.boom(clamp(pos.length() / 90, .3, 1), pos);
  }
  async writeText(lines, center, width) {
    const W = 1400, H = 460, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    try { await document.fonts.load('italic 700 150px "Cormorant Garamond"'); } catch (e) { /* offline */ }
    g.font = 'italic 700 170px "Cormorant Garamond", Georgia, serif'; g.fillText(lines[0], W / 2, 130);
    // line 2: his name, a small heart on each side (hearts drawn by hand)
    let fs = 128; g.font = `italic 700 ${fs}px "Cormorant Garamond", Georgia, serif`;
    const nm = String(lines[1] || '').trim(); let wn = g.measureText(nm).width;
    while (wn > 880 && fs > 56) { fs -= 6; g.font = `italic 700 ${fs}px "Cormorant Garamond", Georgia, serif`; wn = g.measureText(nm).width; }
    const hw = 74, gap = 36, hy = 338;
    g.textAlign = 'center'; g.fillText(nm, W / 2, hy);
    for (const sx of [-1, 1]) {
      g.save(); g.translate(W / 2 + sx * (wn / 2 + gap + hw / 2), hy + 6); g.scale(hw / 60, hw / 60); g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-42, -8, -20, -38, 0, -14); g.bezierCurveTo(20, -38, 42, -8, 0, 22); g.fill(); g.restore();
    }
    const d = g.getImageData(0, 0, W, H).data, pts = [], R = rand(12);
    for (let y = 0; y < H; y += 4) for (let xx = 0; xx < W; xx += 4) if (d[(y * W + xx) * 4 + 3] > 128 && R() < .95) pts.push([xx / W - .5, .5 - y / H]);
    const N = pts.length, tgt = new Float32Array(N * 3), org = new Float32Array(N * 3), rnd = new Float32Array(N * 4);
    const origin = center.clone().add(new THREE.Vector3(0, -6, 0));
    for (let i = 0; i < N; i++) {
      const [px, py] = pts[i];
      tgt.set([center.x + px * width, center.y + py * width * H / W, center.z], i * 3);
      { const u0 = R() * 2 - 1, a0 = R() * 6.283, r0 = Math.sqrt(1 - u0 * u0) * (3 + R() * 8); org.set([origin.x + Math.cos(a0) * r0, origin.y + u0 * 6, origin.z + Math.sin(a0) * r0 * .5], i * 3); }
      const u = R() * 2 - 1, a2 = R() * 6.283, r = Math.sqrt(1 - u * u), sp = 3 + R() * 9;
      rnd.set([Math.cos(a2) * r * sp, u * sp, Math.sin(a2) * r * sp, R()], i * 4);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(org, 3)); geo.setAttribute('aTgt', new THREE.BufferAttribute(tgt, 3)); geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    const mat = additive({
      uniforms: { uT: { value: -1 }, uScale: fxUniforms.uScale, uHold: { value: 7 } },
      vertexShader: `attribute vec3 aTgt; attribute vec4 aRnd; uniform float uT; uniform float uScale; uniform float uHold; varying vec3 vCol; varying float vA;
        float e(float x){ x=clamp(x,0.,1.); return x*x*(3.-2.*x); }
        void main(){
          vec3 start=position; float t=uT; if(t<0.){ gl_Position=vec4(2.,2.,2.,1.); gl_PointSize=0.; vA=0.; vCol=vec3(0.); return; }
          vec3 expl=start+aRnd.xyz*(1.-exp(-3.5*t))/3.5; expl.y-=.5*2.*t*t*.35;
          float k=e((t-1.1-aRnd.w*.5)/1.6);
          vec3 p=mix(expl,aTgt,k);
          p+=vec3(sin(uT*2.+aRnd.w*30.),cos(uT*2.3+aRnd.w*20.),0.)*.05*k;
          float fade=1.-e((t-uHold)/1.6);
          float tw=.7+.3*sin(t*9.+aRnd.w*60.);
          vA=fade*tw*.8*(.2+.8*e(t/.8));
          vCol=mix(vec3(1.5,1.3,.95),vec3(1.6,.9,.35),aRnd.w*.8)*(1.+.4*(1.-k));
          vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=(.2+.08*aRnd.w)*uScale/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: POINT_FRAG,
    });
    const pts3 = new THREE.Points(geo, mat); pts3.frustumCulled = false; pts3.visible = false; this.scene.add(pts3);
    this.textPts = { m: pts3, t0: 0, active: false };
    return this.textPts;
  }
  showText() { if (this.textPts) { this.textPts.m.visible = true; this.textPts.active = true; this.textPts.t0 = this.time; this.audio?.chime(); } }
  update(dt) {
    this.time += dt;
    for (let i = this.timers.length - 1; i >= 0; i--) if (this.timers[i].at <= this.time) { const f = this.timers[i].fn; this.timers.splice(i, 1); f(); }
    for (const b of this.pool) if (b.visible) { const t = this.time - b.userData.t0; b.material.uniforms.uT.value = t; if (t > 4.4) b.visible = false; }
    this.smokes.forEach(sm => { if (sm.visible) { const t = this.time - sm.userData.t0; sm.material.uniforms.uT.value = t; if (t > 6.8) sm.visible = false; } });
    this.lightK = Math.max(0, this.lightK - dt * 1.8);
    for (const r of this.rockets) if (r.visible) { const t = this.time - r.userData.t0; r.material.uniforms.uT.value = t; if (t > r.userData.dur + .6) r.visible = false; }
    if (this.textPts?.active) {
      const t = this.time - this.textPts.t0; this.textPts.m.material.uniforms.uT.value = t;
      if (t > 10) { this.textPts.m.visible = false; this.textPts.active = false; }
    }
    this.flash = Math.max(0, this.flash - dt * 2.2);
  }
}

// ------------------------------------------------------------------ petals (rain of marigold petals)
export class Petals {
  constructor(scene, n = 220) {
    this.n = n; this.active = false; this.t0 = 0;
    const g = new THREE.CircleGeometry(.07, 7); g.scale(1, 1.5, 1);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: .8, side: THREE.DoubleSide, emissive: 0x663300, emissiveIntensity: .5 }), n);
    this.mesh.frustumCulled = false; this.mesh.visible = false; scene.add(this.mesh);
    const cols = [0xff8a00, 0xffb300, 0xff5a00, 0xffd23f, 0xff3d7f].map(c => new THREE.Color(c));
    this.d = Array.from({ length: n }, (_, i) => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, ph: Math.random() * 6, sp: .8 + Math.random() * 1.2, rx: Math.random() * 6, ry: Math.random() * 6 }));
    this.d.forEach((p, i) => this.mesh.setColorAt(i, cols[i % cols.length]));
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.s = new THREE.Vector3(1, 1, 1);
  }
  start(center, spread = 4, height = 8) {
    this.center = center.clone(); this.spread = spread; this.height = height; this.active = true; this.mesh.visible = true;
    this.d.forEach(p => { p.x = center.x + (Math.random() - .5) * spread * 2; p.z = center.z + (Math.random() - .5) * spread; p.y = center.y + height * (.3 + Math.random() * 1.4); p.delay = Math.random() * 2.5; });
    this.t = 0;
  }
  stop() { this.active = false; this.mesh.visible = false; }
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    this.d.forEach((p, i) => {
      if (this.t < p.delay) { this.s.setScalar(0); this.m.compose(new THREE.Vector3(0, -50, 0), this.q, this.s); this.mesh.setMatrixAt(i, this.m); return; }
      p.y -= p.sp * dt * 1.3; p.x += Math.sin(this.t * 1.3 + p.ph) * dt * .5; p.z += Math.cos(this.t * 1.1 + p.ph) * dt * .3;
      if (p.y < .02) p.y = this.center.y + this.height * (.8 + Math.random() * .6);
      this.e.set(p.rx + this.t * p.sp * 2, p.ry + this.t * p.sp, p.ph); this.q.setFromEuler(this.e); this.s.setScalar(1);
      this.m.compose(new THREE.Vector3(p.x, p.y, p.z), this.q, this.s); this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ sky lanterns
export class Lanterns {
  constructor(scene, n = 120) {
    this.n = n;
    const g = new THREE.CylinderGeometry(.34, .24, .62, 14, 1, true);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, .72, .24), side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(g, mat, n); this.mesh.frustumCulled = false; this.mesh.visible = false;
    this.glow = new THREE.InstancedMesh(new THREE.SphereGeometry(.2, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.5, .5) }), n);
    this.glow.frustumCulled = false; this.glow.visible = false;
    scene.add(this.mesh, this.glow);
    this.d = []; this.m = new THREE.Matrix4(); this.active = false;
  }
  start(c, w = 40, depth = 40, y0 = 0) {
    this.center = c; this.active = true; this.mesh.visible = this.glow.visible = true; this.t = 0;
    this.d = Array.from({ length: this.n }, () => ({ x: c.x + (Math.random() - .5) * w, y: y0 + Math.random() * 38, z: c.z + (Math.random() - .5) * depth, sp: .7 + Math.random() * 1.1, ph: Math.random() * 6, s: .35 + Math.random() * .6, delay: Math.random() * 3 }));
    this.y0 = y0;
  }
  update(dt) {
    if (!this.active) return; this.t += dt;
    this.d.forEach((p, i) => {
      const s = this.t < p.delay ? 0.0001 : Math.min(1, (this.t - p.delay) * .8) * p.s;
      if (this.t >= p.delay) { p.y += p.sp * dt; p.x += Math.sin(this.t * .4 + p.ph) * dt * .5; p.z -= dt * .15; if (p.y > this.y0 + 60) p.y = this.y0 - 4; }
      this.m.makeScale(s, s * 1.1, s).setPosition(p.x, p.y, p.z); this.mesh.setMatrixAt(i, this.m);
      this.m.makeScale(s, s * 1.3, s).setPosition(p.x, p.y - .12 * s, p.z); this.glow.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = this.glow.instanceMatrix.needsUpdate = true;
  }
}
