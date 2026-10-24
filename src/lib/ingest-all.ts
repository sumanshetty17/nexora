import { ingestWebsiteRound } from "@/lib/server/knowledge";

export async function ingestEntireSite(
  siteId: string,
  url: string,
  onProgress?: (count: number) => void,
): Promise<{ imported: number; capped: boolean }> {
  let queue: string[] | undefined;
  let visited: string[] | undefined;
  let seeded = false;
  let imported = 0;
  let capped = false;

  for (let round = 0; round < 80; round += 1) {
    const result: {
      imported: number;
      queue: string[];
      visited: string[];
      seeded: boolean;
      done: boolean;
      capped: boolean;
    } = await ingestWebsiteRound({ data: { siteId, url, queue, visited, seeded } });
    imported += result.imported;
    queue = result.queue;
    visited = result.visited;
    seeded = result.seeded;
    capped = result.capped;
    onProgress?.(imported);
    if (result.done) break;
  }

  if (imported === 0) throw new Error("Could not read that site. Try pasting key pages as text.");
  return { imported, capped };
}
