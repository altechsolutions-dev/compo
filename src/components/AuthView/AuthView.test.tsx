import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthView } from "./AuthView";

function renderAuthView() {
  const callbacks = {
    onAuthModeChange: vi.fn(),
    onClearNotice: vi.fn(),
    onSubmit: vi.fn((event) => event.preventDefault()),
    onSignInWithGoogle: vi.fn(),
    onSignInWithPasskey: vi.fn(),
    onRememberSessionChange: vi.fn(),
  };
  render(
    <AuthView
      authMode="login"
      authSubmitting={false}
      authNotice=""
      authNoticeKind="success"
      rememberSession
      {...callbacks}
    />,
  );
  return callbacks;
}

describe("AuthView", () => {
  it("affiche la connexion et permet de basculer vers l’inscription", async () => {
    const { onAuthModeChange, onClearNotice } = renderAuthView();

    expect(
      await screen.findByRole("heading", { name: "Connecte-toi" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Inscription" }));
    expect(onAuthModeChange).toHaveBeenCalledWith("signup");
    expect(onClearNotice).toHaveBeenCalledOnce();
  });

  it("transmet la soumission et les options de connexion", async () => {
    const {
      onSubmit,
      onSignInWithGoogle,
      onSignInWithPasskey,
      onRememberSessionChange,
    } = renderAuthView();

    fireEvent.submit(
      (await screen.findByRole("button", { name: "Se connecter" })).closest(
        "form",
      )!,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Continuer avec Google" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Se connecter avec Face ID ou une passkey",
      }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Rester connecté sur cet appareil",
      }),
    );
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSignInWithGoogle).toHaveBeenCalledOnce();
    expect(onSignInWithPasskey).toHaveBeenCalledOnce();
    expect(onRememberSessionChange).toHaveBeenCalledWith(false);
  });
});
