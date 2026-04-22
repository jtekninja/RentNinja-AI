import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      organizationId: string;
      role: "owner" | "member";
    };
  }

  interface User {
    organizationId: string;
    role: "owner" | "member";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId?: string;
    role?: "owner" | "member";
  }
}

