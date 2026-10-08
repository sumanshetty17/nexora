import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { KnowledgeDoc } from "@/lib/types";

export const listDocs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }): Promise<KnowledgeDoc[]> => {
    const { listDocsForSite } = await import("./knowledge.server");
    return listDocsForSite(context.userId, siteId);
  });

export const addKnowledge = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      siteId: string;
      kind: "url" | "file" | "faq" | "profile" | "note";
      title: string;
      content: string;
      sourceUrl?: string;
    }) => input,
  )
  .handler(async ({ context, data }): Promise<KnowledgeDoc> => {
    const { addKnowledgeForSite } = await import("./knowledge.server");
    return addKnowledgeForSite(context.userId, data);
  });

export const ingestWebsite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { siteId: string; url: string }) => input)
  .handler(async ({ context, data }): Promise<{ imported: number; titles: string[] }> => {
    const { ingestWebsiteForSite } = await import("./knowledge.server");
    return ingestWebsiteForSite(context.userId, data);
  });

export const deleteDoc = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { siteId: string; docId: string }) => input)
  .handler(async ({ context, data }) => {
    const { deleteDocForSite } = await import("./knowledge.server");
    return deleteDocForSite(context.userId, data);
  });

export const generateFaqs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }) => {
    const { generateFaqsForSite } = await import("./knowledge.server");
    return generateFaqsForSite(context.userId, siteId);
  });

export const searchKnowledge = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { siteId: string; query: string }) => input)
  .handler(async ({ context, data }) => {
    const { searchDocsForSite } = await import("./knowledge.server");
    return searchDocsForSite(context.userId, data);
  });
