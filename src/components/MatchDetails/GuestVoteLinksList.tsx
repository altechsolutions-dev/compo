import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { GuestMatchVoteLink } from "../../types";

export function GuestVoteLinksList({ links }: { links: GuestMatchVoteLink[] }) {
  const [copiedId, setCopiedId] = useState("");
  const [copyErrorId, setCopyErrorId] = useState("");

  return (
    <div className="flex items-center">
      {links.map((link) => {
        const url = new URL("/vote", window.location.origin);
        url.searchParams.set("token", link.token);
        return (
          <div className="flex items-center" key={link.attendeeId}>
            <button
              aria-label={
                copiedId === link.attendeeId
                  ? "Lien de vote copié"
                  : "Copier le lien de vote invité"
              }
              className="grid size-8 shrink-0 cursor-pointer place-items-center border border-(--line) bg-(--bg-surface) text-(--text-secondary) hover:bg-(--bg-elevated) hover:text-(--text-primary)"
              onClick={() => {
                void (async () => {
                  try {
                    if (!navigator.clipboard?.writeText) throw new Error();
                    await navigator.clipboard.writeText(url.toString());
                    setCopiedId(link.attendeeId);
                    setCopyErrorId("");
                  } catch {
                    setCopyErrorId(link.attendeeId);
                  }
                })();
              }}
              title={
                copyErrorId === link.attendeeId
                  ? "Copie impossible"
                  : copiedId === link.attendeeId
                    ? "Lien copié"
                    : "Copier le lien"
              }
              type="button"
            >
              {copiedId === link.attendeeId ? (
                <Check aria-hidden="true" size={15} />
              ) : (
                <Copy aria-hidden="true" size={15} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
