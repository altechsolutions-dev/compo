export function readOrganization() {
  try {
    return localStorage.getItem("compo-organization") || "Les Panthères";
  } catch {
    return "Les Panthères";
  }
}
