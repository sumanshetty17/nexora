import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Site, UsageSummary } from "@/lib/types";

export const listSites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Site[]> => {
    const { listSitesForUser } = await import("./sites.server");
    return listSitesForUser(context.userId);
  });

export const getSite = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }) => {
    const { requireSite } = await import("./sites.server");
    return requireSite(context.userId, siteId);
  });

export const createSite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      name: string;
      websiteUrl?: string;
      industry?: string;
      description?: string;
      tone?: string;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { createSiteForUser } = await import("./sites.server");
    return createSiteForUser(context.userId, data);
  });

export const updateSite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      siteId: string;
      name?: string;
      websiteUrl?: string;
      industry?: string;
      description?: string;
      tone?: string;
      welcomeMessage?: string;
      brandColor?: string;
      allowedOrigins?: string;
      status?: "draft" | "live";
      emailAssistantEnabled?: boolean;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const { updateSiteForUser } = await import("./sites.server");
    return updateSiteForUser(context.userId, data);
  });

export const deleteSite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }) => {
    const { deleteSiteForUser } = await import("./sites.server");
    return deleteSiteForUser(context.userId, siteId);
  });

export const prepareAssistant = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }) => {
    const { prepareAssistantForUser } = await import("./sites.server");
    return prepareAssistantForUser(context.userId, siteId);
  });

export const cloneHarborDemo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { cloneHarborForUser } = await import("./sites.server");
    return cloneHarborForUser(context.userId);
  });

export const getUsage = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<UsageSummary> => {
    const { usageForUser } = await import("./sites.server");
    return usageForUser(context.userId);
  });
