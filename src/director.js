// Cinematic camera director powered by Theatre.js.
// Every camera move is a real Theatre.js sequence: keyframes with bezier handles on position / look-at / lens / roll tracks.
// The sequence is scrubbed from the story clock (sequence.position = t) so it stays deterministic and pauses with the story.
import { getProject } from '@theatre/core';

let uid = 0;
const H = {
  linear: [.33, .33, .33, .33],
  inOut: [.45, 0, .45, 0],     // slow start, slow end
  out: [.2, .2, .45, 0],       // fast start, soft landing
  in: [.45, 0, .2, .2],
  sine: [.4, .1, .4, .1],
  mid: [.4, .4, .4, .4],       // keyframe in the middle of a move: keep momentum
};
const pickEase = name => H[name] || H.inOut;

// build a Theatre.js project state for one shot from { prop: [[time, value], ...] } tracks
function buildState(tracks, length, ease) {
  const e = pickEase(ease), trackData = {}, ids = {};
  let k = 0;
  for (const [prop, keys] of Object.entries(tracks)) {
    const id = 't' + (++k); ids[`["${prop}"]`] = id;
    trackData[id] = {
      type: 'BasicKeyframedTrack', __debugName: 'Camera:' + prop,
      keyframes: keys.map(([position, value], i) => ({
        id: id + 'k' + i, position, value, connectedRight: true,
        handles: i === 0 ? [.5, .5, e[0], e[1]] : i === keys.length - 1 ? [e[2], e[3], .5, .5] : [H.mid[0], H.mid[1], H.mid[2], H.mid[3]],
      })),
    };
  }
  return {
    sheetsById: { Shot: { staticOverrides: { byObject: {} }, sequence: { subUnitsPerUnit: 30, length, type: 'PositionalSequence', tracksByObject: { Camera: { trackData, trackIdByPropPath: ids } } } } },
    definitionVersion: '0.4.0', revisionHistory: [],
  };
}

const DEFAULTS = { px: 0, py: 0, pz: 0, lx: 0, ly: 0, lz: 0, fov: 1, roll: 0, bars: 0, expo: 0 };

/**
 * Create a shot. from/to = { pos:Vector3, look:Vector3, fov?:number(multiplier), roll?:number(rad), bars?:0..1, expo?:number }
 * opts: { dur, ease, arc (sideways swing in metres), lift (extra height at the middle), dutch (roll at the middle) }
 * Returns { length, set(t) -> values at time t (seconds) }
 */
export async function makeShot(from, to, { dur = 3, ease = 'inOut', arc = 0, lift = 0, dutch = 0, push = 0 } = {}) {
  const f = { fov: 1, roll: 0, bars: 0, expo: 0, ...from }, t = { fov: 1, roll: 0, bars: 0, expo: 0, ...to };
  const mid = (a, b, k = .5) => a + (b - a) * k;
  // perpendicular swing for the middle keyframe
  const dx = t.pos.x - f.pos.x, dz = t.pos.z - f.pos.z, len = Math.hypot(dx, dz) || 1, nx = -dz / len, nz = dx / len;
  const A = arc * Math.min(1, len / 4);
  const tracks = {
    px: [[0, f.pos.x], [dur * .5, mid(f.pos.x, t.pos.x) + nx * A], [dur, t.pos.x]],
    py: [[0, f.pos.y], [dur * .5, mid(f.pos.y, t.pos.y) + lift], [dur, t.pos.y]],
    pz: [[0, f.pos.z], [dur * .5, mid(f.pos.z, t.pos.z) + nz * A], [dur, t.pos.z]],
    lx: [[0, f.look.x], [dur, t.look.x]], ly: [[0, f.look.y], [dur, t.look.y]], lz: [[0, f.look.z], [dur, t.look.z]],
    fov: [[0, f.fov], [dur * .5, mid(f.fov, t.fov) - push], [dur, t.fov]],
    roll: [[0, f.roll], [dur * .5, mid(f.roll, t.roll) + dutch], [dur, t.roll]],
    bars: [[0, f.bars], [dur, t.bars]], expo: [[0, f.expo], [dur, t.expo]],
  };
  const project = getProject('shot' + (++uid), { state: buildState(tracks, dur, ease) });
  await project.ready;
  const sheet = project.sheet('Shot');
  const obj = sheet.object('Camera', DEFAULTS);
  const seq = sheet.sequence;
  return { length: dur, set(time) { seq.position = Math.max(0, Math.min(dur, time)); return obj.value; } };
}
