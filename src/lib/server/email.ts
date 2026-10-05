import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { EmailItem } from "@/lib/types";

export const listEmails = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }): Promise<EmailItem[]> => {
    const { listEmailsForSite } = await import("./email.server");
    return listEmailsForSite(context.userId, siteId);
  });

export const ingestEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { siteId: string; fromName: string; fromEmail: string; subject: string; body: string }) => input,
  )
  .handler(async ({ context, data }): Promise<EmailItem> => {
    const { ingestEmailForSite } = await import("./email.server");
    return ingestEmailForSite(context.userId, data);
  });

export const loadSampleEmails = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }): Promise<EmailItem[]> => {
    const { loadSampleEmailsForSite } = await import("./email.server");
    return loadSampleEmailsForSite(context.userId, siteId);
  });

export const processEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { siteId: string; emailId: string }) => input)
  .handler(async ({ context, data }): Promise<EmailItem> => {
    const { processEmailForSite } = await import("./email.server");
    return processEmailForSite(context.userId, data);
  });

export const processInbox = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }): Promise<{ processed: number; escalated: number }> => {
    const { processInboxForSite } = await import("./email.server");
    return processInboxForSite(context.userId, siteId);
  });

export const sendEmailReply = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { siteId: string; emailId: string; body: string }) => input)
  .handler(async ({ context, data }): Promise<EmailItem> => {
    const { sendEmailReplyForSite } = await import("./email.server");
    return sendEmailReplyForSite(context.userId, data);
  });

export const escalateEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { siteId: string; emailId: string }) => input)
  .handler(async ({ context, data }): Promise<EmailItem> => {
    const { escalateEmailForSite } = await import("./email.server");
    return escalateEmailForSite(context.userId, data);
  });
