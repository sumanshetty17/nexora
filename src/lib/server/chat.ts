import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { ChatMessage, ChatTurnResult, Conversation, WidgetConfig } from "@/lib/types";

export const getWidgetConfig = createServerFn({ method: "GET" })
  .validator((publicId: string) => publicId)
  .handler(async ({ data: publicId }): Promise<WidgetConfig> => {
    const { getWidgetConfigForPublicId } = await import("./chat.server");
    return getWidgetConfigForPublicId(publicId);
  });

export const widgetChat = createServerFn({ method: "POST" })
  .validator((input: { publicId: string; conversationId?: string; message: string }) => input)
  .handler(async ({ data }): Promise<ChatTurnResult> => {
    const { widgetTurn } = await import("./chat.server");
    return widgetTurn(data);
  });

export const playgroundChat = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { siteId: string; conversationId?: string; message: string }) => input)
  .handler(async ({ context, data }): Promise<ChatTurnResult> => {
    const { playgroundTurn } = await import("./chat.server");
    return playgroundTurn(context.userId, data);
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }): Promise<Conversation[]> => {
    const { listConversationsForSite } = await import("./chat.server");
    return listConversationsForSite(context.userId, siteId);
  });

export const getConversationMessages = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { siteId: string; conversationId: string }) => input)
  .handler(async ({ context, data }): Promise<ChatMessage[]> => {
    const { conversationMessages } = await import("./chat.server");
    return conversationMessages(context.userId, data);
  });

export const exportConversations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((siteId: string) => siteId)
  .handler(async ({ context, data: siteId }): Promise<{ csv: string }> => {
    const { exportConversationsCsv } = await import("./chat.server");
    return { csv: await exportConversationsCsv(context.userId, siteId) };
  });

export const ownerReply = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { siteId: string; conversationId: string; message: string }) => input)
  .handler(async ({ context, data }) => {
    const { ownerReplyForSite } = await import("./chat.server");
    return ownerReplyForSite(context.userId, data);
  });
