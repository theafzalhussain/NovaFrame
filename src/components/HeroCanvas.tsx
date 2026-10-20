import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * "The Armillary" — a real-time WebGL centrepiece.
 * Polished obsidian core with engraved meridians, precessing gold rings
 * with orbiting beads, a watch-bezel tick ring, a soft halo and drifting
 * gold dust. Pauses off-screen, respects reduced motion, cleans up fully.
 */
export default function HeroCanvas({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return;
    }

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T) => {
      disposables.push(o);
      return o;
    };

    let width = mount.clientWidth || 800;
    let height = mount.clientHeight || 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block" });
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envTexture = pmrem.fromScene(room, 0.04).texture;
    scene.environment = envTexture;
    track(envTexture);

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(0, 0, 10);

    /* ---------- Materials ---------- */
    const gold = track(new THREE.MeshStandardMaterial({ color: 0xd8b26c, metalness: 1, roughness: 0.26, envMapIntensity: 1.25 }));
    const goldSoft = track(new THREE.MeshStandardMaterial({ color: 0xb98d4a, metalness: 1, roughness: 0.42, envMapIntensity: 1 }));
    const obsidian = track(
      new THREE.MeshPhysicalMaterial({
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
    const coreGeo = track(new THREE.SphereGeometry(1.08, 96, 96));
    root.add(new THREE.Mesh(coreGeo, obsidian));

    const engraved = new THREE.Group();
    const circlePoints = (radius: number, segments = 160) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      return pts;
    };
    for (const lat of [-60, -30, 0, 30, 60]) {
      const phi = (lat * Math.PI) / 180;
      const geo = track(new THREE.BufferGeometry().setFromPoints(circlePoints(1.095 * Math.cos(phi))));
      const line = new THREE.Line(geo, engraving);
      line.position.y = 1.095 * Math.sin(phi);
      engraved.add(line);
    }
    for (let i = 0; i < 6; i++) {
      const geo = track(new THREE.BufferGeometry().setFromPoints(circlePoints(1.095)));
      const line = new THREE.Line(geo, engraving);
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
    const haloTexture = track(new THREE.CanvasTexture(haloCanvas));
    const haloMat = track(new THREE.SpriteMaterial({ map: haloTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(5.6);
    halo.position.z = -1.2;
    root.add(halo);

    // Precessing rings with orbiting beads
    const beadGeo = track(new THREE.SphereGeometry(0.075, 24, 24));
    const ringSpecs = [
      { r: 2.05, tube: 0.024, tilt: [Math.PI / 2, 0, 0], spin: 0.22, precess: 0.05, beads: 1 },
      { r: 2.32, tube: 0.018, tilt: [0.45, 0.7, 0], spin: -0.16, precess: -0.07, beads: 2 },
      { r: 2.56, tube: 0.014, tilt: [1.2, -0.5, 0.3], spin: 0.12, precess: 0.04, beads: 1 },
    ];
    const rings = ringSpecs.map((spec, i) => {
      const pivot = new THREE.Group();
      pivot.rotation.set(spec.tilt[0], spec.tilt[1], spec.tilt[2]);
      const spinner = new THREE.Group();
      const ring = new THREE.Mesh(track(new THREE.TorusGeometry(spec.r, spec.tube, 24, 260)), i === 1 ? goldSoft : gold);
      spinner.add(ring);
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
    const tickGeo = track(new THREE.BoxGeometry(0.014, 0.014, 0.16));
    const ticks = new THREE.InstancedMesh(tickGeo, goldSoft, TICKS);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < TICKS; i++) {
      const a = (i / TICKS) * Math.PI * 2;
      const major = i % 8 === 0;
      p.set(Math.cos(a) * 3.02, 0, Math.sin(a) * 3.02);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2);
      s.set(major ? 1.8 : 1, major ? 1.8 : 1, major ? 1.9 : 1);
      m.compose(p, q, s);
      ticks.setMatrixAt(i, m);
    }
    const bezel = new THREE.Group();
    bezel.add(ticks);
    bezel.rotation.x = 0.28;
    root.add(bezel);

    // Gold dust
    const DUST = window.innerWidth < 768 ? 220 : 520;
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
      new THREE.PointsMaterial({
        color: 0xe3c88c,
        size: 0.03,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    /* ---------- Lights (env map does most of the work) ---------- */
    const key = new THREE.DirectionalLight(0xfff0d2, 2.2);
    key.position.set(4, 5, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0xd4ad66, 30, 30, 2);
    rim.position.set(-5, -2, -3);
    scene.add(rim);

    /* ---------- Layout ---------- */
    const layout = () => {
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const small = width < 640;
      root.scale.setScalar(small ? 0.78 : 1);
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(mount);

    /* ---------- Interaction ---------- */
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    /* ---------- Loop ---------- */
    const clock = new THREE.Clock();
    let raf = 0;
    let running = false;
    const frame = () => {
      const t = clock.getElapsedTime();
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
      renderer.render(scene, camera);
    };
    const loop = () => {
      if (!running) return;
      frame();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduced) return;
      running = true;
      clock.start();
      loop();
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    frame(); // first paint (and the only paint for reduced motion)
    const io = new IntersectionObserver((entries) => (entries[0]?.isIntersecting ? start() : stop()), { threshold: 0.01 });
    io.observe(mount);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      ticks.dispose();
      disposables.forEach((d) => d.dispose());
      (room as unknown as { dispose?: () => void }).dispose?.();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  if (failed) {
    return (
      <div className={className} aria-hidden>
        <svg viewBox="0 0 400 400" className="mx-auto h-full max-h-[520px] w-full opacity-80">
          <defs>
            <radialGradient id="hc-core" cx="40%" cy="35%" r="70%">
              <stop offset="0" stopColor="#2a241c" />
              <stop offset="1" stopColor="#080706" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="200" r="70" fill="url(#hc-core)" stroke="rgba(227,200,140,0.35)" />
          {[110, 128, 146].map((r, i) => (
            <ellipse key={r} cx="200" cy="200" rx={r} ry={r * (0.32 + i * 0.18)} fill="none" stroke="#d4ad66" strokeOpacity={0.6 - i * 0.12} transform={`rotate(${-20 + i * 35} 200 200)`} />
          ))}
        </svg>
      </div>
    );
  }

  return <div ref={mountRef} className={className} aria-hidden />;
}
