import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authErrorMessage";

describe("authErrorMessage", () => {
  it("traduit les erreurs de connexion connues", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe(
      "Adresse e-mail ou mot de passe incorrect.",
    );
  });

  it("explique comment corriger un domaine WebAuthn local invalide", () => {
    expect(authErrorMessage("127.0.0.1 is an invalid domain")).toContain(
      "définissez l’identifiant RP sur localhost",
    );
  });

  it("guide si aucune passkey locale n’est disponible ou si la demande est annulée", () => {
    expect(
      authErrorMessage(
        "The operation either timed out or was not allowed. See: https://www.w3.org/TR/webauthn-2/",
      ),
    ).toContain("Aucune passkey disponible sur cet appareil");
  });

  it("préserve le détail d’une erreur inconnue et couvre les messages vides", () => {
    expect(authErrorMessage("Unexpected response")).toContain(
      "Unexpected response",
    );
    expect(authErrorMessage("")).toBe(
      "L’opération a échoué. Vérifiez vos informations et réessayez.",
    );
  });
});
