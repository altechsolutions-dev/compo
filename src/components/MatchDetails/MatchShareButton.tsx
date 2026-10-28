import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function MatchShareButton({ matchId }: { matchId: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  const copyMatchLink = async () => {
    const url = new URL("/app/matches", window.location.origin);
    url.searchParams.set("match", matchId);

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        className="inline-flex min-h-9 cursor-pointer items-center gap-2 border border-(--line) bg-(--bg-surface) px-3 text-xs font-semibold text-(--text-primary) transition-colors hover:border-(--team-b-blue) hover:text-(--team-b-blue) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--team-b-blue)"
        onClick={() => void copyMatchLink()}
        type="button"
      >
        {copyState === "copied" ? (
          <Check aria-hidden="true" size={15} />
        ) : (
          <Copy aria-hidden="true" size={15} />
        )}
        {copyState === "copied" ? "Lien copié" : "Partager le résumé"}
      </button>
      {copyState === "error" && (
        <span className="text-xs text-(--text-secondary)" role="status">
          Impossible de copier le lien.
        </span>
      )}
    </div>
  );
}
