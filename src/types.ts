export type MatchSlot = {
  id: string;
  date: string;
  time: string;
  venue: string;
  maxPlayers: number;
  attendees: string[];
  teams?: [string[], string[]];
};

export type Player = {
  id: string;
  name: string;
  position: "Gardien" | "Défenseur" | "Milieu" | "Attaquant";
  attack: number;
  defense: number;
  stamina: number;
};

export type OrganizationMember = {
  user_id: string;
  display_name: string;
  role: "owner" | "member";
};

export type AuthMode =
  | "login"
  | "signup"
  | "recovery"
  | "resend-confirmation"
  | "update-password"
  | null;

export type OAuthConsentDetails = {
  authorization_id: string;
  client: { name: string; uri: string; logo_uri: string };
  user: { email: string };
  scope: string;
};

export type DialogKind =
  | "match"
  | "organization"
  | "organizations"
  | "invite"
  | "join"
  | "code";

export type OrganizationSummary = {
  organization_id: string;
  organization_name: string;
  invite_code: string;
  role: "owner" | "member";
  member_count: number;
};
