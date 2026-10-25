import { beforeEach, describe, expect, it } from "vitest";
import {
  authStorage,
  readRememberSession,
  saveRememberSession,
} from "./authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("persists sessions by default to preserve the existing behavior", () => {
    expect(readRememberSession()).toBe(true);
    authStorage.setItem("auth-token", "persistent-token");

    expect(window.localStorage.getItem("auth-token")).toBe("persistent-token");
    expect(window.sessionStorage.getItem("auth-token")).toBeNull();
  });

  it("keeps an unchecked session only for the current browser session", () => {
    saveRememberSession(false);
    authStorage.setItem("auth-token", "temporary-token");

    expect(readRememberSession()).toBe(false);
    expect(window.localStorage.getItem("auth-token")).toBeNull();
    expect(window.sessionStorage.getItem("auth-token")).toBe("temporary-token");
  });

  it("removes a session from both storage locations", () => {
    window.localStorage.setItem("auth-token", "old-token");
    window.sessionStorage.setItem("auth-token", "temporary-token");
    authStorage.removeItem("auth-token");

    expect(window.localStorage.getItem("auth-token")).toBeNull();
    expect(window.sessionStorage.getItem("auth-token")).toBeNull();
  });
});
