import { SessionOptions } from "iron-session";
import type { SessionData } from "@/types";

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "this-is-a-secret-key-change-in-production-32chars",
  cookieName: "ryla-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export const defaultSession: SessionData = {
  isLoggedIn: false,
  role: "staff",
  label: "",
  campWeekend: "",
};
