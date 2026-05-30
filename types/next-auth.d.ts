import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      organizationId: string;
      role: "owner" | "admin" | "member" | "viewer";
    };
  }

  interface User {
    organizationId: string;
    role: "owner" | "admin" | "member" | "viewer";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId?: string;
    role?: "owner" | "admin" | "member" | "viewer";
  }
}
