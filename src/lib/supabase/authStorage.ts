const rememberSessionKey = "compo:remember-session";

export function readRememberSession() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(rememberSessionKey) !== "false";
}

export function saveRememberSession(remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(rememberSessionKey, String(remember));
}

export const authStorage = {
  getItem(key: string) {
    if (typeof window === "undefined") return null;
    const storage = readRememberSession()
      ? window.localStorage
      : window.sessionStorage;
    return storage.getItem(key);
  },
  setItem(key: string, value: string) {
    if (typeof window === "undefined") return;
    const persistent = window.localStorage;
    const temporary = window.sessionStorage;
    const storage = readRememberSession() ? persistent : temporary;
    const otherStorage = storage === persistent ? temporary : persistent;
    otherStorage.removeItem(key);
    storage.setItem(key, value);
  },
  removeItem(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};
