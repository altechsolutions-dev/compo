import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("présente la connexion comme page d’accueil", async () => {
    render(
      <LoginPage
        authMode="login"
        authSubmitting={false}
        authNotice=""
        authNoticeKind="success"
        rememberSession
        onAuthModeChange={vi.fn()}
        onClearNotice={vi.fn()}
        onRememberSessionChange={vi.fn()}
        onSubmit={vi.fn()}
        onSignInWithGoogle={vi.fn()}
        onSignInWithPasskey={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Connecte-toi" }),
    ).toBeVisible();
  });
});
