/** Operator session token storage, shared by the API client and AuthContext. */

const KEY = "aerotwin.session";

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: session lasts for this page load only */
  }
}

/** Fired when the backend rejects the stored token, so the app can return to /login. */
export const UNAUTHORIZED_EVENT = "aerotwin:unauthorized";
