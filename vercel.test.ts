import { describe, expect, it } from "vitest";
import vercelConfig from "./vercel.json";

describe("Vercel SPA rewrites", () => {
  it.each(["/vote", "/app/:path*", "/oauth/:path*"])(
    "sert l’application pour un accès direct à %s sans service worker",
    (source) => {
      expect(vercelConfig.rewrites).toContainEqual({
        source,
        destination: "/index.html",
      });
    },
  );
});
