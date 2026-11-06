import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { NOISE_GLSL } from './noise'

export const MAX_SHADOWS = 24

/*
 * GROUND COLOURS: tweak here. Dry state is what the land looks like before the
 * scroll; turf is the living ground the green front leaves behind.
 */
const COLORS = {
  dryLight: '#cdb08a', // sun-bleached dust on ridges
  dryEarth: '#9a7352', // ordinary dry soil
  dryDark: '#5f4330', // clods and hollows
  turfYoung: '#6b9437', // first green
  turfDeep: '#2f5f1d', // lush, late-scroll green
}
const glslColor = (hex: string) => {
  const c = new THREE.Color(hex)
  return `vec3(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)})`
}

// Where she actually touches the ground. Her photo stands on the plane z=0, but the
// rows of her seat and back foot look onto ground roughly 0.8-1.3 units behind it
// (front foot at z~0). Slots after these belong to potatoes and plants.
export const WOMAN_CONTACTS = [
  new THREE.Vector4(-0.1, -0.95, 0.7, 0.6),
  new THREE.Vector4(-0.5, -0.85, 0.32, 0.5),
  new THREE.Vector4(0.06, -0.08, 0.26, 0.6),
]

// Uniforms shared by the ground and the grass so both read the same growth front,
// light and haze. The frame loop writes into these.
export function createSharedUniforms(noise: THREE.Texture) {
  return {
    uNoise: { value: noise },
    uRadius: { value: 0 },
    uLush: { value: 0 },
    uTime: { value: 0 },
    uWind: { value: 0.35 },
    uSun: { value: new THREE.Color('#fff4e0') },
    uSky: { value: new THREE.Color('#dcecf7') },
    uHaze: { value: new THREE.Color('#c9d8dc') },
    // grass thins out between these camera distances
    uFade: { value: new THREE.Vector2(16, 34) },
    // GROUND FADE: the land dissolves into the sky between these camera distances
    // (the ground mesh ends ~75 units out, so keep the second number below that)
    uFar: { value: new THREE.Vector2(36, 62) },
    uShadows: {
      value: Array.from({ length: MAX_SHADOWS }, (_, i) => WOMAN_CONTACTS[i]?.clone() ?? new THREE.Vector4(0, 0, 1, 0)),
    },
    uWomanShadow: { value: new THREE.Vector4(-0.05, -0.7, 1.5, 0.45) },
  }
}
export type SharedUniforms = ReturnType<typeof createSharedUniforms>

const vertex = /* glsl */ `
${NOISE_GLSL}
varying vec3 vWorld;
varying vec3 vNormal;
varying float vHeight;
void main() {
  vec3 p = position;
  p.y = terrainHeight(p.xz);
  // smooth normal from the height field itself (no faceting on the mound)
  float e = 0.08 + length(p.xz) * 0.004;
  float hx = terrainHeight(p.xz + vec2(e, 0.0)) - terrainHeight(p.xz - vec2(e, 0.0));
  float hz = terrainHeight(p.xz + vec2(0.0, e)) - terrainHeight(p.xz - vec2(0.0, e));
  vNormal = normalize(vec3(-hx, 2.0 * e, -hz));
  vHeight = p.y;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragment = /* glsl */ `
${NOISE_GLSL}
uniform float uRadius;
uniform float uLush;
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uHaze;
uniform vec2 uFar;
uniform vec4 uShadows[${MAX_SHADOWS}];
uniform vec4 uWomanShadow;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vHeight;

// Cheap per-cell hash and Worley (cellular) noise: F1/F2 distances to the nearest
// feature points, used for the grit stones embedded in the soil.
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
vec3 worley(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(i + g);
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; id = o.x; } else if (d < f2) { f2 = d; }
    }
  }
  return vec3(f1, f2, id);
}
// Bump mapping from a scalar height using screen-space derivatives.
vec3 bumpNormal(vec3 pos, vec3 n, float h, float strength) {
  vec3 dpx = dFdx(pos);
  vec3 dpy = dFdy(pos);
  float dhx = dFdx(h);
  float dhy = dFdy(h);
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  return normalize(abs(det) * n - strength * grad);
}

