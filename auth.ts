import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { isValidObjectId } from "mongoose";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { mongoClientPromise } from "@/lib/mongodb-client";
import { connectToDatabase } from "@/lib/mongoose";
import User from "@/models/User";
import { env, validateEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

// Validate critical environment variables at module load time.
// This causes Next.js to fail fast with a clear error message
// rather than silently using an insecure fallback secret.
validateEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(mongoClientPromise, {
    databaseName: env.mongoDbName,
  }),
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  secret: env.authSecret,
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.identifier || "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password || "");

        if (!identifier || !password) {
          logger.warn("Login failed: missing credentials", { identifier });
          return null;
        }

        await connectToDatabase();
        const user = await User.findOne({
          $or: [{ email: identifier }, { username: identifier }],
        }).lean();

        if (!user?.passwordHash) {
          logger.warn("Login failed: user not found", { identifier });
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          logger.warn("Login failed: invalid password", { identifier });
          return null;
        }

        logger.info("Login successful", {
          userId: String(user._id),
          organizationId: String(user.organizationId),
          role: user.role,
        });

        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          organizationId: isValidObjectId(user.organizationId)
            ? String(user.organizationId)
            : "",
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.organizationId = user.organizationId;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub && token.organizationId && token.role) {
        session.user.id = token.sub;
        session.user.organizationId = String(token.organizationId);
        session.user.role = token.role as "owner" | "member";
      }

      return session;
    },
  },
});
