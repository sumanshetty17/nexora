import { createServerFn } from "@tanstack/react-start";
import type { PreviewTurn, SitePreview } from "./preview.server";

export const readSiteRound = createServerFn({ method: "POST" })
  .validator(
    (input: { url: string; queue?: string[]; visited?: string[]; seeded?: boolean }) => {
      if (!input || typeof input.url !== "string" || input.url.length < 8 || input.url.length > 500) {
        throw new Error("Enter a public website URL.");
      }
      const clean = (values: unknown) =>
        (Array.isArray(values) ? values : [])
          .filter((item): item is string => typeof item === "string" && item.length > 0 && item.length < 500)
          .slice(0, 300);
      return {
        url: input.url.trim(),
        queue: clean(input.queue),
        visited: clean(input.visited),
        seeded: Boolean(input.seeded),
      };
    },
  )
  .handler(async ({ data }) => {
    const { readPublicRound } = await import("./preview.server");
    return readPublicRound(data);
  });

export const previewSite = createServerFn({ method: "POST" })
  .validator(
    (input: {
      url: string;
      question: string;
      history?: PreviewTurn[];
      context?: string;
      proof?: string;
      pagesRead?: number;
      pages?: { title: string; content: string }[];
    }) => {
      const pages = Array.isArray(input.pages)
        ? input.pages
            .filter((page) => page && typeof page.title === "string" && typeof page.content === "string")
            .slice(0, 300)
            .map((page) => ({
              title: page.title.slice(0, 180),
              content: page.content.slice(0, 8_000),
            }))
        : undefined;
      return { ...input, pages };
    },
  )
  .handler(async ({ data }): Promise<SitePreview> => {
    const { answerFromPublicSite } = await import("./preview.server");
    return answerFromPublicSite(data);
  });
