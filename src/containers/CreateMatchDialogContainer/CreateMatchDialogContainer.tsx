import type { FormEventHandler } from "react";
import { Plus, Save } from "lucide-react";
import { DashboardDialog } from "../../components/DashboardDialog/DashboardDialog";
import "./CreateMatchDialogContainer.css";

export type CreateMatchDialogContainerProps = {
  organizationName: string;
  date: string;
  minDate: string;
  minTime?: string;
  time: string;
  venue: string;
  maxPlayers: number;
  joinOnCreate: boolean;
  saving: boolean;
  editing?: boolean;
  mounted?: boolean;
  open?: boolean;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onVenueChange: (value: string) => void;
  onMaxPlayersChange: (value: number) => void;
  onJoinOnCreateChange: (value: boolean) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function CreateMatchDialogContainer({
  organizationName,
  date,
  minDate,
  minTime,
  time,
  venue,
  maxPlayers,
  joinOnCreate,
  saving,
  editing = false,
  mounted,
  open,
  onClose,
  onDateChange,
  onTimeChange,
  onVenueChange,
  onMaxPlayersChange,
  onJoinOnCreateChange,
  onSubmit,
}: CreateMatchDialogContainerProps) {
  return (
    <DashboardDialog
      eyebrow={organizationName || "CLUB"}
      kind="match"
      title={editing ? "Modifier le créneau" : undefined}
      mounted={mounted}
      open={open}
      onClose={onClose}
    >
      <form className="create-match-dialog-form" onSubmit={onSubmit}>
        <label htmlFor="match-date">Date du match</label>
        <input
          id="match-date"
          min={minDate}
          onChange={(event) => onDateChange(event.target.value)}
          required
          type="date"
          value={date}
        />
        <label htmlFor="match-time">Heure</label>
        <input
          id="match-time"
          min={minTime}
          onChange={(event) => onTimeChange(event.target.value)}
          required
          type="time"
          value={time}
        />
        <label htmlFor="match-venue">Terrain</label>
        <input
          id="match-venue"
          onChange={(event) => onVenueChange(event.target.value)}
          placeholder="Nom du complexe sportif"
          required
          value={venue}
        />
        <label htmlFor="match-capacity">Nombre de places</label>
        <input
          id="match-capacity"
          max={30}
          min={2}
          onChange={(event) => onMaxPlayersChange(Number(event.target.value))}
          required
          type="number"
          value={maxPlayers}
        />
        {!editing && (
          <label className="checkbox-field" htmlFor="match-join-on-create">
            <input
              checked={joinOnCreate}
              id="match-join-on-create"
              onChange={(event) => onJoinOnCreateChange(event.target.checked)}
              type="checkbox"
            />
            <span>M’inscrire à ce match</span>
          </label>
        )}
        <button
          className="create-match-dialog-form__submit bg-(--team-b-blue) text-(--bg-main)"
          disabled={saving}
          type="submit"
        >
          {editing ? <Save size={17} /> : <Plus size={17} />}
          {saving
            ? "Enregistrement…"
            : editing
              ? "Enregistrer les modifications"
              : "Créer le créneau"}
        </button>
      </form>
    </DashboardDialog>
  );
}
