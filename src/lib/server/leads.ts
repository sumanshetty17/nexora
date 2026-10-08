import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { Lead } from "@/lib/types";

export const captureLead = createServerFn({ method: "POST" })
  .validator((input: { publicId: string; conversationId: string; name: string; email: string; note?: string }) => input)
  .handler(async ({ data }): Promise<Lead> => {
    const { captureLeadForPublicId } = await import("./leads.server");
    return captureLeadForPublicId(data);
  });

export const listLeads = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }): Promise<Lead[]> => {
    const { listLeadsForSite } = await import("./leads.server");
    return listLeadsForSite(context.userId, siteId);
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { siteId: string; leadId: string; status: Lead["status"] }) => input)
  .handler(async ({ context, data }): Promise<Lead> => {
    const { updateLeadForSite } = await import("./leads.server");
    return updateLeadForSite(context.userId, data);
  });
