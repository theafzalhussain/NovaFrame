import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// A page's code file failed to load. If we're online, a new deploy most likely replaced the files this
// tab was built against — reload once to pick up the new build. (Offline, the page shows a retry button.)
window.addEventListener("vite:preloadError", () => {
  const key = "nf_chunk_reload";
  try {
    if (!navigator.onLine || sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    return;
  }
  window.location.reload();
});

const root = createRoot(document.getElementById("root")!);
const render = () =>
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

// Laying the page out while its web fonts are still downloading, then again when each one lands,
// cost phones several seconds of frozen main thread. The fonts are preloaded in parallel with this
// code, so wait briefly (never more than 1 s) and do the first layout with the real fonts.
const fonts = document.fonts;
if (fonts?.load) {
  const critical = Promise.all(
    ["400 1em Manrope", "400 1em Fraunces", "italic 300 1em Fraunces", '400 1em "JetBrains Mono"'].map((f) => fonts.load(f)),
  );
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    render();
  };
  critical.then(go, go);
  setTimeout(go, 1000);
} else {
  render();
}
