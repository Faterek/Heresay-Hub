import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import { type Adapter } from "next-auth/adapters";
import DiscordProvider from "next-auth/providers/discord";

import { db } from "~/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
  type UserRole,
} from "~/server/db/schema";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      // ...other properties
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    // ...other properties
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: UserRole;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    DiscordProvider({
      clientId: process.env.AUTH_DISCORD_ID!,
      clientSecret: process.env.AUTH_DISCORD_SECRET!,
      authorization:
        "https://discord.com/api/oauth2/authorize?scope=identify+email+guilds",
      async profile(profile, _tokens) {
        // Set role to OWNER if user is the designated owner
        const role = profile.id === process.env.HH_OWNER_ID ? "OWNER" : "USER";
        
        return {
          id: profile.id,
          name: profile.username ?? profile.global_name,
          email: profile.email,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
          role: role,
        };
      },
    } satisfies Parameters<typeof DiscordProvider>[0]),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as Adapter,
  session: {
    strategy: "database" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async signIn({ account }) {
      // Allow sign in for non-Discord providers or if no guild checking is needed
      if (account?.provider !== "discord" || !account.access_token) {
        return true;
      }

      try {
        // Fetch user's Discord guilds
        const guildsResponse = await fetch(
          "https://discord.com/api/users/@me/guilds",
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          },
        );

        if (!guildsResponse.ok) {
          console.error(
            "Failed to fetch Discord guilds:",
            guildsResponse.status,
          );
          return false;
        }

        const guilds = (await guildsResponse.json()) as Array<{ id: string }>;
        const userGuildIds = guilds.map((guild) => guild.id);

        // Get allowed guild IDs from env
        const allowedGuildIds =
          process.env.HH_GUILD_IDS?.split(",").map((id) => id.trim()) ?? [];

        // Check if user is in any of the allowed guilds
        const hasAccess = allowedGuildIds.some((guildId) =>
          userGuildIds.includes(guildId),
        );

        if (!hasAccess) {
          console.log("User does not have access to required guilds");
          return false;
        }

        return true;
      } catch (error) {
        console.error("Error during Discord guild check:", error);
        return false;
      }
    },
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        role: user.role,
      },
    }),
  },
} satisfies NextAuthConfig;
