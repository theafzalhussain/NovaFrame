import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * High-performance 3D WebGL Canvas powered by Three.js
 * Features:
 * - Dual wireframe + tinted polygon geometry
 * - Deep star/particle parallax field with depth layering
 * - Smooth lerped mouse interaction and tilt dynamics
 * - Optimized viewport resize + visibility observer (conserves GPU when offscreen)
 */
export default function HeroCanvas({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    const width = mount.clientWidth || 900;
    const height = mount.clientHeight || 700;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04050b, 0.14);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    /* ---------------- Core Geometry ---------------- */
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Outer lattice
    const outerGeo = new THREE.IcosahedronGeometry(2.1, 1);
    const outerWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(outerGeo),
      new THREE.LineBasicMaterial({
        color: 0x818cf8,
        transparent: true,
        opacity: 0.65,
      }),
    );
    rootGroup.add(outerWire);

    // Mid faceted crystal
    const midGeo = new THREE.IcosahedronGeometry(1.5, 2);
    const midMat = new THREE.MeshBasicMaterial({
      color: 0x090c1f,
      wireframe: false,
      transparent: true,
      opacity: 0.88,
    });
    const midMesh = new THREE.Mesh(midGeo, midMat);
    rootGroup.add(midMesh);

    // Inner glowing power core
    const coreGeo = new THREE.IcosahedronGeometry(0.72, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.45,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rootGroup.add(coreMesh);

    // Vertex points glow
    const vertexPositions = new Float32Array(outerGeo.attributes.position.array);
    const vertexGeo = new THREE.BufferGeometry();
    vertexGeo.setAttribute("position", new THREE.BufferAttribute(vertexPositions, 3));
    const vertexPoints = new THREE.Points(
      vertexGeo,
      new THREE.PointsMaterial({
        color: 0xc7d2fe,
        size: 0.065,
        transparent: true,
        opacity: 0.9,
      }),
    );
    rootGroup.add(vertexPoints);

    /* ---------------- Particle Stars Field ---------------- */
    const STAR_COUNT = 750;
    const starPositions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 26;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xa5b4ff,
      size: 0.038,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    /* ---------------- Orbiting Ring ---------------- */
    const ringGeo = new THREE.TorusGeometry(2.7, 0.015, 12, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.8;
    rootGroup.add(ringMesh);

    /* ---------------- Parallax State ---------------- */
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const onPointerMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      target.x = (e.clientX - rect.left) / rect.width - 0.5;
      target.y = (e.clientY - rect.top) / rect.height - 0.5;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const onResize = () => {
      const w = mount.clientWidth || width;
      const h = mount.clientHeight || height;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    /* ---------------- Animation Loop ---------------- */
    let raf = 0;
    let running = true;
    const clock = new THREE.Clock();

    const render = () => {
      if (!running) return;
      const t = clock.getElapsedTime();
      const speed = reduced ? 0 : 1;

      // Dampened lerp
      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;

      // Rotation dynamics
      rootGroup.rotation.y = t * 0.18 * speed + current.x * 0.85;
      rootGroup.rotation.x = Math.sin(t * 0.2) * 0.14 * speed + current.y * 0.5;
      rootGroup.rotation.z = Math.cos(t * 0.16) * 0.08 * speed;

      // Breathing inner glow
      coreMesh.scale.setScalar(1 + Math.sin(t * 2) * 0.09 * speed);
      coreMat.opacity = 0.35 + Math.abs(Math.sin(t * 1.5)) * 0.22;

      // Ring counter-rotation
      ringMesh.rotation.z = -t * 0.25 * speed;

      // Starfield subtle float
      starField.rotation.y = t * 0.02 * speed;
      starField.rotation.x = current.y * 0.06;

      // Camera parallax
      camera.position.x += (current.x * 1.2 - camera.position.x) * 0.045;
      camera.position.y += (-current.y * 0.9 - camera.position.y) * 0.045;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    // Auto-pause when viewport scrolled away
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting;
        if (visible && !running) {
          running = true;
          render();
        } else if (!visible) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.02 },
    );
    io.observe(mount);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      outerGeo.dispose();
      midGeo.dispose();
      coreGeo.dispose();
      ringGeo.dispose();
      starGeo.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden />;
}
