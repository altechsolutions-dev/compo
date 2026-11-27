import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchSlot } from "../../types";
import {
  getGoalkeeperRotation,
  getCurrentMatchSeconds,
} from "../../lib/goalkeeperRotation/goalkeeperRotation";

function soundAlarm(context: AudioContext) {
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const start = context.currentTime;
  const end = start + 1.5;
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.7;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.5, start + 0.06);
  gain.gain.setValueAtTime(0.5, end - 0.18);
  gain.gain.linearRampToValueAtTime(0, end);
  filter.connect(gain);
  gain.connect(context.destination);
  // Slightly detuned reeds give the horn its rough stadium timbre.
  const frequencies = [220, 223, 440];
  let activeOscillators = frequencies.length;
  for (const frequency of frequencies) {
    const oscillator = context.createOscillator();
    oscillator.type = frequency === 440 ? "triangle" : "sawtooth";
    oscillator.frequency.value = frequency;
    oscillator.connect(filter);
    oscillator.onended = () => {
      oscillator.disconnect();
      activeOscillators -= 1;
      if (activeOscillators === 0) {
        filter.disconnect();
        gain.disconnect();
      }
    };
    oscillator.start(start);
    oscillator.stop(end);
  }
}

export function GoalkeeperRotationPanel({
  match,
  elapsedSeconds,
  onSetInterval,
}: {
  match: MatchSlot;
  elapsedSeconds: number;
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
  const rotation = getGoalkeeperRotation(
    match.goalkeeperRotation,
    elapsedSeconds,
  );
  const previousTurn = useRef({
    matchId: match.id,
    turn: getGoalkeeperRotation(
      match.goalkeeperRotation,
      getCurrentMatchSeconds(match),
    ).turn,
  });

  useEffect(() => setMinutes(String(intervalSeconds / 60)), [intervalSeconds]);

  const activateSound = useCallback(async (test = false) => {
    try {
      if (!window.AudioContext)
        throw new Error(
          "Ce navigateur ne prend pas en charge l’alarme sonore.",
        );
      const context = audioRef.current ?? new AudioContext();
      audioRef.current = context;
      context.onstatechange = () => {
        if (mountedRef.current) setSoundReady(context.state === "running");
      };
      await context.resume();
      if (!mountedRef.current) return;
      if (context.state !== "running")
        throw new Error(
          "Le navigateur a bloqué le son. Réessayez avec le bouton.",
        );
      setSoundReady(true);
      setAudioNotice("");
      if (test) soundAlarm(context);
    } catch (error) {
      if (mountedRef.current) {
        setAudioNotice(
          error instanceof Error
            ? error.message
            : "Impossible d’activer l’alarme sonore.",
        );
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
        void context
          .close()
          .catch((error: unknown) =>
            console.error("Impossible de fermer l’alarme sonore.", error),
          );
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
    if (rotation.turn <= previous.turn || match.status !== "in_progress")
      return;
    setChanged(true);
    const context = audioRef.current;
    if (!context || context.state !== "running") {
      setAudioNotice(
        "Changement de gardiens : le son n’est pas actif. Activez l’alarme pour les prochains changements.",
      );
      return;
    }
    try {
      soundAlarm(context);
    } catch (error) {
      setAudioNotice(
        `Impossible de jouer l’alarme : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
    }
  }, [match.id, match.status, rotation.turn]);

  const remaining = rotation.remainingSeconds;
  return (
    <section
      aria-label="Rotation des gardiens"
      className="live-match-goalkeeper-settings mt-3 rounded-xl border border-(--line) bg-(--bg-surface) p-4 text-xs"
    >
      <details>
        <summary className="cursor-pointer">
          <span className="font-bold">Réglages des gardiens</span>
          <span className="ml-2 text-(--text-secondary)">
            {match.status === "paused" ? "En pause · " : ""}Prochain changement
            dans{" "}
            <span className="font-mono tabular-nums">
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </span>
          </span>
        </summary>
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (isSaving) return;
            setIsSaving(true);
            try {
              await onSetInterval(match.id, Number(minutes));
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <label htmlFor="goalkeeper-interval">Changer toutes les</label>
          <input
            id="goalkeeper-interval"
            type="number"
            min="1"
            step="1"
            required
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className="min-h-10 w-18 rounded-md border border-(--line) bg-(--bg-elevated) px-2 text-(--text-primary)"
          />
          <span>minutes</span>
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-10 cursor-pointer rounded-md border border-(--line) bg-(--bg-elevated) px-3 disabled:opacity-45"
          >
            {isSaving ? "Enregistrement…" : "Appliquer"}
          </button>
          <button
            type="button"
            onClick={() => void activateSound(true)}
            className="min-h-10 cursor-pointer rounded-md border border-(--line) bg-(--bg-elevated) px-3"
          >
            {soundReady ? "Tester l’alarme" : "Activer et tester l’alarme"}
          </button>
        </form>
        {!soundReady && !audioNotice && (
          <p className="mb-0 text-(--text-secondary)">
            Activez le son et gardez le direct ouvert pour entendre l’alarme.
          </p>
        )}
      </details>
      <div aria-live="polite" aria-atomic="true" role="status">
        {changed && (
          <p className="mb-0 font-semibold">Changement de gardiens !</p>
        )}
      </div>
      {audioNotice && (
        <p className="mb-0 text-(--team-a-red)" role="alert">
          {audioNotice}
        </p>
      )}
    </section>
  );
}
