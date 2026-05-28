import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getFirstUser, updateUserRole } from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user && ENV.localAutoLogin && !ENV.isProduction) {
    user = await getFirstUser();
  }

  if (user?.email && ENV.adminEmails.includes(user.email.toLowerCase()) && user.role !== "admin") {
    await updateUserRole(user.id, "admin");
    user = { ...user, role: "admin" };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
