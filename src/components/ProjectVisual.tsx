import type { Project } from "../data/content";

/**
 * Hand-drawn SVG "product screenshot" for each project.
 * Zero network dependency (single-file build safe) aur crisp on every DPI.
 */

const S = {
  bg: "#0a0d1a",
  panel: "#111528",
  panel2: "#161b31",
  line: "rgba(255,255,255,0.07)",
  text: "rgba(233,236,255,0.55)",
  textDim: "rgba(233,236,255,0.22)",
  indigo: "#6366f1",
  cyan: "#22d3ee",
  violet: "#8b5cf6",
  emerald: "#34d399",
  amber: "#fbbf24",
  rose: "#fb7185",
};

function Frame({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 800 500" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0d1024" />
          <stop offset="100%" stopColor="#070915" />
        </linearGradient>
        <linearGradient id={`${id}-acc`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={S.indigo} />
          <stop offset="100%" stopColor={S.cyan} />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={S.indigo} stopOpacity="0.45" />
          <stop offset="100%" stopColor={S.indigo} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={S.cyan} stopOpacity="0.35" />
          <stop offset="100%" stopColor={S.cyan} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill={`url(#${id}-bg)`} />
      {children}
    </svg>
  );
}

function Dashboard({ id }: { id: string }) {
  const pts = "60,150 130,120 200,138 270,96 340,110 410,72 480,86 550,58 620,70 690,44";
  return (
    <Frame id={id}>
      <rect x="0" y="0" width="150" height="500" fill={S.panel} />
      <rect x="0" y="0" width="150" height="56" fill={S.panel2} />
      <circle cx="30" cy="28" r="9" fill={S.indigo} />
      <rect x="48" y="23" width="62" height="10" rx="5" fill={S.textDim} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <rect x="20" y={86 + i * 42} width="14" height="14" rx="4" fill={i === 1 ? S.indigo : S.textDim} />
          <rect x="44" y={89 + i * 42} width={70 - (i % 3) * 12} height="8" rx="4" fill={S.textDim} />
        </g>
      ))}
      <rect x="180" y="30" width="300" height="26" rx="13" fill={S.panel} />
      <rect x="196" y="40" width="90" height="7" rx="3.5" fill={S.textDim} />
      <rect x="620" y="26" width="130" height="34" rx="17" fill={`url(#${id}-acc)`} />

      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={180 + i * 210} y="86" width="190" height="76" rx="12" fill={S.panel} />
          <rect x={198 + i * 210} y="104" width="56" height="7" rx="3.5" fill={S.textDim} />
          <rect x={198 + i * 210} y="122" width="76" height="16" rx="6" fill={i === 1 ? S.cyan : "#e8ebff"} opacity={i === 1 ? 0.85 : 0.9} />
          <rect x={288 + i * 210} y="106" width="60" height="34" rx="8" fill={i === 0 ? S.indigo : i === 1 ? S.emerald : S.violet} opacity="0.28" />
        </g>
      ))}

      <rect x="180" y="186" width="400" height="274" rx="14" fill={S.panel} />
      <polyline points={pts} fill="none" stroke={`url(#${id}-acc)`} strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points={`${pts} 690,440 60,440`} fill={`url(#${id}-fill)`} />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="200" y1={230 + i * 55} x2="560" y2={230 + i * 55} stroke={S.line} />
      ))}
      {[
        [130, 120],
        [270, 96],
        [410, 72],
        [550, 58],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={S.cyan} />
      ))}

      <rect x="600" y="186" width="150" height="274" rx="14" fill={S.panel} />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x="618" y={210 + i * 46} width={90 - i * 12} height="9" rx="4.5" fill={S.textDim} />
          <rect x="618" y={226 + i * 46} width={60 + i * 8} height="7" rx="3.5" fill={S.textDim} opacity="0.6" />
        </g>
      ))}
    </Frame>
  );
}

