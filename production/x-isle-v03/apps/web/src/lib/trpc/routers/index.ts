import { createTRPCRouter } from "../server";
import { presentationRouter } from "./presentation";
import { templateRouter } from "./template";
import { userRouter } from "./user";
import { aiRouter } from "./ai";
import { exportRouter } from "./export";
import { commentsRouter } from "./comments";
import { documentRouter } from "./document";

/**
 * Main tRPC router
 * Add all sub-routers here
 */
export const appRouter = createTRPCRouter({
  presentation: presentationRouter,
  template: templateRouter,
  user: userRouter,
  ai: aiRouter,
  export: exportRouter,
  comments: commentsRouter,
  document: documentRouter,
});

export type AppRouter = typeof appRouter;
