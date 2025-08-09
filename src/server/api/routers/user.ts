import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { quotes, users, quoteVotes } from "~/server/db/schema";

export const userRouter = createTRPCRouter({
  // Get user profile with basic stats
  getProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
        columns: {
          id: true,
          name: true,
          image: true,
          role: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Get user's quotes count
      const quotesCount = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(quotes)
        .where(eq(quotes.submittedById, input.userId))
        .then((result) => result[0]?.count ?? 0);

      // Get total upvotes received on user's quotes
      const totalUpvotes = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(quoteVotes)
        .innerJoin(quotes, eq(quotes.id, quoteVotes.quoteId))
        .where(
          sql`${quotes.submittedById} = ${input.userId} AND ${quoteVotes.voteType} = 'upvote'`,
        )
        .then((result: Array<{ count: number }>) => result[0]?.count ?? 0);

      // Get total downvotes received on user's quotes
      const totalDownvotes = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(quoteVotes)
        .innerJoin(quotes, eq(quotes.id, quoteVotes.quoteId))
        .where(
          sql`${quotes.submittedById} = ${input.userId} AND ${quoteVotes.voteType} = 'downvote'`,
        )
        .then((result: Array<{ count: number }>) => result[0]?.count ?? 0);

      return {
        ...user,
        stats: {
          quotesCount,
          totalUpvotes,
          totalDownvotes,
          netScore: totalUpvotes - totalDownvotes,
        },
      };
    }),

  // Get quotes submitted by a specific user
  getUserQuotes: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        page: z.number().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { userId, limit = 20, page = 1 } = input;
      const offset = (page - 1) * limit;

      // Check if user exists
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const userQuotes = await ctx.db.query.quotes.findMany({
        where: eq(quotes.submittedById, userId),
        orderBy: [desc(quotes.createdAt)],
        limit,
        offset,
        columns: {
          id: true,
          content: true,
          context: true,
          quoteDate: true,
          quoteDatePrecision: true,
          speakerId: true,
          submittedById: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          speaker: {
            columns: {
              name: true,
            },
          },
          submittedBy: {
            columns: {
              name: true,
            },
          },
        },
      });

      return userQuotes;
    }),

  // Get current user's profile (authenticated)
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get user's quotes count
    const quotesCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(quotes)
      .where(eq(quotes.submittedById, userId))
      .then((result) => result[0]?.count ?? 0);

    // Get total upvotes received on user's quotes
    const totalUpvotes = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(quoteVotes)
      .innerJoin(quotes, eq(quotes.id, quoteVotes.quoteId))
      .where(
        sql`${quotes.submittedById} = ${userId} AND ${quoteVotes.voteType} = 'upvote'`,
      )
      .then((result: Array<{ count: number }>) => result[0]?.count ?? 0);

    // Get total downvotes received on user's quotes
    const totalDownvotes = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(quoteVotes)
      .innerJoin(quotes, eq(quotes.id, quoteVotes.quoteId))
      .where(
        sql`${quotes.submittedById} = ${userId} AND ${quoteVotes.voteType} = 'downvote'`,
      )
      .then((result: Array<{ count: number }>) => result[0]?.count ?? 0);

    return {
      ...user,
      stats: {
        quotesCount,
        totalUpvotes,
        totalDownvotes,
        netScore: totalUpvotes - totalDownvotes,
      },
    };
  }),

  // Get my quotes (current user, authenticated)
  getMyQuotes: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          page: z.number().min(1).default(1),
        })
        .optional(),
    )
    .query(async ({ ctx, input = {} }) => {
      const { limit = 20, page = 1 } = input;
      const offset = (page - 1) * limit;
      const userId = ctx.session.user.id;

      return await ctx.db.query.quotes.findMany({
        where: eq(quotes.submittedById, userId),
        orderBy: [desc(quotes.createdAt)],
        limit,
        offset,
        columns: {
          id: true,
          content: true,
          context: true,
          quoteDate: true,
          quoteDatePrecision: true,
          speakerId: true,
          submittedById: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          speaker: {
            columns: {
              name: true,
            },
          },
        },
      });
    }),

  // Get all users (for admin purposes or user discovery)
  getAll: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          page: z.number().min(1).default(1),
        })
        .optional(),
    )
    .query(async ({ ctx, input = {} }) => {
      const { limit = 20, page = 1 } = input;
      const offset = (page - 1) * limit;

      const allUsers = await ctx.db.query.users.findMany({
        orderBy: [desc(users.name)],
        limit,
        offset,
        columns: {
          id: true,
          name: true,
          image: true,
          role: true,
        },
      });

      // Get quote counts for each user
      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          const quotesCount = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(quotes)
            .where(eq(quotes.submittedById, user.id))
            .then((result) => result[0]?.count ?? 0);

          return {
            ...user,
            quotesCount,
          };
        }),
      );

      return usersWithStats;
    }),
});