function Storefront({ id }: { id: string }) {
  const swatches = [S.indigo, S.cyan, S.violet, S.emerald, S.amber, S.rose];
  return (
    <Frame id={id}>
      <rect width="800" height="54" fill={S.panel} />
      <circle cx="42" cy="27" r="10" fill={S.indigo} />
      <rect x="62" y="22" width="66" height="10" rx="5" fill={S.textDim} />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={250 + i * 74} y="22" width="52" height="9" rx="4.5" fill={S.textDim} />
      ))}
      <rect x="706" y="14" width="70" height="26" rx="13" fill={`url(#${id}-acc)`} />

      <rect x="30" y="80" width="740" height="130" rx="16" fill={S.panel2} />
      <circle cx="700" cy="145" r="90" fill={`url(#${id}-glow)`} />
      <rect x="60" y="112" width="220" height="16" rx="8" fill="#e8ebff" opacity="0.92" />
      <rect x="60" y="140" width="150" height="10" rx="5" fill={S.textDim} />
      <rect x="60" y="164" width="96" height="26" rx="13" fill={`url(#${id}-acc)`} />

      {swatches.map((c, i) => (
        <g key={i}>
          <rect x={30 + (i % 3) * 252} y={232 + Math.floor(i / 3) * 132} width="230" height="112" rx="14" fill={S.panel} />
          <rect
            x={30 + (i % 3) * 252}
            y={232 + Math.floor(i / 3) * 132}
            width="230"
            height="66"
            rx="14"
            fill={c}
            opacity="0.3"
          />
          <rect x={46 + (i % 3) * 252} y={306 + Math.floor(i / 3) * 132} width="92" height="9" rx="4.5" fill={S.textDim} />
          <rect x={46 + (i % 3) * 252} y={321 + Math.floor(i / 3) * 132} width="56" height="8" rx="4" fill="#e8ebff" opacity="0.85" />
          <circle cx={238 + (i % 3) * 252} cy={324 + Math.floor(i / 3) * 132} r="12" fill={c} opacity="0.55" />
        </g>
      ))}
    </Frame>
  );
}

function MobileApp({ id }: { id: string }) {
  return (
    <Frame id={id}>
      <circle cx="150" cy="120" r="130" fill={`url(#${id}-glow)`} />
      {[0, 1, 2].map((i) => (
        <g key={i} opacity={i === 1 ? 1 : 0.35}>
          <rect x={i === 1 ? 250 : i === 0 ? 60 : 440} y={70 + (i === 1 ? 0 : 30)} width="210" height="380" rx="28" fill={S.panel} stroke={S.line} />
        </g>
      ))}
      {/* centre phone detail */}
      <rect x="250" y="70" width="210" height="380" rx="28" fill={S.panel} stroke="rgba(255,255,255,0.14)" />
      <rect x="318" y="84" width="74" height="12" rx="6" fill="#070915" />
      <rect x="270" y="112" width="80" height="10" rx="5" fill={S.textDim} />
      <circle cx="300" cy="200" r="42" fill="none" stroke={S.line} strokeWidth="10" />
      <circle cx="300" cy="200" r="42" fill="none" stroke={S.cyan} strokeWidth="10" strokeDasharray="200 264" strokeLinecap="round" transform="rotate(-90 300 200)" />
      <circle cx="300" cy="200" r="27" fill="none" stroke={S.indigo} strokeWidth="10" strokeDasharray="120 170" strokeLinecap="round" transform="rotate(-90 300 200)" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="272" y={264 + i * 46} width="166" height="36" rx="10" fill={S.panel2} />
          <circle cx={292} cy={282 + i * 46} r="9" fill={i === 0 ? S.emerald : i === 1 ? S.amber : S.cyan} opacity="0.7" />
          <rect x={310} y={274 + i * 46} width="86" height="7" rx="3.5" fill={S.textDim} />
          <rect x={310} y={286 + i * 46} width="54" height="6" rx="3" fill={S.textDim} opacity="0.6" />
        </g>
      ))}
      <rect x="270" y="406" width="170" height="30" rx="15" fill={`url(#${id}-acc)`} />
    </Frame>
  );
}

function ThreeD({ id }: { id: string }) {
  const cx = 400;
  const cy = 250;
  const pts: [number, number][] = [];
  const N = 9;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * 150, cy + Math.sin(a) * 62]);
  }
  const pts2: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts2.push([cx + Math.cos(a) * 96, cy + Math.sin(a) * 40]);
  }
  const poly = (arr: [number, number][]) => arr.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <Frame id={id}>
      <circle cx={cx} cy={cy} r="220" fill={`url(#${id}-glow)`} />
      {/* floor grid */}
      {Array.from({ length: 11 }).map((_, i) => (
        <line
          key={i}
          x1={cx - 380 + i * 76}
          y1="470"
          x2={cx - 160 + i * 32}
          y2="300"
          stroke={S.line}
        />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx={cx} cy={392 + i * 16} rx={220 - i * 26} ry={16 + i * 4} fill="none" stroke={S.line} />
      ))}
      <polygon points={poly(pts)} fill="none" stroke={S.indigo} strokeWidth="1.6" opacity="0.9" />
      <polygon points={poly(pts2)} fill="none" stroke={S.cyan} strokeWidth="1.6" opacity="0.8" />
      {pts.map(([x, y], i) => (
        <line key={i} x1={x} y1={y} x2={pts2[i][0]} y2={pts2[i][1]} stroke="rgba(139,92,246,0.55)" />
      ))}
      {pts.concat(pts2).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.4" fill={i % 2 ? S.cyan : "#e8ebff"} opacity="0.9" />
      ))}
      <rect x="60" y="70" width="180" height="14" rx="7" fill="#e8ebff" opacity="0.9" />
      <rect x="60" y="98" width="120" height="9" rx="4.5" fill={S.textDim} />
      <rect x="580" y="404" width="170" height="36" rx="18" fill={`url(#${id}-acc)`} />
    </Frame>
  );
}

