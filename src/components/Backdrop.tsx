/**
 * Fixed ambient backdrop: warm gold glows, architectural column lines,
 * film grain and a vignette. Rendered once behind the whole site.
 */
export default function Backdrop() {
  return (
    <div className="wx-backdrop" aria-hidden="true">
      <div className="wx-glow wx-glow-a" />
      <div className="wx-glow wx-glow-b" />
      <div className="wx-lines" />
      <div className="wx-grain" />
      <div className="wx-vignette" />
    </div>
  );
}
