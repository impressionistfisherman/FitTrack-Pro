import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getCookie(req: Request, key: string): string | undefined {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  return cookies[key];
}

function getBackendOrigin(req: Request) {
  if (ENV.backendOrigin) return ENV.backendOrigin.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function getAppRedirectUrl(req: Request) {
  return ENV.appRedirectUrl || ENV.appOrigin || getBackendOrigin(req);
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/google", (req: Request, res: Response) => {
    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      res.status(500).send("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.");
      return;
    }

    const redirectUri = `${getBackendOrigin(req)}/api/auth/google/callback`;
    const state = crypto.randomUUID();
    res.cookie("oauth_state", state, { ...getSessionCookieOptions(req), maxAge: 10 * 60 * 1000 });

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", ENV.googleClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    res.redirect(url.toString());
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state || getCookie(req, "oauth_state") !== state) {
      res.status(400).json({ error: "Invalid OAuth state or code" });
      return;
    }

    try {
      const redirectUri = `${getBackendOrigin(req)}/api/auth/google/callback`;
      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });
      if (!tokenResp.ok) throw new Error(await tokenResp.text());
      const token = await tokenResp.json() as { access_token: string };

      const userResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (!userResp.ok) throw new Error(await userResp.text());
      const profile = await userResp.json() as { sub: string; name?: string; email?: string };

      await signInProviderUser(req, res, {
        openId: `google:${profile.sub}`,
        name: profile.name ?? "Google User",
        email: profile.email ?? null,
        loginMethod: "google",
      });
    } catch (error) {
      console.error("[OAuth] Google callback failed", error);
      res.status(500).json({ error: "Google login failed" });
    }
  });

  app.get("/api/auth/github", (req: Request, res: Response) => {
    if (!ENV.githubClientId || !ENV.githubClientSecret) {
      res.status(500).send("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required.");
      return;
    }

    const redirectUri = `${getBackendOrigin(req)}/api/auth/github/callback`;
    const state = crypto.randomUUID();
    res.cookie("oauth_state", state, { ...getSessionCookieOptions(req), maxAge: 10 * 60 * 1000 });

    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", ENV.githubClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  });

  app.get("/api/auth/github/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state || getCookie(req, "oauth_state") !== state) {
      res.status(400).json({ error: "Invalid OAuth state or code" });
      return;
    }

    try {
      const redirectUri = `${getBackendOrigin(req)}/api/auth/github/callback`;
      const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: ENV.githubClientId,
          client_secret: ENV.githubClientSecret,
          code,
          redirect_uri: redirectUri,
          state,
        }),
      });
      if (!tokenResp.ok) throw new Error(await tokenResp.text());
      const token = await tokenResp.json() as { access_token?: string; error?: string };
      if (!token.access_token) throw new Error(token.error ?? "Missing GitHub access token");

      const profileResp = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token.access_token}`, "User-Agent": "fittrack-pro" },
      });
      if (!profileResp.ok) throw new Error(await profileResp.text());
      const profile = await profileResp.json() as { id: number; name?: string; login: string; email?: string | null };

      let email = profile.email ?? null;
      if (!email) {
        const emailsResp = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${token.access_token}`, "User-Agent": "fittrack-pro" },
        });
        if (emailsResp.ok) {
          const emails = await emailsResp.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
          email = emails.find((item) => item.primary && item.verified)?.email ?? emails.find((item) => item.verified)?.email ?? null;
        }
      }

      await signInProviderUser(req, res, {
        openId: `github:${profile.id}`,
        name: profile.name ?? profile.login,
        email,
        loginMethod: "github",
      });
    } catch (error) {
      console.error("[OAuth] GitHub callback failed", error);
      res.status(500).json({ error: "GitHub login failed" });
    }
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, getAppRedirectUrl(req));
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

async function signInProviderUser(
  req: Request,
  res: Response,
  userInfo: { openId: string; name: string; email: string | null; loginMethod: string },
) {
  await db.upsertUser({
    openId: userInfo.openId,
    name: userInfo.name,
    email: userInfo.email,
    loginMethod: userInfo.loginMethod,
    lastSignedIn: new Date(),
  });

  const sessionToken = await sdk.createSessionToken(userInfo.openId, {
    name: userInfo.name,
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie("oauth_state", cookieOptions);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  res.redirect(302, getAppRedirectUrl(req));
}
