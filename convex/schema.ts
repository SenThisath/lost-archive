import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  journeys: defineTable({
    session: v.string(),
    completed: v.number(),
    candleLit: v.boolean(),
    updatedAt: v.number(),
  }).index("by_session", ["session"]),
});
