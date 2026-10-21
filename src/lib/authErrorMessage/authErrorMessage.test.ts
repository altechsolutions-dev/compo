import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authErrorMessage";

describe("authErrorMessage", () => {
  it("traduit les erreurs de connexion connues", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe(
      "Adresse e-mail ou mot de passe incorrect.",
    );
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
