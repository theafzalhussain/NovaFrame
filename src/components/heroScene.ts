/**
 * "The Armillary" — a real-time WebGL centrepiece.
 * Polished obsidian core with engraved meridians and a gold atmosphere, precessing gold rings
 * whose beads trail streaks of light, signal pulses that travel out to a watch-bezel tick ring,
 * a soft halo and twinkling gold dust. Pauses off-screen, respects reduced motion, cleans up fully.
 *
 * Loaded on demand by <HeroCanvas>, so three.js stays out of the main bundle.
 *  - "full": desktops/laptops and large tablets — physically based metals, the original look.
 *  - "lite": low-end laptops and tablets — matcap-shaded metals (no environment pre-render),
 *    lighter geometry, capped pixel ratio, no MSAA, 30 fps. (Phones get static artwork instead;
 *    see pickQuality() in HeroCanvas.)
 *
 * Set-up is split into short tasks (and shaders compile asynchronously where the browser
 * supports it), so a tap that lands while the scene is starting is handled straight away.
 *
 * Imports are named rather than `import * as THREE`, which lets Rollup drop the parts of the
 * library this scene never touches. The environment-map pipeline is loaded only on the "full"
 * path, so phones never download it.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CubeUVReflectionMapping,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  Group,
  HalfFloatType,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LinearFilter,
  LinearSRGBColorSpace,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  PointLight,
  Points,
  Quaternion,
  RGBAFormat,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from "three";

export type HeroQuality = "full" | "lite";

type Options = {
  quality: HeroQuality;
  reduced: boolean;
  /** First frame is on screen. */
  onReady: () => void;
  /** WebGL is unavailable — show the static fallback. */
  onFail: () => void;
};

const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * The "full" scene's reflection map, baked in a worker (see pmremWorker.ts) so the page stays
 * responsive. Resolves to null when the browser can't (no OffscreenCanvas WebGL 2 in workers,
 * no float read-back, or it takes too long); the caller then bakes it on the main thread.
 */
function bakeEnvironmentOffThread(timeoutMs = 12000): Promise<DataTexture | null> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./pmremWorker.ts", import.meta.url), { type: "module" });
    } catch {
      resolve(null);
      return;
    }
    let settled = false;
    const finish = (texture: DataTexture | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker.terminate();
      resolve(texture);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    worker.onerror = () => finish(null);
    worker.onmessage = (e: MessageEvent<{ width?: number; height?: number; data?: Uint16Array; error?: string }>) => {
      const { width, height, data } = e.data ?? {};
      if (!width || !height || !data || data.length !== width * height * 4) return finish(null);
      // Same layout and sampling as the render target PMREMGenerator returns, so three.js uses it
      // as a ready-made cube-UV environment map without converting it again.
      const texture = new DataTexture(data, width, height, RGBAFormat, HalfFloatType);
      // @types/three leaves the cube-UV mapping out of its `Mapping` union; three.js itself accepts it.
      (texture as { mapping: number }).mapping = CubeUVReflectionMapping;
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearFilter;
      texture.generateMipmaps = false;
      texture.colorSpace = LinearSRGBColorSpace;
      texture.needsUpdate = true;
      finish(texture);
    };
    worker.postMessage(null);
  });
}

/**
 * Starts the reflection bake as soon as this module loads on a "full" device, so it runs while the
 * page is still settling instead of after the scene starts. createHeroScene() reuses the result.
 */
let envBake: Promise<DataTexture | null> | null = null;
export function prewarmEnvironment() {
  envBake ??= bakeEnvironmentOffThread();
  return envBake;
}

