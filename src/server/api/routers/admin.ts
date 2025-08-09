import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users, type UserRole } from "~/server/db/schema";
import { env } from "~/env";

export const adminRouter = createTRPCRouter({
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    // Only ADMIN and OWNER can view all users
    const userRole = ctx.session.user.role;
    if (!["ADMIN", "OWNER"].includes(userRole)) {
      throw new Error("You don't have permission to view all users");
    }

    return await ctx.db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
      },
      orderBy: (users, { asc }) => [asc(users.name)],
    });
  }),

  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["USER", "MODERATOR", "ADMIN", "OWNER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserRole = ctx.session.user.role;
      const currentUserId = ctx.session.user.id;

      // Only ADMIN and OWNER can update roles
      if (!["ADMIN", "OWNER"].includes(currentUserRole)) {
        throw new Error("You don't have permission to update user roles");
      }

      // Get target user info
      const targetUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      // Check if trying to change owner role
      if (targetUser.id === env.HH_OWNER_ID && input.role !== "OWNER") {
        throw new Error("Cannot change the owner's role");
      }

      // ADMIN cannot demote other ADMINs or the OWNER
      if (currentUserRole === "ADMIN") {
        if (targetUser.role === "OWNER") {
          throw new Error("Admins cannot change the owner's role");
        }
        if (targetUser.role === "ADMIN" && input.role !== "ADMIN") {
          throw new Error("Admins cannot demote other admins");
        }
        if (input.role === "OWNER") {
          throw new Error("Admins cannot promote users to owner");
        }
      }

      // Prevent self-demotion for ADMIN and OWNER
      if (currentUserId === input.userId) {
        if (currentUserRole === "OWNER" && input.role !== "OWNER") {
          throw new Error("Owners cannot demote themselves");
        }
        if (currentUserRole === "ADMIN" && input.role !== "ADMIN") {
          throw new Error("Admins cannot demote themselves");
        }
      }

      const [updatedUser] = await ctx.db
        .update(users)
        .set({ role: input.role as UserRole })
        .where(eq(users.id, input.userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        });

      return updatedUser;
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Only ADMIN and OWNER can view stats
    const userRole = ctx.session.user.role;
    if (!["ADMIN", "OWNER"].includes(userRole)) {
      throw new Error("You don't have permission to view stats");
    }

    const [userCount, quoteCount, speakerCount] = await Promise.all([
      ctx.db.query.users.findMany().then((users) => users.length),
      ctx.db.query.quotes.findMany().then((quotes) => quotes.length),
      ctx.db.query.speakers.findMany().then((speakers) => speakers.length),
    ]);

    return {
      userCount,
      quoteCount,
      speakerCount,
    };
  }),
});
