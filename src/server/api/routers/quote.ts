import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { quotes, quoteVotes } from "~/server/db/schema";

export const quoteRouter = createTRPCRouter({
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

      const allQuotes = await ctx.db.query.quotes.findMany({
        orderBy: (quotes, { desc }) => [desc(quotes.createdAt)],
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

      return allQuotes;
    }),

  getLatest: protectedProcedure.query(async ({ ctx }) => {
    const quote = await ctx.db.query.quotes.findFirst({
      orderBy: (quotes, { desc }) => [desc(quotes.createdAt)],
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

    return quote ?? null;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const quote = await ctx.db.query.quotes.findFirst({
        where: eq(quotes.id, input.id),
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

      return quote;
    }),

  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(2000),
        context: z.string().max(1000).optional(),
        quoteDate: z.date().optional(),
        quoteDatePrecision: z
          .enum(["full", "year-month", "year", "unknown"])
          .default("unknown"),
        speakerId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let formattedDate = null;

      if (input.quoteDate && input.quoteDatePrecision !== "unknown") {
        const date = input.quoteDate;
        switch (input.quoteDatePrecision) {
          case "year":
            formattedDate = `${date.getFullYear()}-01-01`;
            break;
          case "year-month":
            formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-01`;
            break;
          case "full":
            formattedDate = date.toISOString().split("T")[0];
            break;
        }
      }

      const [newQuote] = await ctx.db
        .insert(quotes)
        .values({
          content: input.content,
          context: input.context,
          quoteDate: formattedDate,
          quoteDatePrecision: input.quoteDatePrecision,
          speakerId: input.speakerId,
          submittedById: ctx.session.user.id,
        })
        .returning();

      return newQuote;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        content: z.string().min(1).max(2000),
        context: z.string().max(1000).optional(),
        quoteDate: z.date().optional(),
        quoteDatePrecision: z
          .enum(["full", "year-month", "year", "unknown"])
          .default("unknown"),
        speakerId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is the author or has admin/owner permissions
      const existingQuote = await ctx.db.query.quotes.findFirst({
        where: eq(quotes.id, input.id),
      });

      if (!existingQuote) {
        throw new Error("Quote not found");
      }

      const userRole = ctx.session.user.role;
      const isAuthor = existingQuote.submittedById === ctx.session.user.id;
      const hasAdminAccess = ["ADMIN", "OWNER"].includes(userRole);

      if (!isAuthor && !hasAdminAccess) {
        throw new Error("You don't have permission to update this quote");
      }

      let formattedDate = null;

      if (input.quoteDate && input.quoteDatePrecision !== "unknown") {
        const date = input.quoteDate;
        switch (input.quoteDatePrecision) {
          case "year":
            formattedDate = `${date.getFullYear()}-01-01`;
            break;
          case "year-month":
            formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-01`;
            break;
          case "full":
            formattedDate = date.toISOString().split("T")[0];
            break;
        }
      }

      const [updatedQuote] = await ctx.db
        .update(quotes)
        .set({
          content: input.content,
          context: input.context,
          quoteDate: formattedDate,
          quoteDatePrecision: input.quoteDatePrecision,
          speakerId: input.speakerId,
        })
        .where(eq(quotes.id, input.id))
        .returning();

      return updatedQuote;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is the author or has admin/owner permissions
      const existingQuote = await ctx.db.query.quotes.findFirst({
        where: eq(quotes.id, input.id),
      });

      if (!existingQuote) {
        throw new Error("Quote not found");
      }

      const userRole = ctx.session.user.role;
      const isAuthor = existingQuote.submittedById === ctx.session.user.id;
      const hasAdminAccess = ["ADMIN", "OWNER"].includes(userRole);

      if (!isAuthor && !hasAdminAccess) {
        throw new Error("You don't have permission to delete this quote");
      }

      await ctx.db.delete(quotes).where(eq(quotes.id, input.id));
      return { success: true };
    }),

  getMy: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.quotes.findMany({
      where: eq(quotes.submittedById, ctx.session.user.id),
      orderBy: (quotes, { desc }) => [desc(quotes.createdAt)],
      with: {
        speaker: {
          columns: {
            name: true,
          },
        },
      },
    });
  }),

  vote: protectedProcedure
    .input(
      z.object({
        quoteId: z.number(),
        voteType: z.enum(["upvote", "downvote"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { quoteId, voteType } = input;

      // Check if user has already voted on this quote
      const existingVote = await ctx.db.query.quoteVotes.findFirst({
        where: and(
          eq(quoteVotes.quoteId, quoteId),
          eq(quoteVotes.userId, userId),
        ),
      });

      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // Remove vote if same type
          await ctx.db
            .delete(quoteVotes)
            .where(
              and(
                eq(quoteVotes.quoteId, quoteId),
                eq(quoteVotes.userId, userId),
              ),
            );
          return { success: true, action: "removed" };
        } else {
          // Update vote type if different
          await ctx.db
            .update(quoteVotes)
            .set({ voteType })
            .where(
              and(
                eq(quoteVotes.quoteId, quoteId),
                eq(quoteVotes.userId, userId),
              ),
            );
          return { success: true, action: "updated" };
        }
      } else {
        // Create new vote
        await ctx.db.insert(quoteVotes).values({
          quoteId,
          userId,
          voteType,
        });
        return { success: true, action: "created" };
      }
    }),

  getVoteStats: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { quoteId } = input;
      const userId = ctx.session.user.id;

      // Get vote counts
      const [upvoteCount, downvoteCount, userVote] = await Promise.all([
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(quoteVotes)
          .where(
            and(
              eq(quoteVotes.quoteId, quoteId),
              eq(quoteVotes.voteType, "upvote"),
            ),
          )
          .then((result) => result[0]?.count ?? 0),

        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(quoteVotes)
          .where(
            and(
              eq(quoteVotes.quoteId, quoteId),
              eq(quoteVotes.voteType, "downvote"),
            ),
          )
          .then((result) => result[0]?.count ?? 0),

        ctx.db.query.quoteVotes.findFirst({
          where: and(
            eq(quoteVotes.quoteId, quoteId),
            eq(quoteVotes.userId, userId),
          ),
        }),
      ]);

      return {
        upvotes: upvoteCount,
        downvotes: downvoteCount,
        userVote: userVote?.voteType ?? null,
      };
    }),

  getVoters: protectedProcedure
    .input(
      z.object({
        quoteId: z.number(),
        voteType: z.enum(["upvote", "downvote"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { quoteId, voteType } = input;

      const voters = await ctx.db.query.quoteVotes.findMany({
        where: and(
          eq(quoteVotes.quoteId, quoteId),
          eq(quoteVotes.voteType, voteType),
        ),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [desc(quoteVotes.createdAt)],
      });

      return voters.map((vote) => ({
        id: vote.user.id,
        name: vote.user.name,
        votedAt: vote.createdAt,
      }));
    }),

  getRankedByYear: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { year, limit } = input;

      // Get all quotes for the specified year
      const yearQuotes = await ctx.db.query.quotes.findMany({
        where: sql`EXTRACT(YEAR FROM ${quotes.createdAt}) = ${year}`,
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
          votes: true,
        },
      });

      // Calculate vote scores and sort
      const rankedQuotes = yearQuotes
        .map((quote) => {
          const upvotes = quote.votes.filter(
            (v) => v.voteType === "upvote",
          ).length;
          const downvotes = quote.votes.filter(
            (v) => v.voteType === "downvote",
          ).length;
          const netScore = upvotes - downvotes;

          return {
            id: quote.id,
            content: quote.content,
            context: quote.context,
            quoteDate: quote.quoteDate,
            quoteDatePrecision: quote.quoteDatePrecision,
            speakerId: quote.speakerId,
            submittedById: quote.submittedById,
            createdAt: quote.createdAt,
            speaker: quote.speaker,
            submittedBy: quote.submittedBy,
            upvotes,
            downvotes,
            netScore,
          };
        })
        .sort((a, b) => b.netScore - a.netScore)
        .slice(0, limit);

      return rankedQuotes;
    }),

  getAvailableYears: protectedProcedure.query(async ({ ctx }) => {
    const years = await ctx.db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${quotes.createdAt})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(quotes)
      .groupBy(sql`EXTRACT(YEAR FROM ${quotes.createdAt})`)
      .orderBy(sql`EXTRACT(YEAR FROM ${quotes.createdAt}) DESC`);

    return years.map((y) => ({ year: y.year, count: y.count }));
  }),
});
