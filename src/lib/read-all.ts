import { readSiteRound } from "@/lib/server/preview";

export type ReadPage = { url: string; title: string; content: string };

export async function readEntireSite(
  url: string,
  onProgress?: (count: number) => void,
  cookie?: string,
): Promise<{ pages: ReadPage[]; capped: boolean }> {
  let queue: string[] | undefined;
  let visited: string[] | undefined;
  let seeded = false;
  let capped = false;
  const pages: ReadPage[] = [];

  for (let round = 0; round < 80; round += 1) {
    const result: {
      pages: ReadPage[];
      queue: string[];
      visited: string[];
      seeded: boolean;
      done: boolean;
      capped: boolean;
    } = await readSiteRound({ data: { url, queue, visited, seeded, cookie } });
    for (const page of result.pages) {
      pages.push({ url: page.url, title: page.title, content: page.content });
    }
    queue = result.queue;
    visited = result.visited;
    seeded = result.seeded;
    capped = result.capped;
    onProgress?.(pages.length);
    if (result.done) break;
  }

  if (pages.length === 0) throw new Error("Could not read that site. Try pasting key pages as text.");
  return { pages, capped };
}
