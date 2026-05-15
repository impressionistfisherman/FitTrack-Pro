export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const SESSION_TOKEN_STORAGE_KEY = "fittrack.sessionToken";

export const getStoredSessionToken = () => {
  if (typeof globalThis === "undefined" || !globalThis.localStorage) return null;
  return globalThis.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
};

export const setStoredSessionToken = (token: string) => {
  if (typeof globalThis === "undefined" || !globalThis.localStorage) return;
  globalThis.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
};

export const clearStoredSessionToken = () => {
  if (typeof globalThis === "undefined" || !globalThis.localStorage) return;
  globalThis.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
};

export const consumeSessionTokenFromHash = () => {
  if (typeof globalThis === "undefined" || !globalThis.location) return;

  const hash = globalThis.location.hash.replace(/^#/, "");
  if (!hash) return;

  const params = new URLSearchParams(hash);
  const token = params.get("session_token");
  if (!token) return;

  setStoredSessionToken(token);
  params.delete("session_token");

  const nextHash = params.toString();
  const nextUrl =
    globalThis.location.pathname +
    globalThis.location.search +
    (nextHash ? `#${nextHash}` : "");

  globalThis.history.replaceState(null, "", nextUrl);
};

export const getAppPath = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = import.meta.env.BASE_URL;

  if (!base || base === "/") return normalizedPath;

  return `${base.replace(/\/$/, "")}${normalizedPath}`;
};

export const getApiBaseUrl = () => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  return apiBaseUrl ? apiBaseUrl.replace(/\/$/, "") : "";
};

const isGitHubPages = () =>
  typeof globalThis !== "undefined" &&
  globalThis.location?.hostname.endsWith("github.io");

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (provider: "google" | "github" = "google") => {
  if (provider === "google" || provider === "github") {
    const apiBaseUrl = getApiBaseUrl();
    if (apiBaseUrl) return `${apiBaseUrl}/api/auth/${provider}`;
    if (isGitHubPages()) return "";
    return `/api/auth/${provider}`;
  }

  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${globalThis.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  if (!oauthPortalUrl || !appId) {
    return "/";
  }

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

export const startLogin = (provider: "google" | "github" = "google") => {
  const loginUrl = getLoginUrl(provider);

  if (!loginUrl) {
    globalThis.alert(
      "GitHub Pages는 정적 호스팅이라 로그인과 DB API를 직접 실행할 수 없습니다. 로컬 서버 또는 별도 Node 서버 배포 URL에서 로그인하세요."
    );
    return;
  }

  globalThis.location.href = loginUrl;
};
