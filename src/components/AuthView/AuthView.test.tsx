import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthView } from "./AuthView";

function renderAuthView() {
  const callbacks = {
    onAuthModeChange: vi.fn(),
    onClearNotice: vi.fn(),
    onSubmit: vi.fn((event) => event.preventDefault()),
    onSignInWithGoogle: vi.fn(),
  };
  render(
    <AuthView
      authMode="login"
      authSubmitting={false}
      authNotice=""
      authNoticeKind="success"
      {...callbacks}
    />,
  );
  return callbacks;
}

describe("AuthView", () => {
  it("affiche la connexion et permet de basculer vers l’inscription", () => {
    const { onAuthModeChange, onClearNotice } = renderAuthView();

    expect(
      screen.getByRole("heading", { name: "Connecte-toi" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Inscription" }));
    expect(onAuthModeChange).toHaveBeenCalledWith("signup");
    expect(onClearNotice).toHaveBeenCalledOnce();
  });

  it("transmet la soumission et la connexion Google", () => {
    const { onSubmit, onSignInWithGoogle } = renderAuthView();

    fireEvent.submit(
      screen.getByRole("button", { name: "Se connecter" }).closest("form")!,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Continuer avec Google" }),
    );
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSignInWithGoogle).toHaveBeenCalledOnce();
  });
});
