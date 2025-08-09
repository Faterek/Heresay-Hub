import { z } from "zod";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  quotes,
  quoteVotes,
  quoteSpeakers,
  speakers,
} from "~/server/db/schema";

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
          submittedById: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          quoteSpeakers: {
            with: {
              speaker: {
                columns: {
                  id: true,
                  name: true,
                },
              },
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
        submittedById: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        quoteSpeakers: {
          with: {
            speaker: {
              columns: {
                id: true,
                name: true,
              },
            },
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
          submittedById: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          quoteSpeakers: {
            with: {
              speaker: {
                columns: {
                  id: true,
                  name: true,
                },
              },
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
        speakerIds: z.array(z.number()).min(1).max(10), // Support multiple speakers, max 10
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

      // Start a transaction to ensure data consistency
      const result = await ctx.db.transaction(async (tx) => {
        // Create the quote first
        const [newQuote] = await tx
          .insert(quotes)
          .values({
            content: input.content,
            context: input.context,
            quoteDate: formattedDate,
            quoteDatePrecision: input.quoteDatePrecision,
            submittedById: ctx.session.user.id,
          })
          .returning();

        if (!newQuote) {
          throw new Error("Failed to create quote");
        }

        // Create quote-speaker relationships
        const quoteSpeakerValues = input.speakerIds.map((speakerId) => ({
          quoteId: newQuote.id,
          speakerId,
        }));

        await tx.insert(quoteSpeakers).values(quoteSpeakerValues);

        return newQuote;
      });

      return result;
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
        speakerIds: z.array(z.number()).min(1).max(10), // Support multiple speakers
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

      // Use transaction to ensure data consistency
      const result = await ctx.db.transaction(async (tx) => {
        // Update the quote
        const [updatedQuote] = await tx
          .update(quotes)
          .set({
            content: input.content,
            context: input.context,
            quoteDate: formattedDate,
            quoteDatePrecision: input.quoteDatePrecision,
          })
          .where(eq(quotes.id, input.id))
          .returning();

        if (!updatedQuote) {
          throw new Error("Failed to update quote");
        }

        // Update speakers - delete existing relationships and create new ones
        await tx
          .delete(quoteSpeakers)
          .where(eq(quoteSpeakers.quoteId, input.id));

        // Create new quote-speaker relationships
        const quoteSpeakerValues = input.speakerIds.map((speakerId) => ({
          quoteId: input.id,
          speakerId,
        }));

        await tx.insert(quoteSpeakers).values(quoteSpeakerValues);

        return updatedQuote;
      });

      return result;
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
        quoteSpeakers: {
          with: {
            speaker: {
              columns: {
                id: true,
                name: true,
              },
            },
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
          quoteSpeakers: {
            with: {
              speaker: {
                columns: {
                  id: true,
                  name: true,
                },
              },
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
            (v: { voteType: string }) => v.voteType === "upvote",
          ).length;
          const downvotes = quote.votes.filter(
            (v: { voteType: string }) => v.voteType === "downvote",
          ).length;
          const netScore = upvotes - downvotes;

          // Extract speaker information from the new structure
          const speakers = quote.quoteSpeakers.map((qs) => qs.speaker);

          return {
            id: quote.id,
            content: quote.content,
            context: quote.context,
            quoteDate: quote.quoteDate,
            quoteDatePrecision: quote.quoteDatePrecision,
            submittedById: quote.submittedById,
            createdAt: quote.createdAt,
            speakers,
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
