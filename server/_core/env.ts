import "dotenv/config";

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  sqliteDbPath: process.env.SQLITE_DB_PATH ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiApiUrl: process.env.OPENAI_API_URL ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.5",
  backendOrigin: process.env.BACKEND_ORIGIN ?? "",
  appOrigin: process.env.APP_ORIGIN ?? "",
  appRedirectUrl: process.env.APP_REDIRECT_URL ?? "",
  localAutoLogin: process.env.LOCAL_AUTO_LOGIN === "true",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  adminEmails: (process.env.ADMIN_EMAILS ?? "gusdlfboy@gamil.com,gusdlfboy@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
