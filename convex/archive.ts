import {
  queryGeneric as query,
  mutationGeneric as mutation,
} from "convex/server";
import { v, ConvexError } from "convex/values";
import { isReleased } from "../lib/release";
function authorize(key: string, session: string) {
  const env = (globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }).process?.env;
  const expected = env?.ARCHIVE_BACKEND_KEY;
  if (!expected || expected.length < 32 || key !== expected)
    throw new ConvexError("Unauthorized");
  if (!isReleased(Date.now(), env?.ARCHIVE_UNLOCK_AT))
    throw new ConvexError("Archive sealed");
  if (!/^[a-f0-9]{64}$/.test(session)) throw new ConvexError("Invalid session");
}
export const progress = query({
  args: { key: v.string(), session: v.string() },
  handler: async (ctx, args) => {
    authorize(args.key, args.session);
    const row = await ctx.db
      .query("journeys")
      .withIndex("by_session", (q) => q.eq("session", args.session))
      .unique();
    return {
      completed: row?.completed ?? 0,
      candleLit: row?.candleLit ?? false,
    };
  },
});
export const restore = mutation({
  args: {
    key: v.string(),
    session: v.string(),
    completed: v.number(),
    candleLit: v.boolean(),
  },
  handler: async (ctx, args) => {
    authorize(args.key, args.session);
    if (
      !Number.isInteger(args.completed) ||
      args.completed < 0 ||
      args.completed > 5
    )
      throw new ConvexError("Invalid fragment");
    const row = await ctx.db
      .query("journeys")
      .withIndex("by_session", (q) => q.eq("session", args.session))
      .unique();
    // Monotonic progress handles retries; the backend rejects skipped chapters.
    if (args.completed > (row?.completed ?? 0) + 1)
      throw new ConvexError("Restore the preceding fragment first");
    if (args.candleLit && args.completed !== 5)
      throw new ConvexError("Final chapter locked");
    const data = {
      session: args.session,
      completed: Math.max(row?.completed ?? 0, args.completed),
      candleLit: !!row?.candleLit || args.candleLit,
      updatedAt: Date.now(),
    };
    if (row) await ctx.db.patch(row._id, data);
    else await ctx.db.insert("journeys", data);
    return { completed: data.completed, candleLit: data.candleLit };
  },
});
