import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OAuthConsentView } from "./OAuthConsentView";
import type { OAuthConsentDetails } from "../../types";

const consent: OAuthConsentDetails = {
  authorization_id: "authorization-1",
  client: { name: "Compo Mobile", uri: "https://example.test", logo_uri: "" },
  user: { email: "joueur@example.fr" },
  scope: "openid email profile",
};

describe("OAuthConsentView", () => {
  it("explique les permissions et transmet l’approbation ou le refus", () => {
    const onDecision = vi.fn();
    render(
      <OAuthConsentView
        authorizationId="authorization-1"
        hasSupabase
        consent={consent}
        loading={false}
        submitting={false}
        error=""
        routeError=""
        requestedScopes={["openid", "email", "profile"]}
        onDecision={onDecision}
      />,
    );

    expect(screen.getByText("Compo Mobile").parentElement).toHaveTextContent(
      "souhaite accéder à votre compte Compo (joueur@example.fr).",
    );
    expect(
      screen.getByText("Consulter votre adresse e-mail"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
    fireEvent.click(screen.getByRole("button", { name: "Autoriser" }));
    expect(onDecision).toHaveBeenNthCalledWith(1, false);
    expect(onDecision).toHaveBeenNthCalledWith(2, true);
  });

  it("affiche l’erreur de route lorsque l’identifiant OAuth manque", () => {
    render(
      <OAuthConsentView
        authorizationId={null}
        hasSupabase
        consent={null}
        loading={false}
        submitting={false}
        error=""
        routeError="Aucune demande OAuth n’est en cours."
        requestedScopes={[]}
        onDecision={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Aucune demande OAuth n’est en cours."),
    ).toBeInTheDocument();
  });
});
