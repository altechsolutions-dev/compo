import { createContext, useContext } from "react";
import type { useAuth } from "./useAuth";

type AuthContextValue = ReturnType<typeof useAuth>;

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthContext() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("useAuthContext doit être utilisé dans AuthProvider.");
  }
  return auth;
}