import { createServerFn } from "@tanstack/react-start";
import type { PreviewTurn, SitePreview } from "./preview.server";

export const previewSite = createServerFn({ method: "POST" })
  .validator(
    (input: {
      url: string;
      question: string;
      history?: PreviewTurn[];
      context?: string;
      proof?: string;
      pagesRead?: number;
    }) => input,
  )
  .handler(async ({ data }): Promise<SitePreview> => {
    const { answerFromPublicSite } = await import("./preview.server");
    return answerFromPublicSite(data);
  });