function Seo({ id }: { id: string }) {
  const pts = "60,190 140,175 220,150 300,158 380,120 460,112 540,84 620,66 700,50";
  const rows = [1, 2, 3, 4, 5];
  return (
    <Frame id={id}>
      <rect width="800" height="52" fill={S.panel} />
      <rect x="28" y="18" width="120" height="16" rx="8" fill={S.textDim} />
      <rect x="600" y="12" width="172" height="28" rx="14" fill={`url(#${id}-acc)`} />
      <rect x="30" y="80" width="440" height="300" rx="14" fill={S.panel} />
      <rect x="50" y="102" width="150" height="12" rx="6" fill="#e8ebff" opacity="0.9" />
      <polyline points={pts} fill="none" stroke={S.cyan} strokeWidth="2.5" />
      <polygon points={`${pts} 700,360 60,360`} fill={`url(#${id}-fill)`} />
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="50" y1={160 + i * 55} x2="450" y2={160 + i * 55} stroke={S.line} />
      ))}
      <rect x="500" y="80" width="270" height="140" rx="14" fill={S.panel2} />
      <rect x="522" y="104" width="90" height="10" rx="5" fill={S.textDim} />
      <rect x="522" y="128" width="150" height="20" rx="8" fill={S.emerald} opacity="0.75" />
      <rect x="522" y="160" width="110" height="10" rx="5" fill={S.textDim} />
      <rect x="500" y="240" width="270" height="220" rx="14" fill={S.panel} />
      {rows.map((r, i) => (
        <g key={r}>
          <rect x="522" y={266 + i * 38} width="22" height="18" rx="6" fill={i < 3 ? S.indigo : S.textDim} />
          <rect x="554" y={268 + i * 38} width={150 - i * 14} height="9" rx="4.5" fill={S.textDim} />
          <rect x="700" y={267 + i * 38} width="48" height="11" rx="5.5" fill={i < 3 ? S.emerald : S.amber} opacity="0.7" />
        </g>
      ))}
    </Frame>
  );
}

function Video({ id }: { id: string }) {
  const bars = Array.from({ length: 46 }, (_, i) => 14 + Math.abs(Math.sin(i * 1.1)) * 34);
  return (
    <Frame id={id}>
      <rect x="30" y="40" width="740" height="330" rx="16" fill={S.panel2} />
      <circle cx="400" cy="205" r="120" fill={`url(#${id}-glow)`} />
      <polygon points="378,165 378,245 448,205" fill="#ffffff" opacity="0.92" />
      <rect x="30" y="356" width="740" height="14" rx="7" fill={S.panel} />
      <rect x="30" y="356" width="300" height="14" rx="7" fill={`url(#${id}-acc)`} />
      <circle cx="330" cy="363" r="9" fill="#ffffff" />
      {bars.map((h, i) => (
        <rect key={i} x={40 + i * 15.6} y={436 - h} width="6" height={h} rx="3" fill={i % 3 === 0 ? S.cyan : S.indigo} opacity="0.75" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={30 + i * 190} y="380" width="176" height="52" rx="10" fill={S.panel} />
          <rect x={30 + i * 190} y="380" width="52" height="52" rx="10" fill={i % 2 ? S.violet : S.rose} opacity="0.32" />
          <rect x={94 + i * 190} y="396" width="88" height="7" rx="3.5" fill={S.textDim} />
          <rect x={94 + i * 190} y="410" width="56" height="6" rx="3" fill={S.textDim} opacity="0.6" />
        </g>
      ))}
    </Frame>
  );
}

export default function ProjectVisual({ project }: { project: Project }) {
  const kind = project.id.split("-")[0];
  switch (kind) {
    case "kaas":
      return <Dashboard id={project.id} />;
    case "kaarva":
      return <Storefront id={project.id} />;
    case "pulse":
      return <MobileApp id={project.id} />;
    case "atlas":
      return <ThreeD id={project.id} />;
    case "climbly":
      return <Seo id={project.id} />;
    default:
      return <Video id={project.id} />;
  }
}
