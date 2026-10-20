import { useEffect, useState } from "react";
import { useSettings } from "../lib/content";
import { studioStatus } from "../lib/site";
import { cn } from "../utils/cn";

/** Live studio open/closed status, refreshed every minute. */
export function useStudioStatus() {
  const settings = useSettings();
  const [status, setStatus] = useState(() => studioStatus(settings));
  useEffect(() => {
    setStatus(studioStatus(settings));
    const id = setInterval(() => setStatus(studioStatus(settings)), 60_000);
    return () => clearInterval(id);
  }, [settings]);
  return status;
}

export function StatusDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", online ? "bg-sage animate-pulse-dot" : "bg-smoke", className)}
      aria-hidden
    />
  );
}

export function StudioStatusPill({ className }: { className?: string }) {
  const settings = useSettings();
  const status = useStudioStatus();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full border border-gold-300/12 bg-ink-850/80 px-3.5 py-1.5 text-[12px] text-sand",
        className,
      )}
    >
      <StatusDot online={status.online} />
      {status.online ? (
        <span>
          <span className="text-parchment">Online now</span> · {status.time} {settings.timezoneLabel}
        </span>
      ) : (
        <span>
          Away · replies in studio hours · {status.time} {settings.timezoneLabel}
        </span>
      )}
    </span>
  );
}
