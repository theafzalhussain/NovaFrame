/// <reference lib="webworker" />
/**
 * Bakes the hero scene's reflection map (a PMREM of three.js's RoomEnvironment) off the main thread.
 *
 * PMREMGenerator.fromScene() is synchronous and, on its first call, compiles several shaders. On the
 * main thread that froze the page for 1.4–1.9 s in Lighthouse's desktop run (a second call takes
 * ~7 ms, so the time is all compilation). Here it runs on an OffscreenCanvas in this worker; the
 * page only receives the finished pixels and uploads them as a texture.
 *
 * Replies with { width, height, data } (RGBA half floats, the PMREM's own layout) or { error }.
 */
import { DataUtils, PMREMGenerator, WebGLRenderer } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = () => {
  let renderer: WebGLRenderer | null = null;
  try {
    renderer = new WebGLRenderer({ canvas: new OffscreenCanvas(1, 1), antialias: false, alpha: true });
    renderer.debug.checkShaderErrors = false;
    const pmrem = new PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04); // same arguments as the main-thread fallback
    const { width, height } = target;

    // RGBA/FLOAT is the read format WebGL 2 guarantees for float colour buffers (the target is
    // half-float); the floats are packed back to halves so the texture matches the original.
    const gl = renderer.getContext() as WebGL2RenderingContext;
    renderer.setRenderTarget(target);
    const floats = new Float32Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, floats);
    renderer.setRenderTarget(null);
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new Error(`readPixels failed (${error})`);

    const halves = new Uint16Array(floats.length);
    for (let i = 0; i < floats.length; i++) halves[i] = DataUtils.toHalfFloat(floats[i]);

    target.dispose();
    pmrem.dispose();
    room.dispose();
    scope.postMessage({ width, height, data: halves }, [halves.buffer]);
  } catch (err) {
    scope.postMessage({ error: String(err) });
  } finally {
    renderer?.dispose();
  }
};
