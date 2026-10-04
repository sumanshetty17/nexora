import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@electric-sql/pglite/dist");
const dest = join(root, ".vercel/output/functions/__server.func/_libs");

await mkdir(dest, { recursive: true });
for (const name of ["pglite.wasm", "pglite.data", "initdb.wasm"]) {
  await copyFile(join(src, name), join(dest, name));
}
console.log("[pglite] copied wasm assets into the Vercel function bundle");
