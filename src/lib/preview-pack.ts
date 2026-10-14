export type PreviewPack = {
  url: string;
  context: string;
  proof: string;
  pagesRead: number;
};

export function encodePreviewPack(pack: PreviewPack): string {
  const bytes = new TextEncoder().encode(JSON.stringify(pack));
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodePreviewPack(token: string): PreviewPack | null {
  try {
    const pad = token.length % 4 === 0 ? "" : "=".repeat(4 - (token.length % 4));
    const bin = atob(token.replaceAll("-", "+").replaceAll("_", "/") + pad);
    const bytes = Uint8Array.from(bin, (char) => char.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes)) as PreviewPack;
    if (!data || typeof data.url !== "string" || typeof data.context !== "string" || typeof data.proof !== "string") {
      return null;
    }
    if (typeof data.pagesRead !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function widgetSnippet(origin: string, token: string): string {
  return `<script src="${origin}/widget.js" data-nexora="preview" data-pack="${token}"></script>`;
}
