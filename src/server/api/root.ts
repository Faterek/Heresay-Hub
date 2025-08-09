import { postRouter } from "~/server/api/routers/post";
import { quoteRouter } from "~/server/api/routers/quote";
import { speakerRouter } from "~/server/api/routers/speaker";
import { adminRouter } from "~/server/api/routers/admin";
import { userRouter } from "~/server/api/routers/user";
import { searchRouter } from "~/server/api/routers/search";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  quote: quoteRouter,
  speaker: speakerRouter,
  admin: adminRouter,
  user: userRouter,
  search: searchRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
