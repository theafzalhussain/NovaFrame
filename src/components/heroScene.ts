import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * "The Armillary" — a real-time WebGL centrepiece.
 * Polished obsidian core with engraved meridians, precessing gold rings
 * with orbiting beads, a watch-bezel tick ring, a soft halo and drifting
 * gold dust. Pauses off-screen, respects reduced motion, cleans up fully.
 *
 * Loaded on demand by <HeroCanvas>, so three.js stays out of the main bundle.
 *  - "full": desktops/laptops and large tablets — physically based metals, the original look.
 *  - "lite": phones, small tablets and low-end machines — matcap-shaded metals (no environment
 *    pre-render), lighter geometry, capped pixel ratio, no MSAA, 30 fps. On a phone the scene sits
 *    at 45% opacity behind the headline, so it reads the same at a fraction of the cost.
 *
 * Set-up is split into short tasks (and shaders compile asynchronously where the browser
 * supports it), so a tap that lands while the scene is starting is handled straight away.
 */
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
  let renderer: THREE.WebGLRenderer | null = null;

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
      renderer = new THREE.WebGLRenderer({ antialias: !lite, alpha: true, powerPreference: lite ? "low-power" : "default" });
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
    gl.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1.25 : 1.5));
    gl.setSize(width, height, false);
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.08;
    Object.assign(gl.domElement.style, { width: "100%", height: "100%", display: "block" });

    await nextTask();
    if (disposed) return;

    /* ---------- Environment (reflections for the metals) ---------- */
    // Full quality: physically based metals lit by a generated room environment.
    // Lite: matcap shading (a painted "lit sphere" texture). It reads as polished gold on a phone
    // screen but needs no environment pre-render and compiles in milliseconds — the PBR path
    // blocked a phone's main thread for over a second while it set up.
    const scene = new THREE.Scene();
    if (!lite) {
      const pmrem = track(new THREE.PMREMGenerator(gl));
      const room = new RoomEnvironment();
      scene.environment = track(pmrem.fromScene(room, 0.04).texture);
      (room as unknown as { dispose?: () => void }).dispose?.();
      await nextTask();
      if (disposed) return;
    }

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
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
      const tex = track(new THREE.CanvasTexture(c));
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };
    const gold = track(
      lite
        ? new THREE.MeshMatcapMaterial({
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
        : new THREE.MeshStandardMaterial({ color: 0xd8b26c, metalness: 1, roughness: 0.26, envMapIntensity: 1.25 }),
    );
    const goldSoft = track(
      lite
        ? new THREE.MeshMatcapMaterial({
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
        : new THREE.MeshStandardMaterial({ color: 0xb98d4a, metalness: 1, roughness: 0.42, envMapIntensity: 1 }),
    );
    const obsidian = track(
      lite
        ? new THREE.MeshMatcapMaterial({
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
        : new THREE.MeshPhysicalMaterial({
            color: 0x0c0b0a,
            metalness: 0.25,
            roughness: 0.14,
            clearcoat: 1,
            clearcoatRoughness: 0.06,
            envMapIntensity: 1.1,
          }),
    );
    const engraving = track(new THREE.LineBasicMaterial({ color: 0xe3c88c, transparent: true, opacity: 0.22 }));

    /* ---------- Scene graph ---------- */
    const root = new THREE.Group();
    root.rotation.z = 0.32;
    scene.add(root);

    // Obsidian core + engraved meridians
    const coreSegments = lite ? 48 : 96;
    root.add(new THREE.Mesh(track(new THREE.SphereGeometry(1.08, coreSegments, coreSegments)), obsidian));

    const engraved = new THREE.Group();
    const circlePoints = (radius: number, segments = lite ? 96 : 160) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      return pts;
    };
    for (const lat of [-60, -30, 0, 30, 60]) {
      const phi = (lat * Math.PI) / 180;
      const line = new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(circlePoints(1.095 * Math.cos(phi)))), engraving);
      line.position.y = 1.095 * Math.sin(phi);
      engraved.add(line);
    }
    for (let i = 0; i < 6; i++) {
      const line = new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(circlePoints(1.095))), engraving);
      line.rotation.z = Math.PI / 2;
      line.rotation.y = (i / 6) * Math.PI;
      engraved.add(line);
    }
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
    const haloMat = track(
      new THREE.SpriteMaterial({ map: track(new THREE.CanvasTexture(haloCanvas)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
    );
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(5.6);
    halo.position.z = -1.2;
    root.add(halo);

    // Precessing rings with orbiting beads
    const beadSegments = lite ? 12 : 24;
    const beadGeo = track(new THREE.SphereGeometry(0.075, beadSegments, beadSegments));
    const ringSpecs = [
      { r: 2.05, tube: 0.024, tilt: [Math.PI / 2, 0, 0], spin: 0.22, precess: 0.05, beads: 1 },
      { r: 2.32, tube: 0.018, tilt: [0.45, 0.7, 0], spin: -0.16, precess: -0.07, beads: 2 },
      { r: 2.56, tube: 0.014, tilt: [1.2, -0.5, 0.3], spin: 0.12, precess: 0.04, beads: 1 },
    ];
    const rings = ringSpecs.map((spec, i) => {
      const pivot = new THREE.Group();
      pivot.rotation.set(spec.tilt[0], spec.tilt[1], spec.tilt[2]);
      const spinner = new THREE.Group();
      const ringGeo = track(new THREE.TorusGeometry(spec.r, spec.tube, lite ? 10 : 24, lite ? 160 : 260));
      spinner.add(new THREE.Mesh(ringGeo, i === 1 ? goldSoft : gold));
      for (let b = 0; b < spec.beads; b++) {
        const bead = new THREE.Mesh(beadGeo, gold);
        const a = (b / spec.beads) * Math.PI * 2 + i;
        bead.position.set(Math.cos(a) * spec.r, Math.sin(a) * spec.r, 0);
        spinner.add(bead);
      }
      pivot.add(spinner);
      root.add(pivot);
      return { pivot, spinner, spec };
    });

    // Watch-bezel tick ring
    const TICKS = 96;
    const ticks = track(new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.014, 0.014, 0.16)), goldSoft, TICKS));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < TICKS; i++) {
      const a = (i / TICKS) * Math.PI * 2;
      const major = i % 8 === 0;
      p.set(Math.cos(a) * 3.02, 0, Math.sin(a) * 3.02);
      q.setFromAxisAngle(up, -a + Math.PI / 2);
      s.set(major ? 1.8 : 1, major ? 1.8 : 1, major ? 1.9 : 1);
      m.compose(p, q, s);
      ticks.setMatrixAt(i, m);
    }
    const bezel = new THREE.Group();
    bezel.add(ticks);
    bezel.rotation.x = 0.28;
    root.add(bezel);

    // Gold dust
    const DUST = lite ? 160 : window.innerWidth < 768 ? 220 : 520;
    const dustPositions = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      const r = 3.2 + Math.random() * 4.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      dustPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      dustPositions[i * 3 + 1] = r * Math.cos(phi) * 0.7;
      dustPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 1;
    }
    const dustGeo = track(new THREE.BufferGeometry());
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = track(
      new THREE.PointsMaterial({ color: 0xe3c88c, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    /* ---------- Lights (env map does most of the work; matcaps need none) ---------- */
    if (!lite) {
      const key = new THREE.DirectionalLight(0xfff0d2, 2.2);
      key.position.set(4, 5, 6);
      scene.add(key);
      const rim = new THREE.PointLight(0xd4ad66, 30, 30, 2);
      rim.position.set(-5, -2, -3);
      scene.add(rim);
    }

    /* ---------- Frame ---------- */
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let elapsed = 0;
    const frame = () => {
      const t = elapsed;
      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;
      root.rotation.y = t * 0.06 + current.x * 0.5;
      root.rotation.x = Math.sin(t * 0.2) * 0.06 + current.y * 0.35;
      for (const r of rings) {
        r.spinner.rotation.z = t * r.spec.spin;
        r.pivot.rotation.y = r.spec.tilt[1] + t * r.spec.precess;
      }
      bezel.rotation.y = -t * 0.035;
      engraved.rotation.y = t * 0.08;
      halo.material.opacity = 0.85 + Math.sin(t * 1.2) * 0.15;
      dust.rotation.y = t * 0.012;
      dust.rotation.x = current.y * 0.08;
      gl.render(scene, camera);
    };

    /* ---------- Layout ---------- */
    const applySize = () => {
      gl.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      root.scale.setScalar(width < 640 ? 0.78 : 1);
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
    const frameInterval = lite ? 1000 / 30 : 0;
    let raf = 0;
    let timer = 0;
    let running = false;
    let visible = true;
    let prevNow = 0;
    let quietUntil = 0;

    const loop = (now: number) => {
      raf = 0;
      if (!running) return;
      if (now >= quietUntil) {
        // Resume where it paused instead of jumping (caps long gaps, e.g. a backgrounded tab).
        elapsed += prevNow ? Math.min(now - prevNow, 100) / 1000 : 1 / 60;
        frame();
      }
      prevNow = now;
      if (frameInterval) timer = window.setTimeout(() => (raf = requestAnimationFrame(loop)), frameInterval - 6);
      else raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduced || !visible || document.hidden || disposed) return;
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

    mount.appendChild(gl.domElement);
    frame(); // first paint (and the only one with reduced motion)
    onReady();

    ro.observe(mount);
    io.observe(mount);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    teardown.push(() => {
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    });
    start();
  };

  void init().catch(() => {
    if (!disposed) onFail();
    destroy();
  });

  return destroy;
}
