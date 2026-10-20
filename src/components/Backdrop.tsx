/**
 * Fixed ambient backdrop: warm gold glows, architectural column lines,
 * film grain and a vignette. Rendered once behind the whole site.
 */
export default function Backdrop() {
  return (
    <div className="nf-backdrop" aria-hidden="true">
      <div className="nf-glow nf-glow-a" />
      <div className="nf-glow nf-glow-b" />
      <div className="nf-lines" />
      <div className="nf-grain" />
      <div className="nf-vignette" />
    </div>
  );
}
