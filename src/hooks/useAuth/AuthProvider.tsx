import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import type { useAuth } from "./useAuth";

type AuthProviderProps = {
  value: ReturnType<typeof useAuth>;
  children: ReactNode;
};

export function AuthProvider({ value, children }: AuthProviderProps) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}