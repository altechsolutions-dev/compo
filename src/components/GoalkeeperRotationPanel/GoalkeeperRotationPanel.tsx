import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchSlot } from "../../types";
import { GoalkeeperBadge } from "../GoalkeeperBadge/GoalkeeperBadge";
import {
  getGoalkeeperIds,
  getGoalkeeperRotation,
  getCurrentMatchSeconds,
} from "../../lib/goalkeeperRotation/goalkeeperRotation";

function soundAlarm(context: AudioContext) {
  for (const offset of [0, 0.3, 0.6]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + offset;
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
    gain.gain.linearRampToValueAtTime(0, start + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + 0.25);
  }
}

export function GoalkeeperRotationPanel({
  match,
  elapsedSeconds,
  teams,
  playerNames,
  onSetInterval,
}: {
  match: MatchSlot;
  elapsedSeconds: number;
  teams: [string[], string[]];
  playerNames: Record<string, string>;
  onSetInterval: (matchId: string, minutes: number) => Promise<boolean>;
}) {
  const intervalSeconds = match.goalkeeperRotation?.intervalSeconds ?? 300;
  const [minutes, setMinutes] = useState(String(intervalSeconds / 60));
  const [isSaving, setIsSaving] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [audioNotice, setAudioNotice] = useState("");
  const [changed, setChanged] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const mountedRef = useRef(false);
  const rotation = getGoalkeeperRotation(match.goalkeeperRotation, elapsedSeconds);
  const goalkeeperIds = getGoalkeeperIds(teams, rotation.turn);
  const previousTurn = useRef({
    matchId: match.id,
    turn: getGoalkeeperRotation(match.goalkeeperRotation, getCurrentMatchSeconds(match)).turn,
  });

  useEffect(() => setMinutes(String(intervalSeconds / 60)), [intervalSeconds]);

  const activateSound = useCallback(async (test = false) => {
    try {
      if (!window.AudioContext) throw new Error("Ce navigateur ne prend pas en charge l’alarme sonore.");
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      context.onstatechange = () => {
        if (mountedRef.current) setSoundReady(context.state === "running");
      };
      await context.resume();
      if (!mountedRef.current) return;
      if (context.state !== "running") throw new Error("Le navigateur a bloqué le son. Réessayez avec le bouton.");
      setSoundReady(true);
      setAudioNotice("");
      if (test) soundAlarm(context);
    } catch (error) {
      if (mountedRef.current) {
        setAudioNotice(error instanceof Error ? error.message : "Impossible d’activer l’alarme sonore.");
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const unlock = () => void activateSound();
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => {
      mountedRef.current = false;
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      const context = audioRef.current;
      audioRef.current = null;
      if (context) {
        context.onstatechange = null;
        void context.close().catch((error: unknown) => console.error("Impossible de fermer l’alarme sonore.", error));
      }
    };
  }, [activateSound]);

  useEffect(() => {
    const previous = previousTurn.current;
    previousTurn.current = { matchId: match.id, turn: rotation.turn };
    if (previous.matchId !== match.id) {
      setChanged(false);
      return;
    }
    if (rotation.turn <= previous.turn || match.status !== "in_progress") return;
    setChanged(true);
    const context = audioRef.current;
    if (!context || context.state !== "running") {
      setAudioNotice("Changement de gardiens : le son n’est pas actif. Activez l’alarme pour les prochains changements.");
      return;
    }
    try {
      soundAlarm(context);
    } catch (error) {
      setAudioNotice(`Impossible de jouer l’alarme : ${error instanceof Error ? error.message : "erreur inconnue"}`);
    }
  }, [match.id, match.status, rotation.turn]);

  const remaining = rotation.remainingSeconds;
  return (
    <section aria-label="Rotation des gardiens" className="mt-3 rounded-xl border border-(--line) bg-(--bg-surface) p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-sm font-bold">Rotation des gardiens</h2>
        <p className="m-0 text-(--text-secondary)">
          {match.status === "paused" ? "En pause · " : ""}Prochain changement dans{" "}
          <span className="font-mono tabular-nums">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span>
        </p>
      </div>
      <div className="my-3 grid grid-cols-2 gap-3" aria-live="polite" aria-atomic="true" role="status">
        {changed && <p className="col-span-2 m-0 font-semibold">Changement de gardiens !</p>}
        {([1, 0] as const).map((team) => (
          <p key={team} className={`m-0 flex min-w-0 items-center gap-2 ${team === 0 ? "text-(--team-a-red)" : "text-(--team-b-blue)"}`}>
            <span className="min-w-0 truncate">{team === 0 ? "Rouge" : "Bleue"} : {playerNames[goalkeeperIds[team] ?? ""] ?? "Joueur"}</span>
            <GoalkeeperBadge />
          </p>
        ))}
      </div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={async (event) => {
        event.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        try {
          await onSetInterval(match.id, Number(minutes));
        } finally {
          setIsSaving(false);
        }
      }}>
        <label htmlFor="goalkeeper-interval">Changer toutes les</label>
        <input id="goalkeeper-interval" type="number" min="1" step="1" required value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          className="min-h-10 w-18 rounded-md border border-(--line) bg-(--bg-elevated) px-2 text-(--text-primary)" />
        <span>minutes</span>
        <button type="submit" disabled={isSaving} className="min-h-10 cursor-pointer rounded-md border border-(--line) bg-(--bg-elevated) px-3 disabled:opacity-45">
          {isSaving ? "Enregistrement…" : "Appliquer"}
        </button>
        <button type="button" onClick={() => void activateSound(true)} className="min-h-10 cursor-pointer rounded-md border border-(--line) bg-(--bg-elevated) px-3">
          {soundReady ? "Tester l’alarme" : "Activer et tester l’alarme"}
        </button>
      </form>
      {!soundReady && !audioNotice && <p className="mb-0 text-(--text-secondary)">Activez le son et gardez le direct ouvert pour entendre l’alarme.</p>}
      {audioNotice && <p className="mb-0 text-(--team-a-red)" role="alert">{audioNotice}</p>}
    </section>
  );
}
