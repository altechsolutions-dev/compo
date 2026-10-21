import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("présente la connexion comme page d’accueil", () => {
    render(
      <LoginPage
        authMode="login"
        authSubmitting={false}
        authNotice=""
        authNoticeKind="success"
        onAuthModeChange={vi.fn()}
        onClearNotice={vi.fn()}
        onSubmit={vi.fn()}
        onSignInWithGoogle={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Connecte-toi" })).toBeVisible();
  });
});