/** Builds the scene inside `mount` and returns a cleanup function (safe to call at any time). */
export function createHeroScene(mount: HTMLElement, { quality, reduced, onReady, onFail }: Options): () => void {
  const lite = quality === "lite";
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(o: T) => {
    disposables.push(o);
    return o;
  };
  const teardown: (() => void)[] = [];
  let disposed = false;
  let renderer: WebGLRenderer | null = null;

  const destroy = () => {
    if (disposed) return;
    disposed = true;
    teardown.forEach((fn) => fn());
    disposables.forEach((d) => d.dispose());
    if (renderer) {
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    }
  };

  const init = async () => {
    /* ---------- Renderer ---------- */
    try {
      renderer = new WebGLRenderer({ antialias: !lite, alpha: true, powerPreference: lite ? "low-power" : "default" });
    } catch {
      onFail();
      return;
    }
    const gl = renderer;
    // Built-in three.js shaders only, so skip the per-program error queries: they force the page to
    // wait for the GPU driver to finish compiling (seconds for the PBR shaders on some Windows GPUs).
    gl.debug.checkShaderErrors = false;
    let width = mount.clientWidth || 800;
    let height = mount.clientHeight || 700;
    /** Current pixel-ratio ceiling. Lowered by `degrade()` if the device can't keep up. */
    let pixelCap = lite ? 1.25 : 1.5;
    gl.setPixelRatio(Math.min(window.devicePixelRatio, pixelCap));
    gl.setSize(width, height, false);
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.08;
    Object.assign(gl.domElement.style, { width: "100%", height: "100%", display: "block" });

    await nextTask();
    if (disposed) return;

    /* ---------- Environment (reflections for the metals) ---------- */
    // Full quality: physically based metals lit by a generated room environment.
    // Lite: matcap shading (a painted "lit sphere" texture). It reads as polished gold on a phone
    // screen but needs no environment pre-render and compiles in milliseconds — the PBR path
    // blocked a phone's main thread for over a second while it set up.
    //
    // RoomEnvironment is imported here, inside the branch, so it lands in its own file that lite
    // devices never request. (PMREMGenerator is imported from the "three" barrel above: pulling
    // it from `three/src/...` instead would bundle a second copy of half the library.)
    const scene = new Scene();
    if (!lite) {
      const baked = await prewarmEnvironment();
      envBake = null; // the texture now belongs to this scene and is disposed with it
      if (disposed) {
        baked?.dispose();
        return;
      }
      if (baked) {
        scene.environment = track(baked);
      } else {
        // Fallback: bake on the main thread (blocks for a moment while the shaders compile).
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
        if (disposed) return;
        const pmrem = track(new PMREMGenerator(gl));
        const room = new RoomEnvironment();
        scene.environment = track(pmrem.fromScene(room, 0.04).texture);
        (room as unknown as { dispose?: () => void }).dispose?.();
      }
      await nextTask();
      if (disposed) return;
    }

    const camera = new PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0, 10);

    /* ---------- Materials ---------- */
    const matcap = (stops: [number, string][], rim: string) => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d");
      if (ctx) {
        const base = ctx.createRadialGradient(98, 84, 2, 128, 128, 128);
        for (const [o, col] of stops) base.addColorStop(o, col);
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 256, 256);
        const edge = ctx.createRadialGradient(150, 160, 70, 128, 128, 128);
        edge.addColorStop(0, "rgba(0,0,0,0)");
        edge.addColorStop(0.82, "rgba(0,0,0,0)");
        edge.addColorStop(1, rim);
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, 256, 256);
      }
      const tex = track(new CanvasTexture(c));
      tex.colorSpace = SRGBColorSpace;
      return tex;
    };
    const gold = track(
      lite
        ? new MeshMatcapMaterial({
            matcap: matcap(
              [
                [0, "#fff4d8"],
                [0.12, "#f2d697"],
                [0.34, "#d6ad66"],
                [0.64, "#946c33"],
                [0.88, "#4b3417"],
                [1, "#2b1e0c"],
              ],
              "rgba(255, 222, 160, 0.55)",
            ),
            toneMapped: false,
          })
        : new MeshStandardMaterial({ color: 0xd8b26c, metalness: 1, roughness: 0.26, envMapIntensity: 1.25 }),
    );
    const goldSoft = track(
      lite
        ? new MeshMatcapMaterial({
            matcap: matcap(
              [
                [0, "#f5e3b8"],
                [0.16, "#dcb978"],
                [0.4, "#b88c4b"],
                [0.7, "#7a5628"],
                [1, "#2a1c0b"],
              ],
              "rgba(240, 205, 140, 0.4)",
            ),
            toneMapped: false,
          })
        : new MeshStandardMaterial({ color: 0xb98d4a, metalness: 1, roughness: 0.42, envMapIntensity: 1 }),
    );
    const obsidian = track(
      lite
        ? new MeshMatcapMaterial({
            matcap: matcap(
              [
                [0, "#a49886"],
                [0.05, "#3e362c"],
                [0.2, "#16130f"],
                [0.7, "#0a0908"],
                [1, "#100d09"],
              ],
              "rgba(227, 190, 120, 0.42)",
            ),
            toneMapped: false,
          })
        : new MeshPhysicalMaterial({
            color: 0x0c0b0a,
            metalness: 0.25,
            roughness: 0.18,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
            envMapIntensity: 1.1,
          }),
    );
    const engraving = track(new LineBasicMaterial({ color: 0xe3c88c, transparent: true, opacity: 0.22 }));

    /* ---------- Scene graph ---------- */
    // Tessellation is set to the point where more segments stop being visible at this size on a
    // 1.5x-capped canvas. The ring torus dominated the vertex count, so it is cut the hardest.
    const root = new Group();
    root.rotation.z = 0.32;
    scene.add(root);

    // Obsidian core + engraved meridians
    const coreSegments = lite ? 40 : 64;
    root.add(new Mesh(track(new SphereGeometry(1.08, coreSegments, coreSegments)), obsidian));

    // Gold atmosphere: a back-face fresnel shell that glows at the core's silhouette and fades
    // outward, plus a fine rim of light on the core itself. Plain additive shaders, no textures.
    const fresnelVertex = /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`;
    const atmosphereMat = track(
      new ShaderMaterial({
        uniforms: { uIntensity: { value: 0 } },
        vertexShader: fresnelVertex,
        fragmentShader: /* glsl */ `
          uniform float uIntensity;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            float f = pow(clamp(-dot(normalize(vN), normalize(vV)), 0.0, 1.0), 2.2);
            gl_FragColor = vec4(0.93, 0.78, 0.5, f * uIntensity);
          }`,
        side: BackSide,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    const atmosphere = new Mesh(track(new SphereGeometry(1.46, 48, 48)), atmosphereMat);
    root.add(atmosphere);
    const rimMat = track(
      new ShaderMaterial({
        uniforms: { uIntensity: { value: 0 } },
        vertexShader: fresnelVertex,
        fragmentShader: /* glsl */ `
          uniform float uIntensity;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0), 3.2);
            gl_FragColor = vec4(1.0, 0.86, 0.6, f * uIntensity);
          }`,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    root.add(new Mesh(track(new SphereGeometry(1.086, coreSegments, coreSegments)), rimMat));

    const engraved = new Group();
    const circlePoints = (radius: number, segments = lite ? 80 : 128) => {
      const pts: Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      return pts;
    };
    for (const lat of [-60, -30, 0, 30, 60]) {
      const phi = (lat * Math.PI) / 180;
      const line = new Line(track(new BufferGeometry().setFromPoints(circlePoints(1.095 * Math.cos(phi)))), engraving);
      line.position.y = 1.095 * Math.sin(phi);
      engraved.add(line);
    }
    for (let i = 0; i < 6; i++) {
      const line = new Line(track(new BufferGeometry().setFromPoints(circlePoints(1.095))), engraving);
      line.rotation.z = Math.PI / 2;
      line.rotation.y = (i / 6) * Math.PI;
      engraved.add(line);
    }
    // A fine gold band at the equator, like the girdle of a cut stone.
    const girdle = new Mesh(track(new TorusGeometry(1.1, 0.008, 6, lite ? 96 : 160)), gold);
    girdle.rotation.x = Math.PI / 2;
    engraved.add(girdle);
    root.add(engraved);

    // Halo sprite behind the core
    const haloCanvas = document.createElement("canvas");
    haloCanvas.width = haloCanvas.height = 256;
    const hctx = haloCanvas.getContext("2d");
    if (hctx) {
      const g = hctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, "rgba(232, 200, 140, 0.55)");
      g.addColorStop(0.35, "rgba(212, 173, 102, 0.18)");
      g.addColorStop(1, "rgba(212, 173, 102, 0)");
      hctx.fillStyle = g;
      hctx.fillRect(0, 0, 256, 256);
    }
    const haloTex = track(new CanvasTexture(haloCanvas));
    const haloMat = track(new SpriteMaterial({ map: haloTex, blending: AdditiveBlending, depthWrite: false, transparent: true }));
    const halo = new Sprite(haloMat);
    halo.scale.setScalar(5.6);
    halo.position.z = -1.2;
    root.add(halo);

    // Precessing rings with orbiting beads. Each bead glows and drags a fading streak of light
    // along its ring, like a comet riding the orbit.
    const beadSegments = lite ? 10 : 16;
    const beadGeo = track(new SphereGeometry(0.075, beadSegments, beadSegments));
    const beadGlowMat = track(
      new SpriteMaterial({ map: haloTex, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.95, toneMapped: false }),
    );
    const TRAIL_ARC = 1.2;
    const trailMat = track(new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    /** A partial torus whose vertex colours fade from bright gold at the head to nothing at the tail. */
    const trailGeometry = (radius: number, tube: number, headAtEnd: boolean) => {
      const geo = track(new TorusGeometry(radius, tube, 6, lite ? 48 : 72, TRAIL_ARC));
      const pos = geo.getAttribute("position");
      const colors = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const u = Math.min(1, Math.max(0, Math.atan2(pos.getY(i), pos.getX(i)) / TRAIL_ARC));
        const k = Math.pow(headAtEnd ? u : 1 - u, 2.4);
        colors[i * 3] = k;
        colors[i * 3 + 1] = 0.8 * k;
        colors[i * 3 + 2] = 0.48 * k;
      }
      geo.setAttribute("color", new BufferAttribute(colors, 3));
      return geo;
    };
    const ringSpecs = [
      { r: 2.05, tube: 0.024, tilt: [Math.PI / 2, 0, 0], spin: 0.22, precess: 0.05, beads: 1 },
      { r: 2.32, tube: 0.018, tilt: [0.45, 0.7, 0], spin: -0.16, precess: -0.07, beads: 2 },
      { r: 2.56, tube: 0.014, tilt: [1.2, -0.5, 0.3], spin: 0.12, precess: 0.04, beads: 1 },
    ];
    const rings = ringSpecs.map((spec, i) => {
      const pivot = new Group();
      pivot.rotation.set(spec.tilt[0], spec.tilt[1], spec.tilt[2]);
      const spinner = new Group();
      const ringGeo = track(new TorusGeometry(spec.r, spec.tube, lite ? 8 : 12, lite ? 120 : 180));
      spinner.add(new Mesh(ringGeo, i === 1 ? goldSoft : gold));
      // Positive spin turns the ring anticlockwise, so the streak trails at smaller angles.
      const forward = spec.spin > 0;
      const trailGeo = trailGeometry(spec.r, spec.tube * 1.7, forward);
      for (let b = 0; b < spec.beads; b++) {
        const bead = new Mesh(beadGeo, gold);
        const a = (b / spec.beads) * Math.PI * 2 + i;
        bead.position.set(Math.cos(a) * spec.r, Math.sin(a) * spec.r, 0);
        spinner.add(bead);
        const glow = new Sprite(beadGlowMat);
        glow.position.copy(bead.position);
        glow.scale.setScalar(0.7);
        spinner.add(glow);
        const trail = new Mesh(trailGeo, trailMat);
        trail.rotation.z = forward ? a - TRAIL_ARC : a;
        spinner.add(trail);
      }
      pivot.add(spinner);
      root.add(pivot);
      return { pivot, spinner, spec };
    });

    // Watch-bezel tick ring
    const TICKS = 96;
    const ticks = track(new InstancedMesh(track(new BoxGeometry(0.014, 0.014, 0.16)), goldSoft, TICKS));
    const m = new Matrix4();
    const q = new Quaternion();
    const s = new Vector3();
    const p = new Vector3();
    const up = new Vector3(0, 1, 0);
    for (let i = 0; i < TICKS; i++) {
      const a = (i / TICKS) * Math.PI * 2;
      const major = i % 8 === 0;
      p.set(Math.cos(a) * 3.02, 0, Math.sin(a) * 3.02);
      q.setFromAxisAngle(up, -a + Math.PI / 2);
      s.set(major ? 1.8 : 1, major ? 1.8 : 1, major ? 1.9 : 1);
      m.compose(p, q, s);
      ticks.setMatrixAt(i, m);
    }
    const bezel = new Group();
    bezel.add(ticks);
    bezel.rotation.x = 0.28;
    root.add(bezel);

    // Signal pulses: thin gold rings that leave the core and travel out to the bezel, one every few
    // seconds, as if the instrument were broadcasting. Drawn in the bezel's plane.
    const PULSE_PERIOD = 7;
    const PULSE_FROM = 1.15;
    const PULSE_TO = 3.0;
    const pulseGeo = track(new RingGeometry(0.972, 1, lite ? 96 : 160));
    const pulses = [0, 0.5].map((offset) => {
      const mat = track(
        new MeshBasicMaterial({
          color: 0xe8c88c,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
          side: DoubleSide,
          toneMapped: false,
        }),
      );
      const mesh = new Mesh(pulseGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      bezel.add(mesh);
      return { mesh, mat, offset };
    });

    // Gold dust: soft round motes that twinkle on their own rhythm, with a few large out-of-focus
    // ones for depth. One draw call; the twinkle runs in the vertex shader.
    const DUST = lite ? 160 : window.innerWidth < 768 ? 220 : 420;
    const dustPositions = new Float32Array(DUST * 3);
    const dustPhase = new Float32Array(DUST);
    const dustSize = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      const r = 3.2 + Math.random() * 4.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      dustPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      dustPositions[i * 3 + 1] = r * Math.cos(phi) * 0.7;
      dustPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 1;
      dustPhase[i] = Math.random();
      dustSize[i] = Math.random() < 0.07 ? 0.18 + Math.random() * 0.16 : 0.04 + Math.random() * 0.06;
    }
    const dustGeo = track(new BufferGeometry());
    dustGeo.setAttribute("position", new BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute("aPhase", new BufferAttribute(dustPhase, 1));
    dustGeo.setAttribute("aSize", new BufferAttribute(dustSize, 1));
    const dustMat = track(
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uScale: { value: 400 }, uOpacity: { value: 0 } },
        vertexShader: /* glsl */ `
          uniform float uTime;
          uniform float uScale;
          attribute float aPhase;
          attribute float aSize;
          varying float vAlpha;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            float twinkle = 0.5 + 0.5 * sin(uTime * (0.6 + aPhase * 1.2) + aPhase * 6.2831);
            vAlpha = (0.35 + 0.65 * twinkle) * (aSize > 0.15 ? 0.22 : 1.0);
            gl_PointSize = min(aSize * uScale / -mv.z, 48.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uOpacity;
          varying float vAlpha;
          void main() {
            float a = 1.0 - smoothstep(0.0, 0.5, length(gl_PointCoord - 0.5));
            gl_FragColor = vec4(0.94, 0.8, 0.56, a * a * vAlpha * uOpacity);
          }`,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    const dust = new Points(dustGeo, dustMat);
    scene.add(dust);

    /* ---------- Lights (env map does most of the work; matcaps need none) ---------- */
    if (!lite) {
      const key = new DirectionalLight(0xfff0d2, 2.2);
      key.position.set(4, 5, 6);
      scene.add(key);
      const rim = new PointLight(0xd4ad66, 30, 30, 2);
      rim.position.set(-5, -2, -3);
      scene.add(rim);
    }
    // A slow-travelling highlight that glides across the metals, like light catching a watch case.
    const sweep = lite ? null : new PointLight(0xfff0d2, 18, 14, 2);
    if (sweep) scene.add(sweep);

    /* ---------- Frame ---------- */
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let elapsed = 0;
    let baseScale = 1;
    const frame = () => {
      const t = elapsed;
      // Entrance: the instrument eases up to size and its rings unwind from a faster spin.
      const k = reducedMotion ? 1 : Math.min(1, t / 2.2);
      const intro = 1 - Math.pow(1 - k, 3);
      root.scale.setScalar(baseScale * (0.84 + 0.16 * intro));
      dustMat.uniforms.uOpacity.value = intro;
      dustMat.uniforms.uTime.value = t;
      if (sweep) sweep.position.set(Math.cos(t * 0.35) * 5, Math.sin(t * 0.22) * 3, 4.5);
      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;
      // A touch of camera parallax so the dust and the instrument separate in depth as the mouse moves.
      camera.position.set(current.x * 0.9, -current.y * 0.55, 10);
      camera.lookAt(0, 0, 0);
      root.rotation.y = t * 0.06 + current.x * 0.5;
      root.rotation.x = Math.sin(t * 0.2) * 0.06 + current.y * 0.35;
      for (const r of rings) {
        r.spinner.rotation.z = t * r.spec.spin + (1 - intro) * r.spec.spin * 14;
        r.pivot.rotation.y = r.spec.tilt[1] + t * r.spec.precess;
      }
      // Pulses start once the entrance has settled; the core's rim flares as each one leaves.
      let flare = 0;
      for (const pl of pulses) {
        const local = t - 2.4 - pl.offset * PULSE_PERIOD;
        if (reducedMotion || local < 0) {
          pl.mesh.visible = false;
          continue;
        }
        const ph = (local % PULSE_PERIOD) / PULSE_PERIOD;
        const eased = 1 - Math.pow(1 - ph, 2.2);
        pl.mesh.visible = true;
        pl.mesh.scale.setScalar(PULSE_FROM + (PULSE_TO - PULSE_FROM) * eased);
        pl.mat.opacity = 0.85 * Math.pow(1 - ph, 1.4) * Math.min(1, ph * 12);
        flare = Math.max(flare, Math.pow(Math.max(0, 1 - ph * 5), 2));
      }
      const breathe = 0.9 + Math.sin(t * 1.2) * 0.1;
      atmosphereMat.uniforms.uIntensity.value = 1.25 * intro * breathe + flare * 0.5;
      rimMat.uniforms.uIntensity.value = (0.7 + flare * 0.6) * intro;
      beadGlowMat.opacity = 0.95 * intro;
      bezel.rotation.y = -t * 0.035;
      engraved.rotation.y = t * 0.08;
      halo.material.opacity = 0.85 + Math.sin(t * 1.2) * 0.15;
      dust.rotation.y = t * 0.012;
      dust.rotation.x = current.y * 0.08;
      gl.render(scene, camera);
    };

    /* ---------- Layout ---------- */
    const applySize = () => {
      gl.setPixelRatio(Math.min(window.devicePixelRatio, pixelCap));
      gl.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      baseScale = width < 640 ? 0.78 : 1;
      // Dust sizes are in world units; this converts them to pixels at the current resolution.
      dustMat.uniforms.uScale.value = height * gl.getPixelRatio() * 0.5;
    };
    applySize();

    // Compile shaders without blocking input where the browser supports parallel compilation.
    try {
      await gl.compileAsync(scene, camera);
    } catch {
      /* compiled on first render instead */
    }
    await nextTask();
    if (disposed) return;

    /* ---------- Loop ---------- */
    // Lite runs at 30 fps, paced by a timer so the browser isn't woken for a frame it then skips,
    // and holds still while the page is being scrolled (the GPU goes to smooth scrolling instead).
    let frameInterval = lite ? 1000 / 30 : 0;
    let raf = 0;
    let timer = 0;
    let running = false;
    let visible = true;
    let prevNow = 0;
    let quietUntil = 0;
    let reducedMotion = reduced;

    /* ---------- Adaptive quality ---------- */
    // The quality tier is chosen up front from device memory and core count, which is a guess.
    // This measures what the device actually delivers and steps down if it can't keep up, so a
    // struggling machine ends up smooth instead of stuttering for the whole visit.
    const frameBudget = lite ? 1000 / 30 : 1000 / 60;
    let tier = 0;
    let slow = 0;
    let sampled = 0;

    const degrade = () => {
      if (tier >= 2) return;
      tier += 1;
      if (tier === 1) pixelCap = lite ? 1 : 1.1; // fewer pixels is the cheapest win
      else frameInterval = Math.max(frameInterval, 1000 / 30); // then halve the frame rate
      applySize();
      slow = 0;
      sampled = 0;
    };

    const loop = (now: number) => {
      raf = 0;
      if (!running) return;
      if (now >= quietUntil) {
        const delta = prevNow ? now - prevNow : 0;
        // Resume where it paused instead of jumping (caps long gaps, e.g. a backgrounded tab).
        elapsed += prevNow ? Math.min(delta, 100) / 1000 : 1 / 60;
        frame();
        // Ignore the first second: shader compilation and first-paint work are not steady state.
        if (tier < 2 && delta > 0 && delta < 500) {
          sampled += 1;
          if (sampled > 60) {
            if (delta > frameBudget * 1.6) slow += 1;
            else if (slow > 0) slow -= 1;
            if (slow >= 30) degrade();
          }
        }
      }
      prevNow = now;
      if (frameInterval) timer = window.setTimeout(() => (raf = requestAnimationFrame(loop)), frameInterval - 6);
      else raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reducedMotion || !visible || document.hidden || disposed) return;
      running = true;
      prevNow = 0;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
    teardown.push(stop);
    const onScroll = () => {
      if (lite) quietUntil = performance.now() + 180;
    };

    const ro = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h || (w === width && h === height)) return;
      width = w;
      height = h;
      applySize();
      if (!running) frame();
    });
    const io = new IntersectionObserver(
      (entries) => {
        visible = Boolean(entries[0]?.isIntersecting);
        if (visible) start();
        else stop();
      },
      { threshold: 0.01 },
    );
    // Mouse only — on touch screens the scene shouldn't chase the finger while scrolling.
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    // Reduced motion can be switched on mid-visit; honour it without needing a reload.
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      reducedMotion = motion.matches;
      if (reducedMotion) {
        stop();
        frame(); // leave a still frame on screen rather than a blank canvas
      } else {
        start();
      }
    };

    mount.appendChild(gl.domElement);
    frame(); // first paint (and the only one with reduced motion)
    onReady();

    ro.observe(mount);
    io.observe(mount);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", onMotionChange);
    teardown.push(() => {
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotionChange);
    });
    start();
  };

  void init().catch(() => {
    if (!disposed) onFail();
    destroy();
  });

  return destroy;
}
