import { Clock3 } from "lucide-react";
import "./DashboardFooter.css";

export type DashboardFooterProps = {
  organization: string;
  isSynchronized: boolean;
};

export function DashboardFooter({
  organization,
  isSynchronized,
}: DashboardFooterProps) {
  return (
    <footer className="dashboard-footer flex min-h-13 items-center justify-between gap-3 border-t border-(--line) text-[10px] text-[#89968d] max-[680px]:min-h-14.5 max-[680px]:flex-col max-[680px]:items-start max-[680px]:justify-center max-[680px]:gap-1">
      <span>
        COMPO <span>/</span> {organization}
      </span>
      <span className="inline-flex items-center gap-2">
        <Clock3 size={13} />
        {isSynchronized
          ? "Organisation synchronisée"
          : "Données de démonstration locales"}
      </span>
    </footer>
  );
}
