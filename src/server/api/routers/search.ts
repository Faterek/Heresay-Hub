import { z } from "zod";
import { eq, and, sql, or, gte, lte, inArray } from "drizzle-orm";
import Fuse from "fuse.js";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { quotes, quoteSpeakers } from "~/server/db/schema";

export const searchRouter = createTRPCRouter({
  searchQuotes: protectedProcedure
    .input(
      z.object({
        query: z.string().max(500).default(""),
        speakerId: z.number().optional(),
        submittedById: z.string().optional(),
        quoteDateFrom: z.date().optional(),
        quoteDateTo: z.date().optional(),
        includeUnknownDates: z.boolean().default(true),
        limit: z.number().min(1).max(100).default(20),
        page: z.number().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const {
        limit,
        page,
        query,
        speakerId,
        submittedById,
        quoteDateFrom,
        quoteDateTo,
        includeUnknownDates,
      } = input;
      const offset = (page - 1) * limit;

      // Build base query conditions
      const conditions = [];

      // Handle speaker filtering with the new junction table approach
      let quotesToInclude: number[] | undefined;
      if (speakerId) {
        // First, get all quote IDs that have this speaker
        const quotesWithSpeaker = await ctx.db
          .select({ quoteId: quoteSpeakers.quoteId })
          .from(quoteSpeakers)
          .where(eq(quoteSpeakers.speakerId, speakerId));

        quotesToInclude = quotesWithSpeaker.map((q) => q.quoteId);

        // If no quotes found with this speaker, return empty result
        if (quotesToInclude.length === 0) {
          return { quotes: [], total: 0 };
        }
      }

      if (submittedById) {
        conditions.push(eq(quotes.submittedById, submittedById));
      }

      // Date filtering
      if (quoteDateFrom || quoteDateTo) {
        const dateConditions = [];

        if (quoteDateFrom && quoteDateTo) {
          dateConditions.push(
            and(
              gte(quotes.quoteDate, quoteDateFrom.toISOString().split("T")[0]!),
              lte(quotes.quoteDate, quoteDateTo.toISOString().split("T")[0]!),
            ),
          );
        } else if (quoteDateFrom) {
          dateConditions.push(
            gte(quotes.quoteDate, quoteDateFrom.toISOString().split("T")[0]!),
          );
        } else if (quoteDateTo) {
          dateConditions.push(
            lte(quotes.quoteDate, quoteDateTo.toISOString().split("T")[0]!),
          );
        }

        if (includeUnknownDates) {
          dateConditions.push(sql`${quotes.quoteDate} IS NULL`);
        }

        if (dateConditions.length > 0) {
          conditions.push(or(...dateConditions));
        }
      } else if (!includeUnknownDates) {
        // If no date filter but we don't want unknown dates
        conditions.push(sql`${quotes.quoteDate} IS NOT NULL`);
      }

      // Add speaker filtering condition if specified
      if (quotesToInclude && quotesToInclude.length > 0) {
        conditions.push(inArray(quotes.id, quotesToInclude));
      }

      // First, get all quotes that match our filters
      const filteredQuotes = await ctx.db.query.quotes.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
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

      // If there's a search query, use Fuse.js for fuzzy search
      let searchResults = filteredQuotes;

      if (query.trim().length > 0) {
        // Transform quotes to include speaker names for search
        const searchableQuotes = filteredQuotes.map((quote) => ({
          ...quote,
          speakerNames: quote.quoteSpeakers
            .map((qs) => qs.speaker.name)
            .join(" "),
        }));

        const fuse = new Fuse(searchableQuotes, {
          keys: [
            { name: "content", weight: 0.7 },
            { name: "context", weight: 0.2 },
            { name: "speakerNames", weight: 0.1 },
          ],
          threshold: 0.4, // More lenient fuzzy matching
          includeScore: true,
          includeMatches: true,
        });

        const fuseResults = fuse.search(query);
        searchResults = fuseResults.map((result) => ({
          ...result.item,
          searchScore: result.score,
          searchMatches: result.matches,
        }));
      }

      // Apply pagination to search results
      const paginatedResults = searchResults.slice(offset, offset + limit);
      const totalResults = searchResults.length;
      const totalPages = Math.ceil(totalResults / limit);

      return {
        quotes: paginatedResults,
        pagination: {
          currentPage: page,
          totalPages,
          totalResults,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }),

  getSpeakers: protectedProcedure.query(async ({ ctx }) => {
    const speakers = await ctx.db.query.speakers.findMany({
      orderBy: (speakers, { asc }) => [asc(speakers.name)],
      columns: {
        id: true,
        name: true,
      },
    });

    return speakers;
  }),

  getUsers: protectedProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.query.users.findMany({
      orderBy: (users, { asc }) => [asc(users.name)],
      columns: {
        id: true,
        name: true,
      },
    });

    return users;
  }),
});
