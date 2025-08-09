import { z } from "zod";
import { eq } from "drizzle-orm";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { speakers } from "~/server/db/schema";

export const speakerRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.speakers.findMany({
      orderBy: (speakers, { asc }) => [asc(speakers.name)],
      with: {
        createdBy: {
          columns: {
            name: true,
          },
        },
      },
    });
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to create speakers (MODERATOR, ADMIN, OWNER)
      const userRole = ctx.session.user.role;
      if (!["MODERATOR", "ADMIN", "OWNER"].includes(userRole)) {
        throw new Error("You don't have permission to create speakers");
      }

      // Check if speaker already exists
      const existingSpeaker = await ctx.db.query.speakers.findFirst({
        where: eq(speakers.name, input.name),
      });

      if (existingSpeaker) {
        throw new Error("Speaker with this name already exists");
      }

      const [newSpeaker] = await ctx.db
        .insert(speakers)
        .values({
          name: input.name,
          createdById: ctx.session.user.id,
        })
        .returning();

      return newSpeaker;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to delete speakers (ADMIN, OWNER)
      const userRole = ctx.session.user.role;
      if (!["ADMIN", "OWNER"].includes(userRole)) {
        throw new Error("You don't have permission to delete speakers");
      }

      await ctx.db.delete(speakers).where(eq(speakers.id, input.id));
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to update speakers (MODERATOR, ADMIN, OWNER)
      const userRole = ctx.session.user.role;
      if (!["MODERATOR", "ADMIN", "OWNER"].includes(userRole)) {
        throw new Error("You don't have permission to update speakers");
      }

      // Check if another speaker with this name already exists
      const existingSpeaker = await ctx.db.query.speakers.findFirst({
        where: eq(speakers.name, input.name),
      });

      if (existingSpeaker && existingSpeaker.id !== input.id) {
        throw new Error("Speaker with this name already exists");
      }

      const [updatedSpeaker] = await ctx.db
        .update(speakers)
        .set({ name: input.name })
        .where(eq(speakers.id, input.id))
        .returning();

      return updatedSpeaker;
    }),
});
