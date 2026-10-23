import { UserRoundPlus } from "lucide-react";

export type OrganizationRequiredProps = {
  onJoinWithCode: () => void;
};

export function OrganizationRequired({
  onJoinWithCode,
}: OrganizationRequiredProps) {
  return (
    <section className="grid min-h-80 place-items-center border-b border-(--line) px-6 py-16 text-center">
      <div className="max-w-lg">
        <div className="mx-auto grid size-12 place-items-center rounded-lg bg-(--bg-elevated) text-(--team-b-blue)">
          <UserRoundPlus size={22} aria-hidden="true" />
        </div>
        <h1 className="mb-3 mt-5 text-2xl font-bold text-(--ink)">
          Rejoins une organisation pour accéder aux matchs
        </h1>
        <p className="m-0 text-sm leading-relaxed text-(--text-secondary)">
          Les matchs sont organisés au sein d’une équipe. Rejoins-en une avec un
          code d’invitation pour découvrir le programme et jouer ensemble.
        </p>
        <button
          className="mt-6 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-(--team-b-blue) px-5 text-sm font-semibold text-(--bg-main)"
          onClick={onJoinWithCode}
          type="button"
        >
          <UserRoundPlus size={17} /> Rejoindre avec un code
        </button>
      </div>
    </section>
  );
}
