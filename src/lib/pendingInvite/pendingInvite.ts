const storageKey = "compo-pending-invite";
const expirationMs = 7 * 24 * 60 * 60 * 1000;

type StoredInvite = {
  code: string;
  expiresAt: number;
};

export function readPendingInviteCode(): string {
  try {
    const value = localStorage.getItem(storageKey);
    if (!value) return "";

    const stored = JSON.parse(value) as Partial<StoredInvite>;
    if (
      typeof stored.code === "string" &&
      stored.code.trim() &&
      typeof stored.expiresAt === "number" &&
      stored.expiresAt > Date.now()
    ) {
      return stored.code.trim();
    }

    localStorage.removeItem(storageKey);
  } catch {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      return "";
    }
  }

  return "";
}

export function storePendingInviteCode(code: string): void {
  try {
    if (!code.trim()) {
      localStorage.removeItem(storageKey);
      return;
    }

    const stored: StoredInvite = {
      code: code.trim(),
      expiresAt: Date.now() + expirationMs,
    };
    localStorage.setItem(storageKey, JSON.stringify(stored));
  } catch {
    return;
  }
}
