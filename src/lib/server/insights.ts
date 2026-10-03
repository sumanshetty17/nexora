import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { InsightBundle } from "@/lib/types";

export const getInsights = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }): Promise<InsightBundle> => {
    const { insightsForSite } = await import("./insights.server");
    return insightsForSite(context.userId, siteId);
  });

export const recommendImprovements = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }): Promise<{ recommendation: string }> => {
    const { recommendForSite } = await import("./insights.server");
    return recommendForSite(context.userId, siteId);
  });

export const seedTraffic = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }) => {
    const { seedTrafficForSite } = await import("./insights.server");
    return seedTrafficForSite(context.userId, siteId);
  });
