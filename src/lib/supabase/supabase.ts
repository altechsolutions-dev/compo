import { createClient } from "@supabase/supabase-js";
import { authStorage } from "./authStorage";

export const initialAuthCallbackMessage = (() => {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get("error_code") === "otp_expired"
    ? "Le lien de confirmation a expiré ou a déjà été utilisé. Demandez-en un nouveau pour confirmer votre adresse."
    : "";
})();

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
          storage: authStorage,
          experimental: { passkey: true },
        },
      })
    : null;
