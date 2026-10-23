import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardFooter } from "./DashboardFooter";

describe("DashboardFooter", () => {
  it("indique le statut de synchronisation et le club", () => {
    render(<DashboardFooter organization="Les Panthères" isSynchronized />);

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "COMPO / Les Panthères",
    );
    expect(screen.getByText("Club synchronisé")).toBeInTheDocument();
  });

  it("signale les données locales en mode démonstration", () => {
    render(
      <DashboardFooter organization="Les Panthères" isSynchronized={false} />,
    );

    expect(
      screen.getByText("Données de démonstration locales"),
    ).toBeInTheDocument();
  });
});