// Dry earth: clods and crumbs, grit stones and darker damp hollows. Returns colour; writes the surface relief into h.
vec3 soil(vec2 p, float slope, float detail, out float h) {
  // large colour patches are mirrored left/right, matching the mirrored land shape
  vec2 pm = vec2(sqrt(p.x * p.x + 4.0), p.y);
  float broad = fbm(pm * 0.55);
  float clod = fbm(p * 3.1);
  float crumb = vnoise(p * 28.0);
  float grain = vnoise(p * 75.0);
  vec3 c = mix(${glslColor(COLORS.dryEarth)}, ${glslColor(COLORS.dryLight)}, smoothstep(0.35, 0.75, broad));
  c = mix(c, ${glslColor(COLORS.dryDark)}, smoothstep(0.55, 0.85, clod) * 0.55 * detail);
  // damp, richer earth in the low hollows
  float hollow = smoothstep(0.45, 0.2, fbm(pm * 1.3 + 21.0));
  c = mix(c, c * vec3(0.72, 0.66, 0.6), hollow * 0.6);

  // small stones and grit pressed into the surface
  vec3 grit = worley(p * 9.0);
  float stone = step(0.86, grit.z) * (1.0 - smoothstep(0.1, 0.17, grit.x)) * detail;
  float ring = step(0.86, grit.z) * smoothstep(0.12, 0.17, grit.x) * (1.0 - smoothstep(0.17, 0.24, grit.x)) * detail;
  c = mix(c, vec3(0.62, 0.58, 0.52) * (0.85 + grain * 0.3), stone * 0.9);
  c *= 1.0 - ring * 0.3;

  c = mix(c, ${glslColor(COLORS.dryDark)}, slope * 0.35); // steeper banks show darker earth
  c *= mix(0.92, 0.84 + crumb * 0.16 + grain * 0.1, detail);

  h = clod * 0.5 + crumb * 0.22 + grain * 0.08 + stone * 0.4;
  return c;
}

vec3 turf(vec2 p, float slope, out float h) {
  float broad = fbm(vec2(sqrt(p.x * p.x + 4.0), p.y) * 0.7 + 9.0);
  float fine = vnoise(p * 18.0);
  float blade = vnoise(p * vec2(90.0, 40.0));
  vec3 c = mix(${glslColor(COLORS.turfYoung)}, ${glslColor(COLORS.turfDeep)}, smoothstep(0.3, 0.8, broad) * (0.45 + 0.55 * uLush));
  c = mix(c, c * 0.8, slope * 0.4);
  h = fine * 0.4 + blade * 0.3;
  return c * mix(0.92, 0.8 + fine * 0.25 + blade * 0.1, smoothstep(40.0, 10.0, length(vWorld - cameraPosition)));
}

void main() {
  vec2 p = vWorld.xz;
  float dist = length(vWorld - cameraPosition);

  // fine detail fades with distance so the far ground stays clean
  float detail = 1.0 - smoothstep(8.0, 30.0, dist);
  vec3 n0 = normalize(vNormal);
  float slope = 1.0 - n0.y;

  float d = growthDistance(p);
  float green = smoothstep(uRadius, uRadius - 1.4 - dist * 0.05, d);
  float rim = smoothstep(uRadius + 0.5, uRadius, d) * (1.0 - green);
  float hSoil;
  float hTurf;
  vec3 dirt = soil(p, slope, detail, hSoil);
  vec3 grassy = turf(p, slope, hTurf);
  vec3 base = mix(dirt, grassy, green);
  base = mix(base, base * vec3(0.72, 0.68, 0.62), rim * 0.8 * detail); // damp edge of the front

  // surface relief lights the crumbs and stones
  float h = mix(hSoil, hTurf, green);
  vec3 n = bumpNormal(vWorld, n0, h * 0.06 * detail, 1.0);


  vec3 L = normalize(vec3(-0.45, 0.75, 0.35));
  float diff = max(dot(n, L), 0.0);
  float sky = 0.55 + 0.45 * n.y;
  vec3 lit = base * (uSky * 0.55 * sky + uSun * diff * 0.75);

  float shade = 1.0;
  for (int i = 0; i < ${MAX_SHADOWS}; i++) {
    vec4 s = uShadows[i];
    float r = length(p - s.xy) / s.z;
    shade *= 1.0 - s.w * exp(-r * r * 2.2);
  }
  vec2 w = (p - uWomanShadow.xy) / vec2(uWomanShadow.z, uWomanShadow.z * 0.5);
  shade *= 1.0 - uWomanShadow.w * exp(-dot(w, w) * 1.6);
  lit *= shade;

  // aerial perspective: distant land turns bluish and pale
  float air = 1.0 - exp(-max(dist - 8.0, 0.0) * 0.0075);
  lit = mix(lit, uHaze, air * 0.8);
  float alpha = 1.0 - smoothstep(uFar.x, uFar.y, dist);
  gl_FragColor = vec4(lit, alpha);
}
`

// The sculpted ground: one finely subdivided field holding the mound and the fields
// around it. Its far edge dissolves into the sky (uFar), so there is no horizon line.
export function Terrain({ uniforms, mobile }: { uniforms: SharedUniforms; mobile: boolean }) {
  const near = useMemo(() => {
    const seg = mobile ? 220 : 320
    const g = new THREE.PlaneGeometry(90, 90, seg, seg)
    g.rotateX(-Math.PI / 2)
    g.translate(0, 0, -20)
    return g
  }, [mobile])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: true,
      }),
    [uniforms],
  )
  useEffect(
    () => () => {
      near.dispose()
      material.dispose()
    },
    [near, material],
  )
  return <mesh geometry={near} material={material} renderOrder={-1} frustumCulled={false} />
}
